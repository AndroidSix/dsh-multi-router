import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, get } from 'node:http';
import { Manager, managementHandler, modelInfo } from '../lib/manager.js';
import { Router } from '../src/router.mjs';
import { validateConfig, writePrivateJson, FLASH_PRESET, ROUTE_PRESETS } from '../src/config.mjs';

async function setup(t, accounts = ['wb1', 'wb2', 'tr1', 'qd1'].map((id, i) => ({ id,
  provider: ['workbuddy', 'workbuddy', 'trae', 'qoder'][i], credentialFile: `accounts/${id}.json` }))) {
  const dir = await mkdtemp(join(tmpdir(), 'router-management-')); t.after(async () => { manager.closed = true; await Promise.all([...manager.refreshes.values(), ...manager.monitorFlights.values()]); await manager.telemetry.queue.catch(() => {}); await rm(dir, { recursive: true, force: true }); });
  const file = join(dir, 'router.json'), calls = [];
  const raw = { accounts, routes: { custom: { name: '自定义切换', contextWindow: 2000, maxTokens: 100,
    targets: ['workbuddy', 'trae', 'qoder'].map(provider => ({ provider, model: 'real-model' })) } } };
  await writePrivateJson(file, raw);
  const config = validateConfig(raw, file);
  const router = new Router(config, async a => ({ models: async () => [{ id: 'real-model', name: a.provider + ' original', contextWindow: 2000, maxTokens: 100 }],
    chat: async input => { calls.push({ id: a.id, model: input.model }); return a.id === 'wb1'
      ? { ok: false, status: 429 } : { ok: true, response: new Response('answer') }; } }));
  const manager = new Manager(file, router); await manager.load();
  const act = input => manager.action({ ...input, revision: manager.revision });
  return { dir, file, manager, router, calls, act };
}

test('account pool bulk selection only changes its provider, preserves check-in opt-ins and validates revisions', async t => {
  const { manager, act, file } = await setup(t);
  await act({ action: 'account.update', id: 'wb1', autoCheckin: true });
  const revision = manager.revision;
  await act({ action: 'accounts.enabled', provider: 'workbuddy', enabled: false });
  assert.ok(manager.config.accounts.filter(a => a.provider === 'workbuddy').every(a => !a.enabled));
  assert.ok(manager.config.accounts.filter(a => a.provider !== 'workbuddy').every(a => a.enabled !== false));
  assert.equal(manager.config.accounts.find(a => a.id === 'wb1').autoCheckin, true);
  await assert.rejects(manager.action({ action: 'accounts.enabled', provider: 'workbuddy', enabled: true, revision }), /配置已更新/);
  await assert.rejects(act({ action: 'accounts.enabled', provider: 'unknown', enabled: false }), /供应商/);
  await assert.rejects(act({ action: 'accounts.enabled', provider: 'trae', enabled: 'false' }), /开关/);
  await act({ action: 'accounts.enabled', provider: 'workbuddy', enabled: true });
  assert.ok(JSON.parse(await readFile(file)).accounts.filter(a => a.provider === 'workbuddy').every(a => a.enabled));
  await act({ action: 'accounts.enabled', enabled: false });
  assert.ok(manager.config.accounts.every(a => !a.enabled));
  assert.equal(manager.config.accounts.find(a => a.id === 'wb1').autoCheckin, true);
  await act({ action: 'accounts.enabled', enabled: true });
  assert.ok(manager.config.accounts.every(a => a.enabled));
});

test('check-in schedule saves with configuration revision, survives reload and keeps account opt-ins unchanged', async t => {
  const { manager, file, act } = await setup(t);
  const oldRevision = manager.revision;
  await act({ action: 'checkins.settings', schedule: { mode: 'startup', time: '09:15' } });
  assert.deepEqual(manager.state().checkins.settings, { mode: 'startup', time: '09:15' });
  assert.deepEqual(JSON.parse(await readFile(file)).checkinSchedule, { mode: 'startup', time: '09:15' });
  assert.ok(manager.config.accounts.every(a => !a.autoCheckin));
  await assert.rejects(manager.action({ action: 'checkins.settings', schedule: { mode: 'scheduled', time: '12:00' }, revision: oldRevision }), /配置已更新/);
  await assert.rejects(act({ action: 'checkins.settings', schedule: { mode: 'scheduled', time: '25:00' } }), /签到计划/);
  await manager.load(); assert.equal(manager.checkins.settings.mode, 'startup');
});

test('Trae reasoning metadata is normalized and routes preserve all target capabilities', async t => {
  const { manager } = await setup(t);
  for (const account of manager.config.accounts) manager.catalogs.set(account.id, { models: [modelInfo({ id: 'real-model',
    supportsImages: true, reasoning: account.provider === 'trae' ? { supported: ['low', 'high', 'xhigh'], defaultEffort: 'high' }
      : { supports: true, supportedEfforts: ['low', 'high', 'max'], onlyReasoning: true } })] });
  assert.deepEqual(manager.providerModels('trae')[0].reasoning.supportedEfforts, ['low', 'high', 'xhigh']);
  assert.deepEqual(manager.routeModels()[0].reasoning.supportedEfforts, ['low', 'high', 'xhigh', 'max']);
  assert.equal(manager.routeModels()[0].reasoning.canDisableThinking, false);
  assert.equal(manager.routeModels()[0].supportsImages, true);
});

