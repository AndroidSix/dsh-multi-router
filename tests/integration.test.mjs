import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { apply } from '../lib/index.js';
import { createAccountClient, cachedModels } from '../lib/clients.js';
import { importAccount } from '../lib/accounts.js';
import { createShim } from '../lib/shim.js';
import { Router } from '../lib/router.js';
import { validateConfig, writePrivateJson, ROUTE_PRESETS } from '../src/config.mjs';

// Startup discovery must never capture the developer's real desktop accounts.
const isolatedHome = await mkdtemp(join(tmpdir(), 'router-integration-home-'));
const savedHome = process.env.HOME;
process.env.HOME = isolatedHome;
process.env.APPDATA = join(isolatedHome, 'AppData', 'Roaming');
process.env.XDG_CONFIG_HOME = join(isolatedHome, '.config');
process.env.WORKBUDDY_AUTH_FILE = join(isolatedHome, 'missing-wb');
process.env.WORKBUDDY_AI_AUTH_FILE = join(isolatedHome, 'missing-wb-ai');
after(async () => { process.env.HOME = savedHome; await rm(isolatedHome, { recursive: true, force: true }); });

const wbCredential = token => ({ version: 1, credential: { accessToken: token, refreshToken: '',
  expiresAtMs: Date.now() + 3600000, domain: 'www.codebuddy.cn', uid: token, source: 'dsh' } });
const catalog = () => Response.json({ code: 0, msg: 'ok', data: {
  models: [{ id: 'deepseek-v4.1-flash', name: 'DeepSeek-V4.1-Flash', maxInputTokens: 1000000, maxOutputTokens: 128000 }],
  agents: [{ name: 'cli', models: ['deepseek-v4.1-flash'] }],
} });
const answer = () => new Response('data: {"id":"test","object":"chat.completion.chunk","created":0,"model":"deepseek-v4.1-flash","choices":[{"index":0,"delta":{"content":"hello"},"finish_reason":null}]}\n\ndata: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } });

test('first activation in a fresh home creates private config and a usable management panel', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'router-first-install-'));
  const file = join(dir, 'new-home', 'multi-router', 'router.json');
  let handler; const disposers = [], adapters = new Map();
  const effect = cb => disposers.push(cb());
  const ctx = { on() {}, get: () => undefined, effect, emit() {}, logger: { info() {}, warn() {}, error() {} },
    inject(ids, cb) { cb({ effect, webServer: { register(options) { handler = options.handler; return () => {}; } } }); },
    llm: { registerAdapter(ids, adapter) { adapters.set(ids[0], adapter); return () => adapters.delete(ids[0]); } } };
  t.after(async () => { for (const dispose of disposers.reverse()) await dispose?.(); await rm(dir, { recursive: true, force: true }); });
  await apply(ctx, { configFile: file });
  assert.equal(adapters.size, 7);
  assert.equal(typeof handler, 'function');
  let status, body;
  await handler({ method: 'GET', headers: { host: 'localhost' }, socket: { remoteAddress: '127.0.0.1' } },
    { writeHead(code) { status = code; }, end(text) { body = JSON.parse(text); } });
  assert.equal(status, 200);
  assert.deepEqual(body.accounts, []);
  assert.equal(body.routes.length, Object.keys(ROUTE_PRESETS).length);
  const raw = JSON.parse(await readFile(file, 'utf8'));
  assert.deepEqual(raw.accounts, []);
  assert.deepEqual(Object.keys(raw.routes), Object.keys(ROUTE_PRESETS));
  assert.equal((await stat(file)).mode & 0o777, 0o600);
  assert.equal((await stat(join(dir, 'new-home', 'multi-router'))).mode & 0o777, 0o700);
});

