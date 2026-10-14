import { build } from 'esbuild';
import { chmod, rm, copyFile } from 'node:fs/promises';
await rm('lib', { recursive: true, force: true });
await build({ entryPoints: { index: 'src/index.mjs', cli: 'src/cli.mjs', clients: 'src/clients.mjs', accounts: 'src/accounts.mjs', shim: 'src/shim.mjs', router: 'src/router.mjs', manager: 'src/manager.mjs' },
  outdir: 'lib', bundle: true, splitting: true, platform: 'node', format: 'esm', target: 'node22', packages: 'external',
  sourcemap: true, legalComments: 'eof' });
await chmod('lib/cli.js', 0o755);
await copyFile('lib/index.js', 'lib/host.js');
await build({ entryPoints: { client: 'src/client.jsx' }, outdir: 'lib', bundle: true, platform: 'browser', format: 'cjs',
  banner: { js: 'window.__ModuleLoader__.load({ id: "dsh-multi-router", factory: (require) => { var module = { exports: {} };' },
  footer: { js: 'return module.exports; } });' },
  target: 'es2022', packages: 'external', jsx: 'automatic', sourcemap: true, legalComments: 'eof' });
