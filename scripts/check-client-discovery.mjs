// Run with the installed DSH Electron runtime; checks real client-module discovery.
// Override paths with DSH_RUNTIME / DSH_PROFILE_DIR if your install differs.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
const runtime = process.env.DSH_RUNTIME
  ?? '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh';
const { ClientModuleRegistry } = await import(`${runtime}/node_modules/@deepseek-ai/dsh-client-modules/lib/index.js`);
const { loadProfileDirectory, composeEntries } = await import(`${runtime}/node_modules/@deepseek-ai/dsh-app-boot/lib/index.js`);
const dir = process.env.DSH_PROFILE_DIR ?? join(homedir(), '.dsh', 'profiles', 'desktop');
const source = process.argv.includes('--source');
const parse = createRequire(`${runtime}/package.json`)('yaml').parse;
const profile = source ? null : loadProfileDirectory('dsh', dir, `${runtime}/package.json`);
const rows = source ? composeEntries([parse(await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8'))])
  : composeEntries([...profile.layers.map(l => l.patches), profile.patches]);
const entry = rows.find(r => r.id?.startsWith('llm-multi-router-v2'));
assert.ok(entry && !entry.disabled, '统一插件宿主未启用');
const registry = Object.create(ClientModuleRegistry.prototype);
registry.ctx = { loader: {} }; registry.pkgMeta = new Map();
const baseUrl = source ? new URL('../package.json', import.meta.url).href : pathToFileURL(`${dir}/package.json`).href;
const metadata = registry.resolveMeta(entry.name, baseUrl);
assert.ok(metadata, `DSH 未发现配置页面的前端模块；宿主入口：${entry.name}`);
assert.equal(metadata.packageName, 'dsh-multi-router');
assert.ok(metadata.meta.clientPath.endsWith('/lib/client.js'));
console.log(`PASS: ${entry.name} → dsh-multi-router 配置页前端模块`);
