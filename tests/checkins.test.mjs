import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Checkins } from '../src/checkins.mjs';
import { writePrivateJson, validateConfig } from '../src/config.mjs';
import { claimTraeCheckin, createAccountClient } from '../lib/clients.js';
import { exportConfiguration, decodeConfiguration } from '../src/migration.mjs';

async function fixture(t, accounts, claims = () => ({ status: 'claimed', amount: 100 })) {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-checkin-')); t.after(() => rm(dir, { recursive: true, force: true }));
  let now = Date.parse('2026-10-15T11:00:00+08:00'), calls = [], monitored = [];
  const manager = { config: { accounts }, router: { client: async a => ({ checkin: {
    identity: async () => ({ account: a.uid || a.id, device: a.device }),
    claim: async () => { calls.push(a.id); return claims(a); },
  } }) }, monitorAccount: async a => { monitored.push(a.id); } };
  const file = join(dir, 'checkins.json');
  const create = () => new Checkins(file, manager, { now: () => now, spacingMs: 0 });
  const scheduler = create(); await scheduler.load();
  return { manager, file, scheduler, calls, monitored, create, setNow: value => { now = Date.parse(value); },
    run: async (ids, auto = false) => { scheduler.start(ids, auto); await scheduler.flight; } };
}

test('check-in is opt-in, enabled accounts only, daily persisted and duplicate identities deduplicated', async t => {
  const f = await fixture(t, [{ id: 'one', provider: 'trae', device: 'official-device', uid: 'same-user' },
    { id: 'copy', provider: 'trae', device: 'other-device', uid: 'same-user' },
    { id: 'off', provider: 'qoder', autoCheckin: true, enabled: false }]);
  await f.run(undefined, true); assert.deepEqual(f.calls, []);
  await f.run(['one', 'copy', 'off']); assert.deepEqual(f.calls, ['one']);
  assert.equal(f.scheduler.state().accounts.find(a => a.id === 'copy').last.status, 'claimed');
  assert.deepEqual(f.monitored, ['one']);
  const restarted = f.create(); await restarted.load(); restarted.start(['one']); await restarted.flight;
  assert.deepEqual(f.calls, ['one']);
  assert.ok(!(await readFile(f.file, 'utf8')).includes('same-user'), 'identity is only persisted as a hash');
  f.setNow('2026-10-16T11:00:00+08:00'); await f.run(['one']); assert.deepEqual(f.calls, ['one', 'one']);
});

test('shared Trae device and ambiguous timeouts never trigger another claim that day', async t => {
  const f = await fixture(t, [{ id: 'one', provider: 'trae', device: 'official-device' }, { id: 'two', provider: 'trae', device: 'official-device' }], () => { throw Error('network timeout with secret-token'); });
  await f.run(['one', 'two']); assert.deepEqual(f.calls, ['one']);
  const rows = f.scheduler.state().accounts;
  assert.equal(rows[0].last.status, 'uncertain'); assert.equal(rows[1].last.status, 'device-used');
  const restarted = f.create(); await restarted.load(); restarted.start(['one', 'two']); await restarted.flight;
  assert.deepEqual(f.calls, ['one']); assert.ok(!(await readFile(f.file, 'utf8')).includes('secret-token'));
});

test('a platform refusal stops the whole platform, persists and resume cannot clear daily attempts', async t => {
  const f = await fixture(t, [{ id: 'one', provider: 'qoder', autoCheckin: true }, { id: 'two', provider: 'qoder', autoCheckin: true }], () => ({ status: 'paused' }));
  await f.run(undefined, true); assert.deepEqual(f.calls, ['one']);
  f.setNow('2026-10-16T11:00:00+08:00'); await f.run(undefined, true); assert.deepEqual(f.calls, ['one']);
  f.setNow('2026-10-15T12:00:00+08:00'); await f.scheduler.resume('qoder');
  await f.run(['one']); assert.deepEqual(f.calls, ['one']);
});

