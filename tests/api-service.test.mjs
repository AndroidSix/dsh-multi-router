import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, get } from 'node:http';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Manager } from '../lib/manager.js';
import { Router } from '../lib/router.js';
import { validateConfig, writePrivateJson } from '../src/config.mjs';

async function freePort() {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}
async function until(check) {
  for (let i = 0; i < 100; i++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 10)); }
  assert.fail('condition did not settle');
}
const frame = value => `data: ${typeof value === 'string' ? value : JSON.stringify(value)}\r\n\r\n`;
const answer = () => new Response([
  frame({ id: 'chatcmpl-fixture', created: 1, choices: [{ index: 0, delta: { role: 'assistant', reasoning_content: '思考', content: '你好' } }] }),
  frame({ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'weather', arguments: '{"city":' } }] } }] }),
  frame({ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: '"上海"}' } }] }, finish_reason: 'tool_calls' }] }),
  frame({ choices: [], usage: { prompt_tokens: 9, completion_tokens: 7, total_tokens: 16 } }), frame('[DONE]'),
].join(''), { headers: { 'Content-Type': 'text/event-stream' } });
async function setup(t, handler = async () => ({ ok: true, response: answer() })) {
  const dir = await mkdtemp(join(tmpdir(), 'router-api-'));
  const raw = { accounts: ['workbuddy', 'trae', 'qoder'].map((provider, i) => ({ id: `a${i}`, provider, credentialFile: `${i}.json` })),
    routes: { route: { name: '统一模型', contextWindow: 10000, maxTokens: 1000, preferExpiringCredits: false, targets: ['workbuddy', 'trae', 'qoder'].map(provider => ({ provider, model: 'upstream-model' })) },
      hidden: { visible: false, contextWindow: 10000, maxTokens: 1000, targets: [{ provider: 'workbuddy', model: 'upstream-model' }] } } };
  const file = join(dir, 'router.json'); await writePrivateJson(file, raw);
  const router = new Router(validateConfig(raw, file), async account => ({ models: async () => [{ id: 'upstream-model', contextWindow: 10000, maxTokens: 1000,
    reasoning: { supports: true, supportedEfforts: ['off', 'high'], canDisableThinking: true } }], chat: (input, signal) => handler(account, input, signal) }));
  const manager = new Manager(file, router); await manager.load();
  const api = manager.api, act = input => manager.action({ apiRevision: api.state().revision, ...input });
  t.after(async () => { await api.close(); await manager.telemetry.queue; await rm(dir, { recursive: true, force: true }); });
  const configure = async () => {
    const result = await act({ action: 'api.key.create' });
    const port = await freePort();
    await act({ action: 'api.settings', enabled: true, port });
    const url = `http://127.0.0.1:${port}/v1`;
    return { key: result.apiKey, url, headers: { Authorization: `Bearer ${result.apiKey}`, 'Content-Type': 'application/json' } };
  };
  return { manager, router, api, dir, act, configure };
}

test('API defaults off, persists private settings, masks keys and restores without changing router accounts', async t => {
  const { manager, api, dir, act, configure } = await setup(t);
  await api.reconcile(); assert.equal(api.server, undefined); assert.equal(api.state().enabled, false);
  const before = await readFile(manager.file, 'utf8'), configured = await configure();
  assert.equal(api.phase, 'running'); assert.equal(api.server.address().address, '127.0.0.1');
  assert.equal((await stat(api.file)).mode & 0o777, process.platform === 'win32' ? 0o666 : 0o600);
  assert.ok(!JSON.stringify(manager.state()).includes(configured.key));
  assert.equal(await readFile(manager.file, 'utf8'), before);
  const oldRevision = api.state().revision;
  await act({ action: 'api.settings', modelIds: [] });
  await assert.rejects(manager.action({ action: 'api.settings', apiRevision: oldRevision, port: 9999 }), /配置已更新/);
  await act({ action: 'api.settings', modelIds: null });
  await api.stop(); await api.load(); await api.reconcile();
  assert.equal(api.state().enabled, true); assert.equal(api.phase, 'running');
  assert.equal((await act({ action: 'api.key.reveal' })).apiKey, configured.key);
  await act({ action: 'api.settings', enabled: false });
  await assert.rejects(fetch(`${configured.url}/models`));
  assert.equal(JSON.parse(await readFile(join(dir, 'api-service.json'))).enabled, false);
});

