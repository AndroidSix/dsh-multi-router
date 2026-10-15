import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Checkins } from '../src/checkins.mjs';
import { writePrivateJson, validateConfig } from '../src/config.mjs';
import { claimTraeCheckin, createAccountClient, createQoderCheckin } from '../lib/clients.js';
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

test('evening pass retries only proven pre-claim failures once, survives restart and account reorder', async t => {
  const f = await fixture(t, ['done', 'none', 'retry', 'unknown'].map(id => ({ id, provider: 'qoder', autoCheckin: true })),
    a => ({ status: { done: 'claimed', none: 'no-campaign', retry: 'retryable', unknown: 'uncertain' }[a.id] }));
  await f.run(undefined, true);
  assert.deepEqual(f.calls, ['done', 'none', 'retry', 'unknown']);
  const reportAt = f.scheduler.state().report.at;
  f.manager.config.accounts.reverse();
  f.setNow('2026-10-15T19:59:00+08:00'); await f.run(undefined, true);
  assert.equal(f.scheduler.state().report.at, reportAt, 'skipped pass does not create another report');
  assert.equal(f.calls.length, 4);
  f.setNow('2026-10-15T20:05:00+08:00');
  const restart = f.create(); await restart.load(); restart.start(undefined, true); await restart.flight;
  assert.deepEqual(f.calls, ['done', 'none', 'retry', 'unknown', 'retry']);
  assert.deepEqual(restart.state().report.counts, { retryable: 1 });
  assert.equal(restart.state().accounts.find(a => a.id === 'retry').last.retryReady, false);
  f.setNow('2026-10-15T23:00:00+08:00'); restart.start(undefined, true); await restart.flight;
  assert.equal(f.calls.length, 5);
});

test('duplicate account copies share the evening attempt budget and credential replacement never clears an uncertain claim', async t => {
  const f = await fixture(t, [{ id: 'first', uid: 'same-user', provider: 'qoder' }, { id: 'copy', uid: 'same-user', provider: 'qoder' }], () => ({ status: 'retryable' }));
  await f.run(['first', 'copy']); assert.deepEqual(f.calls, ['first']);
  f.manager.config.accounts.reverse();
  f.setNow('2026-10-15T20:05:00+08:00'); await f.run(['copy', 'first']); assert.deepEqual(f.calls, ['first', 'copy']);
  await f.run(['first', 'copy']); assert.equal(f.calls.length, 2);
  const raw = JSON.parse(await readFile(f.file)); Object.values(raw.records)[0].status = 'uncertain'; await writePrivateJson(f.file, raw);
  await f.scheduler.credentialsUpdated('copy'); await f.run(['first', 'copy']); assert.equal(f.calls.length, 2);
});

test('identity failures are recorded per account without pausing others; only explicit credential changes recover invalid auth', async t => {
  const f = await fixture(t, [{ id: 'invalid', provider: 'qoder' }, { id: 'network', provider: 'qoder' }, { id: 'valid', provider: 'qoder' }]);
  const client = f.manager.router.client;
  f.manager.router.client = async a => {
    if (a.id === 'invalid') throw Object.assign(Error('private-response'), { status: 401 });
    if (a.id === 'network') throw Error('timeout');
    return client(a);
  };
  await f.run(['invalid', 'network', 'valid']); assert.deepEqual(f.calls, ['valid']);
  assert.equal(f.scheduler.state().accounts[0].last.status, 'auth-invalid');
  assert.equal(f.scheduler.state().accounts[1].last.status, 'retryable');
  assert.ok(f.scheduler.state().accounts.every(a => !a.paused));
  f.setNow('2026-10-15T20:05:00+08:00'); await f.run(['invalid', 'network', 'valid']);
  assert.deepEqual(f.calls, ['valid']);
  const raw = JSON.parse(await readFile(f.file));
  assert.equal(Object.values(raw.records).find(r => r.ids.includes('network')).attempts, 2);
  f.manager.router.client = client;
  await f.scheduler.credentialsUpdated('invalid'); await f.run(['invalid']);
  assert.deepEqual(f.calls, ['valid', 'invalid']);
  await f.scheduler.credentialsUpdated('valid'); await f.run(['valid']); assert.equal(f.calls.length, 2);
  assert.ok(!(await readFile(f.file, 'utf8')).includes('private-response'));
});

test('Trae retries status read failures but never retries an ambiguous claim; HTTP auth remains distinct', async () => {
  assert.equal((await claimTraeCheckin({ checkinStatus: async () => { throw Error('network'); } })).status, 'retryable');
  assert.equal((await claimTraeCheckin({ checkinStatus: async () => { throw Object.assign(Error('unauthorized'), { status: 401 }); } })).status, 'auth-invalid');
  assert.equal((await claimTraeCheckin({ checkinStatus: async () => ({ enabled: true }), claimCheckin: async () => { throw Error('timeout'); } })).status, 'uncertain');
});