test('claim intent survives a crash, corrupt journals fail closed and concurrent processes submit once', async t => {
  const f = await fixture(t, [{ id: 'one', provider: 'qoder' }]);
  const second = f.create(); await second.load();
  f.scheduler.start(['one']); second.start(['one']); await Promise.all([f.scheduler.flight, second.flight]);
  assert.equal(f.calls.length, 1);
  const raw = JSON.parse(await readFile(f.file, 'utf8')); Object.values(raw.records)[0].status = 'uncertain'; await writePrivateJson(f.file, raw);
  const third = f.create(); await third.load(); third.start(['one']); await third.flight; assert.equal(f.calls.length, 1);
  await writePrivateJson(f.file, {}); const broken = f.create(); await broken.load(); broken.start(['one']); await broken.flight;
  assert.ok(broken.state().error); assert.equal(f.calls.length, 1);
});

test('automatic catchup obeys the Beijing window, filters unsupported providers and validates preferences', async t => {
  const f = await fixture(t, [{ id: 'one', provider: 'qoder', autoCheckin: true }, { id: 'wb', provider: 'workbuddy', autoCheckin: true }]);
  f.setNow('2026-10-15T09:59:00+08:00'); await f.run(undefined, true); assert.equal(f.calls.length, 0);
  f.setNow('2026-10-15T10:05:00+08:00'); await f.run(undefined, true); assert.deepEqual(f.calls, ['one']);
  assert.throws(() => validateConfig({ accounts: [{ id: 'wb', provider: 'workbuddy', credentialFile: 'x', autoCheckin: true }] }), /autoCheckin/);
});

test('Trae reads account/device eligibility before claiming and handles business restrictions without identity rotation', async () => {
  let claims = 0;
  const usage = { checkinStatus: async () => ({ checkedIn: false, didCheckedIn: false, enabled: true, credits: 100, extraCredits: 50 }),
    claimCheckin: async () => { claims++; return { claimed: true, code: 0 }; } };
  assert.deepEqual(await claimTraeCheckin(usage), { status: 'claimed', amount: 150 });
  assert.equal(claims, 1);
  for (const [status, expected] of [[{ checkedIn: true }, 'already-claimed'], [{ didCheckedIn: true }, 'device-used'], [{ enabled: false }, 'no-campaign']]) {
    assert.equal((await claimTraeCheckin({ ...usage, checkinStatus: async () => status })).status, expected);
  }
  assert.equal(claims, 1);
  assert.equal((await claimTraeCheckin({ ...usage, claimCheckin: async () => ({ code: 9095, claimed: false }) })).status, 'device-used');
  assert.equal((await claimTraeCheckin({ ...usage, claimCheckin: async () => ({ code: 9004, claimed: false }) })).status, 'paused');
  assert.equal((await claimTraeCheckin({ checkinStatus: async () => { throw Object.assign(Error('429'), { status: 429 }); } })).status, 'paused');
});

test('automatic check-in preferences migrate without daily claim journals or device identities', async () => {
  const config = validateConfig({ accounts: [{ id: 'tr', provider: 'trae', credentialFile: 'unused.json', autoCheckin: true }], routes: {} });
  const document = await exportConfiguration({ config }, { includeCredentials: false });
  assert.equal(document.config.accounts[0].autoCheckin, true);
  const restored = await decodeConfiguration({ document: JSON.stringify(document) });
  assert.equal(restored.config.accounts[0].autoCheckin, true);
  assert.ok(!JSON.stringify(document).includes('records'));
});

test('Qoder check-in auth/metadata stops on the first HTTP restriction without refresh retries', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-checkin-http-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, 'pat.json'); await writePrivateJson(file, { version: 2, region: 'china', pat: 'fixture-signin-pat' });
  const realFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = realFetch; });
  for (const status of [401, 403, 429]) {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return Response.json({ message: 'fixture-private-response' }, { status }); };
    const client = await createAccountClient({ id: 'qd', provider: 'qoder', credentialFile: file }, { catalogTtlMs: 1 });
    await assert.rejects(client.checkin.identity(AbortSignal.timeout(5000)));
    assert.equal(calls, 1, `HTTP ${status} must not trigger another metadata or token request`);
  }
});
