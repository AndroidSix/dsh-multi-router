import z from '@deepseek-ai/schemastery';
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths';
import { resolveRetryPolicy, resolveImageAttachmentAccess } from '@deepseek-ai/dsh-llm';
import { join, resolve } from 'node:path';
import { createWorkBuddyAdapter } from '../upstream/workbuddy/src/adapter.ts';
import { ensureConfig, PROVIDERS, PROVIDER_NAMES } from './config.mjs';
import { createAccountClient } from './clients.mjs';
import { Router, abortable } from './router.mjs';
import { createShim } from './shim.mjs';
import { Manager, managementHandler, MANAGEMENT_PATH } from './manager.mjs';

export const name = 'dsh-multi-router';
export const inject = ['llm'];
export const defaultConfigFile = () => join(resolveDshHome(), 'multi-router', 'router.json');
export const Config = z.object({ configFile: z.string().description('Absolute path to multi-account router.json') });
export async function apply(ctx, options = {}) {
  let disposed = false, manager, stopWatch, monitorTimer;
  const releases = [], shims = [], wrappers = [];
  ctx.effect(() => () => {
    disposed = true; stopWatch?.(); clearInterval(monitorTimer);
    if (manager) manager.closed = true;
    for (const release of releases) release();
    return Promise.all([...shims.map(shim => shim.close()), ...(manager?.refreshes.values() ?? []), ...(manager?.monitorFlights.values() ?? []), manager?.localScan, manager?.telemetry.queue.catch(() => {})]);
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
    });
    await manager.load();
    await manager.syncLocalAccounts().catch(() => ctx.logger.warn('multi-router: local login discovery failed; manual import remains available'));
    if (disposed) return;
    void manager.checkFreeModels().catch(() => ctx.logger.warn('multi-router: free catalog persistence failed'));
    void manager.monitorAll().catch(() => ctx.logger.warn('multi-router: usage persistence failed'));
    monitorTimer = setInterval(() => { void manager.syncLocalAccounts().then(() => manager.monitorAll()).catch(() => ctx.logger.warn('multi-router: local login discovery or usage persistence failed'));
      void manager.checkFreeModels().catch(() => ctx.logger.warn('multi-router: free catalog persistence failed')); }, 60000);
    monitorTimer.unref();
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
        const route = router.config.routes[(isRouter ? '' : `${provider}::`) + options.model];
        const effort = options.reasoningEffort ?? route?.reasoningEffort;
        const profiles = new Map(snapshot.profiles), profile = profiles.get(options.provider);
        if (!profile) return streamWithSnapshot(options, snapshot);
        profiles.set(options.provider, { ...profile, headers: { ...profile.headers, 'X-Multi-Router-Reasoning': effort ?? 'default' } });
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
    ctx.inject?.(['webServer'], webCtx => {
      webCtx.effect(() => webCtx.webServer.register({ kind: 'exact', path: MANAGEMENT_PATH, handler: managementHandler(manager) }));
    });
    ctx.emit('llm/adapters-updated');
  } catch (error) {
    clearInterval(monitorTimer); stopWatch?.(); for (const release of releases) release();
    await Promise.all(shims.map(shim => shim.close()));
    ctx.logger.error('multi-router: initialization failed', error.code ?? error.message);
    throw error;
  }
}
