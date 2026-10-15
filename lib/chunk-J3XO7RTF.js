import {
  isFreeModel,
  reasoningModes,
  writePrivateJson
} from "./chunk-MCHV2R25.js";

// src/telemetry.mjs
import { createHash, randomUUID } from "node:crypto";
import { assistantStreamFirstTokenTime } from "@deepseek-ai/dsh-llm";
import { readFile } from "node:fs/promises";
var empty = () => ({ requests: 0, failures: 0, input: 0, output: 0, tokens: 0, unmetered: 0 });
var day = (at) => new Date(at).toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
var safe = (n) => typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : 0;
var measured = (n) => typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null;
var Telemetry = class {
  constructor(file, now = Date.now) {
    this.file = file;
    this.now = now;
    this.retentionDays = 30;
    this.data = { accounts: {}, routes: {}, days: {}, rounds: {}, expiringRounds: {}, events: [] };
    this.queue = Promise.resolve();
  }
  async load() {
    try {
      const saved = JSON.parse(await readFile(this.file, "utf8"));
      if (saved.version !== 1) throw Error("Unsupported telemetry");
      this.data = { ...saved, expiringRounds: saved.expiringRounds ?? {} };
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    if (this.prune()) await this.persist();
  }
  configure(retentionDays) {
    this.retentionDays = retentionDays;
  }
  prune() {
    const cutoff = this.now() - this.retentionDays * 864e5, before = this.data.events.length;
    this.data.events = this.data.events.filter((e) => Number.isFinite(e.at) && e.at >= cutoff);
    return before !== this.data.events.length;
  }
  row(group, key) {
    if (!Object.hasOwn(this.data[group], key)) Object.defineProperty(this.data[group], key, { value: empty(), enumerable: true, writable: true });
    return this.data[group][key];
  }
  count(alias, account) {
    return this.row("routes", JSON.stringify([alias, account]));
  }
  expiring(alias) {
    if (!Object.hasOwn(this.data.expiringRounds, alias)) Object.defineProperty(this.data.expiringRounds, alias, { value: { accounts: [], completed: [], cooldownUntil: 0, number: 1 }, enumerable: true, writable: true });
    return this.data.expiringRounds[alias];
  }
  restartExpiring(alias) {
    const row = this.expiring(alias);
    row.accounts = [];
    row.completed = [];
    row.cooldownUntil = 0;
    row.number++;
    return this.persist();
  }
  round(alias, signature) {
    if (!Object.hasOwn(this.data.rounds, alias) || this.data.rounds[alias].signature !== signature) Object.defineProperty(this.data.rounds, alias, { value: { signature, number: 1, bases: {} }, enumerable: true, writable: true });
    return this.data.rounds[alias];
  }
  advance(alias, candidates, signature) {
    const round = this.round(alias, signature);
    round.number++;
    for (const c of candidates) Object.defineProperty(round.bases, c.account.id, { value: { tokens: this.count(alias, c.account.id).tokens, credits: this.row("accounts", c.account.id).creditsObserved ?? 0 }, enumerable: true, writable: true, configurable: true });
    return this.persist();
  }
  observe(account, snapshot) {
    const row = this.row("accounts", account);
    if (Number.isFinite(snapshot.remaining) && snapshot.unit === "credits") {
      const sameCycle = row.balance?.cycle === snapshot.cycle;
      const change = sameCycle && Number.isFinite(row.balance?.remaining) ? Math.max(0, row.balance.remaining - snapshot.remaining) : 0;
      row.creditsObserved = (row.creditsObserved ?? 0) + change;
    }
    row.balance = snapshot;
    return this.persist();
  }
  record(event) {
    const at = this.now();
    const rows = [this.row("accounts", event.account), this.count(event.alias, event.account), this.row("days", day(at))];
    for (const row of rows) {
      row.requests++;
      if (!event.ok) row.failures++;
      if (event.usage) {
        const input2 = safe(event.usage.prompt_tokens), output2 = safe(event.usage.completion_tokens);
        row.input += input2;
        row.output += output2;
        row.tokens += safe(event.usage.total_tokens) || input2 + output2;
      } else if (event.status === 200 || event.accepted) row.unmetered++;
    }
    const input = measured(event.usage?.prompt_tokens), output = measured(event.usage?.completion_tokens);
    this.data.events.unshift({
      at,
      account: event.account,
      provider: event.provider,
      alias: event.alias,
      model: event.model ?? null,
      status: event.status,
      outcome: event.ok ? "completed" : event.cancelled ? "cancelled" : "failed",
      input,
      output,
      tokens: measured(event.usage?.total_tokens) ?? (input !== null && output !== null ? input + output : null),
      cachedInput: measured(event.usage?.prompt_tokens_details?.cached_tokens),
      reasoningOutput: measured(event.usage?.completion_tokens_details?.reasoning_tokens),
      callId: event.callId ?? null,
      session: event.session ?? null,
      timing: event.timing ? Object.fromEntries(["modelMs", "ttftMs", "decodeMs", "decodeTokens"].map((k) => [k, measured(event.timing[k])])) : null,
      timingSource: event.timing ? "upstream" : null
    });
    const dates = Object.keys(this.data.days).sort();
    for (const key of dates.slice(0, -31)) delete this.data.days[key];
    return this.persist();
  }
  persist() {
    this.prune();
    const saved = structuredClone({ ...this.data, version: 1 });
    this.queue = this.queue.catch(() => {
    }).then(() => writePrivateJson(this.file, saved));
    return this.queue;
  }
  state() {
    this.prune();
    return { ...structuredClone(this.data), retentionDays: this.retentionDays, today: day(this.now()), updatedAt: this.now() };
  }
};
function meterResponse(response, complete, signal, { now = () => performance.now(), startedAt = now() } = {}) {
  if (!response.body) return response;
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let pending = "", usage, ended = false, failed = false, finished = false, firstToken = null, terminalAt = null;
  async function finish(cancelled = false) {
    if (finished) return;
    finished = true;
    const end = terminalAt ?? now();
    await complete({ usage, ok: ended && !failed && !cancelled, cancelled, timing: { modelMs: Math.max(0, end - startedAt), ttftMs: firstToken === null ? null : Math.max(0, firstToken - startedAt), decodeMs: firstToken === null ? null : Math.max(0, end - firstToken), decodeTokens: firstToken === null ? null : measured(usage?.completion_tokens) } });
  }
  function inspect(bytes) {
    pending += decoder.decode(bytes, { stream: true });
    let split;
    while (split = /\r?\n\r?\n/.exec(pending)) {
      const frame = pending.slice(0, split.index);
      pending = pending.slice(split.index + split[0].length);
      const data = frame.split(/\r?\n/).filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
      if (data === "[DONE]") {
        ended = true;
        terminalAt ??= now();
        continue;
      }
      try {
        const value = JSON.parse(data);
        if (value.usage && ["prompt_tokens", "completion_tokens", "total_tokens"].some((k) => Number.isFinite(value.usage[k]) && value.usage[k] >= 0)) usage = value.usage;
        if (value.error) failed = true;
        if (firstToken === null && value.choices?.some((c) => {
          const d = c.delta;
          return [d?.content, d?.reasoning_content, d?.reasoning].some((v) => typeof v === "string" && v.trim()) || d?.tool_calls?.some((t) => t.function?.name || t.function?.arguments);
        })) firstToken = now();
        if (value.choices?.some((c) => c.finish_reason)) {
          ended = true;
          terminalAt ??= now();
        }
      } catch {
      }
    }
    if (pending.length > 1024 * 1024) {
      pending = "";
      failed = true;
    }
  }
  const body = new ReadableStream({
    async pull(controller) {
      try {
        signal?.throwIfAborted();
        const chunk = await reader.read();
        if (chunk.done) {
          await finish();
          controller.close();
        } else {
          inspect(chunk.value);
          controller.enqueue(chunk.value);
        }
      } catch (e) {
        await finish(signal?.aborted);
        controller.error(e);
        await reader.cancel().catch(() => {
        });
      }
    },
    async cancel(reason) {
      await reader.cancel(reason).catch(() => {
      });
      await finish(!ended);
    }
  });
  return new Response(body, { status: response.status, headers: response.headers });
}
var SessionMetrics = class {
  constructor(telemetry) {
    this.telemetry = telemetry;
    this.steps = /* @__PURE__ */ new Map();
  }
  key(id) {
    return createHash("sha256").update(String(id)).digest("hex").slice(0, 24);
  }
  beginCall(sessionId, purpose) {
    const callId = randomUUID(), session = sessionId == null ? null : this.key(sessionId);
    const step = session && this.steps.get(session);
    if (step && !purpose) step.callId = callId;
    return { callId, session };
  }
  event(session, event) {
    const key = this.key(session.id), d = event.data;
    if (event.type === "step/start") {
      this.steps.set(key, { turn: d.turn, step: d.step, start: event.time, first: null, calls: /* @__PURE__ */ new Map(), toolMs: 0, toolCount: 0, toolsCompleted: 0 });
      return;
    }
    const step = this.steps.get(key);
    if (!step) return;
    if (d.turn !== void 0 && (d.turn !== step.turn || d.step !== void 0 && d.step !== step.step)) return;
    if (event.type === "assistant/attempt") {
      step.first ??= assistantStreamFirstTokenTime(d.stream) ?? null;
      return;
    }
    const row = this.telemetry.data.events.find((e) => e.callId === step.callId && e.session === key);
    if (event.type === "assistant/message") {
      if (!row || d.interrupted) return;
      const first = step.first ?? assistantStreamFirstTokenTime(d.stream) ?? null;
      const output = measured(d.usage?.outputTokens);
      row.timing = {
        modelMs: Math.max(0, event.time - step.start),
        ttftMs: first === null ? null : Math.max(0, first - step.start),
        decodeMs: first === null || output === null ? null : Math.max(0, event.time - first),
        decodeTokens: first === null ? null : output
      };
      row.timingSource = "dsh-step";
    } else if (event.type === "tool/call" && row?.timingSource === "dsh-step") {
      if (!step.calls.has(d.callId)) {
        step.calls.set(d.callId, event.time);
        step.toolCount++;
      }
    } else if (event.type === "tool/result" && step.calls.has(d.message?.source?.callId)) {
      const id = d.message.source.callId;
      step.toolMs += Math.max(0, event.time - step.calls.get(id));
      step.toolsCompleted++;
      step.calls.delete(id);
    } else if (event.type === "step/end" || event.type === "turn/end") {
      this.steps.delete(key);
    } else return;
    if (row?.timingSource !== "dsh-step") return;
    Object.assign(row.timing, { toolMs: step.toolMs, toolCount: step.toolCount, toolsCompleted: step.toolsCompleted });
    return this.telemetry.persist();
  }
  dispose(session) {
    this.steps.delete(this.key(session.id));
  }
};

// src/router.mjs
var RouteError = class extends Error {
  constructor(status, code, attempts = [], hint) {
    super(`${code}${attempts.length ? ": " + attempts.map((a) => `${a.account} HTTP ${a.status}`).join(", ") : ""}${hint ? `\uFF08${hint}\uFF09` : ""}`);
    this.status = status;
    this.code = code;
    this.attempts = attempts;
    this.hint = hint;
  }
};
var normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/official$/, "");
function abortable(promise, signal) {
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}
function matchModel(alias, target, catalog, effort, provider = target.provider) {
  const allowed = (m) => m && (effort === void 0 || reasoningModes(m, provider).includes(effort));
  if (target.model) return catalog.find((m) => m.id === target.model && allowed(m));
  if (target.models) return target.models.map((id) => catalog.find((m) => m.id === id)).find(allowed);
  if (alias === "ds4.1f") return catalog.find((m) => allowed(m) && [m.id, m.name ?? ""].some((x) => normalize(x) === "deepseekv41flash"));
}
var Router = class {
  constructor(config, createClient, onAttempt = () => {
  }, now = Date.now) {
    this.config = config;
    this.createClient = createClient;
    this.onAttempt = onAttempt;
    this.now = now;
    this.telemetry = null;
    this.scores = /* @__PURE__ */ new Map();
    this.monitor = null;
    this.clients = /* @__PURE__ */ new Map();
    this.cooldowns = /* @__PURE__ */ new Map();
    this.active = /* @__PURE__ */ new Map();
  }
  updateConfig(config) {
    for (const old of this.config.accounts) {
      const next = config.accounts.find((a) => a.id === old.id);
      if (!next || next.provider !== old.provider || next.credentialFile !== old.credentialFile || next.identityFile !== old.identityFile) this.clients.delete(old.id);
    }
    this.config = config;
    for (const alias of this.active.keys()) if (!Object.hasOwn(config.routes, alias)) this.active.delete(alias);
  }
  async client(account) {
    if (!this.clients.has(account.id)) this.clients.set(account.id, Promise.resolve().then(() => this.createClient(account)));
    try {
      return await this.clients.get(account.id);
    } catch (error) {
      this.clients.delete(account.id);
      throw error;
    }
  }
  status() {
    return this.config.accounts.map((a) => ({
      id: a.id,
      provider: a.provider,
      enabled: a.enabled !== false,
      cooldowns: [...this.cooldowns].filter(([key, time]) => key.startsWith(`${a.id}:`) && time > this.now()).map(([key, time]) => ({ route: key.slice(a.id.length + 1), remainingMs: time - this.now() })),
      activeFor: [...this.active].filter(([, key]) => key.split(":")[0] === a.id).map(([alias]) => alias)
    }));
  }
  candidates(alias) {
    const route = this.config.routes[alias];
    if (!Object.hasOwn(this.config.routes, alias)) throw new RouteError(404, "unknown_model", [], "\u63D2\u4EF6\u8DEF\u7531\u8868\u4E2D\u6CA1\u6709\u8BE5\u8C03\u7528\u540D\u79F0\uFF0C\u8BF7\u5728\u914D\u7F6E\u9875\u65B0\u5EFA\u6216\u6062\u590D\u5BF9\u5E94\u8DEF\u7531");
    const candidates = route.targets.flatMap((target, index) => this.config.accounts.filter((a) => a.enabled !== false && a.provider === target.provider && (!target.account || a.id === target.account)).flatMap((account) => route.freeOnly ? (this.freeModels?.(account) ?? []).filter((m) => (!target.model || m.id === target.model) && (!target.models || target.models.includes(m.id))).map((model) => ({ account, target: { ...target, model: model.id, models: void 0 }, key: `${account.id}:${index}:${model.id}` })) : [{ account, target, key: `${account.id}:${index}` }]));
    const active = candidates.findIndex((c) => c.key === this.active.get(alias));
    return active < 0 ? candidates : [...candidates.slice(active), ...candidates.slice(0, active)];
  }
  expiringAt(account, route) {
    const balance = this.telemetry?.row("accounts", account.id).balance;
    if (!balance || balance.error || balance.unit !== "credits" || this.now() - balance.fetchedAt > 12e4) return Infinity;
    const horizon = this.now() + (route.expiringWithinDays ?? 7) * 864e5;
    return Math.min(Infinity, ...(balance.packages ?? []).filter((p) => p.remaining > 0 && !p.unlimited && p.expiresAt > this.now() && p.expiresAt <= horizon).map((p) => p.expiresAt));
  }
  async syncExpiring(alias, route, candidates, below = () => true) {
    if (!route.preferExpiringCredits || !this.telemetry) return false;
    const round = this.telemetry.expiring(alias);
    if (round.cooldownUntil > this.now()) return false;
    const before = JSON.stringify(round);
    if (round.cooldownUntil) {
      round.accounts = [];
      round.completed = [];
      round.cooldownUntil = 0;
      round.number++;
    }
    for (const id of round.accounts) {
      const matches = candidates.filter((c) => c.account.id === id), balance = this.telemetry.row("accounts", id).balance;
      const fresh = balance && !balance.error && balance.unit === "credits" && this.now() - balance.fetchedAt <= 12e4;
      if (!matches.length || matches.every((c) => !below(c)) || fresh && !Number.isFinite(this.expiringAt({ id }, route))) {
        if (!round.completed.includes(id)) round.completed.push(id);
      }
    }
    for (const c of candidates) if (below(c) && Number.isFinite(this.expiringAt(c.account, route)) && !round.accounts.includes(c.account.id)) round.accounts.push(c.account.id);
    if (round.accounts.length && round.accounts.every((id) => round.completed.includes(id))) round.cooldownUntil = this.now() + 3 * 864e5;
    if (JSON.stringify(round) !== before) await this.telemetry.persist();
    return round.cooldownUntil <= this.now();
  }
  remainingCooldown(candidate, alias, route) {
    const id = candidate.account.id;
    const keys = [`${id}:*`, `${id}:${alias}`];
    if (route.freeOnly) keys.push(`${id}:${alias}:${candidate.target.model}`);
    return Math.max(0, ...keys.map((key) => (this.cooldowns.get(key) ?? 0) - this.now()));
  }
  exhaustHint({ alias, route, strategy, candidates, expiryCandidates, attempts }) {
    const kinds = new Set(attempts.map((a) => a.kind));
    const modelOnly = attempts.length > 0 && [...kinds].every((k) => ["model_unavailable", "reasoning_effort_unavailable", "model_no_longer_free"].includes(k));
    const cooling = candidates.map((c) => this.remainingCooldown(c, alias, route)).filter((ms) => ms > 0);
    const soonest = cooling.length ? Math.min(...cooling) : void 0;
    const countdown = soonest === void 0 ? void 0 : `\u7EA6 ${Math.max(1, Math.ceil(soonest / 1e3))} \u79D2\u540E\u53EF\u91CD\u8BD5`;
    if (!expiryCandidates.length) return route.freeOnly ? "\u8BE5\u8DEF\u7531\u5F53\u524D\u6CA1\u6709\u53EF\u7528\u7684\u514D\u8D39\u6A21\u578B\uFF1A\u53EF\u80FD\u5DF2\u6062\u590D\u6536\u8D39\u3001\u9650\u514D\u5230\u671F\u6216\u76EE\u5F55\u83B7\u53D6\u5931\u8D25" : "\u8BE5\u8DEF\u7531\u6CA1\u6709\u53EF\u7528\u7684\u8D26\u53F7\u76EE\u6807\uFF1A\u8D26\u53F7\u53EF\u80FD\u5DF2\u5168\u90E8\u7981\u7528\uFF0C\u6216\u4E0E\u76EE\u6807\u6E20\u9053\u4E0D\u5339\u914D";
    if (modelOnly) return `\u5DF2\u5C1D\u8BD5\u7684\u8D26\u53F7\u76EE\u5F55\u4E2D\u90FD\u6CA1\u6709\u8BE5\u6A21\u578B\u3001\u6240\u9009\u63A8\u7406\u6863\u4F4D\u6216\u514D\u8D39\u8D44\u683C\u4E0D\u6EE1\u8DB3${countdown ? `\uFF1B\u5176\u4F59\u8D26\u53F7\u51B7\u5374\u4E2D\uFF0C${countdown}` : ""}`;
    if (soonest !== void 0 && cooling.length >= candidates.length) {
      return attempts.length ? `\u6240\u6709\u5019\u9009\u8D26\u53F7\u672C\u6B21\u8C03\u7528\u5747\u5931\u8D25\u5E76\u5DF2\u8FDB\u5165\u51B7\u5374\uFF0C${countdown}` : `\u5168\u90E8\u8D26\u53F7\u90FD\u5728\u5931\u8D25\u51B7\u5374\u4E2D\uFF0C${countdown}`;
    }
    if (soonest !== void 0) return `\u90E8\u5206\u8D26\u53F7\u4ECD\u5728\u5931\u8D25\u51B7\u5374\u4E2D\uFF0C${countdown}`;
    if (!attempts.length && ["tokens", "credits"].includes(strategy)) return `\u6240\u6709\u8D26\u53F7\u7684\u672C\u8F6E${strategy === "tokens" ? " Token" : "\u79EF\u5206"}\u989D\u5EA6\u5DF2\u7528\u5B8C\uFF0C\u6216\u56E0\u7F3A\u5C11\u7528\u91CF\u8BA1\u91CF\u800C\u6682\u505C\u53C2\u4E0E\u8F6E\u6362`;
    return void 0;
  }
  async chat(input, signal, metadata = {}) {
    const alias = input.model;
    if (!Array.isArray(input.messages) || !input.messages.length || input.stream !== true) throw new RouteError(400, "messages_and_stream_true_required");
    const initialRoute = this.config.routes[alias];
    if (initialRoute?.freeOnly) {
      await abortable(this.prepareFree?.(), signal);
      if (!this.config.routes[alias]) throw new RouteError(503, "free_model_pool_unavailable", [], "\u672C\u8DEF\u7531\u4ECA\u5929\u6CA1\u6709\u53EF\u7528\u7684\u514D\u8D39\u6A21\u578B");
    }
    const effort = Object.hasOwn(input, "reasoning_effort") ? input.reasoning_effort : this.config.routes[alias]?.reasoningEffort;
    input = { ...input };
    delete input.reasoning_effort;
    if (effort !== void 0 && effort !== null) input.reasoning_effort = effort;
    let candidates = this.candidates(alias);
    const expiryCandidates = [...candidates];
    const route = this.config.routes[alias], strategy = route.strategy ?? "failover";
    const available = (c) => (this.cooldowns.get(`${c.account.id}:*`) ?? 0) <= this.now() && (this.cooldowns.get(`${c.account.id}:${alias}`) ?? 0) <= this.now() && (!route.freeOnly || (this.cooldowns.get(`${c.account.id}:${alias}:${c.target.model}`) ?? 0) <= this.now());
    if (route.preferExpiringCredits && this.monitor) {
      await Promise.all([...new Map(candidates.filter(available).map((c) => [c.account.id, c.account])).values()].map((a) => {
        const snapshot = this.telemetry?.row("accounts", a.id).balance;
        return !snapshot || snapshot.error || this.now() - snapshot.fetchedAt > 6e4 ? this.monitor(a) : void 0;
      }));
      signal?.throwIfAborted();
    }
    if (strategy === "credits") {
      await Promise.all([...new Map(candidates.filter(available).map((c) => [c.account.id, c.account])).values()].map((a) => this.monitor?.(a)));
      signal?.throwIfAborted();
      candidates = candidates.filter((c) => {
        const balance = this.telemetry?.row("accounts", c.account.id).balance;
        return balance?.unit === "credits" && Number.isFinite(balance.remaining) && this.now() - balance.fetchedAt < 12e4 && !balance.error;
      });
      if (!candidates.length) throw new RouteError(503, "credit_usage_unavailable", [], "\u65E0\u6CD5\u83B7\u53D6\u4EFB\u4F55\u5019\u9009\u8D26\u53F7\u7684\u79EF\u5206\u4F59\u989D\u6570\u636E");
    }
    const signature = JSON.stringify({ strategy, targets: route.targets });
    let below = () => true, preferActive;
    if (this.telemetry && ["tokens", "credits"].includes(strategy)) {
      const round = this.telemetry.round(alias, signature);
      const counters = (c) => ({ tokens: this.telemetry.count(alias, c.account.id).tokens, credits: this.telemetry.row("accounts", c.account.id).creditsObserved ?? 0 });
      for (const c of candidates) if (!Object.hasOwn(round.bases, c.account.id)) Object.defineProperty(round.bases, c.account.id, { value: counters(c), enumerable: true, writable: true, configurable: true });
      below = (c) => !round.bases[c.account.id] || counters(c)[strategy] - round.bases[c.account.id][strategy] < (strategy === "tokens" ? c.target.tokenBudget : c.target.creditBudget);
      preferActive = await this.syncExpiring(alias, route, expiryCandidates, below);
      if (candidates.length && candidates.every((c) => !below(c))) {
        await this.telemetry.advance(alias, candidates, signature);
        this.active.delete(alias);
        const allowed = new Set(candidates.map((c) => c.key));
        candidates = this.candidates(alias).filter((c) => allowed.has(c.key));
      }
      candidates = candidates.filter(below);
      if (strategy === "tokens" && candidates.some((c) => this.telemetry.count(alias, c.account.id).unmetered > 0)) {
        candidates = candidates.filter((c) => this.telemetry.count(alias, c.account.id).unmetered === 0);
      }
    }
    preferActive ??= await this.syncExpiring(alias, route, expiryCandidates, below);
    const expiry = (c) => preferActive && !this.telemetry.expiring(alias).completed.includes(c.account.id) ? this.expiringAt(c.account, route) : Infinity;
    if (preferActive) candidates.sort((a, b) => expiry(a) - expiry(b));
    if (strategy === "weighted") {
      let eligible = candidates.filter(available);
      const nearest = Math.min(Infinity, ...eligible.map(expiry));
      if (Number.isFinite(nearest)) eligible = eligible.filter((c) => expiry(c) === nearest);
      if (eligible.length) {
        let scores = this.scores.get(alias);
        if (scores?.signature !== signature) {
          scores = { signature, values: /* @__PURE__ */ new Map() };
          this.scores.set(alias, scores);
        }
        let total = 0, winner;
        for (const c of eligible) {
          const weight = c.target.weight ?? 1;
          total += weight;
          scores.values.set(c.key, (scores.values.get(c.key) ?? 0) + weight);
          if (!winner || scores.values.get(c.key) > scores.values.get(winner.key)) winner = c;
        }
        scores.values.set(winner.key, scores.values.get(winner.key) - total);
        candidates = [winner, ...candidates.filter((c) => c !== winner)];
      }
    }
    const attempts = [];
    const tried = /* @__PURE__ */ new Set();
    for (const candidate of candidates) {
      signal?.throwIfAborted();
      const { account, target, key } = candidate;
      if (!available(candidate)) continue;
      let result, actualModel, startedAt;
      try {
        const client = await abortable(this.client(account), signal);
        const catalog = await abortable(client.models(signal), signal);
        const model = matchModel(alias, target, catalog, effort ?? void 0);
        if (!model) {
          attempts.push({
            account: account.id,
            provider: account.provider,
            status: 404,
            kind: matchModel(alias, target, catalog) ? "reasoning_effort_unavailable" : "model_unavailable"
          });
          continue;
        }
        if (route.freeOnly && !isFreeModel(model, this.now())) {
          attempts.push({ account: account.id, provider: account.provider, status: 404, kind: "model_no_longer_free" });
          continue;
        }
        actualModel = model.id;
        const dedupe = `${account.id}:${model.id}`;
        if (tried.has(dedupe)) continue;
        tried.add(dedupe);
        startedAt = performance.now();
        result = await abortable(client.chat({ ...input, model: model.id }, signal), signal);
        signal?.throwIfAborted();
        if (result.ok) {
          this.active.set(alias, key);
          this.onAttempt({ account: account.id, provider: account.provider, alias, model: model.id, status: 200 });
          const response = this.telemetry ? meterResponse(result.response, async (summary) => {
            await this.telemetry.record({ ...summary, ...metadata, account: account.id, provider: account.provider, alias, model: model.id, accepted: true, status: summary.ok ? 200 : summary.cancelled ? 499 : 502 });
            await this.syncExpiring(alias, route, expiryCandidates, below);
            if (strategy === "credits" || route.preferExpiringCredits) void this.monitor?.(account).then(() => this.syncExpiring(alias, route, expiryCandidates, below)).catch(() => {
            });
          }, signal, { startedAt }) : result.response;
          return { response, account: account.id, provider: account.provider };
        }
      } catch (error) {
        signal?.throwIfAborted();
        const reported = error.status ?? error.failure?.status ?? /\bhttp\s+(\d{3})\b/i.exec(error.message ?? "")?.[1];
        result = { ok: false, status: Number(reported) || 502, kind: error.code ?? error.failure?.code ?? "transport" };
      }
      const status = result.status >= 400 && result.status <= 599 ? result.status : 502;
      const attempt = { account: account.id, provider: account.provider, status, kind: result.kind };
      attempts.push(attempt);
      await this.telemetry?.record({ ...attempt, ...metadata, alias, model: actualModel, ok: false, timing: startedAt === void 0 ? null : { modelMs: Math.max(0, performance.now() - startedAt) } });
      this.onAttempt({ ...attempt, alias });
      const retryable = status < 500 || this.config.retryServerErrors;
      if (!retryable) throw new RouteError(status, "upstream_failed", attempts, "\u4E0A\u6E38\u8FD4\u56DE 5xx \u4E14\u672A\u5F00\u542F\u300C5xx \u548C\u7F51\u7EDC\u9519\u8BEF\u4E5F\u5207\u6362\u8D26\u53F7\u300D\uFF0C\u672C\u6B21\u8BF7\u6C42\u5DF2\u505C\u6B62");
      const scope = [401, 402, 429].includes(status) ? "*" : route.freeOnly && actualModel ? `${alias}:${actualModel}` : alias;
      this.cooldowns.set(`${account.id}:${scope}`, this.now() + this.config.cooldownMs);
    }
    const hint = this.exhaustHint({ alias, route, strategy, candidates, expiryCandidates, attempts });
    throw new RouteError(503, route.freeOnly ? "free_model_pool_unavailable" : "account_pool_exhausted", attempts, hint);
  }
};

export {
  Telemetry,
  SessionMetrics,
  RouteError,
  abortable,
  matchModel,
  Router
};
//# sourceMappingURL=chunk-J3XO7RTF.js.map