test('route reasoning preserves every target mode including off', async t => {
  const { manager } = await setup(t, [
    { id: 'wb1', provider: 'workbuddy', credentialFile: 'accounts/wb1.json' },
    { id: 'tr1', provider: 'trae', credentialFile: 'accounts/tr1.json' },
  ]);
  manager.catalogs.set('wb1', { models: [modelInfo({ id: 'real-model', reasoning: {
    supports: true, supportedEfforts: ['low', 'high', 'max'], canDisableThinking: true,
  } })] });
  manager.catalogs.set('tr1', { models: [modelInfo({ id: 'real-model', reasoning: {
    supported: ['high', 'xhigh'], defaultEffort: 'high',
  } })] });
  assert.deepEqual([...manager.routeModels()[0].reasoning.supportedEfforts].sort(), ['high', 'low', 'max', 'off', 'xhigh']);
});

test('chosen reasoning mode restricts account failover without changing the requested mode', async t => {
  const { manager, router } = await setup(t);
  const calls = [];
  router.clients.clear(); router.createClient = async a => ({ models: async () => [modelInfo({ id: 'real-model', reasoning: {
    supports: true, supportedEfforts: a.provider === 'trae' ? ['low', 'high', 'xhigh'] : ['low', 'high', 'max'], canDisableThinking: false,
  } })], chat: async input => { calls.push({ account: a.id, effort: input.reasoning_effort }); return { ok: true, response: new Response('answer') }; } });
  await manager.ensureCatalog('workbuddy'); await manager.ensureCatalog('trae'); await manager.ensureCatalog('qoder');
  for (const effort of ['max', 'xhigh', 'low']) {
    calls.length = 0;
    const result = await router.chat({ model: 'custom', reasoning_effort: effort, stream: true, messages: [{ role: 'user', content: 'hi' }] });
    await result.response.text();
    assert.equal(calls[0].effort, effort);
    assert.equal(calls[0].account, effort === 'xhigh' ? 'tr1' : effort === 'max' ? 'wb1' : 'tr1');
  }
  calls.length = 0;
  await assert.rejects(router.chat({ model: 'custom', reasoning_effort: 'medium', stream: true, messages: [{ role: 'user', content: 'hi' }] }));
  assert.deepEqual(calls, []);
});

test('dynamic free routes keep per-model modes, account rates, stable selections and migration', async t => {
  const { manager, router, act, file } = await setup(t);
  const base = { contextWindow: 10000, maxTokens: 1000, billing: { credits: 'x0' }, reasoning: { supports: true, supportedEfforts: ['low', 'medium', 'high'], canDisableThinking: false } };
  const catalogs = { wb1: [{ ...base, id: 'step', name: 'Step' }, { ...base, id: 'hy3', name: 'Hy3', reasoning: { supports: true } }],
    wb2: [{ ...base, id: 'step', name: 'Step' }], tr1: [], qd1: [{ ...base, id: 'qwen', name: 'Qwen', reasoning: { supports: true, supportedEfforts: ['low', 'medium', 'xhigh'] } }] };
  const calls = [];
  router.clients.clear(); router.createClient = async a => ({ models: async () => catalogs[a.id], chat: async input => {
    calls.push({ account: a.id, model: input.model, effort: input.reasoning_effort });
    return a.id === 'wb1' ? { ok: false, status: 429 } : { ok: true, response: new Response('answer') };
  } });
  await act({ action: 'preset.add', id: 'free' });
  const free = manager.adapterModels().filter(m => m.dynamicFree);
  assert.equal(free.length, 3);
  assert.equal(manager.adapterModels().find(m => m.id === 'free').visible, false);
  const step = free.find(m => m.modelId === 'step'), hy3 = free.find(m => m.modelId === 'hy3');
  assert.equal(step.targets.length, 2); assert.equal(hy3.reasoning, undefined);
  assert.deepEqual(step.reasoning.supportedEfforts, ['low', 'medium', 'high']);
  await act({ action: 'free.model.update', parentId: 'free', id: step.id, visible: false, reasoningEffort: 'medium' });
  assert.equal(manager.adapterModels().find(m => m.id === step.id).visible, false);
  const result = await router.chat({ model: step.id, stream: true, messages: [{ role: 'user', content: 'hi' }] }); await result.response.text();
  assert.deepEqual(calls, [{ account: 'wb1', model: 'step', effort: 'medium' }, { account: 'wb2', model: 'step', effort: 'medium' }]);
  await assert.rejects(act({ action: 'free.model.update', parentId: 'free', id: hy3.id, reasoningEffort: 'high' }), /不支持/);
  await assert.rejects(act({ action: 'free.model.update', parentId: 'free', id: step.id, visible: 'yes' }), /设置无效/);
  const restored = new Manager(file, router); await restored.load();
  assert.equal(restored.adapterModels().find(m => m.id === step.id).reasoningEffort, 'medium');
  catalogs.wb1 = []; catalogs.wb2 = [];
  await restored.checkFreeModels(true); calls.length = 0;
  assert.ok(!restored.adapterModels().some(m => m.id === step.id));
  await assert.rejects(router.chat({ model: step.id, stream: true, messages: [{ role: 'user', content: 'hi' }] }));
  assert.deepEqual(calls, []); // Never send Step's conversation to Qwen or Hy3.
  catalogs.wb2 = [{ ...base, id: 'step', name: 'Step renamed' }];
  await restored.checkFreeModels(true);
  const returned = restored.adapterModels().find(m => m.id === step.id);
  assert.equal(returned.visible, false); assert.equal(returned.reasoningEffort, 'medium');
  const exported = (await restored.action({ action: 'config.export', revision: restored.revision })).exported.document;
  const destination = await setup(t, []); await destination.act({ action: 'config.import', document: JSON.stringify(exported), mode: 'replace' });
  assert.deepEqual(destination.manager.config.routes.free.freeModels, restored.config.routes.free.freeModels);
});

