import { meterResponse } from './telemetry.mjs';
import { isFreeModel } from './config.mjs';
import { reasoningModes } from './reasoning.mjs';
export class RouteError extends Error {
  constructor(status, code, attempts = [], hint) {
    super(`${code}${attempts.length ? ': ' + attempts.map(a => `${a.account} HTTP ${a.status}`).join(', ') : ''}${hint ? `（${hint}）` : ''}`);
    this.status = status; this.code = code; this.attempts = attempts; this.hint = hint;
  }
}
const normalize = value => value.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/official$/, '');
export function abortable(promise, signal) {
  if (!signal) return promise;
  // Attach handlers even if already aborted, so a late rejection is consumed.
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
export function matchModel(alias, target, catalog, effort, provider = target.provider) {
  const allowed = m => m && (effort === undefined || reasoningModes(m, provider).includes(effort));
  if (target.model) return catalog.find(m => m.id === target.model && allowed(m));
  if (target.models) return target.models.map(id => catalog.find(m => m.id === id)).find(allowed);
  if (alias === 'ds4.1f') return catalog.find(m => allowed(m) && [m.id, m.name ?? ''].some(x => normalize(x) === 'deepseekv41flash'));
}

export class Router {
  constructor(config, createClient, onAttempt = () => {}, now = Date.now) {
    this.config = config; this.createClient = createClient; this.onAttempt = onAttempt; this.now = now;
    this.telemetry = null; this.scores = new Map(); this.monitor = null; this.clients = new Map(); this.cooldowns = new Map(); this.active = new Map();
  }
  updateConfig(config) {
    for (const old of this.config.accounts) {
      const next = config.accounts.find(a => a.id === old.id);
      if (!next || next.provider !== old.provider || next.credentialFile !== old.credentialFile || next.identityFile !== old.identityFile) this.clients.delete(old.id);
    }
    this.config = config;
    for (const alias of this.active.keys()) if (!Object.hasOwn(config.routes, alias)) this.active.delete(alias);
  }
  async client(account) {
    if (!this.clients.has(account.id)) this.clients.set(account.id, Promise.resolve().then(() => this.createClient(account)));
    try { return await this.clients.get(account.id); }
    catch (error) { this.clients.delete(account.id); throw error; }
  }
  status() {
    return this.config.accounts.map(a => ({ id: a.id, provider: a.provider, enabled: a.enabled !== false,
      cooldowns: [...this.cooldowns].filter(([key, time]) => key.startsWith(`${a.id}:`) && time > this.now())
        .map(([key, time]) => ({ route: key.slice(a.id.length + 1), remainingMs: time - this.now() })),
      activeFor: [...this.active].filter(([, key]) => key.split(':')[0] === a.id).map(([alias]) => alias) }));
  }
  candidates(alias) {
    const route = this.config.routes[alias];
    if (!Object.hasOwn(this.config.routes, alias)) throw new RouteError(404, 'unknown_model', [], '插件路由表中没有该调用名称，请在配置页新建或恢复对应路由');
    const candidates = route.targets.flatMap((target, index) => this.config.accounts
      .filter(a => a.enabled !== false && a.provider === target.provider && (!target.account || a.id === target.account))
      .flatMap(account => route.freeOnly ? (this.freeModels?.(account) ?? []).filter(m => (!target.model || m.id === target.model) && (!target.models || target.models.includes(m.id)))
        .map(model => ({ account, target: { ...target, model: model.id, models: undefined }, key: `${account.id}:${index}:${model.id}` }))
        : [{ account, target, key: `${account.id}:${index}` }]));
    const active = candidates.findIndex(c => c.key === this.active.get(alias));
    return active < 0 ? candidates : [...candidates.slice(active), ...candidates.slice(0, active)];
  }
  expiringAt(account, route) {
    const balance = this.telemetry?.row('accounts', account.id).balance;
    if (!balance || balance.error || balance.unit !== 'credits' || this.now() - balance.fetchedAt > 120000) return Infinity;
    const horizon = this.now() + (route.expiringWithinDays ?? 7) * 86400000;
    return Math.min(Infinity, ...(balance.packages ?? []).filter(p => p.remaining > 0 && !p.unlimited && p.expiresAt > this.now() && p.expiresAt <= horizon).map(p => p.expiresAt));
  }
  async syncExpiring(alias, route, candidates, below = () => true) {
    if (!route.preferExpiringCredits || !this.telemetry) return false;
    const round = this.telemetry.expiring(alias);
    if (round.cooldownUntil > this.now()) return false;
    const before = JSON.stringify(round);
    if (round.cooldownUntil) { round.accounts = []; round.completed = []; round.cooldownUntil = 0; round.number++; }
    for (const id of round.accounts) {
      const matches = candidates.filter(c => c.account.id === id), balance = this.telemetry.row('accounts', id).balance;
      const fresh = balance && !balance.error && balance.unit === 'credits' && this.now() - balance.fetchedAt <= 120000;
      if (!matches.length || matches.every(c => !below(c)) || (fresh && !Number.isFinite(this.expiringAt({ id }, route)))) {
        if (!round.completed.includes(id)) round.completed.push(id);
      }
    }
    for (const c of candidates) if (below(c) && Number.isFinite(this.expiringAt(c.account, route)) && !round.accounts.includes(c.account.id)) round.accounts.push(c.account.id);
    // Cooling applies only to expiring-credit priority; ordinary routing keeps running.
    if (round.accounts.length && round.accounts.every(id => round.completed.includes(id))) round.cooldownUntil = this.now() + 3 * 86400000;
    if (JSON.stringify(round) !== before) await this.telemetry.persist();
    return round.cooldownUntil <= this.now();
  }
  remainingCooldown(candidate, alias, route) {
    const id = candidate.account.id;
    const keys = [`${id}:*`, `${id}:${alias}`];
    if (route.freeOnly) keys.push(`${id}:${alias}:${candidate.target.model}`);
    return Math.max(0, ...keys.map(key => (this.cooldowns.get(key) ?? 0) - this.now()));
  }
  exhaustHint({ alias, route, strategy, candidates, expiryCandidates, attempts }) {
    const kinds = new Set(attempts.map(a => a.kind));
    const modelOnly = attempts.length > 0 && [...kinds].every(k => ['model_unavailable', 'reasoning_effort_unavailable', 'model_no_longer_free'].includes(k));
    const cooling = candidates.map(c => this.remainingCooldown(c, alias, route)).filter(ms => ms > 0);
    const soonest = cooling.length ? Math.min(...cooling) : undefined;
    const countdown = soonest === undefined ? undefined : `约 ${Math.max(1, Math.ceil(soonest / 1000))} 秒后可重试`;
    if (!expiryCandidates.length) return route.freeOnly
      ? '该路由当前没有可用的免费模型：可能已恢复收费、限免到期或目录获取失败'
      : '该路由没有可用的账号目标：账号可能已全部禁用，或与目标渠道不匹配';
    if (modelOnly) return `已尝试的账号目录中都没有该模型、所选推理档位或免费资格不满足${countdown ? `；其余账号冷却中，${countdown}` : ''}`;
    if (soonest !== undefined && cooling.length >= candidates.length) {
      return attempts.length ? `所有候选账号本次调用均失败并已进入冷却，${countdown}` : `全部账号都在失败冷却中，${countdown}`;
    }
    if (soonest !== undefined) return `部分账号仍在失败冷却中，${countdown}`;
    if (!attempts.length && ['tokens', 'credits'].includes(strategy)) return `所有账号的本轮${strategy === 'tokens' ? ' Token' : '积分'}额度已用完，或因缺少用量计量而暂停参与轮换`;
    return undefined;
  }
  async chat(input, signal, metadata = {}) {
    const alias = input.model;
    if (!Array.isArray(input.messages) || !input.messages.length || input.stream !== true) throw new RouteError(400, 'messages_and_stream_true_required');
    const initialRoute = this.config.routes[alias];
    if (initialRoute?.freeOnly) {
      await abortable(this.prepareFree?.(), signal);
      if (!this.config.routes[alias]) throw new RouteError(503, 'free_model_pool_unavailable', [], '本路由今天没有可用的免费模型');
    }
    const effort = Object.hasOwn(input, 'reasoning_effort') ? input.reasoning_effort : this.config.routes[alias]?.reasoningEffort;
    input = { ...input }; delete input.reasoning_effort;
    if (effort !== undefined && effort !== null) input.reasoning_effort = effort;
    let candidates = this.candidates(alias);
    const expiryCandidates = [...candidates];
    const route = this.config.routes[alias], strategy = route.strategy ?? 'failover';
    const available = c => (this.cooldowns.get(`${c.account.id}:*`) ?? 0) <= this.now() && (this.cooldowns.get(`${c.account.id}:${alias}`) ?? 0) <= this.now()
      && (!route.freeOnly || (this.cooldowns.get(`${c.account.id}:${alias}:${c.target.model}`) ?? 0) <= this.now());
    if (route.preferExpiringCredits && this.monitor) {
      await Promise.all([...new Map(candidates.filter(available).map(c => [c.account.id, c.account])).values()].map(a => {
        const snapshot = this.telemetry?.row('accounts', a.id).balance;
        return !snapshot || snapshot.error || this.now() - snapshot.fetchedAt > 60000 ? this.monitor(a) : undefined;
      }));
      signal?.throwIfAborted();
    }
    if (strategy === 'credits') {
      await Promise.all([...new Map(candidates.filter(available).map(c => [c.account.id, c.account])).values()].map(a => this.monitor?.(a)));
      signal?.throwIfAborted();
      candidates = candidates.filter(c => { const balance = this.telemetry?.row('accounts', c.account.id).balance; return balance?.unit === 'credits' && Number.isFinite(balance.remaining) && this.now() - balance.fetchedAt < 120000 && !balance.error; });
      if (!candidates.length) throw new RouteError(503, 'credit_usage_unavailable', [], '无法获取任何候选账号的积分余额数据');
    }
    const signature = JSON.stringify({ strategy, targets: route.targets });
    let below = () => true, preferActive;
    if (this.telemetry && ['tokens', 'credits'].includes(strategy)) {
      const round = this.telemetry.round(alias, signature);
      const counters = c => ({ tokens: this.telemetry.count(alias, c.account.id).tokens, credits: this.telemetry.row('accounts', c.account.id).creditsObserved ?? 0 });
      for (const c of candidates) if (!Object.hasOwn(round.bases, c.account.id)) Object.defineProperty(round.bases, c.account.id, { value: counters(c), enumerable: true, writable: true, configurable: true });
      below = c => !round.bases[c.account.id] || counters(c)[strategy] - round.bases[c.account.id][strategy] < (strategy === 'tokens' ? c.target.tokenBudget : c.target.creditBudget);
      preferActive = await this.syncExpiring(alias, route, expiryCandidates, below);
      // Start another round only when every configured, metered candidate has used its budget.
      if (candidates.length && candidates.every(c => !below(c))) {
        await this.telemetry.advance(alias, candidates, signature);
        this.active.delete(alias);
        const allowed = new Set(candidates.map(c => c.key));
        candidates = this.candidates(alias).filter(c => allowed.has(c.key));
      }
      candidates = candidates.filter(below);
      if (strategy === 'tokens' && candidates.some(c => this.telemetry.count(alias, c.account.id).unmetered > 0)) {
        // A missing upstream usage marker cannot silently count as zero forever.
        candidates = candidates.filter(c => this.telemetry.count(alias, c.account.id).unmetered === 0);
      }
    }
    preferActive ??= await this.syncExpiring(alias, route, expiryCandidates, below);
    const expiry = c => preferActive && !this.telemetry.expiring(alias).completed.includes(c.account.id) ? this.expiringAt(c.account, route) : Infinity;
    if (preferActive) candidates.sort((a, b) => expiry(a) - expiry(b));
    if (strategy === 'weighted') {
      let eligible = candidates.filter(available);
      const nearest = Math.min(Infinity, ...eligible.map(expiry));
      if (Number.isFinite(nearest)) eligible = eligible.filter(c => expiry(c) === nearest);
      if (eligible.length) {
        let scores = this.scores.get(alias);
        if (scores?.signature !== signature) { scores = { signature, values: new Map() }; this.scores.set(alias, scores); }
        let total = 0, winner;
        for (const c of eligible) { const weight = c.target.weight ?? 1; total += weight; scores.values.set(c.key, (scores.values.get(c.key) ?? 0) + weight); if (!winner || scores.values.get(c.key) > scores.values.get(winner.key)) winner = c; }
        scores.values.set(winner.key, scores.values.get(winner.key) - total);
        candidates = [winner, ...candidates.filter(c => c !== winner)];
      }
    }
    const attempts = [];
    // Each account/model target is attempted once, even when configuration repeats it.
    const tried = new Set();
    for (const candidate of candidates) {
      signal?.throwIfAborted();
      const { account, target, key } = candidate;
      if (!available(candidate)) continue;
      let result, actualModel, startedAt;
      try {
        const client = await abortable(this.client(account), signal);
        const catalog = await abortable(client.models(signal), signal);
        const model = matchModel(alias, target, catalog, effort ?? undefined);
        if (!model) { attempts.push({ account: account.id, provider: account.provider, status: 404,
          kind: matchModel(alias, target, catalog) ? 'reasoning_effort_unavailable' : 'model_unavailable' }); continue; }
        if (route.freeOnly && !isFreeModel(model, this.now())) { attempts.push({ account: account.id, provider: account.provider, status: 404, kind: 'model_no_longer_free' }); continue; }
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
          const response = this.telemetry ? meterResponse(result.response, async summary => {
            await this.telemetry.record({ ...summary, ...metadata, account: account.id, provider: account.provider, alias, model: model.id, accepted: true, status: summary.ok ? 200 : summary.cancelled ? 499 : 502 });
            await this.syncExpiring(alias, route, expiryCandidates, below);
            if (strategy === 'credits' || route.preferExpiringCredits) void this.monitor?.(account).then(() => this.syncExpiring(alias, route, expiryCandidates, below)).catch(() => {});
          }, signal, { startedAt }) : result.response;
          return { response, account: account.id, provider: account.provider };
        }
      } catch (error) {
        signal?.throwIfAborted();
        const reported = error.status ?? error.failure?.status ?? /\bhttp\s+(\d{3})\b/i.exec(error.message ?? '')?.[1];
        result = { ok: false, status: Number(reported) || 502, kind: error.code ?? error.failure?.code ?? 'transport' };
      }
      const status = result.status >= 400 && result.status <= 599 ? result.status : 502;
      const attempt = { account: account.id, provider: account.provider, status, kind: result.kind };
      attempts.push(attempt);
      await this.telemetry?.record({ ...attempt, ...metadata, alias, model: actualModel, ok: false, timing: startedAt === undefined ? null : { modelMs: Math.max(0, performance.now() - startedAt) } });
      // Upstream messages can contain credentials or request text: log metadata only.
      this.onAttempt({ ...attempt, alias });
      const retryable = status < 500 || this.config.retryServerErrors;
      if (!retryable) throw new RouteError(status, 'upstream_failed', attempts, '上游返回 5xx 且未开启「5xx 和网络错误也切换账号」，本次请求已停止');
      const scope = [401, 402, 429].includes(status) ? '*' : route.freeOnly && actualModel ? `${alias}:${actualModel}` : alias;
      this.cooldowns.set(`${account.id}:${scope}`, this.now() + this.config.cooldownMs);
    }
    const hint = this.exhaustHint({ alias, route, strategy, candidates, expiryCandidates, attempts });
    throw new RouteError(503, route.freeOnly ? 'free_model_pool_unavailable' : 'account_pool_exhausted', attempts, hint);
  }
}
