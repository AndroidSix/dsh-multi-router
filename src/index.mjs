import z from '@deepseek-ai/schemastery';
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths';
import { resolveRetryPolicy, resolveImageAttachmentAccess } from '@deepseek-ai/dsh-llm';
import { join, resolve } from 'node:path';
import { createWorkBuddyAdapter } from '../upstream/workbuddy/src/adapter.ts';
import { ensureConfig, PROVIDERS, PROVIDER_NAMES } from './config.mjs';
import { createAccountClient } from './clients.mjs';
import { SessionMetrics } from './telemetry.mjs';
import { Router, abortable } from './router.mjs';
import { createShim } from './shim.mjs';
import { Manager, managementHandler, MANAGEMENT_PATH, SUMMARY_PATH } from './manager.mjs';
import { PluginReload } from './plugin-reload.mjs';
import { version as pluginVersion } from '../package.json';

export const name = 'dsh-multi-router';
export const inject = ['llm'];
export const defaultConfigFile = () => join(resolveDshHome(), 'multi-router', 'router.json');
export const Config = z.object({ configFile: z.string().description('Absolute path to multi-account router.json') });
export async function apply(ctx, options = {}) {
  let disposed = false, manager, stopWatch, monitorTimer, startup;
  const releases = [], shims = [], wrappers = [];
  ctx.effect(() => () => {
    disposed = true; stopWatch?.(); clearInterval(monitorTimer); manager?.runtime?.stop();
    if (manager) manager.closed = true;
    manager?.plugins.abort.abort();
    manager?.checkins.abort.abort();
    manager?.workbuddyLogin.abort.abort();
    for (const release of releases) release();
    return Promise.all([manager?.api.close(), ...shims.map(shim => shim.close()), ...(manager?.refreshes.values() ?? []), ...(manager?.monitorFlights.values() ?? []), startup, manager?.localScan, manager?.checkins.flight, manager?.plugins.flight, manager?.plugins.saveQueue.catch(() => {}), manager?.telemetry.queue.catch(() => {})]);
  });
  const file = resolve(options.configFile ?? process.env.DSH_MULTI_ROUTER_CONFIG ?? defaultConfigFile());
  try {
    const config = await ensureConfig(file);
    if (disposed) return;
    const router = new Router(config, a => createAccountClient(a, manager?.config ?? config, ctx.get('attachments')),
      event => ctx.logger.info('multi-router', JSON.stringify(event)));
    manager = new Manager(file, router, () => {
      for (const wrapper of wrappers) wrapper.invalidate();
      ctx.emit('llm/adapters-updated');
    }, { service: () => ctx.get('pluginManager'), profile: () => ctx.get('profileContext'), hmr: () => ctx.get('hmr') });
    await manager.load();
    if (disposed) return;
    manager.startup = { phase: 'discovering' };
    manager.runtime = new PluginReload({ runningVersion: pluginVersion, service: () => ctx.get('pluginManager'), profile: () => ctx.get('profileContext'), canReload: () => !!ctx.get('hmr'), hmr: () => ctx.get('hmr'),
      busy: () => !!(manager.localScan || manager.requests || manager.api.controllers.size || manager.plugins.flight || manager.checkins.flight || manager.workbuddyLogin.flight || manager.workbuddyLogin.pending || manager.refreshes.size || manager.monitorFlights.size || shims.some(s => s.active())) });
    ctx.inject?.(['webServer'], webCtx => {
      webCtx.effect(() => webCtx.webServer.register({ kind: 'exact', path: SUMMARY_PATH, handler: managementHandler(manager, { summaryOnly: true }) }));
      webCtx.effect(() => webCtx.webServer.register({ kind: 'exact', path: MANAGEMENT_PATH, handler: managementHandler(manager) }));
    });
    const metrics = new SessionMetrics(manager.telemetry);
    ctx.on('session/event', (session, event) => { try { return metrics.event(session, event)?.catch(() => ctx.logger.warn('multi-router: performance persistence failed')); } catch { ctx.logger.warn('multi-router: performance event unavailable'); } });
    ctx.on('session/disposed', session => metrics.dispose(session));
    for (const provider of ['multi-router', ...PROVIDERS]) {
      if (disposed) return;
      const isRouter = provider === 'multi-router';
      const shim = createShim(router, { modelPrefix: isRouter ? '' : `${provider}::` });
      shims.push(shim); await shim.ready;
      if (disposed) { await shim.close(); return; }
      const wrapper = createWorkBuddyAdapter({ providerId: provider,
        displayName: isRouter ? '统一路由' : `${PROVIDER_NAMES[provider]} · 内置账号池`, shim,
        catalog: { current: () => isRouter ? manager.adapterModels() : manager.providerModels(provider) },
        hidden: () => isRouter ? manager.adapterModels().filter(r => r.visible === false).map(r => r.id) : manager.hiddenModels(provider),
        region: provider.endsWith('global') || provider === 'workbuddy-ai' ? 'global' : 'cn',
        resolveAttachments: () => ctx.get('attachments'),
        resolveImageAccess: (attachments, ref) => resolveImageAttachmentAccess(attachments,
          path => ctx.get('fs')?.processPathFromHostPath(path), ref) });
      if (!isRouter) {
        // Discovery and transport are bundled here; no call uses another DSH provider adapter.
        for (const method of ['listModels', 'resolveModel', 'prepareCall']) {
          const original = wrapper.adapter[method].bind(wrapper.adapter);
          wrapper.adapter[method] = async (...args) => { await abortable(manager.ensureCatalog(provider), args[2]); return original(...args); };
        }
      }
      // pi-ai omits explicit Off before serialization. Keep each call's selection
      // in its own snapshot/header so Default, Off and configured defaults stay distinct.
      const streamWithSnapshot = wrapper.adapter.streamWithSnapshot.bind(wrapper.adapter);
      wrapper.adapter.streamWithSnapshot = (options, snapshot) => {
        const call = metrics.beginCall(options.sessionId, options.purpose);
        const route = router.config.routes[(isRouter ? '' : `${provider}::`) + options.model];
        const effort = options.reasoningEffort ?? route?.reasoningEffort;
        const profiles = new Map(snapshot.profiles), profile = profiles.get(options.provider);
        if (!profile) return streamWithSnapshot(options, snapshot);
        profiles.set(options.provider, { ...profile, headers: { ...profile.headers, 'X-Multi-Router-Reasoning': effort ?? 'default', 'X-Multi-Router-Call': call.callId, ...(call.session ? { 'X-Multi-Router-Session': call.session } : {}) } });
        return streamWithSnapshot({ ...options, ...(effort ? { reasoningEffort: effort } : {}) }, { ...snapshot, profiles });
      };
      const withDefault = model => {
        const effort = router.config.routes[(isRouter ? '' : `${provider}::`) + model.id]?.reasoningEffort;
        return effort && model.reasoning ? { ...model, reasoning: { ...model.reasoning, defaultEffort: effort } } : model;
      };
      const resolveModel = wrapper.adapter.resolveModel.bind(wrapper.adapter), prepareCall = wrapper.adapter.prepareCall.bind(wrapper.adapter);
      wrapper.adapter.resolveModel = async (...args) => withDefault(await resolveModel(...args));
      wrapper.adapter.prepareCall = async (...args) => { const prepared = await prepareCall(...args); return { ...prepared, model: withDefault(prepared.model) }; };
      wrapper.adapter.providerRetryPolicy = () => resolveRetryPolicy({ mode: 'normal', maxRetries: 0 }, provider);
      wrappers.push(wrapper);
      releases.push(ctx.llm.registerAdapter([provider], wrapper.adapter));
    }
    stopWatch = manager.watch(() => ctx.logger.warn('multi-router: invalid config change; keeping last valid configuration'));
    await manager.api.reconcile();
    // Desktop helpers, network probes and inventory scans must not block the
    // settings endpoint or activation. Cached routes are usable immediately.
    startup = (async () => {
      await manager.syncLocalAccounts().catch(() => ctx.logger.warn('multi-router: local login discovery failed; manual import remains available'));
      if (disposed) return;
      await manager.finishInitialSetup().catch(() => ctx.logger.warn('multi-router: first-install guidance could not be saved'));
      if (disposed) return;
      manager.startup = { phase: 'ready' };
      manager.checkins.tick();
      void manager.checkFreeModels().catch(() => ctx.logger.warn('multi-router: free catalog persistence failed'));
      void manager.monitorAll().catch(() => ctx.logger.warn('multi-router: usage persistence failed'));
    })();
    void manager.plugins.tick().catch(() => ctx.logger.warn('multi-router: automatic update check unavailable'));
    manager.runtime.start();
    ctx.on('plugin-manager/changed', () => manager.runtime.schedule());
    monitorTimer = setInterval(() => { void manager.syncLocalAccounts().then(() => { if (!disposed) return manager.monitorAll(); }).catch(() => ctx.logger.warn('multi-router: local login discovery or usage persistence failed'));
      manager.checkins.tick();
      void manager.plugins.tick().catch(() => ctx.logger.warn('multi-router: automatic update check unavailable'));
      void manager.checkFreeModels().catch(() => ctx.logger.warn('multi-router: free catalog persistence failed'));
      void manager.runtime.check().catch(() => {}); }, 60000);
    monitorTimer.unref();
    ctx.emit('llm/adapters-updated');
  } catch (error) {
    clearInterval(monitorTimer); stopWatch?.(); manager?.runtime?.stop(); for (const release of releases) release();
    await Promise.all([manager?.api.close(), ...shims.map(shim => shim.close())]);
    ctx.logger.error('multi-router: initialization failed', error.code ?? error.message);
    throw error;
  }
}