test('real DSH adapter streams through WorkBuddy account failover and unregisters', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'multi-router-'));
  const accounts = [];
  for (const id of ['wb1', 'wb2']) {
    const file = join(dir, `${id}.json`); await writePrivateJson(file, wbCredential(id));
    accounts.push({ id, provider: 'workbuddy', credentialFile: file });
  }
  const file = join(dir, 'router.json'); await writePrivateJson(file, { accounts });
  const realFetch = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith('http://127.0.0.1')) return realFetch(url, options);
    if (String(url).endsWith('/v3/config')) return catalog();
    if (String(url).endsWith('/v2/chat/completions')) {
      const token = options.headers.Authorization;
      const input = JSON.parse(options.body); assert.equal(input.model, 'deepseek-v4.1-flash');
      calls.push(token);
      return token === 'Bearer wb1' ? new Response('{"error":"quota"}', { status: 429 }) : answer();
    }
    throw new Error('Unexpected network request in test');
  };
  let adapter, dispose, released = false;
  const adapters = new Map();
  const logs = [], listeners = {};
  const ctx = { on(name, callback) { listeners[name] = callback; }, get: () => undefined, effect: cb => { dispose = cb(); }, emit: () => {},
    logger: { info: (...x) => logs.push(x.join(' ')), error: (...x) => logs.push(x.join(' ')) },
    llm: { registerAdapter(ids, value) { assert.equal(ids.length, 1); adapters.set(ids[0], value);
      if (ids[0] === 'multi-router') adapter = value; return () => { adapters.delete(ids[0]); if (ids[0] === 'multi-router') released = true; }; } } };
  t.after(async () => { await dispose?.(); globalThis.fetch = realFetch; await rm(dir, { recursive: true, force: true }); });
  await apply(ctx, { configFile: file });
  assert.equal(adapters.size, 7);
  assert.ok(!(await adapter.listModels('multi-router')).some(m => m.id === 'free')); // Legacy mixed Free is hidden.
  assert.equal(adapter.providerRetryPolicy('multi-router').maxRetries, 0);
  const options = { sessionId: 'private-test-session', provider: 'multi-router', model: 'ds4.1f', messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }], maxTokens: 16, signal: AbortSignal.timeout(10000) };
  const session = { id: options.sessionId };
  await listeners['session/event'](session, { type: 'step/start', time: 1000, data: { turn: 0, step: 0 } });
  const chunks = [];
  for await (const chunk of adapter.stream(options)) chunks.push(chunk);
  assert.ok(chunks.some(c => c.type === 'text-delta' && c.text === 'hello'), JSON.stringify(chunks));
  assert.deepEqual(calls, ['Bearer wb1', 'Bearer wb2']);
  await listeners['session/event'](session, { type: 'assistant/message', time: 9000, data: { turn: 0, step: 0, stream: [{ type: 'text-chunks', time0: 3000, dt: [], texts: ['hello'] }], usage: { outputTokens: 30 } } });
  await listeners['session/event'](session, { type: 'tool/call', time: 9100, data: { turn: 0, step: 0, callId: 'private-call', arguments: 'private-arguments' } });
  await listeners['session/event'](session, { type: 'tool/result', time: 10100, data: { turn: 0, step: 0, message: { source: { callId: 'private-call' } } } });
  await listeners['session/event'](session, { type: 'step/end', time: 10200, data: { turn: 0, step: 0 } });
  const usage = JSON.parse(await readFile(join(dir, 'usage.json'), 'utf8'));
  const measured = usage.events.find(e => e.outcome === 'completed');
  assert.equal(measured.timingSource, 'dsh-step'); assert.equal(measured.timing.modelMs, 8000); assert.equal(measured.timing.toolMs, 1000); assert.equal(measured.timing.ttftMs, 2000);
  assert.doesNotMatch(JSON.stringify(usage), /private-test-session|private-call|private-arguments/);
  for await (const chunk of adapter.stream(options)) { /* confirm sticky account through actual adapter */ }
  assert.deepEqual(calls, ['Bearer wb1', 'Bearer wb2', 'Bearer wb2']);
  const builtin = adapters.get('workbuddy');
  assert.deepEqual(await builtin.listModels('workbuddy'), []);
  const nativeChunks = [];
  for await (const chunk of builtin.stream({ ...options, provider: 'workbuddy', model: 'deepseek-v4.1-flash' })) nativeChunks.push(chunk);
  assert.ok(nativeChunks.some(c => c.type === 'text-delta' && c.text === 'hello'));
  assert.equal(calls.at(-1), 'Bearer wb2');
  assert.ok(logs.some(x => x.includes('"status":429')));
  await dispose(); assert.equal(released, true); assert.equal(adapters.size, 0);
});

