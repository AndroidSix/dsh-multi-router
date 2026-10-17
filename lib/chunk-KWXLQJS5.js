// upstream/workbuddy/src/upstream.ts
import { randomUUID } from "node:crypto";

// upstream/workbuddy/src/app-version.ts
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { writeFileAtomic } from "@deepseek-ai/dsh-atomic-write";
import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";
var FALLBACK_APP_VERSION = "5.5.2";
var WORKBUDDY_APP_VERSION_FILENAME = ".workbuddy-ai-version.json";
function validAppVersion(value) {
  return typeof value === "string" && /^\d{1,6}(?:\.\d{1,6}){1,3}$/u.test(value);
}
function macAppRoots() {
  return ["/Applications", join(homedir(), "Applications")];
}
async function readBundleVersion(plistPath) {
  let text;
  try {
    text = await readFile(plistPath, "utf8");
  } catch {
    return void 0;
  }
  const match = /<key>\s*CFBundleShortVersionString\s*<\/key>\s*<string>([^<]*)<\/string>/u.exec(text);
  const version = match?.[1]?.trim();
  return validAppVersion(version) ? version : void 0;
}
async function installedAppVersion() {
  if (process.platform !== "darwin") return void 0;
  for (const root of macAppRoots()) {
    const bundle = join(root, "WorkBuddy AI.app");
    const version = await readBundleVersion(join(bundle, "Contents", "Info.plist"));
    if (version !== void 0) return { version, bundle };
  }
  return void 0;
}
function appVersionPath() {
  return join(resolveDshHome(), WORKBUDDY_APP_VERSION_FILENAME);
}
async function resolveAppVersion(options = {}) {
  const path = options.path ?? appVersionPath();
  const installed = await (options.installed ?? installedAppVersion)();
  if (installed !== void 0 && validAppVersion(installed.version)) {
    try {
      await writeFileAtomic(
        path,
        `${JSON.stringify({ version: installed.version, bundle: installed.bundle, observedAt: Date.now() }, null, 2)}
`,
        { mode: 384, dirMode: 448 }
      );
    } catch {
    }
    return { version: installed.version, source: "installed", bundle: installed.bundle };
  }
  try {
    const saved = JSON.parse(await readFile(path, "utf8"));
    if (typeof saved === "object" && saved !== null) {
      const version = saved["version"];
      if (validAppVersion(version)) return { version, source: "saved" };
    }
  } catch {
  }
  return { version: FALLBACK_APP_VERSION, source: "fallback" };
}
function appUserAgent(version) {
  if (!validAppVersion(version)) throw new Error(`invalid WorkBuddy AI version for User-Agent: ${JSON.stringify(version)}`);
  return `WorkBuddyAI/${version}`;
}

// upstream/workbuddy/src/client-identity.ts
import { readFile as readFile2 } from "node:fs/promises";
import { homedir as homedir2 } from "node:os";
import { join as join2 } from "node:path";
import { writeFileAtomic as writeFileAtomic2 } from "@deepseek-ai/dsh-atomic-write";
import { resolveDshHome as resolveDshHome2 } from "@deepseek-ai/dsh-home-paths";
var FALLBACK_CN_APP_VERSION = "5.5.6";
var CN_APP_VERSION_FILENAME = ".workbuddy-app-version.json";
function validCliVersion(value) {
  return typeof value === "string" && /^\d{1,6}(?:\.\d{1,6}){1,3}(?:-[0-9A-Za-z.]+)?$/u.test(value);
}
function macAppRoots2() {
  return ["/Applications", join2(homedir2(), "Applications")];
}
function cliPackagePath(bundle) {
  return join2(bundle, "Contents", "Resources", "app.asar.unpacked", "cli", "package.json");
}
async function readCliVersion(bundle) {
  let document;
  try {
    document = JSON.parse(await readFile2(cliPackagePath(bundle), "utf8"));
  } catch {
    return void 0;
  }
  if (typeof document !== "object" || document === null || Array.isArray(document)) return void 0;
  const pkg = document;
  const declared = pkg["version"];
  if (validCliVersion(declared) && declared !== "0.0.0") return declared;
  const publishConfig = pkg["publishConfig"];
  const customPackage = typeof publishConfig === "object" && publishConfig !== null && !Array.isArray(publishConfig) ? publishConfig : void 0;
  const custom = typeof customPackage?.["customPackage"] === "object" && customPackage["customPackage"] !== null && !Array.isArray(customPackage["customPackage"]) ? customPackage["customPackage"] : void 0;
  const customVersion = custom?.["version"];
  return validCliVersion(customVersion) ? customVersion : void 0;
}
function chatUserAgent(identity, region) {
  if (!validAppVersion(identity.clientVersion)) {
    throw new Error(`invalid client version for chat User-Agent: ${JSON.stringify(identity.clientVersion)}`);
  }
  if (identity.cliVersion !== void 0 && !validCliVersion(identity.cliVersion)) {
    throw new Error(`invalid CLI version for chat User-Agent: ${JSON.stringify(identity.cliVersion)}`);
  }
  const product = region === "global" ? "WorkBuddy AI" : "WorkBuddy";
  const parts = [`WorkBuddy/${identity.clientVersion}`, `${product}/${identity.clientVersion}`];
  if (identity.cliVersion !== void 0) parts.push(`CLI/${identity.cliVersion}`);
  return parts.join(" ");
}
async function installedCnApp() {
  if (process.platform !== "darwin") return void 0;
  for (const root of macAppRoots2()) {
    const bundle = join2(root, "WorkBuddy.app");
    const version = await readBundleVersion(join2(bundle, "Contents", "Info.plist"));
    if (version !== void 0) return { version, bundle };
  }
  return void 0;
}
function cnSavedVersionPath() {
  return join2(resolveDshHome2(), CN_APP_VERSION_FILENAME);
}
async function resolveChatIdentity(region, options = {}) {
  const injectable = options.installedCn !== void 0 || options.resolveIntl !== void 0 || options.cliVersion !== void 0 || options.cnSavedPath !== void 0;
  if (!injectable) {
    const cached = cache.get(region);
    if (cached !== void 0) return cached;
  }
  let identity;
  try {
    identity = region === "global" ? await resolveGlobalIdentity(options) : await resolveCnIdentity(options);
  } catch {
    return fallbackChatIdentity(region);
  }
  if (!injectable) cache.set(region, identity);
  return identity;
}
var cache = /* @__PURE__ */ new Map();
function fallbackChatIdentity(region) {
  return { clientVersion: region === "global" ? FALLBACK_APP_VERSION : FALLBACK_CN_APP_VERSION };
}
async function resolveCnIdentity(options) {
  const savedPath = options.cnSavedPath ?? cnSavedVersionPath();
  const installed = await (options.installedCn ?? installedCnApp)();
  if (installed !== void 0 && validAppVersion(installed.version)) {
    const cliVersion = await (options.cliVersion ?? readCliVersion)(installed.bundle);
    const identity = {
      clientVersion: installed.version,
      ...cliVersion !== void 0 && validCliVersion(cliVersion) ? { cliVersion } : {}
    };
    try {
      await writeFileAtomic2(
        savedPath,
        `${JSON.stringify({ version: identity.clientVersion, observedAt: Date.now() }, null, 2)}
`,
        { mode: 384, dirMode: 448 }
      );
    } catch {
    }
    return identity;
  }
  try {
    const saved = JSON.parse(await readFile2(savedPath, "utf8"));
    if (typeof saved === "object" && saved !== null && !Array.isArray(saved)) {
      const document = saved;
      if (validAppVersion(document["version"])) {
        return { clientVersion: document["version"] };
      }
    }
  } catch {
  }
  return fallbackChatIdentity("cn");
}
async function resolveGlobalIdentity(options) {
  const info = await (options.resolveIntl ?? resolveAppVersion)();
  const clientVersion = validAppVersion(info.version) ? info.version : FALLBACK_APP_VERSION;
  let cliVersion;
  if (info.bundle !== void 0) {
    const read = await (options.cliVersion ?? readCliVersion)(info.bundle);
    if (read !== void 0 && validCliVersion(read)) cliVersion = read;
  }
  return { clientVersion, ...cliVersion === void 0 ? {} : { cliVersion } };
}

