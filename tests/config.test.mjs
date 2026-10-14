import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ensureConfig, writePrivateJson } from '../src/config.mjs';

test('concurrent first starts initialize once and never replace an existing or invalid config', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'router-config-init-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, 'nested', 'router.json');
  const configs = await Promise.all([ensureConfig(file), ensureConfig(file)]);
  assert.deepEqual(configs[0], configs[1]);
  const existing = { accounts: [], routes: {}, usageRetentionDays: 12 };
  await writePrivateJson(file, existing);
  const saved = await readFile(file, 'utf8');
  assert.equal((await ensureConfig(file)).usageRetentionDays, 12);
  assert.equal(await readFile(file, 'utf8'), saved);
  for (const broken of ['', '{', '{"accounts":"wrong"}']) {
    await writeFile(file, broken);
    await assert.rejects(ensureConfig(file));
    assert.equal(await readFile(file, 'utf8'), broken);
  }
});
