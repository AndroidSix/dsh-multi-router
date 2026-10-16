import {
  Checkins,
  jsonCredential,
  qoderPluginDataDir,
  readLimitedText,
  refreshWorkBuddyCheckinCredential,
  supportsCheckin,
  workbuddyToken
} from "./chunk-2LH6TD2U.js";
import {
  discoverLocalAccounts,
  importAccount,
  localAccountKey,
  normalizeLocalAccountKey,
  readPortableCredential
} from "./chunk-VZPXRK7Q.js";
import {
  modelWithCurrentPromotion
} from "./chunk-TEZ2FMEO.js";
import {
  ApiService
} from "./chunk-625KMEYS.js";
import {
  hostIsLoopback
} from "./chunk-DNQPZMPF.js";
import {
  Telemetry,
  contextInfo,
  matchModel,
  resolveContext
} from "./chunk-DZ4ZUAYH.js";
import {
  PROVIDERS,
  PROVIDER_NAMES,
  ROUTE_PRESETS,
  beijingDay,
  isFreeModel,
  routeReasoning,
  validateConfig,
  writePrivateJson
} from "./chunk-NGVWVIBM.js";

// src/manager.mjs
import { createHash, randomBytes as randomBytes3, timingSafeEqual } from "node:crypto";

// package.json
var version = "0.6.1";