test('Qoder exchanges PAT, uses desktop campaigns header, selects only an active claimable benefit and reports observed reward', async () => {
  const now = Date.parse('2026-10-15T11:00:00+08:00'), calls = [];
  let rows = [{ campaignId: 'promo', actionType: 'SHOW', claimStatus: 'CLAIMABLE' },
    { campaignId: 'locked', actionType: 'CLAIM_BENEFIT', claimStatus: 'LOCKED' },
    { campaignId: 'yesterday', actionType: 'CLAIM_BENEFIT', claimStatus: 'CLAIMABLE', endAt: now / 1000 - 1 },
    { campaignId: 'done', actionType: 'CLAIM_BENEFIT', claimStatus: 'CLAIMED' },
    { campaignId: 'daily/id', actionType: 'CLAIM_BENEFIT', claimStatus: 'CLAIMABLE', startAt: now / 1000 - 60, endAt: now / 1000 + 86400 }];
  const fetchImpl = async (url, options) => {
    calls.push([url, options]);
    if (url.endsWith('/exchange')) { assert.deepEqual(JSON.parse(options.body), { personal_token: 'pt-fixture' }); return Response.json({ token: 'jt-fixture' }); }
    assert.equal(options.headers.authorization, 'Bearer jt-fixture');
    if (url.endsWith('/userinfo')) return Response.json({ id: 'stable-user' });
    assert.equal(options.headers['cosy-clienttype'], '10');
    if (url.endsWith('/campaigns')) return Response.json({ campaigns: rows });
    assert.ok(url.endsWith('/daily%2Fid/claim')); assert.equal(options.method, 'POST');
    return Response.json({ status: 'CLAIMED', benefit: { amount: 37 } });
  };
  const c = createQoderCheckin('china', async () => 'pt-fixture', { fetchImpl, now: () => now });
  assert.deepEqual(await c.identity(), { account: 'stable-user' });
  assert.deepEqual(await c.claim(), { status: 'claimed', amount: 37 });
  assert.ok(calls.every(([url]) => url.startsWith('https://openapi.qoder.com.cn/')));
  assert.equal(calls.filter(([url]) => url.endsWith('/exchange')).length, 1);
  rows = [{ campaignId: 'promo', actionType: 'SHOW', claimStatus: 'CLAIMABLE' }];
  assert.deepEqual(await c.claim(), { status: 'no-campaign' });
  rows = [{ campaignId: 'locked', actionType: 'CLAIM_BENEFIT', claimStatus: 'LOCKED' }];
  assert.deepEqual(await c.claim(), { status: 'no-campaign' });
  rows = [{ campaignId: 'done', actionType: 'CLAIM_BENEFIT', claimStatus: 'CLAIMED' }];
  assert.deepEqual(await c.claim(), { status: 'already-claimed' });
  rows = [{ campaignId: 'tomorrow', actionType: 'CLAIM_BENEFIT', claimStatus: 'CLAIMABLE', startAt: now / 1000 + 3600 }];
  assert.deepEqual(await c.claim(), { status: 'before-window' });
  assert.equal(calls.filter(([url]) => url.endsWith('/claim')).length, 1);
});

test('Qoder query errors may retry later, malformed campaigns never imply no activity, and claim timeouts remain uncertain', async () => {
  for (const [stage, failure, expected] of [['query', 500, 'retryable'], ['query', 401, 'auth-invalid'], ['query', 403, 'paused'], ['query', 429, 'paused'],
    ['query', 'malformed', 'retryable'], ['claim', 'timeout', 'uncertain'], ['claim', 429, 'paused'], ['claim', 'missing-amount', 'claimed']]) {
    let claims = 0;
    const c = createQoderCheckin('china', async () => 'pt-fixture', { fetchImpl: async (url) => {
      if (url.endsWith('/exchange')) return Response.json({ token: 'jt-fixture' });
      if (url.endsWith('/userinfo')) return Response.json({ id: 'stable-user' });
      if (url.endsWith('/campaigns')) {
        if (stage === 'query') return Response.json({}, { status: typeof failure === 'number' ? failure : 200 });
        return Response.json({ campaigns: [{ campaignId: 'daily', actionType: 'CLAIM_BENEFIT', claimStatus: 'CLAIMABLE' }] });
      }
      claims++;
      if (failure === 'timeout') throw Error('private-timeout');
      return Response.json({ status: 'CLAIMED' }, { status: typeof failure === 'number' ? failure : 200 });
    } });
    await c.identity(); const result = await c.claim(); assert.equal(result.status, expected, `${stage}/${failure}`);
    assert.equal(claims, stage === 'claim' ? 1 : 0);
    assert.equal(result.amount, undefined, 'missing rewards are never guessed');
  }
});
