// Real installed DSH lifecycle, with synthetic plugins and an isolated profile.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const runtime = process.env.DSH_RUNTIME ?? '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh';
const { boot, loadProfileDirectory, readProfilePatches } = await import(`${runtime}/node_modules/@deepseek-ai/dsh-app-boot/lib/index.js`);
const { ClientModuleRegistry } = await import(`${runtime}/node_modules/@deepseek-ai/dsh-client-modules/lib/index.js`);
const { PluginManager } = await import(`${runtime}/node_modules/@deepseek-ai/dsh-plugin-manager/lib/index.js`);
const dir = await mkdtemp(join(tmpdir(), 'dsh-live-reload-'));
let ctx;
try {
  const pkg = join(dir, 'node_modules/dsh-multi-router');
  await mkdir(join(pkg, 'lib'), { recursive: true });
  await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'reload-fixture', dependencies: { 'dsh-multi-router': '1.0.0' }, dsh: { profile: { bundles: ['dsh-multi-router'] } } }));
  await writeFile(join(dir, 'cordis.yml'), '[]\n');
  const generation = async version => {
    await writeFile(join(pkg, 'package.json'), JSON.stringify({ name: 'dsh-multi-router', version, type: 'module', main: './lib/index.js', exports: { '.': './lib/index.js', './package.json': './package.json', './client': './lib/client.js' }, dsh: { bundle: { patch: './cordis.patch.yml' }, client: { platform: 'web' } } }));
    const host = `export function apply(ctx) { ctx.provide('fixtureVersion', '${version}'); ctx.effect(() => () => ctx.emit('fixture-disposed', '${version}')); }`;
    await writeFile(join(pkg, 'lib', `host-v${version}.js`), host);
    await writeFile(join(pkg, 'lib/index.js'), host);
    await writeFile(join(pkg, 'lib/client.js'), `window.__ModuleLoader__.load({id:'dsh-multi-router',factory:()=>({fixtureVersion:'${version}'})});`);
    // Start with the legacy entry to prove migration also avoids a process restart.
    await writeFile(join(pkg, 'cordis.patch.yml'), `- insert:\n    - id: llm-multi-router-v2-${version}\n      name: ${version === '1.0.0' ? 'dsh-multi-router' : `./lib/host-v${version}.js`}\n`);
  };
  await generation('1.0.0');
  const profile = { ...loadProfileDirectory('dsh', dir, `${runtime}/package.json`), home: dir, installAnchor: `${runtime}/package.json`, overlays: [] };
  const disposed = [];
  ctx = await boot('dsh', join(dir, 'cordis.yml'), readProfilePatches('dsh', profile), async root => {
    root.on('fixture-disposed', version => disposed.push(version));
    await root.plugin(ClientModuleRegistry);
  }, pathToFileURL(`${dir}/package.json`).href);
  assert.equal(ctx.get('fixtureVersion'), '1.0.0');
  const oldGraph = ctx.get('clientModules').graph();
  const service = Object.create(PluginManager.prototype);
  Object.assign(service, { profile, ownerContext: ctx, managementBundles: new Set(), abort: new AbortController(), lockWaitMs: 1000 });
  Object.defineProperty(service, 'ctx', { value: ctx });
  // The real reload transaction is used; the fixture needs no file watcher.
  ctx.provide('hmr', { runExclusive: operation => operation() });
  await generation('1.0.1');
  const result = await service.setBundleEnabled('dsh-multi-router', true);
  assert.equal(result.application, 'applied', JSON.stringify(result));
  assert.equal(ctx.get('fixtureVersion'), '1.0.1', 'running server must use newly installed code');
  assert.deepEqual(disposed, ['1.0.0']);
  const graph = ctx.get('clientModules').graph();
  assert.notEqual(graph.rev, oldGraph.rev, 'browser must receive a new module graph');
  assert.equal(graph.entries.filter(row => row.id === 'dsh-multi-router').length, 1);
  const entry = graph.entries.find(row => row.id === 'dsh-multi-router');
  const resource = await ctx.get('clientModules').bundleResource('GET', '/' + entry.url);
  assert.equal(resource.status, 200);
  assert.match(String(resource.body), /1\.0\.1/);
  await generation('1.0.2');
  assert.equal((await service.setBundleEnabled('dsh-multi-router', true)).application, 'applied');
  assert.equal(ctx.get('fixtureVersion'), '1.0.2');
  assert.deepEqual(disposed, ['1.0.0', '1.0.1']);
  assert.notEqual(ctx.get('clientModules').graph().rev, graph.rev);
  console.log('PASS: official plugin reload replaces legacy and subsequent host/browser generations in the same process');
} finally {
  await ctx?.fiber.dispose();
  await rm(dir, { recursive: true, force: true });
}
