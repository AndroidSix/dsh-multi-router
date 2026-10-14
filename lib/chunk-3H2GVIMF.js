import {
  isFreeModel,
  reasoningModes,
  writePrivateJson
} from "./chunk-GTHSHK6D.js";

// src/telemetry.mjs
import { readFile } from "node:fs/promises";
var empty = () => ({ requests: 0, failures: 0, input: 0, output: 0, tokens: 0, unmetered: 0 });
var day = (at) => new Date(at).toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
var safe = (n) => typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : 0;
var measured = (n) => typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null;
var Telemetry = class {
  constructor(file, now = Date.now) {
    this.file = file;
    this.now = now;
    this.retentionDays = 3;
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
      reasoningOutput: measured(event.usage?.completion_tokens_details?.reasoning_tokens)
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
function meterResponse(response, complete, signal) {
  if (!response.body) return response;
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let pending = "", usage, ended = false, failed = false, finished = false;
  async function finish(cancelled = false) {
    if (finished) return;
    finished = true;
    await complete({ usage, ok: ended && !failed && !cancelled, cancelled });
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
        continue;
      }
      try {
        const value = JSON.parse(data);
        if (value.usage && ["prompt_tokens", "completion_tokens", "total_tokens"].some((k) => Number.isFinite(value.usage[k]) && value.usage[k] >= 0)) usage = value.usage;
        if (value.error) failed = true;
        if (value.choices?.some((c) => c.finish_reason)) ended = true;
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
    if (!Object.hasOwn(this.config.routes, alias)) throw new RouteError(404, "unknown_model");
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
  async chat(input, signal) {
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
      if (!candidates.length) throw new RouteError(503, "credit_usage_unavailable");
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
      let result, actualModel;
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
        result = await abortable(client.chat({ ...input, model: model.id }, signal), signal);
        signal?.throwIfAborted();
        if (result.ok) {
          this.active.set(alias, key);
          this.onAttempt({ account: account.id, provider: account.provider, alias, model: model.id, status: 200 });
          const response = this.telemetry ? meterResponse(result.response, async (summary) => {
            await this.telemetry.record({ ...summary, account: account.id, provider: account.provider, alias, model: model.id, accepted: true, status: summary.ok ? 200 : summary.cancelled ? 499 : 502 });
            await this.syncExpiring(alias, route, expiryCandidates, below);
            if (strategy === "credits" || route.preferExpiringCredits) void this.monitor?.(account).then(() => this.syncExpiring(alias, route, expiryCandidates, below)).catch(() => {
            });
          }, signal) : result.response;
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
      await this.telemetry?.record({ ...attempt, alias, model: actualModel, ok: false });
      this.onAttempt({ ...attempt, alias });
      const retryable = status < 500 || this.config.retryServerErrors;
      if (!retryable) throw new RouteError(status, "upstream_failed", attempts);
      const scope = [401, 402, 429].includes(status) ? "*" : route.freeOnly && actualModel ? `${alias}:${actualModel}` : alias;
      this.cooldowns.set(`${account.id}:${scope}`, this.now() + this.config.cooldownMs);
    }
    throw new RouteError(503, route.freeOnly ? "free_model_pool_unavailable" : "account_pool_exhausted", attempts);
  }
};

export {
  Telemetry,
  RouteError,
  abortable,
  matchModel,
  Router
};
//# sourceMappingURL=chunk-3H2GVIMF.js.map