// upstream/workbuddy/src/probe.ts
var PROBE_PROMPT = "ping";
var PROBE_MAX_TOKENS = 1;

// upstream/workbuddy/src/upstream.ts
var CN_CHAT_BASE = "https://copilot.tencent.com";
var CN_BILLING_BASE = "https://www.codebuddy.cn";
var GLOBAL_BASE = "https://www.workbuddy.ai";
var enterprisePackageName = "enterprise";
function describeShape(document) {
  if (typeof document !== "object" || document === null || Array.isArray(document)) {
    return typeof document;
  }
  const record = document;
  const at = (source) => {
    const keys = Object.keys(source).slice(0, 24);
    return keys.length === 0 ? "(empty)" : keys.map((key) => `${key}:${typeof source[key]}`).join(", ");
  };
  const top = `top-level { ${at(record)} }`;
  const data = record["data"];
  if (typeof data !== "object" || data === null || Array.isArray(data)) return top;
  return `${top}; data { ${at(data)} }`;
}
var CLIENT_UA = "CLI/2.63.2 CodeBuddy/2.63.2";
var JSON_TIMEOUT_MS = 3e4;
var ERROR_BODY_LIMIT = 4096;
var HARD_CREDIT_MARKERS = [
  "insufficient credit",
  "no credit",
  "credit exhausted",
  "credits exhausted",
  "out of credit",
  "quota exceeded",
  "quota exhaust",
  "payment required",
  "credit not enough",
  "not enough credit",
  "\u79EF\u5206\u4E0D\u8DB3",
  "\u989D\u5EA6\u4E0D\u8DB3",
  "\u4F59\u989D\u4E0D\u8DB3",
  "\u79EF\u5206\u7528\u5B8C",
  "\u989D\u5EA6\u7528\u5C3D",
  "\u6CA1\u6709\u79EF\u5206"
];
var EFFORT_VALUES = ["low", "medium", "high", "xhigh", "max"];
var BADGE_PREFIX = "badge:";
function resolveUpstreamReasoning(wrapped) {
  const supports = wrapped["supportsReasoning"] === true;
  const onlyReasoning = wrapped["onlyReasoning"] === true;
  const rawReasoning = wrapped["reasoning"];
  let supportedEfforts;
  let defaultEffort;
  let canDisableThinking = true;
  if (typeof rawReasoning === "object" && rawReasoning !== null && !Array.isArray(rawReasoning)) {
    const reasoning = rawReasoning;
    const rawEfforts = reasoning["supportedEfforts"];
    if (Array.isArray(rawEfforts)) {
      const efforts = rawEfforts.filter((value) => typeof value === "string" && EFFORT_VALUES.includes(value));
      if (efforts.length > 0) supportedEfforts = efforts;
    }
    if (typeof reasoning["defaultEffort"] === "string" && EFFORT_VALUES.includes(reasoning["defaultEffort"])) {
      defaultEffort = reasoning["defaultEffort"];
    } else if (typeof reasoning["effort"] === "string" && EFFORT_VALUES.includes(reasoning["effort"])) {
      defaultEffort = reasoning["effort"];
    }
    canDisableThinking = reasoning["canDisableThinking"] === true;
  }
  return {
    reasoning: {
      supports,
      onlyReasoning,
      ...supportedEfforts === void 0 ? {} : { supportedEfforts },
      ...defaultEffort === void 0 ? {} : { defaultEffort },
      canDisableThinking
    }
  };
}
function normalizeCredits(credits) {
  if (credits === void 0) return void 0;
  const trimmed = credits.trim();
  if (trimmed === "") return void 0;
  if (/^credits?$/iu.test(trimmed)) return void 0;
  const bare = trimmed.replace(/\s+credits?$/iu, "").trim();
  return bare === "" ? void 0 : bare;
}
function resolveUpstreamBilling(wrapped, extraTags) {
  const rawCredits = wrapped["credits"];
  const credits = typeof rawCredits === "string" && rawCredits.trim() !== "" ? rawCredits.trim() : void 0;
  const badges = [];
  const rawTags = [...Array.isArray(wrapped["tags"]) ? wrapped["tags"] : [], ...extraTags ?? []];
  for (const tag of rawTags) {
    if (typeof tag !== "string") continue;
    const lowered = tag.toLowerCase();
    if (!lowered.startsWith(BADGE_PREFIX)) continue;
    const label = tag.slice(BADGE_PREFIX.length).split(":")[0] ?? tag.slice(BADGE_PREFIX.length);
    if (label !== "" && !badges.includes(label)) badges.push(label);
  }
  const multiplier = normalizeCredits(credits);
  const free = multiplier !== void 0 && /^x?0\.0+$/u.test(multiplier);
  return {
    billing: {
      ...credits === void 0 ? {} : { credits },
      ...badges.length === 0 ? {} : { badges },
      free
    }
  };
}
var SESSION_DEAD_MARKERS = ["Offline user session not found", "12153"];
function classifyUpstreamError(status, body) {
  if (status === 402) return "hard_credit";
  if (status === 401) return "session_dead";
  const lower = body.toLowerCase();
  for (const marker of HARD_CREDIT_MARKERS) {
    if (lower.includes(marker.toLowerCase()) || body.includes(marker)) return "hard_credit";
  }
  for (const marker of SESSION_DEAD_MARKERS) {
    if (body.includes(marker)) return "session_dead";
  }
  if (status === 429) return "soft_rate";
  if (status === 404) return "not_found";
  if (status >= 500) return "server";
  if (status >= 400) return "client";
  return "client";
}
function extractDisplayErrorMessage(body) {
  const trimmed = body.trim();
  if (!trimmed.startsWith("{")) return void 0;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return void 0;
    const obj = parsed;
    const displayMsg = obj["displayMsg"];
    if (typeof displayMsg === "object" && displayMsg !== null && !Array.isArray(displayMsg)) {
      const localized = displayMsg;
      if (typeof localized["zh"] === "string" && localized["zh"].trim() !== "") {
        return localized["zh"].trim();
      }
      if (typeof localized["en"] === "string" && localized["en"].trim() !== "") {
        return localized["en"].trim();
      }
    }
    if (typeof obj["msg"] === "string" && obj["msg"].trim() !== "") {
      return obj["msg"].trim();
    }
  } catch {
  }
  return void 0;
}
function regionOf(domain) {
  const lowered = domain.trim().toLowerCase();
  if (lowered === "workbuddy.ai" || lowered.endsWith(".workbuddy.ai")) return "global";
  return "cn";
}
function chatBase(credential) {
  return regionOf(credential.domain) === "global" ? GLOBAL_BASE : CN_CHAT_BASE;
}
function billingBase(credential) {
  return regionOf(credential.domain) === "global" ? GLOBAL_BASE : CN_BILLING_BASE;
}
function originReferer(credential) {
  return regionOf(credential.domain) === "global" ? GLOBAL_BASE : CN_BILLING_BASE;
}
function commonHeaders(credential) {
  return {
    "Accept": "application/json, text/plain, */*",
    "X-Requested-With": "XMLHttpRequest",
    "Origin": originReferer(credential),
    "Referer": `${originReferer(credential)}/`,
    "User-Agent": CLIENT_UA
  };
}
function conversationHeaders() {
  return {
    "X-Conversation-ID": randomUUID(),
    "X-Conversation-Request-ID": randomUUID(),
    "X-Conversation-Message-ID": randomUUID()
  };
}
function chatHeaders(credential, userAgent, clientVersion) {
  const headers = {
    ...commonHeaders(credential),
    "User-Agent": userAgent,
    "Content-Type": "application/json",
    // 安全红线：chat 请求绝不携带 refresh token。
    ...credential.uid === "" ? { "X-No-User-Id": "1" } : { "X-User-Id": credential.uid },
    ...credential.enterpriseId === void 0 || credential.enterpriseId === "" ? { "X-No-Enterprise-Id": "1" } : { "X-Enterprise-Id": credential.enterpriseId },
    ...credential.domain === "" ? { "X-No-Department-Info": "1" } : { "X-Domain": credential.domain },
    "X-IDE-Type": "WorkBuddy",
    "X-IDE-Name": "WorkBuddy",
    "X-IDE-Version": clientVersion,
    "X-Product": "SaaS",
    ...conversationHeaders()
  };
  return headers;
}
function refreshHeaders(credential) {
  const headers = {
    ...commonHeaders(credential),
    "X-Refresh-Token": credential.refreshToken,
    "X-Auth-Refresh-Source": "workbuddy"
  };
  if (credential.enterpriseId !== void 0 && credential.enterpriseId !== "") {
    headers["X-Enterprise-Id"] = credential.enterpriseId;
  }
  return headers;
}
function billingHeaders(credential) {
  const headers = {
    "Authorization": `Bearer ${credential.accessToken}`,
    "Accept": "application/json",
    "Content-Type": "application/json"
  };
  if (credential.uid !== "") headers["X-User-Id"] = credential.uid;
  if (credential.enterpriseId !== void 0 && credential.enterpriseId !== "") {
    headers["X-Enterprise-Id"] = credential.enterpriseId;
    headers["X-Tenant-Id"] = credential.enterpriseId;
  }
  if (credential.domain !== "") headers["X-Domain"] = credential.domain;
  return headers;
}
function prepareChatBody(source) {
  let body;
  try {
    body = JSON.parse(source);
  } catch {
    return source;
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return source;
  const obj = body;
  obj["stream"] = true;
  normalizeDeveloperRole(obj);
  normalizeToolChoice(obj);
  return JSON.stringify(obj);
}
function normalizeDeveloperRole(obj) {
  const messages = obj["messages"];
  if (!Array.isArray(messages)) return;
  for (const message of messages) {
    if (typeof message !== "object" || message === null || Array.isArray(message)) continue;
    const wrapped = message;
    if (wrapped["role"] === "developer") wrapped["role"] = "system";
  }
}
function normalizeToolChoice(obj) {
  const suppress = () => {
    delete obj["tools"];
    delete obj["functions"];
  };
  const present = "tool_choice" in obj;
  if (!present) return;
  const choice = obj["tool_choice"];
  if (typeof choice === "string") {
    if (choice.trim().toLowerCase() === "none") {
      delete obj["tool_choice"];
      suppress();
    }
    return;
  }
  if (typeof choice === "object" && choice !== null && !Array.isArray(choice)) {
    const wrapped = choice;
    const type = typeof wrapped["type"] === "string" ? wrapped["type"].trim().toLowerCase() : "";
    if (type === "none") {
      delete obj["tool_choice"];
      suppress();
    } else if (type === "auto" || type === "required") {
      obj["tool_choice"] = type;
    } else if (type === "function") {
      const fn = typeof wrapped["function"] === "object" && wrapped["function"] !== null ? wrapped["function"] : void 0;
      let name = typeof fn?.["name"] === "string" ? fn["name"] : "";
      if (name === "" && typeof wrapped["name"] === "string") name = wrapped["name"];
      name = name.trim();
      obj["tool_choice"] = name !== "" ? name : "auto";
    } else {
      delete obj["tool_choice"];
    }
    return;
  }
  delete obj["tool_choice"];
}
async function readEnvelope(response) {
  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`workbuddy upstream returned non-JSON (http ${response.status}): ${text.slice(0, 160)}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`workbuddy upstream returned an unexpected document (http ${response.status})`);
  }
  const document = parsed;
  const envelope = {
    code: typeof document["code"] === "number" ? document["code"] : 0,
    msg: typeof document["msg"] === "string" ? document["msg"] : "",
    data: "data" in document ? document["data"] : void 0,
    document
  };
  return envelope;
}
function envelopeError(status, envelope) {
  const kind = classifyUpstreamError(status, envelope.msg);
  return new Error(`workbuddy upstream ${kind} (http ${status}): ${envelope.msg.slice(0, 160)}`);
}
function parseCycleEndTime(value) {
  if (typeof value !== "string" || value.trim() === "") return void 0;
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/u.exec(value.trim());
  if (match === null) return void 0;
  const [, y, mo, d, h, mi, s] = match;
  const parts = [y, mo, d, h, mi, s].map(Number);
  const [year, month, day, hour, minute, second] = parts;
  const date = new Date(year, month - 1, day, hour, minute, second);
  const parsed = date.getTime();
  if (!Number.isFinite(parsed)) return void 0;
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || date.getHours() !== hour || date.getMinutes() !== minute || date.getSeconds() !== second) {
    return void 0;
  }
  return parsed;
}
var NO_EXPIRING_CREDIT = { total: 0, packages: 0 };
function expiringWithin(accounts, nowMs, horizonMs) {
  return sumExpiring(accounts, (end) => end > nowMs && end - nowMs <= horizonMs);
}
function sumExpiring(accounts, matches) {
  let total = 0;
  let packages = 0;
  let earliestEndTimeMs;
  for (const account of accounts) {
    const end = account.endTimeMs;
    if (end === void 0 || account.remain <= 0) continue;
    if (!matches(end)) continue;
    total += account.remain;
    packages += 1;
    if (earliestEndTimeMs === void 0 || end < earliestEndTimeMs) earliestEndTimeMs = end;
  }
  if (packages === 0) return NO_EXPIRING_CREDIT;
  return {
    total,
    packages,
    ...earliestEndTimeMs === void 0 ? {} : { earliestEndTimeMs }
  };
}
function summariseExpiry(accounts, nowMs) {
  if (!accounts.some((account) => account.endTimeMs !== void 0)) return {};
  const HOUR = 3600 * 1e3;
  const DAY = 24 * HOUR;
  return {
    expiry: {
      within24h: expiringWithin(accounts, nowMs, DAY),
      within3d: expiringWithin(accounts, nowMs, 3 * DAY),
      within7d: expiringWithin(accounts, nowMs, 7 * DAY)
    }
  };
}
var WorkBuddyUpstreamClient = class {
  /**
   * Resolves the App-shaped UA version for international catalog requests.
   * Injectable so tests never read the real filesystem.
   */
  resolveAppVersion;
  /** Chat-identity resolver; see {@link WorkBuddyUpstreamClientOptions.resolveChatIdentity}. */
  resolveChatIdentity;
  /** Provenance of the most recent successful catalog fetch, for the card. */
  lastCatalog;
  constructor(options = {}) {
    this.resolveAppVersion = options.resolveAppVersion ?? (() => resolveAppVersion());
    this.resolveChatIdentity = options.resolveChatIdentity ?? ((region) => resolveChatIdentity(region));
  }
  /** POST the chat endpoint; a successful answer is the raw SSE response. */
  async chatStream(credential, bodyJson, signal) {
    const region = regionOf(credential.domain);
    let identity;
    let userAgent;
    try {
      identity = await this.resolveChatIdentity(region);
      userAgent = chatUserAgent(identity, region);
    } catch {
      identity = fallbackChatIdentity(region);
      userAgent = chatUserAgent(identity, region);
    }
    let response;
    try {
      response = await fetch(`${chatBase(credential)}/v2/chat/completions`, {
        method: "POST",
        headers: { ...chatHeaders(credential, userAgent, identity.clientVersion), "Authorization": `Bearer ${credential.accessToken}` },
        body: region === "global" ? prepareInternationalChatBody(bodyJson) : prepareCnChatBody(bodyJson),
        ...signal === void 0 ? {} : { signal }
      });
    } catch (error) {
      return { ok: false, status: 0, kind: "server", message: `transport error: ${String(error)}` };
    }
    if (response.ok) return { ok: true, response };
    const text = (await response.text()).slice(0, ERROR_BODY_LIMIT);
    return {
      ok: false,
      status: response.status,
      kind: classifyUpstreamError(response.status, text),
      message: text
    };
  }
  /** POST the token-refresh endpoint; the caller merges the outcome. */
  async refreshToken(credential) {
    const response = await fetch(`${chatBase(credential)}/v2/plugin/auth/token/refresh`, {
      method: "POST",
      headers: refreshHeaders(credential),
      signal: AbortSignal.timeout(JSON_TIMEOUT_MS)
    });
    const envelope = await readEnvelope(response);
    if (!response.ok || envelope.code !== 0) throw envelopeError(response.status, envelope);
    const data = typeof envelope.data === "object" && envelope.data !== null ? envelope.data : {};
    const accessToken = typeof data["accessToken"] === "string" ? data["accessToken"] : "";
    if (accessToken === "") throw new Error("workbuddy token refresh returned no accessToken; sign in again in the WorkBuddy app");
    const outcome = { accessToken };
    if (typeof data["refreshToken"] === "string" && data["refreshToken"] !== "") outcome.refreshToken = data["refreshToken"];
    if (typeof data["expiresIn"] === "number" && data["expiresIn"] > 0) outcome.expiresInSec = data["expiresIn"];
    if (typeof data["domain"] === "string" && data["domain"] !== "") outcome.domain = data["domain"];
    return outcome;
  }
  /**
   * GET the personal model catalog.
   *
   * Both variants read `/v3/config`, the product document the desktop product
   * itself fetches. CN used to read `/console/enterprises/personal/models`
   * (the console catalog) instead, and that was why its model list drifted
   * from the desktop App's selector: the console document lags the product
   * one, and the product roster itself churns day to day (`auto`,
   * `kimi-k3-1`, `minimax-m3` have each appeared and disappeared within a
   * week).
   *
   * What distinguishes the two variants here is the User-Agent, not the path:
   * the gateway splits `/v3/config` by client identity, and the split is
   * load-bearing. A CLI-shaped UA yields the CLI's roster — the chat models
   * this plugin serves — while an App-shaped UA yields the App's internal
   * roster. CN keeps the CLI UA it sends for chat, so the catalog it
   * advertises is exactly the one its own requests can use. The international
   * variant has no CLI identity, so it keeps the App-shaped UA.
   *
   * Membership is the `cli` roster intersected with the usable rows (see
   * {@link parseModelCatalog}); the promo badges the product document does
   * not carry are merged in from a best-effort console read — see
   * {@link fetchPromoBadges}.
   *
   * Responses are unwrapped and classified the same way — `readEnvelope` plus
   * `envelopeError` — so an expired session or exhausted credit is reported as
   * such rather than as a generic catalog failure.
   */
  async fetchModels(credential, signal) {
    const international = regionOf(credential.domain) === "global";
    const appVersion = international ? await this.resolveAppVersion() : void 0;
    const response = await fetch(`${chatBase(credential)}/v3/config`, {
      headers: {
        Authorization: `Bearer ${credential.accessToken}`,
        Accept: "application/json",
        Origin: originReferer(credential),
        Referer: `${originReferer(credential)}/`,
        ...international ? { "X-Requested-With": "XMLHttpRequest", "X-Product": "SaaS" } : {},
        "User-Agent": appVersion === void 0 ? CLIENT_UA : appUserAgent(appVersion.version)
      },
      signal: signal === void 0 ? AbortSignal.timeout(JSON_TIMEOUT_MS) : AbortSignal.any([signal, AbortSignal.timeout(JSON_TIMEOUT_MS)])
    });
    const envelope = await readEnvelope(response);
    if (!response.ok || envelope.code !== 0) throw envelopeError(response.status, envelope);
    const data = isObject(envelope.data) ? envelope.data : "models" in envelope.document || "agents" in envelope.document ? envelope.document : {};
    const promoBadges = international ? void 0 : await this.fetchPromoBadges(credential, signal);
    const models = parseModelCatalog(data, international, promoBadges);
    this.lastCatalog = {
      fetchedAtMs: Date.now(),
      source: international ? "workbuddy-ai:app" : "workbuddy:cli",
      ...appVersion === void 0 ? {} : { appVersion }
    };
    return models;
  }
  /**
   * Read the console catalog's promotional tags, by model id.
   *
   * `/v3/config` carries no `badge:<label>:<color>` tags — the discount labels
   * the cards render (`限时免费`, `夜间折扣`, …) live only in
   * `/console/enterprises/personal/models`. Since the roster now comes from
   * the product document, those tags are read from the console one in a
   * second request and merged by id.
   *
   * Best-effort by construction: a badge is a label on a price, so failing to
   * read this document must not fail a catalog refresh. Every failure —
   * network, envelope, an unreadable body — returns undefined, and the models
   * simply ship without badges.
   */
  async fetchPromoBadges(credential, signal) {
    try {
      const response = await fetch(`${chatBase(credential)}/console/enterprises/personal/models`, {
        headers: {
          Authorization: `Bearer ${credential.accessToken}`,
          Accept: "application/json",
          Origin: originReferer(credential),
          Referer: `${originReferer(credential)}/`,
          "User-Agent": CLIENT_UA
        },
        signal: signal === void 0 ? AbortSignal.timeout(JSON_TIMEOUT_MS) : AbortSignal.any([signal, AbortSignal.timeout(JSON_TIMEOUT_MS)])
      });
      if (!response.ok) return void 0;
      const envelope = await readEnvelope(response);
      const data = isObject(envelope.data) ? envelope.data : envelope.document;
      const rawModels = Array.isArray(data["models"]) ? data["models"] : [];
      const badges = /* @__PURE__ */ new Map();
      for (const model of rawModels) {
        if (!isObject(model)) continue;
        const id = typeof model["id"] === "string" ? model["id"] : "";
        if (id === "") continue;
        const tags = Array.isArray(model["tags"]) ? model["tags"].filter((tag) => typeof tag === "string" && tag.toLowerCase().startsWith(BADGE_PREFIX)) : [];
        if (tags.length > 0) badges.set(id, tags);
      }
      return badges.size === 0 ? void 0 : badges;
    } catch {
      return void 0;
    }
  }
  /**
   * POST the billing endpoint for the aggregated remaining credit.
   *
   * Two upstream shapes, chosen by account type:
   *
   * - **CN enterprise** (`regionOf === 'cn'` and `enterpriseId` non-empty) asks
   *   `/v2/billing/meter/get-enterprise-user-usage`, which answers with a single
   *   cycle quota. The personal endpoint serves these accounts an empty
   *   `Accounts` list, which the card then renders as "0 credit" — a wrong
   *   number rather than a visible failure (issue #31).
   * - **Everyone else** keeps the personal endpoint unchanged.
   *
   * The region gate is load-bearing: the enterprise endpoint is unverified for
   * the global region, so an international credential that happens to carry an
   * `enterpriseId` must stay on the measured personal path instead of being
   * moved onto an unmeasured one.
   */
  async fetchCredits(credential) {
    if (regionOf(credential.domain) === "cn" && credential.enterpriseId !== void 0 && credential.enterpriseId !== "") {
      return await this.fetchEnterpriseCredits(credential);
    }
    const now = /* @__PURE__ */ new Date();
    const format = (date) => [
      date.getFullYear().toString().padStart(4, "0"),
      (date.getMonth() + 1).toString().padStart(2, "0"),
      date.getDate().toString().padStart(2, "0")
    ].join("-") + " " + [
      date.getHours().toString().padStart(2, "0"),
      date.getMinutes().toString().padStart(2, "0"),
      date.getSeconds().toString().padStart(2, "0")
    ].join(":");
    const response = await fetch(`${billingBase(credential)}/v2/billing/meter/get-user-resource`, {
      method: "POST",
      headers: billingHeaders(credential),
      body: JSON.stringify({
        PageNumber: 1,
        PageSize: 100,
        ProductCode: "p_tcaca",
        Status: [0, 3],
        PackageEndTimeRangeBegin: format(now),
        PackageEndTimeRangeEnd: format(new Date(now.getTime() + 365 * 101 * 24 * 3600 * 1e3))
      }),
      signal: AbortSignal.timeout(JSON_TIMEOUT_MS)
    });
    const envelope = await readEnvelope(response);
    if (!response.ok || envelope.code !== 0) throw envelopeError(response.status, envelope);
    const responseWrapper = typeof envelope.data === "object" && envelope.data !== null ? envelope.data : {};
    const data = typeof responseWrapper["Response"] === "object" && responseWrapper["Response"] !== null ? responseWrapper["Response"] : {};
    const inner = typeof data["Data"] === "object" && data["Data"] !== null ? data["Data"] : {};
    const rawAccounts = Array.isArray(inner["Accounts"]) ? inner["Accounts"] : [];
    const accounts = [];
    let total = 0;
    for (const raw of rawAccounts) {
      if (typeof raw !== "object" || raw === null) continue;
      const account = raw;
      const numberField = (key) => typeof account[key] === "number" ? account[key] : 0;
      const size = numberField("CycleCapacitySize");
      const cycleRemain = numberField("CycleCapacityRemain");
      const cycleUsed = numberField("CycleCapacityUsed");
      const capacityRemain = numberField("CapacityRemain");
      let remain;
      if (size > 0) remain = cycleRemain;
      else if (cycleRemain > 0 || cycleUsed > 0) remain = cycleRemain;
      else remain = capacityRemain;
      if (remain < 0) remain = 0;
      total += remain;
      const endTimeMs = parseCycleEndTime(account["CycleEndTime"]);
      accounts.push({
        packageName: typeof account["PackageName"] === "string" ? account["PackageName"] : "(unnamed)",
        remain,
        size: size > 0 ? size : numberField("CapacitySize"),
        ...endTimeMs === void 0 ? {} : { endTimeMs }
      });
    }
    return { total, accounts, ...summariseExpiry(accounts, now.getTime()) };
  }
  /**
   * CN enterprise credit read: a single cycle quota instead of a package list.
   *
   * Verified against the WorkBuddy desktop app (`app.asar`,
   * `BackendProvider.getEnterpriseUsage` and `CloudAccountRepo.billing`): the
   * body is an empty object and the account identity travels only in the
   * headers. The two official call sites disagree on the field spelling
   * (`limitNum`/`credit` vs `limit_num`/`used_num`), so both are accepted.
   *
   * A body carrying no recognisable quota field is a hard error rather than a
   * zero. Rendering `0` for "we did not understand the answer" is exactly how
   * issue #31 stayed invisible while users saw a plausible wrong number.
   *
   * The error names fields and types only: it reaches the browser, and the
   * response body may describe the account's usage.
   */
  async fetchEnterpriseCredits(credential) {
    const response = await fetch(`${CN_BILLING_BASE}/v2/billing/meter/get-enterprise-user-usage`, {
      method: "POST",
      headers: billingHeaders(credential),
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(JSON_TIMEOUT_MS)
    });
    const envelope = await readEnvelope(response);
    if (!response.ok || envelope.code !== 0) throw envelopeError(response.status, envelope);
    const sources = [];
    for (const candidate of [envelope.data, envelope.document]) {
      if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) continue;
      const record = candidate;
      if (typeof record["data"] === "object" && record["data"] !== null && !Array.isArray(record["data"])) {
        sources.push(record["data"]);
      }
      sources.push(record);
    }
    const numberAt = (source, key) => typeof source[key] === "number" ? source[key] : void 0;
    let limit;
    let used;
    let resetTime;
    for (const source of sources) {
      const candidate = numberAt(source, "limitNum") ?? numberAt(source, "limit_num");
      if (candidate === void 0) continue;
      limit = candidate;
      used = numberAt(source, "credit") ?? numberAt(source, "used_num");
      if (typeof source["cycleResetTime"] === "string" && source["cycleResetTime"] !== "") {
        resetTime = source["cycleResetTime"];
      }
      break;
    }
    if (limit === void 0) {
      throw new Error(`workbuddy enterprise billing response carried no recognised quota field (expected limitNum/limit_num + credit/used_num; received ${describeShape(envelope.document)})`);
    }
    if (limit === -1) {
      return {
        total: 0,
        accounts: [{ packageName: enterprisePackageName, remain: 0, size: 0, unlimited: true }],
        unlimited: true,
        ...resetTime === void 0 ? {} : { cycleResetTime: resetTime }
      };
    }
    if (used === void 0) {
      throw new Error(`workbuddy enterprise billing response carried a quota limit but no recognised usage field (expected credit/used_num alongside limitNum/limit_num; received ${describeShape(envelope.document)})`);
    }
    let remain = limit - used;
    if (remain < 0) remain = 0;
    return {
      total: remain,
      accounts: [{ packageName: enterprisePackageName, remain, size: limit }],
      ...resetTime === void 0 ? {} : { cycleResetTime: resetTime }
    };
  }
  /**
   * One probe request: a real streaming chat call carrying the effort under
   * test.
   *
   * Shares `chatHeaders` with the normal chat path on purpose — the plan
   * forbids probing through anything but the plugin's own credential handling,
   * so a result describes what a real message would experience.
   *
   * The caller aborts as soon as a parseable event arrives; the body is never
   * assembled into an answer. `reasoning_effort` is omitted entirely (rather
   * than sent empty) when `effort` is undefined, so the baseline case is a
   * genuinely bare request.
   *
   * Two international differences, both measured on 2026-09-11:
   *
   * - The gateway requires a leading `system` message (400/11128 otherwise), so
   *   one is prepended for the global region only.
   * - `max_tokens: 1` is below some models' floor (the GPT-5.6 family rejects it
   *   with 400/11133 `integer_below_min_value`), so the international probe asks
   *   for a slightly larger minimum. This is a floor the plugin must clear, not
   *   evidence about any model's effort support: a model still refusing that
   *   minimum is reported as an incompatible request, never as "effort
   *   unsupported", and the ceiling is never raised further to force an answer.
   */
  async probeEffort(credential, model, effort, signal) {
    const international = regionOf(credential.domain) === "global";
    let identity;
    let userAgent;
    try {
      identity = await this.resolveChatIdentity(international ? "global" : "cn");
      userAgent = chatUserAgent(identity, international ? "global" : "cn");
    } catch {
      identity = fallbackChatIdentity(international ? "global" : "cn");
      userAgent = chatUserAgent(identity, international ? "global" : "cn");
    }
    const payload = {
      model,
      stream: true,
      messages: [
        ...international ? [{ role: "system", content: INTERNATIONAL_SYSTEM_PROMPT }] : [],
        { role: "user", content: PROBE_PROMPT }
      ],
      max_tokens: international ? INTERNATIONAL_PROBE_MAX_TOKENS : PROBE_MAX_TOKENS
    };
    if (effort !== void 0) payload["reasoning_effort"] = effort;
    let response;
    try {
      response = await fetch(`${chatBase(credential)}/v2/chat/completions`, {
        method: "POST",
        headers: { ...chatHeaders(credential, userAgent, identity.clientVersion), "Authorization": `Bearer ${credential.accessToken}` },
        body: JSON.stringify(payload),
        signal
      });
    } catch (error) {
      return { status: 0, streamed: false, detail: `transport error: ${String(error)}` };
    }
    if (!response.ok) {
      const text = (await response.text()).slice(0, ERROR_BODY_LIMIT);
      return { status: response.status, streamed: false, ...errorCodeOf(text) };
    }
    const streamed = await readFirstEvent(response);
    return { status: response.status, streamed };
  }
};
function errorCodeOf(text) {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      const wrapped = parsed;
      const extError = wrapped["extError"];
      if (typeof extError === "object" && extError !== null && !Array.isArray(extError)) {
        const code = extError["code"];
        if (typeof code === "string") return { errorCode: code, detail: code };
      }
    }
  } catch {
  }
  return { detail: text.slice(0, 200) };
}
async function readFirstEvent(response) {
  const body = response.body;
  if (body === null) return false;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  try {
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) return false;
      const text = decoder.decode(value, { stream: true });
      if (text.includes("data:")) return true;
    }
  } catch {
    return false;
  } finally {
    await reader.cancel().catch(() => {
    });
  }
}
function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function positive(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
function parseModelCatalog(data, international = false, promoBadges) {
  const rawModels = Array.isArray(data["models"]) ? data["models"] : [];
  const agents = Array.isArray(data["agents"]) ? data["agents"] : [];
  let cliIds;
  for (const agent of agents) {
    if (typeof agent === "object" && agent !== null) {
      const wrapped = agent;
      if (wrapped["name"] === "cli" && Array.isArray(wrapped["models"])) {
        cliIds = wrapped["models"].filter((id) => typeof id === "string");
        break;
      }
    }
  }
  if (cliIds === void 0 || cliIds.length === 0) {
    throw new Error("workbuddy model catalog lists no cli agent models");
  }
  const byId = /* @__PURE__ */ new Map();
  for (const model of rawModels) {
    if (typeof model !== "object" || model === null) continue;
    const wrapped = model;
    const id = typeof wrapped["id"] === "string" ? wrapped["id"] : "";
    if (id === "" || wrapped["disabled"] === true) continue;
    const input = typeof wrapped["maxInputTokens"] === "number" ? wrapped["maxInputTokens"] : 0;
    const output = typeof wrapped["maxOutputTokens"] === "number" ? wrapped["maxOutputTokens"] : 0;
    if (input <= 0 || output <= 0) continue;
    byId.set(id, {
      id,
      name: typeof wrapped["name"] === "string" && wrapped["name"] !== "" ? wrapped["name"] : id,
      contextWindow: international && isObject(wrapped["contextWindow"]) && positive(wrapped["contextWindow"]["defaultLength"]) ? wrapped["contextWindow"]["defaultLength"] : input,
      ...international ? {
        ...isObject(wrapped["contextWindow"]) && positive(wrapped["contextWindow"]["defaultLength"]) ? { defaultContextWindow: wrapped["contextWindow"]["defaultLength"] } : {},
        maxInputTokens: input,
        supportedContextWindows: isObject(wrapped["contextWindow"]) && Array.isArray(wrapped["contextWindow"]["supportedLengths"]) ? wrapped["contextWindow"]["supportedLengths"].filter(positive) : [],
        promotions: parsePromotions(data["modelPromotions"], id)
      } : {},
      maxTokens: output,
      supportsImages: wrapped["supportsImages"] === true && wrapped["disabledMultimodal"] !== true,
      ...resolveUpstreamReasoning(wrapped),
      ...resolveUpstreamBilling(wrapped, promoBadges?.get(id))
    });
  }
  const models = cliIds.map((id) => byId.get(id)).filter((model) => model !== void 0);
  if (models.length === 0) throw new Error("workbuddy model catalog resolved to an empty list");
  return models;
}
function parsePromotions(value, model) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isObject(item) || item["enabled"] !== true) return [];
    const modelIds = item["modelIds"];
    if (!Array.isArray(modelIds) || !modelIds.includes(model)) return [];
    const schedule = item["schedule"];
    const discount = item["discount"];
    const badge = item["badge"];
    if (!isObject(schedule) || !isObject(discount) || !isObject(badge)) return [];
    if (discount["displayMode"] !== "replace") return [];
    const start = typeof schedule["validFrom"] === "string" ? Date.parse(schedule["validFrom"]) : Number.NaN;
    const end = typeof schedule["validUntil"] === "string" ? Date.parse(schedule["validUntil"]) : Number.NaN;
    const factor = discount["factor"];
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
    if (typeof factor !== "number" || !Number.isFinite(factor) || factor < 0) return [];
    return [{
      start,
      end,
      factor,
      label: typeof badge["label"] === "string" ? badge["label"] : "",
      priority: typeof item["priority"] === "number" && Number.isFinite(item["priority"]) ? item["priority"] : 0
    }];
  });
}
function modelWithCurrentPromotion(model, now = Date.now()) {
  if (model.promotions === void 0 || model.promotions.length === 0) return model;
  const promotion = [...model.promotions].sort((a, b) => b.priority - a.priority).find((candidate) => now >= candidate.start && now < candidate.end);
  if (promotion === void 0) {
    const derivedFromPromotion = model.billing?.free === true || (model.billing?.badges?.length ?? 0) > 0 || model.promotions.some((candidate) => candidate.factor !== 1);
    if (!derivedFromPromotion) return model;
    return {
      ...model,
      billing: {
        free: false,
        rateUnknown: true
      }
    };
  }
  const rate = normalizeCredits(model.billing?.credits);
  const original = rate !== void 0 && rate.startsWith("x") ? Number(rate.slice(1)) : Number.NaN;
  if (promotion.factor !== 0 && !Number.isFinite(original)) return model;
  const value = promotion.factor === 0 ? 0 : original * promotion.factor;
  return {
    ...model,
    billing: {
      ...model.billing,
      credits: `x${value.toFixed(2)}`,
      free: value === 0,
      badges: [
        ...model.billing?.badges ?? [],
        ...promotion.label === "" ? [] : [promotion.label]
      ]
    }
  };
}
function prepareCnChatBody(source) {
  let body;
  try {
    body = JSON.parse(source);
  } catch {
    return source;
  }
  if (!isObject(body)) return source;
  dropUnsupportedEffort(body);
  return JSON.stringify(body);
}
function prepareInternationalChatBody(source) {
  const prepared = prepareChatBody(source);
  let body;
  try {
    body = JSON.parse(prepared);
  } catch {
    return prepared;
  }
  if (!isObject(body)) return prepared;
  dropUnsupportedEffort(body);
  const messages = body["messages"];
  if (!Array.isArray(messages)) return JSON.stringify(body);
  const first = messages[0];
  if (isObject(first) && first["role"] === "system") return JSON.stringify(body);
  messages.unshift({ role: "system", content: INTERNATIONAL_SYSTEM_PROMPT });
  return JSON.stringify(body);
}
function dropUnsupportedEffort(obj) {
  if (obj["reasoning_effort"] === "off") delete obj["reasoning_effort"];
}
var INTERNATIONAL_SYSTEM_PROMPT = "You are a helpful assistant.";
var INTERNATIONAL_PROBE_MAX_TOKENS = 16;

export {
  normalizeCredits,
  classifyUpstreamError,
  extractDisplayErrorMessage,
  regionOf,
  prepareChatBody,
  WorkBuddyUpstreamClient,
  parseModelCatalog,
  modelWithCurrentPromotion,
  prepareCnChatBody,
  prepareInternationalChatBody
};
//# sourceMappingURL=chunk-KWXLQJS5.js.map
