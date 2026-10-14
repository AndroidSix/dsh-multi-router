// Disposable browser check of the actual settings component and management API.
// Uses synthetic accounts and models; no real credentials or upstream requests.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { Router } from '../lib/router.js';
import { Manager, managementHandler, MANAGEMENT_PATH } from '../lib/manager.js';
import { validateConfig, writePrivateJson, DEFAULT_ROUTES } from '../src/config.mjs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const dir = await mkdtemp(join(tmpdir(), 'multi-router-preview-'));
const file = join(dir, 'router.json');
const raw = { accounts: ['wb1', 'wb2', 'tr1', 'qd1'].map((id, i) => ({ id, name: ['主账号', '备用账号', 'Trae 日常账号', 'Qoder 账号'][i],
  provider: ['workbuddy', 'workbuddy', 'trae', 'qoder'][i], credentialFile: join(dir, `${id}.json`) })), routes: DEFAULT_ROUTES };
await writePrivateJson(file, raw);
const router = new Router(validateConfig(raw, file), async a => ({ models: async () => [
  { id: a.provider === 'qoder' ? 'dfmodel' : 'deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash', contextWindow: 200000, maxTokens: 32000 },
  { id: a.provider === 'qoder' ? 'gmodel' : 'glm-5.3', name: 'GLM 5.3', contextWindow: 200000, maxTokens: 64000 },
] }));
const manager = new Manager(file, router); await manager.load();
await Promise.all(['workbuddy', 'trae', 'qoder'].map(p => manager.ensureCatalog(p)));
const api = managementHandler(manager);
const result = await build({ stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
import {RouterPage} from './src/client.jsx'; createRoot(document.getElementById('app')).render(React.createElement(RouterPage));`,
  resolveDir: process.cwd(), loader: 'jsx' }, bundle: true, platform: 'browser', format: 'esm', write: false, jsx: 'automatic' });
const script = result.outputFiles[0].text;
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>DSH Multi Router · 设置预览</title>
<style>:root{--dsw-alias-label-primary:#ececf0;--dsw-alias-label-secondary:#b7b7c1;--dsw-alias-border-l2:#35353c;--dsw-alias-bg-layer-1:#202024;--dsw-alias-bg-module-platform:#18181c;--dsw-alias-state-active-primary:#3d73dc}body{margin:0;padding:32px;background:#111114;font:14px system-ui;color:#ececf0}#app{max-width:1040px;margin:auto}@media(max-width:700px){body{padding:16px}}</style><div id="app"></div><script type="module" src="/app.js"></script></html>`;
const server = createServer((req, res) => {
  if (req.url === MANAGEMENT_PATH) { void api(req, res); return; }
  res.writeHead(200, { 'Content-Type': req.url === '/app.js' ? 'text/javascript' : 'text/html' });
  res.end(req.url === '/app.js' ? script : html);
});
server.listen(0, '127.0.0.1', () => console.log(`http://127.0.0.1:${server.address().port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  server.closeAllConnections(); server.close(); void rm(dir, { recursive: true, force: true }).then(() => process.exit(0));
});