test('real DSH adapter offers full modes and keeps Default, Off and free defaults distinct per concurrent call', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'router-efforts-'));
  const accounts = [];
  for (const id of ['wb1', 'wb2']) { const credentialFile = join(dir, `${id}.json`); await writePrivateJson(credentialFile, wbCredential(id)); accounts.push({ id, provider: 'workbuddy', credentialFile }); }
  const modelId = 'deepseek-v4.1-flash';
  const freeId = `free_${createHash('sha256').update(JSON.stringify(['free', 'workbuddy', modelId])).digest('hex').slice(0, 24)}`;
  const file = join(dir, 'router.json');
  await writePrivateJson(file, { accounts, routes: { free: { ...ROUTE_PRESETS.free, freeModels: { [freeId]: { reasoningEffort: 'high' } } },
    custom: { name: '全部档位', contextWindow: 200000, maxTokens: 32000, preferExpiringCredits: false, targets: [{ provider: 'workbuddy', model: modelId }] } } });
  const realFetch = globalThis.fetch, wire = [], loopback = [];
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith('http://127.0.0.1')) {
      loopback.push(new Headers(options?.headers).get('x-multi-router-reasoning'));
      return realFetch(url, options);
    }
    if (String(url).endsWith('/v3/config')) {
      const second = options.headers.Authorization === 'Bearer wb2';
      return Response.json({ code: 0, data: { models: [{ id: modelId, name: 'DeepSeek Flash', credits: 'x0.00', maxInputTokens: 200000, maxOutputTokens: 32000,
        supportsReasoning: true, onlyReasoning: false, reasoning: { supportedEfforts: second ? ['medium', 'high', 'max'] : ['low'], canDisableThinking: second } }],
        agents: [{ name: 'cli', models: [modelId] }] } });
    }
    if (String(url).endsWith('/v2/chat/completions')) { wire.push({ token: options.headers.Authorization, effort: JSON.parse(options.body).reasoning_effort }); return answer(); }
    throw new Error('Unexpected endpoint in reasoning test');
  };
  let dispose; const adapters = new Map();
  const ctx = { on() {}, get: () => undefined, effect: cb => { dispose = cb(); }, emit: () => {}, logger: { info() {}, warn() {}, error() {} },
    llm: { registerAdapter(ids, value) { adapters.set(ids[0], value); return () => adapters.delete(ids[0]); } } };
  t.after(async () => { await dispose?.(); globalThis.fetch = realFetch; await rm(dir, { recursive: true, force: true }); });
  await apply(ctx, { configFile: file });
  await adapters.get('workbuddy').listModels('workbuddy'); // Wait for the real account catalogs.
  const adapter = adapters.get('multi-router');
  assert.equal((await adapter.listModels('multi-router'))[0].id, freeId);
  for (const id of ['custom', freeId]) {
    const resolved = await adapter.resolveModel('multi-router', id);
    assert.deepEqual(resolved.reasoning.efforts.map(e => e.id), ['off', 'low', 'medium', 'high', 'max']);
  }
  const options = { provider: 'multi-router', model: 'custom', messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }], maxTokens: 16, signal: AbortSignal.timeout(10000) };
  assert.equal((await adapter.resolveModel('multi-router', freeId)).reasoning.defaultEffort, 'high');
  assert.equal((await adapter.prepareCall('multi-router', freeId)).model.reasoning.defaultEffort, 'high');
  const consume = async (extra, prepared) => { const chunks = []; for await (const chunk of (prepared ?? adapter).stream({ ...options, ...extra })) chunks.push(chunk); assert.ok(chunks.some(c => c.type === 'text-delta')); };
  await consume({ reasoningEffort: 'max' }); assert.deepEqual(wire.at(-1), { token: 'Bearer wb2', effort: 'max' });
  await consume({ reasoningEffort: 'off' }); assert.equal(loopback.at(-1), 'off'); assert.deepEqual(wire.at(-1), { token: 'Bearer wb2', effort: undefined });
  await consume({}); assert.equal(loopback.at(-1), 'default'); assert.equal(wire.at(-1).effort, undefined);
  await consume({ model: freeId }); assert.equal(loopback.at(-1), 'high'); assert.equal(wire.at(-1).effort, 'high');
  await consume({ model: freeId, reasoningEffort: 'low' }); assert.deepEqual(wire.at(-1), { token: 'Bearer wb1', effort: 'low' });
  await consume({ reasoningEffort: 'medium' }, await adapter.prepareCall('multi-router', 'custom'));
  assert.deepEqual(wire.at(-1), { token: 'Bearer wb2', effort: 'medium' });
  wire.length = 0; loopback.length = 0;
  await Promise.all([consume({ reasoningEffort: 'low' }), consume({ reasoningEffort: 'high' })]);
  assert.deepEqual([...loopback].sort(), ['high', 'low']);
  assert.deepEqual(wire.map(x => x.effort).sort(), ['high', 'low']);
});

