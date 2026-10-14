import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, mkdir, mkdtemp, rm, access } from 'node:fs/promises';
import { watch } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { withFileLock } from '@deepseek-ai/dsh-atomic-write';
import { PROVIDERS, PROVIDER_NAMES, ROUTE_PRESETS, validateConfig, writePrivateJson, isFreeModel, beijingDay } from './config.mjs';
import { modelWithCurrentPromotion } from '../upstream/workbuddy/src/upstream.ts';
import { importAccount, readPortableCredential } from './accounts.mjs';
import { defaultDesktopAuthPath } from '../upstream/workbuddy/src/auth.ts';
import { WORKBUDDY_VARIANTS } from '../upstream/workbuddy/src/variants.ts';
import { traeStorageCandidates } from '../upstream/trae/src/paths.ts';
import { hostIsLoopback } from '../upstream/workbuddy/src/loopback.ts';
import { Telemetry } from './telemetry.mjs';
import { jsonCredential } from './clients.mjs';
import { QODER_VARIANTS } from '../upstream/qoder/src/variants.ts';
import { qoderOwnAuthPath } from '../upstream/qoder/src/auth.ts';
import { matchModel } from './router.mjs';
import { routeReasoning, reasoningModes } from './reasoning.mjs';
import { exportConfiguration, decodeConfiguration, migrationSummary, prepareMigration } from './migration.mjs';

export const MANAGEMENT_PATH = '/.well-known/dsh-multi-router';
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
  return { id: row.id, name: row.name || row.id, contextWindow: finite(row.contextWindow, 200000),
    maxTokens: Math.min(finite(row.maxTokens, 32000), finite(row.contextWindow, 200000)),
    supportsImages: row.supportsImages === true || row.multimodal === true || row.input?.includes('image') === true,
    ...(reasoning ? { reasoning } : {}), ...(billing ? { billing } : {}),
    ...(typeof row.creditMultiplier === 'number' && Number.isFinite(row.creditMultiplier) && row.creditMultiplier >= 0 ? { creditMultiplier: row.creditMultiplier } : {}),
    ...(Array.isArray(row.promotions) ? { promotions: row.promotions.map(p => ({ start: p.start, end: p.end, factor: p.factor, priority: p.priority, label: typeof p.label === 'string' ? p.label : '' })) } : {}) };
}

