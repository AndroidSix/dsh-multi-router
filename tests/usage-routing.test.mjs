import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Router } from '../src/router.mjs';
import { Telemetry, meterResponse } from '../src/telemetry.mjs';
import { validateConfig } from '../src/config.mjs';
const request = { model: 'flash', stream: true, messages: [{ role: 'user', content: 'private request text' }] };
const body = (tokens = 10) => `data: ${JSON.stringify({ choices: [{ delta: { content: 'private answer text' } }] })}\n\ndata: ${JSON.stringify({ choices: [], usage: { prompt_tokens: tokens - 3, completion_tokens: 3, total_tokens: tokens } })}\n\ndata: [DONE]\n\n`;
async function setup(t, strategy, extra = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'router-usage-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const config = validateConfig({ accounts: ['a', 'b', 'c'].map(id => ({ id, provider: 'workbuddy', credentialFile: '/tmp/' + id })),
    routes: { flash: { contextWindow: 2000, maxTokens: 100, strategy, targets: ['a', 'b', 'c'].map((account, i) => ({ provider: 'workbuddy', model: 'real', account, weight: i === 0 ? 3 : 1, tokenBudget: 20, creditBudget: 10, ...extra })) } } });
  const ledger = new Telemetry(join(dir, 'usage.json')); await ledger.load();
  const router = new Router(config, async () => ({ models: async () => [{ id: 'real' }], chat: async () => ({ ok: true, response: new Response(body()) }) })); router.telemetry = ledger;
  const call = async () => { const selected = await router.chat(request); assert.equal(await selected.response.text(), body()); return selected.account; };
  return { config, router, ledger, call, dir };
}
test('smooth weights distribute requests 3:1:1; 4xx still falls back and cooldown is excluded', async t => {
  const { router, call } = await setup(t, 'weighted'); const selected = [];
  for (let i = 0; i < 50; i++) selected.push(await call());
  assert.equal(selected.filter(a => a === 'a').length, 30); assert.equal(selected.filter(a => a === 'b').length, 10); assert.equal(selected.filter(a => a === 'c').length, 10);
  router.cooldowns.set('a:*', Date.now() + 60000);
  for (let i = 0; i < 10; i++) assert.notEqual(await call(), 'a');
});
test('Token limits rotate only after metered completions and start a fresh round without losing cumulative totals', async t => {
  const { router, ledger, call, dir } = await setup(t, 'tokens'); const selected = [];
  for (let i = 0; i < 7; i++) selected.push(await call());
  assert.deepEqual(selected, ['a', 'a', 'b', 'b', 'c', 'c', 'a']);
  assert.equal(ledger.data.rounds.flash.number, 2); assert.equal(ledger.row('accounts', 'a').tokens, 30);
  const raw = await readFile(join(dir, 'usage.json'), 'utf8'); assert.doesNotMatch(raw, /private request|private answer|accessToken|credentialFile/);
  assert.equal((await stat(join(dir, 'usage.json'))).mode & 0o777, 0o600);
  const restored = new Telemetry(join(dir, 'usage.json')); await restored.load(); router.telemetry = restored;
  assert.equal(await call(), 'a'); assert.equal(await call(), 'b');
});
test('credit rotation uses platform balance deltas, skips missing and stale credit data and does not silently use zero', async t => {
  const { router, ledger, call } = await setup(t, 'credits'); const balances = { a: 100, b: 100, c: 100 };
  router.monitor = async a => { await ledger.observe(a.id, { remaining: balances[a.id], unit: 'credits', cycle: 'month1', fetchedAt: Date.now() }); };
  assert.equal(await call(), 'a'); balances.a = 88; assert.equal(await call(), 'b'); balances.b = 89; assert.equal(await call(), 'c'); balances.c = 87;
  assert.equal(await call(), 'a'); assert.equal(ledger.data.rounds.flash.number, 2);
  // A quota reset must not be charged as consumption.
  await ledger.observe('a', { remaining: 10, unit: 'credits', cycle: 'month2', fetchedAt: Date.now() });
  assert.equal(ledger.row('accounts', 'a').creditsObserved, 12);
  router.monitor = async a => { await ledger.observe(a.id, { unit: 'subscription', remaining: null, fetchedAt: Date.now() }); };
  await assert.rejects(router.chat(request), /credit_usage_unavailable/);
});
test('SSE metering handles fragments, tool-only answers, cancellation, partial errors and missing usage', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'meter-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const ledger = new Telemetry(join(dir, 'usage.json')); let summary;
  const raw = body(), stream = new ReadableStream({ start(c) { for (const ch of raw) c.enqueue(new TextEncoder().encode(ch)); c.close(); } });
  const response = meterResponse(new Response(stream), value => { summary = value; return ledger.record({ ...value, alias: 'x', account: 'a', provider: 'workbuddy', status: 200 }); });
  assert.equal(await response.text(), raw); assert.equal(summary.ok, true); assert.equal(ledger.row('accounts', 'a').tokens, 10);
  const tool = 'data: {"choices":[{"delta":{"tool_calls":[{"id":"call1"}]}}]}\n\ndata: {"choices":[{"finish_reason":"tool_calls"}],"usage":{"prompt_tokens":5,"completion_tokens":1}}\n\ndata: [DONE]\n\n';
  assert.equal(await meterResponse(new Response(tool), value => { summary = value; }).text(), tool); assert.equal(summary.ok, true);
  const partial = 'data: {"choices":[{"delta":{"content":"started"}}]}\n\ndata: {"error":{"status":429}}\n\n';
  await meterResponse(new Response(partial), value => { summary = value; }).text(); assert.equal(summary.ok, false);
  const reader = meterResponse(new Response(raw), value => { summary = value; }).body.getReader(); await reader.read(); await reader.cancel(); assert.equal(summary.ok, true); assert.equal(summary.cancelled, false);
  const never = meterResponse(new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n')); } })), value => { summary = value; }).body.getReader(); await never.read(); await never.cancel(); assert.equal(summary.ok, false); assert.equal(summary.cancelled, true);
});
test('unknown Token usage stops quota routing; strict strategy and budget validation', async t => {
  const { router, ledger, call, config } = await setup(t, 'tokens');
  router.createClient = async () => ({ models: async () => [{ id: 'real' }], chat: async () => ({ ok: true, response: new Response('data: [DONE]\n\n') }) });
  const first = await router.chat(request); await first.response.text(); assert.equal(ledger.count('flash', 'a').unmetered, 1);
  assert.equal((await router.chat(request)).account, 'b');
  for (const patch of [{ strategy: 'random' }, { strategy: 'tokens', targets: [{ provider: 'workbuddy', model: 'real' }] }, { strategy: 'weighted', targets: [{ provider: 'workbuddy', model: 'real', weight: 0 }] }]) assert.throws(() => validateConfig({ ...config, routes: { flash: { ...config.routes.flash, ...patch } } }));
});

