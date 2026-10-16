// Disposable browser check of the actual settings component and management API.
// Uses synthetic accounts and models; no real credentials or upstream requests.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { Router } from '../lib/router.js';
import { Manager, managementHandler, MANAGEMENT_PATH, SUMMARY_PATH } from '../lib/manager.js';
import { validateConfig, writePrivateJson, DEFAULT_ROUTES, beijingDay } from '../src/config.mjs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const { version: pluginVersion } = JSON.parse(await readFile('package.json', 'utf8'));
const dir = await mkdtemp(join(tmpdir(), 'multi-router-preview-'));
const file = join(dir, 'router.json');
const raw = { accounts: ['wb1', 'wb2', 'tr1', 'qd1'].map((id, i) => ({ id, name: ['主账号', '备用账号', 'Trae 日常账号', 'Qoder 账号'][i],
  provider: ['workbuddy', 'workbuddy', 'trae', 'qoder'][i], credentialFile: join(dir, `${id}.json`) })), routes: DEFAULT_ROUTES };
await writePrivateJson(file, raw);
const router = new Router(validateConfig(raw, file), async a => ({ models: async () => [
  { id: a.provider === 'qoder' ? 'dfmodel' : 'deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash', contextWindow: 200000, supportedContextWindows: [200000, 500000, 1000000], maxTokens: 128000, supportsImages: true },
  { creditMultiplier: 0, reasoning: { supports: true, supportedEfforts: ['off', 'low', 'medium', 'high'], canDisableThinking: true }, id: a.provider === 'qoder' ? 'gmodel' : 'glm-5.3', name: 'GLM 5.3', contextWindow: 200000, maxContextWindow: 1000000, maxTokens: 64000 },
  ...(['trae', 'qoder'].includes(a.provider) ? ['max', 'flash'].map(kind => ({ id: a.provider === 'trae' ? `qwen3.8-${kind}` : kind === 'max' ? 'qmodel_38max' : 'qfmodel', name: `Qwen3.8-${kind === 'max' ? 'Max' : 'Flash'}`, contextWindow: 200000, supportedContextWindows: [200000, 400000, 1000000], maxTokens: 32768, reasoning: { supports: true, supportedEfforts: ['low', 'medium', 'high', 'xhigh'] } })) : []),
  ...(a.provider === 'workbuddy' ? [{ id: 'hy4-preview', name: 'Hy4 Preview', contextWindow: 960000, maxTokens: 64000, supportsImages: true, reasoning: { supports: true, supportedEfforts: ['high'], onlyReasoning: true } }] : []),
] , chat: async () => ({ ok: true, response: new Response('data: {"choices":[{"delta":{"content":"OK"},"finish_reason":null}]}\n\ndata: [DONE]\n\n') }), checkin: {
  identity: async () => ({ account: a.id, ...(a.provider === 'trae' ? { device: 'preview-official-device' } : {}) }),
  claim: async () => a.provider === 'workbuddy' ? { status: 'already-claimed', activity: { streakDays: 3, totalCredits: 150, nextStreakDay: 7, endsAt: Date.parse('2026-12-31T23:59:59+08:00') } } : process.env.DSH_PREVIEW_RETRY === '1' ? { status: a.provider === 'trae' ? 'retryable' : 'no-campaign' }
    : { status: 'claimed', amount: a.provider === 'trae' ? 100 : 50 },
} }));
await writePrivateJson(join(dir, 'package.json'), { dependencies: { 'dsh-multi-router': 'github:AndroidSix/dsh-multi-router', 'dsh-git-panel': '^0.1.20', 'dsh-other-plugin': 'next' } });
const previewBundles = [
  { name: 'dsh-multi-router', version: pluginVersion, installed: true, removable: true, enabled: true },
  { name: 'dsh-git-panel', version: '0.1.20', installed: true, removable: true, enabled: true },
  { name: 'dsh-other-plugin', version: '1.0.0', installed: true, removable: true, enabled: false },
  { name: '@deepseek-ai/dsh-base', version: '0.2.0-rc.2', installed: false, removable: false, enabled: true },
];
const previewService = { listBundles: async () => previewBundles, installBundle: async () => process.env.DSH_PREVIEW_INSTALL_ERROR ? { application: 'failed', error: { code: 'operation-error', diagnostic: 'EPERM: file is in use' } } : ({ application: 'restart-required', packageResult: { exitCode: 0 } }) };
const manager = new Manager(file, router, () => {}, { service: () => previewService, profile: () => ({ dir }),
  lookup: async (s, p, spec) => ({ version: spec.startsWith('dsh-git-panel') ? '0.1.21' : '1.1.0-beta.1' }),
  fetchImpl: async url => {
    if (String(url).includes('/v2/plugin/login/send-sms')) return Response.json({ code: 0, data: { expires_in: 300 } });
    if (String(url).includes('/v2/plugin/login/token') || String(url).includes('/v2/plugin/auth/token/refresh')) {
      const token = [{ alg: 'RS256' }, { sub: 'sms-preview-user', iss: 'https://www.workbuddy.cn/auth/realms/copilot', exp: Math.floor(Date.now() / 1000) + 7200 }].map(p => Buffer.from(JSON.stringify(p)).toString('base64url')).concat('synthetic-signature').join('.');
      return Response.json({ code: 0, data: { accessToken: token, refreshToken: 'synthetic-preview-refresh' } });
    }
    return Response.json({ sha: 'a'.repeat(40) });
  } });
