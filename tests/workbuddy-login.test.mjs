import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Manager } from '../lib/manager.js';
import { writePrivateJson, validateConfig } from '../src/config.mjs';
import { Router } from '../src/router.mjs';

const phone = '13800000000'; // Synthetic fixture; never sent to a real service.
const token = (uid = 'sms-fixture-user', hours = 1) => [{ alg: 'RS256' }, { sub: uid, iss: 'https://www.workbuddy.cn/auth/realms/copilot', exp: Math.floor(Date.now() / 1000) + hours * 3600 }].map(v => Buffer.from(JSON.stringify(v)).toString('base64url')).concat('synthetic-signature').join('.');
async function fixture(t, fetchImpl) {
  const dir = await mkdtemp(join(tmpdir(), 'router-sms-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, 'router.json'); await writePrivateJson(file, { accounts: [], routes: {} });
  const router = new Router(validateConfig({ accounts: [], routes: {} }, file), async () => ({ models: async () => [], accountInfo: async () => ({}) }));
  const manager = new Manager(file, router, () => {}, { fetchImpl });
  await manager.load(); return { manager, dir };
}

test('SMS login saves rotated tokens privately, deduplicates identity and never enables or submits check-ins', async t => {
  const calls = []; const at = token(), rotated = token('sms-fixture-user', 2);
  const f = await fixture(t, async (url, options) => {
    calls.push(url); assert.equal(options.method, 'POST');
    if (url.endsWith('/send-sms')) { assert.deepEqual(JSON.parse(options.body), { phone }); assert.equal(options.redirect, 'error'); return Response.json({ code: 0, data: { expires_in: 300 } }); }
    if (url.endsWith('/token')) { assert.deepEqual(JSON.parse(options.body), { login_method: 'phone', phone, sms_code: '123456' }); return Response.json({ code: 0, data: { access_token: at, refresh_token: 'fixture-rt' } }); }
    assert.equal(url, 'https://copilot.tencent.com/v2/plugin/auth/token/refresh');
    assert.equal(options.headers['X-Refresh-Token'], 'fixture-rt');
    return Response.json({ code: 0, data: { accessToken: rotated, refreshToken: 'fixture-rotated-rt' } });
  });
  let now = Date.now(); f.manager.workbuddyLogin.now = () => now;
  const send = await f.manager.action({ action: 'workbuddy.sms', phone });
  assert.ok(send.workbuddyLogin.challenge); assert.ok(!JSON.stringify(send).includes(phone));
  const complete = () => f.manager.action({ action: 'workbuddy.login', revision: f.manager.state().revision, challenge: f.manager.workbuddyLogin.pending.challenge, code: '123456' });
  const result = await complete(); assert.equal(result.accounts.length, 1); assert.equal(result.checkins.accounts[0].auto, false);
  assert.ok(!JSON.stringify(result).includes(rotated)); assert.ok(!JSON.stringify(result).includes('fixture-rt'));
  const a = f.manager.config.accounts[0], saved = JSON.parse(await readFile(a.credentialFile));
  assert.equal(saved.credential.accessToken, rotated); assert.equal(saved.credential.refreshToken, 'fixture-rotated-rt');
  assert.equal((await stat(a.credentialFile)).mode & 0o777, 0o600);
  const journal = await readFile(join(f.dir, 'workbuddy-login.json'), 'utf8'); assert.ok(!journal.includes(phone)); assert.ok(!journal.includes('fixture-rt'));
  assert.equal((await stat(join(f.dir, 'workbuddy-login.json'))).mode & 0o777, 0o600);
  now += 61000; await f.manager.action({ action: 'workbuddy.sms', phone }); await complete();
  assert.equal(f.manager.config.accounts.length, 1); assert.equal(f.manager.config.accounts[0].id, a.id);
  assert.equal(calls.length, 6); assert.ok(calls.every(url => !url.includes('checkin')));
});

test('SMS cooldown survives restarts; restrictions stop requests and neither retry nor leak upstream errors', async t => {
  let calls = 0;
  const f = await fixture(t, async () => { calls++; return Response.json({ code: 0, data: {} }); });
  await f.manager.action({ action: 'workbuddy.sms', phone });
  const other = new Manager(f.manager.file, f.manager.router, () => {}, { fetchImpl: () => assert.fail('cooldown must precede network') }); await other.load();
  await assert.rejects(other.action({ action: 'workbuddy.sms', phone }), /冷却/); assert.equal(calls, 1);
  const restricted = await fixture(t, async () => { calls++; return Response.json({ code: 429, msg: 'private-upstream-phone-token' }); });
  await assert.rejects(restricted.manager.action({ action: 'workbuddy.sms', phone }), /已暂停/);
  await assert.rejects(restricted.manager.action({ action: 'workbuddy.sms', phone }), /冷却/); assert.equal(calls, 2);
});

test('SMS login retains the official login credential if optional refresh verification fails, and never retries it automatically', async t => {
  let refreshes = 0;
  const f = await fixture(t, async url => {
    if (url.endsWith('/send-sms')) return Response.json({ code: 0, data: {} });
    if (url.endsWith('/token')) return Response.json({ code: 0, data: { accessToken: token(), refreshToken: 'fixture-rt' } });
    refreshes++; throw Error('private-upstream-error');
  });
  const sent = await f.manager.action({ action: 'workbuddy.sms', phone });
  const result = await f.manager.action({ action: 'workbuddy.login', revision: f.manager.state().revision, challenge: sent.workbuddyLogin.challenge, code: '123456' });
  assert.equal(refreshes, 1); assert.equal(result.accounts.length, 1); assert.match(result.loginResult.warning, /验证未通过/);
  assert.ok(!JSON.stringify(result).includes('private-upstream-error'));
  const saved = JSON.parse(await readFile(f.manager.config.accounts[0].credentialFile)); assert.equal(saved.credential.refreshToken, 'fixture-rt');
});

test('SMS challenges bind the phone, expire, reject wrong identity replacement and retain credentials after save conflict', async t => {
  const f = await fixture(t, async url => Response.json(url.endsWith('/send-sms') ? { code: 0, data: {} } : { code: 0, data: { accessToken: token(), refreshToken: 'fixture-rt' } }));
  let now = Date.now(); f.manager.workbuddyLogin.now = () => now;
  const send = await f.manager.action({ action: 'workbuddy.sms', phone });
  await assert.rejects(f.manager.action({ action: 'workbuddy.login', revision: f.manager.state().revision, challenge: 'wrong', code: '123456', verify: false }), /过期/);
  await assert.rejects(f.manager.action({ action: 'workbuddy.login', revision: f.manager.state().revision, challenge: send.workbuddyLogin.challenge, code: '123456', verify: false, id: 'another-account' }), /身份/);
  // Retry only saving the existing in-memory result; no second login or refresh request.
  f.manager.workbuddyLogin.fetchImpl = () => assert.fail('save retry must not resubmit SMS');
  const result = await f.manager.action({ action: 'workbuddy.login', revision: f.manager.state().revision, challenge: send.workbuddyLogin.challenge, code: '123456', verify: false });
  assert.equal(result.accounts.length, 1);
  now += 61000; f.manager.workbuddyLogin.fetchImpl = async () => Response.json({ code: 0, data: {} });
  const next = await f.manager.action({ action: 'workbuddy.sms', phone }); now += 301000;
  await assert.rejects(f.manager.workbuddyLogin.complete(next.workbuddyLogin.challenge, '123456'), /过期/);
});

test('WorkBuddy read-only login recovery clears only auth failures and never submits or overrides opt-in', async t => {
  const f = await fixture(t, () => assert.fail('no login request expected'));
  f.manager.config.accounts = [{ id: 'wb', provider: 'workbuddy', credentialFile: 'unused', autoCheckin: false }];
  f.manager.router.client = async () => ({ checkin: { validate: async () => ({ valid: true }), claim: () => assert.fail('must not claim') } });
  const journal = { records: { auth: { ids: ['wb'], day: '2026-10-15', at: Date.now(), status: 'auth-invalid' }, uncertain: { ids: ['other'], day: '2026-10-15', at: Date.now(), status: 'uncertain' } }, devices: {}, pauses: {} };
  await writePrivateJson(f.manager.checkins.file, journal); await f.manager.checkins.load();
  const result = await f.manager.action({ action: 'checkins.verify', id: 'wb' });
  assert.equal(result.checkins.accounts[0].last, undefined); assert.equal(result.checkins.accounts[0].auto, false);
  assert.equal(JSON.parse(await readFile(f.manager.checkins.file)).records.uncertain.status, 'uncertain');
  await assert.rejects(f.manager.action({ action: 'checkins.verify', id: 'wb' }), /冷却/);
  f.manager.workbuddyLogin.now = () => Date.now() + 31000;
  await writePrivateJson(f.manager.checkins.file, journal); await f.manager.checkins.load();
  f.manager.router.client = async () => ({ checkin: { validate: async () => { throw Error('HTTP 401'); } } });
  await assert.rejects(f.manager.action({ action: 'checkins.verify', id: 'wb' }), /验证未通过/);
  assert.equal(f.manager.checkins.last({ id: 'wb' }).status, 'auth-invalid');
});
