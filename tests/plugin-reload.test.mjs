import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PluginReload } from '../src/plugin-reload.mjs';

async function fixture(t, options = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'router-reload-'));
  const pkg = join(dir, 'node_modules/dsh-multi-router');
  await mkdir(join(pkg, 'lib'), { recursive: true });
  await writeFile(join(dir, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: ['dsh-multi-router'] } } }));
  await writeFile(join(pkg, 'package.json'), JSON.stringify({ name: 'dsh-multi-router', version: '0.5.8' }));
  await writeFile(join(pkg, 'cordis.patch.yml'), '- insert:\n    - id: llm-multi-router-v2-0.5.8\n      name: ./lib/host-v0.5.8.js\n');
  await writeFile(join(pkg, 'lib/host-v0.5.8.js'), 'export function apply() {}');
  const calls = [];
  let reload;
  reload = new PluginReload({ runningVersion: '0.5.7', profile: () => ({ dir }), canReload: () => true,
    service: () => ({ setBundleEnabled: async (...args) => { calls.push(args); reload.stop(); return { application: 'applied' }; } }), ...options });
  t.after(async () => { reload.stop(); await rm(dir, { recursive: true, force: true }); });
  return { dir, pkg, reload, calls };
}

test('installed update invokes the official reload once, and disposal never waits on itself', async t => {
  const { reload, calls } = await fixture(t);
  await Promise.all([reload.check(), reload.check(), reload.check()]);
  assert.deepEqual(calls, [['dsh-multi-router', true]]);
  assert.equal(reload.state().installedVersion, '0.5.8');
  assert.equal(reload.state().runningVersion, '0.5.7', 'disk version is not falsely reported as active');
  await reload.check(); assert.equal(calls.length, 1);
});

test('reload waits for streams, update jobs, checkins and credential mutations, then proceeds when idle', async t => {
  let busy = true;
  const { reload, calls } = await fixture(t, { busy: () => busy });
  await reload.check(); assert.equal(reload.state().phase, 'waiting'); assert.equal(calls.length, 0);
  busy = false; await reload.check(); assert.equal(calls.length, 1);
});

test('unsupported hosts and legacy packages give an explicit fallback without reporting a successful hot update', async t => {
  const { reload, calls, pkg } = await fixture(t, { canReload: () => false });
  await reload.check(); assert.equal(reload.state().phase, 'restart-required'); assert.equal(calls.length, 0);
  reload.canReload = () => true;
  await writeFile(join(pkg, 'cordis.patch.yml'), '- insert:\n    - id: legacy\n      name: dsh-multi-router\n');
  await reload.check(); assert.equal(reload.state().phase, 'restart-required'); assert.equal(calls.length, 0);
});

test('failed reloads back off, and a user-disabled bundle is never re-enabled', async t => {
  let now = 1000, calls = 0;
  const { reload, dir } = await fixture(t, { now: () => now, service: () => ({ setBundleEnabled: async () => { calls++; throw Error('fixture'); } }) });
  await reload.check(); assert.equal(reload.state().phase, 'failed'); assert.equal(calls, 1);
  await reload.check(); assert.equal(calls, 1);
  now += 60001; await reload.check(); assert.equal(calls, 2);
  await writeFile(join(dir, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: [] } } }));
  now += 60001; await reload.check(); assert.equal(calls, 2);
});

test('Windows CRLF patch files still activate the new host and settings without restarting', async t => {
  const { reload, calls, pkg } = await fixture(t);
  const patch = '- insert:\r\n    - id: llm-multi-router-v2-0.5.8\r\n      name: ./lib/host-v0.5.8.js\r\n';
  await writeFile(join(pkg, 'cordis.patch.yml'), patch);
  await reload.check();
  assert.deepEqual(calls, [['dsh-multi-router', true]], 'Windows text line endings must not suppress live reload');
});
