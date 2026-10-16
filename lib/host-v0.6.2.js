import {
  createShim
} from "./chunk-3O3L3526.js";
import {
  MANAGEMENT_PATH,
  Manager,
  PluginReload,
  SUMMARY_PATH,
  managementHandler,
  version
} from "./chunk-4EO5V6FW.js";
import {
  createAccountClient
} from "./chunk-74WQLVJO.js";
import "./chunk-KGVTRS5K.js";
import "./chunk-OK2T2UAZ.js";
import {
  normalizeCredits
} from "./chunk-TEZ2FMEO.js";
import "./chunk-S5KMFAQM.js";
import "./chunk-Q34JSMGN.js";
import "./chunk-4V52V5GO.js";
import "./chunk-DNQPZMPF.js";
import {
  Router,
  SessionMetrics,
  abortable
} from "./chunk-5KYJADJ4.js";
import {
  PROVIDERS,
  PROVIDER_NAMES,
  ensureConfig
} from "./chunk-5R3IOPSF.js";

// src/index.mjs
import z from "@deepseek-ai/schemastery";
import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";
import { resolveRetryPolicy as resolveRetryPolicy2, resolveImageAttachmentAccess } from "@deepseek-ai/dsh-llm";
import { join, resolve } from "node:path";

// upstream/workbuddy/src/adapter.ts
import { createProvider } from "@earendil-works/pi-ai";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";
import { resolveRetryPolicy } from "@deepseek-ai/dsh-llm";
import { PiAiAdapter } from "@deepseek-ai/dsh-llm-pi-ai";
var WORKBUDDY_PROVIDER = "workbuddy";
var WORKBUDDY_STREAM_IDLE_TIMEOUT_MS = 3e5;
var REQUEST_IMAGE_BUDGETS = {
  maxRequestImageBytes: 20971520,
  requestImagePixelBudget: 4194304,
  requestImageMaxBytes: 1048576
};
var INERT_AUTH = {
  credentials: {
    async read() {
      return void 0;
    },
    async list() {
      return [];
    },
    async modify() {
      throw new Error("dsh-workbuddy-connect: the workbuddy route has no pi-ai credential lifecycle");
    },
    async delete() {
    }
  },
  authContext: {
    async env() {
      return void 0;
    },
    async fileExists() {
      return false;
    }
  }
};
var NO_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
function withLegacyImageBudget(store) {
  return new Proxy(store, {
    get(target, property, receiver) {
      if (property === "imageHostPath") {
        return target.imageHostPath.bind(target);
      }
      if (property !== "readImageRequest") return Reflect.get(target, property, receiver);
      return (...args) => {
        const [ref, policy, signal] = args;
        const present = policy?.maxPixels;
        const withPixels = Number.isSafeInteger(present) && present > 0 ? policy : { ...policy, maxPixels: REQUEST_IMAGE_BUDGETS.requestImagePixelBudget };
        return target.readImageRequest(ref, withPixels, signal);
      };
    }
  });
}
var RATE_SEPARATOR = " \xB7 ";
function displaySuffix(info) {
  const parts = [
    normalizeCredits(info.billing?.credits),
    ...info.billing?.badges ?? []
  ].filter((part) => part !== void 0 && part !== "");
  return parts.length === 0 ? void 0 : parts.join(" \xB7 ");
}
function withCatalogDisplay(name2, info) {
  const suffix = displaySuffix(info);
  return suffix === void 0 ? name2 : `${name2}${RATE_SEPARATOR}${suffix}`;
}
function reasoningFields(info, observed, region = "cn") {
  const reasoning = info.reasoning;
  if (reasoning === void 0 || reasoning.supports !== true) {
    return { reasoning: false };
  }
  const declared = reasoning.supportedEfforts;
  const efforts = declared !== void 0 && declared.length > 0 ? declared : observed?.validation === "validating" && observed.efforts.length > 0 ? observed.efforts : void 0;
  if (efforts === void 0) {
    return { reasoning: false };
  }
  const map = {
    // Probing never grants `off`; only an explicit declaration does.
    //
    // On CN, `onlyReasoning` vetoes it even when declared (#87). That catalog
    // ships both flags true on `deepseek-v4.1-flash` and `kimi-k2.8-preview`,
    // which cannot both hold — a model that only ever reasons has no
    // non-thinking mode to select — and the endpoint sides with
    // `onlyReasoning`, answering HTTP 400 (「模型不支持该思考强度」) for every
    // `off` request. Offering a level that is certain to fail is worse than not
    // offering it, so the contradiction is resolved toward the flag the wire
    // agrees with.
    //
    // Scoped to CN on purpose: the international catalog does not carry this
    // contradiction, and hiding Off there would remove a level those models
    // can still use. The request layer strips the spelling in both regions
    // (`dropUnsupportedEffort`), so a model whose flags flip between catalog
    // reads cannot put `off` on the wire either way.
    off: reasoning.canDisableThinking === true && (region !== "cn" || reasoning.onlyReasoning !== true) && declared !== void 0 && declared.length > 0 ? "off" : null,
    // `minimal` is not in the upstream effort vocabulary (EFFORT_VALUES), so
    // no declared set — and no probe candidate — can ever contain it.
    minimal: null,
    low: efforts.includes("low") ? "low" : null,
    medium: efforts.includes("medium") ? "medium" : null,
    high: efforts.includes("high") ? "high" : null,
    xhigh: efforts.includes("xhigh") ? "xhigh" : null,
    max: efforts.includes("max") ? "max" : null
  };
  return { reasoning: true, thinkingLevelMap: map };
}
function toPiModel(info, baseUrl, observed, providerId, region) {
  return {
    id: info.id,
    name: info.name,
    api: "openai-completions",
    provider: providerId,
    baseUrl,
    input: info.supportsImages === true ? ["text", "image"] : ["text"],
    ...reasoningFields(info, observed, region),
    cost: NO_COST,
    contextWindow: info.contextWindow,
    maxTokens: info.maxTokens,
    // pi-ai cannot infer WorkBuddy's field spelling from the shim's random
    // loopback URL, so name the upstream-required field explicitly.
    compat: { maxTokensField: "max_tokens" }
  };
}
function createWorkBuddyAdapter(options) {
  const { shim, store, catalog, resolveAttachments, resolveImageAccess, observe, hidden } = options;
  const providerId = options.providerId ?? WORKBUDDY_PROVIDER;
  const displayName = options.displayName ?? "WorkBuddy";
  const region = options.region ?? "cn";
  const buildModels = () => {
    const baseUrl = `${shim.baseUrl()}/v1`;
    return catalog.current().map((info) => toPiModel(info, baseUrl, observe?.(info.id), providerId, region));
  };
  const base = createProvider({
    id: providerId,
    name: displayName,
    auth: {
      apiKey: {
        name: "WorkBuddy OAuth bearer token",
        async resolve({ credential }) {
          const apiKey = credential?.key;
          return apiKey === void 0 || apiKey.length === 0 ? void 0 : { auth: { apiKey }, source: "WorkBuddy" };
        }
      }
    },
    models: buildModels(),
    api: openAICompletionsApi()
  });
  const provider = { ...base, getModels: () => buildModels() };
  const profile = {
    provider: providerId,
    displayName,
    streamIdleTimeoutMs: WORKBUDDY_STREAM_IDLE_TIMEOUT_MS,
    retryPolicy: resolveRetryPolicy(void 0, "dsh-workbuddy-connect retryPolicy"),
    configuredMaxTokens: /* @__PURE__ */ new Map(),
    // Required since 0.1.5-alpha.2; the live catalog only exposes models that
    // probed successfully, so there is never a per-model failure to report.
    modelErrors: /* @__PURE__ */ new Map(),
    ...REQUEST_IMAGE_BUDGETS,
    piProvider: provider
  };
  let profiles = /* @__PURE__ */ new Map([[providerId, profile]]);
  const adapter = new WorkBuddyPiAiAdapter(catalog, hidden ?? (() => []), {
    profiles: () => profiles,
    auth: INERT_AUTH,
    // Resolve the shim's per-process shared secret as the OpenAI apiKey so
    // pi-ai sends it as `Authorization: Bearer <shared-secret>`. The shim
    // validates this before forwarding and resolves the real WorkBuddy token
    // itself via the store, so the secret never reaches upstream.
    resolveApiKey: async () => shim.token(),
    // Every store the adapter hands to pi-ai passes the legacy-budget wrapper:
    // see withLegacyImageBudget — the mismatch it heals depends on which host
    // generation owns the attachment service, not on anything observable here.
    ...resolveAttachments === void 0 ? {} : {
      resolveAttachments: () => {
        const store2 = resolveAttachments();
        return store2 === void 0 ? void 0 : withLegacyImageBudget(store2);
      }
    },
    ...resolveImageAccess === void 0 ? {} : { resolveImageAccess }
  });
  return {
    adapter,
    invalidate: () => {
      profiles = /* @__PURE__ */ new Map([[providerId, profile]]);
    }
  };
}
var WorkBuddyPiAiAdapter = class extends PiAiAdapter {
  constructor(catalog, hidden, options) {
    super(options);
    this.catalog = catalog;
    this.hidden = hidden;
  }
  /** Catalog entry for one model id, or undefined when the catalog omits it. */
  infoFor(model) {
    return this.catalog.current().find((entry) => entry.id === model);
  }
  async listModels(provider) {
    const models = await super.listModels(provider);
    const hidden = new Set(this.hidden());
    return models.flatMap((model) => {
      if (hidden.has(model.id)) return [];
      const info = this.infoFor(model.id);
      if (info === void 0) return [model];
      return [{ ...model, name: withCatalogDisplay(model.name, info) }];
    });
  }
  async resolveModel(provider, model, signal) {
    const resolved = await super.resolveModel(provider, model, signal);
    const info = this.infoFor(model);
    if (info === void 0) return resolved;
    return { ...resolved, name: withCatalogDisplay(resolved.name, info) };
  }
};