await manager.load(); await manager.finishInitialSetup();
const previewNow = process.env.DSH_PREVIEW_CHECKINS === '1' ? Date.parse(`${beijingDay(Date.now())}T12:00:00+08:00`) : undefined;
const previewStarted = Date.now();
if (previewNow) manager.checkins.now = () => previewNow + Date.now() - previewStarted;
manager.localDiscovery = [{ provider: 'workbuddy', state: 'found', savedCount: 2 }, { provider: 'trae', state: 'found', savedCount: 1 }, { provider: 'trae-global', state: 'not-found', savedCount: 0 }];
await Promise.all(['workbuddy', 'trae', 'qoder'].map(p => manager.ensureCatalog(p)));
for (const [i, a] of manager.config.accounts.entries()) await manager.telemetry.observe(a.id, { unit: 'credits', remaining: [3510, 3086, 2302, 3782][i], fetchedAt: Date.now(),
  packages: [{ name: '活动积分', remaining: i === 0 ? 310 : i === 3 ? 300 : 0, total: 500, expiresAt: Date.now() + 2 * 86400000 }] });
router.cooldowns.set('wb2:*', Date.now() + 300000);
const clock = manager.telemetry.now;
const metrics = new (await import('../src/telemetry.mjs')).SessionMetrics(manager.telemetry);
for (const days of [15, 6, 2, 0]) {
  manager.telemetry.now = () => Date.now() - days * 86400000;
  const session = { id: `synthetic-session-${days}` };
  const at = manager.telemetry.now(); metrics.event(session, { type: 'step/start', time: at - 16800, data: { turn: 0, step: 0 } });
  const metadata = metrics.beginCall(session.id);
  await manager.telemetry.record({ ...metadata, account: 'wb1', provider: 'workbuddy', alias: 'deepseek-v4.1-flash', model: 'deepseek-v4.1-flash', status: 200, ok: true,
    usage: { prompt_tokens: 1000, completion_tokens: 200, total_tokens: 1200 } });
  await metrics.event(session, { type: 'assistant/message', time: at, data: { turn: 0, step: 0, stream: [{ type: 'text-chunks', time0: at - 10000, dt: [], texts: ['合成内容，不保存'] }], usage: { outputTokens: 200 } } });
  await metrics.event(session, { type: 'tool/call', time: at, data: { turn: 0, step: 0, callId: 'demo' } });
  await metrics.event(session, { type: 'tool/result', time: at + 2250, data: { turn: 0, step: 0, message: { source: { callId: 'demo' } } } });
  await metrics.event(session, { type: 'step/end', time: at + 2250, data: { turn: 0, step: 0 } });
}
manager.telemetry.now = clock;
await manager.checkFreeModels(true);
if (process.env.DSH_PREVIEW_UPDATES === '1') { manager.plugins.check(); await manager.plugins.flight; }