test('expiring credits override order and weights, ignore empty/expired/unknown packs, and preserve quota limits', async t => {
  const { router, ledger, call, config } = await setup(t, 'weighted');
  config.routes.flash.preferExpiringCredits = true;
  const now = Date.now();
  const snapshot = (remaining, days) => ({ unit: 'credits', remaining, fetchedAt: now, packages: [{ remaining, expiresAt: now + days * 86400000 }] });
  await ledger.observe('a', snapshot(100, 30)); await ledger.observe('b', snapshot(20, 2)); await ledger.observe('c', snapshot(10, 4));
  assert.equal(await call(), 'b'); assert.equal(await call(), 'b');
  await ledger.observe('b', snapshot(0, 2)); assert.equal(await call(), 'c');
  router.clients.set('c', Promise.resolve({ models: async () => [{ id: 'real' }], chat: async () => ({ ok: false, status: 429 }) }));
  assert.equal(await call(), 'a'); assert.equal(router.status().find(a => a.id === 'c').cooldowns.length, 1);
  config.routes.flash.strategy = 'tokens'; router.clients.delete('c'); router.cooldowns.clear();
  await ledger.restartExpiring('flash'); // Begin a new priority round explicitly; replenished packs do not re-enter the old round.
  await ledger.observe('b', snapshot(20, 2));
  assert.equal(await call(), 'b'); assert.equal(await call(), 'b'); assert.equal(await call(), 'c');
  await ledger.observe('b', snapshot(20, -1)); await ledger.observe('c', { ...snapshot(10, 1), error: { code: 'failed' } });
  assert.equal(await call(), 'c'); // active c remains below its Token budget; stale credits do not invent priority.
  assert.throws(() => validateConfig({ ...config, routes: { flash: { ...config.routes.flash, preferExpiringCredits: 'yes' } } }));
});