test('actual Qoder transport keeps PATs isolated and catalog 4xx switches between Qoder accounts', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'multi-qoder-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const accounts = [];
  for (const id of ['qd1', 'qd2']) {
    const file = join(dir, `${id}.json`); await writePrivateJson(file, { version: 2, pat: id, region: 'china', savedAt: new Date().toISOString() });
    accounts.push({ id, provider: 'qoder', credentialFile: file });
  }
  const realFetch = globalThis.fetch, pats = [];
  globalThis.fetch = async (url, options) => {
    assert.match(String(url), /openapi\.qoder\.com\.cn\/api\/v1\/jobToken\/exchange$/);
    pats.push(JSON.parse(options.body).personal_token);
    return Response.json({ message: 'rejected' }, { status: 401 });
  };
  t.after(() => { globalThis.fetch = realFetch; });
  const config = validateConfig({ accounts });
  const router = new Router(config, a => createAccountClient(a, config));
  await assert.rejects(router.chat({ model: 'ds4.1f', stream: true, messages: [{ role: 'user', content: 'hi' }] }), e => {
    assert.equal(e.attempts.length, 2); assert.ok(e.attempts.every(a => a.status === 401)); return true;
  });
  assert.deepEqual(pats, ['qd1', 'qd2']);
});

test('Trae accounts use their own tokens, identity and discovered wire config/function', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'multi-trae-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const accounts = [];
  for (const id of ['tr1', 'tr2']) {
    const file = join(dir, `${id}.json`), identityFile = join(dir, `${id}.identity.json`);
    await writePrivateJson(file, { version: 1, credential: { accessToken: id, userId: id, host: 'https://api.trae.cn',
      expiresAtMs: Date.now() + 3600000, edition: 'solo', source: 'dsh' } });
    await writePrivateJson(identityFile, { edition: 'solo', deviceId: `${id}-device`, machineId: `${id}-machine`, platform: 'darwin' });
    accounts.push({ id, provider: 'trae', credentialFile: file, identityFile });
  }
  const realFetch = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, options) => {
    if (String(url).includes('/models?')) return Response.json({ data: { list: [{ models: [{ id: 'display-41', name: 'DeepSeek-V4.1-Flash', context_window_tokens: { dev: 200000 } }] }] } });
    if (String(url).includes('get_detail_param')) return Response.json({ config_info_list: [{ config_name: 'wire-41', display_config: { display_name: 'DeepSeek-V4.1-Flash' }, model_detail_list: [{ prompt_max_tokens: 200000, max_tokens: 32000 }] }] });
    if (String(url).includes('llm_utils_chat')) {
      const input = JSON.parse(options.body); const id = options.headers.Authorization?.includes('tr1') ? 'tr1' : 'tr2';
      assert.equal(options.headers['x-device-id'], `${id}-device`);
      assert.equal(input.config_name, 'wire-41'); assert.ok(input.function);
      calls.push(id);
      return id === 'tr1' ? new Response('event: error\ndata: {"code":4011,"message":"rate limit"}\n\n')
        : new Response('event: output\ndata: {"response":"trae hello"}\n\nevent: done\ndata: {"finish_reason":"stop"}\n\n');
    }
    throw new Error(`Unexpected endpoint ${url}`);
  };
  t.after(() => { globalThis.fetch = realFetch; });
  const config = validateConfig({ accounts });
  const router = new Router(config, a => createAccountClient(a, config));
  const selected = await router.chat({ model: 'ds4.1f', stream: true, messages: [{ role: 'user', content: 'hi' }] });
  assert.equal(selected.account, 'tr2'); assert.match(await selected.response.text(), /trae hello/);
  assert.deepEqual(calls, ['tr1', 'tr2']);
});

