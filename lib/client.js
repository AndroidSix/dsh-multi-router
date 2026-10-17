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
  AccountPool: () => AccountPool,
  ApiServicePanel: () => ApiServicePanel,
  CheckinPanel: () => CheckinPanel,
  ContextSelect: () => ContextSelect,
  InitialSetup: () => InitialSetup,
  ModelSettings: () => ModelSettings,
  ModelsPanel: () => ModelsPanel,
  PluginUpdatesPanel: () => PluginUpdatesPanel,
  RestartGuidance: () => RestartGuidance,
  RouteReasoningSelect: () => RouteReasoningSelect,
  RouterPage: () => RouterPage,
  RoutesTable: () => RoutesTable,
  SidebarUsage: () => SidebarUsage,
  SidebarUsageCard: () => SidebarUsageCard,
  UpdateReminder: () => UpdateReminder,
  UsageDetails: () => UsageDetails,
  apply: () => apply,
  backendNeedsRestart: () => backendNeedsRestart,
  duration: () => duration,
  inject: () => inject,
  name: () => name,
  performanceSummary: () => performanceSummary,
  readManagementResponse: () => readManagementResponse,
  requestPluginReload: () => requestPluginReload,
  usageDateBounds: () => usageDateBounds
});
module.exports = __toCommonJS(client_exports);
var import_react = require("react");

// package.json
var version = "0.6.5";

