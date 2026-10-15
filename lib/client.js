window.__ModuleLoader__.load({ id: "dsh-multi-router", factory: (require) => { var module = { exports: {} };
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.jsx
var client_exports = {};
__export(client_exports, {
  CheckinPanel: () => CheckinPanel,
  InitialSetup: () => InitialSetup,
  PluginUpdatesPanel: () => PluginUpdatesPanel,
  RestartGuidance: () => RestartGuidance,
  RouterPage: () => RouterPage,
  apply: () => apply,
  backendNeedsRestart: () => backendNeedsRestart,
  inject: () => inject,
  name: () => name,
  readManagementResponse: () => readManagementResponse
});
module.exports = __toCommonJS(client_exports);
var import_react = require("react");

// package.json
var version = "0.5.2";

// src/client.jsx
var import_jsx_runtime = require("react/jsx-runtime");
var name = "dsh-multi-router-client";
var inject = ["slots"];
var ENDPOINT = "/.well-known/dsh-multi-router";
var backendNeedsRestart = (data) => !!data && data.pluginVersion !== version;
function RestartGuidance({ data, retry }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", role: "alert", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u9700\u8981\u91CD\u65B0\u542F\u52A8 DeepSeek Harness" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: data ? `\u9762\u677F\u7248\u672C ${version}\uFF0C\u540E\u53F0\u7248\u672C ${data.pluginVersion || "\u65E7\u7248"}\u3002\u66F4\u65B0\u540E\u7684\u540E\u53F0\u5C1A\u672A\u91CD\u65B0\u52A0\u8F7D\u3002` : "\u63D2\u4EF6\u540E\u53F0\u5C1A\u672A\u542F\u52A8\u3002\u82E5\u521A\u5B89\u88C5\u6216\u66F4\u65B0\u63D2\u4EF6\uFF0C\u8BF7\u5B8C\u6210\u4E0B\u9762\u7684\u91CD\u542F\u6B65\u9AA4\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
      "macOS\uFF1A\u9876\u90E8\u83DC\u5355\u300CDeepSeek Harness \u2192 \u9000\u51FA DeepSeek Harness\u300D\uFF08\u2318Q\uFF09\uFF0C\u518D\u91CD\u65B0\u6253\u5F00\u5E94\u7528\u3002",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
      "Windows\uFF1A\u9000\u51FA\u6258\u76D8\u4E2D\u7684 DeepSeek Harness\uFF0C\u518D\u91CD\u65B0\u6253\u5F00\u3002",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
      "\u7F51\u9875\u7248\uFF1A\u91CD\u542F\u8FD0\u884C DSH \u7684\u670D\u52A1\u8FDB\u7A0B\u3002"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u5173\u95ED\u7A97\u53E3\u6216\u5237\u65B0\u9762\u677F\u4E0D\u4F1A\u91CD\u65B0\u52A0\u8F7D\u540E\u53F0\u3002\u91CD\u542F\u540E\u4F1A\u4FDD\u7559\u8D26\u53F7\u3001\u8DEF\u7531\u548C\u7528\u91CF\uFF1B\u5982\u4ECD\u63D0\u793A\u5F02\u5E38\uFF0C\u8BF7\u67E5\u770B\u4E0B\u65B9\u7EC4\u4EF6\u7684\u542F\u7528\u9519\u8BEF\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: retry, children: "\u6211\u5DF2\u91CD\u542F\uFF0C\u91CD\u65B0\u68C0\u67E5" }) })
  ] });
}
async function readManagementResponse(res) {
  let next;
  try {
    next = JSON.parse(await res.text());
  } catch {
    throw Error(`\u63D2\u4EF6\u540E\u53F0\u672A\u5C31\u7EEA\uFF08HTTP ${res.status}\uFF09\u3002\u8BF7\u68C0\u67E5\u63D2\u4EF6\u7EC4\u4EF6\u7684\u542F\u7528\u9519\u8BEF\uFF0C\u66F4\u65B0\u63D2\u4EF6\u540E\u5B8C\u5168\u9000\u51FA\u5E76\u91CD\u542F DSH\u3002`);
  }
  if (!next || typeof next !== "object" || Array.isArray(next)) throw Error("\u63D2\u4EF6\u540E\u53F0\u8FD4\u56DE\u4E86\u65E0\u6548\u6570\u636E\uFF0C\u8BF7\u5237\u65B0\u9762\u677F\u6216\u91CD\u542F DSH\u3002");
  if (!res.ok) throw Error(next.error || `\u64CD\u4F5C\u5931\u8D25\uFF08HTTP ${res.status}\uFF09`);
  return next;
}
var fmt = (n) => typeof n === "number" ? new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(n) : "\u2014";
var when = (n) => n ? new Date(n).toLocaleString("zh-CN", { hour12: false }) : "\u5C1A\u672A\u83B7\u53D6";
var strategies = { failover: "\u6545\u969C\u5207\u6362", weighted: "\u6309\u6743\u91CD\u5206\u914D", tokens: "\u6309 Token \u989D\u5EA6\u8F6E\u6362", credits: "\u6309\u79EF\u5206\u6D88\u8017\u8F6E\u6362" };
var loginNames = { valid: "\u767B\u5F55\u6709\u6548", configured: "\u5DF2\u4FDD\u5B58 PAT", "refresh-needed": "\u7B49\u5F85\u5237\u65B0", expired: "\u767B\u5F55\u5DF2\u8FC7\u671F", missing: "\u672A\u83B7\u53D6\u767B\u5F55\u4FE1\u606F" };
var effortNames = { off: "\u5173\u95ED\u601D\u8003 \xB7 Off", minimal: "\u6700\u4F4E \xB7 Minimal", low: "\u4F4E \xB7 Low", medium: "\u4E2D \xB7 Medium", high: "\u9AD8 \xB7 High", xhigh: "\u8D85\u9AD8 \xB7 XHigh", max: "\u6700\u9AD8 \xB7 Max" };
function downloadJson(exported) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(exported.document, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = exported.filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1e4);
}
var styles = `
.mr{--mr-accent:var(--dsw-alias-state-active-primary,#3a71db);--mr-border:var(--dsw-alias-border-l2,#444);--mr-bg:var(--dsw-alias-bg-layer-1,#202020);--mr-card:var(--dsw-alias-bg-module-platform,#282828);--mr-text:var(--dsw-alias-label-primary,#f4f4f4);--mr-muted:var(--dsw-alias-label-secondary,#b0b0b0);color:var(--mr-text);font:inherit;font-size:14px;line-height:1.6;max-width:1120px}
.mr *{box-sizing:border-box}.mr h2,.mr h3,.mr p{margin:0}.mr h2{font-size:22px}.mr h3{font-size:16px}.mr small,.mr .muted,.mr .notice{color:var(--mr-muted)}.mr .notice{font-size:13px}.mr .mono{font:12px ui-monospace,monospace;overflow-wrap:anywhere}
.mr .bar,.mr .row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.mr .bar{justify-content:space-between}.mr .stack{display:flex;flex-direction:column;gap:16px}.mr .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.mr .metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.mr .providers{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.mr .full{grid-column:1/-1}
.mr .box{border:1px solid var(--mr-border);border-radius:12px;padding:20px;background:var(--mr-card)}.mr .metric strong{font-size:26px;line-height:1.3;display:block;margin:8px 0}.mr .metric small{font-size:12px}.mr .item{padding:16px 0;border-top:1px solid var(--mr-border)}.mr .item:first-child{border-top:0}.mr .item:last-child{padding-bottom:0}.mr .badge{border:1px solid var(--mr-border);border-radius:6px;padding:3px 8px;font-size:12px;white-space:nowrap}.mr .empty{padding:24px 0;text-align:center;color:var(--mr-muted)}
.mr nav{display:flex;flex-wrap:wrap;gap:8px;border-bottom:1px solid var(--mr-border);padding:18px 0;margin-bottom:20px}.mr button,.mr input,.mr select,.mr textarea,.mr .link{font:inherit;color:inherit;border:1px solid var(--mr-border);border-radius:8px;background:var(--mr-bg);min-height:44px;padding:9px 12px}.mr button,.mr .link{cursor:pointer;transition:background .15s}.mr button:hover,.mr .link:hover{background:var(--mr-card)}.mr button:disabled{opacity:.45;cursor:default}.mr button.primary,.mr button[aria-pressed=true]{background:var(--mr-accent);color:#fff;border-color:transparent}.mr button.quiet{border-color:transparent;background:transparent}.mr :is(button,input,select,textarea,a):focus-visible{outline:2px solid var(--mr-accent);outline-offset:3px}.mr input:not([type=checkbox]),.mr select,.mr textarea{width:100%;min-width:0}.mr input[type=checkbox]{width:18px;height:18px;min-height:0;accent-color:var(--mr-accent)}.mr label{display:flex;flex-direction:column;gap:6px;font-size:13px}.mr label.check{flex-direction:row;align-items:center;gap:8px;min-height:44px}.mr .filter{min-width:170px;max-width:240px}.mr .feedback{padding:12px 16px;border-radius:8px;border:1px solid var(--mr-border)}.mr .error{color:var(--dsw-alias-state-error-primary,#ef9393)}.mr .good{color:var(--dsw-alias-state-success-primary,#77ca9d)}.mr .route-path{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.mr .route-path span{padding:4px 9px;border:1px solid var(--mr-border);border-radius:6px}.mr details{border-top:1px solid var(--mr-border);padding-top:14px}.mr summary{cursor:pointer;color:var(--mr-muted)}.mr progress{width:100%;height:7px;accent-color:var(--mr-accent)}.mr .trend{height:100px;display:flex;align-items:flex-end;gap:8px;margin:16px 0}.mr .trend>div{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:0}.mr .trend i{display:block;width:100%;min-height:3px;border-radius:4px 4px 0 0;background:var(--mr-accent)}.mr .trend small{font-size:11px;white-space:nowrap}.mr .table{width:100%;border-collapse:collapse;font-size:13px}.mr th,.mr td{text-align:left;border-bottom:1px solid var(--mr-border);padding:10px 8px}.mr th{font-weight:500;color:var(--mr-muted)}.mr .scroll{overflow:auto}.mr .steps{padding:14px 16px;border-left:3px solid var(--mr-accent);background:var(--mr-bg);border-radius:8px}.mr .link{text-decoration:none;display:inline-flex;align-items:center}
.mr dialog{color:var(--mr-text);background:var(--mr-bg);border:1px solid var(--mr-border);border-radius:16px;width:min(900px,calc(100vw - 32px));max-height:calc(100vh - 40px);padding:0;box-shadow:0 24px 80px #0008}.mr dialog::backdrop{background:#000a}.mr .modal-head,.mr .modal-foot{padding:18px 24px;background:var(--mr-bg);position:sticky;z-index:1}.mr .modal-head{top:0;border-bottom:1px solid var(--mr-border)}.mr .modal-foot{bottom:0;border-top:1px solid var(--mr-border)}.mr .modal-body{padding:24px}.mr .target-head strong{font-size:14px}.mr .subtle{background:var(--mr-bg)}
@media(max-width:850px){.mr .providers{grid-template-columns:1fr}.mr .metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.mr .grid{grid-template-columns:1fr}.mr .box{padding:16px}.mr nav{flex-wrap:wrap}.mr .modal-body,.mr .modal-head,.mr .modal-foot{padding:16px}.mr .metrics{gap:8px}.mr .metric strong{font-size:22px}}@media(prefers-reduced-motion:reduce){.mr *{transition:none!important}}
`;
function apply(ctx) {
  ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({ name: "plugins.bundle.config", key: "dsh-multi-router" }, RouterPage));
}
function Modal({ title, close, children, busy }) {
  const ref = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dialog", { ref, "aria-label": title, onCancel: (e) => {
    e.preventDefault();
    if (!busy) close();
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-head bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: title }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy, onClick: close, children: "\u5173\u95ED" })
    ] }),
    children
  ] });
}
function Feedback({ error, notice }) {
  return error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "feedback error", role: "alert", children: error }) : notice ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "feedback", role: "status", children: notice }) : null;
}
var metric = (label, value, detail) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "box metric", children: [
  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: label }),
  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: value }),
  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: detail })
] });
function RouterPage({ view = "page" }) {
  const [data, setData] = (0, import_react.useState)(null), [tab, setTab] = (0, import_react.useState)("overview");
  const [provider, setProvider] = (0, import_react.useState)("workbuddy"), [busy, setBusy] = (0, import_react.useState)(false), [live, setLive] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(""), [notice, setNotice] = (0, import_react.useState)(""), [draft, setDraft] = (0, import_react.useState)(null), [accountModal, setAccountModal] = (0, import_react.useState)(null), [presetModal, setPresetModal] = (0, import_react.useState)(false), [search, setSearch] = (0, import_react.useState)("");
  const polling = (0, import_react.useRef)(false);
  async function load() {
    const next = await readManagementResponse(await fetch(ENDPOINT, { cache: "no-store" }));
    setData(next);
    setError("");
  }
  (0, import_react.useEffect)(() => {
    if (view === "summary") return;
    void load().catch((e) => setError(e.message));
    if (!live) return;
    const timer = setInterval(() => {
      if (document.hidden || polling.current) return;
      polling.current = true;
      void load().catch((e) => setError(e.message)).finally(() => {
        polling.current = false;
      });
    }, 15e3);
    return () => clearInterval(timer);
  }, [view, live]);
  (0, import_react.useEffect)(() => {
    if (data?.pluginUpdates?.job?.state !== "running" && !data?.checkins?.running) return;
    const timer = setInterval(() => {
      if (polling.current) return;
      polling.current = true;
      void load().catch((e) => setError(e.message)).finally(() => {
        polling.current = false;
      });
    }, 2e3);
    return () => clearInterval(timer);
  }, [data?.pluginUpdates?.job?.state, data?.checkins?.running]);
  async function act(action) {
    if (busy || backendNeedsRestart(data)) return false;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", "X-Multi-Router-Key": data.key }, body: JSON.stringify({ revision: data.revision, ...action }) });
      const next = await readManagementResponse(res);
      const { exported, ...state } = next;
      setData(state);
      setNotice(action.action.startsWith("checkins.") || action.action.startsWith("plugins.") || action.action === "setup.dismiss" ? "" : action.action === "accounts.discover" || action.action === "monitor.refresh" ? "\u5DF2\u91CD\u65B0\u68C0\u6D4B\u672C\u673A\u767B\u5F55\u5E76\u5237\u65B0\u7528\u91CF\uFF1B\u68C0\u6D4B\u7ED3\u679C\u89C1\u4E0B\u65B9\u3002" : action.action.includes("refresh") ? "\u5DF2\u5237\u65B0\u3002\u65E0\u6CD5\u83B7\u53D6\u7684\u8D26\u53F7\u4F1A\u4FDD\u7559\u4E0A\u6B21\u6570\u636E\u5E76\u6807\u8BB0\u3002" : action.action === "config.import" ? "\u914D\u7F6E\u5DF2\u5BFC\u5165\u5E76\u751F\u6548\uFF0C\u539F\u914D\u7F6E\u5DF2\u5907\u4EFD\uFF1B\u6A21\u578B\u548C\u7528\u91CF\u6B63\u5728\u540E\u53F0\u66F4\u65B0\u3002" : action.action.startsWith("config.") || action.action === "account.export" ? "" : "\u5DF2\u4FDD\u5B58\u5E76\u751F\u6548\u3002");
      return next;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function openAccount(mode, account) {
    setError("");
    setNotice("");
    setAccountModal({ mode, account, revision: data.revision });
  }
  const newTarget = (target = { provider: "workbuddy" }) => ({ ...target, key: crypto.randomUUID(), weight: target.weight ?? 1, tokenBudget: target.tokenBudget ?? 1e5, creditBudget: target.creditBudget ?? 100, modelText: (target.models ?? [target.model ?? ""]).join(", ") });
  function editRoute(route) {
    setError("");
    setNotice("");
    setDraft({ ...structuredClone(route), revision: data.revision, previousId: route.id, strategy: route.strategy ?? "failover", targets: route.targets.map(newTarget) });
  }
  const p = data?.providers.find((p2) => p2.id === provider), accounts = data?.accounts.filter((a) => a.provider === provider) ?? [];
  const providerSelect = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "filter", children: [
    "\u4F9B\u5E94\u5546 / \u533A\u57DF",
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { value: provider, onChange: (e) => {
      setProvider(e.target.value);
      setSearch("");
    }, children: data?.providers.map((p2) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: p2.id, children: p2.name }, p2.id)) })
  ] });
  if (view === "summary") return "\u4E09\u5BB6\u8D26\u53F7\u4E0E\u767B\u5F55\u4FE1\u606F\u3001\u7528\u91CF\u76D1\u63A7\u3001\u6A21\u578B\u7BA1\u7406\uFF0C\u4EE5\u53CA\u6743\u91CD\u548C\u989D\u5EA6\u8DEF\u7531\u3002";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "mr", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: styles }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "\u4E09\u5BB6\u8D26\u53F7\u4E0E\u7EDF\u4E00\u8DEF\u7531" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "muted", children: "\u8FDE\u63A5\u8D26\u53F7\uFF0C\u9009\u62E9\u6A21\u578B\uFF0C\u6309\u4F60\u7684\u89C4\u5219\u81EA\u52A8\u5207\u6362\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "badge", children: busy ? "\u6B63\u5728\u5904\u7406\u2026" : "\u672C\u673A\u7BA1\u7406" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
          void load().catch((e) => setError(e.message));
        }, children: "\u5237\u65B0\u9762\u677F" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", { "aria-label": "\u8DEF\u7531\u63D2\u4EF6\u914D\u7F6E\u9875\u7B7E", children: [["overview", "\u603B\u89C8\u4E0E\u7528\u91CF"], ["usage", "Token \u660E\u7EC6"], ["accounts", "\u8D26\u53F7\u4E0E\u767B\u5F55"], ["checkins", "\u79EF\u5206\u7B7E\u5230"], ["models", "\u6A21\u578B\u7BA1\u7406"], ["routes", "\u8DEF\u7531\u89C4\u5219"], ["plugins", "\u63D2\u4EF6\u66F4\u65B0"], ["migration", "\u914D\u7F6E\u8FC1\u79FB"]].map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { "aria-pressed": tab === key, onClick: () => {
      setTab(key);
      setError("");
      setNotice("");
    }, children: label }, key)) }),
    !draft && !accountModal && !presetModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feedback, { error, notice }),
    (backendNeedsRestart(data) || !data && error) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RestartGuidance, { data, retry: () => {
      void load().catch((e) => setError(e.message));
    } }),
    !data ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "status", children: error ? "\u63D2\u4EF6\u540E\u53F0\u6682\u4E0D\u53EF\u7528\u3002\u4FEE\u590D\u542F\u7528\u9519\u8BEF\u540E\u70B9\u51FB\u300C\u5237\u65B0\u9762\u677F\u300D\u3002" : "\u6B63\u5728\u8BFB\u53D6\u8D26\u53F7\u4E0E\u7528\u91CF\u2026" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", { className: "stack", style: { border: 0, padding: 0, margin: 0, minWidth: 0 }, disabled: backendNeedsRestart(data), "aria-busy": busy, children: [
      ["overview", "accounts"].includes(tab) && data.setup?.dismissed !== true && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InitialSetup, { data, busy, act, go: (key) => setTab(key) }),
      tab === "overview" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Overview, { data, live, setLive, busy, act, go: (key) => setTab(key) }),
      tab === "plugins" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PluginUpdatesPanel, { data: data.pluginUpdates, busy, act }),
      tab === "checkins" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckinPanel, { data, busy, act }),
      tab === "usage" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsageDetails, { data, busy, act }),
      tab === "accounts" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stack", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
          providerSelect,
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
            !provider.startsWith("qoder") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
              void act({ action: "accounts.discover", provider });
            }, children: "\u91CD\u65B0\u68C0\u6D4B\u672C\u673A\u767B\u5F55" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
              void act({ action: "monitor.refresh", provider });
            }, children: "\u5237\u65B0\u767B\u5F55\u4E0E\u7528\u91CF" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "primary", disabled: busy, onClick: () => openAccount("add"), children: "\u6DFB\u52A0\u8D26\u53F7" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "steps", children: "WorkBuddy \u4E0E Trae \u542F\u52A8\u65F6\u81EA\u52A8\u8BFB\u53D6\u672C\u673A\u5DF2\u767B\u5F55\u8D26\u53F7\uFF0C\u6BCF\u5206\u949F\u91CD\u65B0\u68C0\u6D4B\uFF1BTrae \u81EA\u52A8\u8BC6\u522B CN\u3001Global \u4E0E SOLO\u3002\u4E5F\u53EF\u6DFB\u52A0\u624B\u52A8\u51ED\u8BC1\u6216\u5BFC\u5165\u5176\u5B83\u8BBE\u5907\u8D26\u53F7\u3002\u5404\u8D26\u53F7\u4FDD\u7559\u72EC\u7ACB\u526F\u672C\u3002" }),
        data.localDiscovery?.filter((s) => s.provider === provider).map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
          s.state === "found" ? "\u5DF2\u53D1\u73B0\u672C\u673A\u5BA2\u6237\u7AEF\u767B\u5F55\u3002" : s.state === "unreadable" ? "\u672C\u673A\u767B\u5F55\u6587\u4EF6\u65E0\u6CD5\u8BFB\u53D6\u3002\u8BF7\u5728\u5B98\u65B9\u5BA2\u6237\u7AEF\u91CD\u65B0\u767B\u5F55\u540E\u91CD\u8BD5\uFF0C\u6216\u5728\u300C\u6DFB\u52A0\u8D26\u53F7\u300D\u4E2D\u624B\u52A8\u586B\u5199\u51ED\u8BC1\u3002" : "\u672A\u627E\u5230\u672C\u673A\u5DF2\u767B\u5F55\u8D26\u53F7\u3002\u8BF7\u5148\u5B89\u88C5\u5E76\u767B\u5F55\u5BF9\u5E94\u533A\u57DF\u7684\u5B98\u65B9\u5BA2\u6237\u7AEF\uFF0C\u7136\u540E\u91CD\u65B0\u68C0\u6D4B\u3002",
          " \xB7 ",
          when(s.checkedAt)
        ] }, s.provider)),
        !accounts.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "box empty", children: provider.startsWith("qoder") ? "Qoder \u9700\u8981\u6DFB\u52A0 PAT\uFF0C\u6216\u8BFB\u53D6\u539F\u8FDE\u63A5\u5668\u5DF2\u4FDD\u5B58\u7684 PAT\u3002" : `\u8FD8\u6CA1\u6709 ${p?.name} \u8D26\u53F7\u3002\u767B\u5F55\u5B98\u65B9\u5BA2\u6237\u7AEF\u540E\u4F1A\u81EA\u52A8\u68C0\u6D4B\uFF0C\u4E5F\u53EF\u70B9\u51FB\u300C\u6DFB\u52A0\u8D26\u53F7\u300D\u624B\u52A8\u5BFC\u5165\u3002` }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "grid", children: accounts.map((a, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: a.name }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "mono muted", children: a.id })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "badge", children: a.status.cooldowns.length ? "\u51B7\u5374\u4E2D" : a.enabled ? "\u5DF2\u542F\u7528" : "\u5DF2\u505C\u7528" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: a.login?.state === "valid" ? "good" : "muted", children: loginNames[a.login?.state] || "\u5C1A\u672A\u67E5\u8BE2" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
              a.login?.name || "\u70B9\u51FB\u5237\u65B0\u83B7\u53D6\u8EAB\u4EFD",
              a.login?.expiresAt ? ` \xB7 \u6709\u6548\u81F3 ${when(a.login.expiresAt)}` : a.login?.kind === "PAT" ? " \xB7 PAT \u6709\u6548\u671F\u7531\u5E73\u53F0\u7BA1\u7406" : ""
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "\u5E73\u53F0\u5269\u4F59\u989D\u5EA6" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: [
                a.usage?.balance?.unlimited ? "\u4E0D\u9650\u91CF" : fmt(a.usage?.balance?.remaining),
                " ",
                a.usage?.balance?.unit === "credits" ? "\u79EF\u5206" : ""
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "\u672C\u63D2\u4EF6\u7D2F\u8BA1 Token" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: fmt(a.usage?.tokens || 0) })
            ] })
          ] }),
          a.usage?.balance?.error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice error", children: [
            "\u7528\u91CF\u8BFB\u53D6\u5931\u8D25\uFF0C\u663E\u793A\u4E0A\u6B21\u6570\u636E \xB7 ",
            when(a.usage.balance.fetchedAt)
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "notice", children: [
              a.modelCount,
              " \u4E2A\u6A21\u578B \xB7 ",
              fmt(a.usage?.requests || 0),
              " \u6B21\u8BF7\u6C42"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => openAccount("edit", a), children: "\u767B\u5F55\u8BE6\u60C5 / \u7BA1\u7406" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy || i === 0, onClick: () => {
              void act({ action: "account.move", id: a.id, direction: -1 });
            }, children: "\u524D\u79FB" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy || i === accounts.length - 1, onClick: () => {
              void act({ action: "account.move", id: a.id, direction: 1 });
            }, children: "\u540E\u79FB" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", disabled: busy, checked: a.enabled, onChange: (e) => {
                void act({ action: "account.update", id: a.id, enabled: e.target.checked });
              } }),
              "\u53C2\u4E0E\u8DEF\u7531"
            ] })
          ] })
        ] }, a.id)) })
      ] }),
      tab === "models" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stack", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u539F\u59CB\u6A21\u578B\u5C55\u793A" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
                "\u5168\u90E8\u6E20\u9053\u5DF2\u5C55\u793A ",
                data.providers.reduce((n, p2) => n + p2.models.filter((m) => m.visible).length, 0),
                " / ",
                data.providers.reduce((n, p2) => n + p2.models.length, 0),
                " \u4E2A\u6A21\u578B"
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
                void act({ action: "models.visibility", visible: true });
              }, children: "\u5168\u90E8\u5C55\u793A" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
                void act({ action: "models.visibility", visible: false });
              }, children: "\u5168\u90E8\u9690\u85CF\uFF08\u4EC5\u8DEF\u7531\uFF09" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u4E09\u5BB6\u6240\u6709\u533A\u57DF\u7684\u539F\u59CB\u6A21\u578B\u9ED8\u8BA4\u9690\u85CF\uFF0C\u53EA\u5C55\u793A\u7EDF\u4E00\u8DEF\u7531\u3002\u6279\u91CF\u64CD\u4F5C\u4F5C\u7528\u4E8E\u5168\u90E8\u6E20\u9053\uFF0C\u5E76\u9002\u7528\u4E8E\u540E\u7EED\u53D1\u73B0\u7684\u65B0\u6A21\u578B\uFF1B\u5355\u4E2A\u6A21\u578B\u4ECD\u53EF\u5355\u72EC\u8C03\u6574\u3002\u9690\u85CF\u4E0D\u5F71\u54CD\u8DEF\u7531\u76EE\u6807\u6216\u5DF2\u6709\u4F1A\u8BDD\u3002" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
          providerSelect,
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
            void act({ action: "refresh", provider });
          }, children: "\u83B7\u53D6\u6A21\u578B\u76EE\u5F55" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          "\u641C\u7D22\u6A21\u578B",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "search", placeholder: "\u8F93\u5165\u540D\u79F0\u6216\u6A21\u578B ID", value: search, onChange: (e) => setSearch(e.target.value) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u5C55\u793A\u5F00\u5173\u51B3\u5B9A\u539F\u59CB\u6A21\u578B\u662F\u5426\u51FA\u73B0\u5728 DSH \u9009\u62E9\u5668\uFF1B\u8DEF\u7531\u5C55\u793A\u5728\u300C\u8DEF\u7531\u89C4\u5219\u300D\u4E2D\u72EC\u7ACB\u8BBE\u7F6E\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box", children: [
          !p?.models.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "empty", children: "\u5148\u6DFB\u52A0\u5E76\u542F\u7528\u8D26\u53F7\uFF0C\u518D\u83B7\u53D6\u6A21\u578B\u76EE\u5F55\u3002" }),
          p?.models.filter((m) => `${m.id} ${m.name}`.toLowerCase().includes(search.toLowerCase())).map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { className: "item grid", onSubmit: (e) => {
            e.preventDefault();
            void act({ action: "model.update", provider, id: m.id, name: new FormData(e.currentTarget).get("name") });
          }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
              "\u6A21\u578B\u540D\u79F0",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { name: "name", defaultValue: m.name, required: true, maxLength: 200, disabled: busy }, m.name),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "mono muted", children: m.id })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", disabled: busy, checked: m.visible, onChange: (e) => {
                  void act({ action: "model.update", provider, id: m.id, visible: e.target.checked });
                } }),
                "\u5C55\u793A"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, type: "submit", children: "\u4FDD\u5B58\u540D\u79F0" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "notice", children: [
                "\u4E0A\u4E0B\u6587 ",
                fmt(m.contextWindow / 1e3),
                "K"
              ] })
            ] })
          ] }, `${provider}:${m.id}`))
        ] })
      ] }),
      tab === "routes" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stack", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "muted", children: "\u4E00\u4E2A\u8C03\u7528\u540D\u79F0\uFF0C\u8FDE\u63A5\u591A\u4E2A\u8D26\u53F7\u4E0E\u6A21\u578B\u3002" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
              setError("");
              setNotice("");
              setPresetModal(true);
            }, children: "\u6DFB\u52A0\u6A21\u578B\u9884\u914D\u7F6E" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "primary", disabled: busy, onClick: () => {
              setError("");
              setNotice("");
              setDraft({ id: "", name: "", revision: data.revision, contextWindow: 2e5, maxTokens: 32e3, strategy: "failover", preferExpiringCredits: true, expiringWithinDays: 7, visible: true, targets: [newTarget()] });
            }, children: "\u65B0\u5EFA\u8DEF\u7531" })
          ] })
        ] }),
        data.routes.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "box empty", children: "\u5148\u6DFB\u52A0\u4E09\u5BB6\u5171\u6709\u6A21\u578B\u9884\u914D\u7F6E\uFF0C\u6216\u521B\u5EFA\u4F60\u81EA\u5DF1\u7684\u8DEF\u7531\u3002" }),
        data.routes.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: r.name }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "badge", children: [
                r.freeOnly ? "\u4EC5\u514D\u8D39 \xB7 \u81EA\u52A8\u53D1\u73B0" : strategies[r.strategy || "failover"],
                r.preferExpiringCredits ? " \xB7 \u4E34\u671F\u4F18\u5148" : ""
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => editRoute(r), children: "\u7F16\u8F91\u8DEF\u7531" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "route-path", children: r.targets.map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
            data.providers.find((p2) => p2.id === t.provider)?.name,
            " \xB7 ",
            t.account ? data.accounts.find((a) => a.id === t.account)?.name : "\u5168\u90E8\u542F\u7528\u8D26\u53F7",
            r.strategy === "weighted" ? ` \xB7 \u6743\u91CD ${t.weight || 1}` : r.strategy === "tokens" ? ` \xB7 ${fmt(t.tokenBudget)} Token` : r.strategy === "credits" ? ` \xB7 ${fmt(t.creditBudget)} \u79EF\u5206` : ""
          ] }, i)) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
              r.targets.length,
              " \u4E2A\u76EE\u6807 \xB7 ",
              data.telemetry?.rounds[r.id] ? `\u7B2C ${data.telemetry.rounds[r.id].number} \u8F6E \xB7 ` : "",
              "4xx \u81EA\u52A8\u5207\u6362"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", disabled: busy, checked: r.visible !== false, onChange: (e) => {
                const { id, reasoning, supportsImages, expiringStatus, freeStatus, ...route } = r;
                void act({ action: "route.save", id, previousId: id, route: { ...route, visible: e.target.checked } });
              } }),
              r.freeOnly ? "\u5C55\u793A\u52FE\u9009\u7684\u514D\u8D39\u6A21\u578B" : "\u5728\u6A21\u578B\u9009\u62E9\u5668\u5C55\u793A"
            ] })
          ] }),
          r.freeOnly && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FreeStatus, { route: r, busy, act }),
          !r.freeOnly && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
            "\u63A8\u7406\u6A21\u5F0F\uFF1A\u5E73\u53F0\u9ED8\u8BA4",
            r.reasoning?.supportedEfforts?.length ? `\u3001${r.reasoning.supportedEfforts.map((e) => effortNames[e] || e).join("\u3001")}` : "\uFF08\u5E73\u53F0\u672A\u58F0\u660E\u53EF\u8C03\u6863\u4F4D\uFF09",
            "\u3002\u9009\u62E9\u6863\u4F4D\u540E\uFF0C\u53EA\u5728\u652F\u6301\u8BE5\u6863\u4F4D\u7684\u76EE\u6807\u95F4\u5207\u6362\u3002"
          ] }),
          r.preferExpiringCredits && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExpiryStatus, { route: r, act, busy, revision: data.revision })
        ] }, r.id)),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "\u5168\u5C40\u5207\u6362\u8BBE\u7F6E" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { className: "box stack", style: { marginTop: 16 }, onSubmit: (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void act({ action: "options.save", cooldownMs: Number(f.get("cooldown")) * 1e3, requestTimeoutMs: Number(f.get("timeout")) * 1e3, retryServerErrors: f.has("server") });
          }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
                "\u5931\u8D25\u8D26\u53F7\u51B7\u5374\uFF08\u79D2\uFF09",
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { disabled: busy, name: "cooldown", type: "number", min: "1", required: true, defaultValue: data.options.cooldownMs / 1e3 })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
                "\u8BF7\u6C42\u8D85\u65F6\uFF08\u79D2\uFF09",
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { disabled: busy, name: "timeout", type: "number", min: "1", required: true, defaultValue: data.options.requestTimeoutMs / 1e3 })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { disabled: busy, name: "server", type: "checkbox", defaultChecked: data.options.retryServerErrors }),
              "5xx \u548C\u7F51\u7EDC\u9519\u8BEF\u4E5F\u5207\u6362\u8D26\u53F7"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, type: "submit", children: "\u4FDD\u5B58\u8BBE\u7F6E" }) })
          ] })
        ] })
      ] }),
      tab === "migration" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MigrationForm, { data, act, busy })
    ] }),
    draft && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, { title: draft.previousId ? "\u7F16\u8F91\u8DEF\u7531" : "\u65B0\u5EFA\u8DEF\u7531", busy, close: () => setDraft(null), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RouteForm, { draft, setDraft, data, act, busy, error, notice }) }),
    presetModal && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, { title: "\u6A21\u578B\u8DEF\u7531\u9884\u914D\u7F6E", busy, close: () => setPresetModal(false), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-body stack", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feedback, { error, notice }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "steps", children: "Free \u81EA\u52A8\u53D1\u73B0\u5404\u8D26\u53F7\u7684\u514D\u8D39\u6A21\u578B\uFF1B\u5176\u4ED6\u9884\u914D\u7F6E\u7ED1\u5B9A\u4E09\u5BB6\u5171\u6709\u6A21\u578B\u3002\u5DF2\u6709\u8DEF\u7531\u4E0D\u4F1A\u88AB\u8986\u76D6\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "grid", children: (data.presets || []).map((preset) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: preset.name }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: preset.freeOnly ? "\u6BCF\u5929\u81EA\u52A8\u68C0\u67E5\u514D\u8D39\u6A21\u578B\uFF0C\u8C03\u7528\u524D\u590D\u6838\u96F6\u500D\u7387\uFF1B\u4EC5\u5728\u514D\u8D39\u6A21\u578B\u95F4\u5207\u6362\u3002" : `\u5DF2\u53D1\u73B0\u53EF\u7528\u6E20\u9053\uFF1A${preset.availableProviders.length} / 3${preset.availableProviders.length < 3 ? " \xB7 \u53EF\u6DFB\u52A0\u8D26\u53F7\u6216\u5237\u65B0\u6A21\u578B\u76EE\u5F55\u540E\u4F7F\u7528" : ""}` }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy || preset.added, onClick: () => {
            void act({ action: "preset.add", id: preset.id });
          }, children: preset.added ? "\u5DF2\u6DFB\u52A0" : "\u6DFB\u52A0\u6B64\u8DEF\u7531" })
        ] }, preset.id)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-foot bar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u65B0\u589E\u8DEF\u7531\u53EF\u7EE7\u7EED\u7F16\u8F91\u540D\u79F0\u3001\u8D26\u53F7\u548C\u5207\u6362\u89C4\u5219\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "primary", disabled: busy || !(data.presets || []).some((p2) => !p2.added), onClick: () => {
          void act({ action: "preset.add-all" });
        }, children: "\u8865\u9F50\u5168\u90E8\u9884\u914D\u7F6E" })
      ] })
    ] }),
    accountModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, { title: accountModal.mode === "edit" ? "\u8D26\u53F7\u767B\u5F55\u8BE6\u60C5" : accountModal.mode === "credentials" ? "\u8865\u5145 / \u66F4\u65B0\u8D26\u53F7\u51ED\u8BC1" : "\u6DFB\u52A0\u8D26\u53F7\u4E0E\u83B7\u53D6\u767B\u5F55", busy, close: () => setAccountModal(null), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccountForm, { modal: accountModal, provider, data, busy, act, replace: () => openAccount("credentials", accountModal.account), close: (selected) => {
      if (typeof selected === "string") setProvider(selected);
      setAccountModal(null);
    }, error, notice }) })
  ] });
}
function CheckinPanel({ data, busy, act }) {
  const info = data.checkins || {}, rows = info.accounts || [], today = (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  const beforeWindow = Date.now() < Date.parse(`${today}T10:05:00+08:00`);
  const blocked = busy || info.running || !!info.error;
  const eligible = rows.filter((r) => r.supported && !r.paused && data.accounts.find((a) => a.id === r.id)?.enabled && (r.last?.day !== today || r.last?.retryReady));
  const ready = (r) => eligible.includes(r) && !beforeWindow;
  const displayName = (a) => a?.name?.replace(/(1\d{2})\d{4}(\d{4})/g, "$1****$2");
  const resultLabels = { claimed: "\u6210\u529F", "already-claimed": "\u5DF2\u9886\u53D6", "no-campaign": "\u65E0\u6D3B\u52A8", retryable: "\u67E5\u8BE2\u5931\u8D25", "before-window": "\u7A97\u53E3\u672A\u5F00", "auth-invalid": "\u4EE4\u724C\u5931\u6548", paused: "\u5E73\u53F0\u6682\u505C", uncertain: "\u5F85\u6838\u5BF9", "device-used": "\u8BBE\u5907\u5DF2\u53C2\u4E0E" };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stack", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u6BCF\u65E5\u79EF\u5206\u7B7E\u5230" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: info.schedule })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "primary", disabled: blocked || beforeWindow || !eligible.length, onClick: () => {
          void act({ action: "checkins.run", ids: eligible.map((r) => r.id) });
        }, children: [
          "\u7B7E\u5230\u5168\u90E8\u53EF\u7528\u8D26\u53F7\uFF08",
          eligible.length,
          "\uFF09"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "steps", children: "\u81EA\u52A8\u7B7E\u5230\u9ED8\u8BA4\u5173\u95ED\uFF0C\u6309\u8D26\u53F7\u5F00\u542F\u3002\u5148\u67E5\u9886\u53D6\u72B6\u6001\u3001\u4E32\u884C\u63D0\u4EA4\uFF0C\u8D26\u53F7\u95F4\u9694\u81F3\u5C11 10 \u79D2\uFF1B\u6BCF\u4E2A\u8D26\u53F7\u6BCF\u5929\u6700\u591A\u63D0\u4EA4\u4E00\u6B21\u9886\u53D6\u3002\u786E\u8BA4\u5C1A\u672A\u63D0\u4EA4\u7684\u67E5\u8BE2\u5931\u8D25\uFF0C20:05 \u540E\u6700\u591A\u8865\u67E5\u4E00\u6B21\uFF1B\u5DF2\u9886\u53D6\u3001\u65E0\u6D3B\u52A8\u548C\u7ED3\u679C\u4E0D\u660E\u7684\u8D26\u53F7\u8DF3\u8FC7\u3002\u9047\u5230\u9A8C\u8BC1\u3001\u9650\u6D41\u6216\u8BBE\u5907\u9650\u5236\u5C31\u505C\u6B62\uFF0C\u4E0D\u4F1A\u4FEE\u6539\u8BBE\u5907\u8EAB\u4EFD\u6216\u5207\u6362\u8D26\u53F7\u91CD\u8BD5\u3002" }),
      beforeWindow && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u4ECA\u65E5\u7B7E\u5230\u5C06\u5728\u5317\u4EAC\u65F6\u95F4 10:05 \u540E\u5F00\u653E\u3002DSH \u5173\u95ED\u671F\u95F4\u4E0D\u4F1A\u6267\u884C\uFF0C\u542F\u7528\u81EA\u52A8\u7B7E\u5230\u7684\u8D26\u53F7\u4F1A\u5728\u4E0B\u6B21\u542F\u52A8\u540E\u8865\u67E5\u3002" }),
      info.error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "alert", className: "error", children: info.error }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "status", children: info.running ? `\u6B63\u5728\u5904\u7406 ${displayName(data.accounts.find((a) => a.id === info.current)) || "\u7B7E\u5230\u961F\u5217"}\u2026` : "\u7B7E\u5230\u7ED3\u679C\u548C\u9886\u53D6\u79EF\u5206\u4EE5\u4E0B\u65B9\u5E73\u53F0\u54CD\u5E94\u4E3A\u51C6\u3002" }),
      info.report && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
        "\u6700\u8FD1\u4E00\u8F6E \xB7 ",
        when(info.report.at),
        " \xB7 ",
        Object.entries(info.report.counts || {}).map(([key, n]) => `${resultLabels[key] || "\u672A\u5B8C\u6210"} ${n}`).join(" \xB7 "),
        "\u3002\u6CA1\u6709\u5F85\u8865\u67E5\u8D26\u53F7\u65F6\u4E0D\u91CD\u590D\u6C47\u62A5\u3002"
      ] })
    ] }),
    data.providers.map((p) => {
      const accounts = data.accounts.filter((a) => a.provider === p.id);
      if (!accounts.length) return null;
      const supported = rows.some((r) => r.id === accounts[0].id && r.supported), paused = rows.some((r) => accounts.some((a) => a.id === r.id) && r.paused);
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: p.name }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "badge", children: supported ? paused ? "\u5DF2\u6682\u505C" : "\u652F\u6301\u7B7E\u5230" : "\u5B98\u65B9\u5BA2\u6237\u7AEF\u9886\u53D6" })
        ] }),
        !supported ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: p.id.startsWith("workbuddy") ? "WorkBuddy AI \u6682\u672A\u63A5\u5165\u53EF\u6838\u9A8C\u7684\u7B7E\u5230\u63A5\u53E3\uFF0C\u8BF7\u5728\u5B98\u65B9\u5BA2\u6237\u7AEF\u67E5\u770B\u6D3B\u52A8\u4E0E\u9886\u53D6\u5165\u53E3\u3002" : "Trae Global \u6682\u65E0\u5DF2\u6838\u9A8C\u7684\u79EF\u5206\u7B7E\u5230\u63A5\u53E3\uFF0C\u8BF7\u5728\u5B98\u65B9\u5BA2\u6237\u7AEF\u67E5\u770B\u6743\u76CA\u3002" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          paused && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "steps", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u5E73\u53F0\u9650\u5236\u6216\u9700\u8981\u9A8C\u8BC1\uFF0C\u5DF2\u6682\u505C\u8BE5\u5E73\u53F0\u7B7E\u5230\u3002\u8BF7\u5728\u5B98\u65B9\u5BA2\u6237\u7AEF\u5904\u7406\u540E\u518D\u6062\u590D\uFF1B\u6062\u590D\u4ECD\u4FDD\u7559\u4ECA\u65E5\u5C1D\u8BD5\u8BB0\u5F55\u548C\u8BBE\u5907\u9650\u5236\u3002" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: blocked, onClick: () => {
              void act({ action: "checkins.resume", provider: p.id });
            }, children: "\u6211\u5DF2\u5728\u5B98\u65B9\u5BA2\u6237\u7AEF\u5904\u7406\uFF0C\u6062\u590D\u540E\u7EED\u7B7E\u5230" })
          ] }),
          accounts.map((a) => {
            const r = rows.find((r2) => r2.id === a.id) || {}, last = r.last?.day === today ? r.last : void 0;
            return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "item stack", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: displayName(a) }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
                    r.last ? `${r.last.day} \xB7 ${r.last.message}${r.last.amount !== void 0 ? ` \xB7 ${fmt(r.last.amount)} \u79EF\u5206` : ""}` : "\u5C1A\u65E0\u7B7E\u5230\u8BB0\u5F55",
                    !a.enabled ? " \xB7 \u8D26\u53F7\u5DF2\u505C\u7528" : ""
                  ] }),
                  r.last && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
                    when(r.last.at),
                    last?.retryAt ? ` \xB7 \u8865\u67E5\u65F6\u95F4 ${when(last.retryAt)}` : last?.status === "retryable" ? " \xB7 \u4ECA\u65E5\u4E0D\u518D\u8865\u67E5\uFF0C\u660E\u65E5\u518D\u8BD5" : ""
                  ] }),
                  r.last?.activity && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: [r.last.activity.streakDays !== void 0 && `\u8FDE\u7B7E ${fmt(r.last.activity.streakDays)} \u5929`, r.last.activity.totalCredits !== void 0 && `\u6D3B\u52A8\u7D2F\u8BA1 ${fmt(r.last.activity.totalCredits)} \u79EF\u5206`, r.last.activity.nextStreakDay !== void 0 && `\u4E0B\u4E00\u8FDE\u7B7E\u6863\u4F4D ${fmt(r.last.activity.nextStreakDay)} \u5929`, r.last.activity.endsAt !== void 0 && `\u6D3B\u52A8\u622A\u6B62 ${when(r.last.activity.endsAt)}`].filter(Boolean).join(" \xB7 ") })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: blocked || !ready(r), onClick: () => {
                  void act({ action: "checkins.run", ids: [a.id] });
                }, children: last?.status === "auth-invalid" ? "\u8BF7\u66F4\u65B0\u51ED\u8BC1" : last?.retryReady ? "\u8865\u67E5\u7B7E\u5230" : last?.retryAt ? "\u7B49\u5F85\u665A\u95F4\u8865\u67E5" : last ? "\u4ECA\u65E5\u5DF2\u5904\u7406" : "\u7ACB\u5373\u7B7E\u5230" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { "aria-label": `${displayName(a)} \u6BCF\u65E5\u81EA\u52A8\u7B7E\u5230`, type: "checkbox", disabled: blocked, checked: r.auto === true, onChange: (e) => {
                  void act({ action: "account.update", id: a.id, autoCheckin: e.target.checked });
                } }),
                "\u6BCF\u65E5\u81EA\u52A8\u7B7E\u5230"
              ] })
            ] }, a.id);
          })
        ] })
      ] }, p.id);
    }),
    !data.accounts.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "box empty", children: "\u5148\u5230\u300C\u8D26\u53F7\u4E0E\u767B\u5F55\u300D\u6DFB\u52A0\u8D26\u53F7\uFF0C\u518D\u5F00\u542F\u6BCF\u65E5\u81EA\u52A8\u7B7E\u5230\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u591A\u53F0\u8BBE\u5907\u7684\u672C\u5730\u8BB0\u5F55\u4E0D\u4F1A\u4E92\u76F8\u540C\u6B65\uFF0C\u6BCF\u6B21\u90FD\u4F1A\u67E5\u8BE2\u5E73\u53F0\u9886\u53D6\u72B6\u6001\uFF1B\u5EFA\u8BAE\u4EC5\u5728\u4E00\u53F0\u5E38\u7528\u8BBE\u5907\u5F00\u542F\u81EA\u52A8\u7B7E\u5230\u3002\u540C\u4E00 Trae \u8BBE\u5907\u6BCF\u5929\u6700\u591A\u5904\u7406\u4E00\u4E2A\u9886\u53D6\u8BF7\u6C42\uFF0C\u91CD\u590D\u8D26\u53F7\u526F\u672C\u4F1A\u53BB\u91CD\uFF1B\u4E0D\u4FDD\u8BC1\u5E73\u53F0\u4E00\u5B9A\u53D1\u653E\u5956\u52B1\u3002" })
  ] });
}
function Overview({ data, live, setLive, busy, act, go }) {
  const t = data.telemetry || {}, today = t.days?.[t.today] || {}, totals = data.accounts.reduce((s, a) => ({ requests: s.requests + (a.usage?.requests || 0), tokens: s.tokens + (a.usage?.tokens || 0) }), { requests: 0, tokens: 0 });
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() - 6 + i);
    const key = d.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
    return { key, tokens: t.days?.[key]?.tokens || 0 };
  });
  const max = Math.max(1, ...dates.map((d) => d.tokens));
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stack", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "metrics", children: [
      metric("\u4ECA\u65E5 Token", fmt(today.tokens || 0), "\u8F93\u5165 + \u8F93\u51FA \xB7 \u5317\u4EAC\u65F6\u95F4"),
      metric("\u4ECA\u65E5\u8BF7\u6C42", fmt(today.requests || 0), `\u5931\u8D25 ${fmt(today.failures || 0)} \u6B21`),
      metric("\u8D26\u53F7\u6C60", `${data.accounts.filter((a) => a.enabled).length} / ${data.accounts.length}`, "\u542F\u7528 / \u5168\u90E8\u8D26\u53F7"),
      metric("\u7D2F\u8BA1 Token", fmt(totals.tokens), `${fmt(totals.requests)} \u6B21\u8BF7\u6C42`)
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u5E73\u53F0\u989D\u5EA6" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: live, onChange: (e) => setLive(e.target.checked) }),
          "15 \u79D2\u5237\u65B0\u9762\u677F"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
          void act({ action: "monitor.refresh" });
        }, children: "\u5237\u65B0\u5E73\u53F0\u7528\u91CF" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "providers", children: ["workbuddy", "trae", "qoder"].map((base) => {
      const accounts = data.accounts.filter((a) => a.provider === base || a.provider.startsWith(base + "-") || base === "trae" && a.provider === "trae-global");
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: base === "workbuddy" ? "WorkBuddy" : base === "trae" ? "Trae" : "Qoder" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "badge", children: [
            accounts.length,
            " \u4E2A\u8D26\u53F7"
          ] })
        ] }),
        !accounts.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u5C1A\u672A\u8FDE\u63A5\u8D26\u53F7" }),
        accounts.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: a.name }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
              a.usage?.balance?.unlimited ? "\u4E0D\u9650\u91CF" : fmt(a.usage?.balance?.remaining),
              " ",
              a.usage?.balance?.unit === "credits" ? "\u79EF\u5206" : ""
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
            a.usage?.balance?.error ? "\u67E5\u8BE2\u5931\u8D25 \xB7 \u4E0A\u6B21\u6570\u636E " : "\u66F4\u65B0\u4E8E ",
            when(a.usage?.balance?.fetchedAt)
          ] })
        ] }, a.id)),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => go("accounts"), children: "\u7BA1\u7406\u8D26\u53F7" })
      ] }, base);
    }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u5E73\u53F0\u4F59\u989D\u6BCF\u5206\u949F\u67E5\u8BE2\uFF1BToken \u4EC5\u7EDF\u8BA1\u672C\u63D2\u4EF6\u8BF7\u6C42\uFF0C\u4ECE\u5347\u7EA7\u5F00\u59CB\u8BB0\u5F55\u3002\u79EF\u5206\u4E0B\u964D\u53EF\u80FD\u5305\u542B\u5BA2\u6237\u7AEF\u6216\u5176\u4ED6\u5E94\u7528\u7684\u6D88\u8017\uFF0C\u4E09\u5BB6\u79EF\u5206\u5206\u522B\u5C55\u793A\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u8FD1 7 \u65E5 Token" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "trend", role: "img", "aria-label": dates.map((d) => `${d.key} ${d.tokens} Token`).join("\uFF0C"), children: dates.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { title: `${d.key} \xB7 ${fmt(d.tokens)} Token`, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { height: `${Math.max(3, d.tokens / max * 78)}%` } }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: d.key.slice(5) })
        ] }, d.key)) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
          "\u672A\u8FD4\u56DE Token \u7528\u91CF\u7684\u8BF7\u6C42\uFF1A",
          fmt(data.accounts.reduce((n, a) => n + (a.usage?.unmetered || 0), 0)),
          " \u6B21"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u5FEB\u901F\u5F00\u59CB" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
          "1. \u786E\u8BA4\u81EA\u52A8\u83B7\u53D6\u7684\u8D26\u53F7\uFF0C\u6216\u624B\u52A8\u6DFB\u52A0\u51ED\u8BC1",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
          "2. \u4F7F\u7528\u9884\u5236\u8DEF\u7531\uFF0C\u6309\u9700\u7F16\u8F91\u8D26\u53F7\u5207\u6362\u89C4\u5219",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
          "3. \u5230 DSH \u6A21\u578B\u9009\u62E9\u5668\u9009\u62E9\u300C\u7EDF\u4E00\u8DEF\u7531\u300D\u4E2D\u7684\u6A21\u578B"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => go("accounts"), children: "\u67E5\u770B\u8D26\u53F7" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => go("routes"), children: "\u914D\u7F6E\u8DEF\u7531" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => go("checkins"), children: "\u79EF\u5206\u7B7E\u5230" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => go("plugins"), children: "\u68C0\u67E5\u6240\u6709\u63D2\u4EF6\u66F4\u65B0" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u6700\u8FD1\u8BF7\u6C42" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => go("usage"), children: "\u67E5\u770B Token \u660E\u7EC6" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "scroll", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "table", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u65F6\u95F4" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u8D26\u53F7" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u8DEF\u7531 / \u6A21\u578B" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Token" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u7ED3\u679C" })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: (t.events || []).slice(0, 15).map((e, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: when(e.at) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: data.accounts.find((a) => a.id === e.account)?.name || e.account }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "mono", children: e.alias }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: fmt(e.tokens) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: e.outcome === "completed" ? "\u6210\u529F" : e.outcome === "cancelled" ? "\u5DF2\u53D6\u6D88" : `\u5931\u8D25 ${e.status}` })
          ] }, `${e.at}:${i}`)) })
        ] }),
        !t.events?.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "empty", children: "\u5C1A\u65E0\u8BF7\u6C42\u8BB0\u5F55\u3002\u901A\u8FC7\u672C\u63D2\u4EF6\u8C03\u7528\u6A21\u578B\u540E\u4F1A\u663E\u793A\u5728\u8FD9\u91CC\u3002" })
      ] })
    ] })
  ] });
}
function UsageDetails({ data, busy, act }) {
  const [account, setAccount] = (0, import_react.useState)(""), [route, setRoute] = (0, import_react.useState)(""), [outcome, setOutcome] = (0, import_react.useState)(""), [page, setPage] = (0, import_react.useState)(0);
  const all = data.telemetry?.events || [], retention = data.options.usageRetentionDays;
  const events = all.filter((e) => (!account || e.account === account) && (!route || e.alias === route) && (!outcome || e.outcome === outcome));
  const pages = Math.max(1, Math.ceil(events.length / 50)), current = Math.min(page, pages - 1);
  const accountName = (id) => data.accounts.find((a) => a.id === id)?.name || id;
  const routeName = (id) => data.routes.find((r) => r.id === id)?.name || id;
  const total = (key) => events.some((e) => e[key] != null) ? events.reduce((n, e) => n + (e[key] ?? 0), 0) : null;
  const missing = events.filter((e) => e.input == null || e.output == null).length;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stack", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u9010\u6B21\u8BF7\u6C42\u7528\u91CF" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u8BB0\u5F55\u6BCF\u6B21\u4E0A\u6E38\u8C03\u7528\uFF0C\u5305\u62EC\u6545\u969C\u5207\u6362\u4E2D\u5931\u8D25\u7684\u5C1D\u8BD5\u3002" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "badge", children: [
          "\u6700\u8FD1 ",
          retention,
          " \u5929 \xB7 ",
          fmt(all.length),
          " \u6761"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { className: "row", onSubmit: (e) => {
        e.preventDefault();
        void act({ action: "options.save", usageRetentionDays: Number(new FormData(e.currentTarget).get("days")) });
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "filter", children: [
          "\u660E\u7EC6\u4FDD\u7559\u5929\u6570",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { name: "days", type: "number", min: "1", max: "365", step: "1", required: true, disabled: busy, defaultValue: retention })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", disabled: busy, children: "\u4FDD\u5B58\u4FDD\u7559\u671F\u9650" })
      ] }, retention),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u9ED8\u8BA4\u4FDD\u7559\u6700\u8FD1 3 \xD7 24 \u5C0F\u65F6\uFF0C\u53EF\u8BBE\u7F6E 1\u2013365 \u5929\u3002\u7F29\u77ED\u671F\u9650\u4F1A\u5220\u9664\u8D85\u671F\u660E\u7EC6\uFF0C\u5EF6\u957F\u4E0D\u80FD\u6062\u590D\u5DF2\u5220\u9664\u8BB0\u5F55\uFF1B\u7D2F\u8BA1\u7EDF\u8BA1\u3001\u989D\u5EA6\u8F6E\u6362\u548C\u4E34\u671F\u51B7\u5374\u4E0D\u53D7\u5F71\u54CD\u3002" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "filter", children: [
        "\u8D26\u53F7",
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: account, onChange: (e) => {
          setAccount(e.target.value);
          setPage(0);
        }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u5168\u90E8\u8D26\u53F7" }),
          [...new Set(all.map((e) => e.account))].map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: id, children: accountName(id) }, id))
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "filter", children: [
        "\u8DEF\u7531 / \u6A21\u578B",
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: route, onChange: (e) => {
          setRoute(e.target.value);
          setPage(0);
        }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u5168\u90E8\u8DEF\u7531 / \u6A21\u578B" }),
          [...new Set(all.map((e) => e.alias))].map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: id, children: routeName(id) }, id))
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "filter", children: [
        "\u7ED3\u679C",
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: outcome, onChange: (e) => {
          setOutcome(e.target.value);
          setPage(0);
        }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u5168\u90E8\u7ED3\u679C" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "completed", children: "\u6210\u529F" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "failed", children: "\u5931\u8D25" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "cancelled", children: "\u5DF2\u53D6\u6D88" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "metrics", children: [
      metric("\u7B5B\u9009\u5185\u8C03\u7528", fmt(events.length), "\u4E0A\u6E38\u5C1D\u8BD5\u6B21\u6570"),
      metric("\u8F93\u5165 Token", fmt(total("input")), "\u5DF2\u8FD4\u56DE\u7684\u8F93\u5165\u5206\u9879"),
      metric("\u8F93\u51FA Token", fmt(total("output")), "\u5DF2\u8FD4\u56DE\u7684\u8F93\u51FA\u5206\u9879"),
      metric("\u603B Token", fmt(total("tokens")), "\u5DF2\u8FD4\u56DE\u7684\u603B\u91CF")
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
      "\u6570\u636E\u6765\u81EA\u5E73\u53F0\u8FD4\u56DE\u7684 usage\u3002",
      missing ? fmt(missing) + " \u6761\u7F3A\u5C11\u8F93\u5165\u6216\u8F93\u51FA\u5206\u9879\uFF1B\u65E7\u8BB0\u5F55\u4E0D\u8865\u7B97\u3002" : "\u8F93\u5165\u3001\u8F93\u51FA\u4E3A\u5B9E\u9645\u8FD4\u56DE\u503C\u3002",
      "\u7F13\u5B58\u8F93\u5165\u5305\u542B\u5728\u8F93\u5165\u4E2D\uFF0C\u63A8\u7406\u8F93\u51FA\u5305\u542B\u5728\u8F93\u51FA\u4E2D\uFF0C\u5747\u4E0D\u91CD\u590D\u76F8\u52A0\u3002\u672A\u8FD4\u56DE\u7684\u6570\u636E\u4EE5\u300C\u2014\u300D\u663E\u793A\u3002"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "scroll", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "table", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u65F6\u95F4" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u6E20\u9053 / \u8D26\u53F7" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u8DEF\u7531 / \u5B9E\u9645\u6A21\u578B" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u8F93\u5165" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u8F93\u51FA" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u603B Token" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u7ED3\u679C" })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: events.slice(current * 50, (current + 1) * 50).map((e, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: when(e.at) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
              data.providers.find((p) => p.id === e.provider)?.name || e.provider,
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: accountName(e.account) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
              routeName(e.alias),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: "mono", children: e.model || "\u672A\u8BB0\u5F55\u5B9E\u9645\u6A21\u578B" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
              fmt(e.input),
              e.cachedInput != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
                  "\u7F13\u5B58 ",
                  fmt(e.cachedInput)
                ] })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
              fmt(e.output),
              e.reasoningOutput != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
                  "\u63A8\u7406 ",
                  fmt(e.reasoningOutput)
                ] })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: fmt(e.tokens) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
              e.outcome === "completed" ? "\u6210\u529F" : e.outcome === "cancelled" ? "\u5DF2\u53D6\u6D88" : "\u5931\u8D25",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: e.status })
            ] })
          ] }, e.at + ":" + current + ":" + i)) })
        ] }),
        !events.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "empty", children: "\u5F53\u524D\u7B5B\u9009\u548C\u4FDD\u7559\u671F\u9650\u5185\u6CA1\u6709\u8BF7\u6C42\u660E\u7EC6\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
          "\u7B2C ",
          current + 1,
          " / ",
          pages,
          " \u9875 \xB7 \u6BCF\u9875 50 \u6761"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: current === 0, onClick: () => setPage(current - 1), children: "\u4E0A\u4E00\u9875" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: current >= pages - 1, onClick: () => setPage(current + 1), children: "\u4E0B\u4E00\u9875" })
        ] })
      ] })
    ] })
  ] });
}
function AccountForm({ modal, provider, data, busy, act, close, replace, error, notice }) {
  const edit = modal.mode === "edit", account = edit ? data.accounts.find((a) => a.id === modal.account.id) : null;
  return edit ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-body stack", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feedback, { error, notice }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "box stack", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: account.name }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: loginNames[account.login?.state] || "\u5C1A\u672A\u67E5\u8BE2" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
        "\u8D26\u53F7\u8EAB\u4EFD\uFF1A",
        account.login?.name || "\u5C1A\u672A\u83B7\u53D6",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
        "\u8BA4\u8BC1\u65B9\u5F0F\uFF1A",
        account.login?.kind || "\u672A\u77E5",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
        "\u767B\u5F55\u6709\u6548\u81F3\uFF1A",
        account.login?.kind === "PAT" ? "\u5E73\u53F0\u672A\u8FD4\u56DE\u6709\u6548\u671F" : when(account.login?.expiresAt),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
        "\u81EA\u52A8\u5237\u65B0\uFF1A",
        account.login?.refreshable ? "\u652F\u6301" : "\u65E0\u5237\u65B0\u51ED\u8BC1",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
        "\u4E0A\u6B21\u7528\u91CF\u66F4\u65B0\uFF1A",
        when(account.usage?.balance?.fetchedAt)
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
        void act({ action: "account.refresh", id: account.id });
      }, children: "\u5237\u65B0\u767B\u5F55\u4E0E\u7528\u91CF" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: replace, children: "\u8865\u5145 / \u66F4\u65B0\u51ED\u8BC1" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CredentialTransfer, { account, busy, act }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u5E73\u53F0\u5957\u9910\u4E0E\u989D\u5EA6" }),
      account.usage?.balance?.plan && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: account.usage.balance.plan }),
      (account.usage?.balance?.packages || []).map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "item", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: p.name || "\u989D\u5EA6\u5305" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: p.unlimited ? "\u4E0D\u9650\u91CF" : `${fmt(p.remaining)} / ${fmt(p.total)}` })
        ] }),
        p.expiresAt && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
          "\u6709\u6548\u81F3 ",
          when(p.expiresAt)
        ] })
      ] }, i)),
      !account.usage?.balance?.packages?.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u5C1A\u65E0\u53EF\u5C55\u793A\u989D\u5EA6\u5305\uFF0C\u70B9\u51FB\u5237\u65B0\u83B7\u53D6\u3002" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { className: "stack", onSubmit: async (e) => {
      e.preventDefault();
      if (await act({ action: "account.update", revision: modal.revision, id: account.id, name: new FormData(e.currentTarget).get("name") })) close();
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        "\u8D26\u53F7\u663E\u793A\u540D\u79F0",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { name: "name", required: true, defaultValue: account.name, maxLength: 100, disabled: busy })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy, onClick: async () => {
          if (await act({ action: "account.remove", id: account.id })) close();
        }, children: "\u79FB\u51FA\u8D26\u53F7\u6C60" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "primary", type: "submit", disabled: busy, children: "\u4FDD\u5B58\u540D\u79F0" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u79FB\u51FA\u8D26\u53F7\u6C60\u540E\u4FDD\u7559\u51ED\u8BC1\u6587\u4EF6\uFF0C\u53EF\u4ECE\u6587\u4EF6\u91CD\u65B0\u5BFC\u5165\u3002" })
    ] })
  ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CredentialForm, { modal, provider, data, busy, act, close, error, notice }, modal.mode);
}
function CredentialTransfer({ account, busy, act }) {
  const container = (0, import_react.useRef)(null), [pending, setPending] = (0, import_react.useState)(false), [notice, setNotice] = (0, import_react.useState)(""), [error, setError] = (0, import_react.useState)(""), [manual, setManual] = (0, import_react.useState)("");
  async function extract(copy) {
    if (pending || busy) return;
    setPending(true);
    setNotice("");
    setError("");
    setManual("");
    try {
      const result = await act({ action: "account.export", id: account.id });
      if (!result) return;
      if (!copy) {
        downloadJson(result.exported);
        setNotice("\u5DF2\u53D1\u8D77\u51ED\u8BC1 JSON \u4E0B\u8F7D\uFF0C\u5728\u5176\u4ED6\u8BBE\u5907\u6DFB\u52A0\u8D26\u53F7\u65F6\u9009\u62E9\u8BE5\u6587\u4EF6\u5373\u53EF\u3002");
        return;
      }
      const text = JSON.stringify(result.exported.document, null, 2);
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const focus = document.activeElement, area = document.createElement("textarea");
        area.value = text;
        area.style.cssText = "position:fixed;opacity:0;pointer-events:none";
        container.current.append(area);
        area.select();
        let copied = false;
        try {
          copied = document.execCommand("copy");
        } catch {
        } finally {
          area.remove();
          focus?.focus();
        }
        if (!copied) {
          setManual(text);
          setNotice("\u5F53\u524D\u73AF\u5883\u4E0D\u5141\u8BB8\u81EA\u52A8\u590D\u5236\uFF0C\u8BF7\u70B9\u51FB\u4E0B\u65B9\u6587\u672C\u6846\u5168\u9009\u5E76\u590D\u5236\u3002");
          return;
        }
      }
      setNotice("\u51ED\u8BC1 JSON \u5DF2\u590D\u5236\uFF0C\u53EF\u5728\u5176\u4ED6\u8BBE\u5907\u6DFB\u52A0\u8D26\u53F7\u65F6\u76F4\u63A5\u7C98\u8D34\u3002");
    } catch {
      setError("\u51ED\u8BC1\u63D0\u53D6\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002");
    } finally {
      setPending(false);
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { ref: container, className: "box stack", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u51ED\u8BC1\u63D0\u53D6\u4E0E\u8DE8\u8BBE\u5907\u4F7F\u7528" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u5355\u8D26\u53F7 JSON \u5305\u542B\u767B\u5F55 Token / PAT\uFF0CTrae \u540C\u65F6\u5305\u542B\u5FC5\u8981\u8BBE\u5907\u8EAB\u4EFD\u3002\u590D\u5236\u53CA\u6B64\u5904\u5BFC\u51FA\u4E3A\u660E\u6587\uFF0C\u8BF7\u4EC5\u5728\u81EA\u5DF1\u7684\u8BBE\u5907\u95F4\u4F20\u9012\uFF1B\u9700\u8981\u52A0\u5BC6\u65F6\u4F7F\u7528\u300C\u914D\u7F6E\u8FC1\u79FB\u300D\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy || pending, onClick: () => {
        void extract(true);
      }, children: "\u590D\u5236\u51ED\u8BC1 JSON" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy || pending, onClick: () => {
        void extract(false);
      }, children: "\u5BFC\u51FA\u51ED\u8BC1 JSON" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feedback, { error, notice }),
    manual && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
      "\u624B\u52A8\u590D\u5236\u51ED\u8BC1 JSON",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { readOnly: true, rows: "5", autoComplete: "off", spellCheck: "false", value: manual, onFocus: (e) => e.currentTarget.select() })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u65B0\u8BBE\u5907\uFF1A\u6DFB\u52A0\u8D26\u53F7 \u2192 \u7C98\u8D34 / \u9009\u62E9\u51ED\u8BC1 JSON \u2192 \u4FDD\u5B58\u3002\u5E73\u53F0\u8981\u6C42\u91CD\u65B0\u767B\u5F55\u65F6\uFF0C\u9700\u66F4\u65B0\u51ED\u8BC1\u3002" })
  ] });
}
function CredentialForm({ modal, provider, data, busy, act, close, error, notice }) {
  const replacing = modal.mode === "credentials";
  const [selected, setSelected] = (0, import_react.useState)(modal.account?.provider || provider), [mode, setMode] = (0, import_react.useState)("client"), [localError, setLocalError] = (0, import_react.useState)(""), [json, setJson] = (0, import_react.useState)("");
  const [edition, setEdition] = (0, import_react.useState)(modal.account?.login?.edition || "auto");
  const isTrae = selected.startsWith("trae"), isQoder = selected.startsWith("qoder"), global = selected === "trae-global" || selected === "workbuddy-ai" || selected === "qoder-global";
  const field = (label, name2, type = "text", required = true, value) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
    label,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { name: name2, type, autoComplete: "off", required, defaultValue: value, disabled: busy })
  ] });
  function receiveJson(text) {
    setJson(text);
    setLocalError("");
    try {
      const parsed = JSON.parse(text);
      if (!replacing && parsed.format === "dsh-multi-router-account" && data.providers.some((p) => p.id === parsed.provider)) {
        setSelected(parsed.provider);
        setEdition(parsed.credential?.edition || (parsed.provider === "trae-global" ? "sg" : "cn"));
      }
    } catch {
    }
  }
  async function submit(e) {
    e.preventDefault();
    setLocalError("");
    const f = Object.fromEntries(new FormData(e.currentTarget));
    let document2, identityDocument;
    try {
      if (mode === "json") {
        document2 = JSON.parse(json);
        if (f.identityJSON?.trim()) identityDocument = JSON.parse(f.identityJSON);
      }
      if (mode === "manual") {
        if (isQoder) document2 = { version: 2, pat: f.pat.trim(), region: global ? "global" : "china" };
        else {
          const credential = {
            accessToken: f.accessToken.trim(),
            ...f.refreshToken?.trim() ? { refreshToken: f.refreshToken.trim() } : {},
            expiresAtMs: new Date(f.expiresAt).getTime(),
            ...f.refreshExpiresAt ? { refreshExpiresAtMs: new Date(f.refreshExpiresAt).getTime() } : {},
            ...isTrae ? { userId: f.identityId.trim(), edition, host: global ? "https://growsg-normal.trae.ai" : "https://api.trae.cn" } : { uid: f.identityId.trim(), domain: f.domain.trim() }
          };
          document2 = { version: 1, credential };
          if (isTrae) identityDocument = { edition, machineId: f.machineId.trim(), deviceId: f.deviceId.trim() };
        }
      }
    } catch {
      setLocalError("JSON \u683C\u5F0F\u65E0\u6548\uFF0C\u8BF7\u68C0\u67E5\u51ED\u8BC1\u53CA\u8BBE\u5907\u8EAB\u4EFD JSON\u3002");
      return;
    }
    const action = replacing ? "account.credentials" : "account.capture";
    if (await act({
      action,
      revision: modal.revision,
      id: modal.account?.id,
      provider: selected,
      edition,
      name: f.name || (document2?.format === "dsh-multi-router-account" ? document2.name : void 0),
      ...document2 ? { document: document2, identityDocument } : { source: f.source || void 0, identity: f.identity || void 0 }
    })) {
      setJson("");
      close(selected);
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: submit, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-body stack", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feedback, { error: localError || error, notice }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          "\u4F9B\u5E94\u5546 / \u533A\u57DF",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { disabled: busy || replacing, value: selected, onChange: (e) => {
            setSelected(e.target.value);
            setEdition("auto");
            setJson("");
            setLocalError("");
          }, children: data.providers.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: p.id, children: p.name }, p.id)) })
        ] }),
        field("\u8D26\u53F7\u540D\u79F0\uFF08\u53EF\u9009\uFF09", "name", "text", false, modal.account?.name),
        isTrae && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          "\u767B\u5F55\u7684\u5BA2\u6237\u7AEF",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { value: edition, disabled: busy, onChange: (e) => setEdition(e.target.value), children: (mode === "client" ? [["auto", "\u81EA\u52A8\u8BC6\u522B\uFF08\u63A8\u8350\uFF09"], ...global ? [["sg", "Trae Global"], ["solo-sg", "TRAE SOLO Global"]] : [["cn", "Trae CN"], ["solo", "TRAE SOLO CN"]]] : global ? [["sg", "Trae Global"], ["solo-sg", "TRAE SOLO Global"]] : [["cn", "Trae CN"], ["solo", "TRAE SOLO CN"]]).map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: id, children: label }, id)) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        "\u51ED\u8BC1\u6DFB\u52A0\u65B9\u5F0F",
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { disabled: busy, value: mode, onChange: (e) => {
          setMode(e.target.value);
          if (e.target.value !== "client" && edition === "auto") setEdition(global ? "sg" : "cn");
          setJson("");
          setLocalError("");
        }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "client", children: "\u4E00\u952E\u8BFB\u53D6\u672C\u673A\u767B\u5F55" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", { value: "manual", children: [
            "\u624B\u52A8\u586B\u5199",
            isQoder ? " PAT" : "\u51ED\u8BC1"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "json", children: "\u7C98\u8D34 / \u9009\u62E9\u51ED\u8BC1 JSON" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "steps stack", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u83B7\u53D6\u51ED\u8BC1\u5F15\u5BFC" }),
        isQoder ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u5728\u5BF9\u5E94\u56FD\u5185 / \u56FD\u9645\u7AD9\u7684\u8D26\u53F7\u8BBE\u7F6E\u4E2D\u521B\u5EFA PAT\uFF0C\u7136\u540E\u9009\u62E9\u300C\u624B\u52A8\u586B\u5199 PAT\u300D\u7C98\u8D34\u3002\u5DF2\u6709\u65E7\u8FDE\u63A5\u5668\u767B\u5F55\u65F6\uFF0C\u53EF\u4E00\u952E\u8BFB\u53D6\u672C\u673A\u4FDD\u5B58\u7684 PAT\u3002\u7F51\u9875\u767B\u5F55 Cookie \u4E0D\u4F5C\u4E3A PAT \u4F7F\u7528\u3002" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
          "1. \u5728\u6240\u9009\u533A\u57DF\u7684\u5B98\u65B9\u5BA2\u6237\u7AEF\u767B\u5F55\u8D26\u53F7\u3002",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
          "2. \u56DE\u5230\u672C\u9762\u677F\uFF0C\u9009\u62E9\u300C\u4E00\u952E\u8BFB\u53D6\u672C\u673A\u767B\u5F55\u300D\u5E76\u70B9\u51FB\u5E95\u90E8\u6309\u94AE\u3002",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
          "3. \u6DFB\u52A0\u53E6\u4E00\u4E2A\u8D26\u53F7\u65F6\uFF0C\u5148\u5728\u5BA2\u6237\u7AEF\u5207\u6362\u767B\u5F55\uFF0C\u518D\u91CD\u590D\u8BFB\u53D6\uFF1B\u5DF2\u6DFB\u52A0\u7684\u8D26\u53F7\u4F1A\u4FDD\u7559\u72EC\u7ACB\u526F\u672C\u3002"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "row", children: isQoder ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { className: "link", href: "https://docs.qoder.com/cli/authentication", target: "_blank", rel: "noreferrer", children: "\u5B98\u65B9 PAT \u83B7\u53D6\u8BF4\u660E" }),
          global && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { className: "link", href: "https://qoder.com/account/integrations", target: "_blank", rel: "noreferrer", children: "\u6253\u5F00 PAT \u7BA1\u7406\u9875" })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { className: "link", href: isTrae ? global ? "https://www.trae.ai/" : "https://www.trae.cn/" : global ? "https://www.codebuddy.ai/" : "https://www.codebuddy.cn/", target: "_blank", rel: "noreferrer", children: "\u6253\u5F00\u5B98\u65B9\u5BA2\u6237\u7AEF\u7F51\u7AD9" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u8DE8\u8BBE\u5907\u5DF2\u6709\u51ED\u8BC1\u6587\u4EF6\u65F6\u53EF\u9009\u62E9 JSON\uFF1BWorkBuddy \u9700\u8981 accessToken\u3001uid\u3001domain\u3001expiresAtMs\uFF1BTrae \u8FD8\u9700\u8981 userId\u3001edition\uFF0C\u4EE5\u53CA\u540C\u8D26\u53F7\u7684 machineId / deviceId\u3002\u63A8\u8350\u8BFB\u53D6\u5BA2\u6237\u7AEF\u6216\u4F7F\u7528\u52A0\u5BC6\u914D\u7F6E\u8FC1\u79FB\uFF0C\u4E0D\u9700\u8981\u731C\u6D4B\u5B57\u6BB5\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stack", children: [
        mode === "manual" && (isQoder ? field("Qoder PAT", "pat", "password") : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid", children: [
          field("Access Token", "accessToken", "password"),
          field("Refresh Token\uFF08\u53EF\u9009\uFF09", "refreshToken", "password", false),
          field(isTrae ? "User ID" : "UID", "identityId"),
          field("Access Token \u6709\u6548\u81F3", "expiresAt", "datetime-local"),
          field("Refresh Token \u6709\u6548\u81F3\uFF08\u53EF\u9009\uFF09", "refreshExpiresAt", "datetime-local", false),
          !isTrae && field("\u767B\u5F55 Domain", "domain", "text", false, global ? "www.codebuddy.ai" : "www.codebuddy.cn"),
          isTrae && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            field("Machine ID", "machineId"),
            field("Device ID", "deviceId")
          ] })
        ] })),
        mode === "json" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u672C\u63D2\u4EF6\u590D\u5236 / \u5BFC\u51FA\u7684\u5355\u8D26\u53F7 JSON \u4F1A\u81EA\u52A8\u8BC6\u522B\u4F9B\u5E94\u5546\u3001\u533A\u57DF\u53CA\u8D26\u53F7\u540D\u79F0\uFF1BTrae \u8BBE\u5907\u8EAB\u4EFD\u968F\u6587\u4EF6\u5BFC\u5165\u3002" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
            "\u9009\u62E9\u51ED\u8BC1 JSON \u6587\u4EF6",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "file", accept: ".json,application/json", disabled: busy, onChange: async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 256 * 1024) {
                setLocalError("\u51ED\u8BC1\u6587\u4EF6\u4E0D\u80FD\u8D85\u8FC7 256 KB");
                return;
              }
              try {
                receiveJson(await file.text());
              } catch {
                setLocalError("\u65E0\u6CD5\u8BFB\u53D6\u6587\u4EF6");
              }
            } })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
            "\u51ED\u8BC1 JSON",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { rows: "7", required: true, autoComplete: "off", spellCheck: "false", disabled: busy, value: json, onChange: (e) => receiveJson(e.target.value), placeholder: isQoder ? '{"pat":"\u2026","region":"china"}' : '{"version":1,"credential":{"accessToken":"\u2026", "expiresAtMs":\u2026}}' })
          ] }),
          isTrae && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
            "Trae \u8BBE\u5907\u8EAB\u4EFD JSON\uFF08\u51ED\u8BC1\u4E2D\u5DF2\u6709 identity \u65F6\u53EF\u7559\u7A7A\uFF09",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { name: "identityJSON", rows: "3", disabled: busy, autoComplete: "off", placeholder: '{"edition":"cn","machineId":"\u2026","deviceId":"\u2026"}' })
          ] })
        ] }),
        mode === "client" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "\u9AD8\u7EA7\uFF1A\u6307\u5B9A\u767B\u5F55\u6587\u4EF6\u4F4D\u7F6E" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stack", style: { marginTop: 12 }, children: [
            field("\u767B\u5F55 / PAT \u6587\u4EF6\u8DEF\u5F84\uFF08\u9ED8\u8BA4\u81EA\u52A8\u67E5\u627E\uFF09", "source", "text", false),
            isTrae && field("Trae \u8BBE\u5907\u8EAB\u4EFD\u6587\u4EF6\u8DEF\u5F84\uFF08\u53EF\u9009\uFF09", "identity", "text", false)
          ] })
        ] })
      ] }, `${selected}:${mode}`),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
        "\u51ED\u8BC1\u4EC5\u4FDD\u5B58\u5230\u672C\u673A\u63D2\u4EF6\u8D26\u53F7\u6C60\u3002\u4E0D\u4F1A\u5728\u8D26\u53F7\u5217\u8868\u663E\u793A Token\uFF1B\u6BCF\u4E2A\u8D26\u53F7\u72EC\u7ACB\u5237\u65B0\u3002",
        replacing ? "\u4FDD\u5B58\u540E\u542F\u7528\u6B64\u8D26\u53F7\uFF0C\u539F\u51ED\u8BC1\u526F\u672C\u4FDD\u7559\u3002" : "\u91CD\u590D\u8BFB\u53D6\u540C\u4E00\u8D26\u53F7\u4F1A\u63D0\u793A\u3002"
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-foot bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy, onClick: close, children: "\u53D6\u6D88" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "primary", type: "submit", disabled: busy, children: busy ? "\u6B63\u5728\u5904\u7406\u2026" : mode === "client" ? "\u4E00\u952E\u83B7\u53D6\u5E76\u4FDD\u5B58\u767B\u5F55" : "\u4FDD\u5B58\u51ED\u8BC1\u5E76\u83B7\u53D6\u6A21\u578B" })
    ] })
  ] });
}
function MigrationForm({ data, act, busy }) {
  const [include, setInclude] = (0, import_react.useState)(false), [exportPassword, setExportPassword] = (0, import_react.useState)(""), [confirmPassword, setConfirmPassword] = (0, import_react.useState)(""), [exportError, setExportError] = (0, import_react.useState)("");
  const [document2, setDocument] = (0, import_react.useState)(""), [fileName, setFileName] = (0, import_react.useState)(""), [password, setPassword] = (0, import_react.useState)(""), [mode, setMode] = (0, import_react.useState)("merge"), [preview, setPreview] = (0, import_react.useState)(null), [error, setError] = (0, import_react.useState)("");
  const resetPreview = () => {
    setPreview(null);
    setError("");
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { className: "box stack", onSubmit: async (e) => {
      e.preventDefault();
      setExportError("");
      if (include && exportPassword !== confirmPassword) {
        setExportError("\u4E24\u6B21\u8FC1\u79FB\u5BC6\u7801\u4E0D\u4E00\u81F4");
        return;
      }
      const result = await act({ action: "config.export", includeCredentials: include, password: include ? exportPassword : void 0 });
      if (!result) return;
      downloadJson(result.exported);
      setExportPassword("");
      setConfirmPassword("");
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u5BFC\u51FA\u5230\u5176\u4ED6\u8BBE\u5907" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u5305\u542B\u8D26\u53F7\u540D\u79F0\u548C\u987A\u5E8F\u3001\u6A21\u578B\u5C55\u793A\u8BBE\u7F6E\u3001\u8DEF\u7531\u4E0E\u5207\u6362\u89C4\u5219\u3002\u4E0D\u4F1A\u5BFC\u51FA\u4F1A\u8BDD\u3001\u7EDF\u8BA1\u3001\u6587\u4EF6\u8DEF\u5F84\u6216\u7BA1\u7406\u5BC6\u94A5\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: include, disabled: busy, onChange: (e) => {
          setInclude(e.target.checked);
          setExportPassword("");
          setConfirmPassword("");
        } }),
        "\u540C\u65F6\u8FC1\u79FB\u8D26\u53F7\u767B\u5F55\u51ED\u8BC1\uFF08\u5BC6\u7801\u52A0\u5BC6\uFF09"
      ] }),
      include ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "steps", children: "\u52A0\u5BC6\u6587\u4EF6\u5305\u542B\u767B\u5F55 Token / PAT \u548C\u5FC5\u8981\u8BBE\u5907\u8EAB\u4EFD\uFF0C\u8BF7\u81EA\u884C\u4FDD\u7BA1\u3002\u65B0\u8BBE\u5907\u9700\u8981\u540C\u4E00\u5BC6\u7801\uFF1B\u51ED\u8BC1\u53EF\u80FD\u56E0\u5E73\u53F0\u8BBE\u5907\u9650\u5236\u800C\u9700\u8981\u91CD\u65B0\u767B\u5F55\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          "\u8BBE\u7F6E\u8FC1\u79FB\u5BC6\u7801",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "password", autoComplete: "new-password", required: true, minLength: "10", maxLength: "1024", value: exportPassword, disabled: busy, onChange: (e) => setExportPassword(e.target.value) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          "\u518D\u6B21\u8F93\u5165\u5BC6\u7801",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "password", autoComplete: "new-password", required: true, value: confirmPassword, disabled: busy, onChange: (e) => setConfirmPassword(e.target.value) })
        ] })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "steps", children: "\u4EC5\u914D\u7F6E\u6587\u4EF6\u4E0D\u542B\u767B\u5F55\u51ED\u8BC1\u3002\u65B0\u8BBE\u5907\u4E0A\u7684\u8D26\u53F7\u4F1A\u5148\u505C\u7528\uFF0C\u8865\u5145\u51ED\u8BC1\u540E\u5373\u53EF\u542F\u7528\uFF1B\u5408\u5E76\u5BFC\u5165\u4F1A\u4FDD\u7559\u672C\u673A\u5DF2\u6709\u8D26\u53F7\u51ED\u8BC1\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feedback, { error: exportError }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "primary", type: "submit", disabled: busy, children: include ? "\u5BFC\u51FA\u52A0\u5BC6\u8FC1\u79FB\u6587\u4EF6" : "\u5BFC\u51FA\u914D\u7F6E JSON" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { className: "box stack", onSubmit: async (e) => {
      e.preventDefault();
      setError("");
      const result = await act({ action: "config.preview", document: document2, password, mode });
      if (result) setPreview({ ...result.importPreview, revision: result.revision });
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u5BFC\u5165\u63D2\u4EF6\u914D\u7F6E" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        "\u9009\u62E9\u8FC1\u79FB JSON \u6587\u4EF6",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "file", accept: ".json,application/json", required: true, disabled: busy, onChange: async (e) => {
          resetPreview();
          setPassword("");
          setDocument("");
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 900 * 1024) {
            setError("\u8FC1\u79FB\u6587\u4EF6\u4E0D\u80FD\u8D85\u8FC7 900 KB");
            return;
          }
          try {
            setDocument(await file.text());
            setFileName(file.name);
          } catch {
            setError("\u65E0\u6CD5\u8BFB\u53D6\u6587\u4EF6");
          }
        } })
      ] }),
      fileName && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "mono muted", children: fileName }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        "\u8FC1\u79FB\u5BC6\u7801\uFF08\u4EC5\u52A0\u5BC6\u6587\u4EF6\u9700\u8981\uFF09",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "password", autoComplete: "off", maxLength: "1024", disabled: busy, value: password, onChange: (e) => {
          setPassword(e.target.value);
          resetPreview();
        } })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        "\u5BFC\u5165\u65B9\u5F0F",
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { disabled: busy, value: mode, onChange: (e) => {
          setMode(e.target.value);
          resetPreview();
        }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "merge", children: "\u5408\u5E76\uFF1A\u4FDD\u7559\u672C\u673A\u989D\u5916\u8D26\u53F7\u548C\u8DEF\u7531" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "replace", children: "\u66FF\u6362\uFF1A\u4F7F\u7528\u5BFC\u5165\u6587\u4EF6\u7684\u5B8C\u6574\u914D\u7F6E" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u5408\u5E76\u65F6\u540C ID \u7684\u914D\u7F6E\u4F1A\u66F4\u65B0\uFF1B\u5E26\u51ED\u8BC1\u7684\u8D26\u53F7\u4F1A\u66F4\u65B0\u767B\u5F55\u526F\u672C\u3002\u66FF\u6362\u4F1A\u79FB\u51FA\u73B0\u6709\u914D\u7F6E\u4E2D\u7684\u989D\u5916\u8D26\u53F7 / \u8DEF\u7531\uFF0C\u4F46\u4FDD\u7559\u539F\u51ED\u8BC1\u6587\u4EF6\u3002\u4E24\u79CD\u65B9\u5F0F\u90FD\u4F1A\u5148\u5907\u4EFD\u672C\u673A\u914D\u7F6E\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feedback, { error }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", disabled: busy || !document2, children: "\u68C0\u67E5\u6587\u4EF6\u5E76\u9884\u89C8\u53D8\u66F4" }),
      preview && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "steps stack", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u5BFC\u5165\u9884\u89C8" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
          preview.accounts,
          " \u4E2A\u8D26\u53F7\uFF08\u65B0\u589E ",
          preview.newAccounts,
          "\uFF09 \xB7 ",
          preview.credentials,
          " \u4EFD\u51ED\u8BC1",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
          preview.routes,
          " \u6761\u8DEF\u7531 \xB7 \u66F4\u65B0\u540C\u540D\u8DEF\u7531 ",
          preview.overwrittenRoutes,
          " \u6761",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
          preview.needsLogin,
          " \u4E2A\u65B0\u8D26\u53F7\u9700\u8865\u5145\u767B\u5F55\uFF0C\u5C06\u5148\u505C\u7528"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "primary", type: "button", disabled: busy, onClick: async () => {
          if (await act({ action: "config.import", revision: preview.revision, document: document2, password, mode })) {
            setDocument("");
            setPassword("");
            setPreview(null);
          }
        }, children: [
          "\u786E\u8BA4",
          mode === "merge" ? "\u5408\u5E76" : "\u66FF\u6362",
          "\u5E76\u5BFC\u5165"
        ] })
      ] })
    ] })
  ] });
}
function ExpiryStatus({ route, act, busy, revision, onForce }) {
  const status = route.expiringStatus || {}, cooling = status.cooldownUntil > Date.now();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "steps stack", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: cooling ? `\u4E34\u671F\u4F18\u5148\u51B7\u5374\u4E2D \xB7 \u5269\u4F59\u7EA6 ${Math.ceil((status.cooldownUntil - Date.now()) / 36e5)} \u5C0F\u65F6\uFF0C${when(status.cooldownUntil)} \u540E\u6062\u590D` : `\u4E34\u671F\u4F18\u5148\u5DF2\u5C31\u7EEA \xB7 \u7B2C ${status.number || 1} \u8F6E${status.accounts?.length ? ` \xB7 \u5DF2\u5B8C\u6210 ${status.completed?.length || 0} / ${status.accounts.length} \u4E2A\u8D26\u53F7` : ""}` }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u6240\u6709\u4E34\u671F\u8D26\u53F7\u7684\u79EF\u5206\u8017\u5C3D\u6216\u8FBE\u5230\u6BCF\u8F6E\u989D\u5EA6\u540E\uFF0C\u4E34\u671F\u4F18\u5148\u6682\u505C 3 \u5929\uFF1B\u671F\u95F4\u6309\u666E\u901A\u8DEF\u7531\u89C4\u5219\u8FD0\u884C\uFF0C\u91CD\u542F\u540E\u51B7\u5374\u4ECD\u4FDD\u7559\u3002" }),
    cooling && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy, onClick: async () => {
      const result = await act({ action: "route.force-expiring", id: route.id, revision });
      if (result) onForce?.(result);
    }, children: "\u5F3A\u5236\u5F00\u542F\u5E76\u5F00\u59CB\u65B0\u4E00\u8F6E" }),
    cooling && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u5F3A\u5236\u5F00\u542F\u4F1A\u6E05\u9664\u4E34\u671F\u51B7\u5374\uFF0C\u5E76\u91CD\u7F6E\u672C\u8DEF\u7531\u7684\u672C\u8F6E\u989D\u5EA6\u8BA1\u6570\uFF1B\u7D2F\u8BA1\u7528\u91CF\u4FDD\u7559\u3002" })
  ] });
}
function FreeStatus({ route, busy, act, onUpdate }) {
  const status = route.freeStatus, accounts = status?.accounts || [], count = accounts.reduce((n, a) => n + a.models.length, 0);
  const models = status?.modelRoutes || [];
  const update = async (model, patch) => {
    const next = await act({ action: "free.model.update", parentId: route.id, id: model.id, ...patch });
    if (next) onUpdate?.(next);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "steps stack", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: [
        "\u514D\u8D39\u6A21\u578B \xB7 ",
        models.length,
        " \u79CD \xB7 ",
        count,
        " \u4E2A\u8D26\u53F7 / \u6A21\u578B\u7EC4\u5408"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy || status?.checking, onClick: () => {
        void act({ action: "free.refresh" });
      }, children: status?.checking ? "\u6B63\u5728\u68C0\u67E5\u2026" : "\u7ACB\u5373\u68C0\u67E5\u514D\u8D39\u6A21\u578B" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u6309\u6A21\u578B\u81EA\u52A8\u521B\u5EFA\u8DEF\u7531\uFF0C\u52FE\u9009\u540E\u5206\u522B\u51FA\u73B0\u5728 DSH \u6A21\u578B\u5217\u8868\u4E2D\u3002\u540C\u4E00\u6A21\u578B\u53EA\u5728\u6709\u514D\u8D39\u8D44\u683C\u4E14\u652F\u6301\u6240\u9009\u63A8\u7406\u7B49\u7EA7\u7684\u8D26\u53F7\u95F4\u5207\u6362\uFF0C\u4E0D\u6DF7\u7528\u5176\u4ED6\u6A21\u578B\u3002\u6BCF\u5929\u68C0\u67E5\uFF0C\u8C03\u7528\u524D\u590D\u6838\uFF1B\u6062\u590D\u6536\u8D39\u6216\u68C0\u67E5\u5931\u8D25\u65F6\u81EA\u52A8\u79FB\u51FA\uFF0C\u514D\u8D39\u6062\u590D\u540E\u4FDD\u7559\u4F60\u7684\u52FE\u9009\u548C\u6863\u4F4D\u8BBE\u7F6E\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "grid", children: models.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "box stack", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: m.modelName }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", "aria-label": `\u5C55\u793A ${m.modelName}`, disabled: busy, checked: m.selected, onChange: (e) => {
            void update(m, { visible: e.target.checked });
          } }),
          "\u5C55\u793A"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
        m.name.split(" \xB7 ").at(-1),
        " \xB7 ",
        m.accountNames.join("\u3001"),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
        "\u4E0A\u4E0B\u6587 ",
        fmt(m.contextWindow / 1e3),
        "K \xB7 \u8F93\u51FA ",
        fmt(m.maxTokens / 1e3),
        "K"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        "\u9ED8\u8BA4\u63A8\u7406\u7B49\u7EA7 \xB7 ",
        m.modelName,
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { disabled: busy || !m.reasoning?.supportedEfforts?.length, value: m.effortUnavailable ? "" : m.configuredEffort || "", onChange: (e) => {
          void update(m, { reasoningEffort: e.target.value || null });
        }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u5E73\u53F0\u9ED8\u8BA4" }),
          m.reasoning?.supportedEfforts?.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: e, children: effortNames[e] || e }, e))
        ] })
      ] }),
      !m.reasoning?.supportedEfforts?.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u5E73\u53F0\u672A\u58F0\u660E\u53EF\u8C03\u6863\u4F4D\uFF0C\u4F7F\u7528\u5E73\u53F0\u9ED8\u8BA4\u3002" }),
      m.effortUnavailable && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u4E4B\u524D\u9009\u62E9\u7684\u6863\u4F4D\u6682\u4E0D\u53EF\u7528\uFF0C\u5F53\u524D\u4F7F\u7528\u5E73\u53F0\u9ED8\u8BA4\u3002" })
    ] }, m.id)) }),
    !models.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u6682\u65E0\u786E\u8BA4\u514D\u8D39\u7684\u6A21\u578B\u3002\u6DFB\u52A0\u5E76\u542F\u7528\u8D26\u53F7\uFF0C\u6216\u7ACB\u5373\u68C0\u67E5\u76EE\u5F55\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "\u5404\u8D26\u53F7\u68C0\u67E5\u72B6\u6001" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "stack", style: { marginTop: 12 }, children: accounts.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
          a.name,
          " \xB7 ",
          a.models.length ? a.models.map((m) => m.name).join("\u3001") : a.error ? "\u68C0\u67E5\u5931\u8D25\uFF0C\u6682\u4E0D\u53C2\u4E0E" : "\u6682\u65E0\u786E\u8BA4\u514D\u8D39\u7684\u6A21\u578B"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
          a.provider,
          " \xB7 \u4E0A\u6B21\u76EE\u5F55\u68C0\u67E5 ",
          when(a.checkedAt)
        ] })
      ] }, a.id)) })
    ] })
  ] });
}
function FreeRouteForm({ draft, setDraft, data, act, busy, error, notice }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: async (e) => {
    e.preventDefault();
    const { id, previousId, revision, reasoning, supportsImages, expiringStatus, freeStatus, ...route } = draft;
    route.targets = route.targets.map((t) => ({ provider: t.provider, ...t.account ? { account: t.account } : {}, ...t.model ? { model: t.model } : {}, ...t.models ? { models: t.models } : {} }));
    if (await act({ action: "route.save", id, previousId, revision, route })) setDraft(null);
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-body stack", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feedback, { error, notice }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        "\u7BA1\u7406\u7EC4\u540D\u79F0",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { required: true, maxLength: 200, disabled: busy, value: draft.name, onChange: (e) => setDraft((d) => ({ ...d, name: e.target.value })) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "Free \u7684\u6A21\u578B\u8DEF\u7531\u7531\u76EE\u5F55\u81EA\u52A8\u7EF4\u62A4\uFF0C\u65E0\u9700\u586B\u5199\u6A21\u578B ID\u3002\u8D26\u53F7\u542F\u505C\u5728\u300C\u8D26\u53F7\u4E0E\u767B\u5F55\u300D\u8C03\u6574\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FreeStatus, { route: data.routes.find((r) => r.id === draft.id) || draft, act, busy, onUpdate: (next) => setDraft((d) => ({ ...d, revision: next.revision, freeModels: next.routes.find((r) => r.id === d.id)?.freeModels })) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: draft.visible !== false, disabled: busy, onChange: (e) => setDraft((d) => ({ ...d, visible: e.target.checked })) }),
        "\u5C55\u793A\u52FE\u9009\u7684\u514D\u8D39\u6A21\u578B"
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-foot bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy, onClick: async () => {
        if (await act({ action: "route.remove", id: draft.id, revision: draft.revision })) setDraft(null);
      }, children: "\u79FB\u9664\u514D\u8D39\u7BA1\u7406\u7EC4" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "primary", disabled: busy, type: "submit", children: "\u4FDD\u5B58\u8BBE\u7F6E" })
    ] })
  ] });
}
function RouteForm({ draft, setDraft, data, act, busy, error, notice }) {
  if (draft.freeOnly) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FreeRouteForm, { draft, setDraft, data, act, busy, error, notice });
  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const target = (i, patch) => setDraft((d) => ({ ...d, targets: d.targets.map((t, index) => i === index ? { ...t, ...patch } : t) }));
  const move = (i, delta) => {
    const targets = [...draft.targets];
    [targets[i], targets[i + delta]] = [targets[i + delta], targets[i]];
    set("targets", targets);
  };
  const strategyHelp = { failover: "\u4F18\u5148\u4F7F\u7528\u524D\u9762\u7684\u8D26\u53F7\uFF1B\u9047\u5230 4xx \u540E\u6362\u4E0B\u4E00\u4E2A\uFF0C\u6210\u529F\u8D26\u53F7\u7EE7\u7EED\u627F\u63A5\u8BF7\u6C42\u3002", weighted: "\u6309\u6BCF\u4E2A\u8D26\u53F7\u7684\u6743\u91CD\u5206\u914D\u8BF7\u6C42\u3002\u4F8B\u5982 3:1\uFF0C\u957F\u671F\u7EA6 75%:25%\uFF1B\u77ED\u671F\u6BD4\u4F8B\u4E0E\u8BF7\u6C42\u957F\u5EA6\u53EF\u80FD\u4E0D\u540C\u3002", tokens: "\u6BCF\u4E2A\u8D26\u53F7\u7D2F\u8BA1\u8FBE\u5230\u672C\u8F6E Token \u989D\u5EA6\u540E\uFF0C\u4E0B\u4E00\u6B21\u8BF7\u6C42\u6362\u8D26\u53F7\u3002\u6240\u6709\u76EE\u6807\u7528\u5B8C\u989D\u5EA6\u540E\u5F00\u59CB\u65B0\u4E00\u8F6E\u3002", credits: "\u6309\u5E73\u53F0\u4F59\u989D\u4E0B\u964D\u8BA1\u7B97\u672C\u8F6E\u6D88\u8017\uFF0C\u8FBE\u5230\u9608\u503C\u540E\u6362\u8D26\u53F7\u3002\u4F59\u989D\u53EF\u80FD\u5305\u542B\u5176\u4ED6\u5E94\u7528\u7684\u6D88\u8D39\uFF1B\u79EF\u5206\u67E5\u8BE2\u5931\u8D25\u65F6\u6682\u4E0D\u4F7F\u7528\u8BE5\u8D26\u53F7\u3002" };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: async (e) => {
    e.preventDefault();
    if (draft.id !== "ds4.1f" && draft.targets.some((t) => !t.modelText.trim())) {
      e.currentTarget.querySelector("details")?.setAttribute("open", "");
      return;
    }
    const { id, previousId, revision, reasoning, supportsImages, expiringStatus, ...route } = draft;
    route.targets = route.targets.map((t) => {
      const models = t.modelText.split(",").map((x) => x.trim()).filter(Boolean);
      return { provider: t.provider, ...t.account ? { account: t.account } : {}, ...models.length ? { models } : {}, ...route.strategy === "weighted" ? { weight: Number(t.weight) } : {}, ...route.strategy === "tokens" ? { tokenBudget: Number(t.tokenBudget) } : {}, ...route.strategy === "credits" ? { creditBudget: Number(t.creditBudget) } : {} };
    });
    if (await act({ action: "route.save", id, previousId, revision, route })) setDraft(null);
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-body stack", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feedback, { error, notice }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        "\u8DEF\u7531\u540D\u79F0",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { required: true, maxLength: 200, value: draft.name, disabled: busy, onChange: (e) => set("name", e.target.value), placeholder: "\u4F8B\u5982 \u6211\u7684 Flash \u81EA\u52A8\u5207\u6362" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u540D\u79F0\u663E\u793A\u5728 DSH \u6A21\u578B\u5217\u8868\u4E2D\uFF0C\u53EF\u968F\u65F6\u4FEE\u6539\uFF0C\u4E0D\u5F71\u54CD\u5DF2\u6709\u4F1A\u8BDD\u7684\u8DEF\u7531\u9009\u62E9\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        "\u8D26\u53F7\u5207\u6362\u89C4\u5219",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { disabled: busy, value: draft.strategy, onChange: (e) => set("strategy", e.target.value), children: Object.entries(strategies).map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: id, children: label }, id)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "steps", children: [
        strategyHelp[draft.strategy],
        ["tokens", "credits"].includes(draft.strategy) && " \u6B63\u5728\u8F93\u51FA\u7684\u56DE\u7B54\u4F1A\u5B8C\u6210\uFF0C\u989D\u5EA6\u5141\u8BB8\u8D85\u8FC7\u6700\u540E\u4E00\u6B21\u8BF7\u6C42\u7684\u7528\u91CF\u3002"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "box stack", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", disabled: busy, checked: draft.preferExpiringCredits !== false, onChange: (e) => set("preferExpiringCredits", e.target.checked) }),
          "\u4F18\u5148\u4F7F\u7528\u4E34\u671F\u79EF\u5206\uFF08\u9ED8\u8BA4\u5F00\u542F\uFF09"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u4F18\u5148\u4F7F\u7528\u4ECD\u6709\u4F59\u989D\u4E14\u66F4\u65E9\u5230\u671F\u7684\u79EF\u5206\u5305\uFF1B\u4F18\u5148\u7EA7\u9AD8\u4E8E\u987A\u5E8F\u548C\u6743\u91CD\uFF0C\u4ECD\u9075\u5B88\u6BCF\u8F6E\u989D\u5EA6\u4E0E\u6545\u969C\u5207\u6362\u3002\u5E73\u53F0\u672A\u63D0\u4F9B\u6709\u6548\u671F\u6216\u7528\u91CF\u6570\u636E\u8FC7\u671F\u65F6\uFF0C\u6309\u666E\u901A\u89C4\u5219\u6267\u884C\u3002" }),
        draft.preferExpiringCredits !== false && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          "\u4E34\u671F\u8303\u56F4\uFF08\u5929\uFF09",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "number", disabled: busy, min: "1", max: "365", required: true, value: draft.expiringWithinDays ?? 7, onChange: (e) => set("expiringWithinDays", Number(e.target.value)) })
        ] })
      ] }),
      draft.preferExpiringCredits !== false && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExpiryStatus, { route: data.routes.find((r) => r.id === draft.previousId) || draft, busy, act, revision: draft.revision, onForce: (result) => setDraft((d) => ({ ...d, revision: result.revision, expiringStatus: result.routes.find((r) => r.id === draft.previousId)?.expiringStatus })) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u6A21\u578B\u4E0E\u8D26\u53F7\u76EE\u6807" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "notice", children: "\u6309\u4E0B\u65B9\u987A\u5E8F\u5207\u6362" })
      ] }),
      draft.targets.map((t, i) => {
        const models = data.providers.find((p) => p.id === t.provider)?.models || [];
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar target-head", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
              "\u76EE\u6807 ",
              i + 1
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy || i === 0, onClick: () => move(i, -1), children: "\u524D\u79FB" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy || i === draft.targets.length - 1, onClick: () => move(i, 1), children: "\u540E\u79FB" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy || draft.targets.length === 1, onClick: () => set("targets", draft.targets.filter((_, index) => index !== i)), children: "\u79FB\u9664" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
              "\u4F9B\u5E94\u5546",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { disabled: busy, value: t.provider, onChange: (e) => target(i, { provider: e.target.value, account: "", modelText: "" }), children: data.providers.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: p.id, children: p.name }, p.id)) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
              "\u4F7F\u7528\u8D26\u53F7",
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { disabled: busy, value: t.account || "", onChange: (e) => target(i, { account: e.target.value }), children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u6B64\u4F9B\u5E94\u5546\u5168\u90E8\u542F\u7528\u8D26\u53F7" }),
                data.accounts.filter((a) => a.provider === t.provider).map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: a.id, children: a.name }, a.id))
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "full", children: [
              "\u76EE\u6807\u6A21\u578B",
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { disabled: busy, required: draft.id !== "ds4.1f", value: t.modelText, onChange: (e) => {
                if (e.target.value) target(i, { modelText: e.target.value });
              }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u4ECE\u5DF2\u53D1\u73B0\u6A21\u578B\u4E2D\u9009\u62E9" }),
                t.modelText && !models.some((m) => m.id === t.modelText) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: t.modelText, children: t.modelText }),
                models.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", { value: m.id, children: [
                  m.name,
                  " \xB7 ",
                  m.id
                ] }, m.id))
              ] })
            ] }),
            draft.strategy === "weighted" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
              "\u6BCF\u4E2A\u8D26\u53F7\u7684\u6743\u91CD",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "number", disabled: busy, min: "1", max: "1000", required: true, value: t.weight, onChange: (e) => target(i, { weight: e.target.value }) })
            ] }),
            draft.strategy === "tokens" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
              "\u6BCF\u4E2A\u8D26\u53F7\u6BCF\u8F6E Token \u989D\u5EA6",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "number", disabled: busy, min: "1", step: "1", required: true, value: t.tokenBudget, onChange: (e) => target(i, { tokenBudget: e.target.value }) })
            ] }),
            draft.strategy === "credits" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
              "\u6BCF\u4E2A\u8D26\u53F7\u6BCF\u8F6E\u79EF\u5206\u6D88\u8017",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "number", disabled: busy, min: "0.01", step: "any", required: true, value: t.creditBudget, onChange: (e) => target(i, { creditBudget: e.target.value }) })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "\u9AD8\u7EA7\uFF1A\u624B\u52A8\u586B\u5199\u5019\u9009\u6A21\u578B ID" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { marginTop: 10 }, children: [
              "\u5019\u9009\u6A21\u578B ID\uFF08\u9017\u53F7\u5206\u9694\uFF09",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { disabled: busy, value: t.modelText, onChange: (e) => target(i, { modelText: e.target.value }), placeholder: "\u6309\u987A\u5E8F\u5339\u914D\u771F\u5B9E\u6A21\u578B\u76EE\u5F55" })
            ] })
          ] })
        ] }, t.key);
      }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy, onClick: () => set("targets", [...draft.targets, { provider: "workbuddy", account: "", key: crypto.randomUUID(), weight: 1, tokenBudget: 1e5, creditBudget: 100, modelText: "" }]), children: "\u6DFB\u52A0\u5207\u6362\u76EE\u6807" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "\u9AD8\u7EA7\uFF1A\u4E0A\u4E0B\u6587\u4E0E\u8F93\u51FA\u957F\u5EA6" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid", style: { marginTop: 12 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
            "\u4E0A\u4E0B\u6587\u957F\u5EA6",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "number", disabled: busy, min: "1", required: true, value: draft.contextWindow, onChange: (e) => set("contextWindow", Number(e.target.value)) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
            "\u6700\u5927\u8F93\u51FA\u957F\u5EA6",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "number", disabled: busy, min: "1", max: draft.contextWindow, required: true, value: draft.maxTokens, onChange: (e) => set("maxTokens", Number(e.target.value)) })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-foot bar", children: [
      draft.previousId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy, onClick: async () => {
        if (await act({ action: "route.remove", revision: draft.revision, id: draft.previousId })) setDraft(null);
      }, children: "\u79FB\u9664\u8DEF\u7531" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, type: "button", onClick: () => setDraft(null), children: "\u53D6\u6D88" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "primary", type: "submit", disabled: busy, children: busy ? "\u6B63\u5728\u4FDD\u5B58\u2026" : "\u4FDD\u5B58\u8DEF\u7531" })
    ] })
  ] });
}
function InitialSetup({ data, busy, act, go }) {
  const discovery = data.localDiscovery ?? [];
  const saved = discovery.reduce((n, s) => n + (s.savedCount ?? 0), 0);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", "aria-label": "\u9996\u6B21\u8D26\u53F7\u8BBE\u7F6E", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: [
          "\u672C\u673A\u8D26\u53F7\u81EA\u52A8\u83B7\u53D6",
          discovery.length ? "\u5DF2\u5B8C\u6210" : "\u5F85\u91CD\u8BD5"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: saved ? `\u5DF2\u4FDD\u5B58 ${saved} \u4E2A WorkBuddy / Trae \u672C\u673A\u767B\u5F55\uFF0C\u65E0\u9700\u518D\u6B21\u624B\u52A8\u6DFB\u52A0\u3002` : "\u6682\u672A\u4FDD\u5B58\u672C\u673A\u767B\u5F55\u3002\u5148\u5728\u5B98\u65B9\u5BA2\u6237\u7AEF\u767B\u5F55\uFF0C\u518D\u70B9\u51FB\u300C\u4E00\u952E\u83B7\u53D6\u5E76\u4FDD\u5B58\u300D\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
        void act({ action: "setup.dismiss" });
      }, children: "\u77E5\u9053\u4E86" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "providers", children: discovery.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "steps", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: data.providers.find((p) => p.id === s.provider)?.name ?? s.provider }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: (s.savedCount ?? 0) > 0 ? "good" : "notice", children: s.savedCount ? `\u5DF2\u4FDD\u5B58 ${s.savedCount} \u4E2A\u767B\u5F55` : s.state === "found" ? "\u68C0\u6D4B\u5230\u767B\u5F55\uFF1B\u5DF2\u5FFD\u7565\u6216\u5C1A\u672A\u4FDD\u5B58\uFF0C\u8BF7\u91CD\u65B0\u83B7\u53D6" : s.state === "unreadable" ? "\u767B\u5F55\u6587\u4EF6\u65E0\u6CD5\u8BFB\u53D6\uFF0C\u8BF7\u5728\u5BA2\u6237\u7AEF\u91CD\u65B0\u767B\u5F55\u540E\u91CD\u8BD5" : "\u672A\u68C0\u6D4B\u5230\u767B\u5F55\uFF0C\u8BF7\u5148\u767B\u5F55\u5B98\u65B9\u5BA2\u6237\u7AEF" })
    ] }, s.provider)) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "primary", disabled: busy, onClick: () => {
        void act({ action: "accounts.discover" });
      }, children: "\u4E00\u952E\u83B7\u53D6\u5E76\u4FDD\u5B58 WorkBuddy / Trae" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => go("accounts"), children: "\u67E5\u770B\u8D26\u53F7 / \u624B\u52A8\u6DFB\u52A0" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => go("routes"), children: "\u9009\u62E9\u8DEF\u7531\u6A21\u578B" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u9996\u6B21\u542F\u52A8\u81EA\u52A8\u6267\u884C\u4E00\u6B21\uFF0C\u4E4B\u540E\u6BCF\u5206\u949F\u68C0\u6D4B\u65B0\u589E\u767B\u5F55\u3002Qoder \u4F7F\u7528 PAT\uFF0C\u8BF7\u5230\u300C\u8D26\u53F7\u4E0E\u767B\u5F55\u300D\u6DFB\u52A0\uFF1B\u672A\u5B89\u88C5\u5BA2\u6237\u7AEF\u4E5F\u53EF\u4EE5\u624B\u52A8\u586B\u5199\u51ED\u8BC1\u3002" })
  ] });
}
var updateNames = { unchecked: "\u5F85\u68C0\u67E5", available: "\u53EF\u66F4\u65B0", current: "\u5DF2\u540C\u6B65", pinned: "\u56FA\u5B9A\u63D0\u4EA4", builtin: "\u968F DSH \u5347\u7EA7", unsupported: "\u672C\u5730\u6765\u6E90", failed: "\u68C0\u67E5 / \u5B89\u88C5\u5931\u8D25", installed: "\u5DF2\u5B89\u88C5" };
function PluginUpdatesPanel({ data, busy, act }) {
  const [query, setQuery] = (0, import_react.useState)(""), [selected, setSelected] = (0, import_react.useState)([]), [plan, setPlan] = (0, import_react.useState)(null), [registry, setRegistry] = (0, import_react.useState)(""), [filter, setFilter] = (0, import_react.useState)("all"), [pluginSearch, setPluginSearch] = (0, import_react.useState)("");
  const running = data?.job?.state === "running", blocked = busy || running;
  const rows = data?.rows ?? [], available = rows.filter((r) => r.status === "available" || r.status === "failed" && r.target);
  (0, import_react.useEffect)(() => {
    if (data?.available && !running) void act({ action: !data.checkedAt || Date.now() - data.checkedAt > 864e5 ? "plugins.check" : "plugins.list" });
  }, []);
  const chosen = available.filter((r) => selected.includes(r.name));
  const visibleRows = rows.filter((r) => r.name.toLowerCase().includes(pluginSearch.toLowerCase()) && (filter === "all" || (filter === "updates" ? available.includes(r) : r.source.kind === filter)));
  async function submitPlan() {
    if (await act(plan.kind === "install" ? { action: "plugins.install", spec: plan.spec, registry: registry || void 0 } : { action: "plugins.update", names: plan.rows.map((r) => r.name), registry: registry || void 0 })) {
      setPlan(null);
      setSelected([]);
    }
  }
  if (!data?.available) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u5F53\u524D DSH \u672A\u63D0\u4F9B\u63D2\u4EF6\u7BA1\u7406\u63A5\u53E3" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u8BF7\u5347\u7EA7 DeepSeek Harness \u540E\u91CD\u8BD5\u3002\u672C\u9875\u7BA1\u7406\u5F53\u524D DSH \u914D\u7F6E\u4E2D\u7684\u5168\u90E8\u5DF2\u5B89\u88C5\u63D2\u4EF6\u3002" })
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stack", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u5DF2\u5B89\u88C5\u63D2\u4EF6\u4E0E\u66F4\u65B0" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "npm \u6309\u7248\u672C / \u53D1\u5E03\u9891\u9053\u68C0\u67E5\uFF1BGitHub \u6309\u5206\u652F\u63D0\u4EA4\u68C0\u67E5\uFF0C\u7248\u672C\u53F7\u4E0D\u53D8\u4E5F\u80FD\u53D1\u73B0\u66F4\u65B0\u3002" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "primary", disabled: blocked, onClick: () => {
          void act({ action: "plugins.check" });
        }, children: "\u68C0\u67E5\u5168\u90E8\u66F4\u65B0" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
          rows.length,
          " \u4E2A\u5DF2\u5B89\u88C5\u63D2\u4EF6 \xB7 ",
          available.length,
          " \u4E2A\u53EF\u66F4\u65B0 \xB7 \u4E0A\u6B21\u68C0\u67E5 ",
          when(data.checkedAt)
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "filter", children: [
          "npm \u5B89\u88C5\u6E90",
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: registry, disabled: blocked, onChange: (e) => setRegistry(e.target.value), children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "DSH \u8BBE\u7F6E\uFF08\u542B\u56DE\u9000\u6765\u6E90\uFF09" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "https://registry.npmjs.org/", children: "npm \u5B98\u65B9" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "https://registry.npmmirror.com/", children: "npmmirror" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u66F4\u65B0\u6CBF\u7528\u539F npm / GitHub \u6765\u6E90\uFF0C\u5E76\u4FDD\u7559\u542F\u7528\u72B6\u6001\uFF1Bnpm \u56FA\u5B9A\u7248\u672C\u548C\u8303\u56F4\u5347\u7EA7\u5230\u6240\u5728\u9891\u9053\u7684\u6700\u65B0\u7248\u672C\uFF0CGit \u56FA\u5B9A\u63D0\u4EA4\u4FDD\u6301\u4E0D\u52A8\u3002\u5B98\u65B9\u5185\u7F6E\u7EC4\u4EF6\u968F DSH \u66F4\u65B0\u3002" })
    ] }),
    data.job && !(data.job.kind === "check" && data.job.state === "done") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", "aria-live": "polite", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: running ? data.job.kind === "check" ? "\u6B63\u5728\u68C0\u67E5\u66F4\u65B0\u2026" : "\u6B63\u5728\u5B89\u88C5\u63D2\u4EF6\u2026" : data.job.state === "cancelled" ? "\u64CD\u4F5C\u5DF2\u53D6\u6D88" : data.job.state === "failed" ? "\u64CD\u4F5C\u672A\u5B8C\u6210" : "\u64CD\u4F5C\u5DF2\u5B8C\u6210" }),
        running && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
          void act({ action: "plugins.cancel" });
        }, children: "\u53D6\u6D88" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("progress", { max: Math.max(1, data.job.total), value: data.job.results.length, "aria-label": "\u63D2\u4EF6\u64CD\u4F5C\u8FDB\u5EA6" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
        data.job.results.length,
        " / ",
        data.job.total,
        data.job.current ? ` \xB7 ${data.job.current}` : ""
      ] }),
      data.job.message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "error", children: data.job.message }),
      data.job.results.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "item", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: r.name }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: r.status === "failed" ? "error" : "notice", children: r.message || updateNames[r.status] || r.status }),
        r.pendingBuilds?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
          "\u5F85\u6388\u6743\u811A\u672C\uFF1A",
          r.pendingBuilds.join("\u3001"),
          "\u3002\u8BF7\u5728 DSH \u539F\u63D2\u4EF6\u5B89\u88C5\u9875\u6388\u6743\u540E\u91CD\u8BD5\u3002"
        ] })
      ] }, r.name + i)),
      data.job.results.some((r) => r.restartRequired) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "steps", children: "\u66F4\u65B0\u6587\u4EF6\u5DF2\u5B89\u88C5\u3002macOS \u4F7F\u7528 \u2318Q \u5B8C\u5168\u9000\u51FA DSH \u540E\u91CD\u5F00\uFF1BWindows \u9000\u51FA\u6258\u76D8\u5E94\u7528\u540E\u91CD\u5F00\uFF1B\u7F51\u9875\u7248\u91CD\u542F\u670D\u52A1\u3002\u5173\u95ED\u7A97\u53E3\u548C\u300C\u5237\u65B0\u9762\u677F\u300D\u4E0D\u4F1A\u91CD\u8F7D\u540E\u53F0\u3002" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: blocked || !available.length, onClick: () => setSelected(available.map((r) => r.name)), children: "\u9009\u62E9\u5168\u90E8\u53EF\u66F4\u65B0" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: blocked || !selected.length, onClick: () => setSelected([]), children: "\u6E05\u7A7A\u9009\u62E9" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "primary", disabled: blocked || !chosen.length, onClick: () => setPlan({ kind: "update", rows: chosen }), children: [
          "\u66F4\u65B0\u6240\u9009\uFF08",
          chosen.length,
          "\uFF09"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { flex: 1 }, children: [
          "\u641C\u7D22\u5DF2\u5B89\u88C5\u63D2\u4EF6",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: pluginSearch, onChange: (e) => setPluginSearch(e.target.value), placeholder: "\u6309\u63D2\u4EF6\u540D\u79F0\u7B5B\u9009" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "filter", children: [
          "\u663E\u793A\u8303\u56F4",
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: filter, onChange: (e) => setFilter(e.target.value), children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "all", children: "\u5168\u90E8\u5DF2\u5B89\u88C5\u63D2\u4EF6" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "updates", children: "\u53EF\u66F4\u65B0 / \u91CD\u8BD5" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "npm", children: "npm \u6765\u6E90" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "github", children: "GitHub \u6765\u6E90" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "builtin", children: "DSH \u5185\u7F6E\u7EC4\u4EF6" })
          ] })
        ] })
      ] }),
      visibleRows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "item stack", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", disabled: blocked || !available.includes(r), checked: selected.includes(r.name), onChange: (e) => setSelected(e.target.checked ? [...selected, r.name] : selected.filter((n) => n !== r.name)) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { className: "mono", children: r.name })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "badge", children: [
            updateNames[r.status],
            " \xB7 ",
            r.enabled ? "\u542F\u7528" : "\u505C\u7528"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: r.source.kind === "npm" ? `npm \xB7 ${r.version || "\u672A\u77E5"}${r.latestVersion ? " \u2192 " + r.latestVersion : ""} \xB7 ${r.source.tag}` : r.source.kind === "github" ? `GitHub \xB7 ${r.version || "\u672A\u77E5\u7248\u672C"} \xB7 ${r.commit?.slice(0, 8) || "\u672A\u77E5\u63D0\u4EA4"}${r.latestCommit ? " \u2192 " + r.latestCommit.slice(0, 8) : ""}` : r.source.kind === "builtin" ? `DSH \u5185\u7F6E\u7EC4\u4EF6 \xB7 ${r.version || "\u672A\u77E5\u7248\u672C"}` : "\u672C\u5730\u6587\u4EF6 / \u5F00\u53D1\u94FE\u63A5" }),
            r.source.kind === "github" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice mono", children: r.source.source }),
            r.message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: r.status === "failed" ? "notice error" : "notice", children: r.message })
          ] }),
          available.includes(r) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: blocked, onClick: () => setPlan({ kind: "update", rows: [r] }), children: "\u67E5\u770B\u5E76\u66F4\u65B0" })
        ] })
      ] }, r.name)),
      !visibleRows.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "empty", children: running ? "\u6B63\u5728\u8BFB\u53D6\u63D2\u4EF6\u6E05\u5355\u2026" : rows.length ? "\u6CA1\u6709\u5339\u914D\u7684\u5DF2\u5B89\u88C5\u63D2\u4EF6\uFF0C\u8BF7\u8C03\u6574\u7B5B\u9009\u3002" : "\u5F53\u524D\u914D\u7F6E\u5C1A\u672A\u8BFB\u53D6\u63D2\u4EF6\uFF0C\u8BF7\u68C0\u67E5\u66F4\u65B0\u3002" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u5B89\u88C5 npm / GitHub \u63D2\u4EF6" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { className: "row", onSubmit: (e) => {
        e.preventDefault();
        const spec = new FormData(e.currentTarget).get("spec").trim();
        if (spec) setPlan({ kind: "install", spec });
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { flex: 1 }, children: [
          "\u5B89\u88C5\u5730\u5740",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { name: "spec", value: query, onChange: (e) => setQuery(e.target.value), disabled: blocked, required: true, placeholder: "\u5305\u540D\u3001\u5305\u540D@\u7248\u672C \u6216 github:\u7528\u6237/\u4ED3\u5E93", autoComplete: "off" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: blocked || !query.trim(), children: "\u67E5\u770B\u5E76\u5B89\u88C5" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u4F7F\u7528 DSH \u81EA\u5E26\u5B89\u88C5\u5668\u6267\u884C\u517C\u5BB9\u68C0\u67E5\u3001\u955C\u50CF\u91CD\u8BD5\u548C\u5931\u8D25\u56DE\u6EDA\u3002npm \u955C\u50CF\u53EA\u4F5C\u7528\u4E8E npm \u5305\uFF0CGitHub \u4E0B\u8F7D\u5931\u8D25\u9700\u68C0\u67E5 GitHub \u7F51\u7EDC\u3002\u7F51\u7EDC\u5931\u8D25\u540E\u53EF\u91CD\u65B0\u68C0\u67E5\u6216\u66F4\u6362 npm \u5B89\u88C5\u6E90\u518D\u91CD\u8BD5\u3002" })
    ] }),
    plan && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, { title: plan.kind === "install" ? "\u786E\u8BA4\u5B89\u88C5\u63D2\u4EF6" : "\u786E\u8BA4\u66F4\u65B0\u63D2\u4EF6", close: () => setPlan(null), busy: blocked, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-body stack", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u8FD9\u4E9B\u64CD\u4F5C\u4F5C\u7528\u4E8E\u5F53\u524D DSH \u914D\u7F6E\u7684\u6240\u6709\u4F1A\u8BDD\u3002\u5B89\u88C5\u540E\u662F\u5426\u9700\u8981\u91CD\u542F\uFF0C\u4F1A\u5728\u7ED3\u679C\u4E2D\u8BF4\u660E\u3002" }),
        plan.kind === "install" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "mono", children: plan.spec }) : plan.rows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "steps", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: r.name }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "mono", children: r.target }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: r.source.kind === "npm" ? `${r.version || "\u672A\u77E5"} \u2192 ${r.latestVersion}` : `${r.commit?.slice(0, 8) || "\u672A\u77E5\u63D0\u4EA4"} \u2192 ${r.latestCommit?.slice(0, 8) || "\u672A\u77E5\u63D0\u4EA4"}` }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
            "\u4FDD\u7559\u4E3A",
            r.enabled ? "\u542F\u7528" : "\u505C\u7528",
            "\uFF1B",
            r.source.kind === "github" ? "\u7EE7\u7EED\u8DDF\u968F\u539F\u5206\u652F / \u6807\u7B7E" : "\u66F4\u65B0\u5230\u6240\u793A npm \u7248\u672C",
            "\u3002"
          ] })
        ] }, r.name)),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
          "npm \u5B89\u88C5\u6E90\uFF1A",
          registry || "\u6CBF\u7528 DSH \u8BBE\u7F6E"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-foot row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "primary", disabled: blocked, onClick: () => {
          void submitPlan();
        }, children: [
          "\u786E\u8BA4",
          plan.kind === "install" ? "\u5B89\u88C5" : "\u66F4\u65B0"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: blocked, onClick: () => setPlan(null), children: "\u53D6\u6D88" })
      ] })
    ] })
  ] });
}
return module.exports; } });
//# sourceMappingURL=client.js.map