test('expiry priority pauses for three days after all priority quotas finish, persists across restart, then resumes; errors do not finish a round', async t => {
  const { router, config, ledger, call, dir } = await setup(t, 'tokens');
  let now = Date.now(); router.now = () => now; ledger.now = () => now;
  const balances = { a: { remaining: 100, end: now + 30 * 86400000 }, b: { remaining: 20, end: now + 5 * 86400000 }, c: { remaining: 10, end: now + 6 * 86400000 } };
  const observe = async a => { const p = balances[a.id]; await router.telemetry.observe(a.id, { unit: 'credits', remaining: p.remaining, cycle: 'same', fetchedAt: now, packages: [{ remaining: p.remaining, expiresAt: p.end }] }); };
  router.monitor = observe; await Promise.all(config.accounts.map(observe));
  assert.equal(await call(), 'b'); assert.equal(await call(), 'b'); assert.equal(await call(), 'c');
  assert.equal(ledger.expiring('flash').cooldownUntil, 0);
  assert.equal(await call(), 'c');
  const until = ledger.expiring('flash').cooldownUntil;
  assert.equal(until, now + 3 * 86400000);
  await ledger.queue;
  const restored = new Telemetry(join(dir, 'usage.json'), () => now); await restored.load(); router.telemetry = restored;
  assert.equal(restored.expiring('flash').cooldownUntil, until);
  assert.equal(await call(), 'a'); assert.equal(await call(), 'a');
  now += 86400000;
  assert.equal(await call(), 'a'); // Token round restarts but expiry priority stays cooling.
  assert.equal(restored.expiring('flash').cooldownUntil, until);
  now = until;
  assert.equal(await call(), 'b'); assert.equal(restored.expiring('flash').cooldownUntil, 0);
  assert.equal(restored.expiring('flash').number, 2);
  await restored.queue;
});

test('a balance-only priority round cools after all packs are depleted and ignores failed usage reads', async t => {
  const { router, ledger, call, config } = await setup(t, 'weighted'); const now = Date.now(); router.now = () => now;
  const snapshot = remaining => ({ unit: 'credits', remaining, cycle: 'pack', fetchedAt: now, packages: [{ remaining, expiresAt: now + 86400000 }] });
  await ledger.observe('b', snapshot(10)); await ledger.observe('c', snapshot(10));
  assert.equal(await call(), 'b');
  await ledger.observe('b', { ...snapshot(0), error: { code: 'failed' } }); await ledger.observe('c', snapshot(0));
  await call(); assert.equal(ledger.expiring('flash').cooldownUntil, 0);
  await ledger.observe('b', snapshot(0)); await call(); assert.equal(ledger.expiring('flash').cooldownUntil, now + 3 * 86400000);
  assert.equal(validateConfig({ ...config, routes: { flash: { ...config.routes.flash, preferExpiringCredits: false } } }).routes.flash.preferExpiringCredits, false);
});

test('request details keep every attempt for rolling days and prune without resetting totals or quota state', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'router-detail-')); t.after(() => rm(dir, { recursive: true, force: true }));
  let time = Date.UTC(2026, 9, 14); const file = join(dir, 'usage.json'), ledger = new Telemetry(file, () => time);
  await ledger.load();
  const event = { account: 'a', provider: 'workbuddy', alias: 'flash', model: 'real-model', status: 200, ok: true,
    usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10, prompt_tokens_details: { cached_tokens: 2 }, completion_tokens_details: { reasoning_tokens: 1 }, ignored: 'private payload' } };
  for (let i = 0; i < 81; i++) await ledger.record(event);
  assert.equal(ledger.state().events.length, 81); // No former 80-request truncation.
  assert.deepEqual(Object.fromEntries(['input', 'output', 'tokens', 'cachedInput', 'reasoningOutput', 'model'].map(k => [k, ledger.state().events[0][k]])),
    { input: 7, output: 3, tokens: 10, cachedInput: 2, reasoningOutput: 1, model: 'real-model' });
  const round = ledger.round('flash', 'signature'); round.number = 4;
  const expiry = ledger.expiring('flash'); expiry.cooldownUntil = time + 10 * 86400000;
  time += 30 * 86400000;
  assert.equal(ledger.state().events.length, 81); // Exact boundary retained.
  await ledger.record({ ...event, usage: undefined, ok: false, status: 429 });
  assert.equal(ledger.state().events[0].tokens, null); assert.equal(ledger.state().events[0].input, null);
  time++;
  await ledger.persist();
  assert.equal(ledger.state().events.length, 1);
  assert.equal(ledger.row('accounts', 'a').tokens, 810);
  assert.equal(ledger.count('flash', 'a').requests, 82);
  assert.equal(ledger.round('flash', 'signature').number, 4);
  assert.equal(ledger.expiring('flash').cooldownUntil, expiry.cooldownUntil);
  assert.doesNotMatch(await readFile(file, 'utf8'), /private payload/);
  const restored = new Telemetry(file, () => time + 31 * 86400000); await restored.load();
  assert.equal(restored.state().events.length, 0);
  assert.equal(JSON.parse(await readFile(file, 'utf8')).events.length, 0);
  assert.equal(restored.count('flash', 'a').tokens, 810);
  restored.configure(365); assert.equal(restored.state().events.length, 0); // Deleted data cannot reappear.
});

