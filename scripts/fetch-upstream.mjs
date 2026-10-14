// Vendor the three pinned upstream projects into ./upstream for building.
// Only what the build and MIT compliance need is kept: TypeScript sources
// plus every license / notice / readme document. Copyright notices must
// travel with the code, so nothing under KEEP may be dropped.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const KEEP = ['src', 'LICENSE', 'LICENSE.md', 'COPYING', 'NOTICE', 'THIRD_PARTY_NOTICES.md', 'README.md', 'README.en.md'];
const lock = JSON.parse(await readFile('upstream-lock.json', 'utf8'));
await mkdir('upstream', { recursive: true });
for (const [name, source] of Object.entries(lock)) {
  const target = resolve('upstream', name);
  const stamp = join(target, '.vendor-commit');
  if (existsSync(stamp) && existsSync(join(target, 'src'))
    && (await readFile(stamp, 'utf8')).trim() === source.commit) {
    console.log(`${name}: already vendored at ${source.commit.slice(0, 12)}`);
    continue;
  }
  const tmp = await mkdtemp(join(tmpdir(), `dsh-multi-router-vendor-${name}-`));
  try {
    execFileSync('git', ['init', '-q', tmp]);
    execFileSync('git', ['remote', 'add', 'origin', source.url], { cwd: tmp });
    execFileSync('git', ['fetch', '-q', '--depth', '1', 'origin', source.commit], { cwd: tmp, stdio: 'inherit' });
    execFileSync('git', ['-c', 'advice.detachedHead=false', 'checkout', '-q', '--detach', 'FETCH_HEAD'], { cwd: tmp });
    if (execFileSync('git', ['rev-parse', 'HEAD'], { cwd: tmp, encoding: 'utf8' }).trim() !== source.commit)
      throw new Error(`${name}: checked-out commit differs from upstream-lock.json`);
    await rm(target, { recursive: true, force: true });
    await mkdir(target, { recursive: true });
    for (const entry of KEEP) {
      if (existsSync(join(tmp, entry))) await cp(join(tmp, entry), join(target, entry), { recursive: true });
    }
    await writeFile(stamp, `${source.commit}\n`);
    console.log(`${name}: vendored ${source.commit.slice(0, 12)} (v${source.version}) from ${source.url}`);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}
