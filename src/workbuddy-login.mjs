// SMS endpoint flow adapted from L0NE-6/WorkBuddy-Daily (MIT); see THIRD_PARTY_NOTICES.md.
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { withFileLock } from '@deepseek-ai/dsh-atomic-write';
import { writePrivateJson } from './config.mjs';
import { workbuddyToken, refreshWorkBuddyCheckinCredential } from './clients.mjs';
import { readLimitedText } from '../upstream/qoder/src/qoder/transport/request.ts';

export class WorkBuddyLogin {
  constructor(file, { fetchImpl = (...args) => fetch(...args), now = Date.now } = {}) {
    this.file = file; this.fetchImpl = fetchImpl; this.now = now; this.abort = new AbortController();
    this.abort.signal.addEventListener('abort', () => this.finish(), { once: true });
  }
  async reserve(field, ms) {
    await withFileLock(this.file, async () => {
      let state = {}; try { state = JSON.parse(await readFile(this.file, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw Error('登录冷却记录不可读，请检查本机文件'); }
      if (state.pausedUntil > this.now() || state[field] > this.now()) throw Error('请求冷却中，请稍后重试；平台限制请在官方客户端处理');
      state[field] = this.now() + ms; await writePrivateJson(this.file, state);
    });
  }
  async pause() {
    this.pending = undefined;
    await withFileLock(this.file, async () => {
      const state = JSON.parse(await readFile(this.file, 'utf8')); state.pausedUntil = this.now() + 15 * 60000;
      await writePrivateJson(this.file, state);
    });
  }
  async post(path, body) {
    let response;
    try { response = await this.fetchImpl(`https://www.workbuddy.cn/v2/plugin/login/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Origin: 'https://www.workbuddy.cn', Referer: 'https://www.workbuddy.cn/' },
      body: JSON.stringify(body), signal: AbortSignal.any([this.abort.signal, AbortSignal.timeout(30000)]), redirect: 'error',
    }); } catch { throw Error('登录请求未完成，请稍后手动重试；不会自动重发短信'); }
    if ([403, 429].includes(response.status)) { await this.pause(); throw Error('平台限制或需要验证，已暂停登录请求，请使用官方客户端'); }
    if (!response.ok) throw Error('官方登录服务暂不可用，请稍后重试');
    let result; try { result = JSON.parse(await readLimitedText(response, 256 * 1024, 'Login')); } catch { throw Error('登录响应无法识别，请使用官方客户端'); }
    if (result?.code !== 0) {
      if ([403, 429].includes(result?.code) || /频繁|图形验证码|滑块|安全验证|captcha|risk|too many|frequent|验证失败次数/i.test(result?.msg || '')) {
        await this.pause(); throw Error('平台限制或需要验证，已暂停登录请求，请使用官方客户端');
      }
      throw Error(path === 'token' ? '登录未成功，请检查验证码是否正确、过期；仅支持已有账号' : '短信未发送成功，请确认已有账号及手机号，或使用官方客户端');
    }
    return result.data ?? {};
  }
  async send(phone) {
    if (typeof phone !== 'string' || !/^1[3-9]\d{9}$/.test(phone)) throw Error('请输入 11 位中国大陆手机号');
    if (this.flight) throw Error('登录请求正在处理中');
    this.flight = (async () => {
      await this.reserve('smsAt', 60000); this.pending = undefined;
      const data = await this.post('send-sms', { phone });
      const expires = Math.min(300, Math.max(1, Number(data.expires_in) || 300)) * 1000;
      this.pending = { phone, challenge: randomBytes(24).toString('hex'), expiresAt: this.now() + expires, attempts: 0 };
      clearTimeout(this.expiryTimer); this.expiryTimer = setTimeout(() => this.finish(), expires); this.expiryTimer.unref();
      return { challenge: this.pending.challenge, expiresAt: this.pending.expiresAt, resendAt: this.now() + 60000 };
    })();
    try { return await this.flight; } finally { this.flight = undefined; }
  }
  async complete(challenge, code, verify = true) {
    if (typeof challenge !== 'string' || !this.pending || challenge !== this.pending.challenge || this.pending.expiresAt <= this.now()) throw Error('本次登录已过期或插件已重启，请重新获取验证码');
    if (this.flight) throw Error('登录请求正在处理中');
    if (this.pending.document) return this.pending;
    if (typeof code !== 'string' || !/^\d{4,8}$/.test(code) || typeof verify !== 'boolean') throw Error('请输入收到的短信验证码');
    if (this.pending.attempts >= 5) throw Error('本次验证码尝试次数已达上限，请稍后重新获取');
    this.flight = (async () => {
      await this.reserve('loginAt', 5000); const pending = this.pending; pending.attempts++;
      const data = await this.post('token', { login_method: 'phone', phone: pending.phone, sms_code: code });
      const accessToken = data.accessToken || data.access_token, refreshToken = data.refreshToken || data.refresh_token;
      let token; try { token = workbuddyToken(accessToken); } catch { throw Error('登录返回的令牌不属于 WorkBuddy 中国版，请使用官方客户端'); }
      if (typeof refreshToken !== 'string' || !refreshToken || !Number.isFinite(token.exp) || token.exp * 1000 <= this.now()) throw Error('登录响应缺少有效凭证，请重新登录');
      let credential = { accessToken, refreshToken, uid: token.sub, expiresAtMs: token.exp * 1000, domain: 'www.workbuddy.cn', source: 'dsh' };
      if (verify) {
        try {
          const rotated = await refreshWorkBuddyCheckinCredential(credential, { fetchImpl: this.fetchImpl, signal: AbortSignal.any([this.abort.signal, AbortSignal.timeout(30000)]) });
          credential = { ...credential, accessToken: rotated.accessToken, refreshToken: rotated.refreshToken || credential.refreshToken,
            expiresAtMs: Date.now() + rotated.expiresInSec * 1000 };
        } catch { pending.warning = '登录凭证已保存，但刷新令牌验证未通过；请稍后在账号详情检查登录有效期。'; }
      }
      // Keep only the short-lived server-side result so a save conflict can retry without consuming the SMS again.
      delete pending.phone;
      pending.document = { version: 1, credential }; return pending;
    })();
    try { return await this.flight; } finally { this.flight = undefined; }
  }
  finish() { clearTimeout(this.expiryTimer); this.pending = undefined; }
}
