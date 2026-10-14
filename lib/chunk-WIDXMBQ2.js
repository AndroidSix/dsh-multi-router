import {
  jsonCredential,
  qoderPluginDataDir
} from "./chunk-UFS7ZJKY.js";
import {
  discoverLocalAccounts,
  importAccount,
  localAccountKey,
  readPortableCredential
} from "./chunk-3VGKH7MF.js";
import {
  hostIsLoopback
} from "./chunk-DNQPZMPF.js";
import {
  Telemetry,
  matchModel
} from "./chunk-GGRCX2NR.js";
import {
  PROVIDERS,
  PROVIDER_NAMES,
  ROUTE_PRESETS,
  beijingDay,
  isFreeModel,
  reasoningModes,
  routeReasoning,
  validateConfig,
  writePrivateJson
} from "./chunk-XMXFIV5G.js";
import {
  modelWithCurrentPromotion
} from "./chunk-TEZ2FMEO.js";

// src/manager.mjs
import { createHash, randomBytes as randomBytes2, timingSafeEqual } from "node:crypto";

// package.json
var version = "0.3.8";

// src/manager.mjs
import { readFile, mkdir as mkdir2, mkdtemp as mkdtemp2, rm as rm2 } from "node:fs/promises";
import { watch } from "node:fs";
import { dirname as dirname3, join as join3, relative as relative2, resolve } from "node:path";
import { withFileLock } from "@deepseek-ai/dsh-atomic-write";

// upstream/qoder/src/status-paths.ts
var QODER_STATUS_PATH = "/plugins/dsh-qoder-connect/status";
var QODER_PROBE_PATH = "/plugins/dsh-qoder-connect/probe";
var QODER_AUTH_PATH = "/plugins/dsh-qoder-connect/auth";
var QODER_GLOBAL_STATUS_PATH = "/plugins/dsh-qoder-connect/global/status";
var QODER_GLOBAL_PROBE_PATH = "/plugins/dsh-qoder-connect/global/probe";
var QODER_GLOBAL_AUTH_PATH = "/plugins/dsh-qoder-connect/global/auth";

// upstream/qoder/src/variants.ts
var QODER_VARIANTS = [
  {
    id: "qoder",
    displayName: "Qoder",
    appName: "Qoder",
    region: "china",
    ownFilename: ".qoder-auth.json",
    probeFilename: ".qoder-probe.json",
    catalogFilename: ".qoder-catalog.json",
    statusPath: QODER_STATUS_PATH,
    probePath: QODER_PROBE_PATH,
    authPath: QODER_AUTH_PATH
  },
  {
    id: "qoder-global",
    displayName: "Qoder Global",
    appName: "Qoder Global",
    region: "global",
    ownFilename: ".qoder-global-auth.json",
    probeFilename: ".qoder-global-probe.json",
    catalogFilename: ".qoder-global-catalog.json",
    statusPath: QODER_GLOBAL_STATUS_PATH,
    probePath: QODER_GLOBAL_PROBE_PATH,
    authPath: QODER_GLOBAL_AUTH_PATH
  }
];
var CHINA_VARIANT = QODER_VARIANTS[0];
var GLOBAL_VARIANT = QODER_VARIANTS[1];

// upstream/qoder/src/auth.ts
import { dirname, join } from "node:path";
import { writeFileAtomic } from "@deepseek-ai/dsh-atomic-write";
function qoderOwnAuthPath(variant) {
  return join(qoderPluginDataDir(), variant.ownFilename);
}

