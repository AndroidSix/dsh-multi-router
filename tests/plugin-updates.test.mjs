import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PluginUpdates, parsePluginSource, githubCommit } from '../src/plugin-updates.mjs';
import { writePrivateJson } from '../src/config.mjs';
import { AsyncLocalStorage } from 'node:async_hooks';
const sha = 'a'.repeat(40), latest = 'b'.repeat(40);
async function fixture(t, overrides = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-plugin-update-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const deps = { 'dsh-multi-router': 'github:owner/router#main', 'other-plugin': '^1.0.0', 'disabled-plugin': 'next', 'local-plugin': 'file:/private/plugin', 'pinned-plugin': `github:owner/pinned#${sha}` };
  await writePrivateJson(join(dir, 'package.json'), { dependencies: deps, dsh: { profile: { bundles: Object.keys(deps) } } });
  await writePrivateJson(join(dir, 'package-lock.json'), { packages: { 'node_modules/dsh-multi-router': { resolved: `git+https://github.com/owner/router.git#${sha}` }, 'node_modules/pinned-plugin': { resolved: `git+https://github.com/owner/pinned.git#${sha}` } } });
  const bundles = Object.keys(deps).map(name => ({ name, installed: true, removable: true, enabled: name !== 'disabled-plugin', version: '1.0.0' }));
  bundles.push({ name: '@deepseek-ai/dsh-base', installed: false, removable: false, enabled: true, version: '0.2.0-rc.2' });
  const calls = [];
  const service = { listBundles: async () => bundles, installBundle: async (spec, opts) => {
    calls.push({ spec, opts });
    const name = spec.slice(0, spec.indexOf('@', 1));
    bundles.find(b => b.name === name).version = name === 'disabled-plugin' ? '1.2.0-beta.1' : '1.1.0';
    if (name === 'dsh-multi-router') await writePrivateJson(join(dir, 'package-lock.json'), { packages: { 'node_modules/dsh-multi-router': { resolved: `git+https://github.com/owner/router.git#${latest}` } } });
    return { packageResult: { exitCode: 0 }, application: 'restart-required' };
  }, ...overrides };
  const checks = [];
  const updater = new PluginUpdates({ service: () => service, profile: () => ({ dir }),
    lookup: async (s, p, spec) => { checks.push(spec); return { version: spec.endsWith('@next') ? '1.2.0-beta.1' : '1.1.0' }; },
    fetchImpl: async url => { assert.ok(url.startsWith('https://api.github.com/repos/owner/')); return Response.json({ sha: url.includes('/pinned/') ? sha : latest }); },
    refreshGit: async (service, profile, row, options) => service.installBundle(row.target, options) });
  return { dir, deps, bundles, calls, checks, service, updater };
}
test('only user installed plugins are listed; npm channels and Git commit changes are checked, including disabled plugins', async t => {
  const { updater, checks } = await fixture(t);
  await updater.action({ action: 'plugins.check' }); await updater.flight;
  const { rows, job } = updater.state();
  assert.equal(rows.length, 5);
  assert.equal(job.state, 'done');
  assert.deepEqual(checks.sort(), ['disabled-plugin@next', 'other-plugin@latest']);
  assert.equal(rows.find(r => r.name === 'disabled-plugin').status, 'available');
  const git = rows.find(r => r.name === 'dsh-multi-router');
  assert.equal(git.status, 'available'); assert.equal(git.version, '1.0.0');
  assert.equal(git.latestCommit, latest, 'a Git update does not depend on package version changing');
  assert.equal(rows.find(r => r.name === 'pinned-plugin').status, 'pinned');
  assert.equal(rows.some(r => r.name === '@deepseek-ai/dsh-base'), false);
  assert.equal(rows.find(r => r.name === 'local-plugin').status, 'unsupported');
  assert.equal(rows.some(r => 'spec' in r), false, 'internal source snapshots are not exposed');
});
test('batch updates keep disabled selections, preserve Git branch tracking, and update this plugin last', async t => {
  const { updater, calls } = await fixture(t);
  updater.check(); await updater.flight;
  updater.update(['dsh-multi-router', 'disabled-plugin', 'other-plugin']);
  assert.throws(() => updater.check(), /正在执行/);
  await updater.flight;
  assert.deepEqual(calls.map(c => c.spec), ['disabled-plugin@next', 'other-plugin@1.1.0', 'dsh-multi-router@github:owner/router#main']);
  assert.equal(calls[0].opts.enabled, false);
  assert.equal(calls[1].opts.enabled, true);
  assert.equal(updater.state().job.results.every(r => r.restartRequired), true);
});

