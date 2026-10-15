import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Checkins } from '../src/checkins.mjs';
import { writePrivateJson, validateConfig } from '../src/config.mjs';
import { claimTraeCheckin, createAccountClient, createQoderCheckin, createWorkBuddyCheckin, refreshWorkBuddyCheckinCredential } from '../lib/clients.js';
import { exportConfiguration, decodeConfiguration } from '../src/migration.mjs';

const wbToken = (sub = 'synthetic-wb-user', exp = Math.floor(Date.now() / 1000) + 3600) =>
  [JSON.stringify({ alg: 'RS256' }), JSON.stringify({ iss: 'https://www.codebuddy.cn/auth/realms/copilot', sub, exp })]
    .map(value => Buffer.from(value).toString('base64url')).concat('synthetic-signature').join('.');
const wbCredential = () => ({ accessToken: wbToken(), uid: 'synthetic-wb-user', refreshToken: 'synthetic-refresh' });

test('WorkBuddy accepts both official CN issuers and keeps rejecting foreign issuers and mismatched identities', async () => {
  for (const issuer of ['https://www.workbuddy.cn/auth/realms/copilot', 'https://www.codebuddy.cn/auth/realms/copilot', 'https://www.workbuddy.cn.attacker.test/auth/realms/copilot', 'https://www.workbuddy.ai/auth/realms/copilot']) {
    const parts = wbToken().split('.'); const payload = JSON.parse(Buffer.from(parts[1], 'base64url')); payload.iss = issuer;
    parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const client = createWorkBuddyCheckin(() => ({ ...wbCredential(), accessToken: parts.join('.') }), { fetchImpl: () => assert.fail('identity decoding must stay local') });
    if (['https://www.workbuddy.cn/auth/realms/copilot', 'https://www.codebuddy.cn/auth/realms/copilot'].includes(issuer)) assert.deepEqual(await client.identity(), { account: 'synthetic-wb-user' });
    else await assert.rejects(client.identity(), /HTTP 401/);
  }
});

test('WorkBuddy checks status, binds CN login headers, claims once and displays only observed rewards and activity', async () => {
  const credential = wbCredential(), calls = [];
  const client = createWorkBuddyCheckin(async () => credential, { fetchImpl: async (url, options) => {
    calls.push(url); assert.equal(options.method, 'POST'); assert.equal(options.body, '{}');
    assert.equal(options.headers.Authorization, `Bearer ${credential.accessToken}`);
    assert.equal(options.headers['X-User-Id'], credential.uid);
    assert.equal(options.headers.Origin, 'https://www.workbuddy.cn');
    assert.equal(options.headers.Referer, 'https://www.workbuddy.cn/profile/growth-center');
    assert.ok(options.headers['User-Agent']);
    return Response.json(url.endsWith('/daily-checkin') ? { code: 0, data: { credit: 50 } }
      : { code: 0, data: { today_checked_in: calls.length > 1, active: true, streak_days: 3, total_credits: 150,
        next_streak_day: 7, end_time: '2026-12-31 23:59:59' } });
  }, now: () => Date.parse('2026-10-15T12:00:00+08:00') });
  assert.deepEqual(await client.identity(), { account: credential.uid });
  const result = await client.claim(AbortSignal.timeout(5000));
  assert.equal(result.status, 'claimed'); assert.equal(result.amount, 50);
  assert.deepEqual(result.activity, { streakDays: 3, totalCredits: 150, nextStreakDay: 7, endsAt: Date.parse('2026-12-31T23:59:59+08:00') });
  assert.deepEqual(calls.map(url => url.split('/').at(-1)), ['checkin-activity-status', 'daily-checkin', 'checkin-activity-status']);
});

