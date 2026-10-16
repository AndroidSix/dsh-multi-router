import {
  TraeCredentialStore,
  WORKBUDDY_VARIANTS,
  WorkBuddyCredentialStore,
  identityHeaders,
  traeAccountId
} from "./chunk-OK2T2UAZ.js";
import {
  WorkBuddyUpstreamClient,
  modelWithCurrentPromotion,
  prepareChatBody
} from "./chunk-TEZ2FMEO.js";
import {
  REGION_GATEWAYS,
  regionOfCredential
} from "./chunk-S5KMFAQM.js";
import {
  SseDecoder,
  decodeTraeEvent
} from "./chunk-4V52V5GO.js";
import {
  RouteError,
  abortable,
  qoderContextModel
} from "./chunk-DZ4ZUAYH.js";
import {
  beijingDay,
  writePrivateJson
} from "./chunk-NGVWVIBM.js";

// src/clients.mjs
import { readFile as readFile2 } from "node:fs/promises";
import { setTimeout as delay2 } from "node:timers/promises";

// upstream/trae/src/usage.ts
function asNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function epochToMs(value) {
  if (value === void 0 || !Number.isFinite(value) || value <= 0) return 0;
  return value > 1e12 ? value : value * 1e3;
}
function parseUsageSnapshot(payload) {
  const summaryRaw = payload["usage_summary"];
  const summary = {
    totalAmount: asNumber(summaryRaw?.["total_amount"]) ?? 0,
    consumedAmount: asNumber(summaryRaw?.["consumed_amount"]) ?? 0,
    consumptionRatio: asNumber(summaryRaw?.["consumption_ratio"]) ?? 0
  };
  const trial = payload["trial_status"];
  const packs = [];
  const rawPacks = Array.isArray(payload["user_entitlement_pack_list"]) ? payload["user_entitlement_pack_list"] : [];
  for (const raw of rawPacks) {
    if (typeof raw !== "object" || raw === null) continue;
    const pack = raw;
    const base = pack["entitlement_base_info"];
    const quota = base?.["quota"];
    const usage = pack["usage"];
    const productExtra = base?.["product_extra"];
    const packageExtra = productExtra?.["package_extra"];
    const packageQuota = packageExtra?.["quota"];
    const creditsLimit = asNumber(packageQuota?.["credits_limit"]) ?? asNumber(quota?.["credits_limit"]);
    const consumedCredits = asNumber(usage?.["credits_amount"]);
    const availableEndpoint = asNumber(base?.["available_endpoint"]);
    packs.push({
      displayDesc: typeof pack["display_desc"] === "string" ? pack["display_desc"] : "",
      entitlementId: typeof base?.["entitlement_id"] === "string" ? base["entitlement_id"] : "",
      endTimeMs: epochToMs(asNumber(base?.["end_time"])),
      currency: asNumber(base?.["currency"]) ?? 0,
      ...availableEndpoint === void 0 ? {} : { availableEndpoint },
      ...creditsLimit === void 0 ? {} : { creditsLimit },
      ...consumedCredits === void 0 ? {} : { consumedCredits }
    });
  }
  return {
    isCreditsBilling: payload["is_credits_billing"] === true,
    isDollarUsageBilling: payload["is_dollar_usage_billing"] === true,
    isPayFreshman: payload["is_pay_freshman"] === true,
    inTrial: trial?.["is_in_trial"] === true,
    trialEndTimeMs: asNumber(trial?.["trial_end_time"]) ?? 0,
    summary,
    packs
  };
}
var TraeUsageClient = class {
  constructor(options) {
    this.options = options;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.baseUrl = options.baseUrl;
    this.timeoutMs = options.timeoutMs ?? 3e4;
  }
  fetchImpl;
  baseUrl;
  timeoutMs;
  /** Region of the current credential; `cn` when unresolvable. */
  async currentRegion() {
    const credential = await this.options.credential();
    return credential === void 0 ? "cn" : regionOfCredential(credential);
  }
  /**
   * Pay base for the current credential's region. An explicit baseUrl (tests,
   * diagnostics) pins the endpoint; otherwise CN uses `api.trae.cn` and the
   * international region its own verified pay gateway.
   */
  async payBase() {
    return this.baseUrl ?? REGION_GATEWAYS[await this.currentRegion()].pay;
  }
  /**
   * Device id for the check-in routes, or undefined when the machine's
   * installation identity cannot be read. Best-effort on purpose: a missing
   * identity must not break the read-only status query, which the upstream
   * answers with or without the header.
   */
  async deviceIdHeader() {
    try {
      const deviceId = await this.options.deviceId?.();
      return deviceId === void 0 || deviceId === "" ? {} : { "x-device-id": deviceId };
    } catch {
      return {};
    }
  }
  async authedHeaders() {
    const credential = await this.options.credential();
    if (credential === void 0 || credential.accessToken === "") {
      throw new Error("Trae credential is not available; cannot query usage");
    }
    const origin = await this.currentRegion() === "ai" ? "https://www.trae.ai" : "https://www.trae.cn";
    return {
      "Authorization": `Cloud-IDE-JWT ${credential.accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
      "Origin": origin,
      "Referer": `${origin}/`
    };
  }
  async post(path, data, signal, extraHeaders = {}) {
    const headers = { ...await this.authedHeaders(), ...extraHeaders };
    const response = await this.fetchImpl(`${await this.payBase()}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
      signal: signal ?? AbortSignal.timeout(this.timeoutMs)
    });
    if (!response.ok) throw new Error(`Trae usage endpoint ${path} returned HTTP ${response.status}`);
    return await response.json();
  }
  /**
   * Subscription/pay status of an international (ai) account. The CN region
   * never calls this (its contract is unverified there); the ai region uses
   * this instead of the Work-credit `snapshot`.
   */
  async payStatus(signal) {
    const region = await this.currentRegion();
    if (region !== "ai") throw new Error("Trae pay status is only available for the international (ai) region");
    const payload = await this.post("/trae/api/v1/pay/ide_user_pay_status", {}, signal);
    const flag = (key) => payload[key] === true;
    const trial = typeof payload["trial_status"] === "object" && payload["trial_status"] !== null ? payload["trial_status"] : {};
    const fissionStart = asNumber(payload["solo_fission_start_time"]);
    const fissionExpire = asNumber(payload["solo_fission_expire_time"]);
    const fissionMax = asNumber(payload["solo_fission_max_usage"]);
    const payIdentity = asNumber(payload["user_pay_identity"]);
    const payIdentityStr = typeof payload["user_pay_identity_str"] === "string" && payload["user_pay_identity_str"].trim() !== "" ? payload["user_pay_identity_str"].trim() : void 0;
    return {
      isDollarUsageBilling: flag("is_dollar_usage_billing"),
      hasPackage: flag("has_package"),
      isPayFreshman: flag("is_pay_freshman") || flag("is_pay_freshman_v2"),
      inTrial: trial["is_in_trial"] === true,
      trialEndTimeMs: asNumber(trial["trial_end_time"]) ?? 0,
      enableSoloLite: flag("enable_solo_lite"),
      enableSoloBuilder: flag("enable_solo_builder"),
      enableSoloCoder: flag("enable_solo_coder"),
      enableSoloWeb: flag("enable_solo_web"),
      ...payIdentity === void 0 ? {} : { payIdentity },
      ...payIdentityStr === void 0 ? {} : { payIdentityStr },
      ...fissionStart === void 0 || fissionExpire === void 0 || fissionMax === void 0 ? {} : {
        fission: { startTimeMs: fissionStart, expireTimeMs: fissionExpire, maxUsage: fissionMax }
      }
    };
  }
  /**
   * The Work-credit endpoints are CN-only. The international region is
   * subscription-based and must read {@link payStatus} instead; guarding here
   * keeps the card's degraded `creditsError` message diagnosable rather than
   * letting an ai credential hit an unverified path on its pay gateway.
   */
  async requireCnRegion(method) {
    if (await this.currentRegion() !== "cn") {
      throw new Error(`Trae ${method} is only available for the CN region; the international (ai) region uses payStatus`);
    }
  }
  /** Total entitlements / credits and per-pack breakdown. */
  async snapshot(signal) {
    await this.requireCnRegion("usage snapshot");
    const payload = await this.post("/trae/api/v2/pay/web_user_ent_usage", { require_usage: true }, signal);
    return parseUsageSnapshot(payload);
  }
  /**
   * Daily check-in status. Read-only, and answered with or without the device
   * header — the claim is what needs it.
   *
   * The read DOES carry the header whenever this installation has one, and
   * that is deliberate rather than incidental: `did_checked_in` is answered
   * per device, so omitting the header would make a device that already claimed
   * today look identical to one that never has (measured 2026-09-26, see
   * {@link TraeCheckinStatus.didCheckedIn}).
   */
  async checkinStatus(signal) {
    await this.requireCnRegion("check-in status");
    const headers = await this.deviceIdHeader();
    const payload = await this.post("/trae/api/v2/ug/checkin_credits/status", {}, signal, headers);
    const extraCredits = asNumber(payload["extra_credits"]);
    return {
      checkedIn: payload["checked_in"] === true,
      credits: asNumber(payload["credits"]) ?? 0,
      enabled: payload["enable"] !== false,
      didCheckedIn: payload["did_checked_in"] === true,
      ...extraCredits === void 0 || extraCredits <= 0 ? {} : { extraCredits }
    };
  }
  /**
   * Claim today's check-in reward. The ONLY state-changing call in this client.
   *
   * The upstream is idempotent per Beijing day (verified 2026-09-24: repeating
   * the call on an already-claimed day answers `code: 0` while the entitlement
   * total stays byte-identical), so a double click cannot double-grant. The
   * card and its route still guard, because "cannot double-grant" is a property
   * of the upstream we verify rather than one we rely on.
   *
   * A business refusal arrives as HTTP 200 with a non-zero `code` — most often
   * `9004` when the request carries no `x-device-id`. That is reported as
   * `claimed: false` rather than thrown, so the caller can tell "the upstream
   * refused this" apart from "the request never arrived".
   */
  async claimCheckin(signal) {
    await this.requireCnRegion("check-in claim");
    const headers = await this.deviceIdHeader();
    const payload = await this.post("/trae/api/v2/ug/checkin_credits/claim", {}, signal, headers);
    const code = asNumber(payload["code"]) ?? 0;
    return {
      claimed: code === 0,
      code,
      message: typeof payload["message"] === "string" ? payload["message"].slice(0, 200) : ""
    };
  }
  /** Rewards / activity rules. */
  async activities(signal) {
    await this.requireCnRegion("activities");
    const payload = await this.post("/trae/api/v2/ug/activity/info", {}, signal);
    const rawActivities = Array.isArray(payload["commercial_activities"]) ? payload["commercial_activities"] : [];
    const activities = [];
    for (const raw of rawActivities) {
      if (typeof raw !== "object" || raw === null) continue;
      const rule = raw;
      activities.push({
        activityId: typeof rule["activity_id"] === "string" ? rule["activity_id"] : "",
        enabled: rule["Enabled"] === true,
        activityType: asNumber(rule["activity_type"]) ?? 0,
        startTimeMs: asNumber(rule["start_time_ms"]) ?? 0,
        endTimeMs: asNumber(rule["end_time_ms"]) ?? 0,
        ...rule["work_extra"] === void 0 ? {} : { workExtra: rule["work_extra"] }
      });
    }
    return activities;
  }
  /** Convenience: snapshot + check-in + activities in one call (best-effort, non-fatal on missing). */
  async view(signal) {
    const [snapshot, checkin, activities] = await Promise.all([
      this.snapshot(signal),
      this.checkinStatus(signal),
      this.activities(signal)
    ]);
    return { snapshot, checkin, activities };
  }
};