test('own updates schedule reload after installation; other plugins retain the host activation outcome', async t => {
  const { updater } = await fixture(t);
  const scheduled = [];
  updater.onInstalled = name => { assert.ok(updater.flight, 'reload must be deferred until this job settles'); scheduled.push(name); return name === 'dsh-multi-router'; };
  updater.check(); await updater.flight;
  updater.update(['dsh-multi-router', 'other-plugin']); await updater.flight;
  assert.deepEqual(scheduled, ['other-plugin', 'dsh-multi-router']);
  assert.equal(updater.job.results[0].restartRequired, true);
  assert.equal(updater.job.results[1].restartRequired, false);
  assert.equal(updater.job.results[1].application, 'reload-pending');
});

test('bundled packages are excluded even with manifest entries; scoped user plugins and disabled installs remain', async t => {
  const { updater, dir, deps, bundles, checks } = await fixture(t);
  await writePrivateJson(join(dir, 'package.json'), { dependencies: { ...deps, '@deepseek-ai/dsh-base': '1.0.0', 'bundled-manager': '1.0.0', '@scope/user-plugin': '^1.0.0' } });
  bundles[5].installed = true;
  bundles.push({ name: 'bundled-manager', installed: true, removable: false, readOnlyReason: 'management-required', version: '1.0.0' },
    { name: '@scope/user-plugin', installed: true, removable: true, enabled: false, version: '1.0.0' });
  updater.check(); await updater.flight;
  assert.ok(!updater.state().rows.some(r => r.name === '@deepseek-ai/dsh-base' || r.name === 'bundled-manager'));
  assert.deepEqual(checks.sort(), ['@scope/user-plugin@latest', 'disabled-plugin@next', 'other-plugin@latest']);
  assert.equal(updater.job.total, 5, 'only user npm/Git sources are queried; local and built-in packages are excluded');
});
test('failure is visible, other plugins continue, and changed install sources are refused', async t => {
  const { updater, service, dir, deps, calls } = await fixture(t);
  updater.check(); await updater.flight;
  const original = service.installBundle;
  service.installBundle = async (spec, opts) => spec.startsWith('other-plugin@') ? { application: 'failed', error: { code: 'incompatible-version' }, packageResult: { exitCode: 1 } } : original(spec, opts);
  updater.update(['other-plugin', 'disabled-plugin']); await updater.flight;
  assert.equal(updater.job.results[0].status, 'failed');
  assert.match(updater.job.results[0].message, /不兼容/);
  assert.equal(updater.job.results[1].status, 'installed');
  updater.check(); await updater.flight;
  await writePrivateJson(join(dir, 'package.json'), { dependencies: { ...deps, 'dsh-multi-router': 'github:different/router' } });
  updater.update(['dsh-multi-router']); await updater.flight;
  assert.match(updater.job.results[0].message, /来源已改变/);
  assert.equal(calls.some(c => c.spec.includes('router#main')), false);
});
test('metadata failures are isolated; cancellation stops the remainder of a batch without reporting success', async t => {
  const { updater, service, calls } = await fixture(t);
  updater.fetchImpl = async () => Response.json({}, { status: 403 });
  updater.check(); await updater.flight;
  assert.equal(updater.rows.find(r => r.name === 'dsh-multi-router').status, 'failed');
  assert.equal(updater.rows.find(r => r.name === 'other-plugin').status, 'available');
  let release, started;
  const waiting = new Promise(resolve => { started = resolve; });
  service.installBundle = async spec => { calls.push({ spec }); started(); return new Promise(resolve => { release = resolve; }); };
  service.cancelInstall = async () => { release({ application: 'cancelled', packageResult: { exitCode: 1 } }); return { status: 'cancelled' }; };
  updater.update(['other-plugin', 'disabled-plugin']); await waiting;
  await updater.action({ action: 'plugins.cancel' }); await updater.flight;
  assert.equal(calls.length, 1);
  assert.equal(updater.job.state, 'cancelled');
  assert.equal(updater.job.results[0].status, 'failed');
});
test('source parsing supports scoped packages, npm aliases, GitHub URLs and commits while rejecting arbitrary endpoints', async () => {
  assert.equal(parsePluginSource('@scope/plugin', 'npm:@other/plugin@next').package, '@other/plugin');
  assert.equal(parsePluginSource('plugin', 'git+https://github.com/owner/repo.git#branch/a').source, 'github:owner/repo#branch/a');
  for (const value of ['https://token@github.com/owner/repo', 'https://evil.test/owner/repo', 'github:../repo', 'github:owner/repo#../evil', '--registry=evil', '$(echo evil)']) assert.equal(parsePluginSource('plugin', value).kind, 'unsupported', value);
  assert.equal(githubCommit(`https://codeload.github.com/owner/repo/tar.gz/${sha}(react@18)`), sha);
  const updater = new PluginUpdates();
  await assert.rejects(updater.action({ action: 'plugins.check' }), /未提供/);
});