// src/index.mjs
var name = "dsh-multi-router";
var inject = ["llm"];
var defaultConfigFile = () => join(resolveDshHome(), "multi-router", "router.json");
var Config = z.object({ configFile: z.string().description("Absolute path to multi-account router.json") });
async function apply(ctx, options = {}) {
  let disposed = false, manager, stopWatch, monitorTimer, startup;
  const releases = [], shims = [], wrappers = [];
  ctx.effect(() => () => {
    disposed = true;
    stopWatch?.();
    clearInterval(monitorTimer);
    manager?.runtime?.stop();
    if (manager) manager.closed = true;
    manager?.plugins.abort.abort();
    manager?.checkins.abort.abort();
    manager?.workbuddyLogin.abort.abort();
    manager?.modelTestAbort?.abort();
    for (const release of releases) release();
    return Promise.all([manager?.api.close(), ...shims.map((shim) => shim.close()), ...manager?.refreshes.values() ?? [], ...manager?.monitorFlights.values() ?? [], startup, manager?.localScan, manager?.checkins.flight, manager?.plugins.flight, manager?.plugins.saveQueue.catch(() => {
    }), manager?.telemetry.queue.catch(() => {
    })]);
  });
  const file = resolve(options.configFile ?? process.env.DSH_MULTI_ROUTER_CONFIG ?? defaultConfigFile());
  try {
    const config = await ensureConfig(file);
    if (disposed) return;
    const router = new Router(
      config,
      (a) => createAccountClient(a, manager?.config ?? config, ctx.get("attachments")),
      (event) => ctx.logger.info("multi-router", JSON.stringify(event))
    );
    manager = new Manager(file, router, () => {
      for (const wrapper of wrappers) wrapper.invalidate();
      ctx.emit("llm/adapters-updated");
    }, { service: () => ctx.get("pluginManager"), profile: () => ctx.get("profileContext"), hmr: () => ctx.get("hmr") });
    await manager.load();
    if (disposed) return;
    manager.startup = { phase: "discovering" };
    manager.runtime = new PluginReload({
      runningVersion: version,
      service: () => ctx.get("pluginManager"),
      profile: () => ctx.get("profileContext"),
      canReload: () => !!ctx.get("hmr"),
      hmr: () => ctx.get("hmr"),
      busy: () => !!(manager.localScan || manager.requests || manager.api.controllers.size || manager.plugins.flight || manager.checkins.flight || manager.workbuddyLogin.flight || manager.workbuddyLogin.pending || manager.refreshes.size || manager.monitorFlights.size || shims.some((s) => s.active()))
    });
    ctx.inject?.(["webServer"], (webCtx) => {
      webCtx.effect(() => webCtx.webServer.register({ kind: "exact", path: SUMMARY_PATH, handler: managementHandler(manager, { summaryOnly: true }) }));
      webCtx.effect(() => webCtx.webServer.register({ kind: "exact", path: MANAGEMENT_PATH, handler: managementHandler(manager) }));
    });
    const metrics = new SessionMetrics(manager.telemetry);
    ctx.on("session/event", (session, event) => {
      try {
        return metrics.event(session, event)?.catch(() => ctx.logger.warn("multi-router: performance persistence failed"));
      } catch {
        ctx.logger.warn("multi-router: performance event unavailable");
      }
    });
    ctx.on("session/disposed", (session) => metrics.dispose(session));
    for (const provider of ["multi-router", ...PROVIDERS]) {
      if (disposed) return;
      const isRouter = provider === "multi-router";
      const shim = createShim(router, { modelPrefix: isRouter ? "" : `${provider}::` });
      shims.push(shim);
      await shim.ready;
      if (disposed) {
        await shim.close();
        return;
      }
      const wrapper = createWorkBuddyAdapter({
        providerId: provider,
        displayName: isRouter ? "\u7EDF\u4E00\u8DEF\u7531" : `${PROVIDER_NAMES[provider]} \xB7 \u5185\u7F6E\u8D26\u53F7\u6C60`,
        shim,
        catalog: { current: () => isRouter ? manager.adapterModels() : manager.providerModels(provider) },
        hidden: () => isRouter ? manager.adapterModels().filter((r) => r.visible === false).map((r) => r.id) : manager.hiddenModels(provider),
        region: provider.endsWith("global") || provider === "workbuddy-ai" ? "global" : "cn",
        resolveAttachments: () => ctx.get("attachments"),
        resolveImageAccess: (attachments, ref) => resolveImageAttachmentAccess(
          attachments,
          (path) => ctx.get("fs")?.processPathFromHostPath(path),
          ref
        )
      });
      if (!isRouter) {
        for (const method of ["listModels", "resolveModel", "prepareCall"]) {
          const original = wrapper.adapter[method].bind(wrapper.adapter);
          wrapper.adapter[method] = async (...args) => {
            await abortable(manager.ensureCatalog(provider), args[2]);
            return original(...args);
          };
        }
      }
      const streamWithSnapshot = wrapper.adapter.streamWithSnapshot.bind(wrapper.adapter);
      wrapper.adapter.streamWithSnapshot = (options2, snapshot) => {
        const call = metrics.beginCall(options2.sessionId, options2.purpose);
        const route = router.config.routes[(isRouter ? "" : `${provider}::`) + options2.model];
        const effort = options2.reasoningEffort ?? route?.reasoningEffort;
        const profiles = new Map(snapshot.profiles), profile = profiles.get(options2.provider);
        if (!profile) return streamWithSnapshot(options2, snapshot);
        profiles.set(options2.provider, { ...profile, headers: { ...profile.headers, "X-Multi-Router-Reasoning": effort ?? "default", "X-Multi-Router-Call": call.callId, ...call.session ? { "X-Multi-Router-Session": call.session } : {} } });
        return streamWithSnapshot({ ...options2, ...effort ? { reasoningEffort: effort } : {} }, { ...snapshot, profiles });
      };
      const withDefault = (model) => {
        const effort = router.config.routes[(isRouter ? "" : `${provider}::`) + model.id]?.reasoningEffort;
        return effort && model.reasoning ? { ...model, reasoning: { ...model.reasoning, defaultEffort: effort } } : model;
      };
      const resolveModel = wrapper.adapter.resolveModel.bind(wrapper.adapter), prepareCall = wrapper.adapter.prepareCall.bind(wrapper.adapter);
      wrapper.adapter.resolveModel = async (...args) => withDefault(await resolveModel(...args));
      wrapper.adapter.prepareCall = async (...args) => {
        const prepared = await prepareCall(...args);
        return { ...prepared, model: withDefault(prepared.model) };
      };
      wrapper.adapter.providerRetryPolicy = () => resolveRetryPolicy2({ mode: "normal", maxRetries: 0 }, provider);
      wrappers.push(wrapper);
      releases.push(ctx.llm.registerAdapter([provider], wrapper.adapter));
    }
    stopWatch = manager.watch(() => ctx.logger.warn("multi-router: invalid config change; keeping last valid configuration"));
    await manager.api.reconcile();
    startup = (async () => {
      await manager.syncLocalAccounts().catch(() => ctx.logger.warn("multi-router: local login discovery failed; manual import remains available"));
      if (disposed) return;
      await manager.finishInitialSetup().catch(() => ctx.logger.warn("multi-router: first-install guidance could not be saved"));
      if (disposed) return;
      manager.startup = { phase: "ready" };
      manager.checkins.tick();
      void manager.checkFreeModels().catch(() => ctx.logger.warn("multi-router: free catalog persistence failed"));
      void manager.monitorAll().catch(() => ctx.logger.warn("multi-router: usage persistence failed"));
    })();
    void manager.plugins.tick().catch(() => ctx.logger.warn("multi-router: automatic update check unavailable"));
    manager.runtime.start();
    ctx.on("plugin-manager/changed", () => manager.runtime.schedule());
    monitorTimer = setInterval(() => {
      void manager.syncLocalAccounts().then(() => {
        if (!disposed) return manager.monitorAll();
      }).catch(() => ctx.logger.warn("multi-router: local login discovery or usage persistence failed"));
      manager.checkins.tick();
      void manager.plugins.tick().catch(() => ctx.logger.warn("multi-router: automatic update check unavailable"));
      void manager.checkFreeModels().catch(() => ctx.logger.warn("multi-router: free catalog persistence failed"));
      void manager.runtime.check().catch(() => {
      });
    }, 6e4);
    monitorTimer.unref();
    ctx.emit("llm/adapters-updated");
  } catch (error) {
    clearInterval(monitorTimer);
    stopWatch?.();
    manager?.runtime?.stop();
    for (const release of releases) release();
    await Promise.all([manager?.api.close(), ...shims.map((shim) => shim.close())]);
    ctx.logger.error("multi-router: initialization failed", error.code ?? error.message);
    throw error;
  }
}
export {
  Config,
  apply,
  defaultConfigFile,
  inject,
  name
};
//# sourceMappingURL=index.js.map