test('built-in provider models are independent; hide is listing-only and same-provider accounts fail over', async t => {
  const { file, manager, router, act, calls } = await setup(t);
  await act({ action: 'refresh' });
  assert.equal(manager.providerModels('workbuddy').length, 1);
  await act({ action: 'model.update', provider: 'workbuddy', id: 'real-model', name: '我的模型', visible: false });
  assert.deepEqual(manager.hiddenModels('workbuddy'), ['real-model']);
  assert.deepEqual(manager.hiddenModels('trae'), ['real-model']);
  assert.equal(manager.providerModels('workbuddy')[0].name, '我的模型');
  assert.equal(manager.providerModels('trae')[0].name, 'trae original');
  const result = await router.chat({ model: 'workbuddy::real-model', stream: true, messages: [{ role: 'user', content: 'hi' }] });
  assert.equal(result.account, 'wb2'); assert.deepEqual(calls.map(c => c.id), ['wb1', 'wb2']);
  assert.equal((await router.chat({ model: 'custom', stream: true, messages: [{ role: 'user', content: 'hi' }] })).account, 'wb2');
  const restored = new Manager(file, router); await restored.load();
  assert.equal(restored.providerModels('workbuddy')[0].name, '我的模型');
  assert.deepEqual(restored.hiddenModels('workbuddy'), ['real-model']);
  await act({ action: 'account.update', id: 'wb2', enabled: false });
  await assert.rejects(router.chat({ model: 'workbuddy::real-model', stream: true, messages: [{ role: 'user', content: 'hi' }] }), e => e.status === 503);
});

test('route names, ids, targets, order and presets persist; stale writes and invalid budgets are rejected', async t => {
  const { manager, router, act, file } = await setup(t);
  const revision = manager.revision;
  await act({ action: 'route.save', previousId: 'custom', id: 'my-flash', route: { name: '我的轮换', visible: false,
    contextWindow: 2000, maxTokens: 100, targets: [{ provider: 'qoder', account: 'qd1', models: ['missing', 'real-model'] },
      { provider: 'trae', model: 'real-model' }] } });
  assert.equal(manager.routeModels()[0].id, 'my-flash'); assert.equal(manager.routeModels()[0].visible, false);
  assert.equal((await router.chat({ model: 'my-flash', stream: true, messages: [{ role: 'user', content: 'hi' }] })).account, 'qd1');
  await assert.rejects(manager.action({ action: 'options.save', revision, cooldownMs: 1 }), e => e.status === 409);
  const before = await readFile(file, 'utf8');
  await assert.rejects(act({ action: 'route.save', id: 'my-flash', route: { targets: [{ provider: 'qoder', model: 'real-model' }] } }), /路由 ID 已存在/);
  await assert.rejects(act({ action: 'route.save', previousId: 'removed', id: 'new', route: { targets: [{ provider: 'qoder', model: 'real-model' }] } }), /原路由不存在/);
  await assert.rejects(act({ action: 'route.save', id: 'bad', route: { contextWindow: 100, maxTokens: 101, targets: [{ provider: 'qoder', model: 'real-model' }] } }));
  assert.equal(await readFile(file, 'utf8'), before);
  await act({ action: 'preset.add' });
  assert.deepEqual(manager.config.routes['deepseek-v4.1-flash'], FLASH_PRESET);
  await assert.rejects(act({ action: 'preset.add' }));
  await assert.rejects(act({ action: 'account.remove', id: 'qd1' }));
  await act({ action: 'route.remove', id: 'my-flash' }); await act({ action: 'route.remove', id: 'deepseek-v4.1-flash' });
  assert.equal(manager.routeModels().length, 0);
});

test('model visibility defaults off; bulk actions cover future catalogs, preserve names and routes, and migrate', async t => {
  const { manager, router, act, file } = await setup(t);
  await act({ action: 'refresh' });
  assert.ok(manager.state().providers.flatMap(p => p.models).every(m => !m.visible));
  const routes = structuredClone(manager.config.routes);
  await act({ action: 'model.update', provider: 'workbuddy', id: 'real-model', name: '保留名称', visible: true });
  await act({ action: 'models.visibility', visible: false });
  assert.equal(manager.providerModels('workbuddy')[0].name, '保留名称');
  assert.deepEqual(manager.config.routes, routes);
  assert.ok(manager.state().providers.flatMap(p => p.models).every(m => !m.visible));
  // A model discovered after the click follows the persisted channel default.
  manager.catalogs.get('wb1').models.push(modelInfo({ id: 'future-model', name: 'Future model' }));
  assert.ok(manager.hiddenModels('workbuddy').includes('future-model'));
  await act({ action: 'models.visibility', visible: true });
  assert.ok(manager.state().providers.flatMap(p => p.models).every(m => m.visible));
  await act({ action: 'model.update', provider: 'workbuddy', id: 'future-model', visible: false });
  assert.deepEqual(manager.hiddenModels('workbuddy'), ['future-model']);
  await act({ action: 'models.visibility', provider: 'workbuddy', visible: false });
  assert.deepEqual(manager.hiddenModels('trae'), []);
  const before = await readFile(file, 'utf8');
  await assert.rejects(act({ action: 'models.visibility', provider: 'unknown', visible: false }));
  await assert.rejects(act({ action: 'models.visibility', visible: 'false' }));
  assert.equal(await readFile(file, 'utf8'), before);
  const restored = new Manager(file, router); await restored.load();
  assert.equal(restored.modelVisible('workbuddy', 'new-after-restart'), false);
  assert.equal(restored.modelVisible('trae', 'new-after-restart'), true);
  const exported = (await act({ action: 'config.export' })).exported.document;
  const destination = await setup(t, []);
  await destination.act({ action: 'config.import', document: JSON.stringify(exported), mode: 'replace' });
  assert.deepEqual(destination.manager.config.modelVisibility, manager.config.modelVisibility);
  assert.equal(destination.manager.config.models.workbuddy['real-model'].name, '保留名称');
  assert.throws(() => validateConfig({ accounts: [], modelVisibility: { qoder: 'yes' } }));
});