test('WorkBuddy skips already signed or ended campaigns, rejects malformed status and never guesses a reward', async () => {
  for (const [data, expected] of [[{ today_checked_in: true }, 'already-claimed'], [{ active: false }, 'no-campaign'],
    [{ today_checked_in: false, end_time: '2020-01-01 00:00:00' }, 'no-campaign'], [{}, 'retryable']]) {
    let calls = 0;
    const client = createWorkBuddyCheckin(wbCredential, { fetchImpl: async () => { calls++; return Response.json({ code: 0, data }); } });
    assert.equal((await client.claim()).status, expected); assert.equal(calls, 1);
  }
  for (const [response, expected] of [[{ code: 200, data: {} }, 'claimed'],
    [{ code: 1, msg: '今天已签到，请明天再来' }, 'already-claimed'], [{ code: 1, msg: '暂不可领取' }, 'paused'], [{ data: {} }, 'uncertain']]) {
    let claims = 0;
    const client = createWorkBuddyCheckin(wbCredential, { fetchImpl: async url => {
      if (url.endsWith('/daily-checkin')) { claims++; return Response.json(response); }
      return Response.json({ code: 0, data: { today_checked_in: false } });
    } });
    const result = await client.claim(); assert.equal(result.status, expected); assert.equal(claims, 1);
    assert.equal(result.amount, undefined);
  }
  const invalid = createWorkBuddyCheckin(() => ({ ...wbCredential(), uid: 'different-user' }), { fetchImpl: () => assert.fail('invalid identity must never be sent') });
  assert.equal((await invalid.claim()).status, 'auth-invalid');
});

test('WorkBuddy retries only read-only network/5xx failures with bounds, never uncertain claims or restrictions', async () => {
  for (const failure of [500, 'network']) {
    const waits = []; let calls = 0, claims = 0;
    const client = createWorkBuddyCheckin(wbCredential, { sleep: async ms => { waits.push(ms); }, fetchImpl: async url => {
      if (url.endsWith('/daily-checkin')) { claims++; throw Error('synthetic timeout with private-data'); }
      calls++;
      if (calls < 3) { if (failure === 'network') throw Error('network'); return new Response('', { status: failure }); }
      return Response.json({ code: 0, data: { today_checked_in: false } });
    } });
    assert.equal((await client.claim()).status, 'uncertain'); assert.deepEqual(waits, [2000, 4000]); assert.equal(claims, 1);
  }
  for (const status of [401, 403, 429, 503]) {
    let calls = 0, waits = [];
    const client = createWorkBuddyCheckin(wbCredential, { sleep: async ms => { waits.push(ms); }, fetchImpl: async () => {
      calls++; return new Response('', { status });
    } });
    assert.equal((await client.claim()).status, status === 401 ? 'auth-invalid' : status === 503 ? 'retryable' : 'paused');
    assert.equal(calls, status === 503 ? 3 : 1); assert.deepEqual(waits, status === 503 ? [2000, 4000] : []);
  }
  let claims = 0;
  const client = createWorkBuddyCheckin(wbCredential, { fetchImpl: async url => {
    if (url.endsWith('/daily-checkin')) { claims++; return new Response('', { status: 503 }); }
    return Response.json({ code: 0, data: { today_checked_in: false } });
  } });
  assert.equal((await client.claim()).status, 'uncertain'); assert.equal(claims, 1);
});

