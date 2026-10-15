import { readFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { join } from 'node:path';

// Let DSH reconcile its profile; never alter the host's module caches. Release
// specific host specifiers turn both its server and browser module generations.
export class PluginReload {
  constructor({ service, profile, canReload, busy = () => false, now = Date.now, runningVersion }) {
    Object.assign(this, { service, profile, canReload, busy, now, runningVersion });
    this.phase = 'current'; this.installedVersion = runningVersion; this.retryAt = 0;
  }
  state() { return { runningVersion: this.runningVersion, installedVersion: this.installedVersion, phase: this.phase, canReload: !!this.canReload(), message: this.message }; }
  start() {
    const dir = this.profile()?.dir;
    if (dir) try { this.watcher = watch(dir, () => this.schedule()); this.watcher.unref(); } catch { /* Minute tick also detects CLI installs. */ }
    this.schedule();
  }
  schedule(delay = 500) {
    if (this.closed) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.check().catch(() => {}); }, delay); this.timer.unref();
  }
  stop() { this.closed = true; clearTimeout(this.timer); this.watcher?.close(); }
  check() {
    if (this.closed) return Promise.resolve();
    if (this.flight) return this.flight;
    this.flight = this.inspect().finally(() => { this.flight = undefined; });
    return this.flight;
  }
  async inspect() {
    const dir = this.profile()?.dir;
    if (!dir) return;
    let manifest, installed;
    try {
      manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
      installed = JSON.parse(await readFile(join(dir, 'node_modules/dsh-multi-router/package.json'), 'utf8'));
    } catch { return; } // A package replacement can briefly remove its link.
    if (this.closed || !manifest.dsh?.profile?.bundles?.includes('dsh-multi-router')) return;
    if (installed.name !== 'dsh-multi-router' || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(installed.version)) return;
    this.installedVersion = installed.version;
    if (installed.version === this.runningVersion) { this.phase = 'current'; this.message = undefined; return; }
    if (!this.canReload() || !this.service()?.setBundleEnabled) { this.phase = 'restart-required'; this.message = '当前 DSH 未提供运行中重载，请升级 DSH 或重启应用。'; return; }
    if (this.busy()) { this.phase = 'waiting'; this.message = '新版本已安装，等待当前请求和账号操作结束后自动生效。'; this.schedule(1000); return; }
    const root = join(dir, 'node_modules/dsh-multi-router');
    try {
      const patch = await readFile(join(root, 'cordis.patch.yml'), 'utf8');
      if (!patch.includes(`id: llm-multi-router-v2-${installed.version}\n`) || !patch.includes(`name: ./lib/host-v${installed.version}.js`)) throw Error('legacy entry');
      await readFile(join(root, `lib/host-v${installed.version}.js`));
    } catch { this.phase = 'restart-required'; this.message = '安装版本缺少版本化入口，重新安装最新版后再试。'; return; }
    if (this.now() < this.retryAt) return;
    this.phase = 'reloading'; this.message = '正在重新加载插件与配置面板…'; this.retryAt = this.now() + 60000;
    try {
      // This call disposes this plugin. Its disposer must not await this task;
      // own update jobs must already have persisted and settled before entering.
      const result = await this.service().setBundleEnabled('dsh-multi-router', true);
      if (this.closed) return;
      this.phase = 'restart-required';
      this.message = result.application === 'applied' ? 'DSH 尚未切换到新版本，请重新加载插件或查看组件错误。' : 'DSH 未能重载插件，请升级 DSH 或重启应用。';
    } catch { if (!this.closed) { this.phase = 'failed'; this.message = '插件重载未完成，可稍后重试；已保存的配置保持不变。'; } }
  }
}
