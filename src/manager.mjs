import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { version as pluginVersion } from '../package.json';
import { readFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { watch } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { withFileLock } from '@deepseek-ai/dsh-atomic-write';
import { PROVIDERS, PROVIDER_NAMES, ROUTE_PRESETS, validateConfig, writePrivateJson, isFreeModel, beijingDay } from './config.mjs';
import { modelWithCurrentPromotion } from '../upstream/workbuddy/src/upstream.ts';
import { importAccount, readPortableCredential, discoverLocalAccounts, localAccountKey, normalizeLocalAccountKey } from './accounts.mjs';
import { hostIsLoopback } from '../upstream/workbuddy/src/loopback.ts';
import { Telemetry } from './telemetry.mjs';
import { jsonCredential } from './clients.mjs';
import { QODER_VARIANTS } from '../upstream/qoder/src/variants.ts';
import { qoderOwnAuthPath } from '../upstream/qoder/src/auth.ts';
import { matchModel } from './router.mjs';
import { routeReasoning, reasoningModes } from './reasoning.mjs';
import { exportConfiguration, decodeConfiguration, migrationSummary, prepareMigration } from './migration.mjs';
import { PluginUpdates } from './plugin-updates.mjs';
import { Checkins, supportsCheckin } from './checkins.mjs';
import { WorkBuddyLogin } from './workbuddy-login.mjs';
import { ApiService } from './api-service.mjs';
import { contextInfo, resolveContext } from './model-context.mjs';

export const MANAGEMENT_PATH = '/.well-known/dsh-multi-router';
export const SUMMARY_PATH = `${MANAGEMENT_PATH}/summary`;
const revisionOf = raw => createHash('sha256').update(JSON.stringify(raw)).digest('hex');
export class ManagementError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const bad = message => { throw new ManagementError(400, message); };
const finite = (value, fallback) => Number.isSafeInteger(value) && value > 0 ? value : fallback;
export function modelInfo(row) {
  const billing = row.billing ? { free: row.billing.free === true, rateUnknown: row.billing.rateUnknown === true,
    ...(typeof row.billing.credits === 'string' ? { credits: row.billing.credits } : {}) } : undefined;
  const reasoning = row.reasoning?.supported ? { supports: true, supportedEfforts: row.reasoning.supported,
    defaultEffort: row.reasoning.defaultEffort, canDisableThinking: row.reasoning.supported.includes('off') } : row.reasoning;
  return { id: row.id, name: row.name || row.id, ...contextInfo(row),
    maxTokens: Math.min(finite(row.maxTokens, 32000), contextInfo(row).maxContextWindow),
    supportsImages: row.supportsImages === true || row.multimodal === true || row.input?.includes('image') === true,
    ...(reasoning ? { reasoning } : {}), ...(billing ? { billing } : {}),
    ...(typeof row.creditMultiplier === 'number' && Number.isFinite(row.creditMultiplier) && row.creditMultiplier >= 0 ? { creditMultiplier: row.creditMultiplier } : {}),
    ...(Array.isArray(row.promotions) ? { promotions: row.promotions.map(p => ({ start: p.start, end: p.end, factor: p.factor, priority: p.priority, label: typeof p.label === 'string' ? p.label : '' })) } : {}) };
}

export class Manager {
  constructor(file, router, onChange = () => {}, pluginAccess = {}) {
    this.file = file; this.router = router; this.onChange = onChange;
    this.catalogFile = join(dirname(file), 'catalogs.json');
    this.catalogs = new Map(); this.catalogErrors = new Map(); this.refreshes = new Map();
    this.closed = false; this.monitorFlights = new Map(); this.loginInfo = new Map();
    this.telemetry = new Telemetry(join(dirname(file), 'usage.json'));
    this.plugins = new PluginUpdates({ ...pluginAccess, stateFile: join(dirname(file), 'plugin-updates.json'), onInstalled: name => {
      if (name !== 'dsh-multi-router' || !this.runtime?.canReload()) return false;
      this.runtime.schedule(); return true;
    } });
    this.checkins = new Checkins(join(dirname(file), 'checkins.json'), this);
    this.workbuddyLogin = new WorkBuddyLogin(join(dirname(file), 'workbuddy-login.json'), { fetchImpl: pluginAccess.fetchImpl });
    this.setupFile = join(dirname(file), 'initial-setup.json');
    this.api = new ApiService(join(dirname(file), 'api-service.json'), this);
    router.telemetry = this.telemetry; router.monitor = a => this.monitorAccount(a, { maxAgeMs: 60000 });
    router.prepareFree = () => this.checkFreeModels(true);
    router.freeModels = account => this.freeModels(account);

  }
  async load() {
    this.raw = JSON.parse(await readFile(this.file, 'utf8'));
    try { this.setup = JSON.parse(await readFile(this.setupFile, 'utf8')); } catch { this.setup = undefined; }
    this.config = validateConfig(this.raw, this.file);
    await this.checkins.load();
    await this.plugins.load();
    try {
      const saved = JSON.parse(await readFile(this.catalogFile, 'utf8'));
      for (const account of this.config.accounts) {
        const item = saved[account.id];
        if (item?.credentialFile === account.credentialFile && Array.isArray(item.models)) {
          this.catalogs.set(account.id, { ...item, ...(item.contextVersion !== 1 ? { fetchedAt: 0 } : {}), models: item.models.filter(m => typeof m.id === 'string' && m.id.length > 0).map(modelInfo) });
        }
      }
    } catch { /* No saved directory yet; never invent a provider's model roster. */ }
    this.telemetry.configure(this.config.usageRetentionDays);
    await this.telemetry.load();
    await this.api.load();
    await Promise.all(this.config.accounts.map(a => this.readLogin(a)));
    this.publish();
  }
  async readLogin(account) {
    try {
      const raw = await jsonCredential(account.credentialFile), c = raw.credential;
      this.loginInfo.set(account.id, account.provider.startsWith('qoder')
        ? { state: raw.pat ? 'configured' : 'missing', kind: 'PAT', refreshable: false }
        : { state: !c?.accessToken ? 'missing' : c?.expiresAtMs > Date.now() ? 'valid' : c?.refreshToken ? 'refresh-needed' : 'expired', name: c?.nickname || c?.accountName || c?.uid || c?.userId,
          identity: c?.uid || c?.userId, expiresAt: c?.expiresAtMs, refreshExpiresAt: c?.refreshExpiresAtMs, refreshable: !!c?.refreshToken, kind: '客户端登录态', edition: c?.edition });
    } catch { this.loginInfo.set(account.id, { state: 'missing' }); }
  }
  async syncLocalAccounts(provider, force = false) {
    if (this.localScan) return this.localScan;
    this.localScan = (async () => {
      const discovered = await discoverLocalAccounts(provider);
      this.localDiscovery = [...(this.localDiscovery ?? []).filter(s => !discovered.status.some(n => n.provider === s.provider)),
        ...discovered.status.map(s => ({ ...s, checkedAt: Date.now() }))];
      if (this.closed || !discovered.accounts.length) return;
      await withFileLock(this.file, async () => {
        if (this.closed) return;
        let raw = JSON.parse(await readFile(this.file, 'utf8'));
        let changed = false;
        const saved = new Map();
        for (const item of discovered.accounts) {
          const key = localAccountKey(item.provider, item.document);
          if (!force && raw.ignoredLocalAccounts?.some(k => normalizeLocalAccountKey(k) === key)) continue;
          const config = validateConfig(raw, this.file);
          let existing, current;
          for (const a of config.accounts.filter(a => a.provider === item.provider)) {
            try { const value = await jsonCredential(a.credentialFile);
              if (localAccountKey(a.provider, value) === key) { existing = a; current = value; break; }
            } catch { /* Keep unreadable saved accounts; do not replace a different identity. */ }
          }
          const id = existing?.id ?? `local_${createHash('sha256').update(key).digest('hex').slice(0, 20)}`;
          const recordSaved = () => { if (!saved.has(item.provider)) saved.set(item.provider, new Set()); saved.get(item.provider).add(id); };
          let sameDevice = true;
          if (existing && item.identityDocument) {
            try { const identity = await jsonCredential(existing.identityFile);
              sameDevice = identity.machineId === item.identityDocument.machineId && identity.deviceId === item.identityDocument.deviceId;
            } catch { sameDevice = false; }
          }
          if (existing && sameDevice && current.credential.expiresAtMs >= item.document.credential.expiresAtMs) { recordSaved(); continue; }
          const base = join(dirname(this.file), 'accounts'); await mkdir(base, { recursive: true, mode: 0o700 });
          const staging = await mkdtemp(join(base, `${id}-`));
          try {
            const credentialFile = join(staging, 'credential.json'), identityFile = join(staging, 'identity.json');
            await importAccount({ ...item, credentialFile, identityFile });
            const paths = { credentialFile: relative(dirname(this.file), credentialFile),
              ...(item.provider.startsWith('trae') ? { identityFile: relative(dirname(this.file), identityFile) } : {}) };
            const next = structuredClone(raw);
            if (existing) Object.assign(next.accounts.find(a => a.id === id), paths);
            else next.accounts.push({ id, provider: item.provider,
              name: item.document.credential.nickname || item.document.credential.accountName || item.document.credential.uid || item.document.credential.userId, ...paths });
            next.ignoredLocalAccounts = (raw.ignoredLocalAccounts ?? []).filter(k => normalizeLocalAccountKey(k) !== key);
            validateConfig(next, this.file);
            await writePrivateJson(this.file, next); raw = next; changed = true;
            recordSaved();
            this.router.clients.delete(id); this.catalogs.delete(id); this.catalogErrors.delete(id);
          } catch (e) { await rm(staging, { recursive: true, force: true });
            this.localDiscovery = this.localDiscovery.map(s => s.provider === item.provider ? { ...s, state: 'unreadable', code: 'import_failed' } : s); }
        }
        if (changed) { this.raw = raw; this.config = validateConfig(raw, this.file);
          await Promise.all(this.config.accounts.map(a => this.readLogin(a))); this.publish(); }
        this.localDiscovery = this.localDiscovery.map(s => discovered.status.some(d => d.provider === s.provider) ? { ...s, savedCount: saved.get(s.provider)?.size ?? 0 } : s);
      }, { waitMs: 30000 });
    })().finally(() => { this.localScan = undefined; });
    return this.localScan;
  }
  async finishInitialSetup() {
    if (this.setup?.completedAt) return;
    await withFileLock(this.setupFile, async () => {
      try { this.setup = JSON.parse(await readFile(this.setupFile, 'utf8')); } catch { /* First installation. */ }
      if (this.setup?.completedAt) return;
      this.setup = { completedAt: Date.now(), dismissed: false };
      await writePrivateJson(this.setupFile, this.setup);
    });
  }
  async monitorAccount(account, { force = false, maxAgeMs = 300000 } = {}) {
    if (this.monitorFlights.has(account.id)) return this.monitorFlights.get(account.id);
    const cached = this.telemetry.row('accounts', account.id).balance;
    const last = cached?.error ? cached.attemptedAt : cached?.fetchedAt;
    // Routing may need a fresher balance, but a failed lookup still backs off.
    const ttl = cached?.error ? 300000 : maxAgeMs;
    if (!force && Number.isFinite(last) && Date.now() >= last && Date.now() - last < ttl) return;
    const promise = (async () => {
      try {
        const client = await this.router.client(account);
        if (!client.accountInfo) return;
        const snapshot = await client.accountInfo(AbortSignal.timeout(30000));
        if (this.closed || !this.config.accounts.some(a => a.id === account.id && a.credentialFile === account.credentialFile)) return;
        this.loginInfo.set(account.id, snapshot.login);
        await this.telemetry.observe(account.id, snapshot);
      } catch (e) {
        if (this.closed) return;
        const old = this.telemetry.row('accounts', account.id).balance;
        await this.telemetry.observe(account.id, { ...old, error: { code: 'usage_fetch_failed', status: Number(e.status ?? e.failure?.status) || 502 }, attemptedAt: Date.now() });
        await this.readLogin(account);
      }
    })().finally(() => this.monitorFlights.delete(account.id));
    this.monitorFlights.set(account.id, promise); return promise;
  }
  async monitorAll(provider, options) { await Promise.all(this.config.accounts.filter(a => (!provider || a.provider === provider) && (options?.force || a.enabled !== false)).map(a => this.monitorAccount(a, options))); }
  freeAccounts() {
    const targets = Object.values(this.config.routes).filter(r => r.freeOnly).flatMap(r => r.targets);
    return this.config.accounts.filter(a => a.enabled !== false && targets.some(t => t.provider === a.provider && (!t.account || t.account === a.id)));
  }
  freeModels(account) {
    const saved = this.catalogs.get(account.id);
    if (this.catalogErrors.has(account.id) || !saved || beijingDay(saved.fetchedAt) !== beijingDay(Date.now())) return [];
    return saved.models.map(m => modelWithCurrentPromotion(m)).filter(m => isFreeModel(m));
  }
  async checkFreeModels(force = false) {
    await Promise.all(this.freeAccounts().filter(a => {
      const saved = this.catalogs.get(a.id);
      if (force) return true;
      if (Date.now() - (this.catalogErrors.get(a.id)?.at ?? 0) < 300000) return false;
      return !saved || beijingDay(saved.fetchedAt) !== beijingDay(Date.now()) || saved.pricingVersion !== 1;
    }).map(a => this.refreshAccount(a, 'pricing')));
  }
  freeStatus(row) {
    const accounts = this.config.accounts.filter(a => a.enabled !== false && row.targets.some(t => t.provider === a.provider && (!t.account || t.account === a.id)));
    return { checking: accounts.some(a => this.refreshes.has(a.id)),
      accounts: accounts.map(a => ({ id: a.id, provider: a.provider, name: a.name ?? a.id, checkedAt: this.catalogs.get(a.id)?.fetchedAt,
        error: this.catalogErrors.get(a.id), models: this.freeModels(a).map(m => ({ id: m.id, name: m.name })) })) };
  }
  freeRoutes(parentId, row) {
    const groups = new Map();
    for (const account of this.config.accounts.filter(a => a.enabled !== false)) {
      for (const model of this.freeModels(account)) {
        if (!row.targets.some(t => t.provider === account.provider && (!t.account || t.account === account.id)
          && (!t.model || t.model === model.id) && (!t.models || t.models.includes(model.id)))) continue;
        // Exact provider/model identity: equal display names never merge different versions.
        const id = `free_${createHash('sha256').update(JSON.stringify([parentId, account.provider, model.id])).digest('hex').slice(0, 24)}`;
        if (!groups.has(id)) groups.set(id, { id, models: [], targets: [], accountNames: [], modelName: model.name, provider: account.provider, modelId: model.id });
        const group = groups.get(id);
        group.models.push({ model, provider: account.provider, accountId: account.id });
        group.targets.push({ provider: account.provider, account: account.id, model: model.id });
        group.accountNames.push(account.name ?? account.id);
      }
    }
    return [...groups.values()].map(({ models, ...group }) => {
      const preference = row.freeModels?.[group.id] ?? {};
      const context = resolveContext(models.map(s => s.model), preference.contextWindow ?? (row.contextMode === 'custom' ? row.contextWindow : null), row.contextWindow);
      const eligible = models.filter(s => contextInfo(s.model).maxContextWindow >= context.contextWindow);
      const eligibleAccountIds = eligible.map(s => s.accountId);
      const reasoning = routeReasoning(eligible);
      const selected = preference.reasoningEffort;
      return { ...group, ...context, eligibleAccountIds,
        targets: group.targets.filter(t => eligibleAccountIds.includes(t.account)),
        accountNames: group.accountNames.filter((_, i) => eligibleAccountIds.includes(models[i].accountId)),
        enforceContext: true, parentId, dynamicFree: true, freeOnly: true, strategy: 'failover', preferExpiringCredits: false,
        name: `Free · ${group.modelName} · ${PROVIDER_NAMES[group.provider]}`, reasoning,
        ...(selected && reasoning?.supportedEfforts.includes(selected) ? { reasoningEffort: selected } : {}),
        configuredEffort: selected ?? null, effortUnavailable: !!selected && !reasoning?.supportedEfforts.includes(selected),
        visible: row.visible !== false && preference.visible !== false, selected: preference.visible !== false,
        supportsImages: eligible.every(({ model }) => model.supportsImages),
        maxTokens: Math.min(row.maxTokens, context.contextWindow, ...eligible.map(({ model }) => model.maxTokens)) };
    });
  }
  adapterModels() {
    const rows = this.routeModels();
    return [...rows.filter(r => r.freeOnly).flatMap(r => this.freeRoutes(r.id, r)),
      ...rows.filter(r => !r.freeOnly), ...rows.filter(r => r.freeOnly).map(r => ({ ...r, visible: false }))];
  }
  publish() {
    this.telemetry.configure(this.config.usageRetentionDays);
    this.revision = revisionOf(this.raw);
    const routes = Object.fromEntries(this.routeModels().map(row => [row.id, row]));
    for (const model of this.adapterModels().filter(m => m.dynamicFree)) routes[model.id] = model;
    for (const provider of PROVIDERS) for (const model of this.providerModels(provider)) {
      routes[`${provider}::${model.id}`] = { ...model, targets: [{ provider, model: model.id }] };
    }
    this.router.updateConfig({ ...this.config, routes });
    this.onChange();
  }
  providerModels(provider) {
    const rows = new Map();
    for (const account of this.config.accounts.filter(a => a.provider === provider && a.enabled !== false)) {
      for (const model of this.catalogs.get(account.id)?.models ?? []) {
        if (!rows.has(model.id)) rows.set(model.id, []);
        rows.get(model.id).push(model);
      }
    }
    return [...rows.values()].map(models => {
      const model = models[0], preference = this.config.models[provider]?.[model.id] ?? {};
      const context = resolveContext(models, preference.contextWindow);
      const eligible = models.filter(m => contextInfo(m).maxContextWindow >= context.contextWindow);
      const reasoning = routeReasoning(eligible.map(model => ({ model, provider })));
      const selected = preference.reasoningEffort;
      return { ...model, ...context, enforceContext: true, name: preference.name ?? model.name, reasoning,
        supportsImages: preference.supportsImages !== false && eligible.every(m => m.supportsImages),
        imageCapable: eligible.every(m => m.supportsImages),
        ...(selected && reasoning?.supportedEfforts.includes(selected) ? { reasoningEffort: selected } : {}),
        configuredEffort: selected ?? null, effortUnavailable: !!selected && !reasoning?.supportedEfforts.includes(selected),
        maxTokens: Math.min(context.contextWindow, ...eligible.map(m => m.maxTokens)) };
    });
  }
  hiddenModels(provider) {
    return this.providerModels(provider).filter(m => !this.modelVisible(provider, m.id)).map(m => m.id);
  }
  modelVisible(provider, id) { return this.config.models[provider]?.[id]?.visible ?? this.config.modelVisibility[provider] ?? false; }
  routeModels() {
    return Object.entries(this.config.routes).sort(([, a], [, b]) => Number(!!b.freeOnly) - Number(!!a.freeOnly)).map(([id, row]) => {
      const effectiveTargets = row.freeOnly ? this.freeRoutes(id, row).flatMap(r => r.targets) : row.targets;
      const sources = effectiveTargets.flatMap(target => this.config.accounts.filter(a => a.enabled !== false && a.provider === target.provider
        && (!target.account || target.account === a.id)).flatMap(a => {
          const catalog = this.catalogs.get(a.id)?.models ?? [];
          const models = target.models ? target.models.map(model => catalog.find(m => m.id === model)).filter(Boolean)
            : [matchModel(id, target, catalog)].filter(Boolean);
          return models.map(model => ({ model, provider: a.provider, accountId: a.id }));
        }));
      const context = resolveContext(sources.map(s => s.model), row.contextMode === 'custom' ? row.contextWindow : null, row.contextWindow);
      const eligible = sources.filter(s => contextInfo(s.model).maxContextWindow >= context.contextWindow);
      const models = eligible.map(s => s.model), reasoning = routeReasoning(eligible);
      return { ...row, ...context, enforceContext: true, supportsImages: models.length > 0 && models.every(m => m.supportsImages), reasoning,
        eligibleAccountIds: [...new Set(eligible.map(s => s.accountId))],
        maxTokens: Math.min(row.maxTokens, context.contextWindow, ...models.map(m => m.maxTokens)),
        id, name: row.name ?? id, expiringStatus: { ...this.telemetry.data.expiringRounds[id] },
        ...(row.freeOnly ? { freeStatus: { ...this.freeStatus(row), modelRoutes: this.freeRoutes(id, row) } } : {}) };
    });
  }
  async ensureCatalog(provider, force = false) {
    await Promise.all(this.config.accounts.filter(a => a.provider === provider && a.enabled !== false).map(a => this.refreshAccount(a, force)));
  }
  async refreshAccount(account, force) {
    const saved = this.catalogs.get(account.id);
    if (!force && saved && Date.now() - saved.fetchedAt < this.config.catalogTtlMs) return;
    if (!force && Date.now() - (this.catalogErrors.get(account.id)?.at ?? 0) < 10000) return;
    if (this.refreshes.has(account.id)) return this.refreshes.get(account.id);
    const promise = (async () => {
      try {
        if (force === true) this.router.clients.delete(account.id);
        const client = await this.router.client(account);
        const models = (await client.models(AbortSignal.timeout(60000), !!force)).map(modelInfo);
        // A late response may not resurrect an account removed while discovery was running.
        if (this.closed || !this.config.accounts.some(a => a.id === account.id && a.credentialFile === account.credentialFile)) return;
        this.catalogs.set(account.id, { credentialFile: account.credentialFile, fetchedAt: Date.now(), pricingVersion: 1, contextVersion: 1, models });
        this.catalogErrors.delete(account.id);
        await withFileLock(this.catalogFile, () => writePrivateJson(this.catalogFile, Object.fromEntries(this.catalogs)));
      } catch (error) {
        if (this.closed || !this.config.accounts.some(a => a.id === account.id)) return;
        this.catalogErrors.set(account.id, { status: Number(error.status ?? error.failure?.status) || 502, code: 'catalog_fetch_failed', at: Date.now() });
      }
      if (!this.closed) this.publish();
    })().finally(() => this.refreshes.delete(account.id));
    this.refreshes.set(account.id, promise);
    return promise;
  }
  summaryState() {
    const today = new Date(this.telemetry.now()).toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
    const daily = this.telemetry.data.days[today] ?? {};
    return { pluginVersion, enabled: this.config.sidebarUsage, today,
      tokens: daily.tokens ?? 0, requests: daily.requests ?? 0, unmetered: daily.unmetered ?? 0,
      totalTokens: Object.values(this.telemetry.data.accounts).reduce((sum, row) => sum + (row.tokens ?? 0), 0) };
  }
  state() {
    const status = this.router.status();
    return { pluginVersion, startup: this.startup, runtime: this.runtime?.state(), revision: this.revision, localDiscovery: this.localDiscovery ?? [], setup: this.setup,
      pluginUpdates: this.plugins.state(),
      checkins: this.checkins.state(),
      telemetry: this.telemetry.state(),
      apiService: this.api.state(),
      accounts: this.config.accounts.map(a => ({ id: a.id, provider: a.provider, name: a.name ?? a.id,
        enabled: a.enabled !== false, status: status.find(s => s.id === a.id),
        login: this.loginInfo.get(a.id), usage: this.telemetry.row('accounts', a.id),
        modelCount: this.catalogs.get(a.id)?.models.length ?? 0,
        fetchedAt: this.catalogs.get(a.id)?.fetchedAt, error: this.catalogErrors.get(a.id) })),
      providers: PROVIDERS.map(id => ({ id, name: PROVIDER_NAMES[id], models: this.providerModels(id).map(m => ({ ...m,
        visible: this.modelVisible(id, m.id) })) })),
      presets: Object.entries(ROUTE_PRESETS).map(([id, route]) => ({ id, ...structuredClone(route), providerCount: route.targets.length, added: Object.hasOwn(this.config.routes, id),
        availableProviders: [...new Set(route.targets.filter(t => route.freeOnly
          ? this.config.accounts.some(a => a.enabled !== false && a.provider === t.provider && this.freeModels(a).length)
          : matchModel(id, t, this.providerModels(t.provider))).map(t => t.provider))] })),
      routes: this.routeModels(), options: { cooldownMs: this.config.cooldownMs, requestTimeoutMs: this.config.requestTimeoutMs,
        retryServerErrors: this.config.retryServerErrors, usageRetentionDays: this.config.usageRetentionDays, sidebarUsage: this.config.sidebarUsage } };
  }
  async action(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) bad('请求格式无效');
    if (input.action === 'model.test') {
      const model = this.providerModels(input.provider).find(m => m.id === input.id);
      if (!model) bad('请先刷新并选择已发现的模型');
      if (this.modelTestFlight || Date.now() - (this.modelTestAt ?? 0) < 10000) bad('请等待当前测试完成，测试间隔至少 10 秒');
      this.modelTestFlight = true; this.modelTestAt = Date.now(); this.modelTestAbort = new AbortController();
      const started = performance.now();
      let modelTest;
      try {
        const { response } = await this.router.chat({ model: `${input.provider}::${input.id}`, stream: true,
          messages: [{ role: 'system', content: 'Answer briefly.' }, { role: 'user', content: 'Reply with OK.' }], max_tokens: 16 },
          AbortSignal.any([this.modelTestAbort.signal, AbortSignal.timeout(45000)]));
        const reader = response.body.getReader(); let size = 0, text = ''; const decoder = new TextDecoder();
        try { for (;;) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.byteLength;
          if (size > 1024 * 1024) throw Error('probe_response_too_large'); text += decoder.decode(chunk.value, { stream: true }); }
          text += decoder.decode();
          let answered = false;
          for (const line of text.split(/\r?\n/).filter(l => l.startsWith('data:'))) {
            if (line.slice(5).trim() === '[DONE]') continue;
            const payload = JSON.parse(line.slice(5));
            if (payload.error || payload.choices?.some(c => c.finish_reason === 'error')) throw Error('probe_stream_failed');
            answered ||= payload.choices?.some(c => c.delta?.content || c.delta?.reasoning_content || c.delta?.tool_calls?.length) ?? false;
          }
          if (!answered || !/^data:\s*\[DONE\]\s*$/m.test(text)) throw Error('probe_incomplete');
        } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
        modelTest = { ok: true, elapsedMs: Math.round(performance.now() - started) };
      } catch (error) { modelTest = { ok: false, status: Number(error.status) || 502,
        hint: error.hint || '测试未通过，请查看账号状态；不会自动重试。' }; }
      finally { this.modelTestFlight = false; this.modelTestAbort = undefined; }
      return { ...this.state(), modelTest };
    }
    if (input.action?.startsWith('api.')) {
      let result;
      try { result = await this.api.action(input); } catch (e) { bad(e.message); }
      return { ...this.state(), ...result };
    }
    if (input.action === 'plugin.reload') { if (!this.runtime) bad('当前后台不支持重新加载'); this.runtime.retryAt = 0; this.runtime.schedule(0); return this.state(); }
    if (input.action === 'workbuddy.sms') {
      try { const workbuddyLogin = await this.workbuddyLogin.send(input.phone); return { ...this.state(), workbuddyLogin }; } catch (e) { bad(e.message); }
    }
    if (input.action === 'workbuddy.login') {
      if (input.revision !== revisionOf(JSON.parse(await readFile(this.file, 'utf8')))) throw new ManagementError(409, '配置已更新，请刷新后重新提交登录');
      let login; try { login = await this.workbuddyLogin.complete(input.challenge, input.code, input.verify ?? true); } catch (e) { bad(e.message); }
      let existing;
      for (const a of this.config.accounts.filter(a => a.provider === 'workbuddy')) {
        try { if ((await jsonCredential(a.credentialFile)).credential.uid === login.document.credential.uid) { existing = a; break; } } catch { /* Preserve unreadable accounts. */ }
      }
      if (input.id && input.id !== existing?.id) bad('登录身份与正在编辑的账号不同，请从添加账号入口保存');
      const state = await this.action({ action: existing ? 'account.credentials' : 'account.add', revision: input.revision,
        id: existing?.id ?? `workbuddy_${randomBytes(8).toString('hex')}`, provider: 'workbuddy', name: input.name, document: login.document });
      this.workbuddyLogin.finish();
      return { ...state, loginResult: { warning: login.warning, saved: true } };
    }
    if (input.action === 'checkins.verify') {
      const account = this.config.accounts.find(a => a.id === input.id && a.provider === 'workbuddy');
      if (!account) bad('请选择 WorkBuddy 中国版账号');
      if (this.checkins.flight || this.checkins.failed) bad('请等待签到完成，或先修复签到记录');
      try { await this.workbuddyLogin.reserve('verifyAt', 30000); } catch (e) { bad(e.message); }
      try {
        const client = await this.router.client(account);
        await client.checkin.validate(AbortSignal.timeout(30000));
        await this.checkins.credentialsUpdated(account.id);
        await this.readLogin(account);
      } catch { bad('登录验证未通过：请在账号与登录中更新凭证；不会自动重试或领取'); }
      return this.state();
    }
    if (input.action === 'checkins.run') {
      try { this.checkins.start(input.ids); } catch (e) { bad(e.message); }
      return this.state();
    }
    if (input.action === 'checkins.resume') {
      try { await this.checkins.resume(input.provider); } catch (e) { bad(e.message); }
      return this.state();
    }
    if (typeof input.action === 'string' && input.action.startsWith('plugins.')) {
      try { await this.plugins.action(input); } catch (e) { bad(e.message); }
      return this.state();
    }
    if (input.action === 'setup.dismiss') {
      await withFileLock(this.setupFile, async () => {
        this.setup = { ...this.setup, completedAt: this.setup?.completedAt ?? Date.now(), dismissed: true };
        await writePrivateJson(this.setupFile, this.setup);
      });
      return this.state();
    }
    if (input.action === 'account.export') {
      if (input.revision !== revisionOf(JSON.parse(await readFile(this.file, 'utf8')))) throw new ManagementError(409, '配置已更新，请刷新后提取凭证');
      const account = this.config.accounts.find(a => a.id === input.id);
      if (!account) bad('账号不存在');
      let credential;
      try { credential = await readPortableCredential(account); } catch { bad('账号凭证不可读，请补充或更新后再提取'); }
      if (!credential) bad('账号尚未保存凭证，请先补充登录信息');
      return { ...this.state(), exported: { filename: `dsh-account-${account.provider}-${account.id}.json`,
        document: { ...credential.document, ...(credential.identity ? { identity: credential.identity } : {}),
          format: 'dsh-multi-router-account', provider: account.provider, name: account.name || account.id } } };
    }
    if (input.action === 'config.export') {
      if (input.revision !== revisionOf(JSON.parse(await readFile(this.file, 'utf8')))) throw new ManagementError(409, '配置已更新，请刷新后导出');
      try { return { ...this.state(), exported: { filename: `dsh-multi-router-${input.includeCredentials ? 'encrypted' : 'settings'}-${new Date().toISOString().slice(0, 10)}.json`, document: await exportConfiguration(this, input) } }; }
      catch (e) { bad(e.message); }
    }
    if (input.action === 'config.preview') {
      try { const portable = await decodeConfiguration(input); return { ...this.state(), importPreview: migrationSummary(this, portable, input.mode) }; }
      catch (e) { bad(e.message); }
    }
    if (input.action === 'monitor.refresh' || input.action === 'account.refresh') {
      if (input.provider && !PROVIDERS.includes(input.provider)) bad('未知供应商');
      if (input.action === 'account.refresh') { const account = this.config.accounts.find(a => a.id === input.id); if (!account) bad('账号不存在'); this.router.clients.delete(account.id); await this.monitorAccount(account, { force: true }); }
      else { await this.syncLocalAccounts(input.provider); await this.monitorAll(input.provider, { force: true }); }
      return this.state();
    }
    if (input.action === 'accounts.discover') {
      if (input.provider && !PROVIDERS.includes(input.provider)) bad('未知供应商');
      await this.syncLocalAccounts(input.provider, true);
      await Promise.all([this.monitorAll(input.provider), ...this.config.accounts.filter(a => !input.provider || a.provider === input.provider).map(a => this.refreshAccount(a, true))]);
      return this.state();
    }
    if (input.action === 'account.capture') {
      if (!PROVIDERS.includes(input.provider)) bad('未知供应商');
      input = { ...input, action: 'account.add', id: `${input.provider.replace('-', '_')}_${randomBytes(4).toString('hex')}`, capture: true };
    }
    if (input.action === 'refresh') {
      if (input.provider && !PROVIDERS.includes(input.provider)) bad('未知供应商');
      await Promise.all((input.provider ? [input.provider] : PROVIDERS).map(p => this.ensureCatalog(p, true)));
      return this.state();
    }
    if (input.action === 'free.refresh') { await this.checkFreeModels(true); return this.state(); }
    return withFileLock(this.file, async () => {
      let raw = JSON.parse(await readFile(this.file, 'utf8'));
      if (input.revision !== revisionOf(raw)) throw new ManagementError(409, '配置已更新，请刷新后再保存');
      raw.routes ??= structuredClone(this.config.routes);
      let staging;
      try {
        const account = raw.accounts.find(a => a.id === input.id);
        if (input.action === 'config.import') {
          try {
            const prepared = await prepareMigration(this, raw, await decodeConfiguration(input), input.mode);
            staging = prepared.staging;
            await writePrivateJson(`${this.file}.before-import-${Date.now()}-${randomBytes(3).toString('hex')}.bak`, raw);
            raw = prepared.raw;
          } catch (e) { bad(e.message); }
        } else if (input.action === 'account.add' || input.action === 'account.credentials') {
          const replacing = input.action === 'account.credentials';
          if (replacing) { if (!account) bad('账号不存在'); input = { ...input, provider: account.provider }; }
          if (!/^[a-zA-Z0-9_-]{1,64}$/.test(input.id ?? '') || !PROVIDERS.includes(input.provider)) bad('账号 ID 或供应商无效');
          if (account && !replacing) bad('账号 ID 已存在，请使用不同 ID');
          const base = join(dirname(this.file), 'accounts'); await mkdir(base, { recursive: true, mode: 0o700 });
          staging = await mkdtemp(join(base, `${input.id}-`));
          const credentialFile = join(staging, 'credential.json'), identityFile = join(staging, 'identity.json');
          const added = { id: input.id, name: input.name || account?.name || input.id, provider: input.provider,
            credentialFile: relative(dirname(this.file), credentialFile),
            ...(input.provider.startsWith('trae') ? { identityFile: relative(dirname(this.file), identityFile) } : {}) };
          if (replacing) raw.accounts[raw.accounts.indexOf(account)] = { ...account, ...added, enabled: true };
          else raw.accounts.push(added);
          validateConfig(raw, this.file);
          if (input.document !== undefined) {
            try { await importAccount({ provider: input.provider, credentialFile, identityFile, document: input.document, identityDocument: input.identityDocument }); }
            catch { bad('凭证格式无效：请检查必填字段、区域和 Trae 设备身份'); }
          } else if (input.provider.startsWith('qoder') && input.pat) {
            if (typeof input.pat !== 'string' || input.pat.length > 8192 || /\s/.test(input.pat.trim())) bad('PAT 格式无效');
            await writePrivateJson(credentialFile, { version: 2, pat: input.pat.trim(),
              region: input.provider === 'qoder' ? 'china' : 'global', savedAt: new Date().toISOString() });
          } else {
            const source = input.source;
            if (!source && (input.provider.startsWith('workbuddy') || input.provider.startsWith('trae'))) {
              const discovered = await discoverLocalAccounts(input.provider);
              const item = discovered.accounts.find(a => !input.edition || input.edition === 'auto' || a.document.credential.edition === input.edition);
              if (!item) bad(discovered.status.some(s => s.state === 'unreadable')
                ? '找到本机登录文件，但凭证或设备身份无法读取。请在官方客户端重新登录后重试，或手动导入凭证。'
                : '未找到所选区域的本机登录。请先在官方客户端登录，再点击重新检测。');
              try { await importAccount({ ...item, credentialFile, identityFile }); }
              catch { bad('本机凭证导入失败，请检查客户端登录状态与设备身份'); }
            } else {
              const file = source || (input.provider.startsWith('qoder') ? qoderOwnAuthPath(QODER_VARIANTS.find(v => v.id === input.provider)) : undefined);
              if (typeof file !== 'string' || !file.trim()) bad('未找到登录文件，请填写来源路径或 Qoder PAT');
              try { await importAccount({ provider: input.provider, source: resolve(file), credentialFile, identityFile,
                edition: input.edition, identitySource: input.identity ? resolve(input.identity) : undefined }); }
              catch { bad('账号导入失败，请检查登录文件、区域、Trae edition 和设备身份'); }
            }
          }
          const imported = await jsonCredential(credentialFile);
          const fingerprint = value => input.provider.startsWith('qoder') ? value.pat : value.credential?.uid || value.credential?.userId;
          for (const existing of input.capture || input.document !== undefined ? this.config.accounts.filter(a => a.provider === input.provider && a.id !== input.id) : []) {
            let value; try { value = await jsonCredential(existing.credentialFile); } catch { continue; }
            if (fingerprint(value) && fingerprint(value) === fingerprint(imported)) bad(`此登录账号已在账号池中：${existing.name || existing.id}，请切换客户端账号后再获取`);
          }
          if (!input.name && !replacing) added.name = imported.credential?.nickname || imported.credential?.accountName || input.id;
        } else if (input.action === 'account.update') {
          if (!account) bad('账号不存在');
          if (input.autoCheckin !== undefined) {
            if (typeof input.autoCheckin !== 'boolean' || !supportsCheckin(account.provider)) bad('此平台暂不支持自动签到');
            account.autoCheckin = input.autoCheckin;
          }
          if (input.name !== undefined) account.name = input.name;
          if (input.enabled !== undefined) account.enabled = input.enabled;
        } else if (input.action === 'accounts.enabled') {
          if ((input.provider !== undefined && !PROVIDERS.includes(input.provider)) || typeof input.enabled !== 'boolean') bad('供应商或路由参与开关无效');
          for (const a of raw.accounts.filter(a => !input.provider || a.provider === input.provider)) a.enabled = input.enabled;
        } else if (input.action === 'account.move') {
          if (!account || ![-1, 1].includes(input.direction)) bad('账号或顺序无效');
          const group = raw.accounts.filter(a => a.provider === account.provider), position = group.indexOf(account) + input.direction;
          if (position >= 0 && position < group.length) {
            const index = raw.accounts.indexOf(account), next = raw.accounts.indexOf(group[position]);
            [raw.accounts[index], raw.accounts[next]] = [raw.accounts[next], raw.accounts[index]];
          }
        } else if (input.action === 'account.remove') {
          if (!account) bad('账号不存在');
          if (Object.values(raw.routes).some(r => r.targets.some(t => t.account === input.id))) bad('请先移除路由中绑定此账号的目标');
          if (account.provider.startsWith('workbuddy') || account.provider.startsWith('trae')) {
            try { raw.ignoredLocalAccounts = [...new Set([...(raw.ignoredLocalAccounts ?? []), localAccountKey(account.provider, await jsonCredential(this.config.accounts.find(a => a.id === account.id).credentialFile))])]; } catch {}
          }
          raw.accounts = raw.accounts.filter(a => a.id !== input.id);
        } else if (input.action === 'models.visibility') {
          if ((input.provider !== undefined && !PROVIDERS.includes(input.provider)) || typeof input.visible !== 'boolean') bad('供应商或展示开关无效');
          raw.modelVisibility = { ...raw.modelVisibility }; raw.models = { ...raw.models };
          for (const provider of input.provider ? [input.provider] : PROVIDERS) {
            raw.modelVisibility[provider] = input.visible;
            raw.models[provider] = Object.fromEntries(Object.entries(raw.models[provider] ?? {}).map(([id, pref]) => [id, { ...pref, visible: input.visible }]));
          }
        } else if (input.action === 'model.update') {
          if (!PROVIDERS.includes(input.provider) || typeof input.id !== 'string' || !input.id || input.id.length > 256) bad('模型无效');
          const model = this.providerModels(input.provider).find(m => m.id === input.id);
          if (input.contextWindow != null && (!Number.isSafeInteger(input.contextWindow) || input.contextWindow <= 0 || !model || input.contextWindow > model.maxContextWindow)) bad('上下文预算不能超过该渠道模型的最大容量');
          if (input.supportsImages === true && !model?.imageCapable) bad('该模型未声明图片输入能力');
          if (input.reasoningEffort != null && !model?.reasoning?.supportedEfforts.includes(input.reasoningEffort)) bad('此模型不支持所选推理等级');
          raw.models = { ...raw.models, [input.provider]: { ...raw.models?.[input.provider],
            [input.id]: { ...raw.models?.[input.provider]?.[input.id],
              ...Object.fromEntries(['name', 'visible', 'contextWindow', 'supportsImages', 'reasoningEffort'].filter(k => input[k] !== undefined).map(k => [k, input[k]])) } } };
        } else if (input.action === 'free.model.update') {
          const parent = raw.routes[input.parentId];
          if (!parent?.freeOnly || !this.freeRoutes(input.parentId, this.config.routes[input.parentId]).some(m => m.id === input.id)) bad('免费模型已更新，请刷新页面');
          const model = this.freeRoutes(input.parentId, this.config.routes[input.parentId]).find(m => m.id === input.id);
          if (input.contextWindow != null && (!Number.isSafeInteger(input.contextWindow) || input.contextWindow <= 0 || input.contextWindow > model.maxContextWindow)) bad('上下文预算不能超过该免费模型的最大容量');
          if (input.reasoningEffort !== undefined && input.reasoningEffort !== null && !model.reasoning?.supportedEfforts.includes(input.reasoningEffort)) bad('此免费模型不支持所选推理等级');
          parent.freeModels = { ...parent.freeModels, [input.id]: { ...parent.freeModels?.[input.id],
            ...(input.visible !== undefined ? { visible: input.visible } : {}),
            ...(input.contextWindow !== undefined ? { contextWindow: input.contextWindow } : {}),
            ...(input.reasoningEffort !== undefined ? { reasoningEffort: input.reasoningEffort } : {}) } };
        } else if (input.action === 'route.save') {
          if (input.id === undefined || input.id === '') {
            input.id = input.previousId || `route_${randomBytes(8).toString('hex')}`;
          }
          if (!/^[a-zA-Z0-9_.-]{1,128}$/.test(input.id ?? '')) bad('路由 ID 仅支持字母、数字、点、下划线和短横线');
          if (input.previousId && !Object.hasOwn(raw.routes, input.previousId)) bad('原路由不存在，请刷新页面');
          if (input.previousId !== input.id && Object.hasOwn(raw.routes, input.id)) bad('路由 ID 已存在');
          raw.routes = { ...raw.routes, [input.id]: input.route };
          if (input.previousId && input.previousId !== input.id) delete raw.routes[input.previousId];
        } else if (input.action === 'route.force-expiring') {
          if (!Object.hasOwn(raw.routes, input.id)) bad('路由不存在');
          raw.routes[input.id].preferExpiringCredits = true;
          await this.telemetry.restartExpiring(input.id);
          const route = this.router.config.routes[input.id], strategy = route.strategy ?? 'failover';
          if (['tokens', 'credits'].includes(strategy)) await this.telemetry.advance(input.id, this.router.candidates(input.id), JSON.stringify({ strategy, targets: route.targets }));
        } else if (input.action === 'route.remove') {
          if (!Object.hasOwn(raw.routes, input.id)) bad('路由不存在');
          delete raw.routes[input.id];
        } else if (input.action === 'preset.add') {
          const id = input.id ?? 'deepseek-v4.1-flash';
          if (!Object.hasOwn(ROUTE_PRESETS, id)) bad('未知预配置路由');
          if (Object.hasOwn(raw.routes, id)) bad('预配置路由已存在，不覆盖已有设置');
          raw.routes[id] = structuredClone(ROUTE_PRESETS[id]);
        } else if (input.action === 'preset.add-all') {
          for (const [id, route] of Object.entries(ROUTE_PRESETS)) if (!Object.hasOwn(raw.routes, id)) raw.routes[id] = structuredClone(route);
        } else if (input.action === 'checkins.settings') {
          if (this.checkins.flight) bad('请等待当前签到完成后修改计划');
          if (!input.schedule) bad('请填写签到计划');
          raw.checkinSchedule = input.schedule;
        } else if (input.action === 'options.save') {
          for (const key of ['cooldownMs', 'requestTimeoutMs', 'retryServerErrors', 'usageRetentionDays', 'sidebarUsage']) if (input[key] !== undefined) raw[key] = input[key];
        } else bad('未知操作');
        let config;
        try { config = validateConfig(raw, this.file); } catch (error) { bad(error.message); }
        await writePrivateJson(this.file, raw);
        staging = undefined; // The new account's files now belong to the committed configuration.
        this.raw = raw; this.config = config;
        for (const id of this.catalogs.keys()) if (!config.accounts.some(a => a.id === id && a.credentialFile === this.catalogs.get(id).credentialFile)) { this.catalogs.delete(id); this.catalogErrors.delete(id); }
        await Promise.all(config.accounts.map(a => this.readLogin(a)));
        this.publish();
        await this.telemetry.persist();
      } finally { if (staging) await rm(staging, { recursive: true, force: true }); }
      return this.state();
    }, { waitMs: 30000 }).then(async state => {
      if (input.action === 'config.import') {
        void Promise.all([this.monitorAll(), ...PROVIDERS.map(p => this.ensureCatalog(p, true))]).catch(() => {});
      }
      if (input.action === 'preset.add' || input.action === 'preset.add-all') { await this.checkFreeModels(); return this.state(); }
      if (input.action === 'account.add' || input.action === 'account.credentials') {
        const account = this.config.accounts.find(a => a.id === input.id);
        if (input.action === 'account.credentials' && !this.checkins.failed) await this.checkins.credentialsUpdated(input.id);
        if (account) { await Promise.all([this.refreshAccount(account, true), this.monitorAccount(account)]); return this.state(); }
      }
      return state;
    });
  }
  watch(onError) {
    let timer;
    const watcher = watch(dirname(this.file), (_, filename) => {
      if (filename && String(filename) !== this.file.split(/[\\/]/).pop()) return;
      clearTimeout(timer);
      timer = setTimeout(() => { void withFileLock(this.file, async () => {
        const raw = JSON.parse(await readFile(this.file, 'utf8'));
        if (this.closed || revisionOf(raw) === this.revision) return;
        const config = validateConfig(raw, this.file); this.raw = raw; this.config = config; this.publish(); await this.telemetry.persist();
      }).catch(() => onError?.()); }, 150);
    });
    return () => { this.closed = true; clearTimeout(timer); watcher.close(); };
  }
}