export class Manager {
  constructor(file, router, onChange = () => {}) {
    this.file = file; this.router = router; this.onChange = onChange;
    this.catalogFile = join(dirname(file), 'catalogs.json');
    this.catalogs = new Map(); this.catalogErrors = new Map(); this.refreshes = new Map();
    this.closed = false; this.monitorFlights = new Map(); this.loginInfo = new Map();
    this.telemetry = new Telemetry(join(dirname(file), 'usage.json'));
    router.telemetry = this.telemetry; router.monitor = a => this.monitorAccount(a);
    router.prepareFree = () => this.checkFreeModels(true);
    router.freeModels = account => this.freeModels(account);

  }
  async load() {
    this.raw = JSON.parse(await readFile(this.file, 'utf8'));
    this.config = validateConfig(this.raw, this.file);
    try {
      const saved = JSON.parse(await readFile(this.catalogFile, 'utf8'));
      for (const account of this.config.accounts) {
        const item = saved[account.id];
        if (item?.credentialFile === account.credentialFile && Array.isArray(item.models)) {
          this.catalogs.set(account.id, { ...item, models: item.models.filter(m => typeof m.id === 'string' && m.id.length > 0).map(modelInfo) });
        }
      }
    } catch { /* No saved directory yet; never invent a provider's model roster. */ }
    this.telemetry.configure(this.config.usageRetentionDays);
    await this.telemetry.load();
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
  async monitorAccount(account) {
    if (this.monitorFlights.has(account.id)) return this.monitorFlights.get(account.id);
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
  async monitorAll(provider) { await Promise.all(this.config.accounts.filter(a => !provider || a.provider === provider).map(a => this.monitorAccount(a))); }
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
        group.models.push({ model, provider: account.provider });
        group.targets.push({ provider: account.provider, account: account.id, model: model.id });
        group.accountNames.push(account.name ?? account.id);
      }
    }
    return [...groups.values()].map(({ models, ...group }) => {
      const preference = row.freeModels?.[group.id] ?? {}, reasoning = routeReasoning(models);
      const selected = preference.reasoningEffort;
      return { ...group, parentId, dynamicFree: true, freeOnly: true, strategy: 'failover', preferExpiringCredits: false,
        name: `Free · ${group.modelName} · ${PROVIDER_NAMES[group.provider]}`, reasoning,
        ...(selected && reasoning?.supportedEfforts.includes(selected) ? { reasoningEffort: selected } : {}),
        configuredEffort: selected ?? null, effortUnavailable: !!selected && !reasoning?.supportedEfforts.includes(selected),
        visible: row.visible !== false && preference.visible !== false, selected: preference.visible !== false,
        supportsImages: models.every(({ model }) => model.supportsImages),
        contextWindow: Math.min(row.contextWindow, ...models.map(({ model }) => model.contextWindow)),
        maxTokens: Math.min(row.maxTokens, ...models.map(({ model }) => model.maxTokens), ...models.map(({ model }) => model.contextWindow)) };
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
    const routes = { ...this.config.routes };
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
        const old = rows.get(model.id);
        // Advertise budgets every candidate account can honour.
        rows.set(model.id, old ? { ...old, contextWindow: Math.min(old.contextWindow, model.contextWindow),
          maxTokens: Math.min(old.maxTokens, model.maxTokens), supportsImages: old.supportsImages && model.supportsImages,
          reasoning: routeReasoning([{ model: old, provider }, { model, provider }]) } : { ...model,
            ...(reasoningModes(model, provider).length ? { reasoning: routeReasoning([{ model, provider }]) } : {}) });
      }
    }
    return [...rows.values()].map(model => ({ ...model,
      name: this.config.models[provider]?.[model.id]?.name ?? model.name }));
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
          return models.map(model => ({ model, provider: a.provider }));
        }));
      const models = sources.map(s => s.model), reasoning = routeReasoning(sources);
      return { ...row, supportsImages: models.length > 0 && models.every(m => m.supportsImages), reasoning,
        ...(row.freeOnly && models.length ? { contextWindow: Math.min(row.contextWindow, ...models.map(m => m.contextWindow)), maxTokens: Math.min(row.maxTokens, ...models.map(m => m.maxTokens), ...models.map(m => m.contextWindow)) } : {}),
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
        this.catalogs.set(account.id, { credentialFile: account.credentialFile, fetchedAt: Date.now(), pricingVersion: 1, models });
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
  state() {
    const status = this.router.status();
    return { revision: this.revision,
      telemetry: this.telemetry.state(),
      accounts: this.config.accounts.map(a => ({ id: a.id, provider: a.provider, name: a.name ?? a.id,
        enabled: a.enabled !== false, status: status.find(s => s.id === a.id),
        login: this.loginInfo.get(a.id), usage: this.telemetry.row('accounts', a.id),
        modelCount: this.catalogs.get(a.id)?.models.length ?? 0,
        fetchedAt: this.catalogs.get(a.id)?.fetchedAt, error: this.catalogErrors.get(a.id) })),
      providers: PROVIDERS.map(id => ({ id, name: PROVIDER_NAMES[id], models: this.providerModels(id).map(m => ({ ...m,
        visible: this.modelVisible(id, m.id) })) })),
      presets: Object.entries(ROUTE_PRESETS).map(([id, route]) => ({ id, ...structuredClone(route), added: Object.hasOwn(this.config.routes, id),
        availableProviders: [...new Set(route.targets.filter(t => route.freeOnly
          ? this.config.accounts.some(a => a.enabled !== false && a.provider === t.provider && this.freeModels(a).length)
          : matchModel(id, t, this.providerModels(t.provider))).map(t => t.provider))] })),
      routes: this.routeModels(), options: { cooldownMs: this.config.cooldownMs, requestTimeoutMs: this.config.requestTimeoutMs,
        retryServerErrors: this.config.retryServerErrors, usageRetentionDays: this.config.usageRetentionDays } };
  }
  async action(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) bad('请求格式无效');
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
      if (input.action === 'account.refresh') { const account = this.config.accounts.find(a => a.id === input.id); if (!account) bad('账号不存在'); this.router.clients.delete(account.id); await this.monitorAccount(account); }
      else await this.monitorAll(input.provider);
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
            let source = input.source;
            if (!source && input.provider.startsWith('qoder')) source = qoderOwnAuthPath(QODER_VARIANTS.find(v => v.id === input.provider));
            if (!source && input.provider.startsWith('workbuddy')) source = defaultDesktopAuthPath(WORKBUDDY_VARIANTS.find(v => v.id === input.provider));
            if (!source && input.provider.startsWith('trae')) {
              for (const candidate of traeStorageCandidates().filter(c => c.source === 'desktop' && c.edition === input.edition)) {
                try { await access(candidate.path); source = candidate.path; break; } catch { /* Try the next official install location. */ }
              }
            }
            if (typeof source !== 'string' || !source.trim()) bad('未找到登录文件，请填写来源路径或 Qoder PAT');
            try { await importAccount({ provider: input.provider, source: resolve(source), credentialFile, identityFile,
              edition: input.edition, identitySource: input.identity ? resolve(input.identity) : undefined }); }
            catch { bad('账号导入失败，请检查登录文件、区域、Trae edition 和设备身份'); }
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
          if (input.name !== undefined) account.name = input.name;
          if (input.enabled !== undefined) account.enabled = input.enabled;
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
          raw.models = { ...raw.models, [input.provider]: { ...raw.models?.[input.provider],
            [input.id]: { ...raw.models?.[input.provider]?.[input.id],
              ...(input.name !== undefined ? { name: input.name } : {}), ...(input.visible !== undefined ? { visible: input.visible } : {}) } } };
        } else if (input.action === 'free.model.update') {
          const parent = raw.routes[input.parentId];
          if (!parent?.freeOnly || !this.freeRoutes(input.parentId, this.config.routes[input.parentId]).some(m => m.id === input.id)) bad('免费模型已更新，请刷新页面');
          const model = this.freeRoutes(input.parentId, this.config.routes[input.parentId]).find(m => m.id === input.id);
          if (input.reasoningEffort !== undefined && input.reasoningEffort !== null && !model.reasoning?.supportedEfforts.includes(input.reasoningEffort)) bad('此免费模型不支持所选推理等级');
          parent.freeModels = { ...parent.freeModels, [input.id]: { ...parent.freeModels?.[input.id],
            ...(input.visible !== undefined ? { visible: input.visible } : {}),
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
        } else if (input.action === 'options.save') {
          for (const key of ['cooldownMs', 'requestTimeoutMs', 'retryServerErrors', 'usageRetentionDays']) if (input[key] !== undefined) raw[key] = input[key];
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

export function managementHandler(manager) {
  const key = randomBytes(32).toString('base64url');
  const json = (res, status, value) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(JSON.stringify(value));
  };
  return async (req, res) => {
    try {
      const remote = req.socket?.remoteAddress;
      if (!hostIsLoopback(req.headers.host) || (remote && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote))) throw new ManagementError(403, '仅允许本机请求');
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) throw new ManagementError(403, '来源无效');
      if (req.headers['sec-fetch-site'] === 'cross-site') throw new ManagementError(403, '来源无效');
      if (req.method === 'GET') { json(res, 200, { ...manager.state(), key }); return; }
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
    }
  };
}