test('all shared presets use explicit real IDs, fail over across providers and never overwrite user routes', async t => {
  const { manager, router, act } = await setup(t);
  const calls = [];
  router.clients.clear(); router.createClient = async a => ({
    models: async () => Object.values(ROUTE_PRESETS).filter(r => !r.freeOnly).flatMap(r => r.targets.filter(t => t.provider === a.provider).flatMap(t => t.models.map(id => ({ id, name: id, contextWindow: 200000, maxTokens: 32000,
      reasoning: a.provider === 'trae' ? { supported: ['low', 'high', 'xhigh'] } : a.provider === 'qoder' ? { supports: true, supportedEfforts: ['high', 'max'] } : { supports: true } })))),
    chat: async input => { calls.push({ provider: a.provider, model: input.model }); return a.provider === 'qoder' ? { ok: true, response: new Response('answer') } : { ok: false, status: 429 }; },
  });
  await act({ action: 'refresh' });
  await act({ action: 'preset.add', id: 'glm-5.3' });
  await act({ action: 'route.save', previousId: 'glm-5.3', id: 'glm-5.3', route: { ...manager.config.routes['glm-5.3'], name: '我的 GLM 路由', preferExpiringCredits: false } });
  const custom = structuredClone(manager.config.routes['glm-5.3']);
  await act({ action: 'preset.add-all' });
  assert.deepEqual(manager.config.routes['glm-5.3'], custom);
  assert.ok(manager.config.routes.custom);
  assert.equal(manager.state().presets.length, 8);
  assert.ok(!manager.config.routes['glm-5.2']);
  await assert.rejects(act({ action: 'preset.add', id: 'glm-5.2' }), /未知预配置/);
  assert.ok(manager.state().presets.every(p => p.added && (p.freeOnly || p.availableProviders.length === 3)));
  const ids = Object.keys(manager.config.routes); await act({ action: 'preset.add-all' }); assert.deepEqual(Object.keys(manager.config.routes), ids);
  await assert.rejects(act({ action: 'preset.add', id: 'unknown' }), /未知预配置/);
  for (const [id, preset] of Object.entries(ROUTE_PRESETS).filter(([, p]) => !p.freeOnly)) {
    assert.deepEqual(manager.routeModels().find(r => r.id === id).reasoning.supportedEfforts, ['low', 'high', 'xhigh', 'max'], id);
    calls.length = 0; router.cooldowns.clear();
    const result = await router.chat({ model: id, stream: true, messages: [{ role: 'user', content: 'hi' }] });
    assert.equal(result.provider, 'qoder'); await result.response.text();
    assert.deepEqual([...new Set(calls.map(c => c.provider))], ['workbuddy', 'trae', 'qoder']);
    assert.ok(calls.every(c => preset.targets.find(t => t.provider === c.provider).models.includes(c.model)));
  }
});

test('all three providers import independent private snapshots; account order and enablement are editable', async t => {
  const { dir, manager, act } = await setup(t, []);
  const wb = join(dir, 'wb-source.json'), trae = join(dir, 'trae-source.json'), identity = join(dir, 'identity.json');
  await writePrivateJson(wb, { version: 1, credential: { uid: 'uid', accessToken: 'wb-secret', domain: 'www.codebuddy.cn', expiresAtMs: Date.now() + 3600000 } });
  await writePrivateJson(trae, { version: 1, credential: { userId: 'uid', accessToken: 'trae-secret', edition: 'cn', expiresAtMs: Date.now() + 3600000 } });
  await writePrivateJson(identity, { edition: 'cn', machineId: 'machine', deviceId: 'device' });
  for (const id of ['wa', 'wb']) await act({ action: 'account.add', id, provider: 'workbuddy', source: wb });
  for (const id of ['ta', 'tb']) await act({ action: 'account.add', id, provider: 'trae', source: trae, identity });
  for (const id of ['qa', 'qb']) await act({ action: 'account.add', id, provider: 'qoder', pat: id + '-secret' });
  assert.equal(manager.config.accounts.length, 6);
  assert.equal(new Set(manager.config.accounts.map(a => a.credentialFile)).size, 6);
  for (const a of manager.config.accounts) assert.equal((await stat(a.credentialFile)).mode & 0o777, 0o600);
  const state = JSON.stringify(manager.state()); assert.doesNotMatch(state, /wb-secret|trae-secret|qa-secret|qb-secret|privateKey|credentialFile/);
  await act({ action: 'account.move', id: 'wb', direction: -1 });
  assert.deepEqual(manager.config.accounts.filter(a => a.provider === 'workbuddy').map(a => a.id), ['wb', 'wa']);
  await act({ action: 'account.update', id: 'wb', name: '主账号', enabled: false });
  assert.equal(manager.state().accounts.find(a => a.id === 'wb').name, '主账号');
  await act({ action: 'account.remove', id: 'wb' }); assert.equal(manager.config.accounts.length, 5);
});