// src/manager.mjs
import { readFile as readFile4, mkdir as mkdir2, mkdtemp as mkdtemp2, rm as rm3 } from "node:fs/promises";
import { watch as watch2 } from "node:fs";
import { dirname as dirname3, join as join5, relative as relative2, resolve } from "node:path";
import { withFileLock as withFileLock3 } from "@deepseek-ai/dsh-atomic-write";

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
var options = ["cooldownMs", "requestTimeoutMs", "catalogTtlMs", "retryServerErrors", "modelVisibility", "usageRetentionDays", "checkinSchedule", "sidebarUsage"];
function settings(config) {
  return {
    ...pick(config, options),
    models: Object.fromEntries(Object.entries(config.models ?? {}).map(([p, rows]) => [p, Object.fromEntries(Object.entries(rows).map(([id, pref]) => [id, pick(pref, ["name", "visible", "contextWindow", "supportsImages", "reasoningEffort"])]))])),
    accounts: config.accounts.map((a) => pick(a, ["id", "provider", "name", "enabled", "autoCheckin"])),
    routes: Object.fromEntries(Object.entries(config.routes).map(([id, r]) => [id, {
      ...pick(r, ["name", "visible", "strategy", "contextMode", "contextWindow", "maxTokens", "preferExpiringCredits", "expiringWithinDays", "freeOnly", "freeModels"]),
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

// src/plugin-updates.mjs
import { readFile as readFile2, stat, rm as rm2 } from "node:fs/promises";
import { join as join4 } from "node:path";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import { withFileLock, writeFileAtomic as writeFileAtomic2 } from "@deepseek-ai/dsh-atomic-write";

// src/plugin-reload.mjs
import { readFile } from "node:fs/promises";
import { watch } from "node:fs";
import { join as join3 } from "node:path";
import { parse } from "yaml";
function outsideActivation(hmr, operation) {
  const scope = hmr?.executing;
  return typeof scope?.exit === "function" ? scope.exit(operation) : operation();
}
var PluginReload = class {
  constructor({ service, profile, canReload, hmr = () => void 0, busy = () => false, now = Date.now, runningVersion }) {
    Object.assign(this, { service, profile, canReload, hmr, busy, now, runningVersion });
    this.phase = "current";
    this.installedVersion = runningVersion;
    this.retryAt = 0;
  }
  state() {
    return { runningVersion: this.runningVersion, installedVersion: this.installedVersion, phase: this.phase, canReload: !!this.canReload(), message: this.message };
  }
  start() {
    const dir = this.profile()?.dir;
    this.watchers = [];
    if (dir) for (const target of [dir, join3(dir, "node_modules")]) try {
      const watcher = watch(target, () => this.schedule());
      watcher.unref();
      this.watchers.push(watcher);
    } catch {
    }
    this.schedule();
  }
  schedule(delay = 500) {
    if (this.closed) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.check().catch(() => {
      });
    }, delay);
    this.timer.unref();
  }
  stop() {
    this.closed = true;
    clearTimeout(this.timer);
    for (const watcher of this.watchers ?? []) watcher.close();
  }
  check() {
    if (this.closed) return Promise.resolve();
    if (this.flight) return this.flight;
    this.flight = this.inspect().finally(() => {
      this.flight = void 0;
    });
    return this.flight;
  }
  async inspect() {
    const dir = this.profile()?.dir;
    if (!dir) return;
    let manifest, installed;
    try {
      manifest = JSON.parse(await readFile(join3(dir, "package.json"), "utf8"));
      installed = JSON.parse(await readFile(join3(dir, "node_modules/dsh-multi-router/package.json"), "utf8"));
    } catch {
      return;
    }
    if (this.closed || !manifest.dsh?.profile?.bundles?.includes("dsh-multi-router")) return;
    if (installed.name !== "dsh-multi-router" || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(installed.version)) return;
    this.installedVersion = installed.version;
    if (installed.version === this.runningVersion) {
      this.phase = "current";
      this.message = void 0;
      return;
    }
    const declared = manifest.dependencies?.["dsh-multi-router"];
    const exact = typeof declared === "string" && /^(?:npm:dsh-multi-router@)?(\d+\.\d+\.\d+(?:-[\w.-]+)?)$/.exec(declared)?.[1];
    let installing = false;
    const pid = Number(await readFile(join3(dir, "package.json.lock"), "utf8").catch(() => ""));
    if (Number.isInteger(pid) && pid > 0) try {
      process.kill(pid, 0);
      installing = true;
    } catch (e) {
      installing = e.code !== "ESRCH";
    }
    if (installing || exact && exact !== installed.version) {
      this.phase = "waiting";
      this.message = "\u5B89\u88C5\u4E8B\u52A1\u5C1A\u672A\u5B8C\u6210\uFF0C\u6216\u5B89\u88C5\u5931\u8D25\u5DF2\u56DE\u6EDA\uFF1B\u7B49\u5F85\u914D\u7F6E\u4E0E\u6587\u4EF6\u7248\u672C\u4E00\u81F4\u540E\u518D\u52A0\u8F7D\u3002";
      if (installing) this.schedule(1e3);
      return;
    }
    if (!this.canReload() || !this.service()?.setBundleEnabled) {
      this.phase = "restart-required";
      this.message = "\u5F53\u524D DSH \u672A\u63D0\u4F9B\u8FD0\u884C\u4E2D\u91CD\u8F7D\uFF0C\u8BF7\u5347\u7EA7 DSH \u6216\u91CD\u542F\u5E94\u7528\u3002";
      return;
    }
    if (this.busy()) {
      this.phase = "waiting";
      this.message = "\u65B0\u7248\u672C\u5DF2\u5B89\u88C5\uFF0C\u7B49\u5F85\u5F53\u524D\u8BF7\u6C42\u548C\u8D26\u53F7\u64CD\u4F5C\u7ED3\u675F\u540E\u81EA\u52A8\u751F\u6548\u3002";
      this.schedule(1e3);
      return;
    }
    const root = join3(dir, "node_modules/dsh-multi-router");
    try {
      const patch = parse(await readFile(join3(root, "cordis.patch.yml"), "utf8"));
      const row = Array.isArray(patch) && patch.flatMap((p) => p?.insert ?? []).find((e) => e?.id === `llm-multi-router-v2-${installed.version}`);
      if (row?.name !== `./lib/host-v${installed.version}.js` || row.disabled) throw Error("legacy entry");
      await readFile(join3(root, `lib/host-v${installed.version}.js`));
    } catch {
      this.phase = "restart-required";
      this.message = "\u5B89\u88C5\u7248\u672C\u7F3A\u5C11\u7248\u672C\u5316\u5165\u53E3\uFF0C\u91CD\u65B0\u5B89\u88C5\u6700\u65B0\u7248\u540E\u518D\u8BD5\u3002";
      return;
    }
    if (this.now() < this.retryAt) return;
    this.phase = "reloading";
    this.message = "\u6B63\u5728\u91CD\u65B0\u52A0\u8F7D\u63D2\u4EF6\u4E0E\u914D\u7F6E\u9762\u677F\u2026";
    this.retryAt = this.now() + 6e4;
    try {
      const result = await outsideActivation(this.hmr(), () => this.service().setBundleEnabled("dsh-multi-router", true));
      if (this.closed) return;
      this.phase = "restart-required";
      this.message = result.application === "applied" ? "DSH \u5C1A\u672A\u5207\u6362\u5230\u65B0\u7248\u672C\uFF0C\u8BF7\u91CD\u65B0\u52A0\u8F7D\u63D2\u4EF6\u6216\u67E5\u770B\u7EC4\u4EF6\u9519\u8BEF\u3002" : "DSH \u672A\u80FD\u91CD\u8F7D\u63D2\u4EF6\uFF0C\u8BF7\u5347\u7EA7 DSH \u6216\u91CD\u542F\u5E94\u7528\u3002";
    } catch {
      if (!this.closed) {
        this.phase = "failed";
        this.message = "\u63D2\u4EF6\u91CD\u8F7D\u672A\u5B8C\u6210\uFF0C\u53EF\u7A0D\u540E\u91CD\u8BD5\uFF1B\u5DF2\u4FDD\u5B58\u7684\u914D\u7F6E\u4FDD\u6301\u4E0D\u53D8\u3002";
      }
    }
  }
};

// upstream/workbuddy/src/update.ts
var WORKBUDDY_REPOSITORY_URL = "https://github.com/corrinehu/dsh-workbuddy-connect";
var WORKBUDDY_UPDATE_PACKAGE_NAME = "dsh-workbuddy-connect";
var WORKBUDDY_UPDATE_NPM_METADATA_URL = `https://registry.npmjs.org/-/package/${WORKBUDDY_UPDATE_PACKAGE_NAME}/dist-tags`;
var WORKBUDDY_UPDATE_RELEASES_API_URL = `${WORKBUDDY_REPOSITORY_URL.replace("https://github.com", "https://api.github.com/repos")}/releases?per_page=100`;
var WORKBUDDY_RELEASE_PAGE_BASE = `${WORKBUDDY_REPOSITORY_URL}/releases/tag/`;
var WORKBUDDY_UPDATE_MAX_METADATA_BYTES = 64 * 1024;
var WORKBUDDY_UPDATE_MAX_RELEASES_BYTES = 1024 * 1024;
function parseWorkBuddyVersion(raw) {
  if (typeof raw !== "string") return void 0;
  const normalized = raw.startsWith("v") ? raw.slice(1) : raw;
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u.exec(normalized);
  if (match === null) return void 0;
  const rawPrerelease = match[4] === void 0 ? [] : match[4].split(".");
  if (rawPrerelease.some((identifier) => /^\d+$/u.test(identifier) && !/^(0|[1-9]\d*)$/u.test(identifier))) return void 0;
  const prerelease = rawPrerelease.map((identifier) => /^(0|[1-9]\d*)$/u.test(identifier) ? Number(identifier) : identifier);
  if (prerelease.some((identifier) => typeof identifier === "number" && !Number.isSafeInteger(identifier))) return void 0;
  const parsed = {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease
  };
  return [parsed.major, parsed.minor, parsed.patch].every(Number.isSafeInteger) ? parsed : void 0;
}
function compareIdentifiers(left, right) {
  if (typeof left === "number" && typeof right === "number") return left < right ? -1 : left > right ? 1 : 0;
  if (typeof left === "number") return -1;
  if (typeof right === "number") return 1;
  return left < right ? -1 : left > right ? 1 : 0;
}
function compareWorkBuddyVersions(left, right) {
  const a = parseWorkBuddyVersion(left);
  const b = parseWorkBuddyVersion(right);
  if (a === void 0 || b === void 0) throw new TypeError("invalid WorkBuddy Connect version");
  for (const [aPart, bPart] of [[a.major, b.major], [a.minor, b.minor], [a.patch, b.patch]]) {
    if (aPart !== bPart) return aPart < bPart ? -1 : 1;
  }
  if (a.prerelease.length === 0 && b.prerelease.length !== 0) return 1;
  if (a.prerelease.length !== 0 && b.prerelease.length === 0) return -1;
  for (let index = 0; index < Math.max(a.prerelease.length, b.prerelease.length); index += 1) {
    const aPart = a.prerelease[index];
    const bPart = b.prerelease[index];
    if (aPart === void 0) return -1;
    if (bPart === void 0) return 1;
    const comparison = compareIdentifiers(aPart, bPart);
    if (comparison !== 0) return comparison;
  }
  return 0;
}

// src/plugin-updates.mjs
var packageName = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i;
var safeRef = /^[a-zA-Z0-9._/-]{1,200}$/;
function parsePluginSource(name, spec) {
  if (!packageName.test(name) || typeof spec !== "string" || spec.length > 600 || spec.startsWith("-") || spec.trim() !== spec || /[\x00-\x1f]/.test(spec)) return { kind: "unsupported" };
  const git = /^(?:github:|git\+https:\/\/github\.com\/|https:\/\/github\.com\/|git\+ssh:\/\/git@github\.com\/|git@github\.com:)?([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:#(.+))?$/.exec(spec);
  if (git && !spec.startsWith("@") && !spec.startsWith("file:") && !spec.startsWith("link:")) {
    const [, owner, repo, ref] = git;
    if (owner === "." || owner === ".." || repo === "." || repo === ".." || ref && (!safeRef.test(ref) || ref.includes(".."))) return { kind: "unsupported" };
    return { kind: "github", owner, repo, ref, source: `github:${owner}/${repo}${ref ? "#" + ref : ""}` };
  }
  if (/^(?:file:|link:|workspace:|https?:|git|\/|\.)/.test(spec)) return { kind: "unsupported" };
  const alias = /^npm:((?:@[^/]+\/)?[^@]+)(?:@(.+))?$/.exec(spec);
  const actual = alias?.[1] ?? name, range = alias?.[2] ?? spec;
  if (!packageName.test(actual) || !/^[a-zA-Z0-9.*^~<>=|+ -]{1,160}$/.test(range)) return { kind: "unsupported" };
  const channel = /^[a-zA-Z][\w.-]*$/.test(range);
  return { kind: "npm", package: actual, alias: !!alias, channel, tag: channel ? range : "latest", source: spec };
}
function githubCommit(value) {
  if (typeof value !== "string") return void 0;
  return /(?:\/tar\.gz\/|\/tarball\/|#)([a-f0-9]{40})(?:\b|\()/i.exec(value)?.[1]?.toLowerCase();
}
async function jsonFile(file) {
  try {
    return JSON.parse(await readFile2(file, "utf8"));
  } catch {
    return void 0;
  }
}
async function locks(dir) {
  let pnpm;
  try {
    pnpm = parseYaml(await readFile2(join4(dir, "pnpm-lock.yaml"), "utf8"), { maxAliasCount: 20 });
  } catch {
  }
  const npm = await jsonFile(join4(dir, "package-lock.json"));
  const times = await Promise.all(["pnpm-lock.yaml", "package-lock.json"].map((name) => stat(join4(dir, name)).then((s) => s.mtimeMs).catch(() => 0)));
  return { pnpm, npm, preferNpm: times[1] > times[0] };
}
async function publicJson(url, fetchImpl, signal) {
  const res = await fetchImpl(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(12e3)]),
    // Request only the SHA: the default JSON includes file patches and can be megabytes.
    headers: { Accept: "application/vnd.github.sha", "User-Agent": "dsh-multi-router-plugin-updates" },
    redirect: "error"
  });
  if (!res.ok) throw Error(res.status === 403 || res.status === 429 ? "\u8FDC\u7AEF\u9650\u6D41\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5" : res.status === 404 ? "\u4ED3\u5E93 / \u7248\u672C\u4E0D\u5B58\u5728\uFF0C\u6216\u9700\u8981\u79C1\u6709\u4ED3\u5E93\u6388\u6743" : `\u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25\uFF08HTTP ${res.status}\uFF09`);
  let size = 0, chunks = [];
  for await (const chunk of res.body) {
    size += chunk.byteLength;
    if (size > 256 * 1024) throw Error("\u66F4\u65B0\u5143\u6570\u636E\u8FC7\u5927");
    chunks.push(Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  return /^[a-f0-9]{40}$/i.test(text) ? { sha: text } : JSON.parse(text);
}
var short = (sha) => sha?.slice(0, 8);
var installFailed = (r) => !!(r.error || ["failed", "cancelled"].includes(r.application) || r.packageResult && r.packageResult.exitCode !== 0);
function installFailure(result) {
  const text = [result.error?.diagnostic, result.packageResult?.output, result.packageResult?.kind].filter((v) => typeof v === "string").join("\n");
  let reason = "unknown", message = "\u5B89\u88C5\u672A\u5B8C\u6210\uFF1B\u8BF7\u5728 DSH \u539F\u751F\u63D2\u4EF6\u9875\u67E5\u770B\u5B89\u88C5\u65E5\u5FD7\uFF0C\u6216\u590D\u5236\u4E0B\u65B9\u8BCA\u65AD\u4FE1\u606F\u3002";
  if (result.application === "cancelled") {
    reason = "cancelled";
    message = "\u5B89\u88C5\u5DF2\u53D6\u6D88\uFF0C\u53EF\u91CD\u65B0\u68C0\u67E5\u540E\u91CD\u8BD5\u3002";
  } else if (/ERR_PNPM_(?:MINIMUM_RELEASE_AGE_VIOLATION|NO_MATURE_MATCHING_VERSION)|minimumReleaseAge/i.test(text)) {
    reason = "release-age";
    message = "\u65B0\u7248\u672C\u5C1A\u5728\u5B89\u88C5\u5668\u7684\u65B0\u5305\u7B49\u5F85\u671F\u5185\u3002\u8F93\u5165\u5305\u540D\u53EF\u80FD\u9009\u4E2D\u65E7\u7248\uFF0C\u6307\u5B9A\u65B0\u7248\u672C\u53EF\u80FD\u88AB\u62D2\u7EDD\uFF1B\u8BF7\u7B49\u5F85\u7B56\u7565\u89C4\u5B9A\u7684\u65F6\u95F4\u540E\u91CD\u8BD5\uFF0C\u6216\u7531\u7528\u6237\u660E\u786E\u4E3A\u8BE5\u7248\u672C\u8BBE\u7F6E\u4F8B\u5916\u3002\u6362\u955C\u50CF\u6216\u91CD\u542F\u4E0D\u4F1A\u89E3\u9664\u6B64\u9650\u5236\u3002";
  } else if (result.pendingBuilds?.length) {
    reason = "build";
    message = "\u4F9D\u8D56\u6784\u5EFA\u811A\u672C\u9700\u8981\u6388\u6743\uFF0C\u8BF7\u5230 DSH \u63D2\u4EF6\u5B89\u88C5\u9875\u5141\u8BB8\u8FD9\u4E9B\u811A\u672C\u540E\u91CD\u8BD5\u3002";
  } else if (result.error?.code === "incompatible-version") {
    reason = "compatibility";
    message = "\u63D2\u4EF6\u4E0E\u5F53\u524D DSH \u4E0D\u517C\u5BB9\uFF0C\u8BF7\u5148\u5347\u7EA7 DSH \u6216\u9009\u62E9\u517C\u5BB9\u7248\u672C\u3002";
  } else if (/\b(?:EPERM|EBUSY|EACCES)\b|resource busy|file.*(?:locked|in use)/i.test(text)) {
    reason = "files";
    message = "\u63D2\u4EF6\u6587\u4EF6\u88AB\u5360\u7528\u6216\u76EE\u5F55\u6743\u9650\u4E0D\u8DB3\uFF0C\u5B89\u88C5\u672A\u5B8C\u6210\u3002\u8BF7\u5148\u5728 DSH \u505C\u7528\u8BE5\u63D2\u4EF6\u540E\u91CD\u8BD5\uFF0C\u5E76\u68C0\u67E5\u5B89\u88C5\u76EE\u5F55\u6743\u9650\uFF1B\u4ECD\u88AB\u5360\u7528\u65F6\u9700\u9000\u51FA\u6258\u76D8\u5E94\u7528\u3002";
  } else if (/HMR transactions cannot be nested|activation|did not activate|entry.*activate/i.test(text)) {
    reason = "activation";
    message = "\u63D2\u4EF6\u52A0\u8F7D\u5931\u8D25\u3002\u8BF7\u68C0\u67E5 DSH \u63D2\u4EF6\u9875\u7684\u7EC4\u4EF6\u9519\u8BEF\uFF0C\u518D\u5173\u95ED\u5E76\u91CD\u65B0\u542F\u7528\uFF1B\u5B89\u88C5\u4E0E\u52A0\u8F7D\u662F\u4E24\u4E2A\u72EC\u7ACB\u6B65\u9AA4\u3002";
  } else if (result.packageResult?.timedOut || /\b(?:ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN|ECONNREFUSED)\b|network|fetch|download/i.test(text)) {
    reason = "network";
    message = "\u63D2\u4EF6\u4E0B\u8F7D\u6216\u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25\uFF0C\u5B89\u88C5\u672A\u5B8C\u6210\u3002npm \u6765\u6E90\u53EF\u5207\u6362\u5230\u300Cnpm \u5B98\u65B9\u300D\u540E\u91CD\u8BD5\uFF1BGitHub \u6765\u6E90\u8BF7\u68C0\u67E5 GitHub \u7F51\u7EDC\u8FDE\u63A5\u3002";
  }
  const code = /\b(?:ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION|ERR_PNPM_NO_MATURE_MATCHING_VERSION|EPERM|EBUSY|EACCES|ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN|ECONNREFUSED)\b/.exec(text)?.[0] ?? (["operation-error", "incompatible-version"].includes(result.error?.code) ? result.error.code : "unknown");
  return { status: "failed", application: result.application, message, diagnostic: {
    reason,
    code,
    platform: process.platform,
    stage: reason === "activation" ? "activation" : "install",
    ...Number.isInteger(result.packageResult?.exitCode) ? { exitCode: result.packageResult.exitCode } : {}
  } };
}
async function registryVersion(service, profile, spec, signal, requestedRegistry) {
  const require2 = createRequire(profile.installAnchor);
  const { viewProfilePackage } = await import(pathToFileURL(require2.resolve("@deepseek-ai/dsh-plugin-manager/operations")).href);
  const { registryPlan } = await import(pathToFileURL(require2.resolve("@deepseek-ai/dsh-plugin-manager/registry")).href);
  for (const registry of registryPlan(requestedRegistry, await service.registries())) {
    const answer = await viewProfilePackage(profile.dir, spec, { ...profile.packageManager, registry, timeoutMs: 12e3, signal });
    if (signal.aborted) throw Error("\u68C0\u67E5\u5DF2\u53D6\u6D88");
    if (answer.exitCode !== 0) continue;
    const parsed = JSON.parse(answer.stdout), metadata = Array.isArray(parsed) ? parsed.at(-1) : parsed;
    if (metadata?.version) return metadata;
  }
  throw Error("npm \u67E5\u8BE2\u5931\u8D25\uFF1B\u8BF7\u68C0\u67E5 DSH \u7F51\u7EDC\u3001registry \u8BBE\u7F6E\u6216\u5305\u7684\u8BBF\u95EE\u6743\u9650");
}
async function refreshGitPlugin(service, profile, row, options2, signal) {
  const require2 = createRequire(profile.installAnchor);
  const { runProfilePnpm } = await import(pathToFileURL(require2.resolve("@deepseek-ai/dsh-plugin-manager/operations")).href);
  const { registryPlan, attributeFailure } = await import(pathToFileURL(require2.resolve("@deepseek-ai/dsh-plugin-manager/registry")).href);
  const { classifyInstallFailure } = await import(pathToFileURL(require2.resolve("@deepseek-ai/dsh-plugin-manager")).href);
  const plan = registryPlan(options2.registry, await service.registries());
  return withFileLock(join4(profile.dir, "package.json"), async () => {
    const files = await Promise.all(["package.json", "pnpm-lock.yaml"].map(async (name) => {
      const path = join4(profile.dir, name);
      try {
        return { path, content: await readFile2(path, "utf8") };
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
        return { path };
      }
    }));
    const restore = () => Promise.all(files.map((f) => f.content === void 0 ? rm2(f.path, { force: true }) : writeFileAtomic2(f.path, f.content, { mode: 384 })));
    if (JSON.parse(files[0].content).dependencies?.[row.name] !== row.spec) throw Error("\u5B89\u88C5\u6765\u6E90\u5DF2\u6539\u53D8\uFF0C\u8BF7\u91CD\u65B0\u68C0\u67E5");
    let result;
    try {
      for (const registry of plan) {
        signal.throwIfAborted();
        const run = await runProfilePnpm({ ...profile, profile: profile.name }, ["update", row.name, ...registry ? [`--registry=${registry}`] : []], {
          execution: "service",
          ...profile.packageManager,
          signal,
          outputBytes: 16384,
          idleTimeoutMs: 6e5,
          lookupTimeoutMs: 2e4,
          activateNewBundles: false
        });
        if (run.exitCode === 0 && !run.timedOut && !signal.aborted) return { packageResult: run, application: "restart-required" };
        const kind = classifyInstallFailure({ log: run.output, timedOut: run.timedOut });
        result = {
          packageResult: { ...run, kind },
          application: signal.aborted ? "cancelled" : "failed",
          ...run.incompatible?.length ? { error: { code: "incompatible-version" } } : {}
        };
        await restore();
        if (signal.aborted || attributeFailure(kind, run.output, { kind: "git", host: "github.com" }) !== "registry") break;
      }
      return result;
    } catch (e) {
      await restore();
      throw e;
    }
  }, { waitMs: 12e4 });
}
var PluginUpdates = class {
  constructor({ service = () => void 0, profile = () => void 0, hmr = () => void 0, fetchImpl = (...args) => fetch(...args), lookup = registryVersion, refreshGit = refreshGitPlugin, onInstalled, stateFile, now = Date.now } = {}) {
    this.stateFile = stateFile;
    this.now = now;
    this.dismissed = {};
    this.lastAttempt = 0;
    this.saveQueue = Promise.resolve();
    this.service = service;
    this.profile = profile;
    this.hmr = hmr;
    this.fetchImpl = fetchImpl;
    this.rows = [];
    this.abort = new AbortController();
    this.lookup = lookup;
    this.refreshGit = refreshGit;
    this.onInstalled = onInstalled;
  }
  async load() {
    const saved = this.stateFile && await jsonFile(this.stateFile);
    if (saved?.version === 1) {
      this.lastAttempt = Number.isFinite(saved.lastAttempt) ? saved.lastAttempt : 0;
      this.checkedAt = saved.checkedAt;
      this.dismissed = saved.dismissed && typeof saved.dismissed === "object" && !Array.isArray(saved.dismissed) ? saved.dismissed : {};
      this.rows = Array.isArray(saved.rows) ? saved.rows.filter((r) => ["github", "npm"].includes(r.source?.kind)) : [];
    }
  }
  persist() {
    if (!this.stateFile) return Promise.resolve();
    const saved = structuredClone({ version: 1, lastAttempt: this.lastAttempt, checkedAt: this.checkedAt, dismissed: this.dismissed, rows: this.rows.filter((r) => ["github", "npm"].includes(r.source.kind)) });
    this.saveQueue = this.saveQueue.catch(() => {
    }).then(() => writePrivateJson(this.stateFile, saved));
    return this.saveQueue;
  }
  reminderKey(row) {
    return JSON.stringify([row.name, row.source, row.version, row.latestVersion ?? row.latestCommit]);
  }
  reminders() {
    return this.rows.filter((r) => r.status === "available" && (!Object.hasOwn(this.dismissed, r.name) || this.dismissed[r.name] !== this.reminderKey(r))).map((r) => ({ key: this.reminderKey(r), name: r.name, version: r.version, latestVersion: r.latestVersion, latestCommit: r.latestCommit }));
  }
  async dismiss(keys) {
    if (!Array.isArray(keys) || keys.length > 200 || keys.some((k) => typeof k !== "string")) throw Error("\u65E0\u6548\u7684\u63D0\u9192\u5217\u8868");
    for (const row of this.reminders()) if (keys.includes(row.key)) Object.defineProperty(this.dismissed, row.name, { value: row.key, enumerable: true, configurable: true, writable: true });
    await this.persist();
  }
  async tick() {
    if (this.flight || !this.state().available) return;
    await this.list();
    if (this.abort.signal.aborted) return;
    if (this.flight || this.now() >= this.lastAttempt && this.now() - this.lastAttempt < 864e5) return;
    this.lastAttempt = this.now();
    await this.persist();
    if (!this.flight && !this.abort.signal.aborted) this.check();
  }
  state() {
    return {
      available: !!this.service()?.listBundles && !!this.profile()?.dir,
      checkedAt: this.checkedAt,
      reminders: this.reminders(),
      autoCheckHours: 24,
      rows: this.rows.map(({ spec, ...row }) => ({ ...row, source: row.source.kind === "unsupported" ? { kind: "unsupported" } : row.source })),
      job: this.job,
      error: this.error
    };
  }
  async list() {
    const service = this.service(), profile = this.profile();
    if (!service?.listBundles || !profile?.dir) {
      this.rows = [];
      return;
    }
    const [manifest, bundles, lock] = await Promise.all([jsonFile(join4(profile.dir, "package.json")), service.listBundles(), locks(profile.dir)]);
    if (!manifest) throw Error("\u5F53\u524D DSH \u914D\u7F6E\u7684\u63D2\u4EF6\u6E05\u5355\u65E0\u6CD5\u8BFB\u53D6");
    this.rows = bundles.filter((b) => (b.installed || b.version) && manifest.dependencies?.[b.name] && b.removable !== false).map((b) => {
      const spec = manifest.dependencies?.[b.name];
      const source = parsePluginSource(b.name, spec);
      const npm = lock.npm?.packages?.[`node_modules/${b.name}`]?.resolved;
      const pnpm = lock.pnpm?.importers?.["."]?.dependencies?.[b.name]?.version;
      const installed = lock.preferNpm ? npm ?? pnpm : pnpm ?? npm;
      const previous = this.rows.find((r) => r.name === b.name && r.spec === spec && r.version === b.version && r.commit === githubCommit(installed));
      return {
        ...previous,
        name: b.name,
        version: b.version,
        enabled: b.enabled,
        spec,
        source,
        commit: githubCommit(installed),
        status: previous?.status ?? (source.kind === "unsupported" ? "unsupported" : "unchecked"),
        ...source.kind === "unsupported" ? { message: "\u672C\u5730\u6587\u4EF6 / \u94FE\u63A5\u6765\u6E90\uFF0C\u8BF7\u901A\u8FC7\u539F\u5B89\u88C5\u65B9\u5F0F\u66F4\u65B0" } : {}
      };
    });
  }
  async checkRow(row) {
    try {
      if (row.source.kind === "npm") {
        const spec = `${row.source.package}@${row.source.tag}`;
        const found = await this.lookup(this.service(), this.profile(), spec, this.abort.signal);
        if (!found.version || found.problem && found.problem !== "already-installed") throw Error(found.problem === "not-found" ? "npm \u4E2D\u672A\u627E\u5230\u8BE5\u5305\u6216\u9891\u9053" : "npm \u67E5\u8BE2\u5931\u8D25\uFF1B\u8BF7\u68C0\u67E5 DSH \u7684\u7F51\u7EDC\u4E0E registry \u8BBE\u7F6E");
        if (!parseWorkBuddyVersion(found.version) || row.version && !parseWorkBuddyVersion(row.version)) throw Error("\u65E0\u6CD5\u6BD4\u8F83\u7248\u672C\u53F7");
        row.latestVersion = found.version;
        row.target = `${row.name}@${row.source.alias ? `npm:${row.source.package}@` : ""}${row.source.channel ? row.source.tag : found.version}`;
        row.status = !row.version || compareWorkBuddyVersions(found.version, row.version) > 0 ? "available" : "current";
        row.message = !row.version ? "\u5B89\u88C5\u6587\u4EF6\u4E0D\u53EF\u8BFB\uFF0C\u53EF\u91CD\u65B0\u5B89\u88C5\u8BE5\u6765\u6E90\u4FEE\u590D" : row.status === "current" ? "\u5F53\u524D\u7248\u672C\u5DF2\u662F\u8BE5\u9891\u9053\u6700\u65B0\uFF0C\u6216\u9AD8\u4E8E\u8BE5\u9891\u9053" : void 0;
      } else if (row.source.kind === "github") {
        const { owner, repo, ref } = row.source;
        const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(ref ?? "HEAD")}`;
        const found = await publicJson(url, this.fetchImpl, this.abort.signal);
        if (!/^[a-f0-9]{40}$/i.test(found.sha)) throw Error("GitHub \u8FD4\u56DE\u65E0\u6548\u63D0\u4EA4\u4FE1\u606F");
        row.latestCommit = found.sha.toLowerCase();
        row.target = `${row.name}@${row.spec}`;
        row.status = row.commit === row.latestCommit ? "current" : "available";
        row.message = row.commit ? row.status === "available" ? `\u63D0\u4EA4 ${short(row.commit)} \u2192 ${short(row.latestCommit)}` : "\u8BE5\u5206\u652F / \u6807\u7B7E\u7684\u63D0\u4EA4\u5DF2\u540C\u6B65" : "\u65E0\u6CD5\u8BFB\u53D6\u672C\u5730 Git \u63D0\u4EA4\uFF0C\u53EF\u91CD\u65B0\u5B89\u88C5\u5DF2\u68C0\u67E5\u7684\u6765\u6E90";
        if (ref && /^[a-f0-9]{7,40}$/i.test(ref)) {
          row.status = "pinned";
          row.message = "\u5B89\u88C5\u6765\u6E90\u56FA\u5B9A\u5728 Git \u63D0\u4EA4\uFF1B\u4FDD\u7559\u6B64\u63D0\u4EA4\uFF0C\u4E0D\u81EA\u52A8\u5207\u6362\u5206\u652F";
        }
      }
      row.checkedAt = Date.now();
      row.checkedEnabled = row.enabled;
    } catch (error) {
      row.status = "failed";
      row.message = error.message;
      delete row.target;
    }
  }
  start(kind, task) {
    if (this.flight) throw Error("\u5DF2\u6709\u63D2\u4EF6\u64CD\u4F5C\u6B63\u5728\u6267\u884C\uFF0C\u8BF7\u7B49\u5F85\u5B8C\u6210");
    this.job = { id: randomUUID(), kind, state: "running", startedAt: Date.now(), results: [], total: 0 };
    this.error = void 0;
    this.flight = Promise.resolve().then(() => task(this.job)).then(() => {
      this.job.state = this.job.cancelRequested ? "cancelled" : "done";
    }, (e) => {
      this.job.state = this.job.cancelRequested ? "cancelled" : "failed";
      this.job.message = e.message;
    }).finally(async () => {
      this.job.finishedAt = Date.now();
      try {
        await this.persist();
      } catch {
        this.error = "\u66F4\u65B0\u68C0\u67E5\u8BB0\u5F55\u672A\u80FD\u4FDD\u5B58\uFF0C\u8BF7\u68C0\u67E5\u672C\u5730\u76EE\u5F55\u6743\u9650";
      }
      this.flight = void 0;
    });
  }
  check() {
    this.start("check", async (job) => {
      this.lastAttempt = this.now();
      await this.persist();
      await this.list();
      const rows = this.rows.filter((r) => ["npm", "github"].includes(r.source.kind));
      job.total = rows.length;
      let next = 0;
      await Promise.all(Array.from({ length: Math.min(3, rows.length) }, async () => {
        while (next < rows.length && !job.cancelRequested) {
          const row = rows[next++];
          await this.checkRow(row);
          job.results.push({ name: row.name, status: row.status, message: row.message });
        }
      }));
      this.checkedAt = Date.now();
    });
  }
  async installRow(row, registry) {
    const original = await jsonFile(join4(this.profile().dir, "package.json"));
    if (original?.dependencies?.[row.name] !== row.spec) throw Error("\u5B89\u88C5\u6765\u6E90\u5DF2\u6539\u53D8\uFF0C\u8BF7\u91CD\u65B0\u68C0\u67E5");
    const current = (await this.service().listBundles()).find((b) => b.name === row.name);
    if (!current || current.enabled !== row.checkedEnabled || current.version !== row.version) throw Error("\u63D2\u4EF6\u7248\u672C\u6216\u542F\u7528\u72B6\u6001\u5DF2\u6539\u53D8\uFF0C\u8BF7\u91CD\u65B0\u68C0\u67E5");
    const options2 = { enabled: row.enabled, requestId: this.job.id, ...registry ? { registry } : {} };
    let result;
    if (row.source.kind === "github") {
      this.gitAbort = new AbortController();
      try {
        result = await this.refreshGit(this.service(), this.profile(), row, options2, AbortSignal.any([this.abort.signal, this.gitAbort.signal]));
      } finally {
        this.gitAbort = void 0;
      }
    } else result = await outsideActivation(this.hmr(), () => this.service().installBundle(row.target, options2));
    if (installFailed(result)) return { name: row.name, ...installFailure(result), expectedVersion: row.latestVersion };
    const installed = (await this.service().listBundles()).find((b) => b.name === row.name);
    if (row.source.kind === "npm" && installed?.version !== row.latestVersion) return {
      name: row.name,
      status: "failed",
      message: `\u5B9E\u9645\u5B89\u88C5\u7248\u672C ${installed?.version ?? "\u672A\u77E5"} \u4E0E\u68C0\u67E5\u7248\u672C ${row.latestVersion} \u4E0D\u540C\uFF1B\u8BF7\u7A0D\u540E\u91CD\u65B0\u68C0\u67E5\uFF0C\u53EF\u80FD\u662F\u955C\u50CF\u5C1A\u672A\u540C\u6B65\u6216\u53D1\u884C\u65F6\u95F4\u9650\u5236`
    };
    if (row.source.kind === "github") {
      const lock = await locks(this.profile().dir);
      const pnpm = lock.pnpm?.importers?.["."]?.dependencies?.[row.name]?.version, npm = lock.npm?.packages?.[`node_modules/${row.name}`]?.resolved;
      if (githubCommit(lock.preferNpm ? npm ?? pnpm : pnpm ?? npm) !== row.latestCommit) return {
        name: row.name,
        status: "failed",
        restartRequired: true,
        message: "\u5B9E\u9645 Git \u63D0\u4EA4\u4E0E\u68C0\u67E5\u7ED3\u679C\u4E0D\u4E00\u81F4\uFF0C\u8BF7\u91CD\u65B0\u68C0\u67E5\u540E\u91CD\u8BD5\uFF1B\u4E0D\u628A\u4ECD\u505C\u7559\u5728\u65E7\u9501\u6587\u4EF6\u7684\u5B89\u88C5\u62A5\u544A\u4E3A\u6210\u529F"
      };
    }
    const reloadPending = result.application === "restart-required" && this.onInstalled?.(row.name) === true;
    return { name: row.name, status: "installed", application: reloadPending ? "reload-pending" : result.application, message: reloadPending ? "\u5DF2\u5B89\u88C5\uFF0C\u7B49\u5F85\u5F53\u524D\u64CD\u4F5C\u7ED3\u675F\u540E\u81EA\u52A8\u52A0\u8F7D\uFF1B\u8FD0\u884C\u7248\u672C\u89C1\u9762\u677F\u9876\u90E8" : result.application === "restart-required" ? "\u5DF2\u5B89\u88C5\uFF0C\u5B8C\u5168\u9000\u51FA\u5E76\u91CD\u65B0\u6253\u5F00 DSH \u540E\u751F\u6548" : "\u5B89\u88C5\u5B8C\u6210", restartRequired: !reloadPending && result.application === "restart-required" };
  }
  update(names, registry) {
    if (!Array.isArray(names) || !names.length || names.length > 200 || names.some((n) => typeof n !== "string") || new Set(names).size !== names.length) throw Error("\u8BF7\u9009\u62E9\u8981\u66F4\u65B0\u7684\u63D2\u4EF6");
    const selected = names.map((name) => this.rows.find((r) => r.name === name));
    if (selected.some((r) => !r || !["available", "failed"].includes(r.status) || !r.target || Date.now() - r.checkedAt > 6e5)) throw Error("\u8BF7\u5148\u68C0\u67E5\u66F4\u65B0\uFF0C\u518D\u9009\u62E9\u53EF\u66F4\u65B0\u7684\u63D2\u4EF6\uFF08\u68C0\u67E5\u7ED3\u679C\u6709\u6548\u671F 10 \u5206\u949F\uFF09");
    selected.sort((a, b) => Number(a.name === "dsh-multi-router") - Number(b.name === "dsh-multi-router"));
    this.start("update", async (job) => {
      job.total = selected.length;
      for (const row of selected) {
        if (job.cancelRequested) break;
        job.current = row.name;
        let result;
        try {
          result = await this.installRow(row, registry);
        } catch (e) {
          result = { name: row.name, status: "failed", message: e.message };
        }
        job.results.push(result);
        row.status = result.status;
        row.message = result.message;
      }
      delete job.current;
      await this.list();
    });
  }
  install(spec, registry) {
    if (typeof spec !== "string" || spec.length > 600 || spec.startsWith("-") || /[\s\x00-\x1f]/.test(spec)) throw Error("\u8BF7\u8F93\u5165\u4E00\u4E2A npm \u5305\u540D\u6216 GitHub \u5B89\u88C5\u5730\u5740");
    const named = /^((?:@[^/]+\/)?[^@]+)(?:@(.+))?$/.exec(spec);
    const github = parsePluginSource("placeholder", spec);
    const npm = named && parsePluginSource(named[1], named[2] || "latest");
    if (github.kind !== "github" && npm?.kind !== "npm") throw Error("\u4EC5\u652F\u6301 npm \u5305\u540D / \u7248\u672C\u6216 github:\u7528\u6237/\u4ED3\u5E93");
    this.start("install", async (job) => {
      job.total = 1;
      job.current = spec;
      let expected;
      if (npm?.kind === "npm" && github.kind !== "github") {
        const found = await this.lookup(this.service(), this.profile(), `${npm.package}@${named[2] || "latest"}`, this.abort.signal, registry);
        if (!parseWorkBuddyVersion(found.version)) throw Error("npm \u672A\u8FD4\u56DE\u6709\u6548\u7248\u672C\uFF0C\u8BF7\u68C0\u67E5\u5B89\u88C5\u6E90\u540E\u91CD\u8BD5");
        expected = found.version;
      }
      const result = await outsideActivation(this.hmr(), () => this.service().installBundle(spec, { requestId: job.id, ...registry ? { registry } : {} }));
      if (installFailed(result)) {
        job.results.push({ name: result.bundle ?? spec, ...installFailure(result), expectedVersion: expected });
        delete job.current;
        await this.list();
        return;
      }
      const installed = (await this.service().listBundles()).find((b) => b.name === (result.bundle ?? named?.[1]));
      if (expected && installed?.version !== expected) {
        job.results.push({
          name: result.bundle ?? named[1],
          status: "failed",
          expectedVersion: expected,
          installedVersion: installed?.version,
          message: `\u5B9E\u9645\u5B89\u88C5\u7248\u672C ${installed?.version ?? "\u672A\u77E5"} \u4E0E\u68C0\u67E5\u7248\u672C ${expected} \u4E0D\u540C\uFF1B\u8BF7\u5207\u6362\u300Cnpm \u5B98\u65B9\u300D\u540E\u91CD\u65B0\u68C0\u67E5\u5E76\u5B89\u88C5\u6307\u5B9A\u7248\u672C\u3002`
        });
        delete job.current;
        await this.list();
        return;
      }
      const reloadPending = !result.error && result.packageResult?.exitCode === 0 && result.application === "restart-required" && this.onInstalled?.(result.bundle) === true;
      job.results.push({
        name: result.bundle ?? spec,
        status: result.error || ["failed", "cancelled"].includes(result.application) || result.packageResult && result.packageResult.exitCode !== 0 ? "failed" : "installed",
        message: result.error ? `\u5B89\u88C5\u672A\u5B8C\u6210\uFF08${result.error.code}\uFF09\uFF0C\u8BF7\u67E5\u770B DSH \u63D2\u4EF6\u5B89\u88C5\u65E5\u5FD7` : reloadPending ? "\u5DF2\u5B89\u88C5\uFF0C\u7B49\u5F85\u5F53\u524D\u64CD\u4F5C\u7ED3\u675F\u540E\u81EA\u52A8\u52A0\u8F7D" : result.application === "restart-required" ? "\u5DF2\u5B89\u88C5\uFF0C\u8BF7\u5B8C\u5168\u9000\u51FA\u5E76\u91CD\u542F DSH" : "\u5B89\u88C5\u5B8C\u6210",
        application: reloadPending ? "reload-pending" : result.application,
        pendingBuilds: result.pendingBuilds ?? [],
        restartRequired: !reloadPending && result.application === "restart-required"
      });
      delete job.current;
      await this.list();
    });
  }
  async action(input) {
    if (!this.state().available) throw Error("\u5F53\u524D DSH \u672A\u63D0\u4F9B\u63D2\u4EF6\u7BA1\u7406\u63A5\u53E3\uFF0C\u8BF7\u5347\u7EA7 DSH \u540E\u91CD\u8BD5");
    if (input.registry && !["https://registry.npmjs.org/", "https://registry.npmmirror.com/"].includes(input.registry)) throw Error("\u65E0\u6548\u7684 npm \u6765\u6E90");
    if (input.action === "plugins.list") {
      if (!this.flight) await this.list();
    } else if (input.action === "plugins.dismiss") await this.dismiss(input.keys);
    else if (input.action === "plugins.check") this.check();
    else if (input.action === "plugins.update") this.update(input.names, input.registry);
    else if (input.action === "plugins.install") this.install(input.spec, input.registry);
    else if (input.action === "plugins.cancel") {
      if (this.job?.state === "running") {
        this.job.cancelRequested = true;
        if (this.gitAbort) this.gitAbort.abort();
        else if (this.job.kind !== "check") await this.service().cancelInstall?.(this.job.id);
      }
    } else throw Error("\u672A\u77E5\u63D2\u4EF6\u64CD\u4F5C");
  }
};

// src/workbuddy-login.mjs
import { randomBytes as randomBytes2 } from "node:crypto";
import { readFile as readFile3 } from "node:fs/promises";
import { withFileLock as withFileLock2 } from "@deepseek-ai/dsh-atomic-write";
var WorkBuddyLogin = class {
  constructor(file, { fetchImpl = (...args) => fetch(...args), now = Date.now } = {}) {
    this.file = file;
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.abort = new AbortController();
    this.abort.signal.addEventListener("abort", () => this.finish(), { once: true });
  }
  async reserve(field, ms) {
    await withFileLock2(this.file, async () => {
      let state = {};
      try {
        state = JSON.parse(await readFile3(this.file, "utf8"));
      } catch (e) {
        if (e.code !== "ENOENT") throw Error("\u767B\u5F55\u51B7\u5374\u8BB0\u5F55\u4E0D\u53EF\u8BFB\uFF0C\u8BF7\u68C0\u67E5\u672C\u673A\u6587\u4EF6");
      }
      if (state.pausedUntil > this.now() || state[field] > this.now()) throw Error("\u8BF7\u6C42\u51B7\u5374\u4E2D\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\uFF1B\u5E73\u53F0\u9650\u5236\u8BF7\u5728\u5B98\u65B9\u5BA2\u6237\u7AEF\u5904\u7406");
      state[field] = this.now() + ms;
      await writePrivateJson(this.file, state);
    });
  }
  async pause() {
    this.pending = void 0;
    await withFileLock2(this.file, async () => {
      const state = JSON.parse(await readFile3(this.file, "utf8"));
      state.pausedUntil = this.now() + 15 * 6e4;
      await writePrivateJson(this.file, state);
    });
  }
  async post(path, body) {
    let response;
    try {
      response = await this.fetchImpl(`https://www.workbuddy.cn/v2/plugin/login/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", Origin: "https://www.workbuddy.cn", Referer: "https://www.workbuddy.cn/" },
        body: JSON.stringify(body),
        signal: AbortSignal.any([this.abort.signal, AbortSignal.timeout(3e4)]),
        redirect: "error"
      });
    } catch {
      throw Error("\u767B\u5F55\u8BF7\u6C42\u672A\u5B8C\u6210\uFF0C\u8BF7\u7A0D\u540E\u624B\u52A8\u91CD\u8BD5\uFF1B\u4E0D\u4F1A\u81EA\u52A8\u91CD\u53D1\u77ED\u4FE1");
    }
    if ([403, 429].includes(response.status)) {
      await this.pause();
      throw Error("\u5E73\u53F0\u9650\u5236\u6216\u9700\u8981\u9A8C\u8BC1\uFF0C\u5DF2\u6682\u505C\u767B\u5F55\u8BF7\u6C42\uFF0C\u8BF7\u4F7F\u7528\u5B98\u65B9\u5BA2\u6237\u7AEF");
    }
    if (!response.ok) throw Error("\u5B98\u65B9\u767B\u5F55\u670D\u52A1\u6682\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
    let result;
    try {
      result = JSON.parse(await readLimitedText(response, 256 * 1024, "Login"));
    } catch {
      throw Error("\u767B\u5F55\u54CD\u5E94\u65E0\u6CD5\u8BC6\u522B\uFF0C\u8BF7\u4F7F\u7528\u5B98\u65B9\u5BA2\u6237\u7AEF");
    }
    if (result?.code !== 0) {
      if ([403, 429].includes(result?.code) || /频繁|图形验证码|滑块|安全验证|captcha|risk|too many|frequent|验证失败次数/i.test(result?.msg || "")) {
        await this.pause();
        throw Error("\u5E73\u53F0\u9650\u5236\u6216\u9700\u8981\u9A8C\u8BC1\uFF0C\u5DF2\u6682\u505C\u767B\u5F55\u8BF7\u6C42\uFF0C\u8BF7\u4F7F\u7528\u5B98\u65B9\u5BA2\u6237\u7AEF");
      }
      throw Error(path === "token" ? "\u767B\u5F55\u672A\u6210\u529F\uFF0C\u8BF7\u68C0\u67E5\u9A8C\u8BC1\u7801\u662F\u5426\u6B63\u786E\u3001\u8FC7\u671F\uFF1B\u4EC5\u652F\u6301\u5DF2\u6709\u8D26\u53F7" : "\u77ED\u4FE1\u672A\u53D1\u9001\u6210\u529F\uFF0C\u8BF7\u786E\u8BA4\u5DF2\u6709\u8D26\u53F7\u53CA\u624B\u673A\u53F7\uFF0C\u6216\u4F7F\u7528\u5B98\u65B9\u5BA2\u6237\u7AEF");
    }
    return result.data ?? {};
  }
  async send(phone) {
    if (typeof phone !== "string" || !/^1[3-9]\d{9}$/.test(phone)) throw Error("\u8BF7\u8F93\u5165 11 \u4F4D\u4E2D\u56FD\u5927\u9646\u624B\u673A\u53F7");
    if (this.flight) throw Error("\u767B\u5F55\u8BF7\u6C42\u6B63\u5728\u5904\u7406\u4E2D");
    this.flight = (async () => {
      await this.reserve("smsAt", 6e4);
      this.pending = void 0;
      const data = await this.post("send-sms", { phone });
      const expires = Math.min(300, Math.max(1, Number(data.expires_in) || 300)) * 1e3;
      this.pending = { phone, challenge: randomBytes2(24).toString("hex"), expiresAt: this.now() + expires, attempts: 0 };
      clearTimeout(this.expiryTimer);
      this.expiryTimer = setTimeout(() => this.finish(), expires);
      this.expiryTimer.unref();
      return { challenge: this.pending.challenge, expiresAt: this.pending.expiresAt, resendAt: this.now() + 6e4 };
    })();
    try {
      return await this.flight;
    } finally {
      this.flight = void 0;
    }
  }
  async complete(challenge, code, verify = true) {
    if (typeof challenge !== "string" || !this.pending || challenge !== this.pending.challenge || this.pending.expiresAt <= this.now()) throw Error("\u672C\u6B21\u767B\u5F55\u5DF2\u8FC7\u671F\u6216\u63D2\u4EF6\u5DF2\u91CD\u542F\uFF0C\u8BF7\u91CD\u65B0\u83B7\u53D6\u9A8C\u8BC1\u7801");
    if (this.flight) throw Error("\u767B\u5F55\u8BF7\u6C42\u6B63\u5728\u5904\u7406\u4E2D");
    if (this.pending.document) return this.pending;
    if (typeof code !== "string" || !/^\d{4,8}$/.test(code) || typeof verify !== "boolean") throw Error("\u8BF7\u8F93\u5165\u6536\u5230\u7684\u77ED\u4FE1\u9A8C\u8BC1\u7801");
    if (this.pending.attempts >= 5) throw Error("\u672C\u6B21\u9A8C\u8BC1\u7801\u5C1D\u8BD5\u6B21\u6570\u5DF2\u8FBE\u4E0A\u9650\uFF0C\u8BF7\u7A0D\u540E\u91CD\u65B0\u83B7\u53D6");
    this.flight = (async () => {
      await this.reserve("loginAt", 5e3);
      const pending = this.pending;
      pending.attempts++;
      const data = await this.post("token", { login_method: "phone", phone: pending.phone, sms_code: code });
      const accessToken = data.accessToken || data.access_token, refreshToken = data.refreshToken || data.refresh_token;
      let token;
      try {
        token = workbuddyToken(accessToken);
      } catch {
        throw Error("\u767B\u5F55\u8FD4\u56DE\u7684\u4EE4\u724C\u4E0D\u5C5E\u4E8E WorkBuddy \u4E2D\u56FD\u7248\uFF0C\u8BF7\u4F7F\u7528\u5B98\u65B9\u5BA2\u6237\u7AEF");
      }
      if (typeof refreshToken !== "string" || !refreshToken || !Number.isFinite(token.exp) || token.exp * 1e3 <= this.now()) throw Error("\u767B\u5F55\u54CD\u5E94\u7F3A\u5C11\u6709\u6548\u51ED\u8BC1\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55");
      let credential = { accessToken, refreshToken, uid: token.sub, expiresAtMs: token.exp * 1e3, domain: "www.workbuddy.cn", source: "dsh" };
      if (verify) {
        try {
          const rotated = await refreshWorkBuddyCheckinCredential(credential, { fetchImpl: this.fetchImpl, signal: AbortSignal.any([this.abort.signal, AbortSignal.timeout(3e4)]) });
          credential = {
            ...credential,
            accessToken: rotated.accessToken,
            refreshToken: rotated.refreshToken || credential.refreshToken,
            expiresAtMs: Date.now() + rotated.expiresInSec * 1e3
          };
        } catch {
          pending.warning = "\u767B\u5F55\u51ED\u8BC1\u5DF2\u4FDD\u5B58\uFF0C\u4F46\u5237\u65B0\u4EE4\u724C\u9A8C\u8BC1\u672A\u901A\u8FC7\uFF1B\u8BF7\u7A0D\u540E\u5728\u8D26\u53F7\u8BE6\u60C5\u68C0\u67E5\u767B\u5F55\u6709\u6548\u671F\u3002";
        }
      }
      delete pending.phone;
      pending.document = { version: 1, credential };
      return pending;
    })();
    try {
      return await this.flight;
    } finally {
      this.flight = void 0;
    }
  }
  finish() {
    clearTimeout(this.expiryTimer);
    this.pending = void 0;
  }
};

// src/manager.mjs
var MANAGEMENT_PATH = "/.well-known/dsh-multi-router";
var SUMMARY_PATH = `${MANAGEMENT_PATH}/summary`;
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
    ...contextInfo(row),
    maxTokens: Math.min(finite(row.maxTokens, 32e3), contextInfo(row).maxContextWindow),
    supportsImages: row.supportsImages === true || row.multimodal === true || row.input?.includes("image") === true,
    ...reasoning ? { reasoning } : {},
    ...billing ? { billing } : {},
    ...typeof row.creditMultiplier === "number" && Number.isFinite(row.creditMultiplier) && row.creditMultiplier >= 0 ? { creditMultiplier: row.creditMultiplier } : {},
    ...Array.isArray(row.promotions) ? { promotions: row.promotions.map((p) => ({ start: p.start, end: p.end, factor: p.factor, priority: p.priority, label: typeof p.label === "string" ? p.label : "" })) } : {}
  };
}
var Manager = class {
  constructor(file, router, onChange = () => {
  }, pluginAccess = {}) {
    this.file = file;
    this.router = router;
    this.onChange = onChange;
    this.catalogFile = join5(dirname3(file), "catalogs.json");
    this.catalogs = /* @__PURE__ */ new Map();
    this.catalogErrors = /* @__PURE__ */ new Map();
    this.refreshes = /* @__PURE__ */ new Map();
    this.closed = false;
    this.monitorFlights = /* @__PURE__ */ new Map();
    this.loginInfo = /* @__PURE__ */ new Map();
    this.telemetry = new Telemetry(join5(dirname3(file), "usage.json"));
    this.plugins = new PluginUpdates({ ...pluginAccess, stateFile: join5(dirname3(file), "plugin-updates.json"), onInstalled: (name) => {
      if (name !== "dsh-multi-router" || !this.runtime?.canReload()) return false;
      this.runtime.schedule();
      return true;
    } });
    this.checkins = new Checkins(join5(dirname3(file), "checkins.json"), this);
    this.workbuddyLogin = new WorkBuddyLogin(join5(dirname3(file), "workbuddy-login.json"), { fetchImpl: pluginAccess.fetchImpl });
    this.setupFile = join5(dirname3(file), "initial-setup.json");
    this.api = new ApiService(join5(dirname3(file), "api-service.json"), this);
    router.telemetry = this.telemetry;
    router.monitor = (a) => this.monitorAccount(a, { maxAgeMs: 6e4 });
    router.prepareFree = () => this.checkFreeModels(true);
    router.freeModels = (account) => this.freeModels(account);
  }
  async load() {
    this.raw = JSON.parse(await readFile4(this.file, "utf8"));
    try {
      this.setup = JSON.parse(await readFile4(this.setupFile, "utf8"));
    } catch {
      this.setup = void 0;
    }
    this.config = validateConfig(this.raw, this.file);
    await this.checkins.load();
    await this.plugins.load();
    try {
      const saved = JSON.parse(await readFile4(this.catalogFile, "utf8"));
      for (const account of this.config.accounts) {
        const item = saved[account.id];
        if (item?.credentialFile === account.credentialFile && Array.isArray(item.models)) {
          this.catalogs.set(account.id, { ...item, ...item.contextVersion !== 1 ? { fetchedAt: 0 } : {}, models: item.models.filter((m) => typeof m.id === "string" && m.id.length > 0).map(modelInfo) });
        }
      }
    } catch {
    }
    this.telemetry.configure(this.config.usageRetentionDays);
    await this.telemetry.load();
    await this.api.load();
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
      await withFileLock3(this.file, async () => {
        if (this.closed) return;
        let raw = JSON.parse(await readFile4(this.file, "utf8"));
        let changed = false;
        const saved = /* @__PURE__ */ new Map();
        for (const item of discovered.accounts) {
          const key = localAccountKey(item.provider, item.document);
          if (!force && raw.ignoredLocalAccounts?.some((k) => normalizeLocalAccountKey(k) === key)) continue;
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
          const id = existing?.id ?? `local_${createHash("sha256").update(key).digest("hex").slice(0, 20)}`;
          const recordSaved = () => {
            if (!saved.has(item.provider)) saved.set(item.provider, /* @__PURE__ */ new Set());
            saved.get(item.provider).add(id);
          };
          let sameDevice = true;
          if (existing && item.identityDocument) {
            try {
              const identity = await jsonCredential(existing.identityFile);
              sameDevice = identity.machineId === item.identityDocument.machineId && identity.deviceId === item.identityDocument.deviceId;
            } catch {
              sameDevice = false;
            }
          }
          if (existing && sameDevice && current.credential.expiresAtMs >= item.document.credential.expiresAtMs) {
            recordSaved();
            continue;
          }
          const base = join5(dirname3(this.file), "accounts");
          await mkdir2(base, { recursive: true, mode: 448 });
          const staging = await mkdtemp2(join5(base, `${id}-`));
          try {
            const credentialFile = join5(staging, "credential.json"), identityFile = join5(staging, "identity.json");
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
            next.ignoredLocalAccounts = (raw.ignoredLocalAccounts ?? []).filter((k) => normalizeLocalAccountKey(k) !== key);
            validateConfig(next, this.file);
            await writePrivateJson(this.file, next);
            raw = next;
            changed = true;
            recordSaved();
            this.router.clients.delete(id);
            this.catalogs.delete(id);
            this.catalogErrors.delete(id);
          } catch (e) {
            await rm3(staging, { recursive: true, force: true });
            this.localDiscovery = this.localDiscovery.map((s) => s.provider === item.provider ? { ...s, state: "unreadable", code: "import_failed" } : s);
          }
        }
        if (changed) {
          this.raw = raw;
          this.config = validateConfig(raw, this.file);
          await Promise.all(this.config.accounts.map((a) => this.readLogin(a)));
          this.publish();
        }
        this.localDiscovery = this.localDiscovery.map((s) => discovered.status.some((d) => d.provider === s.provider) ? { ...s, savedCount: saved.get(s.provider)?.size ?? 0 } : s);
      }, { waitMs: 3e4 });
    })().finally(() => {
      this.localScan = void 0;
    });
    return this.localScan;
  }
  async finishInitialSetup() {
    if (this.setup?.completedAt) return;
    await withFileLock3(this.setupFile, async () => {
      try {
        this.setup = JSON.parse(await readFile4(this.setupFile, "utf8"));
      } catch {
      }
      if (this.setup?.completedAt) return;
      this.setup = { completedAt: Date.now(), dismissed: false };
      await writePrivateJson(this.setupFile, this.setup);
    });
  }
  async monitorAccount(account, { force = false, maxAgeMs = 3e5 } = {}) {
    if (this.monitorFlights.has(account.id)) return this.monitorFlights.get(account.id);
    const cached = this.telemetry.row("accounts", account.id).balance;
    const last = cached?.error ? cached.attemptedAt : cached?.fetchedAt;
    const ttl = cached?.error ? 3e5 : maxAgeMs;
    if (!force && Number.isFinite(last) && Date.now() >= last && Date.now() - last < ttl) return;
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
  async monitorAll(provider, options2) {
    await Promise.all(this.config.accounts.filter((a) => (!provider || a.provider === provider) && (options2?.force || a.enabled !== false)).map((a) => this.monitorAccount(a, options2)));
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
        group.models.push({ model, provider: account.provider, accountId: account.id });
        group.targets.push({ provider: account.provider, account: account.id, model: model.id });
        group.accountNames.push(account.name ?? account.id);
      }
    }
    return [...groups.values()].map(({ models, ...group }) => {
      const preference = row.freeModels?.[group.id] ?? {};
      const context = resolveContext(models.map((s) => s.model), preference.contextWindow ?? (row.contextMode === "custom" ? row.contextWindow : null), row.contextWindow);
      const eligible = models.filter((s) => contextInfo(s.model).maxContextWindow >= context.contextWindow);
      const eligibleAccountIds = eligible.map((s) => s.accountId);
      const reasoning = routeReasoning(eligible);
      const selected = preference.reasoningEffort;
      return {
        ...group,
        ...context,
        eligibleAccountIds,
        targets: group.targets.filter((t) => eligibleAccountIds.includes(t.account)),
        accountNames: group.accountNames.filter((_, i) => eligibleAccountIds.includes(models[i].accountId)),
        enforceContext: true,
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
        supportsImages: eligible.every(({ model }) => model.supportsImages),
        maxTokens: Math.min(row.maxTokens, context.contextWindow, ...eligible.map(({ model }) => model.maxTokens))
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
    const routes = Object.fromEntries(this.routeModels().map((row) => [row.id, row]));
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
        if (!rows.has(model.id)) rows.set(model.id, []);
        rows.get(model.id).push(model);
      }
    }
    return [...rows.values()].map((models) => {
      const model = models[0], preference = this.config.models[provider]?.[model.id] ?? {};
      const context = resolveContext(models, preference.contextWindow);
      const eligible = models.filter((m) => contextInfo(m).maxContextWindow >= context.contextWindow);
      const reasoning = routeReasoning(eligible.map((model2) => ({ model: model2, provider })));
      const selected = preference.reasoningEffort;
      return {
        ...model,
        ...context,
        enforceContext: true,
        name: preference.name ?? model.name,
        reasoning,
        supportsImages: preference.supportsImages !== false && eligible.every((m) => m.supportsImages),
        imageCapable: eligible.every((m) => m.supportsImages),
        ...selected && reasoning?.supportedEfforts.includes(selected) ? { reasoningEffort: selected } : {},
        configuredEffort: selected ?? null,
        effortUnavailable: !!selected && !reasoning?.supportedEfforts.includes(selected),
        maxTokens: Math.min(context.contextWindow, ...eligible.map((m) => m.maxTokens))
      };
    });
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
        return models2.map((model) => ({ model, provider: a.provider, accountId: a.id }));
      }));
      const context = resolveContext(sources.map((s) => s.model), row.contextMode === "custom" ? row.contextWindow : null, row.contextWindow);
      const eligible = sources.filter((s) => contextInfo(s.model).maxContextWindow >= context.contextWindow);
      const models = eligible.map((s) => s.model), reasoning = routeReasoning(eligible);
      return {
        ...row,
        ...context,
        enforceContext: true,
        supportsImages: models.length > 0 && models.every((m) => m.supportsImages),
        reasoning,
        eligibleAccountIds: [...new Set(eligible.map((s) => s.accountId))],
        maxTokens: Math.min(row.maxTokens, context.contextWindow, ...models.map((m) => m.maxTokens)),
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
        this.catalogs.set(account.id, { credentialFile: account.credentialFile, fetchedAt: Date.now(), pricingVersion: 1, contextVersion: 1, models });
        this.catalogErrors.delete(account.id);
        await withFileLock3(this.catalogFile, () => writePrivateJson(this.catalogFile, Object.fromEntries(this.catalogs)));
      } catch (error) {
        if (this.closed || !this.config.accounts.some((a) => a.id === account.id)) return;
        this.catalogErrors.set(account.id, { status: Number(error.status ?? error.failure?.status) || 502, code: "catalog_fetch_failed", at: Date.now() });
      }
      if (!this.closed) this.publish();
    })().finally(() => this.refreshes.delete(account.id));
    this.refreshes.set(account.id, promise);
    return promise;
  }
  summaryState() {
    const today = new Date(this.telemetry.now()).toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
    const daily = this.telemetry.data.days[today] ?? {};
    return {
      pluginVersion: version,
      enabled: this.config.sidebarUsage,
      today,
      tokens: daily.tokens ?? 0,
      requests: daily.requests ?? 0,
      unmetered: daily.unmetered ?? 0,
      totalTokens: Object.values(this.telemetry.data.accounts).reduce((sum, row) => sum + (row.tokens ?? 0), 0)
    };
  }
  state() {
    const status = this.router.status();
    return {
      pluginVersion: version,
      startup: this.startup,
      runtime: this.runtime?.state(),
      revision: this.revision,
      localDiscovery: this.localDiscovery ?? [],
      setup: this.setup,
      pluginUpdates: this.plugins.state(),
      checkins: this.checkins.state(),
      telemetry: this.telemetry.state(),
      apiService: this.api.state(),
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
        providerCount: route.targets.length,
        added: Object.hasOwn(this.config.routes, id),
        availableProviders: [...new Set(route.targets.filter((t) => route.freeOnly ? this.config.accounts.some((a) => a.enabled !== false && a.provider === t.provider && this.freeModels(a).length) : matchModel(id, t, this.providerModels(t.provider))).map((t) => t.provider))]
      })),
      routes: this.routeModels(),
      options: {
        cooldownMs: this.config.cooldownMs,
        requestTimeoutMs: this.config.requestTimeoutMs,
        retryServerErrors: this.config.retryServerErrors,
        usageRetentionDays: this.config.usageRetentionDays,
        sidebarUsage: this.config.sidebarUsage
      }
    };
  }
  async action(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) bad("\u8BF7\u6C42\u683C\u5F0F\u65E0\u6548");
    if (input.action === "model.test") {
      const model = this.providerModels(input.provider).find((m) => m.id === input.id);
      if (!model) bad("\u8BF7\u5148\u5237\u65B0\u5E76\u9009\u62E9\u5DF2\u53D1\u73B0\u7684\u6A21\u578B");
      if (this.modelTestFlight || Date.now() - (this.modelTestAt ?? 0) < 1e4) bad("\u8BF7\u7B49\u5F85\u5F53\u524D\u6D4B\u8BD5\u5B8C\u6210\uFF0C\u6D4B\u8BD5\u95F4\u9694\u81F3\u5C11 10 \u79D2");
      this.modelTestFlight = true;
      this.modelTestAt = Date.now();
      this.modelTestAbort = new AbortController();
      const started = performance.now();
      let modelTest;
      try {
        const { response } = await this.router.chat(
          {
            model: `${input.provider}::${input.id}`,
            stream: true,
            messages: [{ role: "system", content: "Answer briefly." }, { role: "user", content: "Reply with OK." }],
            max_tokens: 16
          },
          AbortSignal.any([this.modelTestAbort.signal, AbortSignal.timeout(45e3)])
        );
        const reader = response.body.getReader();
        let size = 0, text = "";
        const decoder = new TextDecoder();
        try {
          for (; ; ) {
            const chunk = await reader.read();
            if (chunk.done) break;
            size += chunk.value.byteLength;
            if (size > 1024 * 1024) throw Error("probe_response_too_large");
            text += decoder.decode(chunk.value, { stream: true });
          }
          text += decoder.decode();
          let answered = false;
          for (const line of text.split(/\r?\n/).filter((l) => l.startsWith("data:"))) {
            if (line.slice(5).trim() === "[DONE]") continue;
            const payload = JSON.parse(line.slice(5));
            if (payload.error || payload.choices?.some((c) => c.finish_reason === "error")) throw Error("probe_stream_failed");
            answered ||= payload.choices?.some((c) => c.delta?.content || c.delta?.reasoning_content || c.delta?.tool_calls?.length) ?? false;
          }
          if (!answered || !/^data:\s*\[DONE\]\s*$/m.test(text)) throw Error("probe_incomplete");
        } finally {
          await reader.cancel().catch(() => {
          });
          reader.releaseLock();
        }
        modelTest = { ok: true, elapsedMs: Math.round(performance.now() - started) };
      } catch (error) {
        modelTest = {
          ok: false,
          status: Number(error.status) || 502,
          hint: error.hint || "\u6D4B\u8BD5\u672A\u901A\u8FC7\uFF0C\u8BF7\u67E5\u770B\u8D26\u53F7\u72B6\u6001\uFF1B\u4E0D\u4F1A\u81EA\u52A8\u91CD\u8BD5\u3002"
        };
      } finally {
        this.modelTestFlight = false;
        this.modelTestAbort = void 0;
      }
      return { ...this.state(), modelTest };
    }
    if (input.action?.startsWith("api.")) {
      let result;
      try {
        result = await this.api.action(input);
      } catch (e) {
        bad(e.message);
      }
      return { ...this.state(), ...result };
    }
    if (input.action === "plugin.reload") {
      if (!this.runtime) bad("\u5F53\u524D\u540E\u53F0\u4E0D\u652F\u6301\u91CD\u65B0\u52A0\u8F7D");
      this.runtime.retryAt = 0;
      this.runtime.schedule(0);
      return this.state();
    }
    if (input.action === "workbuddy.sms") {
      try {
        const workbuddyLogin = await this.workbuddyLogin.send(input.phone);
        return { ...this.state(), workbuddyLogin };
      } catch (e) {
        bad(e.message);
      }
    }
    if (input.action === "workbuddy.login") {
      if (input.revision !== revisionOf(JSON.parse(await readFile4(this.file, "utf8")))) throw new ManagementError(409, "\u914D\u7F6E\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u65B0\u63D0\u4EA4\u767B\u5F55");
      let login;
      try {
        login = await this.workbuddyLogin.complete(input.challenge, input.code, input.verify ?? true);
      } catch (e) {
        bad(e.message);
      }
      let existing;
      for (const a of this.config.accounts.filter((a2) => a2.provider === "workbuddy")) {
        try {
          if ((await jsonCredential(a.credentialFile)).credential.uid === login.document.credential.uid) {
            existing = a;
            break;
          }
        } catch {
        }
      }
      if (input.id && input.id !== existing?.id) bad("\u767B\u5F55\u8EAB\u4EFD\u4E0E\u6B63\u5728\u7F16\u8F91\u7684\u8D26\u53F7\u4E0D\u540C\uFF0C\u8BF7\u4ECE\u6DFB\u52A0\u8D26\u53F7\u5165\u53E3\u4FDD\u5B58");
      const state = await this.action({
        action: existing ? "account.credentials" : "account.add",
        revision: input.revision,
        id: existing?.id ?? `workbuddy_${randomBytes3(8).toString("hex")}`,
        provider: "workbuddy",
        name: input.name,
        document: login.document
      });
      this.workbuddyLogin.finish();
      return { ...state, loginResult: { warning: login.warning, saved: true } };
    }
    if (input.action === "checkins.verify") {
      const account = this.config.accounts.find((a) => a.id === input.id && a.provider === "workbuddy");
      if (!account) bad("\u8BF7\u9009\u62E9 WorkBuddy \u4E2D\u56FD\u7248\u8D26\u53F7");
      if (this.checkins.flight || this.checkins.failed) bad("\u8BF7\u7B49\u5F85\u7B7E\u5230\u5B8C\u6210\uFF0C\u6216\u5148\u4FEE\u590D\u7B7E\u5230\u8BB0\u5F55");
      try {
        await this.workbuddyLogin.reserve("verifyAt", 3e4);
      } catch (e) {
        bad(e.message);
      }
      try {
        const client = await this.router.client(account);
        await client.checkin.validate(AbortSignal.timeout(3e4));
        await this.checkins.credentialsUpdated(account.id);
        await this.readLogin(account);
      } catch {
        bad("\u767B\u5F55\u9A8C\u8BC1\u672A\u901A\u8FC7\uFF1A\u8BF7\u5728\u8D26\u53F7\u4E0E\u767B\u5F55\u4E2D\u66F4\u65B0\u51ED\u8BC1\uFF1B\u4E0D\u4F1A\u81EA\u52A8\u91CD\u8BD5\u6216\u9886\u53D6");
      }
      return this.state();
    }
    if (input.action === "checkins.run") {
      try {
        this.checkins.start(input.ids);
      } catch (e) {
        bad(e.message);
      }
      return this.state();
    }
    if (input.action === "checkins.resume") {
      try {
        await this.checkins.resume(input.provider);
      } catch (e) {
        bad(e.message);
      }
      return this.state();
    }
    if (typeof input.action === "string" && input.action.startsWith("plugins.")) {
      try {
        await this.plugins.action(input);
      } catch (e) {
        bad(e.message);
      }
      return this.state();
    }
    if (input.action === "setup.dismiss") {
      await withFileLock3(this.setupFile, async () => {
        this.setup = { ...this.setup, completedAt: this.setup?.completedAt ?? Date.now(), dismissed: true };
        await writePrivateJson(this.setupFile, this.setup);
      });
      return this.state();
    }
    if (input.action === "account.export") {
      if (input.revision !== revisionOf(JSON.parse(await readFile4(this.file, "utf8")))) throw new ManagementError(409, "\u914D\u7F6E\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u5237\u65B0\u540E\u63D0\u53D6\u51ED\u8BC1");
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
      if (input.revision !== revisionOf(JSON.parse(await readFile4(this.file, "utf8")))) throw new ManagementError(409, "\u914D\u7F6E\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u5237\u65B0\u540E\u5BFC\u51FA");
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
        await this.monitorAccount(account, { force: true });
      } else {
        await this.syncLocalAccounts(input.provider);
        await this.monitorAll(input.provider, { force: true });
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
      input = { ...input, action: "account.add", id: `${input.provider.replace("-", "_")}_${randomBytes3(4).toString("hex")}`, capture: true };
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
    return withFileLock3(this.file, async () => {
      let raw = JSON.parse(await readFile4(this.file, "utf8"));
      if (input.revision !== revisionOf(raw)) throw new ManagementError(409, "\u914D\u7F6E\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u5237\u65B0\u540E\u518D\u4FDD\u5B58");
      raw.routes ??= structuredClone(this.config.routes);
      let staging;
      try {
        const account = raw.accounts.find((a) => a.id === input.id);
        if (input.action === "config.import") {
          try {
            const prepared = await prepareMigration(this, raw, await decodeConfiguration(input), input.mode);
            staging = prepared.staging;
            await writePrivateJson(`${this.file}.before-import-${Date.now()}-${randomBytes3(3).toString("hex")}.bak`, raw);
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
          const base = join5(dirname3(this.file), "accounts");
          await mkdir2(base, { recursive: true, mode: 448 });
          staging = await mkdtemp2(join5(base, `${input.id}-`));
          const credentialFile = join5(staging, "credential.json"), identityFile = join5(staging, "identity.json");
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
          if (input.autoCheckin !== void 0) {
            if (typeof input.autoCheckin !== "boolean" || !supportsCheckin(account.provider)) bad("\u6B64\u5E73\u53F0\u6682\u4E0D\u652F\u6301\u81EA\u52A8\u7B7E\u5230");
            account.autoCheckin = input.autoCheckin;
          }
          if (input.name !== void 0) account.name = input.name;
          if (input.enabled !== void 0) account.enabled = input.enabled;
        } else if (input.action === "accounts.enabled") {
          if (input.provider !== void 0 && !PROVIDERS.includes(input.provider) || typeof input.enabled !== "boolean") bad("\u4F9B\u5E94\u5546\u6216\u8DEF\u7531\u53C2\u4E0E\u5F00\u5173\u65E0\u6548");
          for (const a of raw.accounts.filter((a2) => !input.provider || a2.provider === input.provider)) a.enabled = input.enabled;
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
          const model = this.providerModels(input.provider).find((m) => m.id === input.id);
          if (input.contextWindow != null && (!Number.isSafeInteger(input.contextWindow) || input.contextWindow <= 0 || !model || input.contextWindow > model.maxContextWindow)) bad("\u4E0A\u4E0B\u6587\u9884\u7B97\u4E0D\u80FD\u8D85\u8FC7\u8BE5\u6E20\u9053\u6A21\u578B\u7684\u6700\u5927\u5BB9\u91CF");
          if (input.supportsImages === true && !model?.imageCapable) bad("\u8BE5\u6A21\u578B\u672A\u58F0\u660E\u56FE\u7247\u8F93\u5165\u80FD\u529B");
          if (input.reasoningEffort != null && !model?.reasoning?.supportedEfforts.includes(input.reasoningEffort)) bad("\u6B64\u6A21\u578B\u4E0D\u652F\u6301\u6240\u9009\u63A8\u7406\u7B49\u7EA7");
          raw.models = { ...raw.models, [input.provider]: {
            ...raw.models?.[input.provider],
            [input.id]: {
              ...raw.models?.[input.provider]?.[input.id],
              ...Object.fromEntries(["name", "visible", "contextWindow", "supportsImages", "reasoningEffort"].filter((k) => input[k] !== void 0).map((k) => [k, input[k]]))
            }
          } };
        } else if (input.action === "free.model.update") {
          const parent = raw.routes[input.parentId];
          if (!parent?.freeOnly || !this.freeRoutes(input.parentId, this.config.routes[input.parentId]).some((m) => m.id === input.id)) bad("\u514D\u8D39\u6A21\u578B\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u5237\u65B0\u9875\u9762");
          const model = this.freeRoutes(input.parentId, this.config.routes[input.parentId]).find((m) => m.id === input.id);
          if (input.contextWindow != null && (!Number.isSafeInteger(input.contextWindow) || input.contextWindow <= 0 || input.contextWindow > model.maxContextWindow)) bad("\u4E0A\u4E0B\u6587\u9884\u7B97\u4E0D\u80FD\u8D85\u8FC7\u8BE5\u514D\u8D39\u6A21\u578B\u7684\u6700\u5927\u5BB9\u91CF");
          if (input.reasoningEffort !== void 0 && input.reasoningEffort !== null && !model.reasoning?.supportedEfforts.includes(input.reasoningEffort)) bad("\u6B64\u514D\u8D39\u6A21\u578B\u4E0D\u652F\u6301\u6240\u9009\u63A8\u7406\u7B49\u7EA7");
          parent.freeModels = { ...parent.freeModels, [input.id]: {
            ...parent.freeModels?.[input.id],
            ...input.visible !== void 0 ? { visible: input.visible } : {},
            ...input.contextWindow !== void 0 ? { contextWindow: input.contextWindow } : {},
            ...input.reasoningEffort !== void 0 ? { reasoningEffort: input.reasoningEffort } : {}
          } };
        } else if (input.action === "route.save") {
          if (input.id === void 0 || input.id === "") {
            input.id = input.previousId || `route_${randomBytes3(8).toString("hex")}`;
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
        } else if (input.action === "checkins.settings") {
          if (this.checkins.flight) bad("\u8BF7\u7B49\u5F85\u5F53\u524D\u7B7E\u5230\u5B8C\u6210\u540E\u4FEE\u6539\u8BA1\u5212");
          if (!input.schedule) bad("\u8BF7\u586B\u5199\u7B7E\u5230\u8BA1\u5212");
          raw.checkinSchedule = input.schedule;
        } else if (input.action === "options.save") {
          for (const key of ["cooldownMs", "requestTimeoutMs", "retryServerErrors", "usageRetentionDays", "sidebarUsage"]) if (input[key] !== void 0) raw[key] = input[key];
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
        if (staging) await rm3(staging, { recursive: true, force: true });
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
        if (input.action === "account.credentials" && !this.checkins.failed) await this.checkins.credentialsUpdated(input.id);
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
    const watcher = watch2(dirname3(this.file), (_, filename) => {
      if (filename && String(filename) !== this.file.split(/[\\/]/).pop()) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        void withFileLock3(this.file, async () => {
          const raw = JSON.parse(await readFile4(this.file, "utf8"));
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
function managementHandler(manager, { summaryOnly = false } = {}) {
  const key = randomBytes3(32).toString("base64url");
  const json = (res, status, value) => {
    res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    res.end(JSON.stringify(value));
  };
  return async (req, res) => {
    manager.requests = (manager.requests ?? 0) + 1;
    try {
      const remote = req.socket?.remoteAddress;
      if (!hostIsLoopback(req.headers.host) || remote && !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote)) throw new ManagementError(403, "\u4EC5\u5141\u8BB8\u672C\u673A\u8BF7\u6C42");
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) throw new ManagementError(403, "\u6765\u6E90\u65E0\u6548");
      if (req.headers["sec-fetch-site"] === "cross-site") throw new ManagementError(403, "\u6765\u6E90\u65E0\u6548");
      if (req.method === "GET") {
        json(res, 200, summaryOnly ? manager.summaryState() : { ...manager.state(), key });
        return;
      }
      if (summaryOnly) throw new ManagementError(405, "\u65B9\u6CD5\u65E0\u6548");
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
    } finally {
      manager.requests--;
    }
  };
}

export {
  version,
  PluginReload,
  MANAGEMENT_PATH,
  SUMMARY_PATH,
  ManagementError,
  modelInfo,
  Manager,
  managementHandler
};
//# sourceMappingURL=chunk-ZQZSXCVR.js.map
