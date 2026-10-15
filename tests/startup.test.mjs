import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apply } from '../lib/index.js';
import { Manager } from '../lib/manager.js';
import { createShim } from '../lib/shim.js';

test('management panel and adapters become usable while local discovery and plugin inventory are still pending', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'router-startup-'));
  let release, handler, completed = false;
  const discovery = new Promise(resolve => { release = resolve; });
  const original = Manager.prototype.syncLocalAccounts;
  Manager.prototype.syncLocalAccounts = () => discovery;
  const disposers = [], adapters = new Set();
  await writeFile(join(dir, 'package.json'), JSON.stringify({ dependencies: {} }));
  let inventoryCalls = 0;
  const services = { profileContext: { dir }, pluginManager: { listBundles: () => { inventoryCalls++; return new Promise(() => {}); } } };
  const effect = cb => disposers.push(cb());
  const ctx = { get(name) { return services[name]; }, on() {}, emit() {}, effect, logger: { info() {}, warn() {}, error() {} },
    inject(ids, cb) { cb({ effect, webServer: { register(options) { handler = options.handler; return () => {}; } } }); },
    llm: { registerAdapter(ids) { adapters.add(ids[0]); return () => adapters.delete(ids[0]); } } };
  const boot = apply(ctx, { configFile: join(dir, 'router.json') }).then(() => { completed = true; });
  t.after(async () => {
    release(); await boot;
    for (const dispose of disposers.reverse()) await dispose?.();
    Manager.prototype.syncLocalAccounts = original;
    await rm(dir, { recursive: true, force: true });
  });
  await Promise.race([boot, new Promise(resolve => setTimeout(resolve, 300))]);
  assert.equal(typeof handler, 'function', 'panel endpoint must not wait for desktop credential discovery');
  assert.equal(completed, true, 'plugin activation must not wait for desktop credential discovery');
  assert.equal(adapters.size, 7);
  assert.equal(inventoryCalls, 1);
  let state;
  await handler({ method: 'GET', headers: { host: 'localhost' }, socket: { remoteAddress: '127.0.0.1' } },
    { writeHead(code) { assert.equal(code, 200); }, end(text) { state = JSON.parse(text); } });
  assert.equal(state.startup.phase, 'discovering');
  assert.deepEqual(state.accounts, []);
});

test('plugin disposal drains a streaming call rather than cutting its response during reload', async t => {
  let controller;
  const shim = createShim({ config: { requestTimeoutMs: 5000 }, chat: async () => ({ account: 'fixture', provider: 'fixture',
    response: new Response(new ReadableStream({ start(c) { controller = c; c.enqueue(new TextEncoder().encode('first')); } })) }) });
  await shim.ready;
  t.after(async () => { try { controller?.close(); } catch {} await shim.close(); });
  const response = await fetch(shim.baseUrl() + '/v1/chat/completions', { method: 'POST', headers: { authorization: `Bearer ${shim.token()}`, 'content-type': 'application/json' }, body: '{}' });
  assert.equal(shim.active(), 1);
  let closed = false;
  const closing = shim.close().then(() => { closed = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(closed, false, 'an active response must survive disposal');
  controller.enqueue(new TextEncoder().encode(' second')); controller.close();
  assert.equal(await response.text(), 'first second');
  await closing; assert.equal(shim.active(), 0);
});