test('management HTTP protects actions, rejects rebinding and never returns credentials in ordinary state', async t => {
  const { manager } = await setup(t);
  const server = createServer(managementHandler(manager));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${server.address().port}`;
  const read = await fetch(url), state = await read.json(); assert.equal(read.status, 200);
  assert.doesNotMatch(JSON.stringify(state), /credentialFile|identityFile|accessToken/);
  const rebound = await new Promise((resolve, reject) => get(url, { headers: { Host: 'attacker.example' } }, res => {
    res.resume(); resolve(res.statusCode);
  }).on('error', reject));
  assert.equal(rebound, 403);
  assert.equal((await fetch(url, { headers: { Origin: 'https://attacker.example' } })).status, 403);
  const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'options.save', revision: state.revision, cooldownMs: 2000 }) };
  assert.equal((await fetch(url, options)).status, 401);
  options.headers['X-Multi-Router-Key'] = state.key;
  assert.equal((await fetch(url, options)).status, 200);
  assert.equal((await fetch(url, options)).status, 409);
  await writePrivateJson(manager.config.accounts[0].credentialFile, { version: 1, credential: { uid: 'u', accessToken: 'http-export-secret', domain: '', expiresAtMs: Date.now() + 3600000 } });
  options.body = JSON.stringify({ action: 'account.export', id: 'wb1', revision: manager.revision });
  delete options.headers['X-Multi-Router-Key'];
  assert.equal((await fetch(url, options)).status, 401);
  options.headers['X-Multi-Router-Key'] = state.key;
  assert.equal((await fetch(url, { ...options, headers: { ...options.headers, Origin: 'https://attacker.example' } })).status, 403);
  const exported = await fetch(url, options);
  assert.equal(exported.status, 200); assert.equal(exported.headers.get('cache-control'), 'no-store');
  assert.equal((await exported.json()).exported.document.credential.accessToken, 'http-export-secret');
  assert.doesNotMatch(JSON.stringify(await (await fetch(url)).json()), /http-export-secret|accessToken/);
});

test('single-account credential extraction round-trips all regions, includes Trae identity and excludes unrelated secrets and paths', async t => {
  const source = await setup(t, []), destination = await setup(t, []);
  const expiresAtMs = Date.now() + 3600000;
  for (const provider of ['workbuddy', 'workbuddy-ai', 'trae', 'trae-global', 'qoder', 'qoder-global']) {
    const id = provider.replace('-', '_'), global = provider.endsWith('-global') || provider === 'workbuddy-ai';
    const document = provider.startsWith('qoder') ? { version: 2, pat: `secret-${id}`, region: global ? 'global' : 'china' }
      : { version: 1, credential: { accessToken: `secret-${id}`, refreshToken: `refresh-${id}`, expiresAtMs,
        ...(provider.startsWith('trae') ? { userId: id, edition: global ? 'sg' : 'cn', host: global ? 'https://growsg-normal.trae.ai' : 'https://api.trae.cn' }
          : { uid: id, domain: global ? 'www.workbuddy.ai' : '' }), unrelatedSecret: 'do-not-export' } };
    const identityDocument = provider.startsWith('trae') ? { edition: global ? 'sg' : 'cn', machineId: `machine-${id}`, deviceId: `device-${id}`, privateKey: 'do-not-export' } : undefined;
    await source.act({ action: 'account.add', id, name: `账号 ${provider}`, provider, document, identityDocument });
    const before = await readFile(source.file, 'utf8'), exported = (await source.act({ action: 'account.export', id })).exported;
    assert.equal(exported.document.provider, provider); assert.equal(exported.document.name, `账号 ${provider}`);
    assert.equal(exported.document.format, 'dsh-multi-router-account');
    assert.match(exported.filename, /^dsh-account-[a-z_-]+\.json$/);
    assert.doesNotMatch(JSON.stringify(exported), /do-not-export|credentialFile|identityFile|source|router\.json/);
    assert.equal(await readFile(source.file, 'utf8'), before);
    if (identityDocument) assert.deepEqual(exported.document.identity, { edition: identityDocument.edition, machineId: identityDocument.machineId, deviceId: identityDocument.deviceId });
    await destination.act({ action: 'account.add', id, provider, name: exported.document.name, document: exported.document });
    const restored = destination.manager.config.accounts.find(a => a.id === id), credential = JSON.parse(await readFile(restored.credentialFile, 'utf8'));
    assert.equal(credential.pat ?? credential.credential.accessToken, `secret-${id}`);
    assert.equal((await stat(restored.credentialFile)).mode & 0o777, 0o600);
    if (identityDocument) assert.deepEqual(JSON.parse(await readFile(restored.identityFile, 'utf8')), exported.document.identity);
    await assert.rejects(destination.act({ action: 'account.add', id: `wrong_${id}`, provider: provider === 'qoder' ? 'workbuddy' : 'qoder', document: exported.document }), /凭证格式无效/);
    assert.doesNotMatch(JSON.stringify(source.manager.state()), /secret-|refresh-|accessToken|privateKey/);
  }
  await assert.rejects(source.manager.action({ action: 'account.export', id: 'qoder', revision: 'stale' }), e => e.status === 409);
  await assert.rejects(source.act({ action: 'account.export', id: 'missing' }), /账号不存在/);
  await writePrivateJson(source.manager.config.accounts.find(a => a.id === 'qoder').credentialFile, {});
  await assert.rejects(source.act({ action: 'account.export', id: 'qoder' }), /尚未保存凭证/);
  await writePrivateJson(source.manager.config.accounts.find(a => a.id === 'trae').identityFile, {});
  // A structurally missing identity must not produce a deceptively portable credential.
  await assert.rejects(source.act({ action: 'account.export', id: 'trae' }), /凭证不可读/);
});

test('panel acquisition detects duplicate login, preserves existing accounts and exposes only safe login summaries', async t => {
  const { dir, manager, act } = await setup(t, []);
  const source = join(dir, 'login-source.json');
  await writePrivateJson(source, { version: 1, credential: { uid: 'account1', nickname: '测试账号', accessToken: 'private-access', refreshToken: 'private-refresh', domain: 'www.codebuddy.cn', expiresAtMs: Date.now() + 3600000 } });
  const added = await act({ action: 'account.capture', provider: 'workbuddy', source });
  assert.equal(added.accounts.length, 1); assert.equal(added.accounts[0].name, '测试账号');
  assert.equal(added.accounts[0].login.state, 'valid'); assert.equal(added.accounts[0].login.refreshable, true);
  assert.doesNotMatch(JSON.stringify(added), /private-access|private-refresh|accessToken|refreshToken/);
  await assert.rejects(act({ action: 'account.capture', provider: 'workbuddy', source }), /已在账号池中/);
  assert.equal(manager.config.accounts.length, 1);
  await writePrivateJson(source, { version: 1, credential: { uid: 'account2', nickname: '备用账号', accessToken: 'another-secret', domain: 'www.codebuddy.cn', expiresAtMs: Date.now() + 3600000 } });
  await act({ action: 'account.capture', provider: 'workbuddy', source });
  assert.equal(manager.config.accounts.length, 2);
  assert.equal(JSON.parse(await readFile(manager.config.accounts[0].credentialFile, 'utf8')).credential.uid, 'account1');
});

test('manual credentials support all three providers, reject wrong regions and preserve previous copies on update', async t => {
  const { manager, act } = await setup(t, []);
  const wb = { version: 1, credential: { uid: 'u1', accessToken: 'manual-wb', domain: '', expiresAtMs: Date.now() + 3600000 } };
  const tr = { version: 1, credential: { userId: 'u2', accessToken: 'manual-tr', host: 'https://api.trae.cn', edition: 'cn', expiresAtMs: Date.now() + 3600000 } };
  await act({ action: 'account.add', id: 'w', provider: 'workbuddy', document: wb });
  await act({ action: 'account.add', id: 't', provider: 'trae', document: tr, identityDocument: { edition: 'cn', machineId: 'm', deviceId: 'd' } });
  await act({ action: 'account.add', id: 'q', provider: 'qoder', document: { pat: 'manual-q', region: 'china' } });
  const old = manager.config.accounts[0].credentialFile;
  await act({ action: 'account.credentials', id: 'w', document: { ...wb, credential: { ...wb.credential, accessToken: 'new-wb' } } });
  assert.equal(JSON.parse(await readFile(old, 'utf8')).credential.accessToken, 'manual-wb');
  assert.equal(JSON.parse(await readFile(manager.config.accounts[0].credentialFile, 'utf8')).credential.accessToken, 'new-wb');
  const revision = manager.revision;
  await assert.rejects(act({ action: 'account.credentials', id: 't', document: { ...tr, credential: { ...tr.credential, host: 'https://attacker.example' } }, identityDocument: { edition: 'cn', machineId: 'm', deviceId: 'd' } }), /凭证格式无效/);
  await assert.rejects(act({ action: 'account.capture', provider: 'qoder', document: { pat: 'wrong', region: 'global' } }), /凭证格式无效/);
  assert.equal(manager.revision, revision);
  assert.doesNotMatch(JSON.stringify(manager.state()), /manual-wb|manual-tr|manual-q|new-wb|accessToken/);
});

test('portable encrypted migration restores all providers without source paths, validates password/tamper and backs up atomically', async t => {
  const source = await setup(t, []), destination = await setup(t, []);
  const expiresAtMs = Date.now() + 3600000;
  await source.act({ action: 'account.add', id: 'w', provider: 'workbuddy', document: { uid: 'u', accessToken: 'migration-wb-secret', domain: '', expiresAtMs } });
  await source.act({ action: 'account.add', id: 't', provider: 'trae', document: { userId: 't', accessToken: 'migration-tr-secret', edition: 'cn', expiresAtMs }, identityDocument: { edition: 'cn', machineId: 'machine', deviceId: 'device' } });
  await source.act({ action: 'account.add', id: 'q', provider: 'qoder', pat: 'migration-q-secret' });
  await source.act({ action: 'model.update', provider: 'qoder', id: 'real-model', name: '隐藏模型', visible: false });
  const password = 'migration-password';
  const encrypted = (await source.act({ action: 'config.export', includeCredentials: true, password })).exported.document;
  assert.equal(encrypted.encrypted, true); assert.doesNotMatch(JSON.stringify(encrypted), /migration-wb-secret|migration-tr-secret|migration-q-secret|credentialFile|machine/);
  const document = JSON.stringify(encrypted), before = await readFile(destination.file, 'utf8');
  await assert.rejects(destination.act({ action: 'config.import', document, password: 'wrong', mode: 'replace' }), /密码错误/);
  const tampered = { ...encrypted, data: (encrypted.data[0] === 'A' ? 'B' : 'A') + encrypted.data.slice(1) };
  await assert.rejects(destination.act({ action: 'config.import', document: JSON.stringify(tampered), password, mode: 'replace' }), /密码错误/);
  assert.equal(await readFile(destination.file, 'utf8'), before);
  const preview = await destination.act({ action: 'config.preview', document, password, mode: 'replace' });
  assert.equal(preview.importPreview.credentials, 3); assert.equal(preview.importPreview.needsLogin, 0);
  await destination.act({ action: 'config.import', document, password, mode: 'replace' });
  assert.equal(destination.manager.config.accounts.length, 3); assert.equal(destination.manager.config.models.qoder['real-model'].visible, false);
  assert.ok((await readdir(destination.dir)).some(n => n.includes('before-import')));
  for (const a of destination.manager.config.accounts) { assert.ok(a.credentialFile.startsWith(destination.dir)); assert.equal((await stat(a.credentialFile)).mode & 0o777, 0o600); }
  assert.equal(JSON.parse(await readFile(destination.manager.config.accounts[1].identityFile, 'utf8')).deviceId, 'device');
  assert.doesNotMatch(JSON.stringify(destination.manager.state()), /migration-wb-secret|migration-tr-secret|migration-q-secret|accessToken|credentialFile/);
  const restored = new Manager(destination.file, destination.router); await restored.load(); assert.equal(restored.config.accounts.length, 3);
});

test('settings-only import preserves local credentials, disables new accounts, and invalid imports leave configuration and staging unchanged', async t => {
  const source = await setup(t, []), destination = await setup(t, []);
  await source.act({ action: 'account.add', id: 'q', provider: 'qoder', pat: 'private-pat' });
  const portable = (await source.act({ action: 'config.export' })).exported.document;
  assert.doesNotMatch(JSON.stringify(portable), /private-pat|credentialFile|identityFile|\.json/);
  const document = JSON.stringify(portable);
  const preview = await destination.act({ action: 'config.preview', document, mode: 'merge' }); assert.equal(preview.importPreview.needsLogin, 1);
  await destination.act({ action: 'config.import', document, mode: 'merge' });
  assert.equal(destination.manager.config.accounts[0].enabled, false); assert.equal(destination.manager.state().accounts[0].login.state, 'missing');
  await destination.act({ action: 'account.credentials', id: 'q', document: { pat: 'local-secret', region: 'china' } });
  const credentialFile = destination.manager.config.accounts[0].credentialFile;
  await destination.act({ action: 'config.import', document, mode: 'merge' });
  assert.equal(destination.manager.config.accounts[0].credentialFile, credentialFile);
  assert.equal(JSON.parse(await readFile(credentialFile, 'utf8')).pat, 'local-secret');
  const before = await readFile(destination.file, 'utf8'), dirs = await readdir(join(destination.dir, 'accounts'));
  const broken = structuredClone(portable); broken.config.routes.custom.targets[0].account = 'unknown';
  await assert.rejects(destination.act({ action: 'config.import', document: JSON.stringify(broken), mode: 'replace' }));
  const unsafe = { ...portable, credentials: { q: { document: { pat: 'plaintext' } } } };
  await assert.rejects(destination.act({ action: 'config.import', document: JSON.stringify(unsafe), mode: 'replace' }), /必须加密/);
  assert.equal(await readFile(destination.file, 'utf8'), before); assert.deepEqual(await readdir(join(destination.dir, 'accounts')), dirs);
});

test('force-enable expiry priority clears persisted cooldown and starts quota round while preserving cumulative use', async t => {
  const { manager, act } = await setup(t);
  await act({ action: 'route.save', previousId: 'custom', id: 'custom', route: { contextWindow: 2000, maxTokens: 100, strategy: 'tokens', preferExpiringCredits: true,
    targets: [{ provider: 'workbuddy', account: 'wb1', model: 'real-model', tokenBudget: 10 }] } });
  manager.telemetry.row('accounts', 'wb1').tokens = 100;
  manager.telemetry.count('custom', 'wb1').tokens = 100;
  manager.telemetry.expiring('custom').cooldownUntil = Date.now() + 3 * 86400000;
  await manager.telemetry.persist();
  await act({ action: 'route.force-expiring', id: 'custom' });
  assert.equal(manager.telemetry.expiring('custom').cooldownUntil, 0);
  assert.equal(manager.telemetry.data.rounds.custom.bases.wb1.tokens, 100);
  assert.equal(manager.telemetry.row('accounts', 'wb1').tokens, 100);
  assert.equal(manager.config.routes.custom.preferExpiringCredits, true);
});

test('route creation generates stable internal IDs and name edits preserve session references', async t => {
  const { manager, act } = await setup(t);
  const route = { ...manager.config.routes.custom, name: '只填名称' };
  await act({ action: 'route.save', route });
  const id = Object.keys(manager.config.routes).find(id => id !== 'custom');
  assert.match(id, /^route_[a-f0-9]{16}$/);
  await act({ action: 'route.save', previousId: id, route: { ...route, name: '新显示名称' } });
  assert.equal(manager.config.routes[id].name, '新显示名称');
  assert.deepEqual(Object.keys(manager.config.routes), ['custom', id]);
  await act({ action: 'route.save', id: '', route });
  assert.equal(Object.keys(manager.config.routes).length, 3);
});

test('detail retention is configurable, persisted and migrated independently of cumulative usage', async t => {
  const { manager, file, router, act } = await setup(t);
  assert.equal(manager.state().options.usageRetentionDays, 30);
  let time = Date.now() - 2 * 86400000; manager.telemetry.now = () => time;
  await manager.telemetry.record({ account: 'wb1', provider: 'workbuddy', alias: 'custom', ok: true, status: 200, usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 } });
  time += 2 * 86400000;
  await manager.telemetry.record({ account: 'wb1', provider: 'workbuddy', alias: 'custom', ok: true, status: 200 });
  assert.equal(manager.state().telemetry.events.length, 2);
  await act({ action: 'options.save', usageRetentionDays: 1 });
  assert.equal(manager.state().telemetry.events.length, 1);
  assert.equal(manager.telemetry.row('accounts', 'wb1').tokens, 7);
  assert.equal(JSON.parse(await readFile(join(manager.file, '../usage.json'), 'utf8')).events.length, 1);
  const before = await readFile(file, 'utf8');
  for (const value of [0, -1, 366, 1.5, '3', null]) await assert.rejects(act({ action: 'options.save', usageRetentionDays: value }));
  assert.equal(await readFile(file, 'utf8'), before);
  await act({ action: 'options.save', usageRetentionDays: 10 });
  assert.equal(manager.state().telemetry.events.length, 1);
  const restored = new Manager(file, router); await restored.load();
  assert.equal(restored.state().options.usageRetentionDays, 10);
  const exported = (await act({ action: 'config.export' })).exported.document;
  const destination = await setup(t, []);
  await destination.act({ action: 'config.import', document: JSON.stringify(exported), mode: 'replace' });
  assert.equal(destination.manager.state().options.usageRetentionDays, 10);
});

test('Free is first, isolates account rates and fails over among free models without a paid fallback', async t => {
  const { manager, router, act } = await setup(t);
  const calls = [], base = { contextWindow: 10000, maxTokens: 1000 };
  const catalogs = {
    wb1: [{ ...base, id: 'free-a', billing: { credits: 'x0.00 credits', free: true } }, { ...base, id: 'free-b', billing: { credits: 'x0', free: true } }, { ...base, id: 'paid', billing: { credits: 'x1', free: false } }],
    wb2: [{ ...base, contextWindow: 1000, maxTokens: 100, id: 'free-a', billing: { credits: 'x1', free: false } }], // Same model is paid for another account.
    tr1: [{ ...base, id: 'paid-trae', creditMultiplier: 0.1 }, { ...base, id: 'badge-free', name: 'Free forever', cost: { input: 0 }, billing: { free: true } }],
    qd1: [{ ...base, id: 'qfree', billing: { credits: 'x0', free: true } }],
  };
  router.clients.clear(); router.createClient = async a => ({ models: async () => catalogs[a.id],
    chat: async input => { calls.push({ account: a.id, model: input.model }); return input.model === 'free-a' ? { ok: false, status: 403 } : { ok: true, response: new Response('data: [DONE]\n\n') }; } });
  await act({ action: 'preset.add', id: 'free' });
  await act({ action: 'free.refresh' });
  assert.equal(manager.state().routes[0].id, 'free'); assert.equal(manager.state().presets[0].id, 'free');
  assert.equal(manager.state().routes[0].contextWindow, 10000);
  const result = await router.chat({ model: 'free', stream: true, messages: [{ role: 'user', content: 'hi' }] }); await result.response.text();
  assert.deepEqual(calls, [{ account: 'wb1', model: 'free-a' }, { account: 'wb1', model: 'free-b' }]);
  calls.length = 0;
  catalogs.wb1 = catalogs.wb1.map(m => ({ ...m, billing: { credits: 'x1', free: false } }));
  const next = await router.chat({ model: 'free', stream: true, messages: [{ role: 'user', content: 'hi' }] }); await next.response.text();
  assert.deepEqual(calls, [{ account: 'qd1', model: 'qfree' }]); // Repriced models removed before any chat.
  calls.length = 0; catalogs.qd1 = [];
  await assert.rejects(router.chat({ model: 'free', stream: true, messages: [{ role: 'user', content: 'hi' }] }), e => e.code === 'free_model_pool_unavailable');
  assert.deepEqual(calls, []);
  assert.equal(manager.state().routes[0].freeStatus.accounts.reduce((n, a) => n + a.models.length, 0), 0);
  const exported = (await act({ action: 'config.export' })).exported.document;
  const destination = await setup(t, []); await destination.act({ action: 'config.import', document: JSON.stringify(exported), mode: 'replace' });
  assert.equal(destination.manager.config.routes.free.freeOnly, true);
  assert.equal(destination.manager.state().routes[0].id, 'free');
});

test('Free daily discovery survives restart, checks midnight and excludes failed accounts and expired promotions', async t => {
  const { manager, router, act, file } = await setup(t);
  const originalNow = Date.now; let now = Date.UTC(2026, 9, 13, 15, 59);
  Date.now = () => now; t.after(() => { Date.now = originalNow; });
  const counts = new Map(), unavailable = new Set();
  router.clients.clear(); router.createClient = async a => ({ models: async (_signal, force) => {
    assert.equal(force, true); counts.set(a.id, (counts.get(a.id) || 0) + 1);
    if (unavailable.has(a.id)) throw Object.assign(Error('failed'), { status: 401 });
    return [{ id: 'zero', name: 'Zero', contextWindow: 10000, maxTokens: 1000,
      ...(a.provider === 'trae' ? { creditMultiplier: 0 } : { billing: { credits: 'x0', free: true } }) }];
  } });
  await act({ action: 'preset.add', id: 'free' });
  await manager.checkFreeModels(); await manager.checkFreeModels(); assert.equal(counts.get('wb1'), 1);
  const restored = new Manager(file, router); await restored.load();
  await restored.checkFreeModels(); assert.equal(counts.get('wb1'), 1); // Today's pricing marker persisted.
  now += 60000; await restored.checkFreeModels(); assert.equal(counts.get('wb1'), 2); // Beijing midnight.
  unavailable.add('wb1'); await restored.checkFreeModels(true);
  assert.deepEqual(restored.freeModels(restored.config.accounts.find(a => a.id === 'wb1')), []);
  assert.ok(restored.freeModels(restored.config.accounts.find(a => a.id === 'tr1')).length);
  restored.catalogs.set('wb2', { fetchedAt: now, models: [modelInfo({ id: 'expired', billing: { credits: 'x0', free: true }, promotions: [{ start: now - 10000, end: now, factor: 0, priority: 1, label: 'Free' }] })] });
  assert.deepEqual(restored.freeModels(restored.config.accounts.find(a => a.id === 'wb2')), []);
  assert.throws(() => validateConfig({ accounts: [], routes: { free: { ...ROUTE_PRESETS.free, preferExpiringCredits: true } } }));
});
