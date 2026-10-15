import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('published host entry is discovered by the real DSH client registry', t => {
  const electron = process.env.DSH_RUNTIME ? process.execPath : '/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness';
  if (!existsSync(electron)) { t.skip('Installed DSH desktop runtime is required'); return; }
  const result = spawnSync(electron, ['--expose-internals', fileURLToPath(new URL('../scripts/check-client-discovery.mjs', import.meta.url)), '--source'],
    { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('official DSH lifecycle replaces server and browser module generations without a process restart', t => {
  const electron = process.env.DSH_RUNTIME ? process.execPath : '/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness';
  if (!existsSync(electron)) { t.skip('Installed DSH desktop runtime is required'); return; }
  const result = spawnSync(electron, ['--expose-internals', fileURLToPath(new URL('../scripts/check-live-reload.mjs', import.meta.url))],
    { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('client bundle loads in the real DSH classic-script module loader and registers its settings slot', async () => {
  const require = createRequire(import.meta.url);
  let module; const registered = [];
  runInNewContext(await readFile(new URL('../lib/client.js', import.meta.url), 'utf8'), {
    Response,
    window: { __ModuleLoader__: { load({ id, factory }) {
      assert.equal(id, 'dsh-multi-router');
      module = factory(name => {
        assert.ok(['react', 'react/jsx-runtime'].includes(name));
        return require(name);
      });
    } } },
  });
  assert.equal(typeof module.RouterPage, 'function');
  assert.equal(module.backendNeedsRestart({ pluginVersion: '0.3.7' }), true);
  assert.equal(module.backendNeedsRestart({}), true);
  assert.equal(module.backendNeedsRestart({ pluginVersion: JSON.parse(await readFile(new URL('../package.json', import.meta.url))).version }), false);
  const html = require('react-dom/server').renderToStaticMarkup(require('react').createElement(module.RestartGuidance, { data: { pluginVersion: '0.3.7' } }));
  assert.match(html, /退出 DeepSeek Harness/);
  assert.match(html, /重新加载插件/);
  assert.match(html, /重新连接/);
  await module.requestPluginReload({ pluginManager: { setBundleEnabled: async (name, enabled) => { assert.equal(name, 'dsh-multi-router'); assert.equal(enabled, true); return { ok: true, value: { application: 'applied' } }; } } });
  await assert.rejects(module.requestPluginReload({ pluginManager: { setBundleEnabled: async () => ({ ok: true, value: { application: 'restart-required' } }) } }), /未能即时重载/);
  const welcome = require('react-dom/server').renderToStaticMarkup(require('react').createElement(module.InitialSetup, { data: { providers: [{ id: 'trae', name: 'Trae CN' }], localDiscovery: [{ provider: 'trae', state: 'found', savedCount: 1 }] } }));
  assert.match(welcome, /已保存 1 个/);
  assert.match(welcome, /一键获取并保存 WorkBuddy/);
  const discovering = require('react-dom/server').renderToStaticMarkup(require('react').createElement(module.InitialSetup, { data: { startup: { phase: 'discovering' }, localDiscovery: [], providers: [] } }));
  assert.match(discovering, /进行中/); assert.ok(!discovering.includes('暂未保存本机登录'));
  const updates = require('react-dom/server').renderToStaticMarkup(require('react').createElement(module.PluginUpdatesPanel, { data: { available: true, rows: [{ name: 'other-plugin', version: '1.0.0', enabled: false, source: { kind: 'npm', tag: 'latest' }, status: 'available', latestVersion: '1.1.0' }, { name: '@deepseek-ai/dsh-base', source: { kind: 'builtin' }, status: 'builtin' }] } }));
  assert.match(updates, /other-plugin/); assert.match(updates, /停用/); assert.match(updates, /检查全部更新/);
  assert.ok(!updates.includes('@deepseek-ai/dsh-base')); assert.ok(!updates.includes('DSH 内置组件'));
  assert.match(updates, /1 个用户安装插件/);
  const checkins = require('react-dom/server').renderToStaticMarkup(require('react').createElement(module.CheckinPanel, { data: {
    providers: [{ id: 'trae', name: 'Trae CN' }, { id: 'workbuddy-ai', name: 'WorkBuddy AI' }],
    accounts: [{ id: 'one', name: '日常账号', provider: 'trae', enabled: true }, { id: 'wb', provider: 'workbuddy-ai', name: '工作账号' }],
    checkins: { accounts: [{ id: 'one', supported: true, auto: false }, { id: 'wb', supported: false }] },
  } }));
  assert.match(checkins, /每日自动签到/); assert.match(checkins, /WorkBuddy AI 暂未接入/);
  assert.match(checkins, /设备限制/); assert.match(checkins, /默认关闭/);
  assert.match(checkins, /20:05/);
  assert.match(checkins, /每日启动时签到/); assert.match(checkins, /每天定时签到/); assert.match(checkins, /保存签到计划/);
  const masked = require('react-dom/server').renderToStaticMarkup(require('react').createElement(module.CheckinPanel, { data: {
    providers: [{ id: 'trae', name: 'Trae CN' }], accounts: [{ id: 'one', name: '用户13800138000', provider: 'trae', enabled: true }],
    checkins: { accounts: [{ id: 'one', supported: true, last: { status: 'retryable', day: '2026-10-15', message: '查询失败', retryAt: 1792065900000 } }],
      report: { at: 1792050000000, counts: { 'no-campaign': 1 } } },
  } }));
  assert.ok(!masked.includes('13800138000')); assert.match(masked, /138\*\*\*\*8000/); assert.match(masked, /无活动 1/);
  for (const phone of ['08124036823', '+8613800138000', '+12025550123']) {
    const html = require('react-dom/server').renderToStaticMarkup(require('react').createElement(module.CheckinPanel, { data: {
      providers: [{ id: 'trae', name: 'Trae CN' }], accounts: [{ id: 'one', name: `用户${phone}`, provider: 'trae', enabled: true }],
      checkins: { accounts: [{ id: 'one', supported: true }] },
    } }));
    assert.ok(!html.includes(phone)); assert.ok(html.includes('****'));
  }
  const poolData = { accounts: [
    { id: 'one', name: '用户13800138000', provider: 'workbuddy', enabled: true, modelCount: 3, usage: { balance: { remaining: 3510, unit: 'credits', packages: [{ remaining: 310, expiresAt: Date.now() + 86400000 }] } } },
    { id: 'two', name: '备用', provider: 'workbuddy', enabled: false, usage: { balance: { remaining: 3000, unit: 'credits', error: 'offline', packages: [{ remaining: 999, expiresAt: Date.now() + 86400000 }] } } },
    { id: 'other', provider: 'trae', name: '其他供应商' },
  ], checkins: { accounts: [{ id: 'one', supported: true }] } };
  const pool = require('react-dom/server').renderToStaticMarkup(require('react').createElement(module.AccountPool, { data: poolData, provider: 'workbuddy' }));
  assert.match(pool, /<table/); assert.match(pool, /scope="col"/); assert.match(pool, /310 积分 3 天内到期/);
  assert.match(pool, /查询失败 · 保留上次余额/); assert.ok(!pool.includes('999 积分 3 天内到期'));
  assert.match(pool, /全选/); assert.match(pool, /全不选/); assert.match(pool, /未入池/); assert.match(pool, /个目录模型/);
  assert.ok(!pool.includes('其他供应商')); assert.ok(!pool.includes('13800138000'));
  const rangeNow = Date.parse('2026-10-15T00:30:00+08:00');
  assert.deepEqual(Array.from(module.usageDateBounds('1', '', '', rangeNow)), [Date.parse('2026-10-15T00:00:00+08:00'), Date.parse('2026-10-16T00:00:00+08:00')]);
  for (const days of [3, 7, 30]) {
    const [from, until] = module.usageDateBounds(String(days), '', '', rangeNow);
    assert.equal(until - from, days * 86400000); assert.equal(until, Date.parse('2026-10-16T00:00:00+08:00'));
  }
  assert.deepEqual(Array.from(module.usageDateBounds('custom', '2026-10-01', '2026-10-03', rangeNow)), [Date.parse('2026-10-01T00:00:00+08:00'), Date.parse('2026-10-04T00:00:00+08:00')]);
  assert.ok(Number.isNaN(module.usageDateBounds('custom', '', '')[0]));
  const usage = require('react-dom/server').renderToStaticMarkup(require('react').createElement(module.UsageDetails, { data: { accounts: [], routes: [], providers: [], options: { usageRetentionDays: 30 } } }));
  for (const label of ['今日', '近 3 日', '近 7 日', '近 30 日', '自定义', '保存保留期限']) assert.ok(usage.includes(label));
  const allPool = require('react-dom/server').renderToStaticMarkup(require('react').createElement(module.AccountPool, { data: { ...poolData, providers: [{ id: 'workbuddy', name: 'WorkBuddy' }, { id: 'trae', name: 'Trae CN' }] }, provider: '' }));
  assert.match(allPool, /其他供应商/); assert.match(allPool, /Trae CN/); assert.match(allPool, /WorkBuddy/);
  const perf = module.performanceSummary([{ outcome: 'completed', timingSource: 'dsh-step', timing: { modelMs: 10000, ttftMs: 1000, toolMs: 3000, decodeTokens: 100, decodeMs: 2000 } }, { outcome: 'completed', timing: { modelMs: 30000, ttftMs: 3000, decodeTokens: 300, decodeMs: 10000 } }, { outcome: 'failed', timing: { modelMs: 999999 } }, { outcome: 'completed' }]);
  assert.equal(perf.modelMs, 40000); assert.equal(perf.ttftMs, 2000); assert.equal(perf.toolMs, 3000); assert.equal(perf.tps, 400 / 12); assert.equal(module.performanceSummary([]).toolMs, null);
  for (const label of ['模型用时', '工具调用用时', 'TTFT', 'TPS', '未经过 DSH 步骤']) assert.ok(usage.includes(label));
  let openedBundle; module.apply({ get: name => { assert.equal(name, 'pluginNavigation'); return { openBundle: name => { openedBundle = name; } }; }, slots: { inject(name, fn) { assert.ok(['plugins.bundle.config', 'shell.overlay', 'sidebar.footer.action'].includes(name)); fn(); },
    register(options, component) { registered.push({ options, component }); } } });
  assert.equal(registered[1].options.id, 'dsh-multi-router-updates');
  assert.equal(registered[1].component, module.UpdateReminder);
  assert.equal(registered[2].options.name, 'sidebar.footer.action');
  assert.equal(registered[2].component, module.SidebarUsage);
  registered[2].options.inject().open(); assert.equal(openedBundle, 'dsh-multi-router');
  const summary = { today: '2026-10-15', tokens: 1234, totalTokens: 17255285, requests: 3, unmetered: 1 };
  const card = require('react-dom/server').renderToStaticMarkup(require('react').createElement(module.SidebarUsageCard, { data: summary }));
  assert.match(card, /1.2K/); assert.match(card, /17.3M/); assert.match(card, /1,234/); assert.match(card, /未返回用量/); assert.match(card, /打开插件详情/);
  const rail = require('react-dom/server').renderToStaticMarkup(require('react').createElement(module.SidebarUsageCard, { data: summary, wide: false }));
  assert.ok(!rail.includes('<strong>')); assert.match(rail, /data-wide="false"/);
  await assert.rejects(module.readManagementResponse(new Response('', { status: 404 })), /插件后台未就绪（HTTP 404）/);
  await assert.rejects(module.readManagementResponse(new Response('<html>Not found</html>', { status: 503 })), /插件后台未就绪（HTTP 503）/);
  await assert.rejects(module.readManagementResponse(Response.json({ error: '配置冲突' }, { status: 409 })), /配置冲突/);
  assert.equal((await module.readManagementResponse(Response.json({ revision: 'test', accounts: [] }))).revision, 'test');
});
