import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { parseWorkBuddyVersion, compareWorkBuddyVersions } from '../upstream/workbuddy/src/update.ts';

const packageName = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i;
const safeRef = /^[a-zA-Z0-9._/-]{1,200}$/;
export function parsePluginSource(name, spec) {
  if (!packageName.test(name) || typeof spec !== 'string' || spec.length > 600 || spec.startsWith('-') || spec.trim() !== spec || /[\x00-\x1f]/.test(spec)) return { kind: 'unsupported' };
  const git = /^(?:github:|git\+https:\/\/github\.com\/|https:\/\/github\.com\/|git\+ssh:\/\/git@github\.com\/|git@github\.com:)?([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:#(.+))?$/.exec(spec);
  if (git && !spec.startsWith('@') && !spec.startsWith('file:') && !spec.startsWith('link:')) {
    const [, owner, repo, ref] = git;
    if (owner === '.' || owner === '..' || repo === '.' || repo === '..' || (ref && (!safeRef.test(ref) || ref.includes('..')))) return { kind: 'unsupported' };
    return { kind: 'github', owner, repo, ref, source: `github:${owner}/${repo}${ref ? '#' + ref : ''}` };
  }
  if (/^(?:file:|link:|workspace:|https?:|git|\/|\.)/.test(spec)) return { kind: 'unsupported' };
  const alias = /^npm:((?:@[^/]+\/)?[^@]+)(?:@(.+))?$/.exec(spec);
  const actual = alias?.[1] ?? name, range = alias?.[2] ?? spec;
  if (!packageName.test(actual) || !/^[a-zA-Z0-9.*^~<>=|+ -]{1,160}$/.test(range)) return { kind: 'unsupported' };
  // Explicit dist-tags retain their channel; exact versions and ranges update to latest.
  const channel = /^[a-zA-Z][\w.-]*$/.test(range);
  return { kind: 'npm', package: actual, alias: !!alias, channel, tag: channel ? range : 'latest', source: spec };
}
export function githubCommit(value) {
  if (typeof value !== 'string') return undefined;
  return /(?:\/tar\.gz\/|\/tarball\/|#)([a-f0-9]{40})(?:\b|\()/i.exec(value)?.[1]?.toLowerCase();
}
async function jsonFile(file) { try { return JSON.parse(await readFile(file, 'utf8')); } catch { return undefined; } }
async function locks(dir) {
  let pnpm;
  try { pnpm = parseYaml(await readFile(join(dir, 'pnpm-lock.yaml'), 'utf8'), { maxAliasCount: 20 }); } catch { /* npm profiles use package-lock instead. */ }
  const npm = await jsonFile(join(dir, 'package-lock.json'));
  const times = await Promise.all(['pnpm-lock.yaml', 'package-lock.json'].map(name => stat(join(dir, name)).then(s => s.mtimeMs).catch(() => 0)));
  return { pnpm, npm, preferNpm: times[1] > times[0] };
}
async function publicJson(url, fetchImpl, signal) {
  const res = await fetchImpl(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
    headers: { Accept: 'application/json', 'User-Agent': 'dsh-multi-router-plugin-updates' }, redirect: 'error' });
  if (!res.ok) throw Error(res.status === 403 || res.status === 429 ? '远端限流，请稍后重试' : res.status === 404 ? '仓库 / 版本不存在，或需要私有仓库授权' : `网络请求失败（HTTP ${res.status}）`);
  let size = 0, chunks = [];
  for await (const chunk of res.body) { size += chunk.byteLength; if (size > 256 * 1024) throw Error('更新元数据过大'); chunks.push(Buffer.from(chunk)); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
const short = sha => sha?.slice(0, 8);
async function registryVersion(service, profile, spec, signal) {
  const require = createRequire(profile.installAnchor);
  const { viewProfilePackage } = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-plugin-manager/operations')).href);
  const { registryPlan } = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-plugin-manager/registry')).href);
  for (const registry of registryPlan(undefined, await service.registries())) {
    const answer = await viewProfilePackage(profile.dir, spec, { ...profile.packageManager, registry, timeoutMs: 12000, signal });
    if (signal.aborted) throw Error('检查已取消');
    if (answer.exitCode !== 0) continue;
    const parsed = JSON.parse(answer.stdout), metadata = Array.isArray(parsed) ? parsed.at(-1) : parsed;
    if (metadata?.version) return metadata;
  }
  throw Error('npm 查询失败；请检查 DSH 网络、registry 设置或包的访问权限');
}
export class PluginUpdates {
  constructor({ service = () => undefined, profile = () => undefined, fetchImpl = (...args) => fetch(...args), lookup = registryVersion } = {}) {
    this.service = service; this.profile = profile; this.fetchImpl = fetchImpl;
    this.rows = []; this.abort = new AbortController();
    this.lookup = lookup;
  }
  state() { return { available: !!this.service()?.listBundles && !!this.profile()?.dir,
    checkedAt: this.checkedAt, rows: this.rows.map(({ spec, ...row }) => ({ ...row, source: row.source.kind === 'unsupported' ? { kind: 'unsupported' } : row.source })), job: this.job, error: this.error }; }
  async list() {
    const service = this.service(), profile = this.profile();
    if (!service?.listBundles || !profile?.dir) { this.rows = []; return; }
    const [manifest, bundles, lock] = await Promise.all([jsonFile(join(profile.dir, 'package.json')), service.listBundles(), locks(profile.dir)]);
    if (!manifest) throw Error('当前 DSH 配置的插件清单无法读取');
    this.rows = bundles.filter(b => b.installed || b.version).map(b => {
      const spec = manifest.dependencies?.[b.name];
      const source = !spec || b.removable === false && !b.readOnlyReason ? { kind: 'builtin' } : parsePluginSource(b.name, spec);
      const npm = lock.npm?.packages?.[`node_modules/${b.name}`]?.resolved;
      const pnpm = lock.pnpm?.importers?.['.']?.dependencies?.[b.name]?.version;
      const installed = lock.preferNpm ? npm ?? pnpm : pnpm ?? npm;
      const previous = this.rows.find(r => r.name === b.name && r.spec === spec && r.version === b.version && r.commit === githubCommit(installed));
      return { ...previous, name: b.name, version: b.version, enabled: b.enabled, spec, source,
        commit: githubCommit(installed), status: previous?.status ?? (source.kind === 'builtin' ? 'builtin' : source.kind === 'unsupported' ? 'unsupported' : 'unchecked'),
        ...(source.kind === 'builtin' ? { message: 'DSH 自带 / 受保护组件，请通过更新 DeepSeek Harness 升级' } : {}),
        ...(source.kind === 'unsupported' ? { message: '本地文件 / 链接来源，请通过原安装方式更新' } : {}) };
    });
  }
  async checkRow(row) {
    try {
      if (row.source.kind === 'npm') {
        const spec = `${row.source.package}@${row.source.tag}`;
        const found = await this.lookup(this.service(), this.profile(), spec, this.abort.signal);
        if (!found.version || found.problem && found.problem !== 'already-installed') throw Error(found.problem === 'not-found' ? 'npm 中未找到该包或频道' : 'npm 查询失败；请检查 DSH 的网络与 registry 设置');
        if (!parseWorkBuddyVersion(found.version) || row.version && !parseWorkBuddyVersion(row.version)) throw Error('无法比较版本号');
        row.latestVersion = found.version;
        row.target = `${row.name}@${row.source.alias ? `npm:${row.source.package}@` : ''}${row.source.channel ? row.source.tag : found.version}`;
        row.status = !row.version || compareWorkBuddyVersions(found.version, row.version) > 0 ? 'available' : 'current';
        row.message = !row.version ? '安装文件不可读，可重新安装该来源修复' : row.status === 'current' ? '当前版本已是该频道最新，或高于该频道' : undefined;
      } else if (row.source.kind === 'github') {
        const { owner, repo, ref } = row.source;
        const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(ref ?? 'HEAD')}`;
        const found = await publicJson(url, this.fetchImpl, this.abort.signal);
        if (!/^[a-f0-9]{40}$/i.test(found.sha)) throw Error('GitHub 返回无效提交信息');
        row.latestCommit = found.sha.toLowerCase();
        row.target = `${row.name}@${row.spec}`;
        row.status = row.commit === row.latestCommit ? 'current' : 'available';
        row.message = row.commit ? (row.status === 'available' ? `提交 ${short(row.commit)} → ${short(row.latestCommit)}` : '该分支 / 标签的提交已同步') : '无法读取本地 Git 提交，可重新安装已检查的来源';
        if (ref && /^[a-f0-9]{7,40}$/i.test(ref)) { row.status = 'pinned'; row.message = '安装来源固定在 Git 提交；保留此提交，不自动切换分支'; }
      }
      row.checkedAt = Date.now();
      row.checkedEnabled = row.enabled;
    } catch (error) { row.status = 'failed'; row.message = error.message; delete row.target; }
  }
  start(kind, task) {
    if (this.flight) throw Error('已有插件操作正在执行，请等待完成');
    this.job = { id: randomUUID(), kind, state: 'running', startedAt: Date.now(), results: [], total: 0 };
    this.error = undefined;
    this.flight = Promise.resolve().then(() => task(this.job)).then(() => { this.job.state = this.job.cancelRequested ? 'cancelled' : 'done'; }, e => { this.job.state = this.job.cancelRequested ? 'cancelled' : 'failed'; this.job.message = e.message; })
      .finally(() => { this.job.finishedAt = Date.now(); this.flight = undefined; });
  }
  check() {
    this.start('check', async job => {
      await this.list();
      const rows = this.rows.filter(r => ['npm', 'github'].includes(r.source.kind)); job.total = rows.length;
      // Small pool keeps registry requests bounded without making one failed plugin stop the list.
      let next = 0;
      await Promise.all(Array.from({ length: Math.min(3, rows.length) }, async () => {
        while (next < rows.length && !job.cancelRequested) { const row = rows[next++]; await this.checkRow(row); job.results.push({ name: row.name, status: row.status, message: row.message }); }
      }));
      this.checkedAt = Date.now();
    });
  }
  async installRow(row, registry) {
    const original = await jsonFile(join(this.profile().dir, 'package.json'));
    if (original?.dependencies?.[row.name] !== row.spec) throw Error('安装来源已改变，请重新检查');
    const current = (await this.service().listBundles()).find(b => b.name === row.name);
    if (!current || current.enabled !== row.checkedEnabled || current.version !== row.version) throw Error('插件版本或启用状态已改变，请重新检查');
    const result = await this.service().installBundle(row.target, { enabled: row.enabled, requestId: this.job.id,
      ...(registry ? { registry } : {}) });
    if (result.packageResult && result.packageResult.exitCode !== 0 || ['failed', 'cancelled'].includes(result.application) || result.error) {
      return { name: row.name, status: 'failed', application: result.application,
        message: result.pendingBuilds?.length ? '依赖构建脚本需要授权，请到 DSH 插件安装页允许这些脚本后重试' : result.error?.code === 'incompatible-version' ? '插件与当前 DSH 不兼容，请先升级 DSH 或选择兼容版本' : `安装未完成（${result.error?.code ?? result.packageResult?.kind ?? 'unknown'}）；请到 DSH 插件页查看安装日志`,
        pendingBuilds: result.pendingBuilds ?? [], logPath: result.packageResult?.logPath };
    }
    const installed = (await this.service().listBundles()).find(b => b.name === row.name);
    if (row.source.kind === 'npm' && installed?.version !== row.latestVersion) return { name: row.name, status: 'failed',
      message: `实际安装版本 ${installed?.version ?? '未知'} 与检查版本 ${row.latestVersion} 不同；请稍后重新检查，可能是镜像尚未同步或发行时间限制` };
    return { name: row.name, status: 'installed', application: result.application, message: result.application === 'restart-required' ? '已安装，完全退出并重新打开 DSH 后生效' : '安装完成', restartRequired: result.application === 'restart-required' };
  }
  update(names, registry) {
    if (!Array.isArray(names) || !names.length || names.length > 200 || names.some(n => typeof n !== 'string') || new Set(names).size !== names.length) throw Error('请选择要更新的插件');
    const selected = names.map(name => this.rows.find(r => r.name === name));
    if (selected.some(r => !r || !['available', 'failed'].includes(r.status) || !r.target || Date.now() - r.checkedAt > 600000)) throw Error('请先检查更新，再选择可更新的插件（检查结果有效期 10 分钟）');
    // Updating this manager last avoids losing the batch if the host gains module reload support.
    selected.sort((a, b) => Number(a.name === 'dsh-multi-router') - Number(b.name === 'dsh-multi-router'));
    this.start('update', async job => {
      job.total = selected.length;
      for (const row of selected) {
        if (job.cancelRequested) break;
        job.current = row.name;
        let result;
        try { result = await this.installRow(row, registry); } catch (e) { result = { name: row.name, status: 'failed', message: e.message }; }
        job.results.push(result);
        row.status = result.status; row.message = result.message;
      }
      delete job.current; await this.list();
    });
  }
  install(spec, registry) {
    if (typeof spec !== 'string' || spec.length > 600 || spec.startsWith('-') || /[\s\x00-\x1f]/.test(spec)) throw Error('请输入一个 npm 包名或 GitHub 安装地址');
    const named = /^((?:@[^/]+\/)?[^@]+)(?:@(.+))?$/.exec(spec);
    const github = parsePluginSource('placeholder', spec);
    const npm = named && parsePluginSource(named[1], named[2] || 'latest');
    if (github.kind !== 'github' && npm?.kind !== 'npm') throw Error('仅支持 npm 包名 / 版本或 github:用户/仓库');
    this.start('install', async job => {
      job.total = 1; job.current = spec;
      const result = await this.service().installBundle(spec, { requestId: job.id, ...(registry ? { registry } : {}) });
      job.results.push({ name: result.bundle ?? spec, status: result.error || ['failed', 'cancelled'].includes(result.application) || result.packageResult && result.packageResult.exitCode !== 0 ? 'failed' : 'installed',
        message: result.error ? `安装未完成（${result.error.code}），请查看 DSH 插件安装日志` : result.application === 'restart-required' ? '已安装，请完全退出并重启 DSH' : '安装完成',
        application: result.application, pendingBuilds: result.pendingBuilds ?? [], restartRequired: result.application === 'restart-required' });
      delete job.current; await this.list();
    });
  }
  async action(input) {
    if (!this.state().available) throw Error('当前 DSH 未提供插件管理接口，请升级 DSH 后重试');
    if (input.registry && !['https://registry.npmjs.org/', 'https://registry.npmmirror.com/'].includes(input.registry)) throw Error('无效的 npm 来源');
    if (input.action === 'plugins.list') { if (!this.flight) await this.list(); }
    else if (input.action === 'plugins.check') this.check();
    else if (input.action === 'plugins.update') this.update(input.names, input.registry);
    else if (input.action === 'plugins.install') this.install(input.spec, input.registry);
    else if (input.action === 'plugins.cancel') { if (this.job?.state === 'running') { this.job.cancelRequested = true; if (this.job.kind !== 'check') await this.service().cancelInstall?.(this.job.id); } }
    else throw Error('未知插件操作');
  }
}