test('mixed npm and pnpm locks choose the newer installer record; unreadable npm installs can be repaired and actual versions are verified', async t => {
  const { updater, dir, service, bundles } = await fixture(t);
  const { writeFile, utimes } = await import('node:fs/promises');
  await writeFile(join(dir, 'pnpm-lock.yaml'), `importers:\n  .:\n    dependencies:\n      dsh-multi-router:\n        version: https://codeload.github.com/owner/router/tar.gz/${latest}(react@18)\n`);
  await utimes(join(dir, 'pnpm-lock.yaml'), new Date(1000), new Date(1000));
  updater.check(); await updater.flight;
  assert.equal(updater.rows.find(r => r.name === 'dsh-multi-router').commit, sha, 'new npm record wins over an old pnpm file');
  await utimes(join(dir, 'pnpm-lock.yaml'), new Date(4102444800000), new Date(4102444800000));
  delete bundles.find(b => b.name === 'other-plugin').version;
  updater.check(); await updater.flight;
  assert.equal(updater.rows.find(r => r.name === 'dsh-multi-router').status, 'current');
  assert.equal(updater.rows.find(r => r.name === 'other-plugin').status, 'available');
  service.installBundle = async () => ({ packageResult: { exitCode: 0 }, application: 'restart-required' });
  updater.update(['other-plugin']); await updater.flight;
  assert.equal(updater.job.results[0].status, 'failed', 'a zero exit alone never falsely reports the latest npm version installed');
  assert.match(updater.job.results[0].message, /实际安装版本/);
});

test('Git installs never report success when a zero exit leaves the old locked commit', async t => {
  const { updater, service } = await fixture(t);
  updater.check(); await updater.flight;
  service.installBundle = async () => ({ application: 'restart-required', packageResult: { exitCode: 0 } });
  updater.update(['dsh-multi-router']); await updater.flight;
  assert.equal(updater.job.results[0].status, 'failed');
  assert.match(updater.job.results[0].message, /提交/);
});

test('GitHub checks request SHA-only media instead of downloading large commit patches', async t => {
  const { updater } = await fixture(t);
  updater.fetchImpl = async (url, options) => {
    assert.equal(options.headers.Accept, 'application/vnd.github.sha');
    return new Response((url.includes('/pinned/') ? sha : latest) + '\n');
  };
  updater.check(); await updater.flight;
  assert.equal(updater.rows.find(r => r.name === 'dsh-multi-router').latestCommit, latest);
  assert.equal(updater.rows.find(r => r.name === 'dsh-multi-router').status, 'available');
  updater.fetchImpl = async () => new Response('invalid-sha');
  updater.check(); await updater.flight;
  assert.equal(updater.rows.find(r => r.name === 'dsh-multi-router').status, 'failed');
});