test('WorkBuddy refresh persists rotated AT/RT through the shared credential store and preserves account identity', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-wb-refresh-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, 'wb.json'), c = { ...wbCredential(), expiresAtMs: Date.now() - 1000, domain: 'https://copilot.tencent.com' };
  await writePrivateJson(file, { version: 1, credential: c });
  const realFetch = globalThis.fetch; t.after(() => { globalThis.fetch = realFetch; });
  let requests = 0; const next = wbToken(c.uid, Math.floor(Date.now() / 1000) + 7200);
  globalThis.fetch = async (url, options) => {
    requests++; assert.equal(url, 'https://copilot.tencent.com/v2/plugin/auth/token/refresh');
    assert.equal(options.headers['X-Refresh-Token'], c.refreshToken); assert.equal(options.headers['X-Auth-Refresh-Source'], 'plugin');
    assert.equal(options.body, '{}');
    return Response.json({ code: 0, data: { accessToken: next, refreshToken: 'synthetic-rotated-refresh' } });
  };
  const client = await createAccountClient({ provider: 'workbuddy', credentialFile: file }, {});
  assert.deepEqual(await Promise.all([client.checkin.identity(), client.checkin.identity()]), [{ account: c.uid }, { account: c.uid }]);
  assert.equal(requests, 1);
  const stored = JSON.parse(await readFile(file)); assert.equal(stored.credential.accessToken, next);
  assert.equal(stored.credential.refreshToken, 'synthetic-rotated-refresh'); assert.equal(stored.credential.uid, c.uid);
  await assert.rejects(refreshWorkBuddyCheckinCredential(c, { fetchImpl: async () => Response.json({ code: 0, data: { accessToken: wbToken('other-user') } }) }), /HTTP 401/);
  await writePrivateJson(file, { version: 1, credential: c });
  globalThis.fetch = async () => new Response('', { status: 401 });
  const rejected = await createAccountClient({ provider: 'workbuddy', credentialFile: file }, {});
  assert.equal((await rejected.checkin.claim()).status, 'auth-invalid', 'store-wrapped refresh failures retain authentication classification');
  assert.equal(validateConfig({ accounts: [{ id: 'wb', provider: 'workbuddy', credentialFile: 'x', autoCheckin: true }] }).accounts[0].autoCheckin, true);
});

test('WorkBuddy preserves accepted claims but stops the platform if the following status read is restricted', async t => {
  let reads = 0;
  const client = createWorkBuddyCheckin(wbCredential, { fetchImpl: async url => {
    if (url.endsWith('/daily-checkin')) return Response.json({ code: 0, data: { credit: 50 } });
    return ++reads === 1 ? Response.json({ code: 0, data: { today_checked_in: false } }) : new Response('', { status: 429 });
  } });
  const result = await client.claim(); assert.equal(result.status, 'claimed'); assert.equal(result.paused, true);
  const f = await fixture(t, [{ id: 'first', provider: 'workbuddy' }, { id: 'second', provider: 'workbuddy' }], () => result);
  await f.run(['first', 'second']); assert.deepEqual(f.calls, ['first']);
  assert.equal(f.scheduler.state().accounts[0].last.status, 'claimed'); assert.equal(f.scheduler.state().accounts[1].paused, true);
});

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
  const f = await fixture(t, [{ id: 'one', provider: 'qoder', autoCheckin: true }, { id: 'wb', provider: 'workbuddy-ai', autoCheckin: true }]);
  f.setNow('2026-10-15T09:59:00+08:00'); await f.run(undefined, true); assert.equal(f.calls.length, 0);
  f.setNow('2026-10-15T10:05:00+08:00'); await f.run(undefined, true); assert.deepEqual(f.calls, ['one']);
  assert.throws(() => validateConfig({ accounts: [{ id: 'wb', provider: 'workbuddy-ai', credentialFile: 'x', autoCheckin: true }] }), /autoCheckin/);
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
  const config = validateConfig({ checkinSchedule: { mode: 'scheduled', time: '18:30' }, accounts: [{ id: 'tr', provider: 'trae', credentialFile: 'unused.json', autoCheckin: true }], routes: {} });
  const document = await exportConfiguration({ config }, { includeCredentials: false });
  assert.equal(document.config.accounts[0].autoCheckin, true);
  const restored = await decodeConfiguration({ document: JSON.stringify(document) });
  assert.equal(restored.config.accounts[0].autoCheckin, true);
  assert.deepEqual(restored.config.checkinSchedule, { mode: 'scheduled', time: '18:30' });
  assert.ok(!JSON.stringify(document).includes('records'));
});

