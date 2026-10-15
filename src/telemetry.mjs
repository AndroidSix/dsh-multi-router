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
      cachedInput: measured(event.usage?.prompt_tokens_details?.cached_tokens), reasoningOutput: measured(event.usage?.completion_tokens_details?.reasoning_tokens) });
    const dates = Object.keys(this.data.days).sort(); for (const key of dates.slice(0, -31)) delete this.data.days[key];
    return this.persist();
  }
  persist() { this.prune(); const saved = structuredClone({ ...this.data, version: 1 }); this.queue = this.queue.catch(() => {}).then(() => writePrivateJson(this.file, saved)); return this.queue; }
  state() { this.prune(); return { ...structuredClone(this.data), retentionDays: this.retentionDays, today: day(this.now()), updatedAt: this.now() }; }
}

// Pass bytes through unchanged; parse only usage and terminal/error markers, never persist content.
export function meterResponse(response, complete, signal) {
  if (!response.body) return response;
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let pending = '', usage, ended = false, failed = false, finished = false;
  async function finish(cancelled = false) { if (finished) return; finished = true; await complete({ usage, ok: ended && !failed && !cancelled, cancelled }); }
  function inspect(bytes) {
    pending += decoder.decode(bytes, { stream: true });
    let split;
    while ((split = /\r?\n\r?\n/.exec(pending))) {
      const frame = pending.slice(0, split.index); pending = pending.slice(split.index + split[0].length);
      const data = frame.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n');
      if (data === '[DONE]') { ended = true; continue; }
      try { const value = JSON.parse(data); if (value.usage && ['prompt_tokens', 'completion_tokens', 'total_tokens'].some(k => Number.isFinite(value.usage[k]) && value.usage[k] >= 0)) usage = value.usage; if (value.error) failed = true; if (value.choices?.some(c => c.finish_reason)) ended = true; } catch { /* Unknown frame is forwarded. */ }
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