// src/client.jsx
var import_jsx_runtime = require("react/jsx-runtime");
var name = "dsh-multi-router-client";
var inject = ["slots"];
var ENDPOINT = "/.well-known/dsh-multi-router";
var reloadFromHost;
async function requestPluginReload(remote) {
  if (!remote?.pluginManager?.setBundleEnabled) throw Error("\u5F53\u524D DSH \u672A\u63D0\u4F9B\u91CD\u65B0\u52A0\u8F7D\u63A5\u53E3\uFF0C\u8BF7\u5347\u7EA7 DSH \u6216\u5728\u63D2\u4EF6\u9875\u5173\u95ED\u540E\u91CD\u65B0\u542F\u7528\u672C\u63D2\u4EF6\u3002");
  const answer = await remote.pluginManager.setBundleEnabled("dsh-multi-router", true);
  const result = answer?.ok === true ? answer.value : answer;
  if (answer?.ok === false || result?.application !== "applied") throw Error("DSH \u672A\u80FD\u5373\u65F6\u91CD\u8F7D\uFF0C\u8BF7\u68C0\u67E5\u7EC4\u4EF6\u9519\u8BEF\uFF1B\u4E0D\u652F\u6301\u70ED\u52A0\u8F7D\u7684\u65E7\u7248 DSH \u4ECD\u9700\u91CD\u542F\u3002");
}
var backendNeedsRestart = (data) => !!data && data.pluginVersion !== version;
function RestartGuidance({ data, retry, reload, busy }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", role: "alert", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u63D2\u4EF6\u6B63\u5728\u8FDE\u63A5\u6216\u540C\u6B65\u7248\u672C" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: data ? `\u9762\u677F v${version}\uFF0C\u8FD0\u884C\u4E2D\u7684\u540E\u53F0 v${data.pluginVersion || "\u65E7\u7248"}\u3002\u6B63\u5728\u7B49\u5F85 DSH \u540C\u6B65\u65B0\u7248\u672C\u3002` : "\u6682\u65F6\u65E0\u6CD5\u8FDE\u63A5\u63D2\u4EF6\u540E\u53F0\u3002\u5B89\u88C5\u6216\u66F4\u65B0\u540E\u4F1A\u81EA\u52A8\u91CD\u8BD5\uFF0C\u4E5F\u53EF\u4EE5\u53EA\u91CD\u65B0\u52A0\u8F7D\u672C\u63D2\u4EF6\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: reload, children: "\u91CD\u65B0\u52A0\u8F7D\u63D2\u4EF6" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: retry, children: "\u91CD\u65B0\u8FDE\u63A5" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "\u4ECD\u65E0\u6CD5\u8FDE\u63A5\uFF1F" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u5148\u68C0\u67E5\u4E0B\u65B9\u7EC4\u4EF6\u7684\u542F\u7528\u9519\u8BEF\u3002\u65E7\u7248 DSH \u82E5\u4E0D\u652F\u6301\u8FD0\u884C\u4E2D\u91CD\u8F7D\uFF0C\u53EF\u5347\u7EA7 DSH\uFF0C\u6216\u901A\u8FC7\u300C\u9000\u51FA DeepSeek Harness\u300D\u5B8C\u5168\u9000\u51FA\u540E\u91CD\u65B0\u6253\u5F00\u3002\u5173\u95ED\u7A97\u53E3\u4E0D\u7B49\u4E8E\u9000\u51FA\uFF0C\u8D26\u53F7\u3001\u8DEF\u7531\u4E0E\u7528\u91CF\u4F1A\u4FDD\u7559\u3002" })
    ] })
  ] });
}
async function readManagementResponse(res) {
  let next;
  try {
    next = JSON.parse(await res.text());
  } catch {
    throw Error(`\u63D2\u4EF6\u540E\u53F0\u672A\u5C31\u7EEA\uFF08HTTP ${res.status}\uFF09\u3002\u6B63\u5728\u91CD\u65B0\u8FDE\u63A5\uFF1B\u82E5\u6301\u7EED\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u52A0\u8F7D\u63D2\u4EF6\u5E76\u68C0\u67E5\u7EC4\u4EF6\u9519\u8BEF\u3002`);
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
@media(max-width:850px){.mr .providers{grid-template-columns:1fr}.mr .metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.mr .grid{grid-template-columns:1fr}.mr .box{padding:16px}.mr nav{flex-wrap:wrap}.mr .modal-body,.mr .modal-head,.mr .modal-foot{padding:16px}.mr .metrics{gap:8px}.mr .metric strong{font-size:22px}}
.mr{--mr-soft:color-mix(in srgb,var(--mr-text) 3%,var(--mr-card));--mr-selected:color-mix(in srgb,var(--mr-accent) 7%,var(--mr-card));max-width:1280px;min-width:0;line-height:1.55}
.mr h2{font-size:24px;letter-spacing:-.5px;font-weight:650}.mr h3{font-weight:600}.mr .stack{gap:20px}.mr .row{gap:8px}.mr .box{border-radius:14px;background:var(--mr-card)}.mr .box.stack{gap:16px}
.mr nav{gap:4px;padding:16px 0 0;margin-bottom:24px}.mr nav button{border:0;border-radius:0;background:transparent;padding:12px 14px;border-bottom:2px solid transparent;color:var(--mr-muted)}.mr nav button[aria-pressed=true]{background:transparent;color:var(--mr-text);border-bottom-color:var(--mr-text);font-weight:600}.mr nav button:hover{background:var(--mr-soft)}
.mr button.primary{background:var(--mr-text);color:var(--mr-card);border-color:var(--mr-text)}.mr button.primary:hover{opacity:.85}.mr button:active:not(:disabled){filter:brightness(.9)}.mr button.quiet{color:var(--mr-muted)}.mr .badge{border-radius:100px;background:var(--mr-soft);padding:4px 10px}.mr .metric{background:var(--mr-soft)}.mr .metric strong{font-size:28px;font-variant-numeric:tabular-nums;letter-spacing:-.5px;margin:10px 0 4px}.mr .metrics{gap:16px}
.mr .status{display:inline-flex;align-items:center;gap:7px;font-size:13px;white-space:nowrap}.mr .status i{width:8px;height:8px;border-radius:50%;background:var(--mr-muted);display:inline-block;flex-shrink:0}.mr .status i.good{background:var(--dsw-alias-state-success-primary,#38a16a)}.mr .status i.warn{background:var(--dsw-alias-state-warning-primary,#c48b28)}.mr .warn{color:var(--dsw-alias-state-warning-primary,#c48b28)}
.mr .table-shell{padding:0;overflow:hidden}.mr .scroll>.table{min-width:760px}.mr .table{font-size:14px}.mr .table th{background:var(--mr-soft);font-size:12px;letter-spacing:.02em;font-weight:500;white-space:nowrap}.mr .table th,.mr .table td{padding:16px 20px;vertical-align:middle}.mr .table td:last-child{white-space:nowrap}.mr .table tbody tr:last-child td{border-bottom:0}.mr .table td small{display:block;font-size:12px;margin-top:3px}.mr .table td>strong{font-weight:600}.mr .table tr.selected{background:var(--mr-selected)}.mr .table tbody tr:hover{background:var(--mr-soft)}.mr .table .account-name{max-width:230px;overflow-wrap:anywhere}.mr .table .amount{font-size:20px;line-height:1.35;font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap}.mr .table .cell-actions{white-space:nowrap;text-align:right}.mr .table .account-check{min-width:44px;min-height:44px;justify-content:center;flex-shrink:0}.mr .table .account-cell{display:flex;gap:10px;align-items:center}.mr .table .account-cell .check{margin-left:-12px}.mr .table .account-cell input{accent-color:var(--mr-text)}.mr .table .row{flex-wrap:nowrap}.mr .section-title{margin-bottom:4px}.mr .toolbar{align-items:flex-end;gap:16px}.mr .search{max-width:280px;flex:1;min-width:160px}.mr .table-footer{padding:14px 20px;background:var(--mr-soft)}.mr .hint{font-size:13px;color:var(--mr-muted)}.mr details.help{border:0;padding:0}.mr details.help>div{padding:12px 0;max-width:76ch}.mr .plan-form{align-items:flex-end;padding:16px 0 0;border-top:1px solid var(--mr-border)}.mr .plan-form .filter{min-width:180px}.mr .steps{border:1px solid var(--mr-border);border-radius:10px;background:var(--mr-soft);padding:14px 16px}.mr .route-path span{background:var(--mr-soft);border-color:transparent;font-size:12px}.mr .route-card details{padding-top:10px}.mr .feedback{margin-bottom:16px}.mr .box .feedback{margin-bottom:0}.mr .scroll{max-width:100%}.mr .scroll:focus-visible{outline:2px solid var(--mr-accent);outline-offset:-3px}
@media(max-width:850px){.mr .metrics{gap:10px}.mr nav{gap:0}.mr nav button{padding:12px 10px}}@media(max-width:600px){.mr h2{font-size:22px}.mr nav{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}.mr nav button{padding:10px 4px;font-size:12px;white-space:nowrap}.mr .toolbar>.row{width:100%}.mr .toolbar .search{max-width:none}.mr .metric strong{font-size:24px}.mr .table th,.mr .table td{padding:14px 16px}.mr .filter{max-width:none}.mr .plan-form label{flex:1}.mr .box.table-shell{padding:0}}


.mr .metrics{gap:0;border:1px solid var(--mr-border);border-radius:12px;overflow:hidden;background:var(--mr-card)}
.mr .metrics .metric{border:0;border-radius:0;background:transparent;border-right:1px solid var(--mr-border);padding:16px 20px}.mr .metrics .metric:last-child{border-right:0}.mr .metric strong{font-size:25px;margin:6px 0}.mr .performance{gap:10px}.mr .performance .metrics{background:var(--mr-soft);border-color:transparent}.mr .performance .metric strong{font-size:21px}.mr .performance .metric{padding:12px 20px}.mr .performance h3{font-size:14px}.mr .refresh-control{font-size:12px;color:var(--mr-muted)}
.mr .section-pad{padding:16px 20px}.mr .table-shell>.section-pad+.section-pad{padding-top:0}.mr .route-table td{max-width:300px}.mr .route-table .route-targets{max-width:300px;white-space:normal;overflow-wrap:anywhere}.mr .route-table small{max-width:320px}.mr .model-table td:first-child{width:38%}.mr .table .cell-actions{width:1%}.mr .install-plugin>div{padding-top:16px}.mr details.help.box{padding:18px 20px}.mr .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
@media(max-width:600px){.mr .metrics .metric{padding:12px 14px}.mr .metrics .metric:nth-child(2){border-right:0}.mr .metrics .metric:nth-child(-n+2){border-bottom:1px solid var(--mr-border)}.mr .section-pad{padding:14px 16px}}

@media(prefers-reduced-motion:reduce){.mr *{transition:none!important}}
`;
function apply(ctx) {
  reloadFromHost = () => requestPluginReload(ctx.get?.("remote"));
  ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({ name: "plugins.bundle.config", key: "dsh-multi-router" }, RouterPage));
  ctx.slots.inject("shell.overlay", () => ctx.slots.register({ name: "shell.overlay", id: "dsh-multi-router-updates" }, UpdateReminder));
  ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
    name: "sidebar.footer.action",
    id: "dsh-multi-router-usage",
    order: 10,
    inject: () => ({ open: () => {
      const navigation = ctx.get?.("pluginNavigation");
      if (!navigation?.openBundle) throw Error("\u8BF7\u5728\u63D2\u4EF6\u9875\u6253\u5F00 dsh-multi-router\uFF1B\u5F53\u524D DSH \u672A\u63D0\u4F9B\u8BE6\u60C5\u5BFC\u822A\u3002");
      navigation.openBundle("dsh-multi-router");
    } })
  }, SidebarUsage));
}
var SUMMARY_EVENT = "dsh-multi-router-summary";
var compactTokens = (n) => n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : fmt(n);
function SidebarUsageCard({ data, wide = true, open, error }) {
  const title = `${data.today}\uFF08\u5317\u4EAC\u65F6\u95F4\uFF09
\u4ECA\u65E5 ${fmt(data.tokens)} Token \xB7 ${fmt(data.requests)} \u6B21\u8BF7\u6C42
\u7D2F\u8BA1 ${fmt(data.totalTokens)} Token${data.unmetered ? `
${fmt(data.unmetered)} \u6B21\u8C03\u7528\u672A\u8FD4\u56DE\u7528\u91CF` : ""}${error ? `
${error}` : ""}
\u70B9\u51FB\u6253\u5F00\u8D26\u53F7\u4E0E\u8DEF\u7531`;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `
    [class*="_footArea"] [class*="_footerActions"]:has(.mr-sidebar-usage){flex-direction:column}
    .mr-sidebar-usage{box-sizing:border-box;display:flex;align-items:center;gap:10px;width:100%;min-width:0;min-height:48px;padding:7px 10px;border:1px solid var(--dsw-alias-border-l2,#444);border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary,#eee);font:inherit;text-align:left;cursor:pointer}
    .mr-sidebar-usage:hover{background:var(--dsw-alias-bg-module-platform,#303036)}.mr-sidebar-usage:focus-visible{outline:2px solid var(--dsw-alias-state-active-primary,#3a71db);outline-offset:2px}
    .mr-sidebar-usage svg{flex-shrink:0}.mr-sidebar-usage span{flex:1;min-width:0}.mr-sidebar-usage small{display:block;color:var(--dsw-alias-label-secondary,#aaa);font-size:10px;line-height:15px;white-space:nowrap}.mr-sidebar-usage strong{display:block;font-size:13px;font-weight:600;line-height:18px;font-variant-numeric:tabular-nums;white-space:nowrap}.mr-sidebar-usage[data-wide=false]{width:36px;min-height:36px;padding:8px;justify-content:center}
  ` }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "mr-sidebar-usage", "data-wide": wide, title, "aria-label": `Token \u7528\u91CF\u6982\u89C8\uFF0C\u4ECA\u65E5 ${fmt(data.tokens)}\uFF0C\u7D2F\u8BA1 ${fmt(data.totalTokens)}\uFF0C\u6253\u5F00\u63D2\u4EF6\u8BE6\u60C5`, onClick: open, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 4v16h17M8 16v-5m5 5V7m5 9v-7" }) }),
      wide && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
            "\u4ECA\u65E5 Token",
            error ? " \xB7 \u672A\u5237\u65B0" : ""
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: compactTokens(data.tokens) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "\u7D2F\u8BA1 Token" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: compactTokens(data.totalTokens) })
        ] })
      ] })
    ] })
  ] });
}
function SidebarUsage({ wide = true, open }) {
  const [data, setData] = (0, import_react.useState)(null), [error, setError] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    let stopped = false, pending = false, again = false;
    const abort = new AbortController();
    async function poll(event) {
      if (document.hidden) return;
      if (pending) {
        if (event?.type === SUMMARY_EVENT) again = true;
        return;
      }
      pending = true;
      try {
        const next = await readManagementResponse(await fetch(`${ENDPOINT}/summary`, { cache: "no-store", signal: AbortSignal.any([abort.signal, AbortSignal.timeout(8e3)]) }));
        if (!stopped) {
          setData(next);
          setError("");
        }
      } catch {
        if (!stopped) setError("\u6682\u65F6\u65E0\u6CD5\u5237\u65B0\u672C\u673A\u7EDF\u8BA1");
      } finally {
        pending = false;
        if (again && !stopped) {
          again = false;
          void poll();
        }
      }
    }
    void poll();
    const timer = setInterval(() => {
      void poll();
    }, 6e4);
    document.addEventListener("visibilitychange", poll);
    window.addEventListener(SUMMARY_EVENT, poll);
    return () => {
      stopped = true;
      abort.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
      window.removeEventListener(SUMMARY_EVENT, poll);
    };
  }, []);
  if (!data || data.enabled === false) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarUsageCard, { data, wide, error, open: () => {
    try {
      open();
    } catch (e) {
      setError(e.message);
    }
  } });
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
function UpdateReminder() {
  const [data, setData] = (0, import_react.useState)(null), [opened, setOpened] = (0, import_react.useState)(null), [manage, setManage] = (0, import_react.useState)(false), [busy, setBusy] = (0, import_react.useState)(false), [error, setError] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    let live = true, pending = false;
    async function poll() {
      if (document.hidden || pending) return;
      pending = true;
      try {
        const next = await readManagementResponse(await fetch(ENDPOINT, { cache: "no-store" }));
        if (live && !backendNeedsRestart(next)) {
          setData(next);
          setOpened((current) => current ?? (next.pluginUpdates?.reminders?.length && !document.querySelector("dialog[open]") ? next.pluginUpdates.reminders : null));
        }
      } catch {
      } finally {
        pending = false;
      }
    }
    void poll();
    const timer = setInterval(() => {
      void poll();
    }, 6e4);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);
  (0, import_react.useEffect)(() => {
    if (data?.pluginUpdates?.job?.state !== "running") return;
    let live = true;
    const timer = setInterval(() => {
      void fetch(ENDPOINT, { cache: "no-store" }).then(readManagementResponse).then((next) => {
        if (live) setData(next);
      }).catch(() => {
      });
    }, 2e3);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [data?.pluginUpdates?.job?.state]);
  async function act(action) {
    if (busy) return false;
    setBusy(true);
    setError("");
    try {
      const next = await readManagementResponse(await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", "X-Multi-Router-Key": data.key }, body: JSON.stringify({ revision: data.revision, ...action }) }));
      setData(next);
      return next;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function dismiss() {
    if (await act({ action: "plugins.dismiss", keys: opened.map((r) => r.key) })) {
      setOpened(null);
      setManage(false);
    }
  }
  if (!opened || !data) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "mr", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: styles }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, { title: "\u53D1\u73B0\u63D2\u4EF6\u66F4\u65B0", busy: busy || data.pluginUpdates?.job?.state === "running", close: () => {
      void dismiss();
    }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-body stack", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feedback, { error }),
      manage ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PluginUpdatesPanel, { data: data.pluginUpdates, busy, act }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
          opened.length,
          " \u4E2A\u7528\u6237\u5B89\u88C5\u7684\u63D2\u4EF6\u6709\u66F4\u65B0\u3002\u8BF7\u9009\u62E9\u67E5\u770B\u66F4\u65B0\uFF0C\u6216\u7A0D\u540E\u5904\u7406\u3002"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: opened.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: r.name }),
          " \xB7 ",
          r.version || "\u672A\u77E5\u7248\u672C",
          " \u2192 ",
          r.latestVersion || `Git ${r.latestCommit?.slice(0, 8)}`
        ] }, r.key)) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u6BCF 24 \u5C0F\u65F6\u81EA\u52A8\u68C0\u67E5 GitHub / npm \u5B89\u88C5\u6765\u6E90\uFF1B\u540C\u4E00\u7248\u672C\u53EA\u63D0\u9192\u4E00\u6B21\u3002DSH \u5185\u7F6E\u63D2\u4EF6\u4E0D\u53C2\u4E0E\u68C0\u67E5\uFF0C\u4E0D\u4F1A\u81EA\u52A8\u5B89\u88C5\u66F4\u65B0\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy || data.pluginUpdates?.job?.state === "running", onClick: () => {
          void dismiss();
        }, children: "\u7A0D\u540E\u5904\u7406" }),
        !manage && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "primary", disabled: busy, onClick: () => setManage(true), children: "\u67E5\u770B\u5E76\u66F4\u65B0" })
      ] })
    ] }) })
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
  const [accountProvider, setAccountProvider] = (0, import_react.useState)(""), [provider, setProvider] = (0, import_react.useState)("workbuddy"), [busy, setBusy] = (0, import_react.useState)(false), [live, setLive] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(""), [notice, setNotice] = (0, import_react.useState)(""), [draft, setDraft] = (0, import_react.useState)(null), [accountModal, setAccountModal] = (0, import_react.useState)(null), [presetModal, setPresetModal] = (0, import_react.useState)(false), [search, setSearch] = (0, import_react.useState)("");
  const polling = (0, import_react.useRef)(false);
  async function load(signal = AbortSignal.timeout(8e3)) {
    const next = await readManagementResponse(await fetch(ENDPOINT, { cache: "no-store", signal }));
    setData(next);
    setError("");
  }
  (0, import_react.useEffect)(() => {
    if (view === "summary") return;
    let stopped = false, retry, attempts = 0;
    const abort = new AbortController();
    async function connect() {
      try {
        await load(AbortSignal.any([abort.signal, AbortSignal.timeout(4e3)]));
      } catch (e) {
        if (stopped) return;
        if (++attempts < 8) retry = setTimeout(connect, 750);
        else setError(e.message);
      }
    }
    void connect();
    const timer = live && setInterval(() => {
      if (document.hidden || polling.current) return;
      polling.current = true;
      void load(abort.signal).catch((e) => {
        if (!stopped) setError(e.message);
      }).finally(() => {
        polling.current = false;
      });
    }, 6e4);
    return () => {
      stopped = true;
      abort.abort();
      clearTimeout(retry);
      clearInterval(timer);
    };
  }, [view, live]);
  (0, import_react.useEffect)(() => {
    if (data?.startup?.phase !== "discovering" && !["waiting", "reloading"].includes(data?.runtime?.phase) && data?.pluginUpdates?.job?.state !== "running" && !data?.checkins?.running) return;
    const timer = setInterval(() => {
      if (document.hidden || polling.current) return;
      polling.current = true;
      void load().catch((e) => setError(e.message)).finally(() => {
        polling.current = false;
      });
    }, 2e3);
    return () => clearInterval(timer);
  }, [data?.startup?.phase, data?.runtime?.phase, data?.pluginUpdates?.job?.state, data?.checkins?.running]);
  async function reload() {
    setBusy(true);
    setError("");
    try {
      if (!reloadFromHost) throw Error("\u8BF7\u5728 DSH \u63D2\u4EF6\u9875\u91CD\u65B0\u542F\u7528\u672C\u63D2\u4EF6\u3002");
      await reloadFromHost();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function act(action) {
    if (busy || backendNeedsRestart(data)) return false;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", "X-Multi-Router-Key": data.key }, body: JSON.stringify({ revision: data.revision, ...action }) });
      const next = await readManagementResponse(res);
      const { exported, workbuddyLogin, loginResult, apiKey, modelTest, ...state } = next;
      setData(state);
      if (action.sidebarUsage !== void 0 || action.action === "config.import") window.dispatchEvent(new Event(SUMMARY_EVENT));
      setNotice(action.action === "model.test" ? "" : action.action.startsWith("api.") ? next.apiService?.phase === "error" ? "\u914D\u7F6E\u5DF2\u4FDD\u5B58\uFF0C\u4F46\u670D\u52A1\u5C1A\u672A\u542F\u52A8\uFF0C\u8BF7\u67E5\u770B\u4E0B\u65B9\u63D0\u793A\u3002" : action.action === "api.key.reveal" ? "" : "API \u8BBE\u7F6E\u5DF2\u4FDD\u5B58\u3002" : action.action === "workbuddy.sms" ? "" : action.action === "workbuddy.login" ? loginResult?.warning || "\u767B\u5F55\u51ED\u8BC1\u5DF2\u4FDD\u5B58\uFF0C\u81EA\u52A8\u7B7E\u5230\u5F00\u5173\u4FDD\u6301\u539F\u8BBE\u7F6E\u3002" : action.action === "checkins.verify" ? "\u767B\u5F55\u9A8C\u8BC1\u901A\u8FC7\uFF0C\u65E7\u7684\u4EE4\u724C\u5931\u6548\u63D0\u793A\u5DF2\u89E3\u9664\uFF1B\u672A\u63D0\u4EA4\u7B7E\u5230\u3002" : action.action === "checkins.settings" ? "\u7B7E\u5230\u8BA1\u5212\u5DF2\u4FDD\u5B58\uFF1B\u4ECA\u65E5\u5DF2\u5904\u7406\u8BB0\u5F55\u4FDD\u6301\u4E0D\u53D8\u3002" : action.action.startsWith("checkins.") || action.action.startsWith("plugins.") || action.action === "setup.dismiss" ? "" : action.action === "accounts.discover" || action.action === "monitor.refresh" ? "\u5DF2\u91CD\u65B0\u68C0\u6D4B\u672C\u673A\u767B\u5F55\u5E76\u5237\u65B0\u7528\u91CF\uFF1B\u68C0\u6D4B\u7ED3\u679C\u89C1\u4E0B\u65B9\u3002" : action.action.includes("refresh") ? "\u5DF2\u5237\u65B0\u3002\u65E0\u6CD5\u83B7\u53D6\u7684\u8D26\u53F7\u4F1A\u4FDD\u7559\u4E0A\u6B21\u6570\u636E\u5E76\u6807\u8BB0\u3002" : action.action === "config.import" ? "\u914D\u7F6E\u5DF2\u5BFC\u5165\u5E76\u751F\u6548\uFF0C\u539F\u914D\u7F6E\u5DF2\u5907\u4EFD\uFF1B\u6A21\u578B\u548C\u7528\u91CF\u6B63\u5728\u540E\u53F0\u66F4\u65B0\u3002" : action.action.startsWith("config.") || action.action === "account.export" ? "" : "\u5DF2\u4FDD\u5B58\u5E76\u751F\u6548\u3002");
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
  const p = data?.providers.find((p2) => p2.id === provider);
  const providerSelect = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "filter", children: [
    "\u4F9B\u5E94\u5546 / \u533A\u57DF",
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { value: provider, onChange: (e) => {
      setProvider(e.target.value);
      setSearch("");
    }, children: data?.providers.map((p2) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: p2.id, children: p2.name }, p2.id)) })
  ] });
  const accountProviderSelect = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "filter", children: [
    "\u4F9B\u5E94\u5546 / \u533A\u57DF",
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: accountProvider, onChange: (e) => setAccountProvider(e.target.value), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u5168\u90E8\u4F9B\u5E94\u5546" }),
      data?.providers.map((p2) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: p2.id, children: p2.name }, p2.id))
    ] })
  ] });
  if (view === "summary") return "\u4E09\u5BB6\u8D26\u53F7\u4E0E\u767B\u5F55\u4FE1\u606F\u3001\u7528\u91CF\u76D1\u63A7\u3001\u6A21\u578B\u7BA1\u7406\uFF0C\u4EE5\u53CA\u6743\u91CD\u548C\u989D\u5EA6\u8DEF\u7531\u3002";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "mr", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: styles }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "\u8D26\u53F7\u4E0E\u8DEF\u7531" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "muted", children: "\u7BA1\u7406\u4E09\u5BB6\u8D26\u53F7\u3001\u6A21\u578B\u4E0E\u7528\u91CF" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "badge", children: [
          "v",
          data?.pluginVersion ?? version
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check refresh-control", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", disabled: busy || !data || backendNeedsRestart(data), checked: data?.options?.sidebarUsage !== false, onChange: (e) => {
            void act({ action: "options.save", sidebarUsage: e.target.checked });
          } }),
          "\u4FA7\u680F\u7528\u91CF"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "status", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: busy || !data ? "warn" : "good", "aria-hidden": "true" }),
          busy ? "\u6B63\u5728\u5904\u7406\u2026" : !data ? "\u6B63\u5728\u8FDE\u63A5\u2026" : "\u672C\u673A\u8FD0\u884C"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check refresh-control", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: live, onChange: (e) => setLive(e.target.checked) }),
          "\u6BCF\u5206\u949F\u5237\u65B0"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
          void load().catch((e) => setError(e.message));
        }, children: "\u5237\u65B0\u9762\u677F" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", { "aria-label": "\u8DEF\u7531\u63D2\u4EF6\u914D\u7F6E\u9875\u7B7E", children: [["overview", "\u603B\u89C8\u4E0E\u7528\u91CF"], ["usage", "Token \u660E\u7EC6"], ["accounts", "\u8D26\u53F7\u4E0E\u767B\u5F55"], ["checkins", "\u79EF\u5206\u7B7E\u5230"], ["models", "\u6A21\u578B\u7BA1\u7406"], ["routes", "\u8DEF\u7531\u89C4\u5219"], ["api", "API \u670D\u52A1"], ["plugins", "\u63D2\u4EF6\u66F4\u65B0"], ["migration", "\u914D\u7F6E\u8FC1\u79FB"]].map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { "aria-pressed": tab === key, onClick: () => {
      setTab(key);
      setError("");
      setNotice("");
    }, children: label }, key)) }),
    !draft && !accountModal && !presetModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feedback, { error, notice }),
    (backendNeedsRestart(data) || !data && error) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RestartGuidance, { data, busy, reload: () => {
      void reload();
    }, retry: () => {
      void load().catch((e) => setError(e.message));
    } }),
    !data ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", role: "status", "aria-live": "polite", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: error ? "\u7B49\u5F85\u540E\u53F0\u8FDE\u63A5" : "\u6B63\u5728\u8FDE\u63A5\u672C\u673A\u63D2\u4EF6\u2026" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u9875\u9762\u4F1A\u81EA\u52A8\u91CD\u65B0\u8FDE\u63A5\u3002\u8D26\u53F7\u53D1\u73B0\u3001\u7528\u91CF\u548C\u6A21\u578B\u76EE\u5F55\u5C06\u5728\u540E\u53F0\u66F4\u65B0\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("progress", { "aria-label": "\u6B63\u5728\u8FDE\u63A5\u63D2\u4EF6\u540E\u53F0" })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", { className: "stack", style: { border: 0, padding: 0, margin: 0, minWidth: 0 }, disabled: backendNeedsRestart(data), "aria-busy": busy, children: [
      data.startup?.phase === "discovering" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "steps", role: "status", children: "\u6B63\u5728\u540E\u53F0\u83B7\u53D6\u672C\u673A\u8D26\u53F7\uFF0C\u5DF2\u6709\u8D26\u53F7\u548C\u8DEF\u7531\u73B0\u5728\u5373\u53EF\u4F7F\u7528\u3002" }),
      data.runtime?.phase && data.runtime.phase !== "current" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "steps", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
          data.runtime.message,
          "\uFF08\u8FD0\u884C v",
          data.runtime.runningVersion,
          " / \u5DF2\u5B89\u88C5 v",
          data.runtime.installedVersion,
          "\uFF09"
        ] }),
        ["failed", "restart-required"].includes(data.runtime.phase) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
          void reload();
        }, children: "\u91CD\u65B0\u52A0\u8F7D\u63D2\u4EF6" })
      ] }),
      ["overview", "accounts"].includes(tab) && data.setup?.dismissed !== true && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InitialSetup, { data, busy, act, go: (key) => setTab(key) }),
      tab === "overview" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Overview, { data, busy, act, go: (key) => setTab(key) }),
      tab === "api" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ApiServicePanel, { data: data.apiService, busy, act }),
      tab === "plugins" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PluginUpdatesPanel, { data: data.pluginUpdates, busy, act }),
      tab === "checkins" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckinPanel, { data, busy, act }),
      tab === "usage" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsageDetails, { data, busy, act }),
      tab === "accounts" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccountPool, { data, provider: accountProvider, providerSelect: accountProviderSelect, busy, act, manage: (a) => openAccount("edit", a), add: () => openAccount("add") }, accountProvider),
      tab === "models" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModelsPanel, { error, notice, data, provider, providerSelect, search, setSearch, busy, act }),
      tab === "routes" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stack", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u6A21\u578B\u8DEF\u7531" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
              data.routes.length,
              " \u6761\u8DEF\u7531 \xB7 \u89C4\u5219\u4E0E\u8D26\u53F7\u5728\u7F16\u8F91\u4E2D\u8C03\u6574"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
              setError("");
              setNotice("");
              setPresetModal(true);
            }, children: "\u6DFB\u52A0\u9884\u914D\u7F6E" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "primary", disabled: busy, onClick: () => {
              setError("");
              setNotice("");
              setDraft({ id: "", name: "", revision: data.revision, contextMode: "maximum", contextWindow: 2e5, maxTokens: 32e3, strategy: "failover", preferExpiringCredits: true, expiringWithinDays: 7, visible: true, targets: [newTarget()] });
            }, children: "\u65B0\u5EFA\u8DEF\u7531" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoutesTable, { data, busy, act, edit: editRoute }),
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "steps", children: "Free \u81EA\u52A8\u53D1\u73B0\u5404\u8D26\u53F7\u7684\u514D\u8D39\u6A21\u578B\uFF1B\u5176\u4ED6\u9884\u914D\u7F6E\u7ED1\u5B9A\u5DF2\u6838\u5BF9\u7684\u6E20\u9053\u6A21\u578B\u3002\u5DF2\u6709\u8DEF\u7531\u4E0D\u4F1A\u88AB\u8986\u76D6\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "grid", children: (data.presets || []).map((preset) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: preset.name }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: preset.freeOnly ? "\u6BCF\u5929\u81EA\u52A8\u68C0\u67E5\u514D\u8D39\u6A21\u578B\uFF0C\u8C03\u7528\u524D\u590D\u6838\u96F6\u500D\u7387\uFF1B\u4EC5\u5728\u514D\u8D39\u6A21\u578B\u95F4\u5207\u6362\u3002" : `\u5DF2\u53D1\u73B0\u53EF\u7528\u6E20\u9053\uFF1A${preset.availableProviders.length} / ${preset.providerCount ?? preset.targets.length}${preset.availableProviders.length < (preset.providerCount ?? preset.targets.length) ? " \xB7 \u53EF\u6DFB\u52A0\u8D26\u53F7\u6216\u5237\u65B0\u6A21\u578B\u76EE\u5F55\u540E\u4F7F\u7528" : ""}` }),
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
    accountModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, { title: accountModal.mode === "edit" ? "\u8D26\u53F7\u767B\u5F55\u8BE6\u60C5" : accountModal.mode === "credentials" ? "\u8865\u5145 / \u66F4\u65B0\u8D26\u53F7\u51ED\u8BC1" : "\u6DFB\u52A0\u8D26\u53F7\u4E0E\u83B7\u53D6\u767B\u5F55", busy, close: () => setAccountModal(null), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccountForm, { modal: accountModal, provider: accountProvider || "workbuddy", data, busy, act, replace: () => openAccount("credentials", accountModal.account), close: (selected) => {
      if (typeof selected === "string" && accountProvider) setAccountProvider(selected);
      setAccountModal(null);
    }, error, notice }) })
  ] });
}
function ApiServicePanel({ data: a, busy, act }) {
  const [key, setKey] = (0, import_react.useState)(""), [hint, setHint] = (0, import_react.useState)(""), [confirmKey, setConfirmKey] = (0, import_react.useState)(null), [models, setModels] = (0, import_react.useState)(false), [example, setExample] = (0, import_react.useState)("");
  const copyField = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    setKey((current) => a?.keyHint && current.endsWith(a.keyHint.slice(-4)) ? current : "");
  }, [a?.keyHint]);
  (0, import_react.useEffect)(() => {
    if (!key) return;
    const timer = setTimeout(() => setKey(""), 6e4);
    return () => clearTimeout(timer);
  }, [key]);
  if (!a) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "steps", children: "\u5F53\u524D\u540E\u53F0\u672A\u63D0\u4F9B API \u670D\u52A1\uFF0C\u8BF7\u66F4\u65B0\u63D2\u4EF6\u3002" });
  const save = (fields) => act({ action: "api.settings", apiRevision: a.revision, ...fields });
  async function keyAction(action) {
    const result = await act({ action, apiRevision: a.revision });
    if (result) {
      setKey(result.apiKey || "");
      setConfirmKey(null);
    }
  }
  async function copy(value, fallback = false) {
    try {
      await navigator.clipboard.writeText(value);
      setHint("\u5DF2\u590D\u5236\u3002");
    } catch {
      setHint("\u5F53\u524D\u73AF\u5883\u65E0\u6CD5\u81EA\u52A8\u590D\u5236\uFF0C\u8BF7\u5728\u6587\u672C\u6846\u4E2D\u5168\u9009\u590D\u5236\u3002");
      if (fallback) copyField.current?.select();
      else setExample(value);
    }
  }
  const model = a.models[0]?.id || "\u4F60\u7684\u8DEF\u7531\u6A21\u578B ID";
  const command = `curl '${a.baseUrl}/chat/completions' \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify({ model, messages: [{ role: "user", content: "\u4F60\u597D" }], stream: true })}'`;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stack", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "API \u670D\u52A1" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u5C06\u8D26\u53F7\u6C60\u4E0E\u7EDF\u4E00\u8DEF\u7531\u63D0\u4F9B\u7ED9\u5176\u4ED6\u5DE5\u5177\u3002\u968F DSH \u8FD0\u884C\uFF0C\u9ED8\u8BA4\u5173\u95ED\u3002" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "status", role: "status", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: a.phase === "running" ? "good" : a.phase === "error" ? "warn" : "", "aria-hidden": "true" }),
          { running: "\u8FD0\u884C\u4E2D", stopped: "\u5DF2\u5173\u95ED", starting: "\u542F\u52A8\u4E2D", error: "\u542F\u52A8\u5931\u8D25" }[a.phase] || a.phase
        ] })
      ] }),
      a.error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "error", role: "alert", children: a.error }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: a.phase === "running" ? `${a.active} \u4E2A\u5904\u7406\u4E2D\u8BF7\u6C42 \xB7 ${a.allowLan ? "\u672C\u673A\u4E0E\u7F51\u7EDC\u8BBF\u95EE" : "\u4EC5\u672C\u673A\u8BBF\u95EE"}` : "\u5F00\u542F\u540E\u5373\u53EF\u590D\u5236\u63A5\u5165\u5730\u5740\uFF1B\u5173\u95ED\u4F1A\u7EC8\u6B62\u6B63\u5728\u5904\u7406\u7684 API \u8BF7\u6C42\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: a.enabled, disabled: busy || !a.hasKey, onChange: (e) => {
            void save({ enabled: e.target.checked });
          } }),
          "\u542F\u7528 API \u670D\u52A1"
        ] })
      ] }),
      !a.hasKey && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "steps", children: "\u5148\u751F\u6210 API Key\uFF0C\u518D\u542F\u7528\u670D\u52A1\u3002\u8D26\u53F7\u767B\u5F55\u51ED\u8BC1\u4E0D\u4F1A\u901A\u8FC7\u6B64\u670D\u52A1\u63D0\u4F9B\u3002" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "metrics", children: [
      metric("\u4ECA\u65E5 API \u8C03\u7528", fmt(a.today.calls), `${a.today.attempts} \u6B21\u4E0A\u6E38\u5C1D\u8BD5\uFF0C\u542B\u6545\u969C\u5207\u6362`),
      metric("\u4ECA\u65E5 API Token", fmt(a.today.tokens), "\u5E73\u53F0\u5B9E\u9645\u8FD4\u56DE\u7528\u91CF"),
      metric("\u5DF2\u5F00\u653E\u6A21\u578B", fmt(a.models.length), a.modelIds === null ? "\u8DDF\u968F\u8DEF\u7531\u5C55\u793A\u8BBE\u7F6E" : "\u81EA\u9009\u6A21\u578B"),
      metric("\u5904\u7406\u4E2D", fmt(a.active), "\u6700\u591A 8 \u4E2A\u5E76\u53D1 API \u8BF7\u6C42")
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u63A5\u5165\u4FE1\u606F" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u5BA2\u6237\u7AEF\u9009\u62E9 OpenAI \u517C\u5BB9\u65B9\u5F0F\uFF0C\u586B\u5199\u4E0B\u65B9 Base URL \u4E0E API Key\u3002" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => setExample(command), children: "\u8C03\u7528\u793A\u4F8B" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        "Base URL",
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "mono", style: { flex: 1, minWidth: 180 }, readOnly: true, value: a.baseUrl, onFocus: (e) => e.currentTarget.select() }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => {
            void copy(a.baseUrl);
          }, children: "\u590D\u5236\u5730\u5740" })
        ] })
      ] }),
      a.allowLan && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u5176\u4ED6\u8BBE\u5907\u53EF\u4F7F\u7528\u4EE5\u4E0B\u672C\u673A\u7F51\u5361\u5730\u5740\uFF08\u9700\u8981\u7F51\u7EDC\u53EF\u8FBE\u53CA\u9632\u706B\u5899\u653E\u884C\uFF09\uFF1A" }),
        a.lanUrls.length ? a.lanUrls.map((url) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "mono", style: { overflowWrap: "anywhere" }, children: url }, url)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u6682\u65E0\u53EF\u7528 IPv4 \u7F51\u5361\u5730\u5740\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        "API Key",
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { ref: copyField, className: "mono", style: { flex: 1, minWidth: 180 }, readOnly: true, autoComplete: "off", spellCheck: "false", value: key || a.keyHint || "\u5C1A\u672A\u751F\u6210", onFocus: (e) => e.currentTarget.select() }),
          a.hasKey && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
              if (key) setKey("");
              else void keyAction("api.key.reveal");
            }, children: key ? "\u9690\u85CF" : "\u663E\u793A" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: async () => {
              const result = await act({ action: "api.key.reveal", apiRevision: a.revision });
              if (result?.apiKey) {
                setKey(result.apiKey);
                await copy(result.apiKey, true);
              }
            }, children: "\u590D\u5236 Key" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
          if (a.hasKey) setConfirmKey("create");
          else void keyAction("api.key.create");
        }, children: a.hasKey ? "\u91CD\u7F6E API Key" : "\u751F\u6210 API Key" }),
        a.hasKey && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => setConfirmKey("revoke"), children: "\u64A4\u9500 Key \u5E76\u5173\u95ED\u670D\u52A1" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "Key \u4EC5\u4FDD\u5B58\u5728\u672C\u673A\u79C1\u6709\u6587\u4EF6\uFF1B\u663E\u793A\u540E 60 \u79D2\u81EA\u52A8\u9690\u85CF\u3002" })
      ] }),
      hint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", role: "status", children: hint })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u670D\u52A1\u8BBE\u7F6E" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { className: "stack", onSubmit: (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void save({ port: Number(f.get("port")), allowLan: f.has("lan") });
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "filter", children: [
            "\u76D1\u542C\u7AEF\u53E3",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "number", name: "port", min: "1024", max: "65535", required: true, defaultValue: a.port, disabled: busy })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", name: "lan", defaultChecked: a.allowLan, disabled: busy }),
            "\u5141\u8BB8\u5C40\u57DF\u7F51\u8BBF\u95EE"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, children: "\u4FDD\u5B58\u8BBE\u7F6E" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u9ED8\u8BA4\u76D1\u542C 127.0.0.1\u3002\u5F00\u542F\u7F51\u7EDC\u8BBF\u95EE\u540E\u76D1\u542C\u6240\u6709 IPv4 \u7F51\u5361\uFF0C\u4F7F\u7528 HTTP\uFF0C\u8BF7\u4EC5\u7528\u4E8E\u53EF\u4FE1\u7F51\u7EDC\uFF1B\u5982\u9700\u5916\u7F51\u8BBF\u95EE\uFF0C\u8BF7\u81EA\u884C\u914D\u7F6E HTTPS \u4E0E\u8BBF\u95EE\u9650\u5236\u3002\u4FEE\u6539\u7AEF\u53E3\u6216\u8BBF\u95EE\u8303\u56F4\u4F1A\u4E2D\u65AD\u5F53\u524D API \u8BF7\u6C42\u3002" })
      ] }, a.revision)
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box table-shell", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar table-footer", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u5F00\u653E\u6A21\u578B" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: a.modelIds === null ? "\u81EA\u52A8\u8DDF\u968F\u5DF2\u5C55\u793A\u8DEF\u7531\uFF0C\u5305\u542B\u52A8\u6001\u514D\u8D39\u6A21\u578B\u3002" : "\u4EC5\u5F00\u653E\u624B\u52A8\u9009\u62E9\u7684\u8DEF\u7531\u3002" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => setModels(true), children: "\u9009\u62E9\u5F00\u653E\u6A21\u578B" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "scroll", role: "region", "aria-label": "API \u5F00\u653E\u6A21\u578B", tabIndex: "0", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "table", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u6A21\u578B\u540D\u79F0" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u8C03\u7528\u6A21\u578B ID" })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: a.models.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: m.name }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "mono", style: { overflowWrap: "anywhere" }, children: m.id })
          ] }, m.id)) })
        ] }),
        !a.models.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "empty", children: "\u6682\u672A\u5F00\u653E\u6A21\u578B\uFF0C\u8BF7\u5C55\u793A\u8DEF\u7531\u6216\u624B\u52A8\u9009\u62E9\u3002" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "\u63A5\u53E3\u4E0E\u7EDF\u8BA1\u8BF4\u660E" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u652F\u6301 GET /v1/models\u3001POST /v1/chat/completions\uFF08\u6D41\u5F0F\u4E0E\u666E\u901A JSON\uFF09\uFF0C\u6CBF\u7528\u8DEF\u7531\u7684\u63A8\u7406\u9ED8\u8BA4\u503C\uFF0C\u53EF\u7528 reasoning_effort \u8986\u76D6\u3002\u5DE5\u5177\u8C03\u7528\u4E0E\u56FE\u7247\u80FD\u529B\u53D6\u51B3\u4E8E\u76EE\u6807\u6A21\u578B\uFF1B\u5916\u90E8\u5DE5\u5177\u81EA\u884C\u6267\u884C\u5DE5\u5177\u5E76\u56DE\u4F20\u7ED3\u679C\u3002\u7528\u91CF\u8BB0\u5F55\u5230 Token \u660E\u7EC6\u7684\u300CAPI \u670D\u52A1\u300D\u6765\u6E90\uFF0C\u4E0D\u4FDD\u5B58\u8BF7\u6C42\u5185\u5BB9\u6216 Key\uFF1B\u4E0A\u4E0B\u6587\u7531\u8C03\u7528\u5BA2\u6237\u7AEF\u4F20\u5165\u3002\u6B64\u7248\u672C\u4E0D\u63D0\u4F9B Responses\u3001Embeddings \u6216\u8DE8\u7AD9\u6D4F\u89C8\u5668 CORS \u63A5\u53E3\u3002\u542F\u7528\u72B6\u6001\u4F1A\u4FDD\u5B58\uFF0CDSH \u4E0B\u6B21\u542F\u52A8\u81EA\u52A8\u6062\u590D\uFF1B\u9000\u51FA DSH \u540E\u505C\u6B62\u3002" })
    ] }),
    confirmKey && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, { title: confirmKey === "create" ? "\u91CD\u7F6E API Key" : "\u64A4\u9500 API Key", busy, close: () => setConfirmKey(null), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "modal-body stack", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: confirmKey === "create" ? "\u65E7 Key \u5C06\u7ACB\u5373\u5931\u6548\uFF0C\u5176\u4ED6\u5BA2\u6237\u7AEF\u9700\u8981\u586B\u5199\u65B0 Key\u3002" : "Key \u5C06\u7ACB\u5373\u5931\u6548\uFF0CAPI \u670D\u52A1\u4F1A\u5173\u95ED\uFF0C\u6B63\u5728\u5904\u7406\u7684 API \u8BF7\u6C42\u5C06\u4E2D\u65AD\u3002" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-foot row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => setConfirmKey(null), children: "\u53D6\u6D88" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "primary", disabled: busy, onClick: () => {
          void keyAction(`api.key.${confirmKey}`);
        }, children: [
          "\u786E\u8BA4",
          confirmKey === "create" ? "\u91CD\u7F6E" : "\u64A4\u9500"
        ] })
      ] })
    ] }),
    models && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, { title: "\u9009\u62E9 API \u5F00\u653E\u6A21\u578B", busy, close: () => setModels(false), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ApiModels, { data: a, busy, save: async (modelIds) => {
      if (await save({ modelIds })) setModels(false);
    } }) }),
    example && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, { title: "\u63A5\u5165\u793A\u4F8B / \u624B\u52A8\u590D\u5236", busy: false, close: () => setExample(""), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-body stack", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u5C06 YOUR_API_KEY \u66FF\u6362\u4E3A\u81EA\u5DF1\u7684\u670D\u52A1 Key\u3002Base URL \u5DF2\u5305\u542B /v1\uFF1B\u6D4B\u8BD5\u8C03\u7528\u4F1A\u6B63\u5E38\u6D88\u8017\u76EE\u6807\u8D26\u53F7\u7684\u7528\u91CF\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        "\u53EF\u590D\u5236\u5185\u5BB9",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { className: "mono", readOnly: true, rows: 8, value: example, onFocus: (e) => e.currentTarget.select() })
      ] })
    ] }) })
  ] });
}
function ApiModels({ data, busy, save }) {
  const [follow, setFollow] = (0, import_react.useState)(data.modelIds === null), [selected, setSelected] = (0, import_react.useState)(data.modelIds ?? data.models.map((m) => m.id));
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: (e) => {
    e.preventDefault();
    void save(follow ? null : selected);
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-body stack", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: follow, disabled: busy, onChange: (e) => setFollow(e.target.checked) }),
        "\u8DDF\u968F\u8DEF\u7531\u5C55\u793A\uFF08\u65B0\u53D1\u73B0\u7684\u514D\u8D39\u6A21\u578B\u4E5F\u81EA\u52A8\u5F00\u653E\uFF09"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy || follow, onClick: () => setSelected(data.choices.map((m) => m.id)), children: "\u5168\u9009" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy || follow, onClick: () => setSelected([]), children: "\u5168\u4E0D\u9009" })
      ] }),
      data.choices.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", disabled: busy || follow, checked: follow ? m.visible : selected.includes(m.id), onChange: (e) => setSelected(e.target.checked ? [...selected, m.id] : selected.filter((id) => id !== m.id)) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          m.name,
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: "mono muted", style: { overflowWrap: "anywhere" }, children: m.id })
        ] })
      ] }, m.id)),
      !data.choices.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u8BF7\u5148\u6DFB\u52A0\u8DEF\u7531\u3002" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "modal-foot row", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "primary", disabled: busy, children: "\u4FDD\u5B58\u5F00\u653E\u8303\u56F4" }) })
  ] });
}
function ModelsPanel({ error = "", notice = "", data, provider, providerSelect, search, setSearch, busy, act }) {
  const [editing, setEditing] = (0, import_react.useState)(null), [testing, setTesting] = (0, import_react.useState)(null), [testResult, setTestResult] = (0, import_react.useState)(null);
  const models = data.providers.find((p) => p.id === provider)?.models ?? [];
  const all = data.providers.flatMap((p) => p.models), shown = models.filter((m) => `${m.id} ${m.name}`.toLowerCase().includes(search.toLowerCase()));
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stack", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u539F\u59CB\u6A21\u578B\u5C55\u793A" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
          "\u5DF2\u5C55\u793A ",
          all.filter((m) => m.visible).length,
          " / ",
          all.length,
          " \u4E2A \xB7 \u9ED8\u8BA4\u4EC5\u5C55\u793A\u7EDF\u4E00\u8DEF\u7531"
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
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar toolbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
        providerSelect,
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "search", children: [
          "\u641C\u7D22\u6A21\u578B",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "search", placeholder: "\u540D\u79F0\u6216\u6A21\u578B ID", value: search, onChange: (e) => setSearch(e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
        void act({ action: "refresh", provider });
      }, children: "\u83B7\u53D6\u6A21\u578B\u76EE\u5F55" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box table-shell", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "scroll", role: "region", "aria-label": "\u6A21\u578B\u5C55\u793A\u7BA1\u7406", tabIndex: "0", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "table model-table", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u6A21\u578B" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u4E0A\u4E0B\u6587 / \u63A8\u7406" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u9009\u62E9\u5668\u5C55\u793A" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", className: "cell-actions", children: "\u7BA1\u7406" })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: shown.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: m.visible ? "selected" : "", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: m.name }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: "mono muted", children: m.id })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
              capacity(m.contextWindow),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { className: "muted", children: [
                "\u6700\u5927 ",
                capacity(m.maxContextWindow ?? m.contextWindow),
                " \xB7 \u8F93\u51FA ",
                capacity(m.maxTokens),
                m.supportsImages ? " \xB7 \u56FE\u7247" : ""
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: "muted", children: m.reasoning?.supportedEfforts?.length ? m.reasoning.supportedEfforts.map((e) => effortNames[e] || e).join(" / ") : "\u5E73\u53F0\u9ED8\u8BA4" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", "aria-label": `\u5C55\u793A ${m.name}`, disabled: busy, checked: m.visible, onChange: (e) => {
                void act({ action: "model.update", provider, id: m.id, visible: e.target.checked });
              } }),
              m.visible ? "\u5DF2\u5C55\u793A" : "\u5DF2\u9690\u85CF"
            ] }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "cell-actions", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => setEditing({ id: m.id, name: m.name, provider, contextWindow: m.configuredContextWindow ?? null, supportsImages: m.supportsImages, reasoningEffort: m.configuredEffort ?? null }), children: "\u8BBE\u7F6E" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
                setTesting(m);
                setTestResult(null);
              }, children: "\u6D4B\u8BD5" })
            ] })
          ] }, m.id)) })
        ] }),
        !shown.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "empty", children: models.length ? "\u6CA1\u6709\u5339\u914D\u7684\u6A21\u578B\u3002" : "\u6DFB\u52A0\u5E76\u542F\u7528\u8D26\u53F7\u540E\uFF0C\u83B7\u53D6\u6A21\u578B\u76EE\u5F55\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "table-footer", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u4E0A\u4E0B\u6587\u9ED8\u8BA4\u6700\u5927\uFF0C\u53EF\u5728\u8BBE\u7F6E\u4E2D\u8C03\u4F4E\uFF1B\u539F\u59CB\u6A21\u578B\u4E0E\u8DEF\u7531\u9884\u7B97\u72EC\u7ACB\u3002\u9690\u85CF\u4E0D\u5F71\u54CD\u8DEF\u7531\u6216\u5DF2\u6709\u4F1A\u8BDD\u3002" }) })
    ] }),
    editing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, { title: "\u6A21\u578B\u8BBE\u7F6E", busy, close: () => setEditing(null), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModelSettings, { error, notice, model: models.find((m) => m.id === editing.id), draft: editing, setDraft: setEditing, busy, save: async () => {
      if (await act({ action: "model.update", ...editing })) setEditing(null);
    } }) }),
    testing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, { title: `\u6D4B\u8BD5 ${testing.name}`, busy, close: () => {
      setTesting(null);
      setTestResult(null);
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-body stack", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feedback, { error, notice }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "steps", children: "\u53D1\u9001\u4E00\u6761\u7B80\u77ED\u8BF7\u6C42\uFF0C\u6B63\u5E38\u6D88\u8017\u76EE\u6807\u8D26\u53F7\u7684\u7528\u91CF\u3002\u6B64\u6D4B\u8BD5\u4EC5\u68C0\u67E5\u8FDE\u901A\u6027\uFF0C\u4E0D\u4EE3\u8868\u5DF2\u9A8C\u8BC1\u6EE1\u4E0A\u4E0B\u6587\u6216\u56FE\u7247\u8BC6\u522B\u80FD\u529B\u3002" }),
        testResult && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "status", className: testResult.ok ? "good" : "warn", children: testResult.ok ? `\u53EF\u7528 \xB7 ${testResult.elapsedMs} ms` : `\u6D4B\u8BD5\u5931\u8D25\uFF08HTTP ${testResult.status}\uFF09\xB7 ${testResult.hint}` })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "modal-foot row", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: async () => {
        setTestResult(null);
        const result = await act({ action: "model.test", provider, id: testing.id });
        if (result) setTestResult(result.modelTest);
      }, children: busy ? "\u6B63\u5728\u6D4B\u8BD5\u2026" : "\u5F00\u59CB\u6D4B\u8BD5" }) })
    ] })
  ] });
}
var capacity = (n) => n >= 1e6 && n % 1e6 === 0 ? `${n / 1e6}M` : `${fmt(n / 1e3)}K`;
function ContextSelect({ model, value, onChange, disabled, label = "\u4E0A\u4E0B\u6587\u9884\u7B97" }) {
  const max = model.maxContextWindow ?? model.contextWindow;
  const choices = [...new Set([model.defaultContextWindow, ...model.supportedContextWindows ?? [], 2e5, 3e5, 5e5, 6e5, value].filter((n) => Number.isSafeInteger(n) && n > 0 && n <= max))].sort((a, b) => a - b);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
    label,
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { "aria-label": label, disabled, value: value ?? "", onChange: (e) => onChange(e.target.value ? Number(e.target.value) : null), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", { value: "", children: [
        "\u6700\u5927\u5BB9\u91CF \xB7 ",
        capacity(max),
        "\uFF08\u9ED8\u8BA4\uFF09"
      ] }),
      choices.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", { value: n, children: [
        capacity(n),
        n === model.defaultContextWindow ? " \xB7 \u6E20\u9053\u9ED8\u8BA4" : " \xB7 \u672C\u5730\u9884\u7B97"
      ] }, n))
    ] })
  ] });
}
function ModelSettings({ error = "", notice = "", model, draft, setDraft, busy, save }) {
  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: (e) => {
    e.preventDefault();
    void save();
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-body stack", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feedback, { error, notice }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        "\u6A21\u578B\u540D\u79F0",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { autoFocus: true, required: true, maxLength: 200, disabled: busy, value: draft.name, onChange: (e) => set("name", e.target.value) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "mono muted", children: model.id }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContextSelect, { model, value: draft.contextWindow, disabled: busy, onChange: (n) => set("contextWindow", n) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
        "\u6700\u5927\u4E0A\u4E0B\u6587 ",
        capacity(model.maxContextWindow),
        " \xB7 \u6700\u5927\u8F93\u51FA ",
        capacity(model.maxTokens),
        "\u3002\u624B\u52A8\u9884\u7B97\u53EA\u8C03\u4F4E DSH \u7684\u4F1A\u8BDD\u538B\u7F29\u9608\u503C\uFF1B\u8BF7\u6C42\u4F7F\u7528\u80FD\u591F\u5BB9\u7EB3\u8BE5\u9884\u7B97\u7684\u6E20\u9053\u6863\u4F4D\u3002"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", disabled: busy || !model.imageCapable, checked: draft.supportsImages, onChange: (e) => set("supportsImages", e.target.checked) }),
        "\u56FE\u7247\u8F93\u5165",
        !model.imageCapable && "\uFF08\u6E20\u9053\u672A\u58F0\u660E\u652F\u6301\uFF09"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        "\u9ED8\u8BA4\u63A8\u7406\u7B49\u7EA7",
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { disabled: busy, value: draft.reasoningEffort ?? "", onChange: (e) => set("reasoningEffort", e.target.value || null), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u5E73\u53F0\u9ED8\u8BA4" }),
          model.reasoning?.supportedEfforts?.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: e, children: effortNames[e] || e }, e))
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u5173\u95ED\u601D\u8003\u4EC5\u5728\u6E20\u9053\u58F0\u660E\u652F\u6301\u65F6\u63D0\u4F9B\u3002\u4F1A\u8BDD\u4E2D\u7684\u624B\u52A8\u9009\u62E9\u4F18\u5148\u4E8E\u6B64\u9ED8\u8BA4\u503C\u3002" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "modal-foot row", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "primary", disabled: busy, children: "\u4FDD\u5B58\u5E76\u751F\u6548" }) })
  ] });
}
function RoutesTable({ data, busy, act, edit }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: "box table-shell", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "scroll", role: "region", "aria-label": "\u6A21\u578B\u8DEF\u7531\u89C4\u5219", tabIndex: "0", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "table route-table", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u8DEF\u7531 / \u6A21\u578B" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u8D26\u53F7\u4E0E\u6E20\u9053" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u5207\u6362\u89C4\u5219" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u5C55\u793A" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", className: "cell-actions", children: "\u7BA1\u7406" })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: data.routes.map((r) => {
        const accounts = data.accounts.filter((a) => a.enabled !== false && (!r.eligibleAccountIds || r.eligibleAccountIds.includes(a.id)) && r.targets.some((t) => t.provider === a.provider && (!t.account || t.account === a.id)));
        const providers = [...new Set(r.targets.map((t) => data.providers.find((p) => p.id === t.provider)?.name || t.provider))];
        const cooling = r.expiringStatus?.cooldownUntil > Date.now(), modes = r.reasoning?.supportedEfforts ?? [];
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: r.visible !== false ? "selected" : "", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: r.name }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: "muted", children: r.contextKnown === false ? "\u7B49\u5F85\u6A21\u578B\u76EE\u5F55" : `${capacity(r.contextWindow)} \u4E0A\u4E0B\u6587 \xB7 ${r.contextMode === "custom" ? "\u81EA\u5B9A\u4E49\u9884\u7B97" : "\u9ED8\u8BA4\u6700\u5927"}` }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: "muted", children: r.freeOnly ? `${r.freeStatus?.modelRoutes?.filter((m) => m.selected).length || 0} \u4E2A\u514D\u8D39\u6A21\u578B\u5DF2\u5C55\u793A` : modes.length ? `\u63A8\u7406\uFF1A${modes.map((e) => effortNames[e] || e).join(" / ")}` : "\u63A8\u7406\uFF1A\u5E73\u53F0\u9ED8\u8BA4" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { className: "route-targets", children: [
            accounts.length,
            " \u4E2A\u53C2\u4E0E\u8D26\u53F7",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: "muted", children: providers.join("\u3001") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
            r.freeOnly ? "\u4EC5\u514D\u8D39 \xB7 \u81EA\u52A8\u53D1\u73B0" : strategies[r.strategy || "failover"],
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: cooling ? "warn" : "muted", children: cooling ? "\u4E34\u671F\u4F18\u5148\u51B7\u5374\u4E2D" : r.preferExpiringCredits ? "\u4E34\u671F\u79EF\u5206\u4F18\u5148" : `${r.targets.length} \u4E2A\u76EE\u6807 \xB7 4xx \u5207\u6362` })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", "aria-label": `\u5C55\u793A\u8DEF\u7531 ${r.name}`, disabled: busy, checked: r.visible !== false, onChange: (e) => {
              const { id, reasoning, supportsImages, expiringStatus, freeStatus, maxContextWindow, supportedContextWindows, configuredContextWindow, contextKnown, eligibleAccountIds, enforceContext, ...route } = r;
              void act({ action: "route.save", id, previousId: id, route: { ...route, visible: e.target.checked } });
            } }),
            r.visible !== false ? "\u5F00\u542F" : "\u5173\u95ED"
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "cell-actions", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => edit(r), children: r.freeOnly ? "\u7BA1\u7406\u514D\u8D39\u6A21\u578B" : "\u7F16\u8F91\u8DEF\u7531" }) })
        ] }, r.id);
      }) })
    ] }),
    !data.routes.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "empty", children: "\u6DFB\u52A0\u6A21\u578B\u9884\u914D\u7F6E\uFF0C\u6216\u521B\u5EFA\u81EA\u5B9A\u4E49\u8DEF\u7531\u3002" })
  ] }) });
}
var displayName = (a) => (a?.name || a?.id || "\u672A\u77E5\u8D26\u53F7").replace(/(?<!\d)(\+?\d{2,3})\d{3,8}(\d{4})(?!\d)/g, "$1****$2");
var resultLabels = { claimed: "\u7B7E\u5230\u6210\u529F", "already-claimed": "\u5DF2\u9886\u53D6", "no-campaign": "\u65E0\u6D3B\u52A8", retryable: "\u67E5\u8BE2\u5931\u8D25", "before-window": "\u7A97\u53E3\u672A\u5F00", "auth-invalid": "\u4EE4\u724C\u5931\u6548", paused: "\u5E73\u53F0\u6682\u505C", uncertain: "\u5F85\u6838\u5BF9", "device-used": "\u8BBE\u5907\u5DF2\u53C2\u4E0E" };
function Balance({ account }) {
  const b = account.usage?.balance, now = Date.now();
  const expiring = b?.unit === "credits" && !b.error ? (b.packages || []).filter((p) => Number.isFinite(p.remaining) && p.remaining > 0 && p.expiresAt > now && p.expiresAt <= now + 3 * 864e5).reduce((n, p) => n + p.remaining, 0) : 0;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "amount", children: [
      b?.unlimited ? "\u4E0D\u9650\u91CF" : fmt(b?.remaining),
      b?.unit === "credits" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: "muted", style: { display: "inline", marginLeft: 5 }, children: "\u79EF\u5206" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: b?.error ? "error" : expiring ? "warn" : "muted", children: b?.error ? "\u67E5\u8BE2\u5931\u8D25 \xB7 \u4FDD\u7559\u4E0A\u6B21\u4F59\u989D" : expiring ? `${fmt(expiring)} \u79EF\u5206 3 \u5929\u5185\u5230\u671F` : b?.fetchedAt ? `\u66F4\u65B0\u4E8E ${when(b.fetchedAt)}` : "\u7B49\u5F85\u5237\u65B0\u5E73\u53F0\u7528\u91CF" })
  ] });
}
function CheckinResult({ row, compact = false }) {
  const last = row?.last, today = (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  const current = last?.day === today;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: current && ["claimed", "already-claimed"].includes(last.status) ? "good" : last && ["auth-invalid", "paused", "uncertain", "retryable"].includes(last.status) ? "warn" : "muted", children: !row?.supported ? "\u6682\u4E0D\u652F\u6301" : current || last?.status === "auth-invalid" ? resultLabels[last.status] || "\u5DF2\u5904\u7406" : "\u4ECA\u65E5\u672A\u7B7E\u5230" }),
    (!compact || current && last.amount !== void 0) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: "muted", children: current && last.amount !== void 0 ? `\u672C\u6B21 ${fmt(last.amount)} \u79EF\u5206` : row?.auto ? "\u81EA\u52A8\u7B7E\u5230\u5DF2\u5F00\u542F" : "\u81EA\u52A8\u7B7E\u5230\u672A\u5F00\u542F" })
  ] });
}
function AccountPool({ data, provider, providerSelect, busy, act, manage, add }) {
  const [search, setSearch] = (0, import_react.useState)("");
  const accounts = data.accounts.filter((a) => !provider || a.provider === provider), chosen = accounts.filter((a) => a.enabled !== false).length;
  const visible = accounts.filter((a) => `${a.name} ${a.id}`.toLowerCase().includes(search.toLowerCase()));
  const rows = data.checkins?.accounts || [], eligible = rows.filter((r) => accounts.some((a) => a.id === r.id && a.enabled !== false) && r.ready);
  const setAll = (enabled) => {
    void act({ action: "accounts.enabled", ...provider ? { provider } : {}, enabled });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stack", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "section-title", children: "\u8D26\u53F7\u6C60" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "muted", children: [
          accounts.length,
          " \u4E2A\u8D26\u53F7 \xB7 ",
          chosen,
          " \u4E2A\u53C2\u4E0E\u8DEF\u7531"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "primary", disabled: busy, onClick: add, children: "\u6DFB\u52A0\u8D26\u53F7" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar toolbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
        providerSelect,
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "search", children: [
          "\u641C\u7D22\u8D26\u53F7",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "search", value: search, placeholder: "\u540D\u79F0\u6216\u8D26\u53F7 ID", onChange: (e) => setSearch(e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
        !provider?.startsWith("qoder") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
          void act({ action: "accounts.discover", ...provider ? { provider } : {} });
        }, children: "\u83B7\u53D6\u672C\u673A\u767B\u5F55" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
          void act({ action: "monitor.refresh", ...provider ? { provider } : {} });
        }, children: "\u5237\u65B0\u72B6\u6001\u4E0E\u7528\u91CF" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "hint", children: "\u52FE\u9009\u7684\u8D26\u53F7\u53C2\u4E0E\u8DEF\u7531\uFF1B\u81EA\u52A8\u7B7E\u5230\u5728\u300C\u79EF\u5206\u7B7E\u5230\u300D\u4E2D\u5355\u72EC\u8BBE\u7F6E\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "notice", children: [
          "\u5DF2\u9009 ",
          chosen,
          " / ",
          accounts.length
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy || !accounts.length || chosen === accounts.length, onClick: () => setAll(true), children: "\u5168\u9009" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy || !chosen, onClick: () => setAll(false), children: "\u5168\u4E0D\u9009" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { disabled: busy || data.checkins?.running || data.checkins?.error || !eligible.length, onClick: () => {
          void act({ action: "checkins.run", ids: eligible.map((r) => r.id) });
        }, children: [
          "\u7B7E\u5230\u53EF\u7528\u8D26\u53F7\uFF08",
          eligible.length,
          "\uFF09"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: "box table-shell", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "scroll", role: "region", "aria-label": "\u8D26\u53F7\u6C60\u5217\u8868", tabIndex: "0", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "table", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u8D26\u53F7 / \u8DEF\u7531\u53C2\u4E0E" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u5E73\u53F0\u79EF\u5206" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u6A21\u578B\u4E0E\u8C03\u7528" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u4ECA\u65E5\u7B7E\u5230" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", className: "cell-actions", children: "\u7BA1\u7406" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: visible.map((a) => {
          const cooldown = a.status?.cooldowns || [], active = a.status?.activeFor?.length, enabled = a.enabled !== false;
          return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: enabled ? "selected" : "", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "account-cell", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "check account-check", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { "aria-label": `${displayName(a)} \u53C2\u4E0E\u8DEF\u7531`, type: "checkbox", disabled: busy, checked: enabled, onChange: (e) => {
                void act({ action: "account.update", id: a.id, enabled: e.target.checked });
              } }) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "account-name", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: displayName(a) }),
                !provider && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: "muted", children: data.providers?.find((p) => p.id === a.provider)?.name || a.provider }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "status", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: !enabled ? "" : cooldown.length ? "warn" : "good", "aria-hidden": "true" }),
                  !enabled ? "\u672A\u5165\u6C60" : active ? "\u6B63\u5728\u8C03\u7528" : cooldown.length ? "\u90E8\u5206\u8DEF\u7531\u51B7\u5374\u4E2D" : "\u5DF2\u5728\u6C60\u4E2D"
                ] }) }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: "muted", children: loginNames[a.login?.state] || "\u5C1A\u672A\u67E5\u8BE2\u767B\u5F55" })
              ] })
            ] }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Balance, { account: a }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
                fmt(a.modelCount || 0),
                " \u4E2A\u76EE\u5F55\u6A21\u578B"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { className: "muted", children: [
                fmt(a.usage?.requests || 0),
                " \u6B21\u8C03\u7528 \xB7 ",
                fmt(a.usage?.tokens || 0),
                " Token"
              ] }),
              cooldown.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { className: "warn", children: [
                "\u6700\u957F\u7EA6 ",
                Math.ceil(Math.max(...cooldown.map((c) => c.remainingMs)) / 6e4),
                " \u5206\u949F\u540E\u6062\u590D"
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckinResult, { row: rows.find((r) => r.id === a.id) }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "cell-actions", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => manage(a), children: "\u7BA1\u7406\u8D26\u53F7" }) })
          ] }, a.id);
        }) })
      ] }),
      !visible.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "empty", children: accounts.length ? "\u6CA1\u6709\u5339\u914D\u7684\u8D26\u53F7\uFF0C\u8BF7\u8C03\u6574\u641C\u7D22\u3002" : "\u8FD8\u6CA1\u6709\u8D26\u53F7\uFF0C\u70B9\u51FB\u300C\u6DFB\u52A0\u8D26\u53F7\u300D\u83B7\u53D6\u767B\u5F55\u6216\u586B\u5199\u51ED\u8BC1\u3002" })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { className: "help", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "\u672C\u673A\u8D26\u53F7\u83B7\u53D6\u4E0E\u51ED\u8BC1\u8BF4\u660E" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stack", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "WorkBuddy \u4E0E Trae \u542F\u52A8\u65F6\u81EA\u52A8\u8BFB\u53D6\u672C\u673A\u5DF2\u767B\u5F55\u8D26\u53F7\uFF0C\u6BCF\u5206\u949F\u91CD\u65B0\u68C0\u6D4B\uFF1BTrae \u81EA\u52A8\u8BC6\u522B CN\u3001Global \u4E0E SOLO\u3002\u4E5F\u53EF\u6DFB\u52A0\u624B\u52A8\u51ED\u8BC1\u6216\u5BFC\u5165\u5176\u5B83\u8BBE\u5907\u8D26\u53F7\uFF0C\u5404\u8D26\u53F7\u72EC\u7ACB\u4FDD\u5B58\u3002Qoder \u9700\u6DFB\u52A0 PAT\u3002" }),
        data.localDiscovery?.filter((s) => !provider || s.provider === provider).map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
          data.providers?.find((p) => p.id === s.provider)?.name || s.provider,
          " \xB7 ",
          s.state === "found" ? "\u5DF2\u53D1\u73B0\u672C\u673A\u5BA2\u6237\u7AEF\u767B\u5F55\u3002" : s.state === "unreadable" ? "\u65E0\u6CD5\u8BFB\u53D6\u672C\u673A\u767B\u5F55\u6587\u4EF6\uFF0C\u8BF7\u5728\u5B98\u65B9\u5BA2\u6237\u7AEF\u91CD\u65B0\u767B\u5F55\uFF0C\u6216\u624B\u52A8\u586B\u5199\u51ED\u8BC1\u3002" : "\u672A\u627E\u5230\u672C\u673A\u767B\u5F55\uFF0C\u8BF7\u5148\u767B\u5F55\u5BF9\u5E94\u533A\u57DF\u7684\u5B98\u65B9\u5BA2\u6237\u7AEF\u3002",
          " \xB7 ",
          when(s.checkedAt)
        ] }, s.provider))
      ] })
    ] })
  ] });
}
function CheckinPanel({ data, busy, act }) {
  const info = data.checkins || {}, rows = info.accounts || [], today = (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  const saved = info.settings ?? { mode: "scheduled", time: "10:05" };
  const [schedule, setSchedule] = (0, import_react.useState)(saved);
  (0, import_react.useEffect)(() => {
    setSchedule(saved);
  }, [saved.mode, saved.time]);
  const changed = schedule.mode !== saved.mode || schedule.time !== saved.time;
  const blocked = busy || info.running || !!info.error;
  const eligible = rows.filter((r) => r.supported && !r.paused && data.accounts.find((a) => a.id === r.id)?.enabled && r.ready === true);
  const ready = (r) => eligible.includes(r);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stack", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u6BCF\u65E5\u79EF\u5206\u7B7E\u5230" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: info.schedule }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u81EA\u52A8\u7B7E\u5230\u9ED8\u8BA4\u5173\u95ED\uFF0C\u8BF7\u5728\u4E0B\u65B9\u9010\u4E2A\u5F00\u542F\u3002" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "primary", disabled: blocked || !eligible.length, onClick: () => {
          void act({ action: "checkins.run", ids: eligible.map((r) => r.id) });
        }, children: [
          "\u7B7E\u5230\u5168\u90E8\u53EF\u7528\u8D26\u53F7\uFF08",
          eligible.length,
          "\uFF09"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { className: "row plan-form", onSubmit: (e) => {
        e.preventDefault();
        void act({ action: "checkins.settings", schedule });
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "filter", children: [
          "\u81EA\u52A8\u7B7E\u5230\u65B9\u5F0F",
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { "aria-label": "\u81EA\u52A8\u7B7E\u5230\u65B9\u5F0F", value: schedule.mode, disabled: blocked, onChange: (e) => setSchedule({ ...schedule, mode: e.target.value }), children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "startup", children: "\u6BCF\u65E5\u542F\u52A8\u65F6\u7B7E\u5230" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "scheduled", children: "\u6BCF\u5929\u5B9A\u65F6\u7B7E\u5230" })
          ] })
        ] }),
        schedule.mode === "scheduled" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "filter", children: [
          "\u7B7E\u5230\u65F6\u95F4\uFF08\u5317\u4EAC\u65F6\u95F4\uFF09",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { "aria-label": "\u7B7E\u5230\u65F6\u95F4\uFF08\u5317\u4EAC\u65F6\u95F4\uFF09", type: "time", required: true, value: schedule.time, disabled: blocked, onChange: (e) => setSchedule({ ...schedule, time: e.target.value }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: blocked || !changed, children: "\u4FDD\u5B58\u7B7E\u5230\u8BA1\u5212" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { className: "help", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "\u6267\u884C\u89C4\u5219\u3001\u8865\u67E5\u4E0E\u8BBE\u5907\u9650\u5236" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stack", children: [
          "    ",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u81EA\u52A8\u7B7E\u5230\u9ED8\u8BA4\u5173\u95ED\uFF0C\u6309\u8D26\u53F7\u5F00\u542F\u3002\u5148\u67E5\u9886\u53D6\u72B6\u6001\u3001\u4E32\u884C\u63D0\u4EA4\uFF0C\u8D26\u53F7\u95F4\u9694\u81F3\u5C11 10 \u79D2\uFF1B\u6BCF\u4E2A\u8D26\u53F7\u6BCF\u5929\u6700\u591A\u63D0\u4EA4\u4E00\u6B21\u9886\u53D6\u3002\u786E\u8BA4\u5C1A\u672A\u63D0\u4EA4\u7684\u67E5\u8BE2\u5931\u8D25\uFF0C20:05 \u540E\u6700\u591A\u8865\u67E5\u4E00\u6B21\uFF1B\u5DF2\u9886\u53D6\u3001\u65E0\u6D3B\u52A8\u548C\u7ED3\u679C\u4E0D\u660E\u7684\u8D26\u53F7\u8DF3\u8FC7\u3002\u9047\u5230\u9A8C\u8BC1\u3001\u9650\u6D41\u6216\u8BBE\u5907\u9650\u5236\u5C31\u505C\u6B62\uFF0C\u4E0D\u4F1A\u4FEE\u6539\u8BBE\u5907\u8EAB\u4EFD\u6216\u5207\u6362\u8D26\u53F7\u91CD\u8BD5\u3002" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u542F\u52A8\u6A21\u5F0F\u5728\u5F53\u5929\u9996\u6B21\u8FD0\u884C\u65F6\u6267\u884C\uFF0C\u6301\u7EED\u8FD0\u884C\u5219\u65B0\u4E00\u5929\u81EA\u52A8\u6267\u884C\uFF1B\u5B9A\u65F6\u6A21\u5F0F\u5728\u8BBE\u5B9A\u65F6\u95F4\u540E\u6267\u884C\uFF0C\u9519\u8FC7\u65F6\u4E0B\u6B21\u542F\u52A8\u8865\u67E5\u3002Qoder \u6700\u65E9\u5317\u4EAC\u65F6\u95F4 10:05 \u67E5\u8BE2\u5F53\u65E5\u6D3B\u52A8\u3002DSH \u5173\u95ED\u671F\u95F4\u4E0D\u6267\u884C\uFF0C\u8FD0\u884C\u65F6\u7EA6\u4E00\u5206\u949F\u5185\u89E6\u53D1\u3002\u4FEE\u6539\u8BA1\u5212\u3001\u5237\u65B0\u9762\u677F\u6216\u91CD\u542F\u4E0D\u4F1A\u6E05\u9664\u5DF2\u5904\u7406\u8BB0\u5F55\uFF1B\u4EE4\u724C\u5931\u6548\u540E\u8BF7\u66F4\u65B0\u51ED\u8BC1\u518D\u6062\u590D\u3002" })
        ] })
      ] }),
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
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "scroll", role: "region", "aria-label": `${p.name} \u7B7E\u5230\u8BB0\u5F55`, tabIndex: "0", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "table", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u8D26\u53F7" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u81EA\u52A8\u7B7E\u5230" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u4ECA\u65E5\u7ED3\u679C" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u6700\u8FD1\u8BB0\u5F55" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", className: "cell-actions", children: "\u64CD\u4F5C" })
            ] }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: accounts.map((a) => {
              const r = rows.find((r2) => r2.id === a.id) || {}, last = r.last?.day === today ? r.last : void 0;
              return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: info.current === a.id ? "selected" : "", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: displayName(a) }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: "muted", children: a.enabled === false ? "\u8D26\u53F7\u5DF2\u505C\u7528" : "\u5DF2\u5728\u8D26\u53F7\u6C60\u4E2D" })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { "aria-label": `${displayName(a)} \u6BCF\u65E5\u81EA\u52A8\u7B7E\u5230`, type: "checkbox", disabled: blocked, checked: r.auto === true, onChange: (e) => {
                    void act({ action: "account.update", id: a.id, autoCheckin: e.target.checked });
                  } }),
                  "\u6BCF\u65E5\u81EA\u52A8\u7B7E\u5230"
                ] }) }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckinResult, { row: r, compact: true }) }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: "muted", children: r.last ? when(r.last.at) : "\u5C1A\u65E0\u8BB0\u5F55" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: "muted", children: r.last?.message || "\u7B49\u5F85\u9996\u6B21\u7B7E\u5230" }),
                  last?.retryAt && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { className: "warn", children: [
                    "\u8865\u67E5\u65F6\u95F4 ",
                    when(last.retryAt)
                  ] }),
                  r.last?.activity && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "\u6D3B\u52A8\u8BE6\u60C5" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: "muted", children: [r.last.activity.streakDays !== void 0 && `\u8FDE\u7B7E ${fmt(r.last.activity.streakDays)} \u5929`, r.last.activity.totalCredits !== void 0 && `\u6D3B\u52A8\u7D2F\u8BA1 ${fmt(r.last.activity.totalCredits)} \u79EF\u5206`, r.last.activity.nextStreakDay !== void 0 && `\u4E0B\u4E00\u8FDE\u7B7E\u6863\u4F4D ${fmt(r.last.activity.nextStreakDay)} \u5929`, r.last.activity.endsAt !== void 0 && `\u6D3B\u52A8\u622A\u6B62 ${when(r.last.activity.endsAt)}`].filter(Boolean).join(" \xB7 ") })
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "cell-actions", children: p.id === "workbuddy" && r.last?.status === "auth-invalid" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: blocked, onClick: () => {
                  void act({ action: "checkins.verify", id: a.id });
                }, children: "\u91CD\u65B0\u9A8C\u8BC1\u767B\u5F55" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: blocked || !ready(r), onClick: () => {
                  void act({ action: "checkins.run", ids: [a.id] });
                }, children: r.last?.status === "auth-invalid" ? "\u8BF7\u66F4\u65B0\u51ED\u8BC1" : last?.retryReady ? "\u8865\u67E5\u7B7E\u5230" : last?.retryAt ? "\u7B49\u5F85\u665A\u95F4\u8865\u67E5" : last ? "\u4ECA\u65E5\u5DF2\u5904\u7406" : "\u7ACB\u5373\u7B7E\u5230" }) })
              ] }, a.id);
            }) })
          ] }) })
        ] })
      ] }, p.id);
    }),
    !data.accounts.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "box empty", children: "\u5148\u5230\u300C\u8D26\u53F7\u4E0E\u767B\u5F55\u300D\u6DFB\u52A0\u8D26\u53F7\uFF0C\u518D\u5F00\u542F\u6BCF\u65E5\u81EA\u52A8\u7B7E\u5230\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u591A\u53F0\u8BBE\u5907\u7684\u672C\u5730\u8BB0\u5F55\u4E0D\u4F1A\u4E92\u76F8\u540C\u6B65\uFF0C\u6BCF\u6B21\u90FD\u4F1A\u67E5\u8BE2\u5E73\u53F0\u9886\u53D6\u72B6\u6001\uFF1B\u5EFA\u8BAE\u4EC5\u5728\u4E00\u53F0\u5E38\u7528\u8BBE\u5907\u5F00\u542F\u81EA\u52A8\u7B7E\u5230\u3002\u540C\u4E00 Trae \u8BBE\u5907\u6BCF\u5929\u6700\u591A\u5904\u7406\u4E00\u4E2A\u9886\u53D6\u8BF7\u6C42\uFF0C\u91CD\u590D\u8D26\u53F7\u526F\u672C\u4F1A\u53BB\u91CD\uFF1B\u4E0D\u4FDD\u8BC1\u5E73\u53F0\u4E00\u5B9A\u53D1\u653E\u5956\u52B1\u3002" })
  ] });
}
function Overview({ data, busy, act, go }) {
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
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PerformanceMetrics, { events: (t.events || []).filter((e) => e.at >= usageDateBounds("1")[0]) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u5E73\u53F0\u989D\u5EA6" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "notice", children: "\u5E73\u53F0\u7528\u91CF \xB7 \u6BCF 5 \u5206\u949F\u66F4\u65B0" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
          void act({ action: "monitor.refresh" });
        }, children: "\u5237\u65B0\u5E73\u53F0\u7528\u91CF" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box table-shell", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "scroll", role: "region", "aria-label": "\u5404\u5E73\u53F0\u8D26\u53F7\u989D\u5EA6", tabIndex: "0", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "table", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u8D26\u53F7" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u4F9B\u5E94\u5546 / \u533A\u57DF" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u5E73\u53F0\u79EF\u5206" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u4ECA\u65E5\u7B7E\u5230" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", className: "cell-actions", children: "\u8DEF\u7531\u72B6\u6001" })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: data.accounts.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: displayName(a) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: "muted", children: loginNames[a.login?.state] || "\u5C1A\u672A\u67E5\u8BE2\u767B\u5F55" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: data.providers.find((p) => p.id === a.provider)?.name || a.provider }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Balance, { account: a }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckinResult, { row: data.checkins?.accounts.find((r) => r.id === a.id) }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "cell-actions", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "status", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: a.enabled === false ? "" : a.status?.cooldowns?.length ? "warn" : "good", "aria-hidden": "true" }),
              a.enabled === false ? "\u672A\u5165\u6C60" : a.status?.cooldowns?.length ? "\u90E8\u5206\u8DEF\u7531\u51B7\u5374" : "\u5DF2\u5728\u6C60\u4E2D"
            ] }) })
          ] }, a.id)) })
        ] }),
        !data.accounts.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "empty", children: "\u5C1A\u672A\u8FDE\u63A5\u8D26\u53F7\uFF0C\u8BF7\u5148\u83B7\u53D6\u672C\u673A\u767B\u5F55\u6216\u6DFB\u52A0\u51ED\u8BC1\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "table-footer bar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u5404\u5E73\u53F0\u79EF\u5206\u72EC\u7ACB\u5C55\u793A\uFF0C\u4E34\u671F\u63D0\u9192\u4EC5\u663E\u793A\u5DF2\u786E\u8BA4\u7684\u4F59\u989D\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => go("accounts"), children: "\u7BA1\u7406\u8D26\u53F7\u6C60" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u9762\u677F\u8BFB\u53D6\u672C\u673A\u7F13\u5B58\uFF0C\u4E0D\u4F1A\u89E6\u53D1\u5E73\u53F0\u67E5\u8BE2\u3002\u5E73\u53F0\u4F59\u989D\u6BCF 5 \u5206\u949F\u66F4\u65B0\uFF0C\u624B\u52A8\u5237\u65B0\u7ACB\u5373\u67E5\u8BE2\uFF1B\u79EF\u5206\u8F6E\u6362\u4E0E\u4E34\u671F\u4F18\u5148\u6309\u9700\u590D\u6838\u3002Token \u4EC5\u7EDF\u8BA1\u672C\u63D2\u4EF6\u8BF7\u6C42\u3002" }),
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u5E38\u7528\u5165\u53E3" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u8FDE\u63A5\u8D26\u53F7\u540E\uFF0C\u5728 DSH \u6A21\u578B\u9009\u62E9\u5668\u4E2D\u4F7F\u7528\u300C\u7EDF\u4E00\u8DEF\u7531\u300D\u3002" }),
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
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u6027\u80FD" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u7ED3\u679C" })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: (t.events || []).slice(0, 15).map((e, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: when(e.at) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: data.accounts.find((a) => a.id === e.account)?.name || e.account }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "mono", children: e.alias }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: fmt(e.tokens) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RequestPerformance, { event: e }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: e.outcome === "completed" ? "\u6210\u529F" : e.outcome === "cancelled" ? "\u5DF2\u53D6\u6D88" : `\u5931\u8D25 ${e.status}` })
          ] }, `${e.at}:${i}`)) })
        ] }),
        !t.events?.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "empty", children: "\u5C1A\u65E0\u8BF7\u6C42\u8BB0\u5F55\u3002\u901A\u8FC7\u672C\u63D2\u4EF6\u8C03\u7528\u6A21\u578B\u540E\u4F1A\u663E\u793A\u5728\u8FD9\u91CC\u3002" })
      ] })
    ] })
  ] });
}
function usageDateBounds(period, start, end, now = Date.now()) {
  const today = new Date(now).toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  const midnight = (day) => Date.parse(`${day}T00:00:00+08:00`);
  if (period === "custom") return [midnight(start), midnight(end) + 864e5];
  if (period === "all") return [-Infinity, Infinity];
  return [midnight(today) - (Number(period) - 1) * 864e5, midnight(today) + 864e5];
}
var duration = (ms) => typeof ms !== "number" || !Number.isFinite(ms) ? "\u2014" : ms < 6e4 ? `${fmt(ms / 1e3)} \u79D2` : `${Math.floor(ms / 6e4)} \u5206 ${fmt(ms % 6e4 / 1e3)} \u79D2`;
function performanceSummary(events) {
  const rows = events.filter((e) => e.outcome === "completed" && e.timing);
  const sum = (key, source = rows) => source.some((e) => e.timing[key] != null) ? source.reduce((n, e) => n + (e.timing[key] ?? 0), 0) : null;
  const first = rows.filter((e) => e.timing.ttftMs != null), decode = rows.filter((e) => e.timing.decodeMs > 0 && e.timing.decodeTokens != null), tools = rows.filter((e) => e.timingSource === "dsh-step");
  return {
    modelMs: sum("modelMs"),
    toolMs: sum("toolMs", tools),
    ttftMs: first.length ? sum("ttftMs", first) / first.length : null,
    tps: decode.length ? sum("decodeTokens", decode) / (sum("decodeMs", decode) / 1e3) : null,
    samples: rows.length,
    firstSamples: first.length,
    decodeSamples: decode.length,
    toolSamples: tools.length,
    pendingTools: tools.reduce((n, e) => n + (e.timing.toolCount ?? 0) - (e.timing.toolsCompleted ?? 0), 0)
  };
}
function PerformanceMetrics({ events }) {
  const stats = performanceSummary(events);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "stack performance", "aria-label": "\u8C03\u7528\u6027\u80FD\u7EDF\u8BA1", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u8C03\u7528\u6027\u80FD" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
        "\u6210\u529F\u8C03\u7528 \xB7 ",
        fmt(stats.samples),
        " \u6761\u6027\u80FD\u8BB0\u5F55"
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "metrics", children: [
      metric("\u6A21\u578B\u7528\u65F6", duration(stats.modelMs), "\u6210\u529F\u8C03\u7528\u7528\u65F6\u5408\u8BA1"),
      metric("\u5DE5\u5177\u8C03\u7528\u7528\u65F6", duration(stats.toolMs), `${stats.toolSamples} \u6761 DSH \u6B65\u9AA4${stats.pendingTools ? ` \xB7 ${stats.pendingTools} \u4E2A\u5DE5\u5177\u672A\u5B8C\u6210` : ""}`),
      metric("\u9996 Token \u5E73\u5747\uFF08TTFT\uFF09", duration(stats.ttftMs), `${stats.firstSamples} \u6761\u9996 Token \u8BB0\u5F55`),
      metric("\u8F93\u51FA\u901F\u5EA6\uFF08TPS\uFF09", stats.tps === null ? "\u2014" : `${fmt(stats.tps)} tok/s`, `${stats.decodeSamples} \u6761\u89E3\u7801\u8BB0\u5F55 \xB7 \u52A0\u6743\u901F\u5EA6`)
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { className: "help", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "\u7EDF\u8BA1\u53E3\u5F84\u4E0E\u7F3A\u5931\u6570\u636E" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u968F\u5F53\u524D\u65F6\u95F4\u3001\u8D26\u53F7\u3001\u8DEF\u7531\u548C\u7ED3\u679C\u7B5B\u9009\u6C47\u603B\uFF0C\u4ECE\u672C\u7248\u5F00\u59CB\u8BB0\u5F55\uFF1B\u65E7\u6570\u636E\u4E0D\u8865\u7B97\u3002DSH \u6B65\u9AA4\u53E3\u5F84\u4E0E\u4F1A\u8BDD\u7EDF\u8BA1\u4E00\u81F4\uFF1A\u6A21\u578B\u7528\u65F6\u4ECE\u6B65\u9AA4\u5F00\u59CB\u5230\u56DE\u590D\u5B8C\u6210\uFF0C\u9996 Token \u5305\u62EC\u975E\u7A7A\u6587\u672C\u3001\u63A8\u7406\u6216\u5DE5\u5177\u8C03\u7528\uFF0C\u5DE5\u5177\u7528\u65F6\u6309\u8C03\u7528\u4E0E\u7ED3\u679C\u914D\u5BF9\u76F8\u52A0\uFF08\u5E76\u884C\u5DE5\u5177\u53EF\u80FD\u91CD\u53E0\uFF09\u3002TPS = \u6709\u6548\u8F93\u51FA Token \u5408\u8BA1 \xF7 \u9996 Token \u540E\u7684\u89E3\u7801\u79D2\u6570\u5408\u8BA1\uFF0C\u4E0D\u5BF9\u5404\u6B21\u901F\u5EA6\u7B80\u5355\u5E73\u5747\u3002\u672A\u7ECF\u8FC7 DSH \u6B65\u9AA4\u7684\u8BF7\u6C42\u4F7F\u7528\u4E0A\u6E38\u8BA1\u65F6\uFF0C\u65E0\u6CD5\u8BB0\u5F55\u5DE5\u5177\u6267\u884C\u7528\u65F6\u3002\u8FD9\u91CC\u53EA\u6C47\u603B\u672C\u63D2\u4EF6\u4FDD\u7559\u4E14\u7B5B\u9009\u5185\u7684\u8C03\u7528\uFF0C\u5E76\u975E\u67D0\u4E2A\u4F1A\u8BDD\u7684\u5B8C\u6574\u5386\u53F2\u3002\u5931\u8D25\u4E0E\u53D6\u6D88\u4FDD\u7559\u9010\u6B21\u8017\u65F6\uFF0C\u4E0D\u8BA1\u5165\u4EE5\u4E0A\u6210\u529F\u8C03\u7528\u6307\u6807\u3002" }) })
    ] })
  ] });
}
function UsageDetails({ data, busy, act }) {
  const [account, setAccount] = (0, import_react.useState)(""), [route, setRoute] = (0, import_react.useState)(""), [outcome, setOutcome] = (0, import_react.useState)(""), [source, setSource] = (0, import_react.useState)(""), [page, setPage] = (0, import_react.useState)(0);
  const [period, setPeriod] = (0, import_react.useState)("30"), [start, setStart] = (0, import_react.useState)(() => new Date(Date.now() - 29 * 864e5).toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" })), [end, setEnd] = (0, import_react.useState)(() => (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" }));
  const all = data.telemetry?.events || [], retention = data.options.usageRetentionDays;
  const [from, until] = usageDateBounds(period, start, end), invalidRange = !(from < until);
  const events = all.filter((e) => e.at >= from && e.at < until && (!account || e.account === account) && (!route || e.alias === route) && (!outcome || e.outcome === outcome) && (!source || (e.source || "dsh") === source));
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
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { className: "help", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", { children: [
          "\u8C03\u6574\u660E\u7EC6\u4FDD\u7559\u5929\u6570\uFF08\u5F53\u524D ",
          retention,
          " \u5929\uFF09"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stack", children: [
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
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u9ED8\u8BA4\u6EDA\u52A8\u4FDD\u7559\u6700\u8FD1 30 \u5929\uFF0C\u53EF\u8BBE\u7F6E 1\u2013365 \u5929\u3002\u7F29\u77ED\u671F\u9650\u4F1A\u5220\u9664\u8D85\u671F\u660E\u7EC6\uFF0C\u5EF6\u957F\u4E0D\u80FD\u6062\u590D\u5DF2\u5220\u9664\u8BB0\u5F55\uFF1B\u7D2F\u8BA1\u7EDF\u8BA1\u3001\u989D\u5EA6\u8F6E\u6362\u548C\u4E34\u671F\u51B7\u5374\u4E0D\u53D7\u5F71\u54CD\u3002" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "row", role: "group", "aria-label": "\u660E\u7EC6\u65F6\u95F4\u8303\u56F4", children: [["1", "\u4ECA\u65E5"], ["3", "\u8FD1 3 \u65E5"], ["7", "\u8FD1 7 \u65E5"], ["30", "\u8FD1 30 \u65E5"], ["all", "\u5168\u90E8\u5DF2\u4FDD\u7559"], ["custom", "\u81EA\u5B9A\u4E49"]].map(([value, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { "aria-pressed": period === value, onClick: () => {
        setPeriod(value);
        setPage(0);
      }, children: label }, value)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u6309\u5317\u4EAC\u65F6\u95F4\u81EA\u7136\u65E5\u7B5B\u9009" })
    ] }),
    period === "custom" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "filter", children: [
        "\u5F00\u59CB\u65E5\u671F\uFF08\u5317\u4EAC\u65F6\u95F4\uFF09",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "date", value: start, max: end || void 0, required: true, onChange: (e) => {
          setStart(e.target.value);
          setPage(0);
        } })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "filter", children: [
        "\u7ED3\u675F\u65E5\u671F\uFF08\u5317\u4EAC\u65F6\u95F4\uFF09",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "date", value: end, min: start || void 0, required: true, onChange: (e) => {
          setEnd(e.target.value);
          setPage(0);
        } })
      ] }),
      invalidRange && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "alert", className: "error", children: "\u8BF7\u9009\u62E9\u6709\u6548\u7684\u8D77\u6B62\u65E5\u671F\uFF0C\u7ED3\u675F\u65E5\u671F\u4E0D\u80FD\u65E9\u4E8E\u5F00\u59CB\u65E5\u671F\u3002" })
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
        "\u6765\u6E90",
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: source, onChange: (e) => {
          setSource(e.target.value);
          setPage(0);
        }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u5168\u90E8\u6765\u6E90" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "dsh", children: "DSH \u4F1A\u8BDD" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "api", children: "API \u670D\u52A1" })
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
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PerformanceMetrics, { events }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box table-shell", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "scroll", role: "region", "aria-label": "\u8BF7\u6C42\u7528\u91CF\u4E0E\u6027\u80FD\u660E\u7EC6", tabIndex: "0", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "table", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u65F6\u95F4" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u6E20\u9053 / \u8D26\u53F7" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u8DEF\u7531 / \u5B9E\u9645\u6A21\u578B" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u8F93\u5165" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u8F93\u51FA" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u603B Token" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u6027\u80FD" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "\u7ED3\u679C" })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: events.slice(current * 50, (current + 1) * 50).map((e, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
              when(e.at),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: "muted", children: e.source === "api" ? "API \u670D\u52A1" : "DSH \u4F1A\u8BDD" })
            ] }),
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
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RequestPerformance, { event: e }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
              e.outcome === "completed" ? "\u6210\u529F" : e.outcome === "cancelled" ? "\u5DF2\u53D6\u6D88" : "\u5931\u8D25",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: e.status })
            ] })
          ] }, e.at + ":" + current + ":" + i)) })
        ] }),
        !events.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "empty", children: "\u5F53\u524D\u7B5B\u9009\u548C\u4FDD\u7559\u671F\u9650\u5185\u6CA1\u6709\u8BF7\u6C42\u660E\u7EC6\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar table-footer", children: [
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
function RequestPerformance({ event: e }) {
  const t = e.timing;
  if (!t) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "\u672A\u8BB0\u5F55" });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { className: "help", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: duration(t.modelMs) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { minWidth: 170 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
        "\u6A21\u578B\uFF1A",
        duration(t.modelMs)
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
        "\u9996 Token\uFF1A",
        duration(t.ttftMs)
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
        "TPS\uFF1A",
        t.decodeMs > 0 && t.decodeTokens != null ? `${fmt(t.decodeTokens / (t.decodeMs / 1e3))} tok/s` : "\u2014"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
        "\u5DE5\u5177\uFF1A",
        duration(t.toolMs),
        t.toolCount != null ? ` \xB7 ${t.toolsCompleted} / ${t.toolCount} \u5B8C\u6210` : ""
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: e.timingSource === "dsh-step" ? "DSH \u6B65\u9AA4\u8BA1\u65F6" : "\u4E0A\u6E38\u8BF7\u6C42\u8BA1\u65F6" })
    ] })
  ] });
}
function AccountForm({ modal, provider, data, busy, act, close, replace, error, notice }) {
  const [revision, setRevision] = (0, import_react.useState)(modal.revision);
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
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u8DEF\u7531\u8D26\u53F7\u987A\u5E8F" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u6545\u969C\u5207\u6362\u6309\u6B64\u987A\u5E8F\u5C1D\u8BD5\uFF1B\u6743\u91CD\u6216\u989D\u5EA6\u7B56\u7565\u4EE5\u8DEF\u7531\u914D\u7F6E\u4E3A\u51C6\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "row", children: [-1, 1].map((direction) => {
        const group = data.accounts.filter((a) => a.provider === account.provider), i = group.findIndex((a) => a.id === account.id);
        return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy || (direction < 0 ? i === 0 : i === group.length - 1), onClick: async () => {
          const next = await act({ action: "account.move", id: account.id, direction });
          if (next) setRevision(next.revision);
        }, children: direction < 0 ? "\u524D\u79FB" : "\u540E\u79FB" }, direction);
      }) })
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
      if (await act({ action: "account.update", revision, id: account.id, name: new FormData(e.currentTarget).get("name") })) close();
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
  const [phone, setPhone] = (0, import_react.useState)(""), [smsCode, setSmsCode] = (0, import_react.useState)(""), [sms, setSms] = (0, import_react.useState)(null), [verify, setVerify] = (0, import_react.useState)(true), [clock, setClock] = (0, import_react.useState)(Date.now());
  (0, import_react.useEffect)(() => {
    if (mode !== "sms") return;
    const timer = setInterval(() => setClock(Date.now()), 1e3);
    return () => clearInterval(timer);
  }, [mode]);
  const resend = Math.max(0, Math.ceil(((sms?.resendAt || 0) - clock) / 1e3));
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
    if (mode === "sms") {
      const result = await act({ action: "workbuddy.login", revision: data.revision, challenge: sms?.challenge, code: smsCode, verify, id: replacing ? modal.account.id : void 0, name: f.name || void 0 });
      if (result) {
        setPhone("");
        setSmsCode("");
        setSms(null);
        close(selected);
      }
      return;
    }
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
            setMode("client");
            setJson("");
            setLocalError("");
            setSms(null);
            setSmsCode("");
            setPhone("");
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
          selected === "workbuddy" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "sms", children: "\u77ED\u4FE1\u767B\u5F55\u5E76\u4FDD\u5B58\u51ED\u8BC1" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", { value: "manual", children: [
            "\u624B\u52A8\u586B\u5199",
            isQoder ? " PAT" : "\u51ED\u8BC1"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "json", children: "\u7C98\u8D34 / \u9009\u62E9\u51ED\u8BC1 JSON" })
        ] })
      ] }),
      mode === "sms" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "steps stack", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "WorkBuddy \u624B\u673A\u53F7\u767B\u5F55" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u4EC5\u7528\u4E8E\u5DF2\u6709\u4E2D\u56FD\u7248\u8D26\u53F7\u3002\u624B\u673A\u53F7\u548C\u9A8C\u8BC1\u7801\u63D0\u4EA4\u81F3 WorkBuddy \u5B98\u65B9\uFF0C\u51ED\u8BC1\u4EC5\u4FDD\u5B58\u5728\u672C\u673A\uFF0C\u65E0\u9700\u5B89\u88C5 Python\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          "\u624B\u673A\u53F7",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "tel", inputMode: "tel", autoComplete: "tel", required: true, pattern: "1[3-9][0-9]{9}", maxLength: "11", value: phone, disabled: busy || resend > 0, onChange: (e) => {
            setPhone(e.target.value);
            setSms(null);
            setSmsCode("");
          } })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy || resend > 0 || !/^1[3-9]\d{9}$/.test(phone), onClick: async () => {
            const next = await act({ action: "workbuddy.sms", phone });
            if (next) {
              setSms(next.workbuddyLogin);
              setClock(Date.now());
              setSmsCode("");
            }
          }, children: resend ? `${resend} \u79D2\u540E\u53EF\u91CD\u53D1` : sms ? "\u91CD\u65B0\u53D1\u9001\u9A8C\u8BC1\u7801" : "\u53D1\u9001\u9A8C\u8BC1\u7801" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "notice", role: "status", children: sms ? clock >= sms.expiresAt ? "\u9A8C\u8BC1\u7801\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u83B7\u53D6" : "\u9A8C\u8BC1\u7801\u5DF2\u53D1\u9001\uFF0C\u8BF7\u67E5\u770B\u77ED\u4FE1" : "\u70B9\u51FB\u53D1\u9001\u624D\u4F1A\u8BF7\u6C42\u77ED\u4FE1\uFF0C\u4E0D\u81EA\u52A8\u91CD\u8BD5" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          "\u77ED\u4FE1\u9A8C\u8BC1\u7801",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "text", inputMode: "numeric", autoComplete: "one-time-code", required: true, pattern: "[0-9]{4,8}", maxLength: "8", value: smsCode, disabled: busy || !sms, onChange: (e) => setSmsCode(e.target.value) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: verify, disabled: busy, onChange: (e) => setVerify(e.target.checked) }),
          "\u767B\u5F55\u540E\u9A8C\u8BC1\u5237\u65B0\u4EE4\u724C\uFF08\u63A8\u8350\uFF09"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u540C\u4E00\u8D26\u53F7\u66F4\u65B0\u51ED\u8BC1\uFF0C\u65B0\u8D26\u53F7\u72EC\u7ACB\u4FDD\u5B58\uFF1B\u4E0D\u4F1A\u5F00\u542F\u81EA\u52A8\u7B7E\u5230\u3002\u9047\u5E73\u53F0\u9A8C\u8BC1\u6216\u9650\u5236\uFF0C\u8BF7\u6539\u7528\u672C\u673A\u5BA2\u6237\u7AEF\u8BFB\u53D6\u3002" })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "steps stack", children: [
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
      mode !== "sms" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
        "\u51ED\u8BC1\u4EC5\u4FDD\u5B58\u5230\u672C\u673A\u63D2\u4EF6\u8D26\u53F7\u6C60\u3002\u4E0D\u4F1A\u5728\u8D26\u53F7\u5217\u8868\u663E\u793A Token\uFF1B\u6BCF\u4E2A\u8D26\u53F7\u72EC\u7ACB\u5237\u65B0\u3002",
        replacing ? "\u4FDD\u5B58\u540E\u542F\u7528\u6B64\u8D26\u53F7\uFF0C\u539F\u51ED\u8BC1\u526F\u672C\u4FDD\u7559\u3002" : "\u91CD\u590D\u8BFB\u53D6\u540C\u4E00\u8D26\u53F7\u4F1A\u63D0\u793A\u3002"
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-foot bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy, onClick: close, children: "\u53D6\u6D88" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "primary", type: "submit", disabled: busy || mode === "sms" && (!sms || clock >= sms.expiresAt), children: busy ? "\u6B63\u5728\u5904\u7406\u2026" : mode === "sms" ? "\u767B\u5F55\u5E76\u4FDD\u5B58\u5230\u8D26\u53F7\u6C60" : mode === "client" ? "\u4E00\u952E\u83B7\u53D6\u5E76\u4FDD\u5B58\u767B\u5F55" : "\u4FDD\u5B58\u51ED\u8BC1\u5E76\u83B7\u53D6\u6A21\u578B" })
    ] })
  ] });
}
function MigrationForm({ data, act, busy }) {
  const [panel, setPanel] = (0, import_react.useState)(null);
  const [include, setInclude] = (0, import_react.useState)(false), [exportPassword, setExportPassword] = (0, import_react.useState)(""), [confirmPassword, setConfirmPassword] = (0, import_react.useState)(""), [exportError, setExportError] = (0, import_react.useState)("");
  const [document2, setDocument] = (0, import_react.useState)(""), [fileName, setFileName] = (0, import_react.useState)(""), [password, setPassword] = (0, import_react.useState)(""), [mode, setMode] = (0, import_react.useState)("merge"), [preview, setPreview] = (0, import_react.useState)(null), [error, setError] = (0, import_react.useState)("");
  const resetPreview = () => {
    setPreview(null);
    setError("");
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stack", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u914D\u7F6E\u8FC1\u79FB" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u5728\u8BBE\u5907\u95F4\u8FC1\u79FB\u8D26\u53F7\u3001\u6A21\u578B\u548C\u8DEF\u7531\u8BBE\u7F6E\u3002" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: "box table-shell", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "table", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u64CD\u4F5C" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u5185\u5BB9" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", className: "cell-actions", children: "\u5F00\u59CB" })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "\u5BFC\u51FA\u5230\u5176\u4ED6\u8BBE\u5907" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
            "\u8D26\u53F7\u4E0E\u8DEF\u7531\u8BBE\u7F6E",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: "muted", children: "\u53EF\u9009\u5BC6\u7801\u52A0\u5BC6\u643A\u5E26\u767B\u5F55\u51ED\u8BC1" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "cell-actions", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => setPanel("export"), children: "\u5BFC\u51FA\u914D\u7F6E" }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "\u5BFC\u5165\u5DF2\u6709\u914D\u7F6E" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
            "\u5148\u9884\u89C8\uFF0C\u518D\u786E\u8BA4\u5408\u5E76\u6216\u66FF\u6362",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: "muted", children: "\u5BFC\u5165\u524D\u81EA\u52A8\u5907\u4EFD\u672C\u673A\u914D\u7F6E" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "cell-actions", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => setPanel("import"), children: "\u5BFC\u5165\u914D\u7F6E" }) })
        ] })
      ] })
    ] }) }),
    panel && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, { title: panel === "export" ? "\u5BFC\u51FA\u914D\u7F6E" : "\u5BFC\u5165\u914D\u7F6E", busy, close: () => setPanel(null), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-body stack", children: [
      panel === "export" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { className: "box stack", onSubmit: async (e) => {
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
      panel === "import" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { className: "box stack", onSubmit: async (e) => {
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
    ] }) })
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
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "box table-shell", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "scroll", role: "region", "aria-label": "\u514D\u8D39\u6A21\u578B\u5C55\u793A\u4E0E\u63A8\u7406\u7B49\u7EA7", tabIndex: "0", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "table", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u6A21\u578B / \u5C55\u793A" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u53EF\u7528\u8D26\u53F7" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u4E0A\u4E0B\u6587 / \u63A8\u7406\u7B49\u7EA7" })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: models.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: m.selected ? "selected" : "", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", "aria-label": `\u5C55\u793A ${m.modelName}`, disabled: busy, checked: m.selected, onChange: (e) => {
              void update(m, { visible: e.target.checked });
            } }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: m.modelName })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { className: "muted", children: [
            m.name.split(" \xB7 ").at(-1),
            " \xB7 ",
            fmt(m.contextWindow / 1e3),
            "K \u4E0A\u4E0B\u6587"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: m.accountNames.join("\u3001") || "\u6682\u65E0\u8D26\u53F7" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContextSelect, { model: m, value: m.configuredContextWindow, disabled: busy, label: `${m.modelName} \u4E0A\u4E0B\u6587`, onChange: (contextWindow) => {
            void update(m, { contextWindow });
          } }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "sr-only", children: [
              m.modelName,
              " \u63A8\u7406\u7B49\u7EA7"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { "aria-label": `${m.modelName} \u63A8\u7406\u7B49\u7EA7`, disabled: busy, value: m.reasoningEffort || "", onChange: (e) => {
              void update(m, { reasoningEffort: e.target.value || null });
            }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u5E73\u53F0\u9ED8\u8BA4" }),
              m.reasoning?.supportedEfforts?.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: e, children: effortNames[e] || e }, e))
            ] })
          ] }),
          m.effortUnavailable && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: "warn", children: "\u539F\u6863\u4F4D\u6682\u4E0D\u53EF\u7528\uFF0C\u4F7F\u7528\u5E73\u53F0\u9ED8\u8BA4" })
        ] })
      ] }, m.id)) })
    ] }) }) }),
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
    const { id, previousId, revision, reasoning, supportsImages, expiringStatus, freeStatus, maxContextWindow, supportedContextWindows, configuredContextWindow, contextKnown, eligibleAccountIds, enforceContext, ...route } = draft;
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
function RouteReasoningSelect({ draft, setDraft, data, busy }) {
  const targets = draft.targets.map((t) => ({
    provider: t.provider,
    ...t.account ? { account: t.account } : {},
    models: t.modelText.split(",").map((x) => x.trim()).filter(Boolean)
  }));
  const signature = JSON.stringify({
    action: "route.preview",
    revision: data.revision,
    catalogs: data.accounts?.map((a) => [a.id, a.enabled, a.fetchedAt]),
    id: draft.id || "preview",
    route: {
      contextMode: draft.contextMode ?? "maximum",
      contextWindow: draft.contextWindow,
      maxTokens: 1,
      targets: targets.map(({ models, ...target }) => ({ ...target, ...models.length ? { models } : {} }))
    }
  });
  const [preview, setPreview] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    const abort = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          signal: abort.signal,
          headers: { "Content-Type": "application/json", "X-Multi-Router-Key": data.key },
          body: signature
        });
        const next = await readManagementResponse(res);
        if (!abort.signal.aborted) setPreview({ signature, ...next.routePreview });
      } catch (e) {
        if (!abort.signal.aborted) setPreview({ signature, error: e.message });
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [signature, data.key]);
  const pending = preview?.signature !== signature, modes = pending ? [] : preview?.reasoning?.supportedEfforts ?? [];
  const effort = draft.reasoningEffort ?? "", unavailable = !!effort && !pending && !preview?.error && !modes.includes(effort);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stack", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
      "\u9ED8\u8BA4\u601D\u8003\u6DF1\u5EA6",
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { "aria-describedby": "route-reasoning-help", disabled: busy || pending || !!preview?.error, value: effort, onChange: (e) => setDraft((d) => ({ ...d, reasoningEffort: e.target.value || null })), children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u5E73\u53F0\u9ED8\u8BA4" }),
        effort && !modes.includes(effort) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", { value: effort, disabled: true, children: [
          effortNames[effort] || effort,
          "\uFF08",
          pending ? "\u6838\u5BF9\u4E2D" : "\u5F53\u524D\u4E0D\u53EF\u7528",
          "\uFF09"
        ] }),
        modes.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: e, children: effortNames[e] || e }, e))
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { id: "route-reasoning-help", className: preview?.error || unavailable ? "warn notice" : "notice", role: "status", children: pending ? "\u6B63\u5728\u6838\u5BF9\u76EE\u6807\u6A21\u578B\u652F\u6301\u7684\u6863\u4F4D\u2026" : preview?.error || (unavailable ? "\u539F\u6863\u4F4D\u5F53\u524D\u4E0D\u53EF\u7528\uFF0C\u8BF7\u9009\u62E9\u5176\u4ED6\u6863\u4F4D\u6216\u5E73\u53F0\u9ED8\u8BA4\u3002" : !preview?.contextKnown ? "\u5C1A\u672A\u83B7\u53D6\u76EE\u6807\u6A21\u578B\u76EE\u5F55\uFF0C\u6682\u65F6\u53EA\u80FD\u4F7F\u7528\u5E73\u53F0\u9ED8\u8BA4\u3002" : !modes.length ? "\u76EE\u6807\u6A21\u578B\u672A\u58F0\u660E\u53EF\u8C03\u6863\u4F4D\uFF0C\u4F7F\u7528\u5E73\u53F0\u9ED8\u8BA4\u3002" : "\u4EC5\u5C55\u793A\u5F53\u524D\u76EE\u6807\u4E0E\u4E0A\u4E0B\u6587\u5BB9\u91CF\u652F\u6301\u7684\u6863\u4F4D\u3002") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u4F1A\u8BDD\u91CC\u624B\u52A8\u9009\u62E9\u7684\u6863\u4F4D\u4F18\u5148\u3002\u6307\u5B9A\u6DF1\u5EA6\u540E\uFF0C\u4EC5\u5728\u652F\u6301\u8BE5\u6863\u4F4D\u7684\u8D26\u53F7\u95F4\u5207\u6362\uFF1B\u5173\u95ED\u601D\u8003\u4EC5\u5728\u6E20\u9053\u652F\u6301\u65F6\u63D0\u4F9B\u3002" })
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
    const { id, previousId, revision, reasoning, supportsImages, expiringStatus, maxContextWindow, supportedContextWindows, configuredContextWindow, contextKnown, eligibleAccountIds, enforceContext, ...route } = draft;
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
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", "aria-labelledby": "route-model-parameters", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { id: "route-model-parameters", children: "\u6A21\u578B\u53C2\u6570" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stack", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
              "\u4E0A\u4E0B\u6587\u5BB9\u91CF",
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { disabled: busy, value: draft.contextMode ?? "maximum", onChange: (e) => set("contextMode", e.target.value), children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "maximum", children: "\u4F7F\u7528\u6A21\u578B\u6700\u5927\u5BB9\u91CF\uFF08\u9ED8\u8BA4\uFF09" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "custom", children: "\u624B\u52A8\u8BBE\u7F6E\u672C\u5730\u9884\u7B97" })
              ] })
            ] }),
            draft.contextMode === "custom" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
              "\u4E0A\u4E0B\u6587\u9884\u7B97\uFF08Token\uFF09",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "number", disabled: busy, min: "1", required: true, value: draft.contextWindow, onChange: (e) => set("contextWindow", Number(e.target.value)) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u9ED8\u8BA4\u968F\u6A21\u578B\u76EE\u5F55\u66F4\u65B0\u3002\u53EA\u5411\u652F\u6301\u5F53\u524D\u5BB9\u91CF\u7684\u6E20\u9053\u5207\u6362\uFF1B\u8C03\u4F4E\u9884\u7B97\u53EF\u8BA9\u66F4\u591A\u6E20\u9053\u53C2\u4E0E\u3002\u4E0D\u4F1A\u5220\u9664\u4F1A\u8BDD\u5386\u53F2\u3002" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RouteReasoningSelect, { draft, setDraft, data, busy })
        ] })
      ] }),
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "\u9AD8\u7EA7\uFF1A\u8F93\u51FA\u957F\u5EA6" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "grid", style: { marginTop: 12 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          "\u6700\u5927\u8F93\u51FA\u957F\u5EA6",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "number", disabled: busy, min: "1", max: draft.contextWindow, required: true, value: draft.maxTokens, onChange: (e) => set("maxTokens", Number(e.target.value)) })
        ] }) })
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
  const discovering = data.startup?.phase === "discovering";
  const saved = discovery.reduce((n, s) => n + (s.savedCount ?? 0), 0);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", "aria-label": "\u9996\u6B21\u8D26\u53F7\u8BBE\u7F6E", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: [
          "\u672C\u673A\u8D26\u53F7\u81EA\u52A8\u83B7\u53D6",
          discovering ? "\u8FDB\u884C\u4E2D" : discovery.length ? "\u5DF2\u5B8C\u6210" : "\u5F85\u91CD\u8BD5"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: discovering ? "\u6B63\u5728\u540E\u53F0\u8BFB\u53D6 WorkBuddy / Trae \u672C\u673A\u767B\u5F55\uFF0C\u65E0\u9700\u624B\u52A8\u91CD\u590D\u83B7\u53D6\uFF0C\u5DF2\u6709\u8D26\u53F7\u53EF\u4EE5\u7EE7\u7EED\u4F7F\u7528\u3002" : saved ? `\u5DF2\u4FDD\u5B58 ${saved} \u4E2A WorkBuddy / Trae \u672C\u673A\u767B\u5F55\uFF0C\u65E0\u9700\u518D\u6B21\u624B\u52A8\u6DFB\u52A0\u3002` : "\u6682\u672A\u4FDD\u5B58\u672C\u673A\u767B\u5F55\u3002\u5148\u5728\u5B98\u65B9\u5BA2\u6237\u7AEF\u767B\u5F55\uFF0C\u518D\u70B9\u51FB\u300C\u4E00\u952E\u83B7\u53D6\u5E76\u4FDD\u5B58\u300D\u3002" })
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
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "primary", disabled: busy || discovering, onClick: () => {
        void act({ action: "accounts.discover" });
      }, children: "\u4E00\u952E\u83B7\u53D6\u5E76\u4FDD\u5B58 WorkBuddy / Trae" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => go("accounts"), children: "\u67E5\u770B\u8D26\u53F7 / \u624B\u52A8\u6DFB\u52A0" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => go("routes"), children: "\u9009\u62E9\u8DEF\u7531\u6A21\u578B" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u9996\u6B21\u542F\u52A8\u81EA\u52A8\u6267\u884C\u4E00\u6B21\uFF0C\u4E4B\u540E\u6BCF\u5206\u949F\u68C0\u6D4B\u65B0\u589E\u767B\u5F55\u3002Qoder \u4F7F\u7528 PAT\uFF0C\u8BF7\u5230\u300C\u8D26\u53F7\u4E0E\u767B\u5F55\u300D\u6DFB\u52A0\uFF1B\u672A\u5B89\u88C5\u5BA2\u6237\u7AEF\u4E5F\u53EF\u4EE5\u624B\u52A8\u586B\u5199\u51ED\u8BC1\u3002" })
  ] });
}
var updateNames = { unchecked: "\u5F85\u68C0\u67E5", available: "\u53EF\u66F4\u65B0", current: "\u5DF2\u540C\u6B65", pinned: "\u56FA\u5B9A\u63D0\u4EA4", unsupported: "\u672C\u5730\u6765\u6E90", failed: "\u68C0\u67E5 / \u5B89\u88C5\u5931\u8D25", installed: "\u5DF2\u5B89\u88C5" };
function PluginUpdatesPanel({ data, busy, act }) {
  const [query, setQuery] = (0, import_react.useState)(""), [selected, setSelected] = (0, import_react.useState)([]), [plan, setPlan] = (0, import_react.useState)(null), [registry, setRegistry] = (0, import_react.useState)(""), [filter, setFilter] = (0, import_react.useState)("all"), [pluginSearch, setPluginSearch] = (0, import_react.useState)("");
  const [diagnostic, setDiagnostic] = (0, import_react.useState)(null), [copied, setCopied] = (0, import_react.useState)(false);
  const running = data?.job?.state === "running", blocked = busy || running;
  const rows = (data?.rows ?? []).filter((r) => r.source.kind !== "builtin"), available = rows.filter((r) => r.status === "available" || r.status === "failed" && r.target);
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
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u8BF7\u5347\u7EA7 DeepSeek Harness \u540E\u91CD\u8BD5\u3002\u672C\u9875\u7BA1\u7406\u5F53\u524D DSH \u914D\u7F6E\u4E2D\u7531\u7528\u6237\u5B89\u88C5\u7684\u63D2\u4EF6\u3002" })
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stack", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u7528\u6237\u5B89\u88C5\u7684\u63D2\u4EF6\u4E0E\u66F4\u65B0" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
            rows.length,
            " \u4E2A\u7528\u6237\u5B89\u88C5\u63D2\u4EF6 \xB7 ",
            available.length,
            " \u4E2A\u53EF\u66F4\u65B0"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "primary", disabled: blocked, onClick: () => {
          void act({ action: "plugins.check" });
        }, children: "\u68C0\u67E5\u5168\u90E8\u66F4\u65B0" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
        "\u4E0A\u6B21\u68C0\u67E5 ",
        when(data.checkedAt),
        " \xB7 \u6BCF\u5929\u81EA\u52A8\u68C0\u67E5\u5E76\u63D0\u9192"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { className: "help", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "\u5B89\u88C5\u6E90\u4E0E\u68C0\u67E5\u89C4\u5219" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stack", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "filter", children: [
            "npm \u5B89\u88C5\u6E90",
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: registry, disabled: blocked, onChange: (e) => setRegistry(e.target.value), children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "DSH \u8BBE\u7F6E\uFF08\u542B\u56DE\u9000\u6765\u6E90\uFF09" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "https://registry.npmjs.org/", children: "npm \u5B98\u65B9" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "https://registry.npmmirror.com/", children: "npmmirror" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "npm \u6309\u7248\u672C / \u53D1\u5E03\u9891\u9053\u68C0\u67E5\uFF0CGitHub \u6309\u5206\u652F\u63D0\u4EA4\u68C0\u67E5\uFF1B\u4FDD\u7559\u542F\u7528\u72B6\u6001\uFF0C\u56FA\u5B9A Git \u63D0\u4EA4\u4FDD\u6301\u4E0D\u52A8\u3002" })
        ] })
      ] })
    ] }),
    data.job && !(data.job.kind === "check" && data.job.state === "done") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box stack", "aria-live": "polite", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: running ? data.job.kind === "check" ? "\u6B63\u5728\u68C0\u67E5\u66F4\u65B0\u2026" : "\u6B63\u5728\u5B89\u88C5\u63D2\u4EF6\u2026" : data.job.state === "cancelled" ? "\u64CD\u4F5C\u5DF2\u53D6\u6D88" : data.job.state === "failed" || data.job.results.some((r) => r.status === "failed") ? "\u6709\u63D2\u4EF6\u672A\u5B8C\u6210\u5B89\u88C5" : "\u64CD\u4F5C\u5DF2\u5B8C\u6210" }),
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
        r.diagnostic && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => {
          setCopied(false);
          setDiagnostic(JSON.stringify({ plugin: r.name, targetVersion: r.expectedVersion, ...r.diagnostic }, null, 2));
        }, children: "\u67E5\u770B\u8131\u654F\u8BCA\u65AD" }),
        r.pendingBuilds?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "notice", children: [
          "\u5F85\u6388\u6743\u811A\u672C\uFF1A",
          r.pendingBuilds.join("\u3001"),
          "\u3002\u8BF7\u5728 DSH \u539F\u63D2\u4EF6\u5B89\u88C5\u9875\u6388\u6743\u540E\u91CD\u8BD5\u3002"
        ] })
      ] }, r.name + i)),
      data.job.results.some((r) => r.restartRequired) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "steps", children: "\u66F4\u65B0\u6587\u4EF6\u5DF2\u5B89\u88C5\u3002macOS \u4F7F\u7528 \u2318Q \u5B8C\u5168\u9000\u51FA DSH \u540E\u91CD\u5F00\uFF1BWindows \u9000\u51FA\u6258\u76D8\u5E94\u7528\u540E\u91CD\u5F00\uFF1B\u7F51\u9875\u7248\u91CD\u542F\u670D\u52A1\u3002\u5173\u95ED\u7A97\u53E3\u548C\u300C\u5237\u65B0\u9762\u677F\u300D\u4E0D\u4F1A\u91CD\u8F7D\u540E\u53F0\u3002" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "box table-shell", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bar section-pad", children: [
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
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row section-pad", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { flex: 1 }, children: [
          "\u641C\u7D22\u5DF2\u5B89\u88C5\u63D2\u4EF6",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: pluginSearch, onChange: (e) => setPluginSearch(e.target.value), placeholder: "\u6309\u63D2\u4EF6\u540D\u79F0\u7B5B\u9009" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "filter", children: [
          "\u663E\u793A\u8303\u56F4",
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: filter, onChange: (e) => setFilter(e.target.value), children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "all", children: "\u5168\u90E8\u7528\u6237\u5B89\u88C5\u63D2\u4EF6" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "updates", children: "\u53EF\u66F4\u65B0 / \u91CD\u8BD5" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "npm", children: "npm \u6765\u6E90" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "github", children: "GitHub \u6765\u6E90" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "scroll", role: "region", "aria-label": "\u7528\u6237\u5B89\u88C5\u63D2\u4EF6\u5217\u8868", tabIndex: "0", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "table", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u63D2\u4EF6 / \u9009\u62E9" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u6765\u6E90\u4E0E\u7248\u672C" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", children: "\u72B6\u6001" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { scope: "col", className: "cell-actions", children: "\u64CD\u4F5C" })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: visibleRows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: selected.includes(r.name) ? "selected" : "", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "check", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { "aria-label": `\u9009\u62E9\u66F4\u65B0 ${r.name}`, type: "checkbox", disabled: blocked || !available.includes(r), checked: selected.includes(r.name), onChange: (e) => setSelected(e.target.checked ? [...selected, r.name] : selected.filter((n) => n !== r.name)) }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { className: "mono", children: r.name })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: "muted", children: r.enabled ? "\u542F\u7528" : "\u505C\u7528" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
              r.source.kind === "npm" ? `npm \xB7 ${r.version || "\u672A\u77E5"}${r.latestVersion ? " \u2192 " + r.latestVersion : ""}` : r.source.kind === "github" ? `GitHub \xB7 ${r.version || "\u672A\u77E5\u7248\u672C"}` : "\u672C\u5730\u6587\u4EF6 / \u5F00\u53D1\u94FE\u63A5",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: "muted mono", children: r.source.kind === "npm" ? `\u5B89\u88C5\u58F0\u660E ${r.source.source} \xB7 \u68C0\u67E5 ${r.source.tag}` : r.source.kind === "github" ? `${r.commit?.slice(0, 8) || "\u672A\u77E5\u63D0\u4EA4"}${r.latestCommit ? " \u2192 " + r.latestCommit.slice(0, 8) : ""}` : "" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: r.status === "failed" ? "error" : r.status === "available" ? "good" : "muted", children: updateNames[r.status] }),
              r.message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: r.status === "failed" ? "error" : "muted", children: r.message })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "cell-actions", children: available.includes(r) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: blocked, onClick: () => setPlan({ kind: "update", rows: [r] }), children: "\u67E5\u770B\u5E76\u66F4\u65B0" }) : "\u2014" })
          ] }, r.name)) })
        ] }),
        !visibleRows.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "empty", children: running ? "\u6B63\u5728\u8BFB\u53D6\u63D2\u4EF6\u6E05\u5355\u2026" : rows.length ? "\u6CA1\u6709\u5339\u914D\u7684\u5DF2\u5B89\u88C5\u63D2\u4EF6\uFF0C\u8BF7\u8C03\u6574\u7B5B\u9009\u3002" : "\u5F53\u524D\u914D\u7F6E\u5C1A\u672A\u8BFB\u53D6\u63D2\u4EF6\uFF0C\u8BF7\u68C0\u67E5\u66F4\u65B0\u3002" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { className: "box help install-plugin", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "\u5B89\u88C5 npm / GitHub \u63D2\u4EF6" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "stack", children: [
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
      ] })
    ] }),
    diagnostic && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, { title: "\u63D2\u4EF6\u5B89\u88C5\u8BCA\u65AD", close: () => setDiagnostic(null), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-body stack", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u4EE5\u4E0B\u4FE1\u606F\u53EA\u542B\u63D2\u4EF6\u540D\u3001\u7248\u672C\u3001\u7CFB\u7EDF\u548C\u9519\u8BEF\u5206\u7C7B\uFF0C\u53EF\u590D\u5236\u7528\u4E8E\u6392\u67E5\uFF1B\u672A\u5305\u542B\u539F\u59CB\u65E5\u5FD7\u3001\u7528\u6237\u540D\u8DEF\u5F84\u6216\u51ED\u8BC1\u3002\u82E5\u539F\u56E0\u672A\u77E5\uFF0C\u8BF7\u5728 DSH \u539F\u751F\u63D2\u4EF6\u9875\u83B7\u53D6\u5B89\u88C5\u65E5\u5FD7\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { "aria-label": "\u8131\u654F\u5B89\u88C5\u8BCA\u65AD", readOnly: true, rows: "9", value: diagnostic, onFocus: (e) => e.currentTarget.select() }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: async () => {
        try {
          await navigator.clipboard.writeText(diagnostic);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }, children: copied ? "\u5DF2\u590D\u5236" : "\u590D\u5236\u8BCA\u65AD" })
    ] }) }),
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
