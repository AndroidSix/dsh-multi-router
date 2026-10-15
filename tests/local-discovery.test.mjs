import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apply } from '../lib/index.js';
import { writePrivateJson } from '../src/config.mjs';
import { traeStorageCandidates } from '../upstream/trae/src/paths.ts';

test('first install and reinstall deduplicate saved logins and CN/SOLO caches without undoing account choices', async t => {
  const home = await mkdtemp(join(tmpdir(), 'router-local-login-'));
  const old = Object.fromEntries(['HOME', 'APPDATA', 'XDG_CONFIG_HOME', 'WORKBUDDY_AUTH_FILE', 'WORKBUDDY_AI_AUTH_FILE'].map(k => [k, process.env[k]]));
  process.env.HOME = home;
  process.env.APPDATA = join(home, 'AppData', 'Roaming');
  process.env.XDG_CONFIG_HOME = join(home, '.config');
  process.env.WORKBUDDY_AUTH_FILE = join(home, 'workbuddy.info');
  process.env.WORKBUDDY_AI_AUTH_FILE = join(home, 'missing-ai.info');
  const expiry = Date.now() + 3600000;
  await writePrivateJson(process.env.WORKBUDDY_AUTH_FILE, { accessToken: 'fixture-wb', uid: 'wb-user', domain: 'www.codebuddy.cn', expiresAt: expiry });
  const storage = traeStorageCandidates().find(c => c.edition === 'solo' && c.source === 'desktop').path;
  await writePrivateJson(storage, { 'iCubeAuthInfo://icube.cloudide': JSON.stringify({ token: 'fixture-tr', userId: 'tr-user', host: 'https://api.trae.cn', expiredAt: expiry }),
    'telemetry.machineId': 'fixture-machine', 'telemetry.devDeviceId': 'fixture-device' });
  const cnStorage = traeStorageCandidates().find(c => c.edition === 'cn' && c.source === 'desktop').path;
  await writePrivateJson(cnStorage, { 'iCubeAuthInfo://icube.cloudide': JSON.stringify({ token: 'fixture-tr-cn', userId: 'tr-user', host: 'https://api.trae.cn', expiredAt: expiry - 1000 }),
    'telemetry.machineId': 'fixture-cn-machine', 'telemetry.devDeviceId': 'fixture-cn-device' });
  const before = await readFile(storage, 'utf8'), wbBefore = await readFile(process.env.WORKBUDDY_AUTH_FILE, 'utf8');
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ error: 'fixture-offline' }, { status: 503 });
  const disposers = []; let handler;
  const effect = cb => disposers.push(cb());
  const ctx = { on() {}, get: () => undefined, effect, emit() {}, logger: { info() {}, warn() {}, error() {} },
    inject(ids, cb) { cb({ effect, webServer: { register(options) { handler = options.handler; return () => {}; } } }); },
    llm: { registerAdapter() { return () => {}; } } };
  t.after(async () => {
    for (const dispose of disposers.reverse()) await dispose?.();
    globalThis.fetch = realFetch;
    for (const [k, v] of Object.entries(old)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    await rm(home, { recursive: true, force: true });
  });
  const file = join(home, 'router', 'router.json');
  await writePrivateJson(join(home, 'router', 'cached-wb.json'), { version: 1, credential: {
    accessToken: 'fixture-saved-wb', uid: 'wb-user', domain: 'www.codebuddy.cn', expiresAtMs: expiry + 1000,
  } });
  await writePrivateJson(file, { accounts: [{ id: 'saved-workbuddy', name: '已有账号名称', provider: 'workbuddy', credentialFile: 'cached-wb.json', enabled: false, weight: 3 }], routes: {} });
  await apply(ctx, { configFile: file });
  // Discovery now runs after activation; wait for its persisted completion, not
  // a fixed sleep or a desktop/network dependent activation timeout.
  for (let i = 0; ; i++) {
    const setup = await readFile(join(home, 'router', 'initial-setup.json'), 'utf8').catch(() => '');
    if (setup) break;
    assert.ok(i < 100, 'automatic discovery should finish');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  const raw = JSON.parse(await readFile(file, 'utf8'));
  assert.deepEqual(raw.accounts.map(a => a.provider).sort(), ['trae', 'workbuddy']);
  let state;
  await handler({ method: 'GET', headers: { host: 'localhost' }, socket: { remoteAddress: '127.0.0.1' } }, { writeHead() {}, end(text) { state = JSON.parse(text); } });
  assert.equal(state.accounts.length, 2);
  assert.equal(raw.accounts.find(a => a.provider === 'workbuddy').id, 'saved-workbuddy', 'first-run import recognizes a previously saved credential under a custom ID');
  assert.equal(raw.accounts.find(a => a.provider === 'workbuddy').name, '已有账号名称');
  assert.equal(raw.accounts.find(a => a.provider === 'workbuddy').weight, 3);
  assert.equal(raw.accounts.find(a => a.provider === 'workbuddy').enabled, false);
  assert.ok(state.setup.completedAt, 'first-install setup is persisted after background discovery');
  assert.equal(state.setup.dismissed, false);
  assert.equal(state.localDiscovery.find(s => s.provider === 'workbuddy').savedCount, 1);
  assert.equal(state.localDiscovery.find(s => s.provider === 'trae').savedCount, 1);
  const post = async (action, input = {}) => {
    let status;
    const { Readable } = await import('node:stream');
    const req = Readable.from([Buffer.from(JSON.stringify({ action, revision: state.revision, provider: 'trae', ...input }))]);
    Object.assign(req, { method: 'POST', headers: { host: 'localhost', 'content-type': 'application/json', 'x-multi-router-key': state.key }, socket: { remoteAddress: '127.0.0.1' } });
    await handler(req, { writeHead(code) { status = code; }, end(text) { state = JSON.parse(text); } });
    assert.equal(status, 200);
  };
  await post('accounts.discover');
  await post('monitor.refresh');
  assert.equal(state.accounts.length, 2, 'repeat discovery does not duplicate saved logins');
  assert.equal(state.localDiscovery.find(s => s.provider === 'trae').state, 'found');
  assert.ok(!JSON.stringify(state).includes('fixture-wb'));
  if (process.platform !== 'win32') for (const account of raw.accounts) assert.equal((await stat(join(home, 'router', account.credentialFile))).mode & 0o777, 0o600);
  const traeId = state.accounts.find(a => a.provider === 'trae').id;
  await post('account.update', { id: traeId, enabled: false });
  await post('monitor.refresh');
  assert.equal(state.accounts.find(a => a.id === traeId).enabled, false);
  await post('account.remove', { id: traeId });
  await post('monitor.refresh');
  assert.equal(state.accounts.some(a => a.id === traeId), false, 'automatic scan respects a removed local account');
  await post('accounts.discover');
  assert.equal(state.accounts.filter(a => a.provider === 'trae').length, 1, 'explicit rescan restores the local account once');
  await post('setup.dismiss');
  assert.equal(JSON.parse(await readFile(join(home, 'router', 'initial-setup.json'), 'utf8')).dismissed, true);
  await post('account.update', { id: state.accounts.find(a => a.provider === 'workbuddy').id, enabled: false });
  await post('account.remove', { id: state.accounts.find(a => a.provider === 'trae').id });
  const savedIds = state.accounts.map(a => a.id);
  const cached = JSON.parse(await readFile(file, 'utf8'));
  const savedCredentials = cached.accounts.map(a => a.credentialFile);
  cached.ignoredLocalAccounts = cached.ignoredLocalAccounts.map(key => { const parts = JSON.parse(key); if (parts[0] === 'trae') parts[3] = 'solo'; return JSON.stringify(parts); });
  await writePrivateJson(file, cached);
  // Simulate an install that recreates first-run guidance but retains the
  // user's existing config, credentials, removed-account cache and statistics.
  for (const dispose of disposers.splice(0).reverse()) await dispose?.();
  await rm(join(home, 'router', 'initial-setup.json'));
  await apply(ctx, { configFile: file });
  for (let i = 0; !(await readFile(join(home, 'router', 'initial-setup.json'), 'utf8').catch(() => '')); i++) {
    assert.ok(i < 100, 'reinstall discovery should finish'); await new Promise(resolve => setTimeout(resolve, 10));
  }
  const after = JSON.parse(await readFile(file, 'utf8'));
  assert.deepEqual(after.accounts.map(a => a.id), savedIds, 'first-run discovery compares existing and removed identities');
  assert.deepEqual(after.accounts.map(a => a.credentialFile), savedCredentials, 'same login does not create extra credential copies');
  assert.equal(after.accounts[0].enabled, false, 'reinstall never re-enables an existing account');
  assert.equal(await readFile(storage, 'utf8'), before);
  assert.equal(await readFile(process.env.WORKBUDDY_AUTH_FILE, 'utf8'), wbBefore);
});