test('automatic update checks are bounded to 24 hours, persist dismissals and remind again for new versions', async t => {
  const { updater, checks, calls, dir } = await fixture(t);
  let now = Date.parse('2026-10-15T12:00:00+08:00'); updater.now = () => now;
  updater.stateFile = join(dir, 'update-reminders.json'); await updater.load();
  await Promise.all([updater.tick(), updater.tick()]); await updater.flight;
  assert.equal(checks.length, 2); assert.equal(calls.length, 0, 'checking never installs');
  const reminders = updater.state().reminders;
  assert.equal(reminders.length, 3); assert.ok(!reminders.some(r => r.name.includes('deepseek-ai')));
  await updater.action({ action: 'plugins.dismiss', keys: reminders.map(r => r.key) });
  assert.equal(updater.state().reminders.length, 0);
  await updater.tick(); assert.equal(checks.length, 2);
  const restored = new PluginUpdates({ service: updater.service, profile: updater.profile, lookup: updater.lookup, fetchImpl: updater.fetchImpl, stateFile: updater.stateFile, now: () => now });
  await restored.load(); await restored.tick(); assert.equal(checks.length, 2); assert.equal(restored.state().reminders.length, 0);
  now += 86400000;
  restored.lookup = async () => ({ version: '1.2.0' });
  await restored.tick(); await restored.flight;
  assert.ok(restored.state().reminders.some(r => r.name === 'other-plugin'));
  assert.ok(!restored.state().reminders.some(r => r.name === 'dsh-multi-router'), 'same Git SHA remains acknowledged');
});

test('cached update notices drop removed plugins and revalidate externally updated versions without network checks', async t => {
  const { updater, bundles, checks, dir } = await fixture(t);
  updater.stateFile = join(dir, 'updates.json'); await updater.tick(); await updater.flight;
  assert.equal(updater.reminders().length, 3);
  bundles.splice(bundles.findIndex(r => r.name === 'other-plugin'), 1);
  bundles.find(r => r.name === 'disabled-plugin').version = '1.2.0-beta.1';
  await updater.tick();
  assert.deepEqual(updater.reminders().map(r => r.name), ['dsh-multi-router']); assert.equal(checks.length, 2);
  updater.service = () => ({ listBundles: async () => { throw Error('profile unavailable'); } });
  await assert.rejects(updater.tick(), /profile unavailable/);
  assert.equal(checks.length, 2);
});

test('failed automatic lookups reserve their retry window across restarts and never produce notices', async t => {
  const { updater, checks, dir } = await fixture(t);
  updater.stateFile = join(dir, 'failed-updates.json'); let attempts = 0;
  updater.lookup = updater.fetchImpl = async () => { attempts++; throw Error('offline'); };
  await updater.tick(); await updater.flight; const before = attempts;
  assert.equal(updater.reminders().length, 0);
  await updater.load(); await updater.tick();
  assert.equal(attempts, before); assert.equal(checks.length, 0);
});

test('install failures explain Windows file locks and network errors without exposing raw diagnostics', async t => {
  const { updater, service } = await fixture(t);
  const secret = 'Bearer private-token C:\\Users\\private-user\\.dsh';
  for (const [diagnostic, reason, pattern] of [
    [`EPERM: rename ${secret}`, 'files', /文件.*占用|权限/],
    [`ETIMEDOUT downloading ${secret}`, 'network', /网络|下载/],
    [`HMR transactions cannot be nested ${secret}`, 'activation', /加载/],
    [`unknown exception ${secret}`, 'unknown', /安装日志/],
  ]) {
    service.installBundle = async () => ({ application: 'failed', error: { code: 'operation-error', diagnostic } });
    updater.check(); await updater.flight;
    updater.update(['other-plugin']); await updater.flight;
    const result = updater.job.results[0];
    assert.equal(result.status, 'failed'); assert.equal(result.diagnostic?.reason, reason); assert.match(result.message, pattern);
    assert.ok(!JSON.stringify(updater.state()).includes('private-'), 'raw credentials and user paths never reach browser state');
  }
});

test('updates enter the official service outside an inherited HMR activation scope', async t => {
  const { updater, service } = await fixture(t);
  const executing = new AsyncLocalStorage(); updater.hmr = () => ({ executing });
  const install = service.installBundle;
  service.installBundle = async (...args) => { assert.equal(executing.getStore(), undefined); return install(...args); };
  updater.check(); await updater.flight;
  await executing.run(true, async () => { updater.update(['other-plugin']); await updater.flight; });
  assert.equal(updater.job.results[0].status, 'installed');
});

test('fresh npm installs verify the checked version instead of reporting a stale mirror install as success', async t => {
  const { updater, service } = await fixture(t);
  service.installBundle = async () => ({ bundle: 'other-plugin', application: 'restart-required', packageResult: { exitCode: 0 } });
  updater.install('other-plugin'); await updater.flight;
  assert.equal(updater.job.results[0].status, 'failed');
  assert.match(updater.job.results[0].message, /实际安装版本.*1.0.0.*1.1.0/);
});