test('API authenticates every endpoint, rejects web origins and enforces model exposure on chat too', async t => {
  let calls = 0;
  const { api, configure, act } = await setup(t, async () => { calls++; return { ok: true, response: answer() }; });
  const { url, key, headers } = await configure();
  for (const path of ['/models', '/chat/completions', '/router/status']) assert.equal((await fetch(url + path)).status, 401);
  assert.equal((await fetch(url + '/models?api_key=' + key)).status, 401);
  assert.equal((await fetch(url + '/models', { headers: { ...headers, Origin: 'https://foreign.example' } })).status, 403);
  assert.equal(await new Promise((resolve, reject) => { get(url + '/models', { headers: { ...headers, Host: 'foreign.example' } }, res => { res.resume(); resolve(res.statusCode); }).on('error', reject); }), 403);
  assert.equal((await fetch(url + '/models', { method: 'OPTIONS' })).headers.get('access-control-allow-origin'), null);
  const listed = await (await fetch(url + '/models', { headers })).json();
  assert.deepEqual(listed.data.map(m => m.id), ['route']);
  for (const model of ['hidden', 'workbuddy::upstream-model', 'not-real', '__proto__']) {
    const response = await fetch(url + '/chat/completions', { method: 'POST', headers, body: JSON.stringify({ model, messages: [{ role: 'user', content: 'private' }] }) });
    assert.equal(response.status, 404); assert.ok(!(await response.text()).includes('a0'));
  }
  assert.equal(calls, 0);
  await act({ action: 'api.settings', modelIds: ['hidden'] });
  assert.deepEqual((await (await fetch(url + '/models', { headers })).json()).data.map(m => m.id), ['hidden']);
  assert.deepEqual(api.state().models.map(m => m.id), ['hidden']);
});

test('API streams and aggregates JSON with tool calls/reasoning/usage, uses three-provider failover and records API source', async t => {
  const attempts = [], inputs = [];
  const { manager, router, configure } = await setup(t, async (account, input) => {
    attempts.push(account.provider); inputs.push(input);
    return account.provider === 'qoder' ? { ok: true, response: answer() } : { ok: false, status: 429, kind: 'quota' };
  });
  const { url, headers } = await configure();
  const input = { model: 'route', messages: [{ role: 'user', content: 'DO_NOT_PERSIST_THIS_PROMPT' }], reasoning_effort: 'high', tools: [{ type: 'function', function: { name: 'weather', parameters: { type: 'object' } } }] };
  const result = await (await fetch(url + '/chat/completions', { method: 'POST', headers, body: JSON.stringify(input) })).json();
  assert.deepEqual(attempts, ['workbuddy', 'trae', 'qoder']);
  assert.equal(result.object, 'chat.completion'); assert.equal(result.model, 'route');
  assert.equal(result.choices[0].message.content, '你好'); assert.equal(result.choices[0].message.reasoning_content, '思考');
  assert.equal(result.choices[0].finish_reason, 'tool_calls');
  assert.deepEqual(result.choices[0].message.tool_calls[0], { id: 'call_1', type: 'function', function: { name: 'weather', arguments: '{"city":"上海"}' } });
  assert.equal(result.usage.total_tokens, 16); assert.equal(inputs[2].reasoning_effort, 'high');
  assert.deepEqual(inputs[2].tools, input.tools); assert.equal(inputs[2].model, 'upstream-model');
  const response = await fetch(url + '/chat/completions', { method: 'POST', headers, body: JSON.stringify({ ...input, stream: true, stream_options: { include_usage: true } }) });
  assert.match(response.headers.get('content-type'), /text\/event-stream/);
  assert.equal(response.headers.get('x-router-account'), null);
  const text = await response.text(); assert.match(text, /data: \[DONE\]/); assert.match(text, /"model":"route"/); assert.match(text, /"total_tokens":16/);
  const events = manager.telemetry.state().events;
  assert.equal(events.length, 4); assert.ok(events.every(e => e.source === 'api' && e.session === null));
  assert.equal(manager.api.state().today.calls, 2); assert.equal(manager.api.state().today.tokens, 32);
  const disk = await readFile(manager.telemetry.file, 'utf8'); assert.ok(!disk.includes(input.messages[0].content)); assert.ok(!disk.includes('weather'));
  assert.equal(router.status().find(s => s.id === 'a2').activeFor[0], 'route');
});

