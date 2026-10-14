import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('published host entry is discovered by the real DSH client registry', t => {
  const electron = '/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness';
  if (!existsSync(electron)) { t.skip('Installed DSH desktop runtime is required'); return; }
  const result = spawnSync(electron, ['--expose-internals', fileURLToPath(new URL('../scripts/check-client-discovery.mjs', import.meta.url)), '--source'],
    { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('client bundle loads in the real DSH classic-script module loader and registers its settings slot', async () => {
  const require = createRequire(import.meta.url);
  let module, registered;
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
  assert.match(html, /关闭窗口或刷新面板不会重新加载后台/);
  assert.match(html, /我已重启，重新检查/);
  const welcome = require('react-dom/server').renderToStaticMarkup(require('react').createElement(module.InitialSetup, { data: { providers: [{ id: 'trae', name: 'Trae CN' }], localDiscovery: [{ provider: 'trae', state: 'found', savedCount: 1 }] } }));
  assert.match(welcome, /已保存 1 个/);
  assert.match(welcome, /一键获取并保存 WorkBuddy/);
  const updates = require('react-dom/server').renderToStaticMarkup(require('react').createElement(module.PluginUpdatesPanel, { data: { available: true, rows: [{ name: 'other-plugin', version: '1.0.0', enabled: false, source: { kind: 'npm', tag: 'latest' }, status: 'available', latestVersion: '1.1.0' }] } }));
  assert.match(updates, /other-plugin/); assert.match(updates, /停用/); assert.match(updates, /检查全部更新/);
  module.apply({ slots: { inject(name, fn) { assert.equal(name, 'plugins.bundle.config'); fn(); },
    register(options, component) { registered = { options, component }; } } });
  assert.equal(registered.options.key, 'dsh-multi-router');
  assert.equal(registered.component, module.RouterPage);
  await assert.rejects(module.readManagementResponse(new Response('', { status: 404 })), /插件后台未就绪（HTTP 404）/);
  await assert.rejects(module.readManagementResponse(new Response('<html>Not found</html>', { status: 503 })), /插件后台未就绪（HTTP 503）/);
  await assert.rejects(module.readManagementResponse(Response.json({ error: '配置冲突' }, { status: 409 })), /配置冲突/);
  assert.equal((await module.readManagementResponse(Response.json({ revision: 'test', accounts: [] }))).revision, 'test');
});