test('startup scheduling checks once each day, waits for Qoder window and never requeues completed records', async t => {
  const f = await fixture(t, ['workbuddy', 'trae', 'qoder'].map((provider, i) => ({ id: `a${i}`, provider, autoCheckin: true, ...(provider === 'trae' ? { device: 'synthetic-schedule-device' } : {}) })));
  f.manager.config.checkinSchedule = { mode: 'startup', time: '10:05' };
  f.setNow('2026-10-15T08:00:00+08:00'); f.scheduler.tick(); await f.scheduler.flight;
  assert.deepEqual(f.calls, ['a0', 'a1']);
  assert.equal(f.scheduler.state().accounts[2].ready, false);
  let queueEntries = 0;
  const run = f.scheduler.run.bind(f.scheduler); f.scheduler.run = (...args) => { queueEntries++; return run(...args); };
  for (let i = 0; i < 100; i++) f.scheduler.tick();
  assert.equal(queueEntries, 0, 'unchanged completed records do not enter the disk/upstream queue');
  f.setNow('2026-10-15T10:05:00+08:00'); f.scheduler.tick(); await f.scheduler.flight;
  assert.deepEqual(f.calls, ['a0', 'a1', 'a2']);
  const restart = f.create(); await restart.load(); restart.tick(); await restart.flight;
  assert.equal(f.calls.length, 3, 'restarting does not query/claim again');
  f.manager.config.checkinSchedule = { mode: 'scheduled', time: '23:00' };
  f.setNow('2026-10-15T23:00:00+08:00'); restart.tick(); await restart.flight; assert.equal(f.calls.length, 3);
  f.manager.config.checkinSchedule.mode = 'startup';
  f.setNow('2026-10-16T00:01:00+08:00'); restart.tick(); await restart.flight;
  assert.deepEqual(f.calls, ['a0', 'a1', 'a2', 'a0', 'a1']);
});

test('scheduled check-ins catch up after the configured time, retries remain bounded and invalid auth stays stopped', async t => {
  const f = await fixture(t, [{ id: 'failed', provider: 'workbuddy', autoCheckin: true }, { id: 'auth', provider: 'trae', device: 'synthetic-schedule-device', autoCheckin: true }],
    a => ({ status: a.id === 'auth' ? 'auth-invalid' : 'retryable' }));
  f.manager.config.checkinSchedule = { mode: 'scheduled', time: '18:30' };
  f.setNow('2026-10-15T18:29:00+08:00'); f.scheduler.tick(); await f.scheduler.flight; assert.equal(f.calls.length, 0);
  f.setNow('2026-10-15T19:00:00+08:00'); f.scheduler.tick(); await f.scheduler.flight; assert.deepEqual(f.calls, ['failed', 'auth']);
  for (let i = 0; i < 100; i++) f.scheduler.tick();
  assert.equal(f.calls.length, 2);
  f.setNow('2026-10-15T20:05:00+08:00'); f.scheduler.tick(); await f.scheduler.flight; assert.deepEqual(f.calls, ['failed', 'auth', 'failed']);
  for (let i = 0; i < 100; i++) f.scheduler.tick(); assert.equal(f.calls.length, 3);
  f.setNow('2026-10-16T19:00:00+08:00'); f.scheduler.tick(); await f.scheduler.flight;
  assert.deepEqual(f.calls, ['failed', 'auth', 'failed', 'failed'], 'expired credentials are not retried daily');
  await f.scheduler.credentialsUpdated('auth'); f.scheduler.tick(); await f.scheduler.flight;
  assert.equal(f.calls.at(-1), 'auth');
  for (const schedule of [{ mode: 'invalid', time: '10:05' }, { mode: 'startup', time: '24:00' }, { mode: 'scheduled', time: '9:5' }, { mode: 'scheduled', time: '10:05', extra: true }]) {
    assert.throws(() => validateConfig({ accounts: [], checkinSchedule: schedule }), /签到计划/);
  }
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
