import { readFile } from 'node:fs/promises';
import { WorkBuddyCredentialStore } from '../upstream/workbuddy/src/auth.ts';
import { WorkBuddyUpstreamClient, prepareChatBody, modelWithCurrentPromotion } from '../upstream/workbuddy/src/upstream.ts';
import { WORKBUDDY_VARIANTS } from '../upstream/workbuddy/src/variants.ts';
import { TraeCredentialStore, traeAccountId } from '../upstream/trae/src/auth.ts';
import { TraeUsageClient } from '../upstream/trae/src/usage.ts';
import { refreshTraeCredential } from '../upstream/trae/src/refresh.ts';
import { TraeSoloUpstreamClient } from '../upstream/trae/src/solo.ts';
import { TraeSoloRemoteCatalogClient } from '../upstream/trae/src/solo-remote.ts';
import { TraeSoloBridge } from '../upstream/trae/src/solo-bridge.ts';
import { mergeTraeModelSources } from '../upstream/trae/src/catalog.ts';
import { QoderUpstreamClient } from '../upstream/qoder/src/upstream.ts';
import { createQoderTransport } from '../upstream/qoder/src/qoder/transport/index.ts';
import { getMachineId } from '../upstream/qoder/src/qoder/transport/machine-id.ts';
import { QoderLlmError } from '../upstream/qoder/src/qoder/errors.ts';
import { RouteError, abortable } from './router.mjs';
import { preflightStream } from './stream.mjs';

