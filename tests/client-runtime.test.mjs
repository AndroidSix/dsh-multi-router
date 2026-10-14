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
    window: { __ModuleLoader__: { load({ id, factory }) {
      assert.equal(id, 'dsh-multi-router');
      module = factory(name => {
        assert.ok(['react', 'react/jsx-runtime'].includes(name));
        return require(name);
      });
    } } },
  });
  assert.equal(typeof module.RouterPage, 'function');
  module.apply({ slots: { inject(name, fn) { assert.equal(name, 'plugins.bundle.config'); fn(); },
    register(options, component) { registered = { options, component }; } } });
  assert.equal(registered.options.key, 'dsh-multi-router');
  assert.equal(registered.component, module.RouterPage);
});