const api = managementHandler(manager), summary = managementHandler(manager, { summaryOnly: true });
let startupAt = 0;
const result = await build({ stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
import {RouterPage,UpdateReminder,SidebarUsage} from './src/client.jsx'; ${previewNow ? `Date.now = () => ${previewNow};` : ''} if (new URLSearchParams(location.search).has('sidebar')) { const sidebar = document.createElement('aside'); sidebar.className = 'preview-sidebar'; document.body.append(sidebar); createRoot(sidebar).render(React.createElement(SidebarUsage,{open:()=>{document.getElementById('app').scrollIntoView();document.getElementById('app').setAttribute('data-opened','true');}})); } createRoot(document.getElementById('app')).render(React.createElement(React.Fragment,null,React.createElement(RouterPage),${process.env.DSH_PREVIEW_UPDATES === '1' ? 'React.createElement(UpdateReminder)' : 'null'}));`,
  resolveDir: process.cwd(), loader: 'jsx' }, bundle: true, platform: 'browser', format: 'esm', write: false, jsx: 'automatic' });
const script = result.outputFiles[0].text;
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>DSH Multi Router · 设置预览</title>
<style>.preview-sidebar{position:fixed;left:12px;bottom:56px;width:240px}body:has(.preview-sidebar){padding-left:280px}@media(max-width:700px){body:has(.preview-sidebar){padding-left:16px;padding-bottom:130px}}:root{--dsw-alias-label-primary:#ececf0;--dsw-alias-label-secondary:#b7b7c1;--dsw-alias-border-l2:#35353c;--dsw-alias-bg-layer-1:#202024;--dsw-alias-bg-module-platform:#18181c;--dsw-alias-state-active-primary:#3d73dc}body{margin:0;padding:32px;background:#111114;font:14px system-ui;color:#ececf0}#app{max-width:1040px;margin:auto}@media(max-width:700px){body{padding:16px}}</style><p style="color:#b7b7c1;text-align:center">演示数据 · 账号已脱敏 · 无真实请求或领取${previewNow ? ' · 模拟北京时间 12:00' : ''}</p><div id="app"></div><script type="module" src="/app.js"></script></html>`;
const server = createServer((req, res) => {
  if (req.url === SUMMARY_PATH) { void summary(req, res); return; }
  if (req.url === MANAGEMENT_PATH) {
    if (process.env.DSH_PREVIEW_STARTUP === '1') startupAt ||= Date.now();
    if (startupAt && Date.now() - startupAt < 5000 && req.method === 'GET') { res.writeHead(404); res.end(); return; }
    manager.startup = { phase: startupAt && Date.now() - startupAt < 15000 ? 'discovering' : 'ready' };
    void api(req, res); return;
  }
  res.writeHead(200, { 'Content-Type': req.url === '/app.js' ? 'text/javascript' : 'text/html' });
  const light = ':root{--dsw-alias-label-primary:#18191c;--dsw-alias-label-secondary:#62646c;--dsw-alias-border-l2:#dfe1e6;--dsw-alias-bg-layer-1:#f7f8fa;--dsw-alias-bg-module-platform:#ffffff;--dsw-alias-state-active-primary:#3864cb;--dsw-alias-state-success-primary:#167943;--dsw-alias-state-warning-primary:#986800;--dsw-alias-state-error-primary:#bf3030}body{background:#fff;color:#18191c}';
  res.end(req.url === '/app.js' ? script : req.url.includes('theme=light') ? html.replace('</style>', light + '</style>') : html);
});
server.listen(0, '127.0.0.1', () => console.log(`http://127.0.0.1:${server.address().port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  server.closeAllConnections(); server.close(); void rm(dir, { recursive: true, force: true }).then(() => process.exit(0));
});