// src/migration.mjs
import { randomBytes, scrypt, createCipheriv, createDecipheriv } from "node:crypto";
import { promisify } from "node:util";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { dirname as dirname2, join as join2, relative } from "node:path";
var derive = promisify(scrypt);
var FORMAT = "dsh-multi-router";
var MAX_BYTES = 512 * 1024;
var pick = (value, keys) => Object.fromEntries(keys.filter((k) => Object.hasOwn(value ?? {}, k)).map((k) => [k, value[k]]));
var options = ["cooldownMs", "requestTimeoutMs", "catalogTtlMs", "retryServerErrors", "modelVisibility", "usageRetentionDays"];
function settings(config) {
  return {
    ...pick(config, options),
    models: Object.fromEntries(Object.entries(config.models ?? {}).map(([p, rows]) => [p, Object.fromEntries(Object.entries(rows).map(([id, pref]) => [id, pick(pref, ["name", "visible"])]))])),
    accounts: config.accounts.map((a) => pick(a, ["id", "provider", "name", "enabled"])),
    routes: Object.fromEntries(Object.entries(config.routes).map(([id, r]) => [id, {
      ...pick(r, ["name", "visible", "strategy", "contextWindow", "maxTokens", "preferExpiringCredits", "expiringWithinDays", "freeOnly", "freeModels"]),
      targets: r.targets.map((t) => pick(t, ["provider", "account", "model", "models", "weight", "tokenBudget", "creditBudget"]))
    }]))
  };
}
var problem = (message) => {
  throw Error(message);
};
function password(value, exporting = false) {
  if (typeof value !== "string" || value.length > 1024 || value.length < (exporting ? 10 : 1)) problem(exporting ? "\u8FC1\u79FB\u5BC6\u7801\u81F3\u5C11 10 \u4E2A\u5B57\u7B26" : "\u8BF7\u8F93\u5165\u8FC1\u79FB\u5BC6\u7801");
}
async function exportConfiguration(manager, input) {
  const payload = { format: FORMAT, version: 1, encrypted: false, createdAt: (/* @__PURE__ */ new Date()).toISOString(), config: settings(manager.config) };
  if (!input.includeCredentials) return payload;
  password(input.password, true);
  payload.credentials = {};
  for (const account of manager.config.accounts) {
    try {
      const credential = await readPortableCredential(account);
      if (credential) Object.defineProperty(payload.credentials, account.id, { value: credential, enumerable: true });
    } catch {
      problem(`\u8D26\u53F7 ${account.id} \u7684\u51ED\u8BC1\u4E0D\u53EF\u8BFB\uFF0C\u8BF7\u4FEE\u590D\u540E\u5BFC\u51FA\u6216\u9009\u62E9\u4EC5\u914D\u7F6E`);
    }
  }
  const salt = randomBytes(16), iv = randomBytes(12), key = await derive(input.password, salt, 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const bytes = Buffer.from(JSON.stringify(payload));
  if (bytes.length > MAX_BYTES) problem("\u914D\u7F6E\u8FC7\u5927\uFF0C\u65E0\u6CD5\u5BFC\u51FA");
  const data = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return {
    format: FORMAT,
    version: 1,
    encrypted: true,
    cipher: "aes-256-gcm",
    kdf: "scrypt",
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64")
  };
}
async function decodeConfiguration(input) {
  let payload;
  try {
    if (typeof input.document !== "string" || Buffer.byteLength(input.document) > 900 * 1024) problem("\u8FC1\u79FB\u6587\u4EF6\u8FC7\u5927");
    payload = JSON.parse(input.document);
  } catch {
    problem("\u8BF7\u9009\u62E9\u6709\u6548\u7684\u63D2\u4EF6\u8FC1\u79FB JSON \u6587\u4EF6\uFF08\u5C0F\u4E8E 900 KB\uFF09");
  }
  if (payload?.format !== FORMAT || payload.version !== 1) problem("\u4E0D\u662F\u53D7\u652F\u6301\u7684\u63D2\u4EF6\u8FC1\u79FB\u6587\u4EF6");
  const encrypted = payload.encrypted === true;
  if (encrypted) {
    password(input.password);
    try {
      if (payload.cipher !== "aes-256-gcm" || payload.kdf !== "scrypt") throw Error();
      const salt = Buffer.from(payload.salt, "base64"), iv = Buffer.from(payload.iv, "base64"), tag = Buffer.from(payload.tag, "base64"), data = Buffer.from(payload.data, "base64");
      if (salt.length !== 16 || iv.length !== 12 || tag.length !== 16 || data.length > MAX_BYTES) throw Error();
      const decipher = createDecipheriv("aes-256-gcm", await derive(input.password, salt, 32), iv);
      decipher.setAuthTag(tag);
      payload = JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8"));
    } catch {
      problem("\u5BC6\u7801\u9519\u8BEF\u6216\u8FC1\u79FB\u6587\u4EF6\u5DF2\u635F\u574F");
    }
  }
  if (payload?.format !== FORMAT || payload.version !== 1 || !Array.isArray(payload.config?.accounts) || payload.config.accounts.length > 200 || !payload.config.routes || typeof payload.config.routes !== "object" || Object.keys(payload.config.routes).length > 500) problem("\u8FC1\u79FB\u914D\u7F6E\u683C\u5F0F\u65E0\u6548");
  if (payload.credentials && !encrypted) problem("\u542B\u51ED\u8BC1\u7684\u8FC1\u79FB\u6587\u4EF6\u5FC5\u987B\u52A0\u5BC6");
  if (payload.credentials && (typeof payload.credentials !== "object" || Array.isArray(payload.credentials))) problem("\u8FC1\u79FB\u51ED\u8BC1\u683C\u5F0F\u65E0\u6548");
  const config = settings(payload.config);
  validateConfig({ ...config, accounts: config.accounts.map((a) => ({ ...a, credentialFile: "placeholder.json" })) });
  if (payload.credentials && Object.keys(payload.credentials).some((id) => !config.accounts.some((a) => a.id === id))) problem("\u8FC1\u79FB\u51ED\u8BC1\u5B58\u5728\u672A\u77E5\u8D26\u53F7");
  return { config, credentials: payload.credentials ?? {}, encrypted };
}
function migrationSummary(manager, portable, mode) {
  if (!["merge", "replace"].includes(mode)) problem("\u8BF7\u9009\u62E9\u5408\u5E76\u6216\u66FF\u6362");
  for (const a of portable.config.accounts) {
    const old = manager.config.accounts.find((b) => b.id === a.id);
    if (mode === "merge" && old && old.provider !== a.provider) problem(`\u8D26\u53F7 ${a.id} \u7684\u4F9B\u5E94\u5546\u51B2\u7A81\uFF0C\u8BF7\u6539\u7528\u66FF\u6362\u6216\u4FEE\u6539\u5BFC\u5165\u6587\u4EF6`);
  }
  const existing = (id) => mode === "merge" && manager.config.accounts.some((a) => a.id === id);
  return {
    mode,
    accounts: portable.config.accounts.length,
    newAccounts: portable.config.accounts.filter((a) => !existing(a.id)).length,
    credentials: Object.keys(portable.credentials).length,
    needsLogin: portable.config.accounts.filter((a) => !Object.hasOwn(portable.credentials, a.id) && !existing(a.id)).length,
    routes: Object.keys(portable.config.routes).length,
    overwrittenRoutes: Object.keys(portable.config.routes).filter((id) => Object.hasOwn(manager.config.routes, id)).length
  };
}
async function prepareMigration(manager, raw, portable, mode) {
  migrationSummary(manager, portable, mode);
  const base = join2(dirname2(manager.file), "accounts");
  await mkdir(base, { recursive: true, mode: 448 });
  const staging = await mkdtemp(join2(base, "migration-"));
  try {
    const imported = [];
    for (const a of portable.config.accounts) {
      const old = mode === "merge" && raw.accounts.find((b) => b.id === a.id), secret = Object.hasOwn(portable.credentials, a.id) ? portable.credentials[a.id] : void 0;
      if (!secret && old) {
        imported.push({ ...old, ...a });
        continue;
      }
      const credentialFile = join2(staging, a.id, "credential.json"), identityFile = join2(staging, a.id, "identity.json");
      if (secret) await importAccount({ provider: a.provider, credentialFile, identityFile, document: secret.document, identityDocument: secret.identity });
      else {
        await writePrivateJson(credentialFile, {});
        if (a.provider.startsWith("trae")) await writePrivateJson(identityFile, {});
      }
      imported.push({
        ...a,
        ...!secret ? { enabled: false } : {},
        credentialFile: relative(dirname2(manager.file), credentialFile),
        ...a.provider.startsWith("trae") ? { identityFile: relative(dirname2(manager.file), identityFile) } : {}
      });
    }
    const next = mode === "replace" ? { ...portable.config, accounts: imported } : {
      ...raw,
      ...pick(portable.config, options),
      accounts: [...raw.accounts.map((a) => imported.find((b) => b.id === a.id) ?? a), ...imported.filter((a) => !raw.accounts.some((b) => b.id === a.id))],
      routes: { ...raw.routes, ...portable.config.routes },
      models: Object.fromEntries([.../* @__PURE__ */ new Set([...Object.keys(raw.models ?? {}), ...Object.keys(portable.config.models)])].map((p) => [p, { ...raw.models?.[p], ...portable.config.models[p] }]))
    };
    validateConfig(next, manager.file);
    return { raw: next, staging };
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

// src/manager.mjs
var MANAGEMENT_PATH = "/.well-known/dsh-multi-router";
var revisionOf = (raw) => createHash("sha256").update(JSON.stringify(raw)).digest("hex");
var ManagementError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
var bad = (message) => {
  throw new ManagementError(400, message);
};
var finite = (value, fallback) => Number.isSafeInteger(value) && value > 0 ? value : fallback;
function modelInfo(row) {
  const billing = row.billing ? {
    free: row.billing.free === true,
    rateUnknown: row.billing.rateUnknown === true,
    ...typeof row.billing.credits === "string" ? { credits: row.billing.credits } : {}
  } : void 0;
  const reasoning = row.reasoning?.supported ? {
    supports: true,
    supportedEfforts: row.reasoning.supported,
    defaultEffort: row.reasoning.defaultEffort,
    canDisableThinking: row.reasoning.supported.includes("off")
  } : row.reasoning;
  return {
    id: row.id,
    name: row.name || row.id,
    contextWindow: finite(row.contextWindow, 2e5),
    maxTokens: Math.min(finite(row.maxTokens, 32e3), finite(row.contextWindow, 2e5)),
    supportsImages: row.supportsImages === true || row.multimodal === true || row.input?.includes("image") === true,
    ...reasoning ? { reasoning } : {},
    ...billing ? { billing } : {},
    ...typeof row.creditMultiplier === "number" && Number.isFinite(row.creditMultiplier) && row.creditMultiplier >= 0 ? { creditMultiplier: row.creditMultiplier } : {},
    ...Array.isArray(row.promotions) ? { promotions: row.promotions.map((p) => ({ start: p.start, end: p.end, factor: p.factor, priority: p.priority, label: typeof p.label === "string" ? p.label : "" })) } : {}
  };
}
var Manager = class {
  constructor(file, router, onChange = () => {
  }) {
    this.file = file;
    this.router = router;
    this.onChange = onChange;
    this.catalogFile = join3(dirname3(file), "catalogs.json");
    this.catalogs = /* @__PURE__ */ new Map();
    this.catalogErrors = /* @__PURE__ */ new Map();
    this.refreshes = /* @__PURE__ */ new Map();
    this.closed = false;
    this.monitorFlights = /* @__PURE__ */ new Map();
    this.loginInfo = /* @__PURE__ */ new Map();
    this.telemetry = new Telemetry(join3(dirname3(file), "usage.json"));
    router.telemetry = this.telemetry;
    router.monitor = (a) => this.monitorAccount(a);
    router.prepareFree = () => this.checkFreeModels(true);
    router.freeModels = (account) => this.freeModels(account);
  }
  async load() {
    this.raw = JSON.parse(await readFile(this.file, "utf8"));
    this.config = validateConfig(this.raw, this.file);
    try {
      const saved = JSON.parse(await readFile(this.catalogFile, "utf8"));
      for (const account of this.config.accounts) {
        const item = saved[account.id];
        if (item?.credentialFile === account.credentialFile && Array.isArray(item.models)) {
          this.catalogs.set(account.id, { ...item, models: item.models.filter((m) => typeof m.id === "string" && m.id.length > 0).map(modelInfo) });
        }
      }
    } catch {
    }
    this.telemetry.configure(this.config.usageRetentionDays);
    await this.telemetry.load();
    await Promise.all(this.config.accounts.map((a) => this.readLogin(a)));
    this.publish();
  }
  async readLogin(account) {
    try {
      const raw = await jsonCredential(account.credentialFile), c = raw.credential;
      this.loginInfo.set(account.id, account.provider.startsWith("qoder") ? { state: raw.pat ? "configured" : "missing", kind: "PAT", refreshable: false } : {
        state: !c?.accessToken ? "missing" : c?.expiresAtMs > Date.now() ? "valid" : c?.refreshToken ? "refresh-needed" : "expired",
        name: c?.nickname || c?.accountName || c?.uid || c?.userId,
        identity: c?.uid || c?.userId,
        expiresAt: c?.expiresAtMs,
        refreshExpiresAt: c?.refreshExpiresAtMs,
        refreshable: !!c?.refreshToken,
        kind: "\u5BA2\u6237\u7AEF\u767B\u5F55\u6001",
        edition: c?.edition
      });
    } catch {
      this.loginInfo.set(account.id, { state: "missing" });
    }
  }
  async syncLocalAccounts(provider, force = false) {
    if (this.localScan) return this.localScan;
    this.localScan = (async () => {
      const discovered = await discoverLocalAccounts(provider);
      this.localDiscovery = [
        ...(this.localDiscovery ?? []).filter((s) => !discovered.status.some((n) => n.provider === s.provider)),
        ...discovered.status.map((s) => ({ ...s, checkedAt: Date.now() }))
      ];
      if (this.closed || !discovered.accounts.length) return;
      await withFileLock(this.file, async () => {
        if (this.closed) return;
        let raw = JSON.parse(await readFile(this.file, "utf8"));
        let changed = false;
        for (const item of discovered.accounts) {
          const key = localAccountKey(item.provider, item.document);
          if (!force && raw.ignoredLocalAccounts?.includes(key)) continue;
          const config = validateConfig(raw, this.file);
          let existing, current;
          for (const a of config.accounts.filter((a2) => a2.provider === item.provider)) {
            try {
              const value = await jsonCredential(a.credentialFile);
              if (localAccountKey(a.provider, value) === key) {
                existing = a;
                current = value;
                break;
              }
            } catch {
            }
          }
          let sameDevice = true;
          if (existing && item.identityDocument) {
            try {
              const identity = await jsonCredential(existing.identityFile);
              sameDevice = identity.machineId === item.identityDocument.machineId && identity.deviceId === item.identityDocument.deviceId;
            } catch {
              sameDevice = false;
            }
          }
          if (existing && sameDevice && current.credential.expiresAtMs >= item.document.credential.expiresAtMs) continue;
          const id = existing?.id ?? `local_${createHash("sha256").update(key).digest("hex").slice(0, 20)}`;
          const base = join3(dirname3(this.file), "accounts");
          await mkdir2(base, { recursive: true, mode: 448 });
          const staging = await mkdtemp2(join3(base, `${id}-`));
          try {
            const credentialFile = join3(staging, "credential.json"), identityFile = join3(staging, "identity.json");
            await importAccount({ ...item, credentialFile, identityFile });
            const paths = {
              credentialFile: relative2(dirname3(this.file), credentialFile),
              ...item.provider.startsWith("trae") ? { identityFile: relative2(dirname3(this.file), identityFile) } : {}
            };
            const next = structuredClone(raw);
            if (existing) Object.assign(next.accounts.find((a) => a.id === id), paths);
            else next.accounts.push({
              id,
              provider: item.provider,
              name: item.document.credential.nickname || item.document.credential.accountName || item.document.credential.uid || item.document.credential.userId,
              ...paths
            });
            next.ignoredLocalAccounts = (raw.ignoredLocalAccounts ?? []).filter((k) => k !== key);
            validateConfig(next, this.file);
            await writePrivateJson(this.file, next);
            raw = next;
            changed = true;
            this.router.clients.delete(id);
            this.catalogs.delete(id);
            this.catalogErrors.delete(id);
          } catch (e) {
            await rm2(staging, { recursive: true, force: true });
            this.localDiscovery = this.localDiscovery.map((s) => s.provider === item.provider ? { ...s, state: "unreadable", code: "import_failed" } : s);
          }
        }
        if (changed) {
          this.raw = raw;
          this.config = validateConfig(raw, this.file);
          await Promise.all(this.config.accounts.map((a) => this.readLogin(a)));
          this.publish();
        }
      }, { waitMs: 3e4 });
    })().finally(() => {
      this.localScan = void 0;
    });
    return this.localScan;
  }
  async monitorAccount(account) {
    if (this.monitorFlights.has(account.id)) return this.monitorFlights.get(account.id);
    const promise = (async () => {
      try {
        const client = await this.router.client(account);
        if (!client.accountInfo) return;
        const snapshot = await client.accountInfo(AbortSignal.timeout(3e4));
        if (this.closed || !this.config.accounts.some((a) => a.id === account.id && a.credentialFile === account.credentialFile)) return;
        this.loginInfo.set(account.id, snapshot.login);
        await this.telemetry.observe(account.id, snapshot);
      } catch (e) {
        if (this.closed) return;
        const old = this.telemetry.row("accounts", account.id).balance;
        await this.telemetry.observe(account.id, { ...old, error: { code: "usage_fetch_failed", status: Number(e.status ?? e.failure?.status) || 502 }, attemptedAt: Date.now() });
        await this.readLogin(account);
      }
    })().finally(() => this.monitorFlights.delete(account.id));
    this.monitorFlights.set(account.id, promise);
    return promise;
  }
  async monitorAll(provider) {
    await Promise.all(this.config.accounts.filter((a) => !provider || a.provider === provider).map((a) => this.monitorAccount(a)));
  }
  freeAccounts() {
    const targets = Object.values(this.config.routes).filter((r) => r.freeOnly).flatMap((r) => r.targets);
    return this.config.accounts.filter((a) => a.enabled !== false && targets.some((t) => t.provider === a.provider && (!t.account || t.account === a.id)));
  }
  freeModels(account) {
    const saved = this.catalogs.get(account.id);
    if (this.catalogErrors.has(account.id) || !saved || beijingDay(saved.fetchedAt) !== beijingDay(Date.now())) return [];
    return saved.models.map((m) => modelWithCurrentPromotion(m)).filter((m) => isFreeModel(m));
  }
  async checkFreeModels(force = false) {
    await Promise.all(this.freeAccounts().filter((a) => {
      const saved = this.catalogs.get(a.id);
      if (force) return true;
      if (Date.now() - (this.catalogErrors.get(a.id)?.at ?? 0) < 3e5) return false;
      return !saved || beijingDay(saved.fetchedAt) !== beijingDay(Date.now()) || saved.pricingVersion !== 1;
    }).map((a) => this.refreshAccount(a, "pricing")));
  }
  freeStatus(row) {
    const accounts = this.config.accounts.filter((a) => a.enabled !== false && row.targets.some((t) => t.provider === a.provider && (!t.account || t.account === a.id)));
    return {
      checking: accounts.some((a) => this.refreshes.has(a.id)),
      accounts: accounts.map((a) => ({
        id: a.id,
        provider: a.provider,
        name: a.name ?? a.id,
        checkedAt: this.catalogs.get(a.id)?.fetchedAt,
        error: this.catalogErrors.get(a.id),
        models: this.freeModels(a).map((m) => ({ id: m.id, name: m.name }))
      }))
    };
  }
  freeRoutes(parentId, row) {
    const groups = /* @__PURE__ */ new Map();
    for (const account of this.config.accounts.filter((a) => a.enabled !== false)) {
      for (const model of this.freeModels(account)) {
        if (!row.targets.some((t) => t.provider === account.provider && (!t.account || t.account === account.id) && (!t.model || t.model === model.id) && (!t.models || t.models.includes(model.id)))) continue;
        const id = `free_${createHash("sha256").update(JSON.stringify([parentId, account.provider, model.id])).digest("hex").slice(0, 24)}`;
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
      return {
        ...group,
        parentId,
        dynamicFree: true,
        freeOnly: true,
        strategy: "failover",
        preferExpiringCredits: false,
        name: `Free \xB7 ${group.modelName} \xB7 ${PROVIDER_NAMES[group.provider]}`,
        reasoning,
        ...selected && reasoning?.supportedEfforts.includes(selected) ? { reasoningEffort: selected } : {},
        configuredEffort: selected ?? null,
        effortUnavailable: !!selected && !reasoning?.supportedEfforts.includes(selected),
        visible: row.visible !== false && preference.visible !== false,
        selected: preference.visible !== false,
        supportsImages: models.every(({ model }) => model.supportsImages),
        contextWindow: Math.min(row.contextWindow, ...models.map(({ model }) => model.contextWindow)),
        maxTokens: Math.min(row.maxTokens, ...models.map(({ model }) => model.maxTokens), ...models.map(({ model }) => model.contextWindow))
      };
    });
  }
  adapterModels() {
    const rows = this.routeModels();
    return [
      ...rows.filter((r) => r.freeOnly).flatMap((r) => this.freeRoutes(r.id, r)),
      ...rows.filter((r) => !r.freeOnly),
      ...rows.filter((r) => r.freeOnly).map((r) => ({ ...r, visible: false }))
    ];
  }
  publish() {
    this.telemetry.configure(this.config.usageRetentionDays);
    this.revision = revisionOf(this.raw);
    const routes = { ...this.config.routes };
    for (const model of this.adapterModels().filter((m) => m.dynamicFree)) routes[model.id] = model;
    for (const provider of PROVIDERS) for (const model of this.providerModels(provider)) {
      routes[`${provider}::${model.id}`] = { ...model, targets: [{ provider, model: model.id }] };
    }
    this.router.updateConfig({ ...this.config, routes });
    this.onChange();
  }
  providerModels(provider) {
    const rows = /* @__PURE__ */ new Map();
    for (const account of this.config.accounts.filter((a) => a.provider === provider && a.enabled !== false)) {
      for (const model of this.catalogs.get(account.id)?.models ?? []) {
        const old = rows.get(model.id);
        rows.set(model.id, old ? {
          ...old,
          contextWindow: Math.min(old.contextWindow, model.contextWindow),
          maxTokens: Math.min(old.maxTokens, model.maxTokens),
          supportsImages: old.supportsImages && model.supportsImages,
          reasoning: routeReasoning([{ model: old, provider }, { model, provider }])
        } : {
          ...model,
          ...reasoningModes(model, provider).length ? { reasoning: routeReasoning([{ model, provider }]) } : {}
        });
      }
    }
    return [...rows.values()].map((model) => ({
      ...model,
      name: this.config.models[provider]?.[model.id]?.name ?? model.name
    }));
  }
  hiddenModels(provider) {
    return this.providerModels(provider).filter((m) => !this.modelVisible(provider, m.id)).map((m) => m.id);
  }
  modelVisible(provider, id) {
    return this.config.models[provider]?.[id]?.visible ?? this.config.modelVisibility[provider] ?? false;
  }
  routeModels() {
    return Object.entries(this.config.routes).sort(([, a], [, b]) => Number(!!b.freeOnly) - Number(!!a.freeOnly)).map(([id, row]) => {
      const effectiveTargets = row.freeOnly ? this.freeRoutes(id, row).flatMap((r) => r.targets) : row.targets;
      const sources = effectiveTargets.flatMap((target) => this.config.accounts.filter((a) => a.enabled !== false && a.provider === target.provider && (!target.account || target.account === a.id)).flatMap((a) => {
        const catalog = this.catalogs.get(a.id)?.models ?? [];
        const models2 = target.models ? target.models.map((model) => catalog.find((m) => m.id === model)).filter(Boolean) : [matchModel(id, target, catalog)].filter(Boolean);
        return models2.map((model) => ({ model, provider: a.provider }));
      }));
      const models = sources.map((s) => s.model), reasoning = routeReasoning(sources);
      return {
        ...row,
        supportsImages: models.length > 0 && models.every((m) => m.supportsImages),
        reasoning,
        ...row.freeOnly && models.length ? { contextWindow: Math.min(row.contextWindow, ...models.map((m) => m.contextWindow)), maxTokens: Math.min(row.maxTokens, ...models.map((m) => m.maxTokens), ...models.map((m) => m.contextWindow)) } : {},
        id,
        name: row.name ?? id,
        expiringStatus: { ...this.telemetry.data.expiringRounds[id] },
        ...row.freeOnly ? { freeStatus: { ...this.freeStatus(row), modelRoutes: this.freeRoutes(id, row) } } : {}
      };
    });
  }
  async ensureCatalog(provider, force = false) {
    await Promise.all(this.config.accounts.filter((a) => a.provider === provider && a.enabled !== false).map((a) => this.refreshAccount(a, force)));
  }
  async refreshAccount(account, force) {
    const saved = this.catalogs.get(account.id);
    if (!force && saved && Date.now() - saved.fetchedAt < this.config.catalogTtlMs) return;
    if (!force && Date.now() - (this.catalogErrors.get(account.id)?.at ?? 0) < 1e4) return;
    if (this.refreshes.has(account.id)) return this.refreshes.get(account.id);
    const promise = (async () => {
      try {
        if (force === true) this.router.clients.delete(account.id);
        const client = await this.router.client(account);
        const models = (await client.models(AbortSignal.timeout(6e4), !!force)).map(modelInfo);
        if (this.closed || !this.config.accounts.some((a) => a.id === account.id && a.credentialFile === account.credentialFile)) return;
        this.catalogs.set(account.id, { credentialFile: account.credentialFile, fetchedAt: Date.now(), pricingVersion: 1, models });
        this.catalogErrors.delete(account.id);
        await withFileLock(this.catalogFile, () => writePrivateJson(this.catalogFile, Object.fromEntries(this.catalogs)));
      } catch (error) {
        if (this.closed || !this.config.accounts.some((a) => a.id === account.id)) return;
        this.catalogErrors.set(account.id, { status: Number(error.status ?? error.failure?.status) || 502, code: "catalog_fetch_failed", at: Date.now() });
      }
      if (!this.closed) this.publish();
    })().finally(() => this.refreshes.delete(account.id));
    this.refreshes.set(account.id, promise);
    return promise;
  }
  state() {
    const status = this.router.status();
    return {
      pluginVersion: version,
      revision: this.revision,
      localDiscovery: this.localDiscovery ?? [],
      telemetry: this.telemetry.state(),
      accounts: this.config.accounts.map((a) => ({
        id: a.id,
        provider: a.provider,
        name: a.name ?? a.id,
        enabled: a.enabled !== false,
        status: status.find((s) => s.id === a.id),
        login: this.loginInfo.get(a.id),
        usage: this.telemetry.row("accounts", a.id),
        modelCount: this.catalogs.get(a.id)?.models.length ?? 0,
        fetchedAt: this.catalogs.get(a.id)?.fetchedAt,
        error: this.catalogErrors.get(a.id)
      })),
      providers: PROVIDERS.map((id) => ({ id, name: PROVIDER_NAMES[id], models: this.providerModels(id).map((m) => ({
        ...m,
        visible: this.modelVisible(id, m.id)
      })) })),
      presets: Object.entries(ROUTE_PRESETS).map(([id, route]) => ({
        id,
        ...structuredClone(route),
        added: Object.hasOwn(this.config.routes, id),
        availableProviders: [...new Set(route.targets.filter((t) => route.freeOnly ? this.config.accounts.some((a) => a.enabled !== false && a.provider === t.provider && this.freeModels(a).length) : matchModel(id, t, this.providerModels(t.provider))).map((t) => t.provider))]
      })),
      routes: this.routeModels(),
      options: {
        cooldownMs: this.config.cooldownMs,
        requestTimeoutMs: this.config.requestTimeoutMs,
        retryServerErrors: this.config.retryServerErrors,
        usageRetentionDays: this.config.usageRetentionDays
      }
    };
  }
  async action(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) bad("\u8BF7\u6C42\u683C\u5F0F\u65E0\u6548");
    if (input.action === "account.export") {
      if (input.revision !== revisionOf(JSON.parse(await readFile(this.file, "utf8")))) throw new ManagementError(409, "\u914D\u7F6E\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u5237\u65B0\u540E\u63D0\u53D6\u51ED\u8BC1");
      const account = this.config.accounts.find((a) => a.id === input.id);
      if (!account) bad("\u8D26\u53F7\u4E0D\u5B58\u5728");
      let credential;
      try {
        credential = await readPortableCredential(account);
      } catch {
        bad("\u8D26\u53F7\u51ED\u8BC1\u4E0D\u53EF\u8BFB\uFF0C\u8BF7\u8865\u5145\u6216\u66F4\u65B0\u540E\u518D\u63D0\u53D6");
      }
      if (!credential) bad("\u8D26\u53F7\u5C1A\u672A\u4FDD\u5B58\u51ED\u8BC1\uFF0C\u8BF7\u5148\u8865\u5145\u767B\u5F55\u4FE1\u606F");
      return { ...this.state(), exported: {
        filename: `dsh-account-${account.provider}-${account.id}.json`,
        document: {
          ...credential.document,
          ...credential.identity ? { identity: credential.identity } : {},
          format: "dsh-multi-router-account",
          provider: account.provider,
          name: account.name || account.id
        }
      } };
    }
    if (input.action === "config.export") {
      if (input.revision !== revisionOf(JSON.parse(await readFile(this.file, "utf8")))) throw new ManagementError(409, "\u914D\u7F6E\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u5237\u65B0\u540E\u5BFC\u51FA");
      try {
        return { ...this.state(), exported: { filename: `dsh-multi-router-${input.includeCredentials ? "encrypted" : "settings"}-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`, document: await exportConfiguration(this, input) } };
      } catch (e) {
        bad(e.message);
      }
    }
    if (input.action === "config.preview") {
      try {
        const portable = await decodeConfiguration(input);
        return { ...this.state(), importPreview: migrationSummary(this, portable, input.mode) };
      } catch (e) {
        bad(e.message);
      }
    }
    if (input.action === "monitor.refresh" || input.action === "account.refresh") {
      if (input.provider && !PROVIDERS.includes(input.provider)) bad("\u672A\u77E5\u4F9B\u5E94\u5546");
      if (input.action === "account.refresh") {
        const account = this.config.accounts.find((a) => a.id === input.id);
        if (!account) bad("\u8D26\u53F7\u4E0D\u5B58\u5728");
        this.router.clients.delete(account.id);
        await this.monitorAccount(account);
      } else {
        await this.syncLocalAccounts(input.provider);
        await this.monitorAll(input.provider);
      }
      return this.state();
    }
    if (input.action === "accounts.discover") {
      if (input.provider && !PROVIDERS.includes(input.provider)) bad("\u672A\u77E5\u4F9B\u5E94\u5546");
      await this.syncLocalAccounts(input.provider, true);
      await Promise.all([this.monitorAll(input.provider), ...this.config.accounts.filter((a) => !input.provider || a.provider === input.provider).map((a) => this.refreshAccount(a, true))]);
      return this.state();
    }
    if (input.action === "account.capture") {
      if (!PROVIDERS.includes(input.provider)) bad("\u672A\u77E5\u4F9B\u5E94\u5546");
      input = { ...input, action: "account.add", id: `${input.provider.replace("-", "_")}_${randomBytes2(4).toString("hex")}`, capture: true };
    }
    if (input.action === "refresh") {
      if (input.provider && !PROVIDERS.includes(input.provider)) bad("\u672A\u77E5\u4F9B\u5E94\u5546");
      await Promise.all((input.provider ? [input.provider] : PROVIDERS).map((p) => this.ensureCatalog(p, true)));
      return this.state();
    }
    if (input.action === "free.refresh") {
      await this.checkFreeModels(true);
      return this.state();
    }
    return withFileLock(this.file, async () => {
      let raw = JSON.parse(await readFile(this.file, "utf8"));
      if (input.revision !== revisionOf(raw)) throw new ManagementError(409, "\u914D\u7F6E\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u5237\u65B0\u540E\u518D\u4FDD\u5B58");
      raw.routes ??= structuredClone(this.config.routes);
      let staging;
      try {
        const account = raw.accounts.find((a) => a.id === input.id);
        if (input.action === "config.import") {
          try {
            const prepared = await prepareMigration(this, raw, await decodeConfiguration(input), input.mode);
            staging = prepared.staging;
            await writePrivateJson(`${this.file}.before-import-${Date.now()}-${randomBytes2(3).toString("hex")}.bak`, raw);
            raw = prepared.raw;
          } catch (e) {
            bad(e.message);
          }
        } else if (input.action === "account.add" || input.action === "account.credentials") {
          const replacing = input.action === "account.credentials";
          if (replacing) {
            if (!account) bad("\u8D26\u53F7\u4E0D\u5B58\u5728");
            input = { ...input, provider: account.provider };
          }
          if (!/^[a-zA-Z0-9_-]{1,64}$/.test(input.id ?? "") || !PROVIDERS.includes(input.provider)) bad("\u8D26\u53F7 ID \u6216\u4F9B\u5E94\u5546\u65E0\u6548");
          if (account && !replacing) bad("\u8D26\u53F7 ID \u5DF2\u5B58\u5728\uFF0C\u8BF7\u4F7F\u7528\u4E0D\u540C ID");
          const base = join3(dirname3(this.file), "accounts");
          await mkdir2(base, { recursive: true, mode: 448 });
          staging = await mkdtemp2(join3(base, `${input.id}-`));
          const credentialFile = join3(staging, "credential.json"), identityFile = join3(staging, "identity.json");
          const added = {
            id: input.id,
            name: input.name || account?.name || input.id,
            provider: input.provider,
            credentialFile: relative2(dirname3(this.file), credentialFile),
            ...input.provider.startsWith("trae") ? { identityFile: relative2(dirname3(this.file), identityFile) } : {}
          };
          if (replacing) raw.accounts[raw.accounts.indexOf(account)] = { ...account, ...added, enabled: true };
          else raw.accounts.push(added);
          validateConfig(raw, this.file);
          if (input.document !== void 0) {
            try {
              await importAccount({ provider: input.provider, credentialFile, identityFile, document: input.document, identityDocument: input.identityDocument });
            } catch {
              bad("\u51ED\u8BC1\u683C\u5F0F\u65E0\u6548\uFF1A\u8BF7\u68C0\u67E5\u5FC5\u586B\u5B57\u6BB5\u3001\u533A\u57DF\u548C Trae \u8BBE\u5907\u8EAB\u4EFD");
            }
          } else if (input.provider.startsWith("qoder") && input.pat) {
            if (typeof input.pat !== "string" || input.pat.length > 8192 || /\s/.test(input.pat.trim())) bad("PAT \u683C\u5F0F\u65E0\u6548");
            await writePrivateJson(credentialFile, {
              version: 2,
              pat: input.pat.trim(),
              region: input.provider === "qoder" ? "china" : "global",
              savedAt: (/* @__PURE__ */ new Date()).toISOString()
            });
          } else {
            const source = input.source;
            if (!source && (input.provider.startsWith("workbuddy") || input.provider.startsWith("trae"))) {
              const discovered = await discoverLocalAccounts(input.provider);
              const item = discovered.accounts.find((a) => !input.edition || input.edition === "auto" || a.document.credential.edition === input.edition);
              if (!item) bad(discovered.status.some((s) => s.state === "unreadable") ? "\u627E\u5230\u672C\u673A\u767B\u5F55\u6587\u4EF6\uFF0C\u4F46\u51ED\u8BC1\u6216\u8BBE\u5907\u8EAB\u4EFD\u65E0\u6CD5\u8BFB\u53D6\u3002\u8BF7\u5728\u5B98\u65B9\u5BA2\u6237\u7AEF\u91CD\u65B0\u767B\u5F55\u540E\u91CD\u8BD5\uFF0C\u6216\u624B\u52A8\u5BFC\u5165\u51ED\u8BC1\u3002" : "\u672A\u627E\u5230\u6240\u9009\u533A\u57DF\u7684\u672C\u673A\u767B\u5F55\u3002\u8BF7\u5148\u5728\u5B98\u65B9\u5BA2\u6237\u7AEF\u767B\u5F55\uFF0C\u518D\u70B9\u51FB\u91CD\u65B0\u68C0\u6D4B\u3002");
              try {
                await importAccount({ ...item, credentialFile, identityFile });
              } catch {
                bad("\u672C\u673A\u51ED\u8BC1\u5BFC\u5165\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u5BA2\u6237\u7AEF\u767B\u5F55\u72B6\u6001\u4E0E\u8BBE\u5907\u8EAB\u4EFD");
              }
            } else {
              const file = source || (input.provider.startsWith("qoder") ? qoderOwnAuthPath(QODER_VARIANTS.find((v) => v.id === input.provider)) : void 0);
              if (typeof file !== "string" || !file.trim()) bad("\u672A\u627E\u5230\u767B\u5F55\u6587\u4EF6\uFF0C\u8BF7\u586B\u5199\u6765\u6E90\u8DEF\u5F84\u6216 Qoder PAT");
              try {
                await importAccount({
                  provider: input.provider,
                  source: resolve(file),
                  credentialFile,
                  identityFile,
                  edition: input.edition,
                  identitySource: input.identity ? resolve(input.identity) : void 0
                });
              } catch {
                bad("\u8D26\u53F7\u5BFC\u5165\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u767B\u5F55\u6587\u4EF6\u3001\u533A\u57DF\u3001Trae edition \u548C\u8BBE\u5907\u8EAB\u4EFD");
              }
            }
          }
          const imported = await jsonCredential(credentialFile);
          const fingerprint = (value) => input.provider.startsWith("qoder") ? value.pat : value.credential?.uid || value.credential?.userId;
          for (const existing of input.capture || input.document !== void 0 ? this.config.accounts.filter((a) => a.provider === input.provider && a.id !== input.id) : []) {
            let value;
            try {
              value = await jsonCredential(existing.credentialFile);
            } catch {
              continue;
            }
            if (fingerprint(value) && fingerprint(value) === fingerprint(imported)) bad(`\u6B64\u767B\u5F55\u8D26\u53F7\u5DF2\u5728\u8D26\u53F7\u6C60\u4E2D\uFF1A${existing.name || existing.id}\uFF0C\u8BF7\u5207\u6362\u5BA2\u6237\u7AEF\u8D26\u53F7\u540E\u518D\u83B7\u53D6`);
          }
          if (!input.name && !replacing) added.name = imported.credential?.nickname || imported.credential?.accountName || input.id;
        } else if (input.action === "account.update") {
          if (!account) bad("\u8D26\u53F7\u4E0D\u5B58\u5728");
          if (input.name !== void 0) account.name = input.name;
          if (input.enabled !== void 0) account.enabled = input.enabled;
        } else if (input.action === "account.move") {
          if (!account || ![-1, 1].includes(input.direction)) bad("\u8D26\u53F7\u6216\u987A\u5E8F\u65E0\u6548");
          const group = raw.accounts.filter((a) => a.provider === account.provider), position = group.indexOf(account) + input.direction;
          if (position >= 0 && position < group.length) {
            const index = raw.accounts.indexOf(account), next = raw.accounts.indexOf(group[position]);
            [raw.accounts[index], raw.accounts[next]] = [raw.accounts[next], raw.accounts[index]];
          }
        } else if (input.action === "account.remove") {
          if (!account) bad("\u8D26\u53F7\u4E0D\u5B58\u5728");
          if (Object.values(raw.routes).some((r) => r.targets.some((t) => t.account === input.id))) bad("\u8BF7\u5148\u79FB\u9664\u8DEF\u7531\u4E2D\u7ED1\u5B9A\u6B64\u8D26\u53F7\u7684\u76EE\u6807");
          if (account.provider.startsWith("workbuddy") || account.provider.startsWith("trae")) {
            try {
              raw.ignoredLocalAccounts = [.../* @__PURE__ */ new Set([...raw.ignoredLocalAccounts ?? [], localAccountKey(account.provider, await jsonCredential(this.config.accounts.find((a) => a.id === account.id).credentialFile))])];
            } catch {
            }
          }
          raw.accounts = raw.accounts.filter((a) => a.id !== input.id);
        } else if (input.action === "models.visibility") {
          if (input.provider !== void 0 && !PROVIDERS.includes(input.provider) || typeof input.visible !== "boolean") bad("\u4F9B\u5E94\u5546\u6216\u5C55\u793A\u5F00\u5173\u65E0\u6548");
          raw.modelVisibility = { ...raw.modelVisibility };
          raw.models = { ...raw.models };
          for (const provider of input.provider ? [input.provider] : PROVIDERS) {
            raw.modelVisibility[provider] = input.visible;
            raw.models[provider] = Object.fromEntries(Object.entries(raw.models[provider] ?? {}).map(([id, pref]) => [id, { ...pref, visible: input.visible }]));
          }
        } else if (input.action === "model.update") {
          if (!PROVIDERS.includes(input.provider) || typeof input.id !== "string" || !input.id || input.id.length > 256) bad("\u6A21\u578B\u65E0\u6548");
          raw.models = { ...raw.models, [input.provider]: {
            ...raw.models?.[input.provider],
            [input.id]: {
              ...raw.models?.[input.provider]?.[input.id],
              ...input.name !== void 0 ? { name: input.name } : {},
              ...input.visible !== void 0 ? { visible: input.visible } : {}
            }
          } };
        } else if (input.action === "free.model.update") {
          const parent = raw.routes[input.parentId];
          if (!parent?.freeOnly || !this.freeRoutes(input.parentId, this.config.routes[input.parentId]).some((m) => m.id === input.id)) bad("\u514D\u8D39\u6A21\u578B\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u5237\u65B0\u9875\u9762");
          const model = this.freeRoutes(input.parentId, this.config.routes[input.parentId]).find((m) => m.id === input.id);
          if (input.reasoningEffort !== void 0 && input.reasoningEffort !== null && !model.reasoning?.supportedEfforts.includes(input.reasoningEffort)) bad("\u6B64\u514D\u8D39\u6A21\u578B\u4E0D\u652F\u6301\u6240\u9009\u63A8\u7406\u7B49\u7EA7");
          parent.freeModels = { ...parent.freeModels, [input.id]: {
            ...parent.freeModels?.[input.id],
            ...input.visible !== void 0 ? { visible: input.visible } : {},
            ...input.reasoningEffort !== void 0 ? { reasoningEffort: input.reasoningEffort } : {}
          } };
        } else if (input.action === "route.save") {
          if (input.id === void 0 || input.id === "") {
            input.id = input.previousId || `route_${randomBytes2(8).toString("hex")}`;
          }
          if (!/^[a-zA-Z0-9_.-]{1,128}$/.test(input.id ?? "")) bad("\u8DEF\u7531 ID \u4EC5\u652F\u6301\u5B57\u6BCD\u3001\u6570\u5B57\u3001\u70B9\u3001\u4E0B\u5212\u7EBF\u548C\u77ED\u6A2A\u7EBF");
          if (input.previousId && !Object.hasOwn(raw.routes, input.previousId)) bad("\u539F\u8DEF\u7531\u4E0D\u5B58\u5728\uFF0C\u8BF7\u5237\u65B0\u9875\u9762");
          if (input.previousId !== input.id && Object.hasOwn(raw.routes, input.id)) bad("\u8DEF\u7531 ID \u5DF2\u5B58\u5728");
          raw.routes = { ...raw.routes, [input.id]: input.route };
          if (input.previousId && input.previousId !== input.id) delete raw.routes[input.previousId];
        } else if (input.action === "route.force-expiring") {
          if (!Object.hasOwn(raw.routes, input.id)) bad("\u8DEF\u7531\u4E0D\u5B58\u5728");
          raw.routes[input.id].preferExpiringCredits = true;
          await this.telemetry.restartExpiring(input.id);
          const route = this.router.config.routes[input.id], strategy = route.strategy ?? "failover";
          if (["tokens", "credits"].includes(strategy)) await this.telemetry.advance(input.id, this.router.candidates(input.id), JSON.stringify({ strategy, targets: route.targets }));
        } else if (input.action === "route.remove") {
          if (!Object.hasOwn(raw.routes, input.id)) bad("\u8DEF\u7531\u4E0D\u5B58\u5728");
          delete raw.routes[input.id];
        } else if (input.action === "preset.add") {
          const id = input.id ?? "deepseek-v4.1-flash";
          if (!Object.hasOwn(ROUTE_PRESETS, id)) bad("\u672A\u77E5\u9884\u914D\u7F6E\u8DEF\u7531");
          if (Object.hasOwn(raw.routes, id)) bad("\u9884\u914D\u7F6E\u8DEF\u7531\u5DF2\u5B58\u5728\uFF0C\u4E0D\u8986\u76D6\u5DF2\u6709\u8BBE\u7F6E");
          raw.routes[id] = structuredClone(ROUTE_PRESETS[id]);
        } else if (input.action === "preset.add-all") {
          for (const [id, route] of Object.entries(ROUTE_PRESETS)) if (!Object.hasOwn(raw.routes, id)) raw.routes[id] = structuredClone(route);
        } else if (input.action === "options.save") {
          for (const key of ["cooldownMs", "requestTimeoutMs", "retryServerErrors", "usageRetentionDays"]) if (input[key] !== void 0) raw[key] = input[key];
        } else bad("\u672A\u77E5\u64CD\u4F5C");
        let config;
        try {
          config = validateConfig(raw, this.file);
        } catch (error) {
          bad(error.message);
        }
        await writePrivateJson(this.file, raw);
        staging = void 0;
        this.raw = raw;
        this.config = config;
        for (const id of this.catalogs.keys()) if (!config.accounts.some((a) => a.id === id && a.credentialFile === this.catalogs.get(id).credentialFile)) {
          this.catalogs.delete(id);
          this.catalogErrors.delete(id);
        }
        await Promise.all(config.accounts.map((a) => this.readLogin(a)));
        this.publish();
        await this.telemetry.persist();
      } finally {
        if (staging) await rm2(staging, { recursive: true, force: true });
      }
      return this.state();
    }, { waitMs: 3e4 }).then(async (state) => {
      if (input.action === "config.import") {
        void Promise.all([this.monitorAll(), ...PROVIDERS.map((p) => this.ensureCatalog(p, true))]).catch(() => {
        });
      }
      if (input.action === "preset.add" || input.action === "preset.add-all") {
        await this.checkFreeModels();
        return this.state();
      }
      if (input.action === "account.add" || input.action === "account.credentials") {
        const account = this.config.accounts.find((a) => a.id === input.id);
        if (account) {
          await Promise.all([this.refreshAccount(account, true), this.monitorAccount(account)]);
          return this.state();
        }
      }
      return state;
    });
  }
  watch(onError) {
    let timer;
    const watcher = watch(dirname3(this.file), (_, filename) => {
      if (filename && String(filename) !== this.file.split(/[\\/]/).pop()) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        void withFileLock(this.file, async () => {
          const raw = JSON.parse(await readFile(this.file, "utf8"));
          if (this.closed || revisionOf(raw) === this.revision) return;
          const config = validateConfig(raw, this.file);
          this.raw = raw;
          this.config = config;
          this.publish();
          await this.telemetry.persist();
        }).catch(() => onError?.());
      }, 150);
    });
    return () => {
      this.closed = true;
      clearTimeout(timer);
      watcher.close();
    };
  }
};
function managementHandler(manager) {
  const key = randomBytes2(32).toString("base64url");
  const json = (res, status, value) => {
    res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    res.end(JSON.stringify(value));
  };
  return async (req, res) => {
    try {
      const remote = req.socket?.remoteAddress;
      if (!hostIsLoopback(req.headers.host) || remote && !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote)) throw new ManagementError(403, "\u4EC5\u5141\u8BB8\u672C\u673A\u8BF7\u6C42");
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) throw new ManagementError(403, "\u6765\u6E90\u65E0\u6548");
      if (req.headers["sec-fetch-site"] === "cross-site") throw new ManagementError(403, "\u6765\u6E90\u65E0\u6548");
      if (req.method === "GET") {
        json(res, 200, { ...manager.state(), key });
        return;
      }
      if (req.method !== "POST") throw new ManagementError(405, "\u65B9\u6CD5\u65E0\u6548");
      const actual = Buffer.from(req.headers["x-multi-router-key"] ?? ""), expected = Buffer.from(key);
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new ManagementError(401, "\u8BF7\u5237\u65B0\u914D\u7F6E\u9875\u9762");
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] ?? "")) throw new ManagementError(415, "\u9700\u8981 JSON");
      let size = 0, chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 1024 * 1024) throw new ManagementError(413, "\u8BF7\u6C42\u8FC7\u5927");
        chunks.push(chunk);
      }
      let input;
      try {
        input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        throw new ManagementError(400, "JSON \u65E0\u6548");
      }
      json(res, 200, { ...await manager.action(input), key });
    } catch (error) {
      json(
        res,
        error instanceof ManagementError ? error.status : 500,
        { error: error instanceof ManagementError ? error.message : "\u64CD\u4F5C\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u914D\u7F6E\u548C\u6765\u6E90\u6587\u4EF6" }
      );
    }
  };
}

export {
  MANAGEMENT_PATH,
  ManagementError,
  modelInfo,
  Manager,
  managementHandler
};
//# sourceMappingURL=chunk-WIDXMBQ2.js.map