export function managementHandler(manager, { summaryOnly = false } = {}) {
  const key = randomBytes(32).toString('base64url');
  const json = (res, status, value) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(JSON.stringify(value));
  };
  return async (req, res) => {
    manager.requests = (manager.requests ?? 0) + 1;
    try {
      const remote = req.socket?.remoteAddress;
      if (!hostIsLoopback(req.headers.host) || (remote && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote))) throw new ManagementError(403, '仅允许本机请求');
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) throw new ManagementError(403, '来源无效');
      if (req.headers['sec-fetch-site'] === 'cross-site') throw new ManagementError(403, '来源无效');
      if (req.method === 'GET') { json(res, 200, summaryOnly ? manager.summaryState() : { ...manager.state(), key }); return; }
      if (summaryOnly) throw new ManagementError(405, '方法无效');
      if (req.method !== 'POST') throw new ManagementError(405, '方法无效');
      const actual = Buffer.from(req.headers['x-multi-router-key'] ?? ''), expected = Buffer.from(key);
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new ManagementError(401, '请刷新配置页面');
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? '')) throw new ManagementError(415, '需要 JSON');
      let size = 0, chunks = [];
      for await (const chunk of req) { size += chunk.length; if (size > 1024 * 1024) throw new ManagementError(413, '请求过大'); chunks.push(chunk); }
      let input;
      try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new ManagementError(400, 'JSON 无效'); }
      json(res, 200, { ...await manager.action(input), key });
    } catch (error) {
      json(res, error instanceof ManagementError ? error.status : 500,
        { error: error instanceof ManagementError ? error.message : '操作失败，请检查配置和来源文件' });
    } finally { manager.requests--; }
  };
}