test('stream usage details include the actual selected model and retain zero / missing values honestly', async t => {
  const { ledger, router, call } = await setup(t, 'failover');
  await call();
  assert.equal(ledger.state().events[0].model, 'real');
  assert.equal(ledger.state().events[0].input, 7); assert.equal(ledger.state().events[0].output, 3);
  router.clients.clear(); router.createClient = async () => ({ models: async () => [{ id: 'real' }], chat: async () => ({ ok: false, status: 403 }) });
  await assert.rejects(router.chat(request));
  assert.equal(ledger.state().events[0].model, 'real'); assert.equal(ledger.state().events[0].tokens, null);
  await ledger.record({ account: 'a', alias: 'flash', status: 200, ok: true, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } });
  assert.equal(ledger.state().events[0].tokens, 0); assert.equal(ledger.state().events[0].input, 0);
});

test('stream timing ignores empty/control frames, preserves bytes and uses completion time before usage trailers', async () => {
  let now = 0, summary;
  const frames = [[100, { choices: [{ delta: { role: 'assistant', content: ' ' } }] }], [6800, { choices: [{ delta: { reasoning_content: 'private reasoning' } }] }], [16800, { choices: [{ finish_reason: 'stop' }] }], [20000, { usage: { completion_tokens: 620 } }]];
  let i = 0;
  const response = new Response(new ReadableStream({ pull(c) { if (i === frames.length) { c.close(); return; } const [at, frame] = frames[i++]; now = at; c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(frame)}\n\n`)); } }, { highWaterMark: 0 }));
  await meterResponse(response, s => { summary = s; }, undefined, { startedAt: 0, now: () => now }).text();
  assert.equal(summary.ok, true); assert.equal(summary.timing.ttftMs, 6800);
  assert.equal(summary.timing.modelMs, 16800); assert.equal(summary.timing.decodeMs, 10000); assert.equal(summary.timing.decodeTokens, 620);
  await meterResponse(new Response('data: {"choices":[{"delta":{"role":"assistant"}}]}\n\ndata: [DONE]\n\n'), s => { summary = s; }, undefined, { startedAt: 0, now: () => 500 }).text();
  assert.equal(summary.timing.ttftMs, null); assert.equal(summary.timing.decodeTokens, null);
});

test('DSH metrics associate concurrent sessions and tool pairs without recording conversation or device identities', async t => {
  const { SessionMetrics } = await import('../src/telemetry.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'session-metrics-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const ledger = new Telemetry(join(dir, 'usage.json')); const metrics = new SessionMetrics(ledger);
  const a = { id: 'private-session-A' }, b = { id: 'private-session-B' };
  const emit = (s, type, time, data = {}) => metrics.event(s, { type, time, data: { turn: 0, step: 0, ...data } });
  emit(a, 'step/start', 1000); emit(b, 'step/start', 1000);
  const ca = metrics.beginCall(a.id), cb = metrics.beginCall(b.id);
  metrics.beginCall(a.id, 'session-title'); // Auxiliary calls must not steal the step.
  for (const call of [ca, cb]) await ledger.record({ ...call, account: 'a', alias: 'flash', status: 200, ok: true, timing: { modelMs: 20 } });
  const stream = [{ type: 'text-chunks', time0: 7800, dt: [], texts: ['private answer'] }];
  await emit(b, 'assistant/message', 20000, { stream, usage: { outputTokens: 620 }, message: { content: 'private answer' } });
  await emit(a, 'assistant/attempt', 9000, { stream });
  await emit(a, 'assistant/message', 17800, { stream: [], usage: { outputTokens: 620 } });
  for (const [id, at] of [['tool-one', 18000], ['tool-two', 19000]]) await emit(a, 'tool/call', at, { callId: id, arguments: 'private arguments' });
  for (const id of ['tool-one', 'tool-one', 'tool-two']) await emit(a, 'tool/result', 20000, { message: { source: { callId: id }, content: 'private tool result' } });
  await emit(a, 'step/end', 21000);
  const row = ledger.data.events.find(e => e.callId === ca.callId);
  assert.deepEqual(row.timing, { modelMs: 16800, ttftMs: 6800, decodeMs: 10000, decodeTokens: 620, toolMs: 3000, toolCount: 2, toolsCompleted: 2 });
  assert.equal(row.timingSource, 'dsh-step');
  assert.equal(ledger.data.events.find(e => e.callId === cb.callId).timing.modelMs, 19000);
  metrics.dispose(b); assert.equal(metrics.steps.size, 0);
  await ledger.queue;
  assert.doesNotMatch(await readFile(ledger.file, 'utf8'), /private-session|private answer|private arguments|private tool result|tool-one|tool-two/);
  const restored = new Telemetry(ledger.file); await restored.load(); assert.equal(restored.data.events.find(e => e.callId === ca.callId).timing.toolMs, 3000);
});
