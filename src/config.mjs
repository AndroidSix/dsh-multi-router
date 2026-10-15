import { readFile, mkdir, rename, writeFile, chmod } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { withFileLock } from '@deepseek-ai/dsh-atomic-write';
import { REASONING_EFFORTS } from './reasoning.mjs';

export const PROVIDERS = ['workbuddy', 'workbuddy-ai', 'trae', 'trae-global', 'qoder', 'qoder-global'];
export const PROVIDER_NAMES = { workbuddy: 'WorkBuddy', 'workbuddy-ai': 'WorkBuddy AI', trae: 'Trae CN',
  'trae-global': 'Trae Global', qoder: 'Qoder CN', 'qoder-global': 'Qoder Global' };
export const FLASH_PRESET = {
  name: 'DeepSeek V4.1 Flash · 自动路由', contextWindow: 200000, maxTokens: 32000, preferExpiringCredits: true, expiringWithinDays: 7,
  targets: ['workbuddy', 'trae', 'qoder'].map(provider => ({ provider, models: provider.startsWith('qoder')
    ? ['dfmodel'] : ['deepseek-v4.1-flash', 'DeepSeek-V4.1-Flash', 'DeepSeek-V4.1-Flash-Official'] })),
};
// IDs differ between providers; keep precise model/version bindings, never fuzzy-match variants.
const sharedPreset = (name, workbuddy, trae, qoder) => ({
  name: `${name} · 自动路由`, contextWindow: 200000, maxTokens: 32000, preferExpiringCredits: true, expiringWithinDays: 7,
  targets: [{ provider: 'workbuddy', models: [workbuddy] }, { provider: 'trae', models: Array.isArray(trae) ? trae : [trae] }, { provider: 'qoder', models: [qoder] }],
});
export const ROUTE_PRESETS = {
  free: { name: 'Free · 动态免费模型', freeOnly: true, visible: true, contextWindow: 200000, maxTokens: 32000,
    strategy: 'failover', preferExpiringCredits: false, targets: PROVIDERS.map(provider => ({ provider })) },
  'deepseek-v4.1-flash': FLASH_PRESET,
  'deepseek-v4-pro': sharedPreset('DeepSeek V4 Pro', 'deepseek-v4-pro', ['DeepSeek-V4-Pro-Official', 'DeepSeek-V4-Pro'], 'dmodel'),
  'glm-5.3': sharedPreset('GLM-5.3', 'glm-5.3', 'glm-5.3', 'gmodel'),
  'glm-5.3-flash': sharedPreset('GLM-5.3-Flash', 'glm-5.3-flash', 'glm-5.3-flash', 'gfmodel'),
  'kimi-k3': sharedPreset('Kimi-K3', 'kimi-k3-1', 'kimi-k3', 'kmodel_latest'),
  'kimi-k2.8-preview': sharedPreset('Kimi-K2.8-Preview', 'kimi-k2.8-preview', 'kimi-k2.8-preview', 'kmodel'),
  'minimax-m2.7': sharedPreset('MiniMax-M2.7', 'minimax-m2.7', 'minimax-m2.7', 'mmodel'),
};
export const DEFAULT_ROUTES = {
  free: ROUTE_PRESETS.free,
  'ds4.1f': {
    name: 'DeepSeek V4.1 Flash · Auto', contextWindow: 200000, maxTokens: 32000, preferExpiringCredits: true, expiringWithinDays: 7,
    targets: PROVIDERS.map(provider => ({ provider })),
  },
  ...ROUTE_PRESETS,
};
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const nonempty = x => typeof x === 'string' && x.trim().length > 0;
const positive = x => Number.isSafeInteger(x) && x > 0;
export const beijingDay = at => new Date(at).toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
export function isFreeModel(model, now = Date.now()) {
  if (model.billing?.rateUnknown === true) return false;
  // A badge or a zero adapter cost is not an account-scoped zero billing rate.
  const rate = model.creditMultiplier ?? (/^x?(\d+(?:\.\d+)?)(?:\s+credits?)?$/i.exec(model.billing?.credits?.trim() ?? '')?.[1]);
  if (rate === undefined || !Number.isFinite(Number(rate)) || Number(rate) !== 0) return false;
  if (model.promotions?.length && !model.promotions.some(p => now >= p.start && now < p.end)) return false;
  return true;
}
export function validateConfig(raw, file = resolve('router.json')) {
  if (!object(raw) || !Array.isArray(raw.accounts)) throw new Error('Config must contain an accounts array');
  const ids = new Set();
  const accounts = raw.accounts.map(account => {
    if (!object(account) || !/^[a-zA-Z0-9_-]{1,64}$/.test(account.id ?? '') || ids.has(account.id)) throw new Error('Account ids must be unique, 1–64 letters, digits, _ or -');
    ids.add(account.id);
    if (!PROVIDERS.includes(account.provider) || !nonempty(account.credentialFile)) throw new Error(`Invalid provider or credentialFile for ${account.id}`);
    if (account.enabled !== undefined && typeof account.enabled !== 'boolean') throw new Error(`Invalid enabled flag for ${account.id}`);
    if (account.autoCheckin !== undefined && (typeof account.autoCheckin !== 'boolean' || (account.autoCheckin && !['trae', 'qoder', 'qoder-global'].includes(account.provider)))) throw new Error(`Invalid autoCheckin for ${account.id}`);
    if (account.name !== undefined && (!nonempty(account.name) || account.name.length > 100)) throw new Error(`Invalid account name for ${account.id}`);
    if (account.identityFile !== undefined && !nonempty(account.identityFile)) throw new Error(`Invalid identityFile for ${account.id}`);
    return { ...account, credentialFile: resolve(dirname(file), account.credentialFile),
      ...(account.identityFile ? { identityFile: resolve(dirname(file), account.identityFile) } : {}) };
  });
  if (!object(raw.routes ?? DEFAULT_ROUTES)) throw new Error('Routes must be an object');
  const routes = Object.fromEntries(Object.entries(raw.routes ?? DEFAULT_ROUTES).map(([id, route]) => [id, { ...route, preferExpiringCredits: route?.preferExpiringCredits ?? !route?.freeOnly, expiringWithinDays: route?.expiringWithinDays ?? 7 }]));
  for (const [alias, route] of Object.entries(routes)) {
    if (!/^[a-zA-Z0-9_.-]{1,128}$/.test(alias) || !object(route) || !Array.isArray(route.targets) || !route.targets.length) throw new Error(`Invalid route ${alias}`);
    for (const key of ['contextWindow', 'maxTokens']) if (!positive(route[key])) throw new Error(`Route ${alias} needs a positive ${key}`);
    if (route.maxTokens > route.contextWindow) throw new Error(`Route ${alias}: maxTokens exceeds contextWindow`);
    if (route.supportsImages !== undefined && typeof route.supportsImages !== 'boolean') throw new Error(`Invalid supportsImages for ${alias}`);
    if (route.visible !== undefined && typeof route.visible !== 'boolean') throw new Error(`Invalid visibility for ${alias}`);
    if (route.name !== undefined && (!nonempty(route.name) || route.name.length > 200)) throw new Error(`Invalid route name for ${alias}`);
    if (route.freeOnly !== undefined && typeof route.freeOnly !== 'boolean') throw new Error(`Invalid freeOnly for ${alias}`);
    if (route.freeModels !== undefined && (!route.freeOnly || !object(route.freeModels) || Object.entries(route.freeModels).some(([id, p]) =>
      !/^free_[a-f0-9]{24}$/.test(id) || !object(p) || Object.keys(p).some(k => !['visible', 'reasoningEffort'].includes(k))
      || (p.visible !== undefined && typeof p.visible !== 'boolean')
      || (p.reasoningEffort !== undefined && p.reasoningEffort !== null && !REASONING_EFFORTS.includes(p.reasoningEffort))))) throw new Error('免费模型展示或推理等级设置无效');
    if (route.freeOnly && ((route.strategy && route.strategy !== 'failover') || route.preferExpiringCredits)) throw new Error('Free 路由仅使用免费模型故障切换，不使用积分或额度轮换');
    if (route.preferExpiringCredits !== undefined && typeof route.preferExpiringCredits !== 'boolean') throw new Error(`Invalid expiring credits flag in ${alias}`);
    if (route.expiringWithinDays !== undefined && (!positive(route.expiringWithinDays) || route.expiringWithinDays > 365)) throw new Error(`Invalid expiry horizon in ${alias}`);
    if (route.strategy !== undefined && !['failover', 'weighted', 'tokens', 'credits'].includes(route.strategy)) throw new Error(`Invalid strategy in ${alias}`);
    for (const target of route.targets) {
      if (!object(target)) throw new Error(`Invalid target in ${alias}`);
      if (target.weight !== undefined && (!positive(target.weight) || target.weight > 1000)) throw new Error(`Invalid target weight in ${alias}`);
      if (target.tokenBudget !== undefined && !positive(target.tokenBudget)) throw new Error(`Invalid token budget in ${alias}`);
      if (target.creditBudget !== undefined && (typeof target.creditBudget !== 'number' || !Number.isFinite(target.creditBudget) || target.creditBudget <= 0)) throw new Error(`Invalid credit budget in ${alias}`);
      if (route.strategy === 'tokens' && !positive(target.tokenBudget)) throw new Error(`Route ${alias} needs token budgets`);
      if (route.strategy === 'credits' && !(target.creditBudget > 0)) throw new Error(`Route ${alias} needs credit budgets`);
      if (!object(target) || !PROVIDERS.includes(target.provider) || (target.model !== undefined && !nonempty(target.model))) throw new Error(`Invalid target in ${alias}`);
      if (target.models !== undefined && (!Array.isArray(target.models) || !target.models.length || target.models.length > 20 || !target.models.every(nonempty))) throw new Error(`Invalid target models in ${alias}`);
      if (target.model !== undefined && target.models !== undefined) throw new Error(`Choose model or models in ${alias}`);
      if (target.account !== undefined && !accounts.some(a => a.id === target.account && a.provider === target.provider)) throw new Error(`Unknown target account in ${alias}`);
      if (!target.model && !target.models && alias !== 'ds4.1f' && !route.freeOnly) throw new Error(`Route ${alias} requires explicit target model ids`);
    }
  }
  const models = raw.models ?? {};
  if (!object(models)) throw new Error('Models must be an object');
  for (const [provider, preferences] of Object.entries(models)) {
    if (!PROVIDERS.includes(provider) || !object(preferences)) throw new Error('Invalid model provider');
    for (const [id, preference] of Object.entries(preferences)) {
      if (!nonempty(id) || id.length > 256 || !object(preference)
        || (preference.name !== undefined && (!nonempty(preference.name) || preference.name.length > 200))
        || (preference.visible !== undefined && typeof preference.visible !== 'boolean')) throw new Error('Invalid model preference');
    }
  }
  const modelVisibility = raw.modelVisibility ?? {};
  if (!object(modelVisibility) || Object.entries(modelVisibility).some(([provider, visible]) => !PROVIDERS.includes(provider) || typeof visible !== 'boolean')) throw new Error('Invalid modelVisibility');
  for (const key of ['cooldownMs', 'requestTimeoutMs', 'catalogTtlMs']) if (raw[key] !== undefined && !positive(raw[key])) throw new Error(`Invalid ${key}`);
  if (raw.retryServerErrors !== undefined && typeof raw.retryServerErrors !== 'boolean') throw new Error('Invalid retryServerErrors');
  if (raw.ignoredLocalAccounts !== undefined && (!Array.isArray(raw.ignoredLocalAccounts) || raw.ignoredLocalAccounts.some(k => typeof k !== 'string' || k.length > 1024))) throw new Error('Invalid ignoredLocalAccounts');
  if (raw.usageRetentionDays !== undefined && (!positive(raw.usageRetentionDays) || raw.usageRetentionDays > 365)) throw new Error('Token 明细保留天数必须为 1–365 的整数');
  return { ...raw, accounts, routes, models, modelVisibility, cooldownMs: raw.cooldownMs ?? 60000,
    requestTimeoutMs: raw.requestTimeoutMs ?? 300000, catalogTtlMs: raw.catalogTtlMs ?? 300000,
    retryServerErrors: raw.retryServerErrors ?? false, usageRetentionDays: raw.usageRetentionDays ?? 3 };
}
export async function readConfig(file) {
  return validateConfig(JSON.parse(await readFile(file, 'utf8')), resolve(file));
}
export async function ensureConfig(file) {
  try { return await readConfig(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  return withFileLock(file, async () => {
    try { return await readConfig(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await writePrivateJson(file, { accounts: [], routes: ROUTE_PRESETS });
    return readConfig(file);
  }, { waitMs: 30000 });
}
export async function writePrivateJson(file, value) {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  await rename(temp, file);
  await chmod(file, 0o600);
}