test('API key rotation immediately rejects old key; revoke stops service; invalid and occupied ports are recoverable', async t => {
  const { api, configure, act } = await setup(t);
  const { url, headers } = await configure();
  const oldPort = api.settings.port;
  await assert.rejects(act({ action: 'api.settings', port: 0 }), /端口/);
  assert.equal(api.settings.port, oldPort); assert.equal(api.phase, 'running');
  const result = await act({ action: 'api.key.create' });
  assert.equal((await fetch(url + '/models', { headers })).status, 401);
  assert.equal((await fetch(url + '/models', { headers: { Authorization: `Bearer ${result.apiKey}` } })).status, 200);
  const occupied = createServer(); await new Promise(resolve => occupied.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => occupied.close(resolve)));
  await act({ action: 'api.settings', port: occupied.address().port });
  assert.equal(api.phase, 'error'); assert.match(api.state().error, /占用/);
  await act({ action: 'api.settings', port: oldPort }); assert.equal(api.phase, 'running');
  await act({ action: 'api.key.revoke' });
  assert.equal(api.phase, 'stopped'); assert.equal(api.settings.key, null); assert.equal(api.settings.enabled, false);
});

test('API bounds concurrency and stopping cancels active work, releases port and permits restart', async t => {
  const { api, configure, act } = await setup(t, async (_a, _input, signal) => new Promise((_, reject) => { signal.addEventListener('abort', () => reject(signal.reason), { once: true }); }));
  const { url, headers } = await configure();
  const requests = Array.from({ length: 8 }, () => fetch(url + '/chat/completions', { method: 'POST', headers,
    body: JSON.stringify({ model: 'route', messages: [{ role: 'user', content: 'wait' }] }) }).then(r => r.status).catch(() => 'closed'));
  await until(() => api.controllers.size === 8);
  assert.equal((await fetch(url + '/chat/completions', { method: 'POST', headers, body: '{}' })).status, 429);
  await act({ action: 'api.settings', enabled: false });
  await Promise.all(requests); await until(() => api.controllers.size === 0);
  assert.equal(api.server, undefined);
  await act({ action: 'api.settings', enabled: true }); assert.equal(api.phase, 'running');
});

test('API never reports a truncated stream or upstream private error as a successful JSON answer', async t => {
  const { configure } = await setup(t, async () => ({ ok: true, response: new Response(frame({ choices: [{ index: 0, delta: { content: 'partial' } }] }) + frame({ error: { message: 'PRIVATE_VENDOR_TOKEN', code: 'no' } })) }));
  const { url, headers } = await configure();
  const response = await fetch(url + '/chat/completions', { method: 'POST', headers, body: JSON.stringify({ model: 'route', messages: [{ role: 'user', content: 'test' }] }) });
  assert.equal(response.status, 502); assert.ok(!(await response.text()).includes('PRIVATE_VENDOR_TOKEN'));
});

test('API follows dynamic free-model visibility and never allows the mixed legacy Free alias', async t => {
  const { manager, configure } = await setup(t);
  await manager.action({ action: 'route.save', revision: manager.revision, id: 'free', route: {
    freeOnly: true, preferExpiringCredits: false, contextWindow: 10000, maxTokens: 1000, targets: [{ provider: 'workbuddy' }],
  } });
  manager.catalogs.set('a0', { fetchedAt: Date.now(), models: [{ id: 'upstream-model', name: '免费模型', creditMultiplier: 0, contextWindow: 10000, maxTokens: 1000 }] });
  manager.publish();
  const { url, headers } = await configure();
  const list = async () => (await (await fetch(url + '/models', { headers })).json()).data.map(m => m.id);
  const free = (await list()).find(id => id.startsWith('free_')); assert.ok(free); assert.ok(!(await list()).includes('free'));
  await manager.action({ action: 'free.model.update', revision: manager.revision, parentId: 'free', id: free, visible: false });
  assert.ok(!(await list()).includes(free));
  const response = await fetch(url + '/chat/completions', { method: 'POST', headers, body: JSON.stringify({ model: free, messages: [{ role: 'user', content: 'hi' }] }) });
  assert.equal(response.status, 404);
});
