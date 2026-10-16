import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ensureConfig, writePrivateJson, ROUTE_PRESETS } from '../src/config.mjs';

test('upgrading an existing route config automatically adds newly shipped presets without resetting user settings', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'router-preset-upgrade-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, 'router.json');
  const customized = { ...structuredClone(ROUTE_PRESETS['glm-5.3']), name: 'My GLM', visible: false, contextMode: 'custom', contextWindow: 500000 };
  const existing = { accounts: [], routes: { 'glm-5.3': customized }, usageRetentionDays: 12 };
  await writePrivateJson(file, existing);
  await ensureConfig(file);
  const saved = JSON.parse(await readFile(file, 'utf8'));
  for (const id of ['qwen3.8-max', 'qwen3.8-flash', 'hy4-preview']) assert.deepEqual(saved.routes[id], ROUTE_PRESETS[id], id);
  assert.deepEqual(saved.routes['glm-5.3'], customized);
  assert.equal(saved.usageRetentionDays, 12);
  assert.deepEqual(saved.accounts, []);
  assert.ok(!saved.routes.free); // An old preset removed by the user stays removed.
  const first = await readFile(file, 'utf8');
  await ensureConfig(file);
  assert.equal(await readFile(file, 'utf8'), first);
});

test('concurrent first starts initialize once and never replace an existing or invalid config', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'router-config-init-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, 'nested', 'router.json');
  const configs = await Promise.all([ensureConfig(file), ensureConfig(file)]);
  assert.deepEqual(configs[0], configs[1]);
  const existing = { accounts: [], routes: {}, seenRoutePresets: Object.keys(ROUTE_PRESETS), usageRetentionDays: 12 };
  await writePrivateJson(file, existing);
  const saved = await readFile(file, 'utf8');
  assert.equal((await ensureConfig(file)).usageRetentionDays, 12);
  assert.equal(await readFile(file, 'utf8'), saved);
  for (const broken of ['', '{', '{"accounts":"wrong"}', '{"accounts":[],"seenRoutePresets":"wrong"}']) {
    await writeFile(file, broken);
    await assert.rejects(ensureConfig(file));
    assert.equal(await readFile(file, 'utf8'), broken);
  }
});

test('preset upgrade is concurrent-safe and remembers removed, hidden and customized routes', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'router-preset-history-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, 'router.json');
  const custom = { ...structuredClone(ROUTE_PRESETS['qwen3.8-max']), name: 'Private Qwen', visible: false,
    contextMode: 'custom', contextWindow: 400000, strategy: 'weighted', targets: [{ provider: 'qoder', model: 'qmodel_38max', weight: 4 }] };
  await writePrivateJson(file, { accounts: [], routes: { 'qwen3.8-max': custom }, seenRoutePresets: ['hy4-preview', 'future-preset'] });
  const [a, b] = await Promise.all([ensureConfig(file), ensureConfig(file)]);
  assert.deepEqual(a, b);
  const saved = JSON.parse(await readFile(file, 'utf8'));
  assert.deepEqual(saved.routes['qwen3.8-max'], custom);
  assert.deepEqual(saved.routes['qwen3.8-flash'], ROUTE_PRESETS['qwen3.8-flash']);
  assert.ok(!saved.routes['hy4-preview']);
  assert.ok(saved.seenRoutePresets.includes('future-preset'));
  assert.equal(new Set(saved.seenRoutePresets).size, saved.seenRoutePresets.length);
  delete saved.routes['qwen3.8-flash'];
  await writePrivateJson(file, saved);
  const before = await readFile(file, 'utf8');
  await ensureConfig(file);
  assert.equal(await readFile(file, 'utf8'), before, 'a handled preset never reappears after removal or restart');
});