test('loopback shim authenticates before routing and rejects malformed local requests', async t => {
  const config = validateConfig({ accounts: [] });
  const shim = createShim(new Router(config, () => {})); await shim.ready; t.after(() => shim.close());
  const headers = { Authorization: `Bearer ${shim.token()}`, 'Content-Type': 'application/json' };
  assert.equal((await fetch(`${shim.baseUrl()}/v1/models`)).status, 401);
  assert.equal((await fetch(`${shim.baseUrl()}/v1/models`, { headers })).status, 200);
  assert.equal((await fetch(`${shim.baseUrl()}/v1/models`, { headers: { ...headers, Origin: 'https://evil.example' } })).status, 403);
  const malformed = await fetch(`${shim.baseUrl()}/v1/chat/completions`, { method: 'POST', headers, body: '{' });
  assert.equal(malformed.status, 400);
  const exhausted = await fetch(`${shim.baseUrl()}/v1/chat/completions`, { method: 'POST', headers,
    body: JSON.stringify({ model: 'ds4.1f', stream: true, messages: [{ role: 'user', content: 'hi' }] }) });
  assert.equal(exhausted.status, 503);
});

test('account imports preserve source and write private independent credential files', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'multi-import-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const source = join(dir, 'source.json'); const document = wbCredential('wb-token'); await writePrivateJson(source, document);
  const before = await readFile(source, 'utf8');
  for (const id of ['a', 'b']) {
    const file = join(dir, id, 'credential.json');
    await importAccount({ provider: 'workbuddy', source, credentialFile: file });
    assert.equal((await stat(file)).mode & 0o777, 0o600);
    assert.equal(JSON.parse(await readFile(file, 'utf8')).credential.accessToken, 'wb-token');
  }
  assert.equal(await readFile(source, 'utf8'), before);
});

test('cancelled discovery waiter does not poison another concurrent request', async () => {
  let finish, count = 0;
  const models = cachedModels(async () => { count++; return new Promise(resolve => { finish = resolve; }); }, 1000);
  const controller = new AbortController();
  const cancelled = models(controller.signal); const healthy = models();
  controller.abort(); await assert.rejects(cancelled, e => e.name === 'AbortError');
  finish([{ id: 'm' }]); assert.deepEqual(await healthy, [{ id: 'm' }]); assert.equal(count, 1);
});

test('forced pricing discovery bypasses a fresh catalog cache and shares concurrent refreshes', async () => {
  let count = 0;
  const models = cachedModels(async () => [{ id: 'm', creditMultiplier: count++ ? 1 : 0 }], 300000);
  assert.equal((await models())[0].creditMultiplier, 0);
  assert.equal((await models())[0].creditMultiplier, 0);
  const [a, b] = await Promise.all([models(undefined, true), models(undefined, true)]);
  assert.equal(a[0].creditMultiplier, 1); assert.equal(b[0].creditMultiplier, 1); assert.equal(count, 2);
  assert.equal((await models())[0].creditMultiplier, 1);
});