// upstream/trae/src/refresh.ts
import { hostname } from "node:os";
import { randomBytes, sign } from "node:crypto";
var TRAE_EXCHANGE_TOKEN_PATH = "/trae/api/v3/oauth/ExchangeToken";
var TRAE_LEGACY_EXCHANGE_TOKEN_PATH = "/cloudide/api/v3/trae/oauth/ExchangeToken";
var DESKTOP_CLIENT_ID = "ono9krqynydwx5";
var SOLO_CLIENT_ID = "en1oxy7wnw8j9n";
var CURRENT_CONTRACT = {
  cn: { path: TRAE_EXCHANGE_TOKEN_PATH, clientId: DESKTOP_CLIENT_ID, platformCode: "IDE_PC" },
  sg: { path: TRAE_EXCHANGE_TOKEN_PATH, clientId: DESKTOP_CLIENT_ID, platformCode: "IDE_PC" },
  solo: { path: TRAE_EXCHANGE_TOKEN_PATH, clientId: SOLO_CLIENT_ID, platformCode: "SOLO_PC" },
  "solo-sg": { path: TRAE_EXCHANGE_TOKEN_PATH, clientId: SOLO_CLIENT_ID, platformCode: "SOLO_PC" }
};
function normalizeHost(host) {
  const value = host.trim();
  if (value === "") throw new Error("Trae refresh host is missing");
  return value.replace(/\/$/, "");
}
function osInfo(platform = process.platform) {
  return platform === "darwin" ? "mac" : platform === "win32" ? "windows" : platform;
}
function traeDeviceProofMessage(input) {
  return ["POST", input.path, input.clientId, input.refreshToken, String(input.timestamp), input.nonce].join("\n");
}
function signTraeDeviceProof(input) {
  const timestamp = input.timestamp ?? Math.floor(Date.now() / 1e3);
  const nonce = input.nonce ?? randomBytes(16).toString("hex");
  const message = traeDeviceProofMessage({
    path: input.path,
    clientId: input.clientId,
    refreshToken: input.refreshToken,
    timestamp,
    nonce
  });
  const Signature = sign("sha256", Buffer.from(message), input.privateKeyPEM).toString("base64");
  return { Signature, Timestamp: timestamp, Nonce: nonce };
}
function traeDeviceInfoBody(contract, device, platform) {
  const os = osInfo(platform);
  return {
    DeviceID: device.deviceId,
    MachineID: device.machineId,
    PlatformCode: contract.platformCode,
    DeviceType: "PC",
    ...device.deviceName === void 0 ? {} : { DeviceName: device.deviceName },
    ...device.deviceModel === void 0 ? {} : { DeviceModel: device.deviceModel },
    ...device.appVersion === void 0 ? {} : { ClientVersion: device.appVersion },
    ...device.deviceKeyPair === void 0 ? {} : { DevicePublicKey: device.deviceKeyPair.publicKeyPEM },
    ...device.deviceBrand === void 0 ? {} : { DeviceBrand: device.deviceBrand },
    ...device.deviceCpu === void 0 ? {} : { DeviceCPU: device.deviceCpu },
    OSInfo: os,
    OSVersion: device.osVersion ?? `${os} ${hostname()}`
  };
}
function currentBody(credential, contract, device) {
  return {
    ClientID: contract.clientId,
    ClientSecret: "",
    RefreshToken: credential.refreshToken,
    DeviceInfo: traeDeviceInfoBody(contract, device),
    DeviceProof: signTraeDeviceProof({
      path: contract.path,
      clientId: contract.clientId,
      refreshToken: credential.refreshToken ?? "",
      privateKeyPEM: device.deviceKeyPair.privateKeyPEM
    }),
    ...device.appVersion === void 0 ? {} : { IDEVersion: device.appVersion }
  };
}
function legacyBody(credential, clientId) {
  return {
    ClientID: clientId,
    ClientSecret: "-",
    RefreshToken: credential.refreshToken,
    UserID: credential.userId
  };
}
function outcomeOf(payload, label) {
  const result = payload.Result;
  const accessToken = typeof result?.["Token"] === "string" ? result["Token"] : "";
  if (accessToken === "") throw new Error(`${label} returned no token`);
  const expiry = result?.["TokenExpireAt"];
  const expiresAtMs = typeof expiry === "number" ? expiry : typeof expiry === "string" ? Date.parse(expiry) : Number.NaN;
  if (!Number.isFinite(expiresAtMs)) throw new Error(`${label} returned an invalid expiry`);
  const refreshToken = typeof result?.["RefreshToken"] === "string" && result["RefreshToken"] !== "" ? result["RefreshToken"] : void 0;
  const refreshExpiry = result?.["RefreshExpireAt"];
  const parsedRefreshExpiry = typeof refreshExpiry === "string" ? Date.parse(refreshExpiry) : Number.NaN;
  const refreshExpiresAtMs = typeof refreshExpiry === "number" && Number.isFinite(refreshExpiry) && refreshExpiry > 0 ? refreshExpiry : Number.isFinite(parsedRefreshExpiry) ? parsedRefreshExpiry : void 0;
  return {
    accessToken,
    ...refreshToken === void 0 ? {} : { refreshToken },
    expiresAtMs,
    ...refreshExpiresAtMs === void 0 ? {} : { refreshExpiresAtMs }
  };
}
async function postExchangeToken(host, path, body, signal, label) {
  const response = await fetch(`${normalizeHost(host)}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(3e4)
  });
  if (!response.ok) throw new Error(`${label} failed (http ${response.status})`);
  return outcomeOf(await response.json(), label);
}
async function refreshTraeCredential(credential, signal, device) {
  const contract = CURRENT_CONTRACT[credential.edition];
  if (contract === void 0) throw new Error(`Trae ${credential.edition} refresh contract is not verified`);
  if (credential.refreshToken === void 0) throw new Error("Trae refresh token is missing");
  const attempts = [];
  if (device?.deviceKeyPair === void 0) {
    attempts.push(`${contract.path}: no device keypair in this install's storage`);
  } else {
    try {
      return await postExchangeToken(credential.host, contract.path, currentBody(credential, contract, device), signal, "Trae token refresh");
    } catch (error) {
      attempts.push(`${contract.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  try {
    return await postExchangeToken(credential.host, TRAE_LEGACY_EXCHANGE_TOKEN_PATH, legacyBody(credential, contract.clientId), signal, "Trae token refresh (legacy)");
  } catch (error) {
    attempts.push(`${TRAE_LEGACY_EXCHANGE_TOKEN_PATH}: ${error instanceof Error ? error.message : String(error)}`);
  }
  throw new Error(`Trae token refresh failed \u2014 ${attempts.join("; ")}`);
}

// upstream/trae/src/protocol.ts
import { randomUUID } from "node:crypto";
var TRAE_VERSION_CODE_FALLBACK = "20260716";
function normalizeTraeVersionCode(buildVersion) {
  if (buildVersion === void 0 || buildVersion.trim() === "") return TRAE_VERSION_CODE_FALLBACK;
  const trimmed = buildVersion.trim();
  return /^\d+$/.test(trimmed) ? trimmed : TRAE_VERSION_CODE_FALLBACK;
}
function buildTraeHeaders(credential, identity, options = {}) {
  const requestId = options.requestId ?? randomUUID();
  const traceId = requestId.replaceAll("-", "").slice(0, 32);
  const profile = options.profile ?? "agent-task";
  const common = {
    "Authorization": `Cloud-IDE-JWT ${credential.accessToken}`,
    "X-Ide-Token": credential.accessToken,
    "x-plugin-channel": "icube-ai",
    "User-Agent": `Trae/${identity.appVersion ?? identity.buildVersion ?? "unknown"}`,
    "x-app-id": options.appId ?? "6eefa01c-1036-4c7e-9ca5-d891f63bfcd8",
    ...identityHeaders(identity),
    // The upstream binds these as numbers; a dotted build string is rejected.
    "x-app-version-code": normalizeTraeVersionCode(identity.buildVersion),
    "x-ide-version-code": normalizeTraeVersionCode(identity.buildVersion),
    "x-custom-trace-id": traceId,
    "x-flow-traceparent": `04-${traceId}-${traceId.slice(0, 16)}-01`,
    "request-traffic-type": "prod",
    "Content-Type": "application/json"
  };
  if (profile === "native-curl") {
    return {
      "Content-Type": "application/json",
      "request-traffic-type": "prod",
      "x-app-id": options.appId ?? "6eefa01c-1036-4c7e-9ca5-d891f63bfcd8",
      ...identityHeaders(identity),
      "x-custom-trace-id": traceId,
      "x-flow-traceparent": `04-${traceId}-${traceId.slice(0, 16)}-01`,
      "X-Ide-Token": credential.accessToken
    };
  }
  if (profile === "model-detail") return { ...common, "Accept": "application/json" };
  if (profile === "raw-chat") return { ...common, "Accept": "text/event-stream" };
  return {
    ...common,
    "X-Cloudide-Token": credential.accessToken,
    "x-uid": credential.userId,
    "x-request-id": requestId,
    "x-trae-request-id": requestId,
    "Accept": "text/event-stream"
  };
}
var buildTraeCnHeaders = buildTraeHeaders;
function traeEndpoint(baseUrl, path) {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

// upstream/trae/src/reasoning.ts
var TRAE_REASONING_EFFORTS = ["minimal", "low", "medium", "high", "xhigh"];
function parseReasoningCapability(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
  const record2 = value;
  const rawOptions = Array.isArray(record2["reasoning_effort_options"]) ? record2["reasoning_effort_options"] : [];
  const supported = rawOptions.filter((item) => typeof item === "string" && TRAE_REASONING_EFFORTS.includes(item));
  const rawDefault = record2["default_reasoning_effort"];
  const defaultEffort = typeof rawDefault === "string" && supported.includes(rawDefault) ? rawDefault : void 0;
  if (supported.length === 0 && defaultEffort === void 0) return void 0;
  return { supported, ...defaultEffort === void 0 ? {} : { defaultEffort } };
}

// upstream/trae/src/solo.ts
var TRAE_SOLO_FUNCTION = "solo_work_lite";
var TRAE_DIRECTORY_FUNCTIONS = {
  cn: ["solo_work_remote", TRAE_SOLO_FUNCTION, "solo_agent_remote", "chat_v3", "solo_coder"],
  ai: ["solo_work_remote", TRAE_SOLO_FUNCTION, "solo_agent_remote", "chat_v3"]
};
var TRAE_SOLO_CHAT_PATH = "/api/agent/v3/llm_utils_chat";
var TRAE_SOLO_MODELS_PATH = "/api/ide/v1/get_detail_param";
function classify(status) {
  if (status === 401 || status === 403) return "authentication";
  if (status === 402) return "hard_credit";
  if (status === 429) return "soft_rate";
  if (status === 404) return "not_found";
  if (status >= 500) return "server";
  return "client";
}
function finitePositive(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : void 0;
}
function prepareSoloBody(source, defaultModel = "glm-5.2", functionName) {
  const input = JSON.parse(source);
  const requestedModel = typeof input["model"] === "string" && input["model"].trim() !== "" ? input["model"].trim() : defaultModel;
  const model = requestedModel;
  const body = {
    ...Array.isArray(input["messages"]) ? { messages: input["messages"] } : {},
    model,
    config_name: model,
    // The directory function that actually lists this model (see
    // TRAE_DIRECTORY_FUNCTIONS). The bridge may have already stamped the exact
    // function it learned from the directory, which wins over the default.
    function: typeof input["function"] === "string" && input["function"] !== "" ? input["function"] : functionName ?? TRAE_SOLO_FUNCTION,
    stream: true,
    ...Array.isArray(input["tools"]) ? { tools: input["tools"] } : {},
    ...typeof input["reasoning_effort"] === "string" ? { reasoning_effort: input["reasoning_effort"] } : {}
  };
  if (Array.isArray(body["messages"])) {
    for (const raw of body["messages"]) {
      if (typeof raw !== "object" || raw === null) continue;
      const message = raw;
      if (message["role"] === "developer") message["role"] = "system";
      if (typeof message["content"] === "string") message["content"] = [{ type: "text", text: message["content"] }];
      if (message["role"] === "assistant" && Array.isArray(message["tool_calls"])) {
        for (const rawCall of message["tool_calls"]) {
          if (typeof rawCall !== "object" || rawCall === null) continue;
          const call = rawCall;
          if (typeof call["function"] === "object" && call["function"] !== null) {
            call["function_call"] = call["function"];
            delete call["function"];
          }
        }
      }
      if (message["role"] === "tool") {
        message["role"] = "tool";
        if (typeof message["tool_call_id"] !== "string" || message["tool_call_id"] === "") {
          throw new Error("Trae SOLO tool message requires tool_call_id");
        }
      }
    }
  }
  if (Array.isArray(body["tools"])) {
    for (const raw of body["tools"]) {
      if (typeof raw !== "object" || raw === null) continue;
      const fn = raw["function"];
      if (typeof fn !== "object" || fn === null) continue;
      const record2 = fn;
      if (typeof record2["parameters"] === "object" && record2["parameters"] !== null) record2["parameters"] = JSON.stringify(record2["parameters"]);
    }
  }
  return JSON.stringify(body);
}
function wireCreditMultiplier(config) {
  const raw = config["display_contact_config"];
  if (typeof raw !== "string" || raw === "") return void 0;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return void 0;
  }
  if (typeof parsed !== "object" || parsed === null) return void 0;
  const consumption = parsed["consumption_rate"];
  if (typeof consumption !== "object" || consumption === null) return void 0;
  const entry = consumption;
  if (entry["enable"] !== true) return void 0;
  const data = entry["data"];
  if (typeof data !== "object" || data === null) return void 0;
  return finitePositive(data["rate"]);
}
var TraeSoloUpstreamClient = class {
  constructor(options) {
    this.options = options;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }
  fetchImpl;
  /**
   * Read the callable roster for this credential's region.
   *
   * Every function in {@link TRAE_DIRECTORY_FUNCTIONS} is asked, in order, and
   * their answers are unioned: the first function to list a `config_name` owns
   * it. Trae splits its roster across SOLO modes, and a model is only callable
   * through the function that lists it (glm-5.3 exists solely under
   * `solo_work_remote` on the CN gateway). Asking one function therefore
   * silently hides models that the other one serves. The remote directory
   * remains the merge skeleton, so agent-internal entries (search_agent_*,
   * paygo variants) never surface even though they appear here.
   */
  async fetchModels(signal) {
    const [credential, identity] = await Promise.all([this.options.credential(), this.options.identity()]);
    const region = regionOfCredential(credential);
    const base = this.options.baseUrl ?? REGION_GATEWAYS[region].chat;
    const headers = { ...buildTraeCnHeaders(credential, identity), Accept: "application/json" };
    const byId = /* @__PURE__ */ new Map();
    const failures = [];
    for (const directoryFunction of TRAE_DIRECTORY_FUNCTIONS[region]) {
      let list;
      try {
        const response = await this.fetchImpl(traeEndpoint(base, TRAE_SOLO_MODELS_PATH), {
          method: "POST",
          headers,
          body: JSON.stringify({
            function: directoryFunction,
            config_names: null,
            need_prompt: false,
            current_config_info: null,
            poly_prompt: true,
            mode_type: null,
            agent_type: null
          }),
          signal: signal ?? AbortSignal.timeout(3e4)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const document = await response.json();
        list = Array.isArray(document["config_info_list"]) ? document["config_info_list"] : [];
      } catch (error) {
        failures.push(`${directoryFunction}: ${String(error).slice(0, 80)}`);
        continue;
      }
      this.collectModels(list, directoryFunction, byId);
    }
    const models = [...byId.values()];
    if (models.length === 0) {
      throw new Error(`Trae SOLO models response contained no models (${failures.join("; ") || "empty directory"})`);
    }
    return models;
  }
  /** Merge one function's config list into the shared catalogue (first wins). */
  collectModels(list, directoryFunction, byId) {
    for (const raw of list) {
      if (typeof raw !== "object" || raw === null) continue;
      const config = raw;
      const id = typeof config["config_name"] === "string" ? config["config_name"] : "";
      if (id === "") continue;
      const display = typeof config["display_config"] === "object" && config["display_config"] !== null ? config["display_config"] : {};
      const details = Array.isArray(config["model_detail_list"]) ? config["model_detail_list"] : [];
      const detail = typeof details[0] === "object" && details[0] !== null ? details[0] : {};
      const contextTokens = typeof config["context_window_tokens"] === "object" && config["context_window_tokens"] !== null ? config["context_window_tokens"] : {};
      const promptMaxTokens = finitePositive(detail["prompt_max_tokens"]);
      const devTokens = finitePositive(contextTokens["dev"]);
      const contextWindow = promptMaxTokens ?? devTokens;
      const maxTokens = finitePositive(detail["max_tokens"]);
      const reasoning = parseReasoningCapability({ ...config, ...detail });
      const creditMultiplier = wireCreditMultiplier(config);
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        name: typeof display["display_name"] === "string" && display["display_name"] !== "" ? display["display_name"] : id,
        ...contextWindow === void 0 ? {} : { contextWindow },
        ...maxTokens === void 0 ? {} : { maxTokens },
        ...reasoning === void 0 ? {} : { reasoning },
        ...creditMultiplier === void 0 ? {} : { creditMultiplier },
        function: directoryFunction
      });
    }
  }
  async chatStream(bodyJson, signal, functionName) {
    let prepared;
    try {
      prepared = prepareSoloBody(bodyJson, void 0, functionName);
    } catch {
      return { ok: false, status: 400, kind: "client", message: "invalid JSON request" };
    }
    const [credential, identity] = await Promise.all([this.options.credential(), this.options.identity()]);
    const headers = buildTraeCnHeaders(credential, identity);
    const base = this.options.baseUrl ?? REGION_GATEWAYS[regionOfCredential(credential)].chat;
    let response;
    try {
      response = await this.fetchImpl(traeEndpoint(base, TRAE_SOLO_CHAT_PATH), {
        method: "POST",
        headers,
        body: prepared,
        signal: signal ?? AbortSignal.timeout(12e4)
      });
    } catch (error) {
      return { ok: false, status: 0, kind: "server", message: `transport error: ${String(error)}` };
    }
    if (response.ok) return { ok: true, response };
    const text = (await response.text()).slice(0, 1024);
    this.options.log?.("dsh-connect-trae: llm_utils_chat rejected", {
      status: response.status,
      model: JSON.parse(prepared)["model"],
      configName: JSON.parse(prepared)["config_name"],
      reasoningEffort: JSON.parse(prepared)["reasoning_effort"],
      body: text
    });
    return { ok: false, status: response.status, kind: classify(response.status), message: text || `Trae SOLO returned HTTP ${response.status}` };
  }
};

// upstream/trae/src/model-metadata.ts
function finitePositive2(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : void 0;
}
function record(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function parseFeatures(value) {
  if (typeof value !== "string" || value === "") return void 0;
  try {
    return record(JSON.parse(value));
  } catch {
    return void 0;
  }
}
var EFFORT_MAP = {
  light: "low",
  high: "high",
  extra_high: "xhigh"
};
function parseTraeRemoteModel(value) {
  const raw = record(value);
  if (raw === void 0 || typeof raw.name !== "string" || raw.name === "") return void 0;
  const context = record(raw.context_window_tokens);
  const dev = finitePositive2(context?.["dev"]);
  const max = raw.max_mode === true ? finitePositive2(context?.["max"]) : void 0;
  const features = parseFeatures(raw.features);
  const consumption = record(features?.["consumption_rate"]);
  const consumptionData = record(consumption?.["data"]);
  const creditMultiplier = consumption?.["enable"] === true ? finitePositive2(consumptionData?.["rate"]) : void 0;
  const reasoningFeature = record(features?.["reasoning"]);
  const reasoningSupported = reasoningFeature?.["enable"] === true;
  const reasoningConfig = record(raw.reasoning_effort_config);
  const rawOptions = Array.isArray(reasoningConfig?.["options"]) ? reasoningConfig["options"] : [];
  const supported = rawOptions.flatMap((option) => {
    if (typeof option !== "string") return [];
    const effort = EFFORT_MAP[option];
    return effort === void 0 ? [] : [effort];
  });
  const rawDefault = reasoningConfig?.["default_level"];
  const mappedDefault = typeof rawDefault === "string" ? EFFORT_MAP[rawDefault] : void 0;
  const defaultEffort = mappedDefault !== void 0 && supported.includes(mappedDefault) ? mappedDefault : void 0;
  return {
    id: raw.name,
    name: typeof raw.display_name === "string" && raw.display_name !== "" ? raw.display_name : raw.name,
    multimodal: raw.multimodal === true,
    ...dev === void 0 ? {} : { contextWindow: dev },
    ...max === void 0 ? {} : { maxContextWindow: max },
    ...creditMultiplier === void 0 ? {} : { creditMultiplier },
    reasoningSupported,
    ...supported.length === 0 ? {} : { reasoning: { supported, ...defaultEffort === void 0 ? {} : { defaultEffort } } }
  };
}

// upstream/trae/src/solo-remote.ts
var TRAE_REMOTE_DIRECTORY_FUNCTIONS = {
  cn: ["solo_agent", "solo_agent_remote", "solo_work_remote", "solo_work_lite", "chat_v3", "solo_coder", "builder_v3"],
  ai: ["solo_agent", "solo_agent_remote", "solo_work_remote", "solo_work_lite", "chat_v3", "solo_coder", "builder_v3"]
};
function preferStrongerRow(candidate, incumbent) {
  if (incumbent === void 0) return candidate;
  const candidateMax = candidate.maxContextWindow;
  const incumbentMax = incumbent.maxContextWindow;
  if (candidateMax !== void 0 && incumbentMax === void 0) return candidate;
  if (candidateMax === void 0 && incumbentMax !== void 0) return incumbent;
  if (candidateMax !== void 0 && incumbentMax !== void 0 && candidateMax !== incumbentMax) {
    return candidateMax > incumbentMax ? candidate : incumbent;
  }
  return (candidate.contextWindow ?? 0) > (incumbent.contextWindow ?? 0) ? candidate : incumbent;
}
function remoteDressing(region) {
  return region === "ai" ? { referer: "https://coresg-normal.trae.ai/", timezone: "Asia/Singapore", language: "en" } : { referer: "https://solo.trae.cn/", timezone: "Asia/Shanghai", language: "zh-cn" };
}
var TraeSoloRemoteCatalogClient = class {
  constructor(options) {
    this.options = options;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.baseUrl = options.baseUrl;
  }
  fetchImpl;
  baseUrl;
  async headers(region) {
    const credential = await this.options.credential();
    const dressing = remoteDressing(region);
    return {
      "Authorization": `Cloud-IDE-JWT ${credential.accessToken}`,
      "Content-Type": "application/json",
      "x-trae-client-type": "web",
      "x-trae-user-timezone": dressing.timezone,
      "x-preferenced-language": dressing.language,
      "Referer": dressing.referer,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    };
  }
  async fetchModels(signal) {
    const credential = await this.options.credential();
    const region = regionOfCredential(credential);
    const base = this.baseUrl ?? REGION_GATEWAYS[region].remote;
    const headers = await this.headers(region);
    const functions = TRAE_REMOTE_DIRECTORY_FUNCTIONS[region].join(",");
    const response = await this.fetchImpl(`${base}/models?functions=${functions}`, { headers, signal: signal ?? AbortSignal.timeout(3e4) });
    if (!response.ok) throw new Error(`SOLO remote models returned HTTP ${response.status}`);
    const json = await response.json();
    const groups = json.data?.list ?? [];
    const byId = /* @__PURE__ */ new Map();
    for (const group of groups) {
      for (const raw of group.models ?? []) {
        const model = parseTraeRemoteModel(raw);
        if (model === void 0) continue;
        byId.set(model.id, preferStrongerRow(model, byId.get(model.id)));
      }
    }
    const models = [...byId.values()];
    if (models.length === 0) throw new Error("SOLO remote models response contained no models");
    return models;
  }
};

// upstream/trae/src/solo-bridge.ts
import { randomUUID as randomUUID2 } from "node:crypto";
var TRAE_ERROR_HINTS = {
  1005: "Trae requires a paid plan for this model; the current account's plan does not cover it",
  4001: "Trae does not serve this model under the SOLO function the request used (config_name rejected)",
  4008: "Trae reports the account's SOLO quota is exhausted for this request",
  4011: "Trae throttled the SOLO channel for this account (a rate limit, not the credit balance)",
  4023: "Trae does not recognise this model name on the SOLO route that was asked"
};
function traeErrorPlan(extra) {
  let value = extra;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return void 0;
    }
  }
  if (typeof value !== "object" || value === null) return void 0;
  const plan = value["plan"];
  return typeof plan === "number" ? plan : void 0;
}
function describeTraeFailure(failure) {
  const plan = traeErrorPlan(failure.extra);
  const parts = [
    failure.code === void 0 ? "Trae refused the request" : TRAE_ERROR_HINTS[failure.code] ?? "Trae refused the request",
    ...plan === void 0 ? [] : [`plan ${plan}`],
    ...failure.code === void 0 ? [] : [`Trae code ${failure.code}`]
  ];
  const detail = failure.message.trim();
  return detail === "" ? parts.join(" \xB7 ") : `${parts.join(" \xB7 ")} \xB7 upstream: ${detail}`;
}
function classifyTraeFailure(failure) {
  if (failure.code === 1005) return { status: 402, kind: "hard_credit" };
  if (failure.code === 4011) return { status: 429, kind: "soft_rate" };
  return { status: 400, kind: "client" };
}
function traeFailureOf(decoded) {
  if (decoded.type !== "unknown") return void 0;
  const payload = decoded.data;
  const code = typeof payload?.["code"] === "number" ? payload["code"] : void 0;
  if (decoded.event !== "error" && !(code !== void 0 && code >= 4e3)) return void 0;
  return {
    ...code === void 0 ? {} : { code },
    message: typeof payload?.["message"] === "string" ? payload["message"] : "",
    ...payload?.["extra"] === void 0 ? {} : { extra: payload["extra"] }
  };
}
function normalizeToolCalls(value) {
  if (!Array.isArray(value)) return [];
  const calls = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) continue;
    const record2 = raw;
    const rawFunction = typeof record2["function_call"] === "object" && record2["function_call"] !== null ? record2["function_call"] : typeof record2["function"] === "object" && record2["function"] !== null ? record2["function"] : {};
    const fn = {
      ...typeof rawFunction["name"] === "string" ? { name: rawFunction["name"] } : {},
      ...typeof rawFunction["arguments"] === "string" ? { arguments: rawFunction["arguments"] } : {}
    };
    calls.push({
      index: typeof record2["index"] === "number" ? record2["index"] : calls.length,
      ...typeof record2["id"] === "string" ? { id: record2["id"] } : {},
      ...record2["type"] === "function" ? { type: "function" } : {},
      ...Object.keys(fn).length === 0 ? {} : { function: fn }
    });
  }
  return calls;
}
function bridgeTraeSource(source, model) {
  const id = `chatcmpl-${randomUUID2().replaceAll("-", "").slice(0, 24)}`;
  const created = Math.floor(Date.now() / 1e3);
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const sse = new SseDecoder();
  let sawToolCalls = false;
  let emittedFinishReason = false;
  let upstreamEnded = false;
  let upstreamError;
  let usage;
  const chunk = (delta, finishReason = null) => encoder.encode(`data: ${JSON.stringify({
    id,
    object: "chat.completion.chunk",
    created,
    model,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
    ...usage === void 0 ? {} : { usage }
  })}

`);
  const stream = new ReadableStream({
    async start(controller) {
      const reader = source.getReader();
      const consume = (event) => {
        const decoded = decodeTraeEvent(event);
        if (decoded.type === "unknown") {
          const failure = traeFailureOf(decoded);
          if (failure !== void 0) {
            upstreamError = new Error(describeTraeFailure(failure));
          }
          return;
        }
        if (decoded.type === "delta") {
          const delta = {};
          if (decoded.text !== "") delta["content"] = decoded.text;
          if (decoded.reasoning !== void 0 && decoded.reasoning !== "") delta["reasoning_content"] = decoded.reasoning;
          const toolCalls = normalizeToolCalls(decoded.toolCalls);
          if (toolCalls.length > 0) {
            sawToolCalls = true;
            delta["tool_calls"] = toolCalls;
          }
          if (Object.keys(delta).length > 0) controller.enqueue(chunk(delta));
        } else if (decoded.type === "usage") {
          const cacheRead = decoded.cacheReadTokens;
          const cacheWrite = decoded.cacheWriteTokens;
          const details = {
            ...cacheRead === void 0 ? {} : { cached_tokens: cacheRead },
            ...cacheWrite === void 0 ? {} : { cache_write_tokens: cacheWrite }
          };
          usage = {
            ...decoded.inputTokens === void 0 ? {} : { prompt_tokens: decoded.inputTokens },
            ...decoded.outputTokens === void 0 ? {} : { completion_tokens: decoded.outputTokens },
            ...decoded.totalTokens === void 0 ? {} : { total_tokens: decoded.totalTokens },
            // Omit the details object entirely when Trae sent neither field, so
            // a provider that never reports cache keeps its previous wire shape
            // instead of gaining `prompt_tokens_details: {}`.
            ...Object.keys(details).length === 0 ? {} : { prompt_tokens_details: details }
          };
        } else if (decoded.type === "done") {
          upstreamEnded = true;
          if (!emittedFinishReason) {
            emittedFinishReason = true;
            if (upstreamError !== void 0) {
              controller.error(upstreamError);
              return;
            }
            controller.enqueue(chunk({}, sawToolCalls ? "tool_calls" : decoded.finishReason || "stop"));
          }
        }
      };
      try {
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          for (const event of sse.push(decoder.decode(next.value, { stream: true }))) consume(event);
        }
        for (const event of sse.finish()) consume(event);
        if (upstreamError !== void 0 && !upstreamEnded) {
          controller.error(upstreamError);
          return;
        }
        if (!emittedFinishReason) {
          emittedFinishReason = true;
          controller.enqueue(chunk({}, sawToolCalls ? "tool_calls" : "stop"));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
    cancel(reason) {
      return source.cancel(reason);
    }
  });
  return new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}
var PEEK_MAX_CHUNKS = 64;
var PEEK_MAX_BYTES = 262144;
function replayTraeSource(buffered, reader, ended) {
  let index = 0;
  return new ReadableStream({
    async pull(controller) {
      const chunk = buffered[index];
      if (chunk !== void 0) {
        index += 1;
        controller.enqueue(chunk);
        return;
      }
      if (ended) {
        controller.close();
        return;
      }
      const next = await reader.read();
      if (next.done) {
        controller.close();
        return;
      }
      controller.enqueue(next.value);
    },
    async cancel(reason) {
      await reader.cancel(reason).catch(() => {
      });
    }
  });
}
async function openTraeSource(response) {
  const body = response.body;
  if (body === null) return { ok: false, status: 502, kind: "server", message: "Trae upstream returned no response body" };
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const sse = new SseDecoder();
  const buffered = [];
  let bytes = 0;
  let ended = false;
  try {
    while (buffered.length < PEEK_MAX_CHUNKS && bytes < PEEK_MAX_BYTES) {
      const next = await reader.read();
      if (next.done) {
        ended = true;
        break;
      }
      buffered.push(next.value);
      bytes += next.value.byteLength;
      let answered = false;
      for (const event of sse.push(decoder.decode(next.value, { stream: true }))) {
        const decoded = decodeTraeEvent(event);
        const failure = traeFailureOf(decoded);
        if (failure !== void 0) {
          await reader.cancel().catch(() => {
          });
          return { ok: false, ...classifyTraeFailure(failure), message: describeTraeFailure(failure) };
        }
        if (decoded.type !== "unknown") answered = true;
      }
      if (answered) break;
    }
  } catch (error) {
    reader.releaseLock();
    return { ok: false, status: 0, kind: "server", message: `transport error: ${String(error)}` };
  }
  return { ok: true, source: replayTraeSource(buffered, reader, ended) };
}
async function bridgeTraeSoloStreamOrFail(response, model) {
  const opened = await openTraeSource(response);
  if (!opened.ok) return opened;
  return { ok: true, response: bridgeTraeSource(opened.source, model) };
}
var TraeSoloBridge = class {
  constructor(upstream, catalog, wireResolver) {
    this.upstream = upstream;
    this.catalog = catalog;
    this.wireResolver = wireResolver;
  }
  async chatStream(bodyJson, signal) {
    let model = "glm-5.2";
    let prepared = bodyJson;
    try {
      const input = JSON.parse(bodyJson);
      if (typeof input["model"] === "string" && input["model"] !== "") model = input["model"];
      const entry = this.catalog?.current().find((item) => item.id === model);
      const fromCatalog = entry?.wireConfigName === void 0 ? void 0 : { configName: entry.wireConfigName, ...entry.wireFunction === void 0 ? {} : { function: entry.wireFunction } };
      const fromResolver = this.wireResolver?.(model) ?? this.wireResolver?.(entry?.name ?? "");
      const target = fromCatalog ?? fromResolver;
      const wireModel = target?.configName ?? model;
      const wireFunction = target?.function ?? entry?.wireFunction;
      if (wireModel !== input["model"]) {
        input["model"] = wireModel;
      }
      if (wireFunction !== void 0 && input["function"] !== wireFunction) {
        input["function"] = wireFunction;
      }
      if (wireModel !== JSON.parse(bodyJson)["model"] || wireFunction !== void 0) {
        prepared = JSON.stringify(input);
      }
      if (typeof input["reasoning_effort"] === "string") {
        const info = entry;
        const efforts = info?.reasoningEfforts;
        const requested = input["reasoning_effort"];
        const mapped = efforts?.[requested];
        const allowed = efforts === void 0 ? [] : Object.values(efforts).filter((value) => typeof value === "string");
        if (typeof mapped === "string") input["reasoning_effort"] = mapped;
        else if (!allowed.includes(requested)) delete input["reasoning_effort"];
        prepared = JSON.stringify(input);
      }
    } catch {
      return { ok: false, status: 400, kind: "client", message: "invalid JSON request" };
    }
    const result = await this.upstream.chatStream(prepared, signal);
    if (!result.ok) return result;
    return await bridgeTraeSoloStreamOrFail(result.response, model);
  }
};

// upstream/trae/src/catalog.ts
function displayKey(name) {
  return name.trim().toLowerCase();
}
function mergeTraeModelSources(remote, wire) {
  const wireByName = /* @__PURE__ */ new Map();
  const wireById = /* @__PURE__ */ new Map();
  for (const model of wire) {
    wireByName.set(displayKey(model.name), model);
    wireById.set(displayKey(model.id), model);
  }
  const result = [];
  for (const model of remote) {
    const wireModel = wireById.get(displayKey(model.id)) ?? wireByName.get(displayKey(model.name));
    const creditMultiplier = wireModel?.creditMultiplier ?? model.creditMultiplier;
    result.push({
      id: model.id,
      name: model.name,
      ...model.contextWindow === void 0 ? {} : { contextWindow: model.contextWindow },
      ...model.maxContextWindow === void 0 ? {} : { maxContextWindow: model.maxContextWindow },
      ...creditMultiplier === void 0 ? {} : { creditMultiplier },
      input: ["text"],
      // Trae's own answer to "does this model read images". Carried through so
      // `applyImageSelection` can union it with the user's opt-ins (issue #16);
      // `input` stays text here and is decided by that single later pass.
      ...model.multimodal === void 0 ? {} : { multimodal: model.multimodal },
      reasoningSupported: model.reasoningSupported,
      ...model.reasoning === void 0 ? {} : {
        reasoning: model.reasoning,
        reasoningEfforts: Object.fromEntries(model.reasoning.supported.map((effort) => [effort, effort === "low" ? "light" : effort === "xhigh" ? "extra_high" : "high"]))
      },
      ...wireModel !== void 0 && wireModel.id !== "" && wireModel.id !== model.id ? { wireConfigName: wireModel.id } : {},
      ...wireModel?.function === void 0 ? {} : { wireFunction: wireModel.function }
    });
  }
  return result;
}

// upstream/qoder/src/upstream.ts
import { randomBytes as randomBytes2 } from "node:crypto";
import {
  createAssistantMessage,
  createUserMessage,
  createToolResultMessage,
  LlmError as LlmError3,
  ReasoningEffortId,
  ToolCallId as ToolCallId2
} from "@deepseek-ai/dsh-llm";

// upstream/qoder/src/probe.ts
var PROBE_PROMPT = "ping";
var PROBE_MAX_TOKENS = 1;

// upstream/qoder/src/qoder/errors.ts
import { LlmError, ProviderRequestId } from "@deepseek-ai/dsh-llm";

// upstream/qoder/src/qoder/codes.ts
var table = (family, rows) => rows.map(([code, name]) => ({ code, name, family }));
var QODER_RESULT_CODES = Object.freeze([
  ...table("auth", [
    ["105", "Login or access token expired"]
  ]),
  ...table("quota", [
    ["110", "Daily usage limit reached"],
    ["113", "Usage quota exhausted"],
    ["114", "Free-trial account limit reached"],
    ["115", "Free-user quota reached"],
    ["116", "Team administrator Credits exhausted"],
    ["117", "Team member Credits exhausted"],
    ["118", "Personal Credits exhausted"],
    ["119", "Free usage limit for the selected model reached"],
    ["122", "Billing-group Credits limit reached"]
  ]),
  ...table("request", [
    ["406", "Request blocked because of sensitive content or model refusal"],
    ["416", "Requested range or request shape is not satisfiable"],
    ["430", "Requested capability is not supported"],
    ["47902", "Maximum Agent turns reached"],
    ["48716", "A Hook blocked Agent execution"],
    ["80411", "Input content is too long"],
    ["80412", "Too many images or documents"]
  ]),
  ...table("runtime", [
    ["500", "Request or network failure"],
    ["10408", "Request timed out"],
    ["10500", "Model service internal error"],
    ["10605", "Model request is queued"]
  ])
]);
var byCode = new Map(QODER_RESULT_CODES.map((entry) => [entry.code, entry]));
function qoderResultCode(body) {
  if (body === void 0 || body === "") return void 0;
  const text = body.replace(/\\/gu, "");
  for (const match of text.matchAll(/"(?:error_)?code"\s*:\s*"?(\d+)"?/gu)) {
    const entry = byCode.get(match[1]);
    if (entry !== void 0) return entry;
  }
  return void 0;
}

// upstream/qoder/src/qoder/errors.ts
var QoderLlmError = class extends LlmError {
  constructor(message, code = "UNKNOWN_ERROR", options) {
    super(message, code, options);
  }
};
var QUEUE_BODY_MARKERS = [
  /"code"\s*:\s*"?10605"?/u,
  /"isQueued"\s*:\s*true/u,
  /"queueCount"/u,
  /"serviceAvailable"\s*:\s*false/u
];
function qoderQueueSignal(body) {
  if (body === void 0 || body === "") return void 0;
  const text = body.replace(/\\/gu, "");
  if (!QUEUE_BODY_MARKERS.some((marker) => marker.test(text))) return void 0;
  const match = /"retryAfterSeconds"\s*:\s*(\d+)/u.exec(text);
  return match === null ? {} : { retryAfterMs: Number(match[1]) * 1e3 };
}
function deauthorizeDigits(message, replacement = "throttled") {
  return message.replace(/\b(?:401|403)\b/gu, replacement);
}
function qoderHttpError(message, response, body) {
  const { status } = response;
  const headerRetryAfterMs = retryAfterMs(response.headers?.get("retry-after") ?? null);
  const requestId = qoderRequestId(response.headers);
  const queue = status === 401 || status === 403 || status === 429 ? qoderQueueSignal(body ?? message) : void 0;
  if (queue !== void 0) {
    const retryAfterMs2 = queue.retryAfterMs ?? headerRetryAfterMs;
    return new QoderLlmError(deauthorizeDigits(message), "RATE_LIMIT", {
      status,
      ...retryAfterMs2 === void 0 ? {} : { providerRetryAfterMs: retryAfterMs2 },
      ...requestId === void 0 ? {} : { requestId }
    });
  }
  const documented = qoderResultCode(body ?? message);
  if (documented?.family === "quota") {
    return new QoderLlmError(deauthorizeDigits(message, "limited"), "QUOTA", {
      status,
      ...requestId === void 0 ? {} : { requestId }
    });
  }
  if (documented?.family === "request" && (status === 401 || status === 403)) {
    return new QoderLlmError(deauthorizeDigits(message, "rejected"), "INVALID_REQUEST", {
      status,
      ...requestId === void 0 ? {} : { requestId }
    });
  }
  const code = status === 401 || status === 403 ? "AUTH" : status === 408 ? "TIMEOUT" : status === 429 ? "RATE_LIMIT" : status >= 500 && status <= 599 ? "SERVER" : status >= 400 && status <= 499 ? "INVALID_REQUEST" : "PROVIDER_ERROR";
  return new QoderLlmError(message, code, {
    status,
    ...headerRetryAfterMs === void 0 ? {} : { providerRetryAfterMs: headerRetryAfterMs },
    ...requestId === void 0 ? {} : { requestId }
  });
}
function qoderRequestId(headers) {
  const value = headers?.get("x-request-id") ?? headers?.get("request-id") ?? headers?.get("x-amzn-requestid");
  const normalized = value?.trim();
  return normalized ? ProviderRequestId(normalized) : void 0;
}
var NON_AUTH_STATUS_CODES = ["RATE_LIMIT", "QUOTA", "ACCOUNT_QUOTA"];
function isQoderAuthRejection(error) {
  if (!(error instanceof LlmError)) return false;
  if (NON_AUTH_STATUS_CODES.includes(error.code)) return false;
  return error.code === "AUTH" || error.failure.status === 401 || error.failure.status === 403;
}
function retryAfterMs(value, nowMs = Date.now()) {
  const normalized = value?.trim();
  if (!normalized) return void 0;
  if (/^\d+$/u.test(normalized)) {
    const delayMs2 = Number(normalized) * 1e3;
    return Number.isFinite(delayMs2) && delayMs2 > 0 ? delayMs2 : void 0;
  }
  const retryAt = Date.parse(normalized);
  if (Number.isNaN(retryAt)) return void 0;
  const delayMs = retryAt - nowMs;
  return delayMs > 0 ? delayMs : void 0;
}

// upstream/qoder/src/qoder/transport/default-transport.ts
import { LlmError as LlmError2 } from "@deepseek-ai/dsh-llm";

// upstream/qoder/src/qoder/transport/endpoints.ts
var qoderRegionEndpoints = {
  global: {
    baseUrl: "https://api3.qoder.sh/",
    openApiUrl: "https://openapi.qoder.sh",
    centerUrl: "https://center.qoder.sh"
  },
  china: {
    baseUrl: "https://gateway.qoder.com.cn/",
    openApiUrl: "https://openapi.qoder.com.cn",
    centerUrl: "https://gateway.qoder.com.cn"
  }
};
var qoderImageUploadPath = "/api/v2/image/upload";
var qoderGlobalBaseUrl = qoderRegionEndpoints.global.baseUrl;
var qoderGlobalOpenApiUrl = qoderRegionEndpoints.global.openApiUrl;
function resolveQoderEndpoints(region = "global") {
  return qoderRegionEndpoints[region] ?? qoderRegionEndpoints.global;
}
function getQoderChatUrl(region = "global") {
  const { baseUrl } = resolveQoderEndpoints(region);
  return `${baseUrl}algo/api/v2/service/pro/sse/agent_chat_generation?FetchKeys=llm_model_result&AgentId=agent_common&Encode=1`;
}
function getQoderModelListUrl(region = "global") {
  const { baseUrl } = resolveQoderEndpoints(region);
  return `${baseUrl}algo/api/v2/model/list?Encode=1`;
}
function getQoderImageUploadUrl(region = "global", requestId) {
  const { centerUrl } = resolveQoderEndpoints(region);
  const base = `${centerUrl.replace(/\/+$/u, "")}/algo${qoderImageUploadPath}`;
  return requestId === void 0 ? base : `${base}?request_id=${encodeURIComponent(requestId)}`;
}
function getQoderExchangeUrl(region = "global") {
  const { openApiUrl } = resolveQoderEndpoints(region);
  return `${openApiUrl}/api/v1/jobToken/exchange`;
}
function getQoderUserInfoUrl(region = "global") {
  const { openApiUrl } = resolveQoderEndpoints(region);
  return `${openApiUrl}/api/v1/userinfo`;
}
function getQoderUsageUrl(region = "global") {
  const { openApiUrl } = resolveQoderEndpoints(region);
  return `${openApiUrl}/api/v2/quota/usage`;
}
function getQoderUserPlanUrl(region = "global") {
  const { openApiUrl } = resolveQoderEndpoints(region);
  return `${openApiUrl}/api/v2/user/plan`;
}
function getQoderUserStatusUrl(region = "global") {
  const { openApiUrl } = resolveQoderEndpoints(region);
  return `${openApiUrl}/api/v3/user/status`;
}
function getQoderCampaignsUrl(region = "global") {
  const { openApiUrl } = resolveQoderEndpoints(region);
  return `${openApiUrl}/sash/api/v1/me/campaigns`;
}
function getQoderClaimCampaignUrl(region = "global", campaignId) {
  const { openApiUrl } = resolveQoderEndpoints(region);
  return `${openApiUrl}/sash/api/v1/me/campaigns/${encodeURIComponent(campaignId)}/claim`;
}

// upstream/qoder/src/qoder/transport/machine-id.ts
import crypto from "node:crypto";
import { existsSync, mkdirSync, readFileSync as readFileSync2, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname as dirname2, join as join2 } from "node:path";

// upstream/qoder/src/paths.ts
import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";
var QODER_DATA_DIR_NAME = ".dsh-qoder-connect";
var QODER_STATE_DIR_NAME = "state";
var QODER_DATA_DIR_ENV = "DSH_QODER_DATA_DIR";
var PROFILES_DIR_NAME = "profiles";
var PLUGIN_PACKAGE_NAME = "dsh-qoder-connect";
function pluginPackageRoot() {
  try {
    return dirname(dirname(fileURLToPath(import.meta.url)));
  } catch {
    return void 0;
  }
}
function profileDeclaresPlugin(profileDir) {
  try {
    const manifest = JSON.parse(readFileSync(join(profileDir, "package.json"), "utf8"));
    return typeof manifest.dependencies?.[PLUGIN_PACKAGE_NAME] === "string" || typeof manifest.devDependencies?.[PLUGIN_PACKAGE_NAME] === "string";
  } catch {
    return false;
  }
}
function profileLinksToThisPackage(profileDir) {
  const own = pluginPackageRoot();
  if (own === void 0) return false;
  try {
    return realpathSync(join(profileDir, "node_modules", PLUGIN_PACKAGE_NAME)) === realpathSync(own);
  } catch {
    return false;
  }
}
function discoverProfileDir() {
  const profilesRoot = join(resolveDshHome(), PROFILES_DIR_NAME);
  let entries;
  try {
    entries = readdirSync(profilesRoot, { withFileTypes: true });
  } catch {
    return void 0;
  }
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const dir = join(profilesRoot, entry.name);
    if (profileDeclaresPlugin(dir)) candidates.push(dir);
  }
  if (candidates.length === 0) return void 0;
  if (candidates.length === 1) return candidates[0];
  return candidates.find((candidate) => profileLinksToThisPackage(candidate));
}
function qoderPluginDataDir() {
  const override = process.env[QODER_DATA_DIR_ENV];
  if (override !== void 0 && override.trim() !== "") return override;
  const base = discoverProfileDir() ?? resolveDshHome();
  return join(base, QODER_DATA_DIR_NAME);
}
function qoderStateDir() {
  return join(qoderPluginDataDir(), QODER_STATE_DIR_NAME);
}
function qoderMachineIdPath() {
  return join(qoderStateDir(), ".qoder-machine-id");
}

// upstream/qoder/src/qoder/transport/machine-id.ts
function officialMachineIdPath() {
  return join2(homedir(), ".qoder", ".auth", "machine_id");
}
function defaultMachineIdPaths() {
  return [officialMachineIdPath(), qoderMachineIdPath()];
}
function getMachineId(paths = defaultMachineIdPaths()) {
  for (const path of paths) {
    if (!existsSync(path)) continue;
    try {
      const value = readFileSync2(path, "utf8").trim();
      if (value) return value;
    } catch {
    }
  }
  const machineId = crypto.randomUUID();
  const savePath = paths.at(-1);
  if (savePath === void 0) return machineId;
  try {
    mkdirSync(dirname2(savePath), { recursive: true });
    writeFileSync(savePath, machineId, { encoding: "utf8", flag: "wx" });
  } catch {
    try {
      const existing = readFileSync2(savePath, "utf8").trim();
      if (existing) return existing;
    } catch {
    }
  }
  return machineId;
}

// upstream/qoder/src/qoder/transport/request.ts
import { createHash } from "node:crypto";
import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";

// upstream/qoder/src/qoder/transport/logging.ts
var sensitiveKey = /(?:authorization|credential|password|secret|token)/iu;
var identifierKey = /^(?:accountId|id|uid|userId)$/iu;
var tokenValue = /\b(?:jrt|jt|pt)-[\w.-]+\b/giu;
var bearerValue = /Bearer\s+[^\s,;]+/giu;
var maxDepth = 4;
var maxEntries = 50;
var maxStringLength = 500;
function maskIdentifier(value) {
  const text = String(value);
  return text.length <= 4 ? "[REDACTED]" : `\u2026${text.slice(-4)}`;
}
function maskEmail(value) {
  const text = String(value);
  const at = text.indexOf("@");
  if (at <= 0) return "[REDACTED]";
  return `${text.slice(0, 1)}***${text.slice(at)}`;
}
function redactString(value) {
  const bounded = value.length > maxStringLength ? `${value.slice(0, maxStringLength)}\u2026` : value;
  return bounded.replace(tokenValue, "[REDACTED]").replace(bearerValue, "Bearer [REDACTED]");
}
function redactLogValue(value, depth = 0) {
  if (typeof value === "string") return redactString(value);
  if (value === null || typeof value !== "object") return value;
  if (depth >= maxDepth) return "[TRUNCATED]";
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      ..."code" in value ? { code: redactLogValue(value.code, depth + 1) } : {}
    };
  }
  if (Array.isArray(value)) {
    return value.slice(0, maxEntries).map((item) => redactLogValue(item, depth + 1));
  }
  return Object.fromEntries(Object.entries(value).slice(0, maxEntries).map(([key, item]) => {
    if (sensitiveKey.test(key)) return [key, "[REDACTED]"];
    if (identifierKey.test(key)) return [key, maskIdentifier(item)];
    if (key.toLowerCase() === "email") return [key, maskEmail(item)];
    return [key, redactLogValue(item, depth + 1)];
  }));
}
function redactLogPayload(text) {
  try {
    return redactLogValue(JSON.parse(text));
  } catch {
    return redactLogValue(text);
  }
}
function logParsedResponse(logger, operation, result) {
  logger?.debug?.("[Qoder Response] Parsed", redactLogValue({ operation, result }));
}

// upstream/qoder/src/qoder/transport/wire/cosy.ts
import crypto2 from "node:crypto";
var qoderRSAPublicKey = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDA8iMH5c02LilrsERw9t6Pv5Nc
4k6Pz1EaDicBMpdpxKduSZu5OANqUq8er4GM95omAGIOPOh+Nx0spthYA2BqGz+l
6HRkPJ7S236FZz73In/KVuLnwI8JJ2CbuJap8kvheCCZpmAWpb/cPx/3Vr/J6I17
XcW+ML9FoCI6AOvOzwIDAQAB
-----END PUBLIC KEY-----`;
var qoderIdeVersion = "1.1.47";
var qoderClientType = "5";
var qoderDesktopClientType = "10";
var defaultUserAgent = `qoder/${qoderIdeVersion}`;
var qoderDataPolicy = "disagree";
var qoderLoginVersion = "v2";
var qoderMachineOs = process.platform === "win32" ? process.arch === "arm64" ? "aarch64_windows" : "x86_64_windows" : process.arch === "arm64" ? "aarch64_linux" : "x86_64_linux";
var qoderMachineTypeMagic = "5";
function computeSigPath(urlStr) {
  const parsed = new URL(urlStr);
  let sigPath = parsed.pathname;
  if (sigPath.startsWith("/algo")) {
    sigPath = sigPath.substring("/algo".length);
  }
  return sigPath;
}
function rsaEncryptBase64(data) {
  const key = {
    key: qoderRSAPublicKey,
    padding: crypto2.constants.RSA_PKCS1_PADDING
  };
  const encrypted = crypto2.publicEncrypt(key, typeof data === "string" ? Buffer.from(data) : data);
  return encrypted.toString("base64");
}
function aesEncryptCBCBase64(plaintext, keyStr) {
  const cipher = crypto2.createCipheriv("aes-128-cbc", Buffer.from(keyStr), Buffer.from(keyStr));
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}
function buildAuthHeaders(body, requestURL, creds) {
  if (!creds.userID) {
    throw new Error("cosy: user id is empty");
  }
  if (!creds.authToken) {
    throw new Error("cosy: auth token is empty");
  }
  const aesKey = crypto2.randomUUID().replace(/-/g, "").slice(0, 16);
  const userInfo = {
    uid: creds.userID,
    security_oauth_token: creds.authToken,
    name: creds.name || "",
    aid: "",
    email: creds.email || ""
  };
  const infoB64 = aesEncryptCBCBase64(JSON.stringify(userInfo), aesKey);
  const cosyKey = rsaEncryptBase64(aesKey);
  const timestamp = Math.floor(Date.now() / 1e3).toString();
  const requestId = crypto2.randomUUID();
  const cosyPayload = {
    version: "v1",
    requestId,
    info: infoB64,
    cosyVersion: qoderIdeVersion,
    ideVersion: ""
  };
  const payloadB64 = Buffer.from(JSON.stringify(cosyPayload)).toString("base64");
  const sigPath = computeSigPath(requestURL);
  const bodyStr = body ? Buffer.isBuffer(body) ? body.toString("utf8") : body : "";
  const sigInput = `${payloadB64}
${cosyKey}
${timestamp}
${bodyStr}
${sigPath}`;
  const sig = crypto2.createHash("md5").update(sigInput).digest("hex");
  const bodyHash = crypto2.createHash("md5").update(body || "").digest("hex");
  const bodyLen = body ? (Buffer.isBuffer(body) ? body.length : Buffer.from(body).length).toString() : "0";
  const machineID = creds.machineID || getMachineId();
  return {
    Authorization: `Bearer COSY.${payloadB64}.${sig}`,
    "Cosy-Key": cosyKey,
    "Cosy-User": creds.userID,
    "Cosy-Date": timestamp,
    "Cosy-Version": qoderIdeVersion,
    "Cosy-Machineid": machineID,
    "Cosy-Machinetoken": machineID,
    "Cosy-Machinetype": qoderMachineTypeMagic,
    "Cosy-Machineos": qoderMachineOs,
    "Cosy-Clienttype": qoderClientType,
    "Cosy-Clientip": "127.0.0.1",
    "Cosy-Bodyhash": bodyHash,
    "Cosy-Bodylength": bodyLen,
    "Cosy-Sigpath": sigPath,
    "Cosy-Data-Policy": qoderDataPolicy,
    "Cosy-Organization-Id": "",
    "Cosy-Organization-Tags": "",
    "Login-Version": qoderLoginVersion,
    "X-Request-Id": crypto2.randomUUID()
  };
}

// upstream/qoder/src/qoder/transport/request.ts
var defaultMetadataTimeoutMs = 15e3;
var defaultResponseHeaderTimeoutMs = 6e4;
var defaultMaxJsonBytes = 2 * 1024 * 1024;
var defaultMaxErrorBytes = 16 * 1024;
var metadataRetryBaseDelayMs = 200;
var maxProviderRetryDelayMs = 1e4;
function opaqueCredentialKey(value) {
  return createHash("sha256").update(value).digest("hex");
}
function retryableMetadataError(error) {
  return error instanceof QoderLlmError && ["RATE_LIMIT", "SERVER", "TIMEOUT", "TRANSPORT"].includes(error.code);
}
function abortableDelay(ms, signal) {
  if (signal.aborted) return Promise.reject(new DOMException("aborted", "AbortError"));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
async function retryMetadataRead(signal, operation) {
  try {
    return await operation();
  } catch (error) {
    if (!retryableMetadataError(error) || signal.aborted) throw error;
    const providerDelay = error.failure.providerRetryAfterMs;
    const delayMs = providerDelay === void 0 ? metadataRetryBaseDelayMs + Math.floor(Math.random() * 41) : Math.min(providerDelay, maxProviderRetryDelayMs);
    await abortableDelay(delayMs, signal);
    return operation();
  }
}
function withDeadline(signal, timeoutMs) {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  return {
    timeoutSignal,
    signal: signal === void 0 ? timeoutSignal : AbortSignal.any([signal, timeoutSignal])
  };
}
async function readLimitedText(response, maxBytes, label) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await response.body?.cancel().catch(() => void 0);
    throw new QoderLlmError(`${label} exceeded its response size limit.`, "MALFORMED_RESPONSE");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        throw new QoderLlmError(`${label} exceeded its response size limit.`, "MALFORMED_RESPONSE");
      }
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => void 0);
    reader.releaseLock();
  }
  let payload = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  const encoding = (response.headers.get("content-encoding") ?? "").toLowerCase();
  const looksGzipped = payload.length >= 2 && payload[0] === 31 && payload[1] === 139;
  if (encoding !== "" || looksGzipped) {
    try {
      if (encoding.includes("gzip") || encoding === "" && looksGzipped) {
        payload = gunzipSync(payload);
      } else if (encoding.includes("br")) {
        payload = brotliDecompressSync(payload);
      } else if (encoding.includes("deflate")) {
        payload = inflateSync(payload);
      }
    } catch {
      throw new QoderLlmError(`${label} arrived compressed but could not be decompressed.`, "MALFORMED_RESPONSE");
    }
    if (payload.byteLength > maxBytes) {
      throw new QoderLlmError(`${label} exceeded its response size limit.`, "MALFORMED_RESPONSE");
    }
  }
  return new TextDecoder().decode(payload);
}
var SingleFlight = class {
  flights = /* @__PURE__ */ new Map();
  run(key, signal, start, abortedError2) {
    if (signal?.aborted) return Promise.reject(abortedError2());
    let flight = this.flights.get(key);
    if (flight === void 0 || flight.controller.signal.aborted) {
      const controller = new AbortController();
      const created = {};
      created.controller = controller;
      created.settled = false;
      created.waiters = 0;
      created.promise = start(controller.signal).finally(() => {
        created.settled = true;
        if (this.flights.get(key) === created) this.flights.delete(key);
      });
      flight = created;
      this.flights.set(key, created);
    }
    flight.waiters++;
    return new Promise((resolve, reject) => {
      let finished = false;
      const finish = (callback) => {
        if (finished) return;
        finished = true;
        signal?.removeEventListener("abort", onAbort);
        flight.waiters--;
        if (flight.waiters === 0 && !flight.settled) {
          if (this.flights.get(key) === flight) this.flights.delete(key);
          flight.controller.abort("all callers aborted");
        }
        callback();
      };
      const onAbort = () => finish(() => reject(abortedError2()));
      signal?.addEventListener("abort", onAbort, { once: true });
      flight.promise.then(
        (value) => finish(() => resolve(value)),
        (error) => finish(() => reject(error))
      );
    });
  }
};
async function openApiJsonRequest(fetchImpl, options) {
  const method = options.method ?? (options.body !== void 0 ? "POST" : "GET");
  const timeoutMs = options.timeoutMs ?? defaultMetadataTimeoutMs;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const requestSignal = options.signal === void 0 ? timeoutSignal : AbortSignal.any([options.signal, timeoutSignal]);
  const startedAt = performance.now();
  options.logger?.debug?.(`[Qoder ${options.operation}] Requesting`, { url: options.url, method });
  try {
    const headers = {
      accept: "application/json",
      // Keep the upstream from compressing: the Electron desktop host's fetch
      // does not decompress the body, and a compressed stream would reach the
      // JSON parser as binary noise. `identity` states the preference
      // explicitly; readLimitedText decompresses as a fallback.
      "accept-encoding": "identity",
      "user-agent": options.userAgent ?? defaultUserAgent,
      "cosy-version": "1.0.1",
      "cosy-clienttype": qoderClientType,
      ...options.headers
    };
    if (options.token) {
      headers.authorization = `Bearer ${options.token}`;
    }
    if (options.machineId) {
      headers["Cosy-MachineToken"] = options.machineId;
      headers["Cosy-MachineType"] = "host";
    }
    let bodyText;
    if (options.body !== void 0) {
      headers["content-type"] = "application/json";
      bodyText = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }
    const response = await fetchImpl(options.url, {
      method,
      headers,
      // Under exactOptionalPropertyTypes RequestInit forbids an explicit
      // `body: undefined`; omit the property when there is no payload.
      ...bodyText === void 0 ? {} : { body: bodyText },
      signal: requestSignal
    });
    options.logger?.debug?.(`[Qoder ${options.operation}] Request completed`, {
      status: response.status,
      statusText: response.statusText,
      durationMs: Math.round(performance.now() - startedAt),
      ...qoderRequestId(response.headers) === void 0 ? {} : { requestId: qoderRequestId(response.headers) }
    });
    const text = await readLimitedText(
      response,
      response.ok ? defaultMaxJsonBytes : defaultMaxErrorBytes,
      `Qoder ${options.operation} response`
    );
    if (!response.ok) {
      options.logger?.error?.(`[Qoder ${options.operation}] Request failed`, redactLogPayload(text));
      throw qoderHttpError(
        `Failed to execute Qoder ${options.operation} with status ${response.status}.`,
        response,
        text
      );
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      options.logger?.error?.(`[Qoder ${options.operation}] Invalid JSON response`, redactLogPayload(text));
      throw new QoderLlmError(`Failed to parse Qoder ${options.operation} JSON response`, "MALFORMED_RESPONSE");
    }
    if (options.logCategory) {
      logParsedResponse(options.logger, options.logCategory, data);
    }
    return data;
  } catch (error) {
    if (error instanceof QoderLlmError) throw error;
    if (options.signal?.aborted) {
      throw new QoderLlmError(`Qoder ${options.operation} request was aborted.`, "ABORTED");
    }
    if (timeoutSignal.aborted) {
      throw new QoderLlmError(`Qoder ${options.operation} request timed out.`, "TIMEOUT");
    }
    throw new QoderLlmError(`Qoder ${options.operation} network request failed.`, "TRANSPORT", { cause: error });
  }
}

// upstream/qoder/src/qoder/transport/auth.ts
var expiryBufferMs = 5 * 60 * 1e3;
var defaultExpiryMs = 24 * 60 * 60 * 1e3;
var defaultAuthTimeoutMs = 15e3;
function abortedError() {
  return new QoderLlmError("Qoder authentication was aborted.", "ABORTED");
}
async function waitForFlight(promise, signal) {
  if (signal === void 0) return promise;
  if (signal.aborted) throw abortedError();
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(abortedError());
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}
var QoderAuthService = class {
  cache = /* @__PURE__ */ new Map();
  inFlight = /* @__PURE__ */ new Map();
  /**
   * Self-heal exchanges in flight, keyed like the cache. Deliberately separate
   * from {@link inFlight}: that flight may be aborted by a departing
   * concurrent waiter (a quota poll, a catalog sweep) whose abort has nothing
   * to do with the heal, so healers must not share its controller. Concurrent
   * heals instead share this flight — see {@link exchangeFresh}.
   */
  healFlights = /* @__PURE__ */ new Map();
  fetchImpl;
  timeoutMs;
  resolveMachineId;
  region;
  logger;
  constructor(options = {}) {
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? defaultAuthTimeoutMs;
    this.resolveMachineId = options.resolveMachineId ?? getMachineId;
    this.region = options.region ?? "global";
    this.logger = options.logger;
  }
  clear(pat) {
    if (pat) {
      this.cache.delete(`${this.region}:${opaqueCredentialKey(pat)}`);
    } else {
      this.cache.clear();
    }
  }
  /**
   * Exchange a fresh job token OUTSIDE the single-flight, for the self-heal
   * retry. The shared flight can be aborted by a departing concurrent waiter
   * (the quota poll, the catalog sweep), and a retry that joins it would then
   * be cancelled by a path that has nothing to do with the chat. The result
   * replaces the cache entry.
   *
   * Two heals for the same credential that overlap share one exchange instead
   * of racing: each racer's `clear` deleted what the previous one had just
   * cached, and its own `cache.set` overwrote the other's — so the cache could
   * end up naming a token the losing request was no longer using, and with an
   * upstream that retires the previous job token on a new exchange the racers
   * also invalidated each other's credentials (one chat recovering while a
   * concurrent one failed, exactly the 2026-09-26 22:36 observation). The
   * shared exchange runs on its own timeout signal, so one healer's abort —
   * its chat request went away — cannot cancel an exchange other healers, and
   * the future `getCredentials` callers about to read the refreshed cache, are
   * waiting on.
   */
  async exchangeFresh(pat, signal) {
    const cacheKey = `${this.region}:${opaqueCredentialKey(pat)}`;
    const existing = this.healFlights.get(cacheKey);
    if (existing !== void 0 && !existing.settled) {
      return waitForFlight(existing.promise, signal);
    }
    this.clear(pat);
    const created = { settled: false };
    created.promise = this.exchangeAndResolve(pat, AbortSignal.timeout(this.timeoutMs)).finally(() => {
      created.settled = true;
      if (this.healFlights.get(cacheKey) === created) this.healFlights.delete(cacheKey);
    });
    this.healFlights.set(cacheKey, created);
    return waitForFlight(created.promise, signal);
  }
  async getCredentials(pat, signal) {
    if (!pat || typeof pat !== "string") {
      throw new QoderLlmError(
        "Qoder Personal Access Token is missing or invalid. Configure Qoder in the Qoder settings page.",
        "MISSING_CREDENTIAL"
      );
    }
    if (signal?.aborted) throw abortedError();
    const cacheKey = `${this.region}:${opaqueCredentialKey(pat)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + expiryBufferMs) return cached.creds;
    let entry = this.inFlight.get(cacheKey);
    if (entry === void 0 || entry.controller.signal.aborted) {
      const controller = new AbortController();
      const created = {};
      created.controller = controller;
      created.waiters = 0;
      created.settled = false;
      created.timeout = setTimeout(() => controller.abort("authentication timeout"), this.timeoutMs);
      created.promise = this.exchangeAndResolve(pat, controller.signal).finally(() => {
        created.settled = true;
        clearTimeout(created.timeout);
        if (this.inFlight.get(cacheKey) === created) this.inFlight.delete(cacheKey);
      });
      entry = created;
      this.inFlight.set(cacheKey, entry);
    }
    entry.waiters++;
    try {
      return await waitForFlight(entry.promise, signal);
    } finally {
      entry.waiters--;
      if (entry.waiters === 0 && !entry.settled) {
        if (this.inFlight.get(cacheKey) === entry) this.inFlight.delete(cacheKey);
        entry.controller.abort("all callers aborted");
      }
    }
  }
  async exchangeAndResolve(pat, signal) {
    let jobToken;
    let expiresAt = Date.now() + defaultExpiryMs;
    const data = await openApiJsonRequest(
      this.fetchImpl,
      {
        url: getQoderExchangeUrl(this.region),
        body: { personal_token: pat },
        signal,
        timeoutMs: this.timeoutMs,
        logger: this.logger,
        operation: "Auth",
        logCategory: "auth.exchange"
      }
    );
    if (!data.token) {
      throw new QoderLlmError("Qoder PAT exchange returned no job token.", "AUTH");
    }
    jobToken = data.token;
    if (data.expires_at) {
      const parsed = Date.parse(data.expires_at);
      if (!Number.isNaN(parsed)) expiresAt = parsed;
    } else if (typeof data.expires_in === "number" && data.expires_in > 0) {
      expiresAt = Date.now() + data.expires_in;
    }
    const userInfo = await retryMetadataRead(signal, () => this.fetchUserInfo(jobToken, signal));
    const creds = {
      userID: userInfo.userID,
      authToken: jobToken,
      name: userInfo.name || "Qoder User",
      email: userInfo.email,
      machineID: this.resolveMachineId()
    };
    const cacheKey = `${this.region}:${opaqueCredentialKey(pat)}`;
    this.cache.set(cacheKey, { creds, expiresAt });
    return creds;
  }
  async fetchUserInfo(jobToken, signal) {
    const info = await openApiJsonRequest(this.fetchImpl, {
      url: getQoderUserInfoUrl(this.region),
      token: jobToken,
      signal,
      timeoutMs: this.timeoutMs,
      logger: this.logger,
      operation: "UserInfo",
      logCategory: "auth.user-info"
    });
    if (!info.id) {
      throw new QoderLlmError("Qoder identity lookup returned no user id.", "AUTH");
    }
    return {
      userID: info.id,
      email: info.email ?? "",
      name: info.name ?? info.username ?? ""
    };
  }
};

// upstream/qoder/src/qoder/catalog.ts
var reasoningEffortOrder = /* @__PURE__ */ new Map([
  ["low", 0],
  ["medium", 1],
  ["high", 2],
  ["xhigh", 3],
  ["max", 4]
]);
function positiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : void 0;
}
function contextOptionsOf(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
  const options = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) continue;
    const entry = raw;
    const tokenCount = positiveNumber(entry.token_count);
    const isDefault = typeof entry.is_default === "boolean" ? entry.is_default : void 0;
    if (tokenCount === void 0) continue;
    options[key] = {
      ...tokenCount === void 0 ? {} : { tokenCount },
      ...isDefault === void 0 ? {} : { isDefault }
    };
  }
  if (Object.keys(options).length === 0) return void 0;
  return options;
}
function reasoningEffortsOf(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const enabled = value.enabled;
  if (typeof enabled !== "object" || enabled === null || Array.isArray(enabled)) return {};
  const rawEfforts = enabled.efforts;
  if (typeof rawEfforts !== "object" || rawEfforts === null || Array.isArray(rawEfforts)) return {};
  const efforts = [];
  let defaultEffort;
  for (const [id, raw] of Object.entries(rawEfforts)) {
    if (!id.trim() || typeof raw !== "object" || raw === null || Array.isArray(raw)) continue;
    const entry = raw;
    efforts.push({
      id,
      name: id,
      ...typeof entry.description === "string" && entry.description.trim() ? { description: entry.description.trim() } : {}
    });
    if (entry.is_default === true) defaultEffort = id;
  }
  return {
    ...efforts.length === 0 ? {} : {
      efforts: efforts.sort((left, right) => (reasoningEffortOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (reasoningEffortOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER))
    },
    ...defaultEffort === void 0 ? {} : { defaultEffort }
  };
}
function thinkingDefault(value, fallback, onConflict) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return fallback;
  const config = value;
  const isDefault = (entry) => typeof entry === "object" && entry !== null && !Array.isArray(entry) && entry.is_default === true;
  const enabled = isDefault(config.enabled);
  const disabled = isDefault(config.disabled);
  if (enabled && disabled) onConflict?.("thinking-defaults");
  return enabled === disabled ? fallback : enabled;
}
function normalizeQoderModels(payload, onConflict) {
  if (typeof payload !== "object" || payload === null || !Array.isArray(payload.assistant)) return [];
  const models = [];
  const seen = /* @__PURE__ */ new Set();
  for (const raw of payload.assistant) {
    if (typeof raw !== "object" || raw === null || raw.enable !== true) continue;
    const id = typeof raw.key === "string" ? raw.key.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const contextOptions = contextOptionsOf(raw.context_config);
    const defaultOptions = Object.values(contextOptions ?? {}).filter((option) => option.isDefault && option.tokenCount !== void 0);
    if (defaultOptions.length > 1) onConflict?.("context-defaults");
    const contextWindow = (defaultOptions.length === 1 ? defaultOptions[0]?.tokenCount : void 0) ?? positiveNumber(raw.max_input_tokens) ?? 18e4;
    const maxContextWindow = Math.max(
      positiveNumber(raw.max_input_tokens) ?? 0,
      contextWindow,
      ...Object.values(contextOptions ?? {}).map((option) => option.tokenCount ?? 0)
    );
    const isReasoning = thinkingDefault(raw.thinking_config, raw.is_reasoning === true, onConflict);
    const priceFactor = typeof raw.price_factor === "number" && Number.isFinite(raw.price_factor) && raw.price_factor >= 0 ? raw.price_factor : void 0;
    const reasoning = reasoningEffortsOf(raw.thinking_config);
    models.push({
      id,
      name: typeof raw.display_name === "string" && raw.display_name.trim() ? raw.display_name.trim() : id,
      contextWindow,
      maxContextWindow,
      maxTokens: positiveNumber(raw.max_output_tokens) ?? 32768,
      source: typeof raw.source === "string" && raw.source.trim() ? raw.source.trim() : "system",
      isReasoning,
      supportsEffort: reasoning.efforts !== void 0,
      supportsImages: raw.is_vl === true,
      ...reasoning.efforts === void 0 ? {} : { reasoningEfforts: reasoning.efforts },
      ...reasoning.defaultEffort === void 0 ? {} : { defaultReasoningEffort: reasoning.defaultEffort },
      ...priceFactor === void 0 ? {} : { priceFactor },
      ...contextOptions === void 0 ? {} : { contextOptions }
    });
  }
  return models;
}

// upstream/qoder/src/qoder/transport/catalog-reader.ts
async function fetchQoderModels(credentials, options = {}) {
  const url = getQoderModelListUrl(options.region);
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const startedAt = performance.now();
  const deadline = withDeadline(options.signal, options.timeoutMs ?? defaultMetadataTimeoutMs);
  options.logger?.debug?.("[Qoder Models] Requesting model catalog", { url });
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      // `identity` keeps a host that does not decompress (the Electron desktop
      // host's fetch) from handing us a gzip byte stream that then fails
      // JSON.parse — the chat request in chat.ts declares it for the same
      // reason. readLimitedText additionally decodes a compressed body when a
      // proxy or middlebox ignores the header.
      headers: {
        accept: "application/json",
        "accept-encoding": "identity",
        ...buildAuthHeaders(null, url, credentials)
      },
      signal: deadline.signal
    });
    options.logger?.debug?.("[Qoder Models] Catalog request completed", {
      url,
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
      ...qoderRequestId(response.headers) === void 0 ? {} : { requestId: qoderRequestId(response.headers) }
    });
    const text = await readLimitedText(
      response,
      response.ok ? defaultMaxJsonBytes : defaultMaxErrorBytes,
      "Qoder model discovery response"
    );
    if (!response.ok) {
      options.logger?.error?.("[Qoder Models] Catalog request failed", redactLogPayload(text));
      throw qoderHttpError(`Qoder model discovery failed with HTTP status ${response.status}.`, response);
    }
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new QoderLlmError("Qoder model discovery returned invalid JSON.", "MALFORMED_RESPONSE");
    }
    const models = normalizeQoderModels(payload, (conflict) => {
      options.logger?.warn?.("[Qoder Models] Conflicting catalog defaults; using fallback", { conflict });
    });
    if (models.length === 0) throw new QoderLlmError("Qoder model discovery returned no enabled models.", "EMPTY_RESPONSE");
    return models;
  } catch (error) {
    if (error instanceof QoderLlmError) throw error;
    if (options.signal?.aborted) throw new QoderLlmError("Qoder model discovery was aborted.", "ABORTED");
    if (deadline.timeoutSignal.aborted) throw new QoderLlmError("Qoder model discovery timed out.", "TIMEOUT");
    options.logger?.error?.("[Qoder Models] Catalog network request failed", redactLogValue(error));
    throw new QoderLlmError("Qoder model discovery network request failed.", "TRANSPORT", { cause: error });
  }
}

// upstream/qoder/src/qoder/transport/wire/serialize.ts
import crypto3 from "node:crypto";
import { contentHasImage } from "@deepseek-ai/dsh-llm";

// upstream/qoder/src/qoder/transport/wire/translate.ts
import { requestImageDimensions } from "@deepseek-ai/dsh-attachment";
function unsupported(message) {
  return new QoderLlmError(message, "UNSUPPORTED_CONTENT");
}
function toolResultText(content) {
  let text = "";
  for (const nested of content) {
    if (nested.type === "image") continue;
    if (nested.type !== "text") {
      throw unsupported(`Qoder tool results support text only; received nested ${String(nested.type)} content.`);
    }
    text += nested.text;
  }
  return text;
}
function validateMessageShapes(messages) {
  for (const message of messages) {
    if (message.role === "tool") {
      for (const block of message.content) {
        if (block.type === "text" || block.type === "image") continue;
        throw unsupported(`Qoder tool results support text and image content only; received ${String(block.type)}.`);
      }
      continue;
    }
    if (message.role === "developer") {
      throw unsupported("Qoder transport does not support developer messages (dynamic tool addition/removal).");
    }
    for (const block of message.content) {
      if (block.type === "text") continue;
      if (block.type === "image") {
        if (message.role !== "user") throw unsupported("Qoder image content is valid only in user messages.");
        continue;
      }
      if (block.type === "tool-call") {
        if (message.role !== "assistant") {
          throw unsupported("Qoder tool calls are valid only in assistant messages.");
        }
        continue;
      }
      if (block.type === "reasoning") {
        continue;
      }
      throw unsupported(`Qoder transport encountered unsupported block type: ${String(block.type)}`);
    }
  }
}
function enforceImageLimits(images, attachments) {
  const limits = attachments.imageLimits;
  if (images.length > limits.maxImagesPerMessage) {
    throw unsupported(
      `Qoder accepts at most ${limits.maxImagesPerMessage} images per message; received ${images.length}.`
    );
  }
  let total = 0;
  for (const image of images) total += image.attachment.bytes;
  if (total > limits.maxMessageImageBytes) {
    throw unsupported("Qoder message image content exceeds the configured total byte limit.");
  }
}
async function resolveImagePart(block, context) {
  const { attachments, uploader, credentials, signal } = context;
  if (attachments === void 0) {
    throw new QoderLlmError("Qoder image input requires the DSH attachment service.", "ATTACHMENT");
  }
  let image;
  try {
    const { width: sourceWidth, height: sourceHeight } = block.attachment;
    const projected = requestImageDimensions(
      sourceWidth,
      sourceHeight,
      attachments.imageLimits.maxImagePixels
    );
    image = await attachments.readImageRequest(block.attachment, {
      width: projected.width,
      height: projected.height,
      maxBytes: attachments.imageLimits.maxImageBytes
    }, signal);
  } catch (error) {
    if (signal?.aborted) throw new QoderLlmError("Qoder image preparation was aborted.", "ABORTED", { cause: error });
    if (error instanceof QoderLlmError) throw error;
    throw new QoderLlmError("Qoder could not prepare an image attachment.", "ATTACHMENT", { cause: error });
  }
  if (uploader !== void 0 && credentials !== void 0) {
    const url = await uploader.resolveImageUrl(image, credentials, signal);
    return { type: "image_url", image_url: { url } };
  }
  return {
    type: "image_url",
    image_url: { url: `data:${image.mediaType};base64,${Buffer.from(image.data).toString("base64")}` }
  };
}
function translateTools(tools) {
  return (tools ?? []).map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
}
async function validateAndTranslateMessages(messages, systemPrompt, attachments, signal, pipeline) {
  validateMessageShapes(messages);
  const context = {
    attachments,
    signal,
    uploader: pipeline?.uploader,
    credentials: pipeline?.credentials
  };
  const preserveThinking = pipeline?.preserveThinking ?? true;
  const output = [];
  if (typeof systemPrompt === "string" && systemPrompt.trim().length > 0) {
    output.push({ role: "system", content: systemPrompt });
  }
  for (const message of messages) {
    if (message.role === "tool") {
      output.push({
        role: "tool",
        tool_call_id: String(message.toolCallId),
        content: toolResultText(message.content)
      });
      const images = message.content.filter((block) => block.type === "image");
      if (images.length > 0) {
        if (attachments !== void 0) enforceImageLimits(images, attachments);
        output.push({
          role: "user",
          content: [
            {
              type: "text",
              text: `[${images.length} image${images.length === 1 ? "" : "s"} returned by the previous tool call]`
            },
            ...await Promise.all(images.map((image) => resolveImagePart(image, context)))
          ]
        });
      }
      continue;
    }
    let text = "";
    let reasoningText = "";
    const userContent = [];
    const pendingImages = [];
    let hasImage = false;
    const toolCalls = [];
    for (const block of message.content) {
      if (block.type === "text") {
        text += block.text;
        if (message.role === "user") userContent.push({ type: "text", text: block.text });
        continue;
      }
      if (block.type === "image") {
        hasImage = true;
        pendingImages.push({ slot: userContent.length, block });
        userContent.push(void 0);
        continue;
      }
      if (block.type === "tool-call") {
        toolCalls.push({
          id: String(block.id),
          type: "function",
          function: { name: block.name, arguments: block.arguments }
        });
        continue;
      }
      if (block.type === "reasoning") {
        if (message.role === "assistant") reasoningText += block.text;
        continue;
      }
      throw unsupported(`Qoder transport encountered unsupported block type: ${String(block.type)}`);
    }
    if (message.role === "assistant") {
      const hasReasoning = preserveThinking && reasoningText.length > 0;
      if (!text && toolCalls.length === 0 && !hasReasoning) continue;
      output.push({
        role: "assistant",
        content: text || " ",
        ...toolCalls.length === 0 ? {} : { tool_calls: toolCalls },
        ...hasReasoning ? { reasoning_content: reasoningText } : {}
      });
      continue;
    }
    if (pendingImages.length > 0) {
      if (attachments !== void 0) {
        enforceImageLimits(pendingImages.map((pending) => pending.block), attachments);
      }
      await Promise.all(pendingImages.map(async (pending) => {
        userContent[pending.slot] = await resolveImagePart(pending.block, context);
      }));
    }
    if (message.role === "developer") continue;
    output.push({
      role: message.role,
      content: hasImage ? userContent.filter((part) => part !== void 0) : text
    });
  }
  return output;
}

// upstream/qoder/src/qoder/transport/wire/serialize.ts
function stableHash(prefix, ...inputs) {
  const hash2 = crypto3.createHash("sha256");
  hash2.update(prefix);
  for (const input of inputs) {
    hash2.update("\0");
    hash2.update(input);
  }
  return hash2.digest("hex").slice(0, 16);
}
function stableChatRecordId(model, messages, tools, maxTokens) {
  const hash2 = crypto3.createHash("sha256");
  hash2.update("qoder-record");
  hash2.update("\0");
  hash2.update(model);
  hash2.update("\0");
  hash2.update(JSON.stringify(messages));
  hash2.update("\0");
  hash2.update(JSON.stringify(tools));
  hash2.update("\0");
  hash2.update(`mt=${maxTokens}`);
  return hash2.digest("hex").slice(0, 16);
}
function validateQoderRequestShape(options, model) {
  if (options.reasoningEffort !== void 0) {
    const effort = String(options.reasoningEffort);
    const declared = model?.reasoningEfforts;
    if (declared !== void 0 && declared.length > 0 && !declared.some((candidate) => candidate.id === effort)) {
      throw new QoderLlmError(
        `Qoder model "${options.model}" does not advertise reasoning effort "${effort}".`,
        "UNSUPPORTED_REASONING_EFFORT"
      );
    }
  }
  if (options.messages.some((message) => contentHasImage(message.content)) && model?.supportsImages !== true) {
    throw new QoderLlmError(
      `Qoder model "${options.model}" does not advertise image input.`,
      "UNSUPPORTED_CONTENT"
    );
  }
  validateMessageShapes(options.messages);
}
function translateQoderMessages(options, attachments, pipeline) {
  return validateAndTranslateMessages(
    options.messages,
    options.system,
    attachments,
    options.signal,
    pipeline
  );
}
async function validateQoderRequest(options, model, attachments) {
  validateQoderRequestShape(options, model);
  return validateAndTranslateMessages(options.messages, options.system, attachments, options.signal);
}
async function buildQoderRequestBody(options, userId, translatedMessages, model, attachments) {
  if (!userId) {
    throw new QoderLlmError("Qoder request identity is missing.", "AUTH");
  }
  const modelKey = options.model || "cmodel";
  const messages = translatedMessages ?? await validateQoderRequest(options, model, attachments);
  const modelMaxTokens = model?.maxTokens ?? 32768;
  const maxTokens = Math.min(options.maxTokens ?? modelMaxTokens, modelMaxTokens);
  const isReasoning = options.reasoningEffort !== void 0 || (model?.isReasoning ?? false);
  const tools = translateTools(options.tools);
  const defaultContexts = Object.values(model?.contextOptions ?? {}).filter((option) => option.isDefault === true && typeof option.tokenCount === "number" && Number.isFinite(option.tokenCount) && option.tokenCount > 0);
  const contextConfig = model?.contextOptions === void 0 || defaultContexts.length !== 1 ? void 0 : Object.fromEntries(Object.entries(model.contextOptions).map(([key, value]) => [key, {
    ...value.tokenCount === void 0 ? {} : { token_count: value.tokenCount },
    ...value.isDefault === void 0 ? {} : { is_default: value.isDefault }
  }]));
  let lastUserText = "";
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message === void 0) continue;
    if (message.role === "user") {
      const content = message.content;
      lastUserText = typeof content === "string" ? content : Array.isArray(content) ? content.filter((part) => part.type === "text").map((part) => part.text).join("") : "";
      break;
    }
  }
  const stablePart = stableHash("qoder-session", userId, modelKey);
  const sessionId = options.sessionId === void 0 ? `${stablePart}-${crypto3.randomUUID()}` : `${stablePart}-${String(options.sessionId)}`;
  const recordId = stableChatRecordId(modelKey, messages, tools, maxTokens);
  return {
    request_id: crypto3.randomUUID(),
    request_set_id: recordId,
    chat_record_id: recordId,
    session_id: sessionId,
    stream: true,
    chat_task: "FREE_INPUT",
    is_reply: true,
    is_retry: false,
    source: 1,
    version: "3",
    session_type: "qodercli",
    agent_id: "agent_common",
    task_id: "common",
    code_language: "",
    chat_prompt: "",
    image_urls: null,
    aliyun_user_type: "",
    system: "",
    messages,
    tools,
    parameters: {
      max_tokens: maxTokens,
      ...options.reasoningEffort === void 0 ? {} : { reasoning_effort: String(options.reasoningEffort) }
    },
    chat_context: {
      chatPrompt: "",
      imageUrls: null,
      extra: {
        context: [],
        modelConfig: { key: modelKey, is_reasoning: isReasoning },
        originalContent: lastUserText
      },
      features: [],
      text: lastUserText
    },
    model_config: {
      key: modelKey,
      is_reasoning: isReasoning,
      max_output_tokens: maxTokens,
      source: model?.source || "system",
      ...contextConfig === void 0 ? {} : { context_config: contextConfig }
    },
    business: {
      product: "cli",
      version: "1.0.0",
      type: "agent",
      stage: "start",
      id: crypto3.randomUUID(),
      name: lastUserText.substring(0, 30),
      begin_at: Date.now()
    }
  };
}

// upstream/qoder/src/qoder/transport/image-upload.ts
import crypto4 from "node:crypto";
var defaultImageUploadTimeoutMs = 3e4;
var defaultImageUrlCacheCapacity = 512;
var defaultImageUrlCacheTtlMs = 30 * 60 * 1e3;
var defaultImageUploadConcurrency = 4;
var mediaTypeExtensions = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif"
};
function aborted() {
  return new QoderLlmError("Qoder image upload was aborted.", "ABORTED");
}
function buildQoderImageMultipart(data, mediaType, boundaryId = crypto4.randomUUID()) {
  const boundary = `----qodercli-${boundaryId}`;
  const extension = mediaTypeExtensions[mediaType] ?? "png";
  const header = Buffer.from(
    `--${boundary}\r
Content-Disposition: form-data; name="file"; filename="image.${extension}"\r
Content-Type: ${mediaType}\r
\r
`,
    "utf8"
  );
  const footer = Buffer.from(`\r
--${boundary}--\r
`, "utf8");
  return { body: Buffer.concat([header, Buffer.from(data), footer]), boundary };
}
function readQoderImageUrl(payload) {
  if (payload === null || typeof payload !== "object") return void 0;
  const root = payload;
  const result = root.result;
  const data = root.data;
  const candidates = [
    root.url,
    result?.url,
    result?.oss_url,
    data?.url,
    data?.oss_url
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (trimmed.length === 0) continue;
    if (!URL.canParse(trimmed)) continue;
    return trimmed;
  }
  return void 0;
}
function dataUrl(image) {
  return `data:${image.mediaType};base64,${Buffer.from(image.data).toString("base64")}`;
}
var QoderImageUploader = class {
  cache = /* @__PURE__ */ new Map();
  flights = new SingleFlight();
  fetchImpl;
  region;
  logger;
  timeoutMs;
  cacheTtlMs;
  cacheCapacity;
  maxConcurrency;
  refreshCredentials;
  now;
  active = 0;
  queue = [];
  constructor(options = {}) {
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.region = options.region ?? "global";
    this.logger = options.logger;
    this.timeoutMs = options.timeoutMs ?? defaultImageUploadTimeoutMs;
    this.cacheTtlMs = options.cacheTtlMs ?? defaultImageUrlCacheTtlMs;
    this.cacheCapacity = options.cacheCapacity ?? defaultImageUrlCacheCapacity;
    this.maxConcurrency = options.maxConcurrency ?? defaultImageUploadConcurrency;
    this.refreshCredentials = options.refreshCredentials;
    this.now = options.now ?? Date.now;
  }
  /**
   * Resolve the wire URL for one request image.
   *
   * @param image - request-encoded image produced by the DSH attachment store.
   * @param credentials - credentials authorizing the center exchange.
   * @param signal - optional caller cancellation.
   * @returns a center object URL, or an inline data URL when publication fails.
   * @throws QoderLlmError with code `ABORTED` only when the caller cancels.
   */
  async resolveImageUrl(image, credentials, signal) {
    if (signal?.aborted) throw aborted();
    const key = this.cacheKey(image, credentials);
    const cached = this.cache.get(key);
    if (cached !== void 0) {
      if (cached.expiresAt > this.now()) {
        this.cache.delete(key);
        this.cache.set(key, cached);
        this.logger?.debug?.("[image-upload] cache hit", {
          url: cached.url,
          region: this.region,
          mediaType: image.mediaType,
          bytes: image.data.byteLength
        });
        return cached.url;
      }
      this.cache.delete(key);
    }
    return this.flights.run(
      key,
      signal,
      async (sharedSignal) => {
        const url = await this.publish(image, credentials, sharedSignal);
        if (url !== void 0) {
          this.remember(key, url);
          return url;
        }
        return dataUrl(image);
      },
      aborted
    );
  }
  /**
   * Derive the deduplication identity for one request image.
   *
   * `variantId` is the attachment store's deterministic cache and upload index
   * over the attachment, the request policy, and the encoder parameters, so it
   * identifies these exact bytes without rehashing them. Region and subscriber
   * are included because a center object is never shared across either.
   */
  cacheKey(image, credentials) {
    const hash2 = crypto4.createHash("sha256");
    hash2.update(getQoderImageUploadUrl(this.region));
    hash2.update("\0");
    hash2.update(credentials.userID);
    hash2.update("\0");
    hash2.update(image.mediaType);
    hash2.update("\0");
    const variantId = typeof image.variantId === "string" ? image.variantId : "";
    if (variantId.length > 0) {
      hash2.update(variantId);
    } else {
      hash2.update(crypto4.createHash("sha256").update(Buffer.from(image.data)).digest("hex"));
    }
    return hash2.digest("hex");
  }
  remember(key, url) {
    this.cache.delete(key);
    this.cache.set(key, { url, expiresAt: this.now() + this.cacheTtlMs });
    while (this.cache.size > this.cacheCapacity) {
      const oldest = this.cache.keys().next();
      if (oldest.done === true) break;
      this.cache.delete(oldest.value);
    }
  }
  async withSlot(signal, operation) {
    if (signal.aborted) throw aborted();
    if (this.active >= this.maxConcurrency) {
      this.logger?.debug?.("[image-upload] queued", {
        region: this.region,
        active: this.active,
        queued: this.queue.length + 1
      });
      await new Promise((resolve, reject) => {
        const onAbort = () => {
          const index = this.queue.indexOf(release);
          if (index !== -1) this.queue.splice(index, 1);
          reject(aborted());
        };
        const release = () => {
          signal.removeEventListener("abort", onAbort);
          resolve();
        };
        signal.addEventListener("abort", onAbort, { once: true });
        this.queue.push(release);
      });
    } else {
      this.active++;
    }
    try {
      if (signal.aborted) throw aborted();
      return await operation();
    } finally {
      const next = this.queue.shift();
      if (next !== void 0) next();
      else this.active--;
    }
  }
  /** Attempt publication, returning undefined when the request must degrade. */
  async publish(image, credentials, signal) {
    return this.withSlot(signal, async () => {
      const first = await this.attempt(image, credentials, signal);
      if (first.url !== void 0) return first.url;
      if (!first.retryable || this.refreshCredentials === void 0) {
        this.warnDegraded(first.reason);
        return void 0;
      }
      let refreshed;
      this.logger?.debug?.("[image-upload] refreshing credentials before retry", {
        region: this.region,
        reason: first.reason
      });
      try {
        refreshed = await this.refreshCredentials(signal);
      } catch (error) {
        if (signal.aborted) throw aborted();
        this.warnDegraded("credential refresh failed", error);
        return void 0;
      }
      const second = await this.attempt(image, refreshed, signal);
      if (second.url !== void 0) return second.url;
      this.warnDegraded(second.reason);
      return void 0;
    });
  }
  warnDegraded(reason, cause) {
    this.logger?.warn?.(
      "[image-upload] upload failed, keeping base64 image",
      { region: this.region, reason },
      ...cause === void 0 ? [] : [redactLogValue(cause)]
    );
  }
  async attempt(image, credentials, signal) {
    const requestId = crypto4.randomUUID();
    const url = getQoderImageUploadUrl(this.region, requestId);
    const multipart = buildQoderImageMultipart(image.data, image.mediaType);
    const signedBody = Buffer.from(String(multipart.body.length), "utf8");
    const timeout = AbortSignal.timeout(this.timeoutMs);
    const requestSignal = AbortSignal.any([signal, timeout]);
    const startedAt = this.now();
    const details = {
      requestId,
      region: this.region,
      mediaType: image.mediaType,
      bytes: image.data.byteLength,
      timeoutMs: this.timeoutMs
    };
    this.logger?.debug?.("[image-upload] started", details);
    try {
      const response = await this.fetchImpl(url, {
        method: "PUT",
        headers: {
          ...buildAuthHeaders(signedBody, url, credentials),
          "AI-CLIENT-TIMESTAMP": String(Math.floor(this.now() / 1e3)),
          "Content-Type": `multipart/form-data; boundary=${multipart.boundary}`,
          "Content-Length": String(multipart.body.length),
          "accept": "application/json"
        },
        body: new Uint8Array(multipart.body),
        signal: requestSignal
      });
      this.logger?.debug?.("[image-upload] response received", {
        requestId,
        status: response.status,
        elapsedMs: this.now() - startedAt
      });
      const text = await readLimitedText(response, defaultMaxJsonBytes, "Qoder image upload response");
      if (!response.ok) {
        return {
          retryable: response.status === 401 || response.status === 403,
          reason: `HTTP ${response.status}`
        };
      }
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        return { retryable: false, reason: "invalid JSON response" };
      }
      const resolved = readQoderImageUrl(payload);
      if (resolved === void 0) return { retryable: false, reason: "response carried no image URL" };
      this.logger?.debug?.("[image-upload] succeeded", {
        ...details,
        status: response.status,
        elapsedMs: this.now() - startedAt,
        url: resolved
      });
      return { url: resolved, retryable: false, reason: "" };
    } catch (error) {
      const failureDetails = { requestId, region: this.region, elapsedMs: this.now() - startedAt };
      if (signal.aborted) {
        this.logger?.debug?.("[image-upload] aborted", failureDetails);
        throw aborted();
      }
      if (timeout.aborted) {
        this.logger?.debug?.("[image-upload] timed out", failureDetails);
        return { retryable: false, reason: "upload timed out" };
      }
      this.logger?.debug?.("[image-upload] network failure", failureDetails, redactLogValue(error));
      return { retryable: false, reason: "network failure" };
    }
  }
};

// upstream/qoder/src/qoder/transport/account-reader.ts
var defaultUsageTtlMs = 6e4;
var defaultUsageTimeoutMs = 15e3;
function normalizeQuota(raw) {
  if (!raw || typeof raw !== "object") return void 0;
  const total = typeof raw.total === "number" && Number.isFinite(raw.total) ? raw.total : typeof raw.cap === "number" && Number.isFinite(raw.cap) ? raw.cap : typeof raw.remaining === "number" && typeof raw.used === "number" ? raw.used + raw.remaining : 0;
  const used = typeof raw.used === "number" && Number.isFinite(raw.used) ? raw.used : 0;
  const remaining = typeof raw.remaining === "number" && Number.isFinite(raw.remaining) ? raw.remaining : Math.max(0, total - used);
  let percentage;
  if (typeof raw.percentage === "number" && Number.isFinite(raw.percentage)) {
    percentage = raw.percentage <= 1 && total > 1 ? raw.percentage * 100 : raw.percentage;
  } else {
    percentage = total > 0 ? used / total * 100 : 0;
  }
  const unit = typeof raw.unit === "string" && raw.unit.length > 0 ? raw.unit : "credits";
  return { total, used, remaining, percentage, unit };
}
function normalizeExpiresAt(rawExpires) {
  if (rawExpires === void 0 || rawExpires === null) return void 0;
  if (typeof rawExpires === "number" && rawExpires > 0) {
    return new Date(rawExpires).toISOString();
  }
  if (typeof rawExpires === "string" && rawExpires.length > 0) {
    const parsed = Date.parse(rawExpires);
    if (!Number.isNaN(parsed) && parsed > 0) return new Date(parsed).toISOString();
  }
  return void 0;
}
function asString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : void 0;
}
function asBoolean(value) {
  return typeof value === "boolean" ? value : void 0;
}
function asNumber2(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return void 0;
}
function normalizeOrganization(raw) {
  if (!raw || typeof raw !== "object") return void 0;
  const obj = raw;
  const orgId = asString(obj.org_id) ?? asString(obj.orgId) ?? asString(obj.id);
  const orgName = asString(obj.org_name) ?? asString(obj.orgName) ?? asString(obj.name);
  if (!orgId || !orgName) return void 0;
  return {
    orgId,
    orgName,
    ...asString(obj.role_name) ?? asString(obj.roleName) !== void 0 ? { roleName: asString(obj.role_name) ?? asString(obj.roleName) } : {},
    isSuspended: asBoolean(obj.is_suspended) ?? asBoolean(obj.isSuspended) ?? false,
    canManageSubscriptions: asBoolean(obj.can_manage_subscriptions) ?? asBoolean(obj.canManageSubscriptions) ?? false,
    resourcePackageFeatureEnabled: asBoolean(obj.resource_package_feature_enabled) ?? asBoolean(obj.resourcePackageFeatureEnabled) ?? false
  };
}
function normalizeFeatureAllowed(raw) {
  if (!raw || typeof raw !== "object") return void 0;
  const obj = raw;
  return {
    quest: asBoolean(obj.quest) ?? false,
    wiki: asBoolean(obj.wiki) ?? false,
    codeReview: asBoolean(obj.code_review) ?? asBoolean(obj.codeReview) ?? false
  };
}
function normalizePlan(raw) {
  if (!raw || typeof raw !== "object") return void 0;
  const obj = raw;
  const userType = asString(obj.user_type) ?? asString(obj.userType);
  const planTierName = asString(obj.plan_tier_name) ?? asString(obj.planTierName) ?? asString(obj.plan_name) ?? asString(obj.planName);
  if (!userType || !planTierName) return void 0;
  const organization = normalizeOrganization(obj.organization);
  const isPersonalVersion = asBoolean(obj.is_personal_version) ?? asBoolean(obj.isPersonalVersion) ?? organization === void 0;
  const startDate = normalizeExpiresAt(obj.start_date ?? obj.startDate);
  const endDate = normalizeExpiresAt(obj.end_date ?? obj.endDate);
  const planTier = asString(obj.plan_tier) ?? asString(obj.planTier);
  const isHighestTier = asBoolean(obj.is_highest_tier) ?? asBoolean(obj.isHighestTier);
  const isRenewed = asBoolean(obj.is_renewed) ?? asBoolean(obj.isRenewed);
  const featureAllowed = normalizeFeatureAllowed(obj.feature_allowed ?? obj.featureAllowed);
  return {
    userType,
    planTierName,
    ...planTier !== void 0 ? { planTier } : {},
    isPersonalVersion,
    ...isHighestTier !== void 0 ? { isHighestTier } : {},
    ...isRenewed !== void 0 ? { isRenewed } : {},
    ...startDate !== void 0 ? { startDate } : {},
    ...endDate !== void 0 ? { endDate } : {},
    ...organization !== void 0 ? { organization } : {},
    ...featureAllowed !== void 0 ? { featureAllowed } : {},
    raw
  };
}
function normalizeStatus(raw) {
  if (!raw || typeof raw !== "object") return void 0;
  const obj = raw;
  const featureSwitches = obj.featureSwitches ?? obj.feature_switches;
  const teamSwitches = obj.teamSwitches ?? obj.team_switches;
  const allowByok = asNumber2(featureSwitches?.allow_byok ?? featureSwitches?.allowByok) ?? 0;
  const teamAllowByok = asNumber2(teamSwitches?.allow_byok ?? teamSwitches?.allowByok);
  const isPrivacyPolicyModifiable = asBoolean(obj.isPrivacyPolicyModifiable ?? obj.is_data_policy_modifiable);
  return {
    allowByok,
    ...teamAllowByok !== void 0 ? { teamAllowByok } : {},
    ...isPrivacyPolicyModifiable !== void 0 ? { isPrivacyPolicyModifiable } : {},
    raw
  };
}
var QoderUsageReader = class {
  authService;
  fetchImpl;
  ttlMs;
  timeoutMs;
  region;
  logger;
  cache = /* @__PURE__ */ new Map();
  flights = new SingleFlight();
  constructor(options) {
    this.authService = options.authService;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.ttlMs = options.ttlMs ?? defaultUsageTtlMs;
    this.timeoutMs = options.timeoutMs ?? defaultUsageTimeoutMs;
    this.region = options.region ?? "global";
    this.logger = options.logger;
  }
  async readAccount(pat, options) {
    if (!pat || typeof pat !== "string") {
      throw new QoderLlmError(
        "Qoder Personal Access Token is missing or invalid.",
        "MISSING_CREDENTIAL"
      );
    }
    const cacheKey = `${this.region}:${opaqueCredentialKey(pat)}`;
    if (!options?.force) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.info;
      }
    }
    return this.flights.run(
      cacheKey,
      options?.signal,
      (sharedSignal) => this.loadAccount(pat, sharedSignal, cacheKey),
      () => new QoderLlmError("Qoder account request was aborted.", "ABORTED")
    );
  }
  async loadAccount(pat, signal, cacheKey) {
    try {
      return await this.loadAccountWith(pat, signal, cacheKey);
    } catch (error) {
      if (!isQoderAuthRejection(error) || signal.aborted) throw error;
      this.logger?.warn?.("[Qoder Account] Usage read rejected as unauthorized; exchanging a fresh job token and retrying once");
    }
    this.authService.clear(pat);
    return this.loadAccountWith(pat, signal, cacheKey);
  }
  async loadAccountWith(pat, signal, cacheKey) {
    const creds = await this.authService.getCredentials(pat, signal);
    const profile = {
      id: creds.userID,
      name: creds.name || "Qoder User",
      email: creds.email || ""
    };
    const [usage, plan, status] = await Promise.all([
      retryMetadataRead(signal, () => this.fetchUsage(creds.authToken, signal)),
      this.safeFetchPlan(creds.authToken, signal),
      this.safeFetchStatus(creds.authToken, creds.machineID, signal)
    ]);
    const accountInfo = {
      profile,
      usage,
      ...plan !== void 0 ? { plan } : {},
      ...status !== void 0 ? { status } : {},
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.cache.set(cacheKey, {
      info: accountInfo,
      expiresAt: Date.now() + this.ttlMs
    });
    return accountInfo;
  }
  clear(pat) {
    if (pat) {
      this.cache.delete(`${this.region}:${opaqueCredentialKey(pat)}`);
    } else {
      this.cache.clear();
    }
  }
  async fetchUsage(jobToken, signal) {
    const data = await openApiJsonRequest(this.fetchImpl, {
      url: getQoderUsageUrl(this.region),
      token: jobToken,
      signal,
      timeoutMs: this.timeoutMs,
      logger: this.logger,
      operation: "Usage",
      logCategory: "account.usage"
    });
    return {
      userQuota: normalizeQuota(data.userQuota),
      orgResourcePackage: normalizeQuota(data.orgResourcePackage),
      addOnQuota: normalizeQuota(data.addOnQuota),
      totalUsagePercentage: typeof data.totalUsagePercentage === "number" ? data.totalUsagePercentage : void 0,
      isQuotaExceeded: typeof data.isQuotaExceeded === "boolean" ? data.isQuotaExceeded : false,
      expiresAt: normalizeExpiresAt(data.expiresAt),
      raw: data
    };
  }
  async fetchPlan(jobToken, signal) {
    const data = await openApiJsonRequest(this.fetchImpl, {
      url: getQoderUserPlanUrl(this.region),
      token: jobToken,
      signal,
      timeoutMs: this.timeoutMs,
      logger: this.logger,
      operation: "Plan",
      logCategory: "account.plan"
    });
    return normalizePlan(data);
  }
  async safeFetchPlan(jobToken, signal) {
    try {
      return await this.fetchPlan(jobToken, signal);
    } catch (error) {
      if (signal.aborted) throw error;
      this.logger?.warn?.("[Qoder Plan] Failed to load user plan (degraded)", error instanceof Error ? error.message : error);
      return void 0;
    }
  }
  async fetchStatus(jobToken, machineId, signal) {
    const data = await openApiJsonRequest(this.fetchImpl, {
      url: getQoderUserStatusUrl(this.region),
      token: jobToken,
      machineId,
      signal,
      timeoutMs: this.timeoutMs,
      logger: this.logger,
      operation: "Status",
      logCategory: "account.status"
    });
    return normalizeStatus(data);
  }
  async safeFetchStatus(jobToken, machineId, signal) {
    try {
      return await this.fetchStatus(jobToken, machineId, signal);
    } catch (error) {
      if (signal?.aborted) throw error;
      this.logger?.warn?.("[Qoder Status] Failed to load user status (degraded)", error instanceof Error ? error.message : error);
      return void 0;
    }
  }
};

// upstream/qoder/src/utc8.ts
var UTC8_OFFSET_MINUTES = 480;
function utc8WallClock(atMs) {
  const d = new Date(atMs);
  return new Date(d.getTime() + (d.getTimezoneOffset() + UTC8_OFFSET_MINUTES) * 6e4);
}
function formatUtc8Date(atMs) {
  const utc8 = utc8WallClock(atMs);
  const y = utc8.getFullYear();
  const m = String(utc8.getMonth() + 1).padStart(2, "0");
  const day = String(utc8.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// upstream/qoder/src/qoder/transport/checkin.ts
var defaultCheckInTimeoutMs = 15e3;
var DAILY_WINDOW_MAX_MS = 24 * 60 * 6e4;
var QoderCheckInService = class {
  authService;
  fetchImpl;
  region;
  variantId;
  logger;
  timeoutMs;
  constructor(options) {
    this.authService = options.authService;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.region = options.region ?? "china";
    this.variantId = options.variantId ?? "qoder";
    this.logger = options.logger;
    this.timeoutMs = options.timeoutMs ?? defaultCheckInTimeoutMs;
  }
  async fetchCampaigns(token, signal) {
    const url = getQoderCampaignsUrl(this.region);
    const data = await openApiJsonRequest(this.fetchImpl, {
      url,
      token,
      // The campaign family gates on the desktop identifier; the generic one
      // answers 200 with an empty list (see `qoderDesktopClientType`).
      headers: { "cosy-clienttype": qoderDesktopClientType },
      signal,
      timeoutMs: this.timeoutMs,
      logger: this.logger,
      operation: "Campaigns",
      logCategory: "campaigns.list"
    });
    return Array.isArray(data?.campaigns) ? data.campaigns : [];
  }
  async claimCampaign(token, campaignId, signal) {
    const url = getQoderClaimCampaignUrl(this.region, campaignId);
    const { openApiUrl } = resolveQoderEndpoints(this.region);
    return openApiJsonRequest(this.fetchImpl, {
      url,
      method: "POST",
      token,
      headers: { origin: openApiUrl, "cosy-clienttype": qoderDesktopClientType },
      signal,
      timeoutMs: this.timeoutMs,
      logger: this.logger,
      operation: "ClaimCampaign",
      logCategory: "campaigns.claim"
    });
  }
  /**
   * Attribute the campaign the upstream is serving to a day, or say why it
   * cannot be attributed to today.
   *
   * The daily benefit window is 10:00 UTC+8 → 09:59 the next morning, so a
   * calendar date and the window's own date agree for only fourteen hours of
   * every twenty-four. Treating them as the same thing is what recorded a
   * pre-10:00 read of the *previous* window's `CLAIMED` against today.
   */
  classifyCampaignWindow(campaign, nowMs, today) {
    const startAt = campaign.startAt;
    if (typeof startAt !== "number" || !Number.isFinite(startAt) || startAt <= 0) {
      return { kind: "unknown" };
    }
    const endAt = campaign.endAt;
    if (typeof endAt === "number" && Number.isFinite(endAt)) {
      const spanMs = (endAt - startAt) * 1e3;
      if (spanMs <= 0 || spanMs > DAILY_WINDOW_MAX_MS) return { kind: "unknown" };
    }
    const startMs = startAt * 1e3;
    if (startMs > nowMs) return { kind: "not-open" };
    const date = formatUtc8Date(startMs);
    return date === today ? { kind: "open", date } : { kind: "earlier", date };
  }
  async checkIn(pat, signal) {
    const nowMs = Date.now();
    const today = formatUtc8Date(nowMs);
    if (!pat || typeof pat !== "string" || pat.trim() === "") {
      return {
        variantId: this.variantId,
        date: today,
        timestamp: nowMs,
        status: "error",
        message: "No PAT available"
      };
    }
    const executeWithToken = async (authToken) => {
      const campaigns = await this.fetchCampaigns(authToken, signal);
      const benefitCampaign = campaigns.find((c) => c.actionType === "CLAIM_BENEFIT");
      if (!benefitCampaign) {
        return {
          variantId: this.variantId,
          date: today,
          timestamp: nowMs,
          status: "no-campaign",
          message: "No claimable benefit campaign found for this region"
        };
      }
      const campaignWindow = this.classifyCampaignWindow(benefitCampaign, nowMs, today);
      if (campaignWindow.kind === "not-open" || campaignWindow.kind === "earlier") {
        return {
          variantId: this.variantId,
          date: today,
          timestamp: nowMs,
          status: "before-window",
          campaignKey: benefitCampaign.campaignKey,
          message: campaignWindow.kind === "not-open" ? "Today's benefit window has not opened yet" : `Upstream is still serving the benefit window of ${campaignWindow.date}`
        };
      }
      const windowDate = campaignWindow.kind === "open" ? campaignWindow.date : today;
      if (benefitCampaign.claimStatus === "CLAIMED") {
        return {
          variantId: this.variantId,
          date: windowDate,
          timestamp: nowMs,
          status: "already-claimed",
          campaignKey: benefitCampaign.campaignKey,
          amount: benefitCampaign.benefit?.amount ?? 100,
          message: "Already claimed today"
        };
      }
      const claimResult = await this.claimCampaign(authToken, benefitCampaign.campaignId, signal);
      const isClaimed = claimResult.status === "CLAIMED";
      const replayed = Boolean(claimResult.replayed);
      const amount = claimResult.benefit?.amount ?? benefitCampaign.benefit?.amount ?? 100;
      if (isClaimed) {
        return {
          variantId: this.variantId,
          date: windowDate,
          timestamp: nowMs,
          status: replayed ? "already-claimed" : "claimed",
          amount,
          campaignKey: benefitCampaign.campaignKey,
          message: replayed ? "Already claimed today" : `Successfully claimed ${amount} credits`
        };
      }
      return {
        variantId: this.variantId,
        date: today,
        timestamp: nowMs,
        status: "error",
        campaignKey: benefitCampaign.campaignKey,
        message: `Claim returned status ${claimResult.status ?? "unknown"}`
      };
    };
    try {
      const creds = await this.authService.getCredentials(pat, signal);
      try {
        return await executeWithToken(creds.authToken);
      } catch (innerError) {
        if (isQoderAuthRejection(innerError)) {
          this.logger?.warn?.(`[Qoder CheckIn] Auth token rejected, retrying with fresh exchange`);
          const freshCreds = await this.authService.exchangeFresh(pat, signal);
          return await executeWithToken(freshCreds.authToken);
        }
        throw innerError;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger?.error?.(`[Qoder CheckIn] Check-in failed: ${message}`);
      return {
        variantId: this.variantId,
        date: today,
        timestamp: nowMs,
        status: "error",
        message
      };
    }
  }
};

// upstream/qoder/src/qoder/transport/chat.ts
import {
  attributionHeaders
} from "@deepseek-ai/dsh-llm";

// upstream/qoder/src/qoder/transport/wire/encoding.ts
var qoderCustomAlphabet = "_doRTgHZBKcGVjlvpC,@aFSx#DPuNJme&i*MzLOEn)sUrthbf%Y^w.(kIQyXqWA!";
var qoderStdAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var encodeTable = (() => {
  const table2 = new Uint8Array(256);
  for (let index = 0; index < 256; index++) table2[index] = index;
  for (let index = 0; index < qoderStdAlphabet.length; index++) {
    table2[qoderStdAlphabet.charCodeAt(index)] = qoderCustomAlphabet.charCodeAt(index);
  }
  table2["=".charCodeAt(0)] = "$".charCodeAt(0);
  return table2;
})();
function qoderEncodeBody(plaintext) {
  const std = Buffer.isBuffer(plaintext) ? plaintext.toString("base64") : Buffer.from(plaintext).toString("base64");
  const n = std.length;
  const a = Math.floor(n / 3);
  const rearranged = std.slice(n - a) + std.slice(a, n - a) + std.slice(0, a);
  const source = Buffer.from(rearranged, "latin1");
  const target = Buffer.allocUnsafe(n);
  for (let index = 0; index < n; index++) {
    target[index] = encodeTable[source[index] ?? 0] ?? 0;
  }
  return target.toString("latin1");
}

// upstream/qoder/src/qoder/transport/wire/sse.ts
import {
  ToolCallId,
  EMPTY_RESPONSE_CODE
} from "@deepseek-ai/dsh-llm";

// upstream/qoder/src/qoder/transport/wire/thinking.ts
var thinkingTags = [
  { open: "<thinking>", close: "</thinking>" },
  { open: "<think>", close: "</think>" }
];
var allTags = thinkingTags.flatMap((tag) => [tag.open, tag.close]);
function trailingPrefixLength(text, candidates) {
  let best = 0;
  for (const candidate of candidates) {
    const limit = Math.min(text.length, candidate.length - 1);
    for (let length = limit; length > best; length--) {
      if (text.endsWith(candidate.slice(0, length))) {
        best = length;
        break;
      }
    }
  }
  return best;
}
function earliestTag(text, kind) {
  let found;
  for (const tag of thinkingTags) {
    const position = text.indexOf(tag[kind]);
    if (position !== -1 && (found === void 0 || position < found.position)) found = { position, tag };
  }
  return found;
}
function trimSeparator(text) {
  if (text.startsWith("\n\n")) return text.slice(2);
  if (text.startsWith("\n")) return text.slice(1);
  return text;
}
var NativeReasoningStripper = class {
  buffer = "";
  push(chunk) {
    this.buffer += chunk;
    let output = "";
    while (this.buffer) {
      let firstPosition = -1;
      let firstTag = "";
      for (const tag of allTags) {
        const position = this.buffer.indexOf(tag);
        if (position !== -1 && (firstPosition === -1 || position < firstPosition)) {
          firstPosition = position;
          firstTag = tag;
        }
      }
      if (firstPosition !== -1) {
        output += this.buffer.slice(0, firstPosition);
        this.buffer = this.buffer.slice(firstPosition + firstTag.length);
        continue;
      }
      const held = trailingPrefixLength(this.buffer, allTags);
      output += this.buffer.slice(0, this.buffer.length - held);
      this.buffer = this.buffer.slice(this.buffer.length - held);
      break;
    }
    return output;
  }
  finish() {
    const output = allTags.some((tag) => tag.startsWith(this.buffer)) ? "" : this.buffer;
    this.buffer = "";
    return output;
  }
};
var QoderThinkingParser = class {
  buffer = "";
  mode = "text";
  closingTag = thinkingTags[0].close;
  native = new NativeReasoningStripper();
  pushReasoning(chunk) {
    const text = this.native.push(chunk);
    return text ? [{ type: "reasoning", text }] : [];
  }
  pushContent(chunk) {
    const output = [];
    const pendingReasoning = this.native.finish();
    if (pendingReasoning) output.push({ type: "reasoning", text: pendingReasoning });
    this.buffer += chunk;
    while (this.buffer) {
      if (this.mode === "reasoning") {
        const closeAt = this.buffer.indexOf(this.closingTag);
        if (closeAt !== -1) {
          if (closeAt > 0) output.push({ type: "reasoning", text: this.buffer.slice(0, closeAt) });
          this.buffer = trimSeparator(this.buffer.slice(closeAt + this.closingTag.length));
          this.mode = "text";
          continue;
        }
        const held2 = trailingPrefixLength(this.buffer, [this.closingTag]);
        const safeLength2 = this.buffer.length - held2;
        if (safeLength2 > 0) output.push({ type: "reasoning", text: this.buffer.slice(0, safeLength2) });
        this.buffer = this.buffer.slice(safeLength2);
        break;
      }
      const opener = earliestTag(this.buffer, "open");
      const closer = earliestTag(this.buffer, "close");
      if (opener !== void 0 && (closer === void 0 || opener.position < closer.position)) {
        if (opener.position > 0) output.push({ type: "text", text: this.buffer.slice(0, opener.position) });
        this.buffer = this.buffer.slice(opener.position + opener.tag.open.length);
        this.closingTag = opener.tag.close;
        this.mode = "reasoning";
        continue;
      }
      if (closer !== void 0) {
        if (closer.position > 0) output.push({ type: "text", text: this.buffer.slice(0, closer.position) });
        this.buffer = trimSeparator(this.buffer.slice(closer.position + closer.tag.close.length));
        continue;
      }
      const held = trailingPrefixLength(this.buffer, allTags);
      const safeLength = this.buffer.length - held;
      if (safeLength > 0) output.push({ type: "text", text: this.buffer.slice(0, safeLength) });
      this.buffer = this.buffer.slice(safeLength);
      break;
    }
    return output;
  }
  finish() {
    const output = [];
    const pendingReasoning = this.native.finish();
    if (pendingReasoning) output.push({ type: "reasoning", text: pendingReasoning });
    if (this.buffer) output.push({ type: this.mode, text: this.buffer });
    this.buffer = "";
    return output;
  }
};

// upstream/qoder/src/qoder/transport/wire/sse.ts
var doneMarker = "[DONE]";
var defaultMaxSseBufferChars = 2 * 1024 * 1024;
function malformed(message) {
  return new QoderLlmError(message, "MALFORMED_RESPONSE");
}
function parseEnvelope(rawData) {
  let value;
  try {
    value = JSON.parse(rawData);
  } catch {
    throw malformed("Malformed outer SSE JSON payload received from Qoder.");
  }
  if (value === null || typeof value !== "object") throw malformed("Malformed outer SSE envelope received from Qoder.");
  const envelope = value;
  if (envelope.statusCodeValue !== void 0 && typeof envelope.statusCodeValue !== "number") {
    throw malformed("Qoder SSE envelope has an invalid status code.");
  }
  if (envelope.statusCodeValue !== void 0 && (!Number.isInteger(envelope.statusCodeValue) || envelope.statusCodeValue < 100 || envelope.statusCodeValue > 599)) {
    throw malformed("Qoder SSE envelope has an invalid status code.");
  }
  if (envelope.statusCodeValue !== void 0 && envelope.statusCodeValue !== 200) {
    const status = envelope.statusCodeValue;
    throw qoderHttpError(
      envelope.body ? `Qoder service returned upstream error status ${status}: ${envelope.body}` : `Qoder service returned upstream error status ${status}.`,
      { status },
      envelope.body
    );
  }
  if (envelope.body !== void 0 && typeof envelope.body !== "string") {
    throw malformed("Qoder SSE envelope has an invalid model body.");
  }
  return envelope;
}
function parseInner(body) {
  try {
    const value = JSON.parse(body);
    if (value === null || typeof value !== "object") throw new Error("not an object");
    return value;
  } catch {
    throw malformed("Malformed inner model payload received from Qoder.");
  }
}
function tokenUsage(innerChunk) {
  if (!innerChunk.usage) return void 0;
  const usage = innerChunk.usage;
  const promptTokens = usage.prompt_tokens ?? 0;
  const cacheReadTokens = usage.prompt_tokens_details?.cached_tokens ?? 0;
  const cacheWriteTokens = usage.prompt_tokens_details?.cache_write_tokens ?? 0;
  const reasoningTokens = usage.completion_tokens_details?.reasoning_tokens;
  return {
    inputTokens: Math.max(0, promptTokens - cacheReadTokens - cacheWriteTokens),
    outputTokens: usage.completion_tokens ?? 0,
    ...cacheReadTokens > 0 ? { cacheReadTokens } : {},
    ...cacheWriteTokens > 0 ? { cacheWriteTokens } : {},
    ...reasoningTokens === void 0 ? {} : { reasoningTokens }
  };
}
function finishKind(value) {
  if (value === void 0 || value === null || value === "") return void 0;
  if (value === "stop") return "stop";
  if (value === "length") return "max-tokens";
  if (value === "tool_calls" || value === "toolUse") return "tool-calls";
  if (value === "content_filter") {
    throw new QoderLlmError("Qoder blocked the response through its content filter.", "PROVIDER_ERROR");
  }
  throw malformed(`Qoder returned unknown finish reason "${value}".`);
}
async function* parseQoderSse(stream, options = {}) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const thinkingParser = new QoderThinkingParser();
  const toolCalls = /* @__PURE__ */ new Map();
  let buffer = "";
  let sourceEnded = false;
  let sawDone = false;
  let nextBlockIndex = 0;
  let activeTextual;
  let pendingUsage;
  let terminalKind = "stop";
  let sawContent = false;
  const maxBufferChars = options.maxBufferChars ?? defaultMaxSseBufferChars;
  const closeTextual = () => {
    if (activeTextual === void 0) return [];
    const state = activeTextual;
    activeTextual = void 0;
    return [{
      type: "block-end",
      index: state.index,
      block: state.type === "text" ? { type: "text", text: state.text } : { type: "reasoning", text: state.text }
    }];
  };
  const appendSegment = (segment) => {
    if (!segment.text) return [];
    const chunks = [];
    sawContent = true;
    if (activeTextual?.type !== segment.type) {
      chunks.push(...closeTextual());
      activeTextual = { type: segment.type, index: nextBlockIndex++, text: "" };
      chunks.push({ type: "block-start", index: activeTextual.index, blockType: segment.type });
    }
    activeTextual.text += segment.text;
    chunks.push(segment.type === "text" ? { type: "text-delta", index: activeTextual.index, text: segment.text } : { type: "reasoning-delta", index: activeTextual.index, text: segment.text });
    return chunks;
  };
  const openToolCall = (state) => {
    if (!state.id || state.blockIndex !== void 0) return [];
    const chunks = closeTextual();
    state.blockIndex = nextBlockIndex++;
    sawContent = true;
    chunks.push({ type: "block-start", index: state.blockIndex, blockType: "tool-call" });
    const argumentsDelta = state.arguments.slice(state.emittedArguments);
    state.emittedArguments = state.arguments.length;
    chunks.push({
      type: "tool-call-delta",
      index: state.blockIndex,
      id: ToolCallId(state.id),
      ...state.name ? { name: state.name } : {},
      argumentsDelta
    });
    return chunks;
  };
  try {
    while (!sourceEnded && !sawDone) {
      const { done, value } = await reader.read();
      if (done) {
        sourceEnded = true;
        buffer += decoder.decode();
        if (buffer.length > 0 && !buffer.endsWith("\n")) buffer += "\n";
      } else {
        options.onActivity?.();
        buffer += decoder.decode(value, { stream: true });
        if (buffer.length > maxBufferChars) {
          throw malformed("Qoder SSE frame exceeded its size limit.");
        }
      }
      while (!sawDone) {
        const lineEnd = buffer.indexOf("\n");
        if (lineEnd === -1) break;
        let line = buffer.substring(0, lineEnd);
        buffer = buffer.substring(lineEnd + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        line = line.trim();
        if (!line.startsWith("data:")) continue;
        const rawData = line.substring(5).trim();
        if (!rawData) continue;
        if (rawData === doneMarker) {
          sawDone = true;
          break;
        }
        const envelope = parseEnvelope(rawData);
        const body = envelope.body?.trim();
        if (!body) continue;
        if (body === doneMarker) {
          sawDone = true;
          break;
        }
        const innerChunk = parseInner(body);
        pendingUsage = tokenUsage(innerChunk) ?? pendingUsage;
        for (const choice of innerChunk.choices ?? []) {
          terminalKind = finishKind(choice.finish_reason) ?? terminalKind;
          const delta = choice.delta;
          if (!delta) continue;
          if (typeof delta.reasoning_content === "string" && delta.reasoning_content) {
            for (const segment of thinkingParser.pushReasoning(delta.reasoning_content)) {
              for (const chunk of appendSegment(segment)) yield chunk;
            }
          }
          if (typeof delta.content === "string" && delta.content) {
            for (const segment of thinkingParser.pushContent(delta.content)) {
              for (const chunk of appendSegment(segment)) yield chunk;
            }
          }
          if (delta.tool_calls !== void 0) {
            if (!Array.isArray(delta.tool_calls)) throw malformed("Qoder tool-call delta is not an array.");
            for (const rawCall of delta.tool_calls) {
              if (typeof rawCall !== "object" || rawCall === null || Array.isArray(rawCall)) {
                throw malformed("Qoder tool-call delta is not an object.");
              }
              const upstreamIndex = rawCall.index ?? 0;
              if (!Number.isInteger(upstreamIndex) || upstreamIndex < 0) {
                throw malformed("Qoder tool-call delta has an invalid index.");
              }
              let state = toolCalls.get(upstreamIndex);
              if (state === void 0) {
                state = { id: "", name: "", arguments: "", emittedArguments: 0 };
                toolCalls.set(upstreamIndex, state);
              }
              if (rawCall.id !== void 0) {
                if (rawCall.id === "" || rawCall.id === null) {
                } else if (typeof rawCall.id !== "string") {
                  throw malformed("Qoder tool call has an invalid id.");
                } else {
                  if (state.id && state.id !== rawCall.id) throw malformed("Qoder changed a streamed tool-call id.");
                  state.id = rawCall.id;
                }
              }
              let hasNewName = false;
              if (rawCall.function?.name !== void 0) {
                const name = rawCall.function.name;
                if (name === "" || name === null) {
                } else if (typeof name !== "string") {
                  throw malformed("Qoder tool call has an invalid name.");
                } else {
                  if (state.name && state.name !== name) throw malformed("Qoder changed a streamed tool-call name.");
                  if (state.name !== name) {
                    state.name = name;
                    hasNewName = true;
                  }
                }
              }
              if (rawCall.function?.arguments !== void 0) {
                if (typeof rawCall.function.arguments !== "string") {
                  throw malformed("Qoder tool-call arguments delta is not a string.");
                }
                state.arguments += rawCall.function.arguments;
              }
              const wasOpen = state.blockIndex !== void 0;
              for (const chunk of openToolCall(state)) yield chunk;
              if (wasOpen && state.blockIndex !== void 0 && state.emittedArguments < state.arguments.length) {
                const argumentsDelta = state.arguments.slice(state.emittedArguments);
                state.emittedArguments = state.arguments.length;
                yield {
                  type: "tool-call-delta",
                  index: state.blockIndex,
                  id: ToolCallId(state.id),
                  ...state.name ? { name: state.name } : {},
                  argumentsDelta
                };
              } else if (wasOpen && state.blockIndex !== void 0 && hasNewName) {
                yield {
                  type: "tool-call-delta",
                  index: state.blockIndex,
                  id: ToolCallId(state.id),
                  name: state.name,
                  argumentsDelta: ""
                };
              }
            }
          }
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => void 0);
    reader.releaseLock();
  }
  if (!sawDone) throw new QoderLlmError("SSE stream ended prematurely without [DONE].", "TRANSPORT");
  for (const segment of thinkingParser.finish()) {
    for (const chunk of appendSegment(segment)) yield chunk;
  }
  for (const chunk of closeTextual()) yield chunk;
  for (const [, state] of [...toolCalls.entries()].sort(([left], [right]) => left - right)) {
    if (!state.id || !state.name) throw malformed("Qoder completed an unidentifiable tool call.");
    const normalizedArguments = state.arguments.trim() ? state.arguments : "{}";
    try {
      JSON.parse(normalizedArguments);
    } catch {
      throw malformed(`Qoder completed tool call "${state.name}" with malformed JSON arguments.`);
    }
    for (const chunk of openToolCall(state)) yield chunk;
    if (state.blockIndex === void 0) throw malformed("Qoder failed to open a completed tool call.");
    if (state.emittedArguments === 0 && normalizedArguments === "{}") {
      yield {
        type: "tool-call-delta",
        index: state.blockIndex,
        id: ToolCallId(state.id),
        name: state.name,
        argumentsDelta: "{}"
      };
    }
    yield {
      type: "block-end",
      index: state.blockIndex,
      block: {
        type: "tool-call",
        id: ToolCallId(state.id),
        name: state.name,
        arguments: normalizedArguments
      }
    };
  }
  if (pendingUsage) yield { type: "usage", usage: pendingUsage };
  if (!sawContent) {
    yield {
      type: "finish",
      reason: {
        kind: "error",
        failure: { message: "Model returned a completed response with no content.", code: EMPTY_RESPONSE_CODE }
      }
    };
    return;
  }
  yield { type: "finish", reason: { kind: toolCalls.size > 0 ? "tool-calls" : terminalKind } };
}

// upstream/qoder/src/qoder/transport/chat.ts
function aborted2(message) {
  return new QoderLlmError(message, "ABORTED");
}
async function* streamQoderChat(options, model, credentials, messages, dependencies) {
  const request = await buildQoderRequestBody(options, credentials.userID, messages, model);
  const encodedBody = qoderEncodeBody(JSON.stringify(request));
  const encodedBytes = Buffer.from(encodedBody, "utf8");
  const chatUrl = getQoderChatUrl(dependencies.region);
  const requestController = new AbortController();
  let headerTimedOut = false;
  let idleTimedOut = false;
  let idleTimer;
  let chunkCount = 0;
  let reqId;
  const startedAt = performance.now();
  let lastActivityAt = startedAt;
  const onCallerAbort = () => requestController.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", onCallerAbort, { once: true });
  const headerTimer = setTimeout(() => {
    headerTimedOut = true;
    requestController.abort("response header timeout");
  }, dependencies.responseHeaderTimeoutMs);
  const resetIdleTimer = () => {
    lastActivityAt = performance.now();
    if (idleTimer !== void 0) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      idleTimedOut = true;
      requestController.abort("stream idle timeout");
    }, dependencies.streamIdleTimeoutMs);
  };
  try {
    const response = await dependencies.fetch(chatUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "accept": "text/event-stream",
        "cache-control": "no-cache",
        "accept-encoding": "identity",
        "x-model-key": options.model || "cmodel",
        "x-model-source": model?.source || "system",
        ...attributionHeaders(),
        ...buildAuthHeaders(encodedBytes, chatUrl, credentials)
      },
      body: encodedBytes,
      signal: requestController.signal
    });
    clearTimeout(headerTimer);
    reqId = qoderRequestId(response.headers);
    dependencies.logger?.debug?.("[Qoder Stream] Response headers received", {
      region: dependencies.region,
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
      ...reqId === void 0 ? {} : { requestId: reqId }
    });
    resetIdleTimer();
    if (!response.ok) {
      let errorBody;
      try {
        errorBody = await readLimitedText(response, defaultMaxErrorBytes, "Qoder chat error response");
      } catch {
        errorBody = void 0;
      }
      throw qoderHttpError(`Qoder upstream service returned HTTP ${response.status}.`, response, errorBody);
    }
    if (!response.body) {
      throw new QoderLlmError("Qoder response contains no readable body stream.", "EMPTY_RESPONSE");
    }
    let firstChunkDurationMs;
    let tokenUsage2;
    let finishReason;
    const streamStartedAt = performance.now();
    for await (const chunk of parseQoderSse(response.body, { onActivity: resetIdleTimer })) {
      chunkCount++;
      if (firstChunkDurationMs === void 0) {
        firstChunkDurationMs = Math.round(performance.now() - startedAt);
        dependencies.logger?.debug?.("[Qoder Stream] First chunk received", {
          durationMs: firstChunkDurationMs,
          ...reqId === void 0 ? {} : { requestId: reqId }
        });
      }
      if (chunk.type === "usage") {
        tokenUsage2 = chunk.usage;
      }
      if (chunk.type === "finish") {
        finishReason = chunk.reason.kind;
      }
      yield chunk;
    }
    dependencies.logger?.debug?.("[Qoder Stream] Stream completed", {
      durationMs: Math.round(performance.now() - startedAt),
      streamDurationMs: Math.round(performance.now() - streamStartedAt),
      chunkCount,
      ...finishReason === void 0 ? {} : { finishReason },
      ...tokenUsage2 === void 0 ? {} : { usage: tokenUsage2 },
      ...reqId === void 0 ? {} : { requestId: reqId }
    });
  } catch (error) {
    if (options.signal?.aborted) throw aborted2("Request was aborted.");
    const elapsedMs = Math.round(performance.now() - startedAt);
    if (headerTimedOut) {
      const failure2 = new QoderLlmError("Qoder model request exceeded its response header timeout.", "TIMEOUT");
      dependencies.logger?.error?.("[Qoder Stream] Request failed", redactLogValue(failure2), {
        phase: "header",
        elapsedMs,
        timeoutMs: dependencies.responseHeaderTimeoutMs
      });
      throw failure2;
    }
    if (idleTimedOut) {
      const failure2 = new QoderLlmError("Qoder model stream exceeded its idle timeout.", "TIMEOUT");
      dependencies.logger?.error?.("[Qoder Stream] Request failed", redactLogValue(failure2), {
        phase: "stream-idle",
        chunkCount,
        idleDurationMs: Math.round(performance.now() - lastActivityAt),
        elapsedMs,
        ...reqId === void 0 ? {} : { requestId: reqId }
      });
      throw failure2;
    }
    if (error instanceof QoderLlmError) {
      dependencies.logger?.error?.("[Qoder Stream] Request failed", redactLogValue(error), {
        chunkCount,
        elapsedMs,
        ...reqId === void 0 ? {} : { requestId: reqId }
      });
      throw error;
    }
    const failure = new QoderLlmError("Qoder transport request failed.", "TRANSPORT", { cause: error });
    dependencies.logger?.error?.("[Qoder Stream] Request failed", redactLogValue(failure), {
      chunkCount,
      elapsedMs,
      ...reqId === void 0 ? {} : { requestId: reqId },
      cause: redactLogValue(error)
    });
    throw failure;
  } finally {
    clearTimeout(headerTimer);
    if (idleTimer !== void 0) clearTimeout(idleTimer);
    options.signal?.removeEventListener("abort", onCallerAbort);
    requestController.abort("request complete");
  }
}

// upstream/qoder/src/qoder/transport/default-transport.ts
var defaultStreamIdleTimeoutMs = 5 * 60 * 1e3;
var jobTokenNoticeMaxAgeMs = 5 * 60 * 1e3;
function aborted3(message) {
  return new QoderLlmError(message, "ABORTED");
}
var DefaultQoderTransport = class {
  region;
  resolvePat;
  fetchImpl;
  logger;
  streamIdleTimeoutMs;
  responseHeaderTimeoutMs;
  metadataTimeoutMs;
  auth;
  usage;
  checkInService;
  modelFlights = new SingleFlight();
  attachments;
  imageUploader;
  preserveThinking;
  onJobTokenRefreshed;
  onJobTokenRefreshFailed;
  /**
   * Set when the self-heal exchanged a fresh job token, cleared when a chat
   * afterwards succeeds. The notice reports "the token was rotated because the
   * old one was rejected", which is true from that exchange on — so it must
   * not be tied to the heal's OWN retry, which can still lose a race with a
   * transient upstream timeout and be rescued by a later attempt.
   */
  pendingRefreshAt;
  /**
   * Whether the current unresolved heal failure has already been reported.
   *
   * One upstream rejection can outlive many host-level retries (an observed
   * storm ran 59 of them across 75 steps), and the transport re-heals inside
   * every one of them. Without this latch the failure notice would print once
   * per retry; with it, the user is told once per outage. Cleared as soon as
   * any chat is accepted, so the next outage announces itself again.
   */
  refreshFailureAnnounced = false;
  constructor(options) {
    this.region = options.region;
    this.resolvePat = options.resolvePat;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.logger = options.logger;
    this.streamIdleTimeoutMs = options.streamIdleTimeoutMs ?? defaultStreamIdleTimeoutMs;
    this.responseHeaderTimeoutMs = options.responseHeaderTimeoutMs ?? defaultResponseHeaderTimeoutMs;
    this.metadataTimeoutMs = options.metadataTimeoutMs;
    this.attachments = options.attachments;
    this.preserveThinking = options.preserveThinking;
    this.onJobTokenRefreshed = options.onJobTokenRefreshed;
    this.onJobTokenRefreshFailed = options.onJobTokenRefreshFailed;
    this.auth = new QoderAuthService({
      fetch: this.fetchImpl,
      logger: this.logger,
      region: this.region,
      resolveMachineId: options.resolveMachineId
    });
    this.imageUploader = new QoderImageUploader({
      fetch: this.fetchImpl,
      logger: this.logger,
      region: this.region,
      ...options.imageUploadTimeoutMs === void 0 ? {} : { timeoutMs: options.imageUploadTimeoutMs },
      ...options.imageUrlCacheTtlMs === void 0 ? {} : { cacheTtlMs: options.imageUrlCacheTtlMs },
      refreshCredentials: async (signal) => {
        const pat = await this.requirePat(signal);
        this.auth.clear(pat);
        return this.auth.getCredentials(pat, signal);
      }
    });
    this.usage = new QoderUsageReader({
      authService: this.auth,
      fetch: this.fetchImpl,
      logger: this.logger,
      region: this.region,
      timeoutMs: this.metadataTimeoutMs
    });
    this.checkInService = new QoderCheckInService({
      authService: this.auth,
      fetch: this.fetchImpl,
      logger: this.logger,
      region: this.region,
      timeoutMs: this.metadataTimeoutMs
    });
  }
  stream(options, model) {
    return this.generate(options, model);
  }
  /**
   * Report the pending self-heal once a chat is accepted, then clear it.
   *
   * The notice means "the stale token was rejected, so it was rotated, and the
   * chat works again" — all three are true by the time a chat is accepted
   * after the refresh, no matter which attempt delivered it.
   */
  flushPendingRefreshNotice() {
    if (this.pendingRefreshAt === void 0) return;
    const at = this.pendingRefreshAt;
    this.pendingRefreshAt = void 0;
    if (Date.now() - at > jobTokenNoticeMaxAgeMs) return;
    this.logger?.warn?.("[Qoder Stream] Job token was auto-refreshed after an upstream rejection; the chat has recovered");
    this.onJobTokenRefreshed?.({ region: this.region, at });
  }
  /**
   * Drop a pending rotation notice whose heal did not rescue anything.
   *
   * The heal's own retry was rejected too, so "the rotation fixed it" is not
   * what happened. Leaving the notice pending made a LATER, unrelated chat
   * acceptance flush it — printing a success row that contradicts the failure
   * row already shown, stamped with the old rotation time.
   */
  discardPendingRefreshNotice() {
    this.pendingRefreshAt = void 0;
  }
  /**
   * Note that the upstream accepted a chat, ending any unresolved heal failure.
   *
   * `streamChat` calls this the moment its first chunk arrives — the only point
   * at which "the credential was accepted" is actually known. A rejected chat
   * throws before that, so this never fires on a failing attempt.
   */
  onChatAccepted() {
    this.refreshFailureAnnounced = false;
    this.flushPendingRefreshNotice();
  }
  async discoverModels(signal) {
    const pat = await this.requirePat(signal);
    const key = opaqueCredentialKey(pat);
    return this.modelFlights.run(
      key,
      signal,
      async (sharedSignal) => {
        const credentials = await this.auth.getCredentials(pat, sharedSignal);
        return retryMetadataRead(sharedSignal, () => fetchQoderModels(credentials, {
          fetch: this.fetchImpl,
          signal: sharedSignal,
          logger: this.logger,
          region: this.region,
          timeoutMs: this.metadataTimeoutMs
        }));
      },
      () => aborted3("Qoder model discovery was aborted.")
    );
  }
  async readAccount(options) {
    const pat = await this.requirePat(options?.signal);
    return this.usage.readAccount(pat, {
      force: options?.force,
      signal: options?.signal
    });
  }
  async checkIn(signal) {
    const pat = await this.requirePat(signal);
    return this.checkInService.checkIn(pat, signal);
  }
  async requirePat(signal) {
    if (signal?.aborted) throw aborted3("Qoder request was aborted.");
    const pat = (await this.resolvePat()).trim();
    if (!pat) {
      throw new QoderLlmError(
        "Qoder Personal Access Token is missing. Configure Qoder in the Qoder settings page.",
        "MISSING_CREDENTIAL"
      );
    }
    if (signal?.aborted) throw aborted3("Qoder request was aborted.");
    return pat;
  }
  /**
   * Stream one chat, reporting acceptance as soon as the FIRST chunk arrives.
   *
   * `streamQoderChat` throws before yielding anything when the upstream rejects
   * the request, so a first chunk means the credential was accepted. Reporting
   * at that moment — rather than after the whole stream drains — matters
   * because the consumer may close the stream early, and code after a
   * completed `yield*` would then never run.
   *
   * @param onAccepted - Called once, before the first chunk is forwarded.
   */
  async *streamChat(options, model, credentials, messages, onAccepted) {
    const stream = streamQoderChat(options, model, credentials, messages, {
      fetch: this.fetchImpl,
      logger: this.logger,
      region: this.region,
      responseHeaderTimeoutMs: this.responseHeaderTimeoutMs,
      streamIdleTimeoutMs: this.streamIdleTimeoutMs
    });
    const first = await stream.next();
    onAccepted();
    if (!first.done) yield first.value;
    yield* stream;
  }
  async *generate(options, model) {
    if (options.signal?.aborted) throw aborted3("Request was aborted prior to generation.");
    validateQoderRequestShape(options, model);
    const pat = await this.requirePat(options.signal);
    const credentials = await this.auth.getCredentials(pat, options.signal);
    const messages = await translateQoderMessages(options, this.attachments, {
      uploader: this.imageUploader,
      credentials,
      preserveThinking: this.preserveThinking
    });
    const chatCredentials = await this.auth.getCredentials(pat, options.signal);
    try {
      yield* this.streamChat(options, model, chatCredentials, messages, () => {
        this.onChatAccepted();
      });
      return;
    } catch (error) {
      if (!isQoderAuthRejection(error) || options.signal?.aborted) throw error;
      this.logger?.warn?.(
        "[Qoder Stream] Chat rejected as unauthorized; exchanging a fresh job token and retrying once",
        { status: error.failure.status }
      );
    }
    let lastRejection;
    let noticeAt;
    for (let round = 0; round < 2; round++) {
      const refreshed = await this.auth.exchangeFresh(pat, options.signal);
      this.pendingRefreshAt = Date.now();
      noticeAt = this.pendingRefreshAt;
      try {
        yield* this.streamChat(options, model, refreshed, messages, () => {
          this.onChatAccepted();
        });
        return;
      } catch (error) {
        if (!isQoderAuthRejection(error) || options.signal?.aborted) throw error;
        lastRejection = error;
        if (round + 1 < 2) {
          this.logger?.warn?.("[Qoder Stream] Fresh job token also rejected; waiting 2s and retrying once more", {
            status: error.failure.status,
            round: round + 1
          });
          await new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, 2e3);
            options.signal?.addEventListener("abort", () => {
              clearTimeout(timer);
              reject(aborted3("Request was aborted during the re-auth backoff."));
            }, { once: true });
          });
        }
      }
    }
    if (this.pendingRefreshAt === noticeAt) this.discardPendingRefreshNotice();
    if (!this.refreshFailureAnnounced) {
      this.refreshFailureAnnounced = true;
      this.logger?.warn?.("[Qoder Stream] Job token refresh did not recover the chat; the upstream still rejects it", {
        status: lastRejection instanceof LlmError2 ? lastRejection.failure.status : void 0
      });
      this.onJobTokenRefreshFailed?.({
        region: this.region,
        at: Date.now(),
        ...lastRejection instanceof LlmError2 && lastRejection.failure.status !== void 0 ? { status: lastRejection.failure.status } : {}
      });
    }
    throw lastRejection;
  }
};

// upstream/qoder/src/qoder/transport/index.ts
function createQoderTransport(options) {
  return new DefaultQoderTransport(options);
}

// upstream/qoder/src/upstream.ts
var KIND_STATUS = {
  missing_credential: 401,
  auth: 401,
  soft_rate: 429,
  quota_exceeded: 402,
  timeout: 408,
  server: 502,
  client: 400
};
function kindFromQoderFailure(failure) {
  if (failure.code === "MISSING_CREDENTIAL") return "missing_credential";
  if (failure.code === "RATE_LIMIT") return "soft_rate";
  if (failure.code === "QUOTA" || failure.code === "ACCOUNT_QUOTA") return "quota_exceeded";
  if (failure.status === 402) return "quota_exceeded";
  if (failure.code.startsWith("INVALID_") || failure.code.startsWith("UNSUPPORTED_") || failure.code === "ATTACHMENT") {
    return "client";
  }
  if (failure.code === "AUTH" || failure.status === 401 || failure.status === 403) return "auth";
  if (failure.status === 429) return "soft_rate";
  if (failure.code === "TIMEOUT") return "timeout";
  return "server";
}
var UpstreamRequestError = class extends Error {
};
function sseFrame(payload) {
  return `data: ${JSON.stringify(payload)}

`;
}
var SSE_DONE = "data: [DONE]\n\n";
var IMAGE_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function requiredString(value, what) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new UpstreamRequestError(`${what} must be a non-empty string`);
  }
  return value;
}
function decodeDataImage(url) {
  const match = /^data:([a-z]+\/[a-z0-9.+-]+)(?:;[a-z0-9;=+.-]*)?,(.*)$/iu.exec(url);
  if (match === null) throw new UpstreamRequestError("image_url data URL is malformed");
  const mediaType = match[1].toLowerCase();
  if (!IMAGE_MEDIA_TYPES.includes(mediaType)) {
    throw new UpstreamRequestError(`image media type "${mediaType}" is not supported (png, jpeg, webp, gif)`);
  }
  let data;
  try {
    data = new Uint8Array(Buffer.from(match[2] ?? "", "base64"));
  } catch {
    throw new UpstreamRequestError("image_url base64 payload could not be decoded");
  }
  if (data.byteLength === 0) throw new UpstreamRequestError("image_url payload is empty");
  return { mediaType, data };
}
async function openAiContentBlocks(content, role, imagesAs) {
  const blocks = [];
  const parts = typeof content === "string" || content === null || content === void 0 ? typeof content === "string" && content !== "" ? [{ type: "text", text: content }] : [] : Array.isArray(content) ? content : (() => {
    throw new UpstreamRequestError(`${role} message content must be a string or a parts array`);
  })();
  for (const raw of parts) {
    if (!isRecord(raw) || typeof raw["type"] !== "string") {
      throw new UpstreamRequestError(`${role} message content part is malformed`);
    }
    switch (raw["type"]) {
      case "text":
        blocks.push({ type: "text", text: typeof raw["text"] === "string" ? raw["text"] : "" });
        break;
      case "image_url": {
        if (role !== "user") throw new UpstreamRequestError("image parts are valid only in user messages");
        const imageUrl = raw["image_url"];
        const url = isRecord(imageUrl) && typeof imageUrl["url"] === "string" ? imageUrl["url"] : "";
        if (!url.toLowerCase().startsWith("data:")) {
          throw new UpstreamRequestError("image_url must be an inline data: URL; remote image URLs are not fetched");
        }
        if (imagesAs === void 0) {
          throw new UpstreamRequestError("image input requires the DSH attachment service");
        }
        const decoded = decodeDataImage(url);
        blocks.push(await imagesAs.commit(decoded));
        break;
      }
      default:
        throw new UpstreamRequestError(`unsupported content part type "${raw["type"]}"`);
    }
  }
  return blocks;
}
async function toGenerateOptions(bodyJson, context) {
  let parsed;
  try {
    parsed = JSON.parse(bodyJson);
  } catch {
    throw new UpstreamRequestError("request body is not valid JSON");
  }
  if (!isRecord(parsed)) throw new UpstreamRequestError("request body must be a JSON object");
  const model = requiredString(parsed["model"], "model");
  const rawMessages = parsed["messages"];
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    throw new UpstreamRequestError("messages must be a non-empty array");
  }
  const systemParts = [];
  const messages = [];
  for (const raw of rawMessages) {
    if (!isRecord(raw)) throw new UpstreamRequestError("each message must be an object");
    const role = raw["role"];
    switch (role) {
      case "system":
      case "developer": {
        if (typeof raw["content"] !== "string") throw new UpstreamRequestError("system message content must be a string");
        if (raw["content"] !== "") systemParts.push(raw["content"]);
        break;
      }
      case "user": {
        const content = await openAiContentBlocks(
          raw["content"],
          "user",
          context.attachments === void 0 ? void 0 : {
            commit: async (part) => ({
              type: "image",
              attachment: await context.attachments.saveImage({ data: part.data, mediaType: part.mediaType })
            })
          }
        );
        messages.push(createUserMessage({ content, source: { kind: "user" } }));
        break;
      }
      case "assistant": {
        const content = await openAiContentBlocks(raw["content"], "assistant", void 0);
        const rawCalls = raw["tool_calls"];
        if (Array.isArray(rawCalls)) {
          for (const rawCall of rawCalls) {
            if (!isRecord(rawCall)) throw new UpstreamRequestError("each tool call must be an object");
            const fn = isRecord(rawCall["function"]) ? rawCall["function"] : rawCall;
            content.push({
              type: "tool-call",
              id: ToolCallId2(requiredString(rawCall["id"], "tool call id")),
              name: requiredString(fn["name"], "tool call function name"),
              arguments: typeof fn["arguments"] === "string" ? fn["arguments"] : ""
            });
          }
        }
        if (content.length === 0) break;
        messages.push(createAssistantMessage({
          content,
          source: { provider: context.providerId, model }
        }));
        break;
      }
      case "tool": {
        const callId = requiredString(raw["tool_call_id"], "tool_call_id");
        const content = raw["content"];
        let text;
        if (typeof content === "string") {
          text = content;
        } else if (Array.isArray(content)) {
          text = content.filter((part) => isRecord(part) && part["type"] === "text").map((part) => typeof part["text"] === "string" ? part["text"] : "").join("");
          if (content.some((part) => isRecord(part) && part["type"] !== "text")) {
            throw new UpstreamRequestError("tool result content is limited to text");
          }
        } else {
          throw new UpstreamRequestError("tool message content must be a string or a text-parts array");
        }
        messages.push(createToolResultMessage({
          callId: ToolCallId2(callId),
          content: [{ type: "text", text }],
          isError: false
        }));
        break;
      }
      default:
        throw new UpstreamRequestError(`unsupported message role "${String(role)}"`);
    }
  }
  if (messages.length === 0) throw new UpstreamRequestError("the request carries no model-facing message");
  const tools = Array.isArray(parsed["tools"]) ? parsed["tools"].map((raw) => {
    if (!isRecord(raw)) throw new UpstreamRequestError("each tool must be an object");
    const fn = isRecord(raw["function"]) ? raw["function"] : raw;
    if (!isRecord(fn)) throw new UpstreamRequestError("each tool must carry a function object");
    return {
      name: requiredString(fn["name"], "tool name"),
      description: typeof fn["description"] === "string" ? fn["description"] : "",
      parameters: isRecord(fn["parameters"]) ? fn["parameters"] : {}
    };
  }) : void 0;
  const effort = parsed["reasoning_effort"];
  const stop = parsed["stop"];
  const temperature = parsed["temperature"];
  const maxTokens = parsed["max_tokens"];
  return {
    provider: context.providerId,
    model,
    messages,
    ...systemParts.length > 0 ? { system: systemParts.join("\n") } : {},
    ...tools === void 0 || tools.length === 0 ? {} : { tools },
    ...typeof temperature === "number" && Number.isFinite(temperature) ? { temperature } : {},
    ...typeof maxTokens === "number" && Number.isFinite(maxTokens) && maxTokens > 0 ? { maxTokens: Math.floor(maxTokens) } : {},
    ...typeof effort === "string" && effort.trim() !== "" ? { reasoningEffort: ReasoningEffortId(effort.trim()) } : {},
    ...Array.isArray(stop) ? { stop: stop.filter((entry) => typeof entry === "string") } : typeof stop === "string" ? { stop: [stop] } : {},
    ...context.signal === void 0 ? {} : { signal: context.signal }
  };
}
var ChunkEncoder = class {
  id;
  created;
  model;
  started = false;
  terminal = false;
  toolIndexByBlock = /* @__PURE__ */ new Map();
  announcedTools = /* @__PURE__ */ new Set();
  nextToolIndex = 0;
  constructor(model) {
    this.id = `chatcmpl-${randomBytes2(12).toString("hex")}`;
    this.created = Math.floor(Date.now() / 1e3);
    this.model = model;
  }
  frame(extra) {
    return sseFrame({
      id: this.id,
      object: "chat.completion.chunk",
      created: this.created,
      model: this.model,
      ...extra
    });
  }
  /** The role frame opens every stream, once. */
  start() {
    if (this.started) return [];
    this.started = true;
    return [this.frame({ choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }] })];
  }
  /** Translate one transport chunk into zero or more SSE frames. */
  frames(chunk) {
    switch (chunk.type) {
      case "block-start":
      case "block-end":
        return [];
      case "text-delta":
        return [this.frame({ choices: [{ index: 0, delta: { content: chunk.text }, finish_reason: null }] })];
      case "reasoning-delta":
        return [this.frame({ choices: [{ index: 0, delta: { reasoning_content: chunk.text }, finish_reason: null }] })];
      case "tool-call-delta": {
        let toolIndex = this.toolIndexByBlock.get(chunk.index);
        if (toolIndex === void 0) {
          toolIndex = this.nextToolIndex++;
          this.toolIndexByBlock.set(chunk.index, toolIndex);
        }
        const first = !this.announcedTools.has(chunk.index);
        if (first) this.announcedTools.add(chunk.index);
        const call = {
          index: toolIndex,
          ...first ? {
            id: String(chunk.id),
            type: "function",
            function: { name: chunk.name ?? "", arguments: chunk.argumentsDelta }
          } : { function: { arguments: chunk.argumentsDelta } }
        };
        return [this.frame({ choices: [{ index: 0, delta: { tool_calls: [call] }, finish_reason: null }] })];
      }
      case "usage": {
        const cacheRead = chunk.usage.cacheReadTokens;
        const cacheWrite = chunk.usage.cacheWriteTokens;
        const prompt = chunk.usage.inputTokens + (cacheRead ?? 0) + (cacheWrite ?? 0);
        const completion = chunk.usage.outputTokens;
        const reasoning = chunk.usage.reasoningTokens;
        const details = cacheRead === void 0 && cacheWrite === void 0 ? void 0 : {
          ...cacheRead === void 0 ? {} : { cached_tokens: cacheRead },
          ...cacheWrite === void 0 ? {} : { cache_write_tokens: cacheWrite }
        };
        return [this.frame({
          choices: [],
          usage: {
            prompt_tokens: prompt,
            completion_tokens: completion,
            total_tokens: chunk.usage.totalTokens ?? prompt + completion,
            ...details === void 0 ? {} : { prompt_tokens_details: details },
            ...reasoning === void 0 ? {} : {
              completion_tokens_details: {
                reasoning_tokens: reasoning
              }
            }
          }
        })];
      }
      case "finish": {
        this.terminal = true;
        const reason = chunk.reason;
        if (reason.kind === "error" || reason.kind === "aborted") {
          return [
            sseFrame({ error: { message: reason.failure.message, type: "server_error", code: reason.failure.code } }),
            SSE_DONE
          ];
        }
        const finishReason = reason.kind === "max-tokens" ? "length" : reason.kind === "tool-calls" ? "tool_calls" : "stop";
        return [
          this.frame({ choices: [{ index: 0, delta: {}, finish_reason: finishReason }] }),
          SSE_DONE
        ];
      }
    }
  }
  /** Fallback finish when the chunk source ended without a finish chunk. */
  finishFallback() {
    if (this.terminal) return [];
    this.terminal = true;
    return [
      this.frame({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] }),
      SSE_DONE
    ];
  }
  /** A thrown mid-stream failure, phrased as one error frame and the end. */
  abortFrames(message, code) {
    this.terminal = true;
    return [sseFrame({ error: { message, type: "server_error", code } }), SSE_DONE];
  }
};
function failureResult(error) {
  if (error instanceof UpstreamRequestError) {
    return { ok: false, status: 400, kind: "client", message: error.message };
  }
  if (error instanceof LlmError3) {
    const kind = kindFromQoderFailure(error.failure);
    const status = typeof error.failure.status === "number" && error.failure.status >= 100 && error.failure.status <= 599 ? error.failure.status : KIND_STATUS[kind];
    return { ok: false, status, kind, message: error.failure.message };
  }
  return { ok: false, status: 502, kind: "server", message: String(error) };
}
var QoderUpstreamClient = class {
  region;
  providerId;
  getPat;
  transport;
  attachments;
  externalCatalog;
  /** The raw discovery rows of the last successful `fetchModels`, by id. */
  discovered = /* @__PURE__ */ new Map();
  /** Provenance of the last successful catalog fetch, for the status card. */
  lastCatalog;
  constructor(options) {
    this.region = options.region;
    this.providerId = options.providerId;
    this.getPat = options.getPat;
    this.transport = options.transport;
    this.attachments = options.attachments;
    this.externalCatalog = options.catalogProvider;
  }
  /** The region this client's transport serves. */
  get clientRegion() {
    return this.region;
  }
  /**
   * The catalog row for one model id: this client's own discovery answers
   * first (it is the same data the upstream catalog call produced), and an
   * externally supplied provider — the plugin's fallback roster, say — fills
   * ids the discovery never listed.
   */
  catalogModelFor(id) {
    return this.discovered.get(id) ?? this.externalCatalog?.(id);
  }
  /**
   * Discover this variant's models and translate them into plugin rows.
   *
   * The raw rows stay addressable via {@link catalogModelFor}: a chat request
   * for a discovered model must hand the transport its row, because effort
   * support, image capability, and the output cap are all validated against
   * it. The last successful fetch's provenance lands in {@link lastCatalog}
   * for the status card.
   */
  async fetchModels(signal) {
    const models = await this.transport.discoverModels(signal);
    this.discovered.clear();
    for (const model of models) this.discovered.set(model.id, model);
    this.lastCatalog = { fetchedAtMs: Date.now(), source: `${this.providerId}:discovery` };
    return models.map(modelInfoOf);
  }
  /**
   * The subscriber's quota answer, mapped onto the card's credit shape.
   *
   * Qoder reports one personal quota and an optional organization resource
   * package; each becomes a package row the card already knows how to draw.
   * An unbounded personal allowance (`total === 0`, not exceeded) is the
   * account's "unlimited" state.
   */
  async fetchCredits(signal) {
    const account = await this.transport.readAccount({ force: true, ...signal === void 0 ? {} : { signal } });
    const usage = account.usage ?? {};
    const accounts = [];
    const personal = usage.userQuota;
    if (personal !== void 0) {
      accounts.push({
        packageName: "\u4E2A\u4EBA\u989D\u5EA6",
        remain: personal.remaining,
        size: personal.total,
        ...usage.expiresAt === void 0 ? {} : { packageEndTime: usage.expiresAt }
      });
    }
    const org = usage.orgResourcePackage;
    if (org !== void 0) {
      accounts.push({
        packageName: "\u7EC4\u7EC7\u8D44\u6E90\u5305",
        remain: org.remaining,
        size: org.total,
        ...usage.expiresAt === void 0 ? {} : { packageEndTime: usage.expiresAt }
      });
    }
    const addOn = usage.addOnQuota;
    if (addOn !== void 0) {
      accounts.push({
        packageName: "\u8D60\u9001\u989D\u5EA6",
        remain: addOn.remaining,
        size: addOn.total,
        ...usage.expiresAt === void 0 ? {} : { packageEndTime: usage.expiresAt }
      });
    }
    const unlimited = usage.isQuotaExceeded === false && personal !== void 0 && personal.total === 0;
    return {
      total: usage.totalUsagePercentage ?? personal?.percentage ?? 0,
      totalSize: accounts.reduce((sum, entry) => sum + entry.size, 0),
      accounts,
      ...unlimited ? { unlimited: true } : {},
      ...usage.expiresAt === void 0 ? {} : { cycleResetTime: usage.expiresAt }
    };
  }
  /**
   * Run daily benefit check-in for this client's variant.
   */
  async checkIn(signal) {
    return this.transport.checkIn(signal);
  }
  /**
   * Stream one translated chat-completions request.
   *
   * The first transport chunk is pulled before the response is constructed:
   * everything the transport can reject without touching the network — a
   * missing or empty credential, an effort the model does not advertise, an
   * image on a text-only model — must still be able to answer as a real HTTP
   * status, not as a 200 whose first frame is an error. Once streaming has
   * begun, failures degrade to the error-frame-then-`[DONE]` form the
   * {@link ChunkEncoder} documents.
   */
  async chatStream(bodyJson, signal) {
    let options;
    try {
      options = await toGenerateOptions(bodyJson, {
        providerId: this.providerId,
        attachments: this.attachments,
        ...signal === void 0 ? {} : { signal }
      });
    } catch (error) {
      return failureResult(error);
    }
    try {
      await this.getPat();
    } catch {
      return { ok: false, status: KIND_STATUS.missing_credential, kind: "missing_credential", message: "no Qoder Personal Access Token is configured" };
    }
    const encoder = new ChunkEncoder(options.model);
    let iterator;
    try {
      iterator = this.transport.stream(options, this.catalogModelFor(options.model))[Symbol.asyncIterator]();
    } catch (error) {
      return failureResult(error);
    }
    try {
      const first = await iterator.next();
      if (!first.done) {
        const earlyFailure = first.value.type === "finish" && (first.value.reason.kind === "error" || first.value.reason.kind === "aborted") ? first.value.reason.failure : void 0;
        if (earlyFailure !== void 0) {
          await iterator.return?.();
          const kind = kindFromQoderFailure(earlyFailure);
          return { ok: false, status: earlyFailure.status ?? KIND_STATUS[kind], kind, message: earlyFailure.message };
        }
      }
      const stream = this.bodyStream(iterator, first, encoder);
      return {
        ok: true,
        response: new Response(stream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
          }
        })
      };
    } catch (error) {
      await iterator.return?.();
      return failureResult(error);
    }
  }
  /** Drive the SSE body from an already-started chunk iterator. */
  bodyStream(iterator, first, encoder) {
    const encoderRef = encoder;
    const toBytes = (() => {
      const text = new TextEncoder();
      return (frame) => text.encode(frame);
    })();
    let queue = [];
    let pending = first;
    return new ReadableStream({
      pull: async (controller) => {
        try {
          while (queue.length === 0 && !encoderRef.terminal) {
            if (pending === void 0) {
              pending = await iterator.next();
            }
            const next = pending;
            pending = void 0;
            if (next.done) {
              queue.push(...encoderRef.finishFallback());
              break;
            }
            queue.push(...encoderRef.start(), ...encoderRef.frames(next.value));
          }
        } catch (error) {
          const message = error instanceof LlmError3 ? error.failure.message : String(error);
          const code = error instanceof LlmError3 ? error.failure.code : "TRANSPORT";
          queue = encoderRef.abortFrames(message, code);
        }
        if (queue.length > 0) {
          controller.enqueue(toBytes(queue.shift()));
          if (encoderRef.terminal && queue.length === 0) controller.close();
          return;
        }
        controller.close();
      },
      cancel: async () => {
        await iterator.return?.();
      }
    });
  }
  /**
   * One minimal reasoning-effort request, as the probe sweep needs it.
   *
   * A row that declares efforts is still checked locally, so an unlisted value
   * costs no request. A row that declares none — the only kind detection is
   * offered for — sends the value to the upstream and waits for its answer,
   * because the endpoint is the only authority on spellings the catalog never
   * lists. Either refusal is reported as an attributable 400 with code
   * `UNSUPPORTED_REASONING_EFFORT`, and an accepted value costs exactly one
   * streamed request, which this method ends after the first chunk arrives —
   * see the module docs in `probe.ts`.
   */
  async probeEffort(model, effort, signal) {
    try {
      await this.getPat();
    } catch {
      return { status: 401, streamed: false, errorCode: "MISSING_CREDENTIAL", detail: "no Personal Access Token configured" };
    }
    const options = {
      provider: this.providerId,
      model,
      messages: [createUserMessage({
        content: [{ type: "text", text: PROBE_PROMPT }],
        source: { kind: "user" }
      })],
      maxTokens: PROBE_MAX_TOKENS,
      ...effort === void 0 ? {} : { reasoningEffort: ReasoningEffortId(effort) },
      signal
    };
    try {
      const iterator = this.transport.stream(options, this.catalogModelFor(model))[Symbol.asyncIterator]();
      try {
        const first = await iterator.next();
        return { status: first.done ? 502 : 200, streamed: !first.done };
      } finally {
        await iterator.return?.();
      }
    } catch (error) {
      if (error instanceof LlmError3) {
        const status = error.failure.status ?? defaultStatusForProbe(error.failure.code);
        const code = status === 400 && blamesReasoningEffort(error.failure.message) ? "UNSUPPORTED_REASONING_EFFORT" : error.failure.code;
        return { status, streamed: false, errorCode: code, detail: error.failure.message.slice(0, 300) };
      }
      return { status: 0, streamed: false, detail: `transport error: ${String(error)}` };
    }
  }
};
function blamesReasoningEffort(message) {
  return message.includes("invalid_parameter_error") && message.includes("reasoning_effort");
}
function defaultStatusForProbe(code) {
  switch (code) {
    case "UNSUPPORTED_REASONING_EFFORT":
    case "UNSUPPORTED_CONTENT":
    case "INVALID_REQUEST":
      return 400;
    case "MISSING_CREDENTIAL":
    case "AUTH":
      return 401;
    case "RATE_LIMIT":
      return 429;
    case "QUOTA":
      return 402;
    default:
      return 502;
  }
}
function modelInfoOf(model) {
  const options = Object.values(model.contextOptions ?? {}).map((option) => option.tokenCount).filter((count) => typeof count === "number" && Number.isFinite(count) && count > 0);
  const supportedContextWindows = [...new Set(options)].sort((left, right) => left - right);
  const defaultOptions = Object.values(model.contextOptions ?? {}).filter((option) => option.isDefault === true);
  const contextWindow = model.contextWindow ?? (defaultOptions.length === 1 ? defaultOptions[0]?.tokenCount : void 0) ?? DEFAULT_CONTEXT_WINDOW;
  const reasoning = model.isReasoning === true || model.supportsEffort === true ? {
    supports: true,
    ...model.reasoningEfforts === void 0 || model.reasoningEfforts.length === 0 ? {} : { supportedEfforts: model.reasoningEfforts.map((effort) => effort.id) },
    ...model.defaultReasoningEffort === void 0 ? {} : { defaultEffort: model.defaultReasoningEffort },
    canDisableThinking: false
  } : void 0;
  const billing = model.priceFactor === void 0 ? { free: false, rateUnknown: true } : model.priceFactor === 0 ? { credits: "x0", free: true } : { credits: `x${model.priceFactor}`, free: false };
  return {
    id: model.id,
    name: model.name === "" ? model.id : model.name,
    contextWindow,
    ...defaultOptions.length === 1 && defaultOptions[0]?.tokenCount !== void 0 ? { defaultContextWindow: defaultOptions[0].tokenCount } : {},
    ...supportedContextWindows.length > 1 ? { supportedContextWindows } : {},
    maxTokens: model.maxTokens ?? DEFAULT_MAX_TOKENS,
    supportsImages: model.supportsImages === true,
    ...reasoning === void 0 ? {} : { reasoning },
    billing,
    ...model.source === void 0 ? {} : { source: model.source }
  };
}
var DEFAULT_MAX_TOKENS = 32768;
var DEFAULT_CONTEXT_WINDOW = 18e4;

// src/checkins.mjs
import { createHash as createHash2 } from "node:crypto";
import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { withFileLock } from "@deepseek-ai/dsh-atomic-write";
var supportsCheckin = (provider) => ["workbuddy", "trae", "qoder", "qoder-global"].includes(provider);
var hash = (value) => createHash2("sha256").update(value).digest("hex");
var nextDay = (now) => Date.parse(`${beijingDay(now)}T00:00:00+08:00`) + 864e5;
var evening = (now) => Date.parse(`${beijingDay(now)}T20:05:00+08:00`);
var windowAt = (a, now) => Date.parse(`${beijingDay(now)}T${a.provider.startsWith("qoder") ? "10:05" : "00:00"}:00+08:00`);
function checkinFailure(error, submitted = false) {
  const status = error?.status ?? error?.failure?.status ?? Number(/\bhttp\s+(401|403|429)\b/i.exec(error?.message || "")?.[1]);
  if (status === 401) return { status: "auth-invalid" };
  if ([403, 429].includes(status)) return { status: "paused" };
  if (/no valid refresh token is available|no refresh token is stored/.test(error?.message || "")) return { status: "auth-invalid" };
  return { status: submitted ? "uncertain" : "retryable" };
}
var canRetry = (record2, now) => ["retryable", "before-window"].includes(record2.status) && record2.retryAt <= now && (record2.attempts || 1) < 2;
var checkinMessages = {
  claimed: "\u7B7E\u5230\u6210\u529F",
  "already-claimed": "\u4ECA\u65E5\u5DF2\u9886\u53D6",
  "device-used": "\u6B64\u8BBE\u5907\u4ECA\u65E5\u5DF2\u53C2\u4E0E\u7B7E\u5230\uFF0C\u4E0D\u518D\u5207\u6362\u5176\u4ED6\u8D26\u53F7\u9886\u53D6",
  "no-campaign": "\u5E73\u53F0\u672A\u5F00\u653E\u53EF\u9886\u53D6\u6D3B\u52A8",
  "before-window": "\u7B7E\u5230\u7A97\u53E3\u5C1A\u672A\u5F00\u542F",
  paused: "\u5E73\u53F0\u9650\u5236\u6216\u9700\u8981\u9A8C\u8BC1\uFF0C\u5DF2\u6682\u505C\u6B64\u5E73\u53F0\u7B7E\u5230\uFF0C\u8BF7\u5728\u5B98\u65B9\u5BA2\u6237\u7AEF\u5904\u7406",
  uncertain: "\u8BF7\u6C42\u7ED3\u679C\u5F85\u786E\u8BA4\uFF0C\u4ECA\u65E5\u4E0D\u518D\u81EA\u52A8\u63D0\u4EA4\uFF0C\u8BF7\u5728\u5B98\u65B9\u5BA2\u6237\u7AEF\u6838\u5BF9",
  "auth-invalid": "\u4EE4\u724C\u5931\u6548\uFF0C\u8BF7\u5230\u8D26\u53F7\u4E0E\u767B\u5F55\u66F4\u65B0\u51ED\u8BC1",
  retryable: "\u67E5\u8BE2\u5931\u8D25\uFF0C\u9886\u53D6\u5C1A\u672A\u63D0\u4EA4",
  error: "\u7B7E\u5230\u672A\u5B8C\u6210\uFF0C\u4ECA\u65E5\u4E0D\u518D\u91CD\u590D\u5C1D\u8BD5\uFF0C\u8BF7\u5728\u5B98\u65B9\u5BA2\u6237\u7AEF\u67E5\u770B",
  unsupported: "\u6682\u672A\u63A5\u5165\u53EF\u6838\u9A8C\u7684\u7B7E\u5230\u63A5\u53E3\uFF0C\u8BF7\u4F7F\u7528\u5B98\u65B9\u5BA2\u6237\u7AEF"
};
var Checkins = class {
  constructor(file, manager, { now = Date.now, spacingMs = 1e4 } = {}) {
    this.file = file;
    this.manager = manager;
    this.now = now;
    this.spacingMs = spacingMs;
    this.data = { records: {}, devices: {}, pauses: {} };
    this.abort = new AbortController();
  }
  async read() {
    try {
      const raw = JSON.parse(await readFile(this.file, "utf8"));
      const object = (value) => value && typeof value === "object" && !Array.isArray(value);
      if (!object(raw) || !["records", "devices", "pauses"].every((k) => object(raw[k])) || Object.values(raw.records).some((r) => !object(r) || !Array.isArray(r.ids) || !Number.isFinite(r.at) || typeof r.day !== "string")) throw Error("Invalid check-in journal");
      this.data = raw;
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  async load() {
    try {
      await this.read();
    } catch {
      this.failed = true;
    }
  }
  get settings() {
    return this.manager.config.checkinSchedule ?? { mode: "scheduled", time: "10:05" };
  }
  last(account) {
    return Object.values(this.data.records).filter((r) => r.ids?.includes(account.id)).sort((a, b) => b.at - a.at)[0];
  }
  ready(account, now = this.now()) {
    const last = this.last(account);
    return account.enabled !== false && supportsCheckin(account.provider) && !this.data.pauses[account.provider] && last?.status !== "auth-invalid" && now >= windowAt(account, now) && (last?.day !== beijingDay(now) || canRetry(last, now));
  }
  dueAt(account, now = this.now()) {
    const scheduled = this.settings.mode === "startup" ? "00:00" : this.settings.time;
    return Math.max(windowAt(account, now), Date.parse(`${beijingDay(now)}T${scheduled}:00+08:00`));
  }
  tick() {
    if (this.failed || this.flight || this.abort.signal.aborted) return;
    const now = this.now();
    const ids = this.manager.config.accounts.filter((a) => a.autoCheckin === true && this.ready(a, now) && now >= this.dueAt(a, now)).map((a) => a.id);
    if (ids.length) this.start(ids, true);
  }
  state() {
    return {
      running: !!this.flight,
      current: this.current,
      error: this.failed ? "\u7B7E\u5230\u8BB0\u5F55\u65E0\u6CD5\u8BFB\u53D6\uFF0C\u5DF2\u505C\u6B62\u7B7E\u5230\uFF1B\u8BF7\u4FEE\u590D\u8BB0\u5F55\u6587\u4EF6\u540E\u91CD\u542F\u63D2\u4EF6\u3002" : void 0,
      settings: this.settings,
      schedule: `${this.settings.mode === "startup" ? "\u6BCF\u65E5\u9996\u6B21\u542F\u52A8\u65F6\u7B7E\u5230\uFF0C\u6301\u7EED\u8FD0\u884C\u5219\u65B0\u4E00\u5929\u81EA\u52A8\u6267\u884C" : `\u5317\u4EAC\u65F6\u95F4\u6BCF\u5929 ${this.settings.time} \u5B9A\u65F6\u7B7E\u5230\uFF0C\u9519\u8FC7\u65F6\u542F\u52A8\u8865\u67E5`}\uFF1B20:05 \u4EC5\u8865\u67E5\u672A\u63D0\u4EA4\u9886\u53D6\u7684\u5931\u8D25`,
      report: this.data.report,
      accounts: this.manager.config.accounts.map((a) => {
        const last = this.last(a);
        const pause = this.data.pauses[a.provider];
        return {
          id: a.id,
          supported: supportsCheckin(a.provider),
          auto: a.autoCheckin === true,
          ready: this.ready(a),
          scheduledAt: this.dueAt(a),
          paused: !!pause,
          last: last ? {
            day: last.day,
            at: last.at,
            status: last.status,
            amount: last.amount,
            activity: last.activity,
            retryAt: last.retryAt,
            retryReady: canRetry(last, this.now()),
            message: checkinMessages[last.status] || checkinMessages.error
          } : void 0
        };
      })
    };
  }
  start(ids, automatic = false) {
    if (this.failed || this.abort.signal.aborted || this.flight) return;
    if (!automatic && (!Array.isArray(ids) || !ids.length || ids.length > 200 || ids.some((id) => !this.manager.config.accounts.some((a) => a.id === id)))) throw Error("\u8BF7\u9009\u62E9\u6709\u6548\u7684\u7B7E\u5230\u8D26\u53F7");
    const selected = this.manager.config.accounts.filter((a) => supportsCheckin(a.provider) && a.enabled !== false && (automatic ? a.autoCheckin === true && (!ids || ids.includes(a.id)) : ids.includes(a.id)) && this.ready(a) && (!automatic || this.now() >= this.dueAt(a))).map((a) => a.id);
    if (!selected.length) return;
    this.flight = (async () => {
      let requested = false;
      const counts = {};
      for (const id of selected) {
        if (this.abort.signal.aborted) break;
        const account = this.manager.config.accounts.find((a) => a.id === id && a.enabled !== false && (!automatic || a.autoCheckin === true));
        if (!account) continue;
        if (requested) {
          await delay(this.spacingMs, void 0, { signal: this.abort.signal });
          requested = false;
        }
        this.current = id;
        requested = await this.run(account, automatic);
        if (requested) {
          const last = this.state().accounts.find((a) => a.id === id)?.last;
          if (last) counts[last.status] = (counts[last.status] || 0) + 1;
        }
      }
      if (Object.keys(counts).length) await withFileLock(this.file, async () => {
        await this.read();
        this.data.report = { at: this.now(), counts };
        await writePrivateJson(this.file, this.data);
      });
    })().catch(() => {
      if (!this.abort.signal.aborted) this.failed = true;
    }).finally(() => {
      this.flight = void 0;
      this.current = void 0;
    });
  }
  async resume(provider) {
    if (!supportsCheckin(provider) || this.failed || this.flight) throw Error("\u8BF7\u7B49\u5F85\u7B7E\u5230\u5B8C\u6210\uFF0C\u6216\u5148\u4FEE\u590D\u7B7E\u5230\u8BB0\u5F55");
    await withFileLock(this.file, async () => {
      await this.read();
      delete this.data.pauses[provider];
      await writePrivateJson(this.file, this.data);
    });
  }
  async credentialsUpdated(id) {
    await withFileLock(this.file, async () => {
      await this.read();
      for (const [key, row] of Object.entries(this.data.records)) if (row.status === "auth-invalid" && row.ids.includes(id)) delete this.data.records[key];
      await writePrivateJson(this.file, this.data);
    }, { waitMs: 3e4 });
  }
  async run(account, automatic = false) {
    const now = this.now(), day = beijingDay(now);
    if (now < windowAt(account, now) || automatic && now < this.dueAt(account, now)) return false;
    return withFileLock(this.file, async () => {
      await this.read();
      if (this.abort.signal.aborted || this.data.pauses[account.provider]) return false;
      if (this.last(account)?.status === "auth-invalid") return false;
      const previousEntry = Object.entries(this.data.records).find(([, r]) => r.day === day && r.ids?.includes(account.id));
      const previous = previousEntry?.[1];
      if (previous && !canRetry(previous, now)) return false;
      if (this.data.lastRequestAt && now - this.data.lastRequestAt < this.spacingMs) return false;
      this.data.lastRequestAt = now;
      await writePrivateJson(this.file, this.data);
      const pendingKey = hash(`${account.provider}:local:${account.id}`);
      const pending = {
        day,
        at: now,
        status: "retryable",
        ids: previous?.ids || [account.id],
        attempts: (previous?.attempts || (previous ? 1 : 0)) + 1,
        ...now < evening(now) ? { retryAt: evening(now) } : {}
      };
      if (previousEntry) delete this.data.records[previousEntry[0]];
      this.data.records[pendingKey] = pending;
      await writePrivateJson(this.file, this.data);
      let identity, client;
      try {
        client = await this.manager.router.client(account);
        if (!client.checkin) throw Error("Unsupported check-in");
        identity = await client.checkin.identity(AbortSignal.any([this.abort.signal, AbortSignal.timeout(3e4)]));
        if (!identity?.account || account.provider === "trae" && !identity.device) throw Error("Missing check-in identity");
      } catch (error) {
        pending.status = checkinFailure(error).status;
        if (pending.status !== "retryable") delete pending.retryAt;
        if (pending.status === "paused") this.data.pauses[account.provider] = { at: now };
        await writePrivateJson(this.file, this.data);
        return true;
      }
      if (this.abort.signal.aborted || !this.manager.config.accounts.some((a) => a.id === account.id && a.enabled !== false && a.credentialFile === account.credentialFile && (!automatic || a.autoCheckin === true))) return true;
      const key = hash(`${account.provider}:${identity.account}`), device = identity.device ? hash(`${account.provider}:${identity.device}`) : void 0;
      const old = this.data.records[key];
      delete this.data.records[pendingKey];
      if (old?.day === day && !canRetry(old, now)) {
        if (!old.ids.includes(account.id)) {
          old.ids.push(account.id);
          await writePrivateJson(this.file, this.data);
        } else await writePrivateJson(this.file, this.data);
        return false;
      }
      const record2 = {
        ...pending,
        status: "uncertain",
        ids: [.../* @__PURE__ */ new Set([...pending.ids, ...old?.ids || [], account.id])],
        attempts: Math.max(pending.attempts, old?.day === day ? (old.attempts || 1) + 1 : 1)
      };
      this.data.records[key] = record2;
      for (const [k, row] of Object.entries(this.data.records)) if (row.at < now - 30 * 864e5) delete this.data.records[k];
      for (const [k, row] of Object.entries(this.data.devices)) if (row.until <= now) delete this.data.devices[k];
      if (device && this.data.devices[device]?.until > now) {
        record2.status = "device-used";
        await writePrivateJson(this.file, this.data);
        return true;
      }
      if (device) this.data.devices[device] = { until: nextDay(now) };
      await writePrivateJson(this.file, this.data);
      let result;
      try {
        result = await client.checkin.claim(AbortSignal.any([this.abort.signal, AbortSignal.timeout(3e4)]));
      } catch {
        result = { status: "uncertain" };
      }
      record2.status = Object.hasOwn(checkinMessages, result?.status) ? result.status : "uncertain";
      if (device && ["already-claimed", "no-campaign", "retryable", "before-window", "auth-invalid"].includes(record2.status)) delete this.data.devices[device];
      if (record2.attempts >= 2 || !["retryable", "before-window"].includes(record2.status)) delete record2.retryAt;
      if (["claimed", "already-claimed"].includes(record2.status) && Number.isFinite(result.amount) && result.amount >= 0) record2.amount = result.amount;
      if (result?.activity) record2.activity = Object.fromEntries(["streakDays", "totalCredits", "nextStreakDay", "endsAt"].filter((k) => Number.isFinite(result.activity[k]) && result.activity[k] >= 0).map((k) => [k, result.activity[k]]));
      if (record2.status === "paused" || result?.paused === true) this.data.pauses[account.provider] = { at: now };
      await writePrivateJson(this.file, this.data);
      if (record2.status === "claimed") await this.manager.monitorAccount(account);
      return true;
    }, { waitMs: 1e3 });
  }
};

// src/stream.mjs
async function preflightStream(response, signal) {
  if (!response.body) return { ok: false, status: 502, kind: "empty_stream" };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const buffered = [];
  let pending = "", size = 0;
  const abort = () => {
    void reader.cancel().catch(() => {
    });
  };
  signal?.addEventListener("abort", abort, { once: true });
  const clean = () => signal?.removeEventListener("abort", abort);
  try {
    while (true) {
      signal?.throwIfAborted();
      const { value, done } = await reader.read();
      signal?.throwIfAborted();
      if (done) {
        clean();
        return { ok: false, status: 502, kind: "stream_ended_before_answer" };
      }
      buffered.push(value);
      size += value.byteLength;
      pending += decoder.decode(value, { stream: true });
      let boundary;
      while (boundary = /\r?\n\r?\n/.exec(pending)) {
        const frame = pending.slice(0, boundary.index);
        pending = pending.slice(boundary.index + boundary[0].length);
        const data = frame.split(/\r?\n/).filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
        if (!data) continue;
        let payload;
        if (data === "[DONE]") return accepted();
        try {
          payload = JSON.parse(data);
        } catch {
          await reader.cancel();
          clean();
          return { ok: false, status: 502, kind: "invalid_sse" };
        }
        if (payload.error || /^event:\s*error$/m.test(frame)) {
          const error = payload.error ?? payload;
          const status = Number(error.status ?? error.status_code ?? error.code);
          const kind = error.type ?? error.code;
          const mapped = ["soft_rate", "RATE_LIMIT", "rate_limit", "rate_limit_exceeded"].includes(kind) ? 429 : ["hard_credit", "QUOTA", "quota_exhausted"].includes(kind) ? 402 : ["session_dead", "authentication", "AUTH", "missing_credential"].includes(kind) ? 401 : 502;
          await reader.cancel();
          clean();
          return { ok: false, status: status >= 400 && status <= 599 ? status : mapped, kind: "early_stream_error" };
        }
        if (payload.choices?.some((choice) => choice.finish_reason || choice.delta?.content || choice.delta?.reasoning_content || choice.delta?.tool_calls?.length || choice.delta?.function_call)) return accepted();
      }
      if (size > 128 * 1024) {
        await reader.cancel();
        clean();
        return { ok: false, status: 502, kind: "stream_prelude_too_large" };
      }
    }
  } catch (error) {
    await reader.cancel().catch(() => {
    });
    clean();
    throw error;
  }
  function accepted() {
    let index = 0;
    const stream = new ReadableStream({
      async pull(controller) {
        try {
          signal?.throwIfAborted();
          if (index < buffered.length) {
            controller.enqueue(buffered[index++]);
            return;
          }
          const chunk = await reader.read();
          signal?.throwIfAborted();
          if (chunk.done) {
            clean();
            controller.close();
          } else controller.enqueue(chunk.value);
        } catch (error) {
          clean();
          controller.error(error);
          await reader.cancel().catch(() => {
          });
        }
      },
      async cancel(reason) {
        clean();
        await reader.cancel(reason);
      }
    });
    return { ok: true, response: new Response(stream, { status: response.status, headers: response.headers }) };
  }
}

// src/clients.mjs
var expiryMs = (value) => {
  const n = typeof value === "number" ? value < 1e12 ? value * 1e3 : value : Date.parse(value || "");
  return Number.isFinite(n) && n > 0 ? n : void 0;
};
async function jsonCredential(file) {
  try {
    return JSON.parse(await readFile2(file, "utf8"));
  } catch {
    throw new RouteError(401, "credential_unreadable");
  }
}
function cachedModels(discover, ttl) {
  let cached, expires = 0, inflight;
  return async (signal, force = false) => {
    if (!force && cached && expires > Date.now()) return cached;
    inflight ??= discover(AbortSignal.timeout(6e4)).then((rows) => {
      cached = rows;
      expires = Date.now() + ttl;
      return rows;
    }).finally(() => {
      inflight = void 0;
    });
    return abortable(inflight, signal);
  };
}
async function createAccountClient(account, config, attachments) {
  let chat, discover, accountInfo, checkin;
  if (account.provider.startsWith("workbuddy")) {
    const client = new WorkBuddyUpstreamClient();
    const variant = WORKBUDDY_VARIANTS.find((v) => v.id === account.provider);
    const store = new WorkBuddyCredentialStore({
      variant,
      ownPath: account.credentialFile,
      desktopPath: `${account.credentialFile}.no-desktop`,
      refresh: (c) => account.provider === "workbuddy" ? refreshWorkBuddyCheckinCredential(c) : client.refreshToken(c)
    });
    const credential = async () => {
      try {
        return await store.resolve();
      } catch {
        throw new RouteError(401, "credential_refresh_failed");
      }
    };
    discover = async (signal) => (await client.fetchModels(await credential(), signal)).map((m) => modelWithCurrentPromotion(m));
    accountInfo = async () => {
      const c = await credential(), credits = await client.fetchCredits(c);
      return {
        login: {
          state: "valid",
          identity: c.uid,
          name: c.nickname || c.uid,
          expiresAt: c.expiresAtMs,
          refreshExpiresAt: c.refreshExpiresAtMs,
          refreshable: !!c.refreshToken,
          kind: "\u5BA2\u6237\u7AEF\u767B\u5F55\u6001"
        },
        remaining: credits.unlimited ? null : credits.total,
        unlimited: !!credits.unlimited,
        unit: "credits",
        cycle: credits.cycleResetTime || credits.accounts.map((p) => `${p.packageName}:${p.endTimeMs || ""}`).sort().join("|"),
        packages: credits.accounts.map((p) => ({ name: p.packageName, remaining: p.remain, total: p.size, expiresAt: p.endTimeMs, unlimited: !!p.unlimited })),
        fetchedAt: Date.now()
      };
    };
    chat = async (input, signal) => client.chatStream(await credential(), prepareChatBody(JSON.stringify(input)), signal);
    if (account.provider === "workbuddy") checkin = createWorkBuddyCheckin(() => store.resolve());
  } else if (account.provider.startsWith("trae")) {
    const snapshot = await jsonCredential(account.credentialFile);
    const saved = snapshot.credential;
    if (snapshot.version !== 1 || !saved?.accessToken || !["cn", "sg", "solo", "solo-sg"].includes(saved.edition)) throw new RouteError(401, "invalid_trae_credential");
    const identity = async () => {
      if (!account.identityFile) throw new RouteError(401, "trae_identity_required");
      const value = await jsonCredential(account.identityFile);
      if (!value.machineId || !value.deviceId || value.edition !== saved.edition) throw new RouteError(401, "invalid_trae_identity");
      return value;
    };
    const store = new TraeCredentialStore({
      ownPath: account.credentialFile,
      storagePath: `${account.credentialFile}.no-desktop`,
      legacyOwnPath: `${account.credentialFile}.no-legacy`,
      accountId: traeAccountId(saved),
      region: account.provider === "trae" ? "cn" : "ai",
      refresh: async (c) => refreshTraeCredential(c, void 0, await identity())
    });
    const credential = async () => {
      try {
        return await store.resolve();
      } catch {
        throw new RouteError(401, "credential_refresh_failed");
      }
    };
    const usage = new TraeUsageClient({ credential, deviceId: async () => (await identity()).deviceId });
    if (account.provider === "trae") {
      const checkinCredential = () => store.resolve();
      const checkinUsage = new TraeUsageClient({
        credential: checkinCredential,
        deviceId: async () => (await identity()).deviceId,
        fetchImpl: async (url, options) => {
          const response = await fetch(url, options);
          if (!response.ok) throw Object.assign(Error("checkin_http_error"), { status: response.status });
          if (String(url).endsWith("/status")) {
            const body = await response.clone().json();
            if (body.code !== void 0 && body.code !== 0 || typeof body.checked_in !== "boolean" || typeof body.did_checked_in !== "boolean") throw Object.assign(Error("checkin_status_rejected"), { status: 403 });
          }
          if (String(url).endsWith("/claim") && !Number.isFinite((await response.clone().json()).code)) throw Error("checkin_claim_invalid");
          return response;
        }
      });
      checkin = {
        identity: async () => ({ account: (await checkinCredential()).userId, device: (await identity()).deviceId }),
        claim: (signal) => claimTraeCheckin(checkinUsage, signal)
      };
    }
    accountInfo = async (signal) => {
      const c = await credential();
      const login = {
        state: "valid",
        identity: c.userId,
        name: c.accountName || c.userId,
        expiresAt: c.expiresAtMs,
        refreshExpiresAt: c.refreshExpiresAtMs,
        refreshable: !!c.refreshToken,
        kind: "\u5BA2\u6237\u7AEF\u767B\u5F55\u6001",
        edition: c.edition
      };
      if (account.provider === "trae-global") {
        const plan = await usage.payStatus(signal);
        return { login, plan: plan.payIdentityStr || "\u672A\u8FD4\u56DE\u5957\u9910\u540D\u79F0", unit: "subscription", remaining: null, packages: [], fetchedAt: Date.now() };
      }
      const result = await usage.snapshot(signal), packs = result.packs;
      return {
        login,
        unit: result.isCreditsBilling ? "credits" : "billing",
        remaining: result.isCreditsBilling ? Math.max(0, result.summary.totalAmount - result.summary.consumedAmount) : null,
        total: result.summary.totalAmount,
        used: result.summary.consumedAmount,
        cycle: packs.map((p) => `${p.entitlementId}:${p.endTimeMs}`).sort().join("|"),
        packages: packs.map((p) => ({ name: p.displayDesc, total: p.creditsLimit, remaining: typeof p.creditsLimit === "number" && typeof p.consumedCredits === "number" ? Math.max(0, p.creditsLimit - p.consumedCredits) : null, expiresAt: p.endTimeMs })),
        fetchedAt: Date.now()
      };
    };
    const solo = new TraeSoloUpstreamClient({ credential, identity });
    const remote = new TraeSoloRemoteCatalogClient({ credential });
    let rows = [];
    discover = async (signal) => {
      const [skeleton, wire] = await Promise.all([remote.fetchModels(signal), solo.fetchModels(signal)]);
      rows = mergeTraeModelSources(skeleton, wire);
      return rows;
    };
    const bridge = new TraeSoloBridge(solo, { current: () => rows });
    chat = (input, signal) => bridge.chatStream(JSON.stringify(input), signal);
  } else {
    const region = account.provider === "qoder" ? "china" : "global";
    const getPat = async () => {
      const value = await jsonCredential(account.credentialFile);
      if (value.version !== 2 || value.region !== region || typeof value.pat !== "string" || !value.pat.trim()) throw new RouteError(401, "invalid_qoder_credential");
      return value.pat;
    };
    const transport = createQoderTransport({
      region,
      resolvePat: getPat,
      // Reuse the official CLI identity (or one persisted plugin seed) for this physical device.
      resolveMachineId: () => getMachineId(),
      ...attachments ? { attachments } : {}
    });
    const client = new QoderUpstreamClient({
      region,
      providerId: account.provider,
      getPat,
      transport,
      ...attachments ? { attachments } : {}
    });
    checkin = createQoderCheckin(region, getPat);
    accountInfo = async (signal) => {
      const result = await transport.readAccount({ force: true, signal });
      const buckets = [["\u4E2A\u4EBA\u5957\u9910", result.usage?.userQuota], ["\u9644\u52A0\u989D\u5EA6", result.usage?.addOnQuota], ["\u7EC4\u7EC7\u989D\u5EA6", result.usage?.orgResourcePackage]].filter(([, p]) => p).map(([name, p]) => ({ ...p, name }));
      const creditBuckets = buckets.filter((p) => /credit|point|积分/i.test(p.unit));
      return {
        login: { state: "valid", identity: result.profile.id, name: result.profile.name || result.profile.email || result.profile.id, kind: "PAT", refreshable: false },
        plan: result.plan?.planTierName,
        remaining: creditBuckets.length ? creditBuckets.reduce((n, p) => n + p.remaining, 0) : null,
        unit: creditBuckets.length ? "credits" : "unknown",
        cycle: result.usage?.expiresAt || result.plan?.endDate || "",
        packages: buckets.map((p) => ({ name: p.name, total: p.total, remaining: p.remaining, unit: p.unit, expiresAt: expiryMs(result.usage?.expiresAt || result.plan?.endDate) })),
        fetchedAt: Date.now()
      };
    };
    discover = (signal) => client.fetchModels(signal);
    chat = (input, signal, options) => new QoderUpstreamClient({
      region,
      providerId: account.provider,
      getPat,
      transport,
      ...attachments ? { attachments } : {},
      catalogProvider: (id) => qoderContextModel(client.catalogModelFor(id), options?.contextWindow)
    }).chatStream(JSON.stringify(input), signal);
  }
  return {
    models: cachedModels(discover, config.catalogTtlMs),
    accountInfo,
    checkin,
    async chat(input, signal, options) {
      const result = await chat(input, signal, options);
      return result.ok ? preflightStream(result.response, signal) : result;
    }
  };
}
async function claimTraeCheckin(usage, signal) {
  let submitted = false;
  try {
    const status = await usage.checkinStatus(signal);
    if (status.checkedIn) return { status: "already-claimed" };
    if (status.didCheckedIn) return { status: "device-used" };
    if (!status.enabled) return { status: "no-campaign" };
    submitted = true;
    const claim = await usage.claimCheckin(signal);
    if (claim.code === 9095) return { status: "device-used" };
    if (!claim.claimed) return { status: "paused" };
    return { status: "claimed", ...Number.isFinite(status.credits) ? { amount: status.credits + (status.extraCredits || 0) } : {} };
  } catch (e) {
    return checkinFailure(e, submitted);
  }
}
function createQoderCheckin(region, getPat, { fetchImpl = (...args) => fetch(...args), now = Date.now } = {}) {
  const guardedFetch = async (url, options) => {
    try {
      const response = await fetchImpl(url, options);
      if (!response.ok) throw new QoderLlmError("checkin_http_error", "PROVIDER_ERROR", { status: response.status });
      if (String(url).endsWith("/campaigns") && !Array.isArray((await response.clone().json()).campaigns)) throw Error("checkin_campaigns_invalid");
      return response;
    } catch (error) {
      if (error instanceof QoderLlmError) throw error;
      throw new QoderLlmError("checkin_network_error", "PROVIDER_ERROR");
    }
  };
  const auth = new QoderAuthService({ region, fetch: guardedFetch, resolveMachineId: () => getMachineId() });
  const campaigns = new QoderCheckInService({ region, authService: auth, fetch: guardedFetch });
  const credentials = async (signal) => auth.getCredentials(await getPat(), signal);
  return {
    identity: async (signal) => ({ account: (await credentials(signal)).userID }),
    claim: async (signal) => {
      let submitted = false;
      try {
        const token = (await credentials(signal)).authToken;
        const rows = await campaigns.fetchCampaigns(token, signal), time = now();
        const benefits = rows.filter((c) => c.actionType === "CLAIM_BENEFIT");
        const active = benefits.filter((c) => (!Number.isFinite(c.startAt) || c.startAt * 1e3 <= time) && (!Number.isFinite(c.endAt) || c.endAt * 1e3 > time));
        const target = active.find((c) => c.claimStatus === "CLAIMABLE" && typeof c.campaignId === "string" && c.campaignId);
        if (!target) {
          if (active.some((c) => c.claimStatus === "CLAIMED")) return { status: "already-claimed" };
          return { status: benefits.some((c) => c.startAt * 1e3 > time || c.endAt * 1e3 <= time) ? "before-window" : "no-campaign" };
        }
        submitted = true;
        const result = await campaigns.claimCampaign(token, target.campaignId, signal);
        if (result.status !== "CLAIMED") return { status: "paused" };
        return {
          status: result.replayed ? "already-claimed" : "claimed",
          ...Number.isFinite(result.benefit?.amount) && result.benefit.amount >= 0 ? { amount: result.benefit.amount } : {}
        };
      } catch (error) {
        return checkinFailure(error, submitted);
      }
    }
  };
}
function workbuddyToken(token) {
  try {
    const [head, body, signature, extra] = token.split(".");
    const header = JSON.parse(Buffer.from(head, "base64url")), payload = JSON.parse(Buffer.from(body, "base64url"));
    if (extra || !signature || header.alg !== "RS256" || !["https://www.codebuddy.cn/auth/realms/copilot", "https://www.workbuddy.cn/auth/realms/copilot"].includes(payload.iss) || typeof payload.sub !== "string" || !payload.sub) throw Error();
    return payload;
  } catch {
    throw Object.assign(Error("HTTP 401 invalid_workbuddy_cn_token"), { status: 401 });
  }
}
async function workbuddyPost(url, headers, signal, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(url, { method: "POST", headers: { "Content-Type": "application/json", "Accept-Encoding": "identity", ...headers }, body: "{}", signal, redirect: "error" });
  } catch {
    throw Object.assign(Error("workbuddy_checkin_network"), { transient: !signal?.aborted });
  }
  if (!response.ok) throw Object.assign(Error(`HTTP ${response.status} workbuddy_checkin_http`), { status: response.status, transient: response.status >= 500 });
  const body = JSON.parse(await readLimitedText(response, 256 * 1024, "Check-in"));
  if (body?.code === 401 || body?.code === 40100) throw Object.assign(Error("HTTP 401 workbuddy_checkin_auth"), { status: 401 });
  if ([403, 429].includes(body?.code)) throw Object.assign(Error(`HTTP ${body.code} workbuddy_checkin_restricted`), { status: body.code });
  return body;
}
async function refreshWorkBuddyCheckinCredential(credential, { fetchImpl = (...args) => fetch(...args), signal = AbortSignal.timeout(3e4) } = {}) {
  const body = await workbuddyPost("https://copilot.tencent.com/v2/plugin/auth/token/refresh", {
    "X-Refresh-Token": credential.refreshToken,
    "X-Auth-Refresh-Source": "plugin"
  }, signal, fetchImpl);
  if (body.code !== 0 || typeof body.data?.accessToken !== "string") throw Error("workbuddy_refresh_rejected");
  const token = workbuddyToken(body.data.accessToken);
  if (token.sub !== credential.uid || !(token.exp * 1e3 > Date.now())) throw Object.assign(Error("HTTP 401 workbuddy_refresh_identity"), { status: 401 });
  return {
    accessToken: body.data.accessToken,
    expiresInSec: (token.exp * 1e3 - Date.now()) / 1e3,
    ...typeof body.data.refreshToken === "string" && body.data.refreshToken ? { refreshToken: body.data.refreshToken } : {}
  };
}
function createWorkBuddyCheckin(credential, { fetchImpl = (...args) => fetch(...args), sleep = delay2, now = Date.now } = {}) {
  const login = async () => {
    const c = await credential(), token = workbuddyToken(c.accessToken);
    if (c.uid !== token.sub) throw Object.assign(Error("workbuddy_uid_mismatch"), { status: 401 });
    return { ...c, uid: token.sub };
  };
  const post = (path, c, signal) => workbuddyPost(`https://www.workbuddy.cn/v2/billing/meter/${path}`, {
    Authorization: `Bearer ${c.accessToken}`,
    "X-User-Id": c.uid,
    Origin: "https://www.workbuddy.cn",
    Referer: "https://www.workbuddy.cn/profile/growth-center",
    "User-Agent": "Mozilla/5.0"
  }, signal, fetchImpl);
  const activity = (data) => {
    const rawEnd = data.end_time;
    const endsAt = typeof rawEnd === "string" ? Date.parse(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(rawEnd) ? `${rawEnd.replace(" ", "T")}+08:00` : rawEnd) : void 0;
    return { streakDays: data.streak_days, totalCredits: data.total_credits, nextStreakDay: data.next_streak_day, endsAt };
  };
  return {
    identity: async () => ({ account: (await login()).uid }),
    validate: async (signal) => {
      const state = await post("checkin-activity-status", await login(), signal);
      if (![0, 200].includes(state?.code) || !state.data || typeof state.data.today_checked_in !== "boolean") throw Error("workbuddy_status_invalid");
      return { valid: true };
    },
    claim: async (signal) => {
      let submitted = false;
      try {
        const c = await login();
        let state;
        for (let attempt = 0; ; attempt++) {
          try {
            state = await post("checkin-activity-status", c, signal);
            break;
          } catch (error) {
            if (!error.transient || attempt >= 2 || signal?.aborted) throw error;
            await sleep((attempt + 1) * 2e3, void 0, { signal });
          }
        }
        if (![0, 200].includes(state?.code) || !state.data || typeof state.data !== "object") throw Error("workbuddy_status_invalid");
        const stats = activity(state.data);
        if (state.data.today_checked_in === true) return { status: "already-claimed", activity: stats };
        if (state.data.active === false || stats.endsAt <= now()) return { status: "no-campaign", activity: stats };
        if (state.data.today_checked_in !== false) throw Error("workbuddy_status_unknown");
        submitted = true;
        const result = await post("daily-checkin", c, signal);
        const claimed = [0, 200].includes(result?.code), already = /今天已签到|今日已签到|already\s+(?:checked|signed)/i.test(result?.msg || "");
        if (!claimed && !already) return { status: Number.isFinite(result?.code) ? "paused" : "uncertain" };
        let updated = stats, paused = false;
        try {
          const after = await post("checkin-activity-status", c, signal);
          if ([0, 200].includes(after?.code) && after.data) updated = activity(after.data);
        } catch (error) {
          paused = checkinFailure(error).status === "paused";
        }
        return {
          status: already ? "already-claimed" : "claimed",
          activity: updated,
          ...paused ? { paused: true } : {},
          ...claimed && Number.isFinite(result.data?.credit) && result.data.credit >= 0 ? { amount: result.data.credit } : {}
        };
      } catch (error) {
        return checkinFailure(error, submitted);
      }
    }
  };
}

export {
  qoderPluginDataDir,
  readLimitedText,
  supportsCheckin,
  Checkins,
  jsonCredential,
  cachedModels,
  createAccountClient,
  claimTraeCheckin,
  createQoderCheckin,
  workbuddyToken,
  refreshWorkBuddyCheckinCredential,
  createWorkBuddyCheckin
};
//# sourceMappingURL=chunk-2LH6TD2U.js.map
