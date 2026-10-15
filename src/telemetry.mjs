import { createHash, randomUUID } from 'node:crypto';
import { assistantStreamFirstTokenTime } from '@deepseek-ai/dsh-llm';
import { readFile } from 'node:fs/promises';
import { writePrivateJson } from './config.mjs';
const empty = () => ({ requests: 0, failures: 0, input: 0, output: 0, tokens: 0, unmetered: 0 });
const day = at => new Date(at).toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
const safe = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0;
const measured = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
export class Telemetry {
  constructor(file, now = Date.now) { this.file = file; this.now = now; this.retentionDays = 30; this.data = { accounts: {}, routes: {}, days: {}, rounds: {}, expiringRounds: {}, events: [] }; this.queue = Promise.resolve(); }
  async load() {
    try { const saved = JSON.parse(await readFile(this.file, 'utf8')); if (saved.version !== 1) throw Error('Unsupported telemetry'); this.data = { ...saved, expiringRounds: saved.expiringRounds ?? {} }; }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (this.prune()) await this.persist();
  }
  configure(retentionDays) { this.retentionDays = retentionDays; }
  prune() {
    const cutoff = this.now() - this.retentionDays * 86400000, before = this.data.events.length;
    this.data.events = this.data.events.filter(e => Number.isFinite(e.at) && e.at >= cutoff);
    return before !== this.data.events.length;
  }
  row(group, key) { if (!Object.hasOwn(this.data[group], key)) Object.defineProperty(this.data[group], key, { value: empty(), enumerable: true, writable: true }); return this.data[group][key]; }
  count(alias, account) { return this.row('routes', JSON.stringify([alias, account])); }
  expiring(alias) {
    if (!Object.hasOwn(this.data.expiringRounds, alias)) Object.defineProperty(this.data.expiringRounds, alias, { value: { accounts: [], completed: [], cooldownUntil: 0, number: 1 }, enumerable: true, writable: true });
    return this.data.expiringRounds[alias];
  }
  restartExpiring(alias) { const row = this.expiring(alias); row.accounts = []; row.completed = []; row.cooldownUntil = 0; row.number++; return this.persist(); }
  round(alias, signature) {
    if (!Object.hasOwn(this.data.rounds, alias) || this.data.rounds[alias].signature !== signature) Object.defineProperty(this.data.rounds, alias, { value: { signature, number: 1, bases: {} }, enumerable: true, writable: true });
    return this.data.rounds[alias];
  }
  advance(alias, candidates, signature) {
    const round = this.round(alias, signature); round.number++;
    for (const c of candidates) Object.defineProperty(round.bases, c.account.id, { value: { tokens: this.count(alias, c.account.id).tokens, credits: this.row('accounts', c.account.id).creditsObserved ?? 0 }, enumerable: true, writable: true, configurable: true });
    return this.persist();
  }
  observe(account, snapshot) {
    const row = this.row('accounts', account);
    if (Number.isFinite(snapshot.remaining) && snapshot.unit === 'credits') {
      const sameCycle = row.balance?.cycle === snapshot.cycle;
      const change = sameCycle && Number.isFinite(row.balance?.remaining) ? Math.max(0, row.balance.remaining - snapshot.remaining) : 0;
      row.creditsObserved = (row.creditsObserved ?? 0) + change;
    }
    row.balance = snapshot;
    return this.persist();
  }
  record(event) {
    const at = this.now();
    const rows = [this.row('accounts', event.account), this.count(event.alias, event.account), this.row('days', day(at))];
    for (const row of rows) {
      row.requests++; if (!event.ok) row.failures++;
      if (event.usage) { const input = safe(event.usage.prompt_tokens), output = safe(event.usage.completion_tokens); row.input += input; row.output += output; row.tokens += safe(event.usage.total_tokens) || input + output; }
      else if (event.status === 200 || event.accepted) row.unmetered++;
    }
    const input = measured(event.usage?.prompt_tokens), output = measured(event.usage?.completion_tokens);
    this.data.events.unshift({ at, account: event.account, provider: event.provider, alias: event.alias, model: event.model ?? null, status: event.status,
      outcome: event.ok ? 'completed' : event.cancelled ? 'cancelled' : 'failed', input, output,
      tokens: measured(event.usage?.total_tokens) ?? (input !== null && output !== null ? input + output : null),
      cachedInput: measured(event.usage?.prompt_tokens_details?.cached_tokens), reasoningOutput: measured(event.usage?.completion_tokens_details?.reasoning_tokens),
      callId: event.callId ?? null, session: event.session ?? null,
      timing: event.timing ? Object.fromEntries(['modelMs', 'ttftMs', 'decodeMs', 'decodeTokens'].map(k => [k, measured(event.timing[k])])) : null, timingSource: event.timing ? 'upstream' : null });
    const dates = Object.keys(this.data.days).sort(); for (const key of dates.slice(0, -31)) delete this.data.days[key];
    return this.persist();
  }
  persist() { this.prune(); const saved = structuredClone({ ...this.data, version: 1 }); this.queue = this.queue.catch(() => {}).then(() => writePrivateJson(this.file, saved)); return this.queue; }
  state() { this.prune(); return { ...structuredClone(this.data), retentionDays: this.retentionDays, today: day(this.now()), updatedAt: this.now() }; }
}