const expiryMs = value => { const n = typeof value === 'number' ? (value < 1e12 ? value * 1000 : value) : Date.parse(value || ''); return Number.isFinite(n) && n > 0 ? n : undefined; };
export async function jsonCredential(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch { throw new RouteError(401, 'credential_unreadable'); }
}
export function cachedModels(discover, ttl) {
  let cached, expires = 0, inflight;
  return async (signal, force = false) => {
    if (!force && cached && expires > Date.now()) return cached;
    // Shared metadata discovery has its own deadline; a departing caller cannot cancel others.
    inflight ??= discover(AbortSignal.timeout(60000)).then(rows => { cached = rows; expires = Date.now() + ttl; return rows; }).finally(() => { inflight = undefined; });
    return abortable(inflight, signal);
  };
}
export async function createAccountClient(account, config, attachments) {
  let chat, discover, accountInfo, checkin;
  if (account.provider.startsWith('workbuddy')) {
    const client = new WorkBuddyUpstreamClient();
    const variant = WORKBUDDY_VARIANTS.find(v => v.id === account.provider);
    const store = new WorkBuddyCredentialStore({ variant, ownPath: account.credentialFile,
      desktopPath: `${account.credentialFile}.no-desktop`, refresh: c => client.refreshToken(c) });
    const credential = async () => {
      try { return await store.resolve(); }
      catch { throw new RouteError(401, 'credential_refresh_failed'); }
    };
    discover = async signal => (await client.fetchModels(await credential(), signal)).map(m => modelWithCurrentPromotion(m));
    accountInfo = async () => {
      const c = await credential(), credits = await client.fetchCredits(c);
      return { login: { state: 'valid', identity: c.uid, name: c.nickname || c.uid, expiresAt: c.expiresAtMs,
        refreshExpiresAt: c.refreshExpiresAtMs, refreshable: !!c.refreshToken, kind: '客户端登录态' },
        remaining: credits.unlimited ? null : credits.total, unlimited: !!credits.unlimited, unit: 'credits',
        cycle: credits.cycleResetTime || credits.accounts.map(p => `${p.packageName}:${p.endTimeMs || ''}`).sort().join('|'),
        packages: credits.accounts.map(p => ({ name: p.packageName, remaining: p.remain, total: p.size, expiresAt: p.endTimeMs, unlimited: !!p.unlimited })), fetchedAt: Date.now() };
    };
    chat = async (input, signal) => client.chatStream(await credential(), prepareChatBody(JSON.stringify(input)), signal);
  } else if (account.provider.startsWith('trae')) {
    const snapshot = await jsonCredential(account.credentialFile);
    const saved = snapshot.credential;
    if (snapshot.version !== 1 || !saved?.accessToken || !['cn', 'sg', 'solo', 'solo-sg'].includes(saved.edition)) throw new RouteError(401, 'invalid_trae_credential');
    const identity = async () => {
      if (!account.identityFile) throw new RouteError(401, 'trae_identity_required');
      const value = await jsonCredential(account.identityFile);
      if (!value.machineId || !value.deviceId || value.edition !== saved.edition) throw new RouteError(401, 'invalid_trae_identity');
      return value;
    };
    const store = new TraeCredentialStore({ ownPath: account.credentialFile,
      storagePath: `${account.credentialFile}.no-desktop`, legacyOwnPath: `${account.credentialFile}.no-legacy`,
      accountId: traeAccountId(saved), region: account.provider === 'trae' ? 'cn' : 'ai',
      refresh: async c => refreshTraeCredential(c, undefined, await identity()) });
    const credential = async () => {
      try { return await store.resolve(); }
      catch { throw new RouteError(401, 'credential_refresh_failed'); }
    };
    const usage = new TraeUsageClient({ credential, deviceId: async () => (await identity()).deviceId });
    if (account.provider === 'trae') {
      const checkinUsage = new TraeUsageClient({ credential, deviceId: async () => (await identity()).deviceId,
        fetchImpl: async (url, options) => {
          const response = await fetch(url, options);
          if (!response.ok) throw Object.assign(Error('checkin_http_error'), { status: response.status });
          if (String(url).endsWith('/status')) {
            const body = await response.clone().json();
            if ((body.code !== undefined && body.code !== 0) || typeof body.checked_in !== 'boolean' || typeof body.did_checked_in !== 'boolean') throw Object.assign(Error('checkin_status_rejected'), { status: 403 });
          }
          return response;
        } });
      checkin = { identity: async () => ({ account: (await credential()).userId, device: (await identity()).deviceId }),
        claim: signal => claimTraeCheckin(checkinUsage, signal) };
    }
    accountInfo = async signal => {
      const c = await credential();
      const login = { state: 'valid', identity: c.userId, name: c.accountName || c.userId, expiresAt: c.expiresAtMs,
        refreshExpiresAt: c.refreshExpiresAtMs, refreshable: !!c.refreshToken, kind: '客户端登录态', edition: c.edition };
      if (account.provider === 'trae-global') { const plan = await usage.payStatus(signal); return { login, plan: plan.payIdentityStr || '未返回套餐名称', unit: 'subscription', remaining: null, packages: [], fetchedAt: Date.now() }; }
      const result = await usage.snapshot(signal), packs = result.packs;
      return { login, unit: result.isCreditsBilling ? 'credits' : 'billing', remaining: result.isCreditsBilling ? Math.max(0, result.summary.totalAmount - result.summary.consumedAmount) : null,
        total: result.summary.totalAmount, used: result.summary.consumedAmount,
        cycle: packs.map(p => `${p.entitlementId}:${p.endTimeMs}`).sort().join('|'),
        packages: packs.map(p => ({ name: p.displayDesc, total: p.creditsLimit, remaining: typeof p.creditsLimit === 'number' && typeof p.consumedCredits === 'number' ? Math.max(0, p.creditsLimit - p.consumedCredits) : null, expiresAt: p.endTimeMs })), fetchedAt: Date.now() };
    };
    const solo = new TraeSoloUpstreamClient({ credential, identity });
    const remote = new TraeSoloRemoteCatalogClient({ credential });
    let rows = [];
    discover = async signal => {
      const [skeleton, wire] = await Promise.all([remote.fetchModels(signal), solo.fetchModels(signal)]);
      rows = mergeTraeModelSources(skeleton, wire);
      return rows;
    };
    const bridge = new TraeSoloBridge(solo, { current: () => rows });
    chat = (input, signal) => bridge.chatStream(JSON.stringify(input), signal);
  } else {
    const region = account.provider === 'qoder' ? 'china' : 'global';
    const getPat = async () => {
      const value = await jsonCredential(account.credentialFile);
      if (value.version !== 2 || value.region !== region || typeof value.pat !== 'string' || !value.pat.trim()) throw new RouteError(401, 'invalid_qoder_credential');
      return value.pat;
    };
    const transport = createQoderTransport({ region, resolvePat: getPat,
      // Reuse the official CLI identity (or one persisted plugin seed) for this physical device.
      resolveMachineId: () => getMachineId(),
      ...(attachments ? { attachments } : {}) });
    const client = new QoderUpstreamClient({ region, providerId: account.provider, getPat, transport,
      ...(attachments ? { attachments } : {}) });
    const checkinTransport = createQoderTransport({ region, resolvePat: getPat, resolveMachineId: () => getMachineId(),
      fetch: async (url, options) => {
        const response = await fetch(url, options);
        if (!response.ok) {
          // A check-in refusal must not enter the metadata/auth healing retry paths.
          const restricted = [401, 403, 429].includes(response.status);
          throw new QoderLlmError(`checkin_http_${response.status}`, restricted ? 'QUOTA' : 'PROVIDER_ERROR', { status: response.status });
        }
        return response;
      } });
    checkin = { identity: async signal => ({ account: (await checkinTransport.readAccount({ signal })).profile.id }),
      claim: async signal => {
        const result = await checkinTransport.checkIn(signal);
        // The upstream helper supplies a fallback reward of 100. Do not report that as an observed grant.
        if (result.status !== 'error') return { status: result.status };
        // The upstream service returns errors as values. Never expose its raw body or retry it through another account.
        return { status: /401|403|429|rate.?limit|throttl|captcha|verify|verification|风控|验证|频繁|forbidden|unauthor|AUTH/i.test(result.message || '') ? 'paused' : 'uncertain' };
      } };
    accountInfo = async signal => {
      const result = await transport.readAccount({ force: true, signal });
      const buckets = [['个人套餐', result.usage?.userQuota], ['附加额度', result.usage?.addOnQuota], ['组织额度', result.usage?.orgResourcePackage]].filter(([, p]) => p).map(([name, p]) => ({ ...p, name }));
      const creditBuckets = buckets.filter(p => /credit|point|积分/i.test(p.unit));
      return { login: { state: 'valid', identity: result.profile.id, name: result.profile.name || result.profile.email || result.profile.id, kind: 'PAT', refreshable: false },
        plan: result.plan?.planTierName, remaining: creditBuckets.length ? creditBuckets.reduce((n, p) => n + p.remaining, 0) : null,
        unit: creditBuckets.length ? 'credits' : 'unknown', cycle: result.usage?.expiresAt || result.plan?.endDate || '',
        packages: buckets.map(p => ({ name: p.name, total: p.total, remaining: p.remaining, unit: p.unit, expiresAt: expiryMs(result.usage?.expiresAt || result.plan?.endDate) })), fetchedAt: Date.now() };
    };
    discover = signal => client.fetchModels(signal);
    chat = (input, signal) => client.chatStream(JSON.stringify(input), signal);
  }
  return { models: cachedModels(discover, config.catalogTtlMs), accountInfo, checkin,
    async chat(input, signal) {
      const result = await chat(input, signal);
      return result.ok ? preflightStream(result.response, signal) : result;
    } };
}

export async function claimTraeCheckin(usage, signal) {
  try {
    const status = await usage.checkinStatus(signal);
    if (status.checkedIn) return { status: 'already-claimed' };
    if (status.didCheckedIn) return { status: 'device-used' };
    if (!status.enabled) return { status: 'no-campaign' };
    const claim = await usage.claimCheckin(signal);
    if (claim.code === 9095) return { status: 'device-used' };
    if (!claim.claimed) return { status: 'paused' };
    // A success response is authoritative; do not turn a failed follow-up balance read into a retry.
    return { status: 'claimed', ...(Number.isFinite(status.credits) ? { amount: status.credits + (status.extraCredits || 0) } : {}) };
  } catch (e) {
    return { status: [401, 403, 429].includes(e.status) ? 'paused' : 'uncertain' };
  }
}
