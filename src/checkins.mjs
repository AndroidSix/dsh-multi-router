import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { withFileLock } from '@deepseek-ai/dsh-atomic-write';
import { beijingDay, writePrivateJson } from './config.mjs';

export const supportsCheckin = provider => ['trae', 'qoder', 'qoder-global'].includes(provider);
const hash = value => createHash('sha256').update(value).digest('hex');
const nextDay = now => Date.parse(`${beijingDay(now)}T00:00:00+08:00`) + 86400000;
export const checkinMessages = {
  claimed: '签到成功', 'already-claimed': '今日已领取', 'device-used': '此设备今日已参与签到，不再切换其他账号领取',
  'no-campaign': '平台未开放可领取活动', 'before-window': '签到窗口尚未开启',
  paused: '平台限制或需要验证，已暂停此平台签到，请在官方客户端处理',
  uncertain: '请求结果待确认，今日不再自动提交，请在官方客户端核对',
  error: '签到未完成，今日不再重复尝试，请在官方客户端查看',
  unsupported: '暂未接入可核验的签到接口，请使用官方客户端',
};

// One shared journal protects daily intent across processes, restarts and duplicate account copies.
// A persisted intent precedes every request: a timeout/crash must never cause another claim.
export class Checkins {
  constructor(file, manager, { now = Date.now, spacingMs = 10000 } = {}) {
    this.file = file; this.manager = manager; this.now = now; this.spacingMs = spacingMs;
    this.data = { records: {}, devices: {}, pauses: {} }; this.abort = new AbortController();
  }
  async read() {
    try {
      const raw = JSON.parse(await readFile(this.file, 'utf8'));
      const object = value => value && typeof value === 'object' && !Array.isArray(value);
      if (!object(raw) || !['records', 'devices', 'pauses'].every(k => object(raw[k]))
        || Object.values(raw.records).some(r => !object(r) || !Array.isArray(r.ids) || !Number.isFinite(r.at) || typeof r.day !== 'string')) throw Error('Invalid check-in journal');
      this.data = raw;
    } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  async load() {
    try { await this.read(); } catch { this.failed = true; }
  }
  state() {
    return { running: !!this.flight, current: this.current, error: this.failed ? '签到记录无法读取，已停止签到；请修复记录文件后重启插件。' : undefined,
      schedule: '北京时间每天 10:05 后，DSH 运行时执行；错过后下次启动补查',
      accounts: this.manager.config.accounts.map(a => {
        const rows = Object.values(this.data.records).filter(r => r.ids?.includes(a.id));
        const last = rows.sort((a, b) => b.at - a.at)[0];
        const pause = this.data.pauses[a.provider];
        return { id: a.id, supported: supportsCheckin(a.provider), auto: a.autoCheckin === true,
          paused: !!pause, last: last ? { day: last.day, at: last.at, status: last.status, amount: last.amount,
            message: checkinMessages[last.status] || checkinMessages.error } : undefined };
      }) };
  }
  start(ids, automatic = false) {
    if (this.failed || this.abort.signal.aborted || this.flight) return;
    if (!automatic && (!Array.isArray(ids) || !ids.length || ids.length > 200 || ids.some(id => !this.manager.config.accounts.some(a => a.id === id)))) throw Error('请选择有效的签到账号');
    const selected = this.manager.config.accounts.filter(a => supportsCheckin(a.provider) && a.enabled !== false
      && (automatic ? a.autoCheckin === true : ids.includes(a.id))).map(a => a.id);
    if (!selected.length) return;
    this.flight = (async () => {
      let requested = false;
      for (const id of selected) {
        if (this.abort.signal.aborted) break;
        const account = this.manager.config.accounts.find(a => a.id === id && a.enabled !== false && (!automatic || a.autoCheckin === true));
        if (!account) continue;
        if (requested) { await delay(this.spacingMs, undefined, { signal: this.abort.signal }); requested = false; }
        this.current = id;
        requested = await this.run(account, automatic);
      }
    })().catch(() => { if (!this.abort.signal.aborted) this.failed = true; }).finally(() => { this.flight = undefined; this.current = undefined; });
  }
  async resume(provider) {
    if (!supportsCheckin(provider) || this.failed || this.flight) throw Error('请等待签到完成，或先修复签到记录');
    await withFileLock(this.file, async () => {
      await this.read(); delete this.data.pauses[provider]; await writePrivateJson(this.file, this.data);
    });
    // Today's intent/device fences remain intact; resuming cannot bypass a daily limit.
  }
  async run(account, automatic = false) {
    const now = this.now(), day = beijingDay(now);
    if (now < Date.parse(`${day}T10:05:00+08:00`)) return false;
    return withFileLock(this.file, async () => {
      await this.read();
      if (this.abort.signal.aborted || this.data.pauses[account.provider]) return false;
      if (Object.values(this.data.records).some(r => r.day === day && r.ids?.includes(account.id))) return false;
      if (this.data.lastRequestAt && now - this.data.lastRequestAt < this.spacingMs) return false;
      this.data.lastRequestAt = now;
      await writePrivateJson(this.file, this.data);
      const client = await this.manager.router.client(account);
      if (!client.checkin) return false;
      let identity;
      try { identity = await client.checkin.identity(AbortSignal.any([this.abort.signal, AbortSignal.timeout(30000)])); }
      catch {
        // No identity means no safe claim; do not repeatedly refresh bad credentials.
        this.data.pauses[account.provider] = { at: now };
        await writePrivateJson(this.file, this.data); return true;
      }
      if (!identity?.account || (account.provider === 'trae' && !identity.device)) throw Error('Missing check-in identity');
      if (this.abort.signal.aborted || !this.manager.config.accounts.some(a => a.id === account.id && a.enabled !== false
        && a.credentialFile === account.credentialFile && (!automatic || a.autoCheckin === true))) return true;
      const key = hash(`${account.provider}:${identity.account}`), device = identity.device ? hash(`${account.provider}:${identity.device}`) : undefined;
      const old = this.data.records[key];
      if (old?.day === day) {
        if (!old.ids.includes(account.id)) { old.ids.push(account.id); await writePrivateJson(this.file, this.data); }
        return true;
      }
      const record = { day, at: now, status: 'uncertain', ids: [account.id] };
      this.data.records[key] = record;
      // Expired journals are not a retry queue; keep only the last 30 days.
      for (const [k, row] of Object.entries(this.data.records)) if (row.at < now - 30 * 86400000) delete this.data.records[k];
      for (const [k, row] of Object.entries(this.data.devices)) if (row.until <= now) delete this.data.devices[k];
      if (device && this.data.devices[device]?.until > now) {
        record.status = 'device-used'; await writePrivateJson(this.file, this.data); return true;
      }
      // An ambiguous response also keeps the device fenced for the day.
      if (device) this.data.devices[device] = { until: nextDay(now) };
      await writePrivateJson(this.file, this.data);
      let result;
      try { result = await client.checkin.claim(AbortSignal.any([this.abort.signal, AbortSignal.timeout(30000)])); }
      catch { result = { status: 'uncertain' }; }
      record.status = Object.hasOwn(checkinMessages, result?.status) ? result.status : 'uncertain';
      if (device && ['already-claimed', 'no-campaign'].includes(record.status)) delete this.data.devices[device];
      if (['claimed', 'already-claimed'].includes(record.status) && Number.isFinite(result.amount) && result.amount >= 0) record.amount = result.amount;
      if (record.status === 'paused') this.data.pauses[account.provider] = { at: now };
      await writePrivateJson(this.file, this.data);
      if (record.status === 'claimed') await this.manager.monitorAccount(account);
      return true;
    }, { waitMs: 1000 });
  }
}
