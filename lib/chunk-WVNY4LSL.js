// src/reasoning.mjs
var REASONING_EFFORTS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];
function reasoningModes(model, provider) {
  const r = model?.reasoning;
  if (!r || r.supports !== true && !Array.isArray(r.supported)) return [];
  const declared = r.supportedEfforts ?? r.supported ?? [];
  const disable = r.canDisableThinking === true || declared.includes("off");
  const off = disable && !(provider === "workbuddy" && r.onlyReasoning === true);
  return REASONING_EFFORTS.filter((e) => e === "off" ? off : declared.includes(e));
}
function routeReasoning(models) {
  const efforts = REASONING_EFFORTS.filter((e) => models.some(({ model, provider }) => reasoningModes(model, provider).includes(e)));
  if (!efforts.length) return void 0;
  return {
    supports: true,
    supportedEfforts: efforts,
    canDisableThinking: efforts.includes("off"),
    defaultEffort: efforts.includes("high") ? "high" : efforts[0]
  };
}

// src/config.mjs
import { readFile, mkdir, rename, writeFile, chmod } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { withFileLock } from "@deepseek-ai/dsh-atomic-write";
var PROVIDERS = ["workbuddy", "workbuddy-ai", "trae", "trae-global", "qoder", "qoder-global"];
var PROVIDER_NAMES = {
  workbuddy: "WorkBuddy",
  "workbuddy-ai": "WorkBuddy AI",
  trae: "Trae CN",
  "trae-global": "Trae Global",
  qoder: "Qoder CN",
  "qoder-global": "Qoder Global"
};
var FLASH_PRESET = {
  name: "DeepSeek V4.1 Flash \xB7 \u81EA\u52A8\u8DEF\u7531",
  contextWindow: 2e5,
  maxTokens: 32e3,
  preferExpiringCredits: true,
  expiringWithinDays: 7,
  targets: ["workbuddy", "trae", "qoder"].map((provider) => ({ provider, models: provider.startsWith("qoder") ? ["dfmodel"] : ["deepseek-v4.1-flash", "DeepSeek-V4.1-Flash", "DeepSeek-V4.1-Flash-Official"] }))
};
var sharedPreset = (name, workbuddy, trae, qoder) => ({
  name: `${name} \xB7 \u81EA\u52A8\u8DEF\u7531`,
  contextWindow: 2e5,
  maxTokens: 32e3,
  preferExpiringCredits: true,
  expiringWithinDays: 7,
  targets: [{ provider: "workbuddy", models: [workbuddy] }, { provider: "trae", models: Array.isArray(trae) ? trae : [trae] }, { provider: "qoder", models: [qoder] }]
});
var ROUTE_PRESETS = {
  free: {
    name: "Free \xB7 \u52A8\u6001\u514D\u8D39\u6A21\u578B",
    freeOnly: true,
    visible: true,
    contextWindow: 2e5,
    maxTokens: 32e3,
    strategy: "failover",
    preferExpiringCredits: false,
    targets: PROVIDERS.map((provider) => ({ provider }))
  },
  "deepseek-v4.1-flash": FLASH_PRESET,
  "deepseek-v4-pro": sharedPreset("DeepSeek V4 Pro", "deepseek-v4-pro", ["DeepSeek-V4-Pro-Official", "DeepSeek-V4-Pro"], "dmodel"),
  "glm-5.3": sharedPreset("GLM-5.3", "glm-5.3", "glm-5.3", "gmodel"),
  "glm-5.3-flash": sharedPreset("GLM-5.3-Flash", "glm-5.3-flash", "glm-5.3-flash", "gfmodel"),
  "kimi-k3": sharedPreset("Kimi-K3", "kimi-k3-1", "kimi-k3", "kmodel_latest"),
  "kimi-k2.8-preview": sharedPreset("Kimi-K2.8-Preview", "kimi-k2.8-preview", "kimi-k2.8-preview", "kmodel"),
  "minimax-m2.7": sharedPreset("MiniMax-M2.7", "minimax-m2.7", "minimax-m2.7", "mmodel")
};
var DEFAULT_ROUTES = {
  free: ROUTE_PRESETS.free,
  "ds4.1f": {
    name: "DeepSeek V4.1 Flash \xB7 Auto",
    contextWindow: 2e5,
    maxTokens: 32e3,
    preferExpiringCredits: true,
    expiringWithinDays: 7,
    targets: PROVIDERS.map((provider) => ({ provider }))
  },
  ...ROUTE_PRESETS
};
var object = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
var nonempty = (x) => typeof x === "string" && x.trim().length > 0;
var positive = (x) => Number.isSafeInteger(x) && x > 0;
var beijingDay = (at) => new Date(at).toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
function isFreeModel(model, now = Date.now()) {
  if (model.billing?.rateUnknown === true) return false;
  const rate = model.creditMultiplier ?? /^x?(\d+(?:\.\d+)?)(?:\s+credits?)?$/i.exec(model.billing?.credits?.trim() ?? "")?.[1];
  if (rate === void 0 || !Number.isFinite(Number(rate)) || Number(rate) !== 0) return false;
  if (model.promotions?.length && !model.promotions.some((p) => now >= p.start && now < p.end)) return false;
  return true;
}
function validateConfig(raw, file = resolve("router.json")) {
  if (!object(raw) || !Array.isArray(raw.accounts)) throw new Error("Config must contain an accounts array");
  const ids = /* @__PURE__ */ new Set();
  const accounts = raw.accounts.map((account) => {
    if (!object(account) || !/^[a-zA-Z0-9_-]{1,64}$/.test(account.id ?? "") || ids.has(account.id)) throw new Error("Account ids must be unique, 1\u201364 letters, digits, _ or -");
    ids.add(account.id);
    if (!PROVIDERS.includes(account.provider) || !nonempty(account.credentialFile)) throw new Error(`Invalid provider or credentialFile for ${account.id}`);
    if (account.enabled !== void 0 && typeof account.enabled !== "boolean") throw new Error(`Invalid enabled flag for ${account.id}`);
    if (account.autoCheckin !== void 0 && (typeof account.autoCheckin !== "boolean" || account.autoCheckin && !["workbuddy", "trae", "qoder", "qoder-global"].includes(account.provider))) throw new Error(`Invalid autoCheckin for ${account.id}`);
    if (account.name !== void 0 && (!nonempty(account.name) || account.name.length > 100)) throw new Error(`Invalid account name for ${account.id}`);
    if (account.identityFile !== void 0 && !nonempty(account.identityFile)) throw new Error(`Invalid identityFile for ${account.id}`);
    return {
      ...account,
      credentialFile: resolve(dirname(file), account.credentialFile),
      ...account.identityFile ? { identityFile: resolve(dirname(file), account.identityFile) } : {}
    };
  });
  if (!object(raw.routes ?? DEFAULT_ROUTES)) throw new Error("Routes must be an object");
  const routes = Object.fromEntries(Object.entries(raw.routes ?? DEFAULT_ROUTES).map(([id, route]) => [id, { ...route, preferExpiringCredits: route?.preferExpiringCredits ?? !route?.freeOnly, expiringWithinDays: route?.expiringWithinDays ?? 7 }]));
  for (const [alias, route] of Object.entries(routes)) {
    if (!/^[a-zA-Z0-9_.-]{1,128}$/.test(alias) || !object(route) || !Array.isArray(route.targets) || !route.targets.length) throw new Error(`Invalid route ${alias}`);
    for (const key of ["contextWindow", "maxTokens"]) if (!positive(route[key])) throw new Error(`Route ${alias} needs a positive ${key}`);
    if (route.maxTokens > route.contextWindow) throw new Error(`Route ${alias}: maxTokens exceeds contextWindow`);
    if (route.supportsImages !== void 0 && typeof route.supportsImages !== "boolean") throw new Error(`Invalid supportsImages for ${alias}`);
    if (route.visible !== void 0 && typeof route.visible !== "boolean") throw new Error(`Invalid visibility for ${alias}`);
    if (route.name !== void 0 && (!nonempty(route.name) || route.name.length > 200)) throw new Error(`Invalid route name for ${alias}`);
    if (route.freeOnly !== void 0 && typeof route.freeOnly !== "boolean") throw new Error(`Invalid freeOnly for ${alias}`);
    if (route.freeModels !== void 0 && (!route.freeOnly || !object(route.freeModels) || Object.entries(route.freeModels).some(([id, p]) => !/^free_[a-f0-9]{24}$/.test(id) || !object(p) || Object.keys(p).some((k) => !["visible", "reasoningEffort"].includes(k)) || p.visible !== void 0 && typeof p.visible !== "boolean" || p.reasoningEffort !== void 0 && p.reasoningEffort !== null && !REASONING_EFFORTS.includes(p.reasoningEffort)))) throw new Error("\u514D\u8D39\u6A21\u578B\u5C55\u793A\u6216\u63A8\u7406\u7B49\u7EA7\u8BBE\u7F6E\u65E0\u6548");
    if (route.freeOnly && (route.strategy && route.strategy !== "failover" || route.preferExpiringCredits)) throw new Error("Free \u8DEF\u7531\u4EC5\u4F7F\u7528\u514D\u8D39\u6A21\u578B\u6545\u969C\u5207\u6362\uFF0C\u4E0D\u4F7F\u7528\u79EF\u5206\u6216\u989D\u5EA6\u8F6E\u6362");
    if (route.preferExpiringCredits !== void 0 && typeof route.preferExpiringCredits !== "boolean") throw new Error(`Invalid expiring credits flag in ${alias}`);
    if (route.expiringWithinDays !== void 0 && (!positive(route.expiringWithinDays) || route.expiringWithinDays > 365)) throw new Error(`Invalid expiry horizon in ${alias}`);
    if (route.strategy !== void 0 && !["failover", "weighted", "tokens", "credits"].includes(route.strategy)) throw new Error(`Invalid strategy in ${alias}`);
    for (const target of route.targets) {
      if (!object(target)) throw new Error(`Invalid target in ${alias}`);
      if (target.weight !== void 0 && (!positive(target.weight) || target.weight > 1e3)) throw new Error(`Invalid target weight in ${alias}`);
      if (target.tokenBudget !== void 0 && !positive(target.tokenBudget)) throw new Error(`Invalid token budget in ${alias}`);
      if (target.creditBudget !== void 0 && (typeof target.creditBudget !== "number" || !Number.isFinite(target.creditBudget) || target.creditBudget <= 0)) throw new Error(`Invalid credit budget in ${alias}`);
      if (route.strategy === "tokens" && !positive(target.tokenBudget)) throw new Error(`Route ${alias} needs token budgets`);
      if (route.strategy === "credits" && !(target.creditBudget > 0)) throw new Error(`Route ${alias} needs credit budgets`);
      if (!object(target) || !PROVIDERS.includes(target.provider) || target.model !== void 0 && !nonempty(target.model)) throw new Error(`Invalid target in ${alias}`);
      if (target.models !== void 0 && (!Array.isArray(target.models) || !target.models.length || target.models.length > 20 || !target.models.every(nonempty))) throw new Error(`Invalid target models in ${alias}`);
      if (target.model !== void 0 && target.models !== void 0) throw new Error(`Choose model or models in ${alias}`);
      if (target.account !== void 0 && !accounts.some((a) => a.id === target.account && a.provider === target.provider)) throw new Error(`Unknown target account in ${alias}`);
      if (!target.model && !target.models && alias !== "ds4.1f" && !route.freeOnly) throw new Error(`Route ${alias} requires explicit target model ids`);
    }
  }
  const models = raw.models ?? {};
  if (!object(models)) throw new Error("Models must be an object");
  for (const [provider, preferences] of Object.entries(models)) {
    if (!PROVIDERS.includes(provider) || !object(preferences)) throw new Error("Invalid model provider");
    for (const [id, preference] of Object.entries(preferences)) {
      if (!nonempty(id) || id.length > 256 || !object(preference) || preference.name !== void 0 && (!nonempty(preference.name) || preference.name.length > 200) || preference.visible !== void 0 && typeof preference.visible !== "boolean") throw new Error("Invalid model preference");
    }
  }
  const modelVisibility = raw.modelVisibility ?? {};
  if (!object(modelVisibility) || Object.entries(modelVisibility).some(([provider, visible]) => !PROVIDERS.includes(provider) || typeof visible !== "boolean")) throw new Error("Invalid modelVisibility");
  for (const key of ["cooldownMs", "requestTimeoutMs", "catalogTtlMs"]) if (raw[key] !== void 0 && !positive(raw[key])) throw new Error(`Invalid ${key}`);
  if (raw.retryServerErrors !== void 0 && typeof raw.retryServerErrors !== "boolean") throw new Error("Invalid retryServerErrors");
  if (raw.sidebarUsage !== void 0 && typeof raw.sidebarUsage !== "boolean") throw new Error("\u4FA7\u680F\u7528\u91CF\u5F00\u5173\u5FC5\u987B\u662F\u5E03\u5C14\u503C");
  if (raw.ignoredLocalAccounts !== void 0 && (!Array.isArray(raw.ignoredLocalAccounts) || raw.ignoredLocalAccounts.some((k) => typeof k !== "string" || k.length > 1024))) throw new Error("Invalid ignoredLocalAccounts");
  if (raw.usageRetentionDays !== void 0 && (!positive(raw.usageRetentionDays) || raw.usageRetentionDays > 365)) throw new Error("Token \u660E\u7EC6\u4FDD\u7559\u5929\u6570\u5FC5\u987B\u4E3A 1\u2013365 \u7684\u6574\u6570");
  const checkinSchedule = raw.checkinSchedule ?? { mode: "scheduled", time: "10:05" };
  if (!object(checkinSchedule) || !["startup", "scheduled"].includes(checkinSchedule.mode) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(checkinSchedule.time ?? "") || Object.keys(checkinSchedule).some((k) => !["mode", "time"].includes(k))) throw new Error("\u7B7E\u5230\u8BA1\u5212\u5FC5\u987B\u9009\u62E9\u542F\u52A8\u6216\u5B9A\u65F6\uFF0C\u5E76\u586B\u5199\u6709\u6548\u7684\u5317\u4EAC\u65F6\u95F4\uFF08HH:mm\uFF09");
  return {
    ...raw,
    accounts,
    routes,
    models,
    modelVisibility,
    cooldownMs: raw.cooldownMs ?? 6e4,
    checkinSchedule: { ...checkinSchedule },
    sidebarUsage: raw.sidebarUsage ?? true,
    requestTimeoutMs: raw.requestTimeoutMs ?? 3e5,
    catalogTtlMs: raw.catalogTtlMs ?? 3e5,
    retryServerErrors: raw.retryServerErrors ?? false,
    usageRetentionDays: raw.usageRetentionDays ?? 30
  };
}
async function readConfig(file) {
  return validateConfig(JSON.parse(await readFile(file, "utf8")), resolve(file));
}
async function ensureConfig(file) {
  try {
    return await readConfig(file);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await mkdir(dirname(file), { recursive: true, mode: 448 });
  return withFileLock(file, async () => {
    try {
      return await readConfig(file);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await writePrivateJson(file, { accounts: [], routes: ROUTE_PRESETS });
    return readConfig(file);
  }, { waitMs: 3e4 });
}
async function writePrivateJson(file, value) {
  await mkdir(dirname(file), { recursive: true, mode: 448 });
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}
`, { mode: 384, flag: "wx" });
  await rename(temp, file);
  await chmod(file, 384);
}

export {
  REASONING_EFFORTS,
  reasoningModes,
  routeReasoning,
  PROVIDERS,
  PROVIDER_NAMES,
  ROUTE_PRESETS,
  DEFAULT_ROUTES,
  beijingDay,
  isFreeModel,
  validateConfig,
  ensureConfig,
  writePrivateJson
};
//# sourceMappingURL=chunk-WVNY4LSL.js.map