// Pass bytes through unchanged; parse only usage and terminal/error markers, never persist content.
export function meterResponse(response, complete, signal, { now = () => performance.now(), startedAt = now() } = {}) {
  if (!response.body) return response;
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let pending = '', usage, ended = false, failed = false, finished = false, firstToken = null, terminalAt = null;
  async function finish(cancelled = false) { if (finished) return; finished = true; const end = terminalAt ?? now(); await complete({ usage, ok: ended && !failed && !cancelled, cancelled, timing: { modelMs: Math.max(0, end - startedAt), ttftMs: firstToken === null ? null : Math.max(0, firstToken - startedAt), decodeMs: firstToken === null ? null : Math.max(0, end - firstToken), decodeTokens: firstToken === null ? null : measured(usage?.completion_tokens) } }); }
  function inspect(bytes) {
    pending += decoder.decode(bytes, { stream: true });
    let split;
    while ((split = /\r?\n\r?\n/.exec(pending))) {
      const frame = pending.slice(0, split.index); pending = pending.slice(split.index + split[0].length);
      const data = frame.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n');
      if (data === '[DONE]') { ended = true; terminalAt ??= now(); continue; }
      try { const value = JSON.parse(data); if (value.usage && ['prompt_tokens', 'completion_tokens', 'total_tokens'].some(k => Number.isFinite(value.usage[k]) && value.usage[k] >= 0)) usage = value.usage; if (value.error) failed = true; if (firstToken === null && value.choices?.some(c => { const d = c.delta; return [d?.content, d?.reasoning_content, d?.reasoning].some(v => typeof v === 'string' && v.trim()) || d?.tool_calls?.some(t => t.function?.name || t.function?.arguments); })) firstToken = now(); if (value.choices?.some(c => c.finish_reason)) { ended = true; terminalAt ??= now(); } } catch { /* Unknown frame is forwarded. */ }
    }
    if (pending.length > 1024 * 1024) { pending = ''; failed = true; }
  }
  const body = new ReadableStream({
    async pull(controller) {
      try { signal?.throwIfAborted(); const chunk = await reader.read(); if (chunk.done) { await finish(); controller.close(); } else { inspect(chunk.value); controller.enqueue(chunk.value); } }
      catch (e) { await finish(signal?.aborted); controller.error(e); await reader.cancel().catch(() => {}); }
    },
    async cancel(reason) { await reader.cancel(reason).catch(() => {}); await finish(!ended); },
  });
  return new Response(body, { status: response.status, headers: response.headers });
}

// Link local transport attempts to DSH steps without retaining titles, prompts,
// tool names/arguments/results, or the original session identity.
export class SessionMetrics {
  constructor(telemetry) { this.telemetry = telemetry; this.steps = new Map(); }
  key(id) { return createHash('sha256').update(String(id)).digest('hex').slice(0, 24); }
  beginCall(sessionId, purpose) {
    const callId = randomUUID(), session = sessionId == null ? null : this.key(sessionId);
    const step = session && this.steps.get(session);
    if (step && !purpose) step.callId = callId;
    return { callId, session };
  }
  event(session, event) {
    const key = this.key(session.id), d = event.data;
    if (event.type === 'step/start') { this.steps.set(key, { turn: d.turn, step: d.step, start: event.time, first: null, calls: new Map(), toolMs: 0, toolCount: 0, toolsCompleted: 0 }); return; }
    const step = this.steps.get(key);
    if (!step) return;
    if (d.turn !== undefined && (d.turn !== step.turn || d.step !== undefined && d.step !== step.step)) return;
    if (event.type === 'assistant/attempt') { step.first ??= assistantStreamFirstTokenTime(d.stream) ?? null; return; }
    const row = this.telemetry.data.events.find(e => e.callId === step.callId && e.session === key);
    if (event.type === 'assistant/message') {
      if (!row || d.interrupted) return;
      const first = step.first ?? assistantStreamFirstTokenTime(d.stream) ?? null;
      const output = measured(d.usage?.outputTokens);
      row.timing = { modelMs: Math.max(0, event.time - step.start), ttftMs: first === null ? null : Math.max(0, first - step.start),
        decodeMs: first === null || output === null ? null : Math.max(0, event.time - first), decodeTokens: first === null ? null : output };
      row.timingSource = 'dsh-step';
    } else if (event.type === 'tool/call' && row?.timingSource === 'dsh-step') {
      if (!step.calls.has(d.callId)) { step.calls.set(d.callId, event.time); step.toolCount++; }
    } else if (event.type === 'tool/result' && step.calls.has(d.message?.source?.callId)) {
      const id = d.message.source.callId;
      step.toolMs += Math.max(0, event.time - step.calls.get(id)); step.toolsCompleted++; step.calls.delete(id);
    } else if (event.type === 'step/end' || event.type === 'turn/end') {
      this.steps.delete(key);
    } else return;
    if (row?.timingSource !== 'dsh-step') return;
    Object.assign(row.timing, { toolMs: step.toolMs, toolCount: step.toolCount, toolsCompleted: step.toolsCompleted });
    return this.telemetry.persist();
  }
  dispose(session) { this.steps.delete(this.key(session.id)); }
}
