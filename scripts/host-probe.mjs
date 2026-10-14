import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
export const name = 'multi-router-install-probe';
export const inject = ['llm'];
// Diagnostic plugin for a running DSH desktop host. Install it in the desktop profile,
// then read the report from DSH_PROBE_OUTPUT (default: ~/host-probe-result.json).
export function apply(ctx) {
  const controller = new AbortController();
  ctx.effect(() => () => controller.abort());
  const profilePkg = process.env.DSH_PROFILE_PKG
    ?? join(homedir(), '.dsh', 'profiles', 'desktop', 'node_modules', 'dsh-multi-router', 'package.json');
  const outputFile = process.env.DSH_PROBE_OUTPUT ?? join(homedir(), 'host-probe-result.json');
  void (async () => {
    for(let i=0;i<80 && !ctx.llm.listProviders().some(p=>p.id==='qoder-global');i++) await new Promise(resolve=>setTimeout(resolve,250));
    const report = { host: 'running-desktop', pluginVersion: JSON.parse(await readFile(profilePkg, 'utf8')).version, providers: ctx.llm.listProviders().map(p => ({ id: p.id, name: p.name })), checks: [] };
    for (const [provider, model] of [['workbuddy', 'deepseek-v4.1-flash'], ['trae', 'deepseek-v4.1-flash'], ['qoder', 'dfmodel'], ['multi-router', 'deepseek-v4.1-flash']]) {
      const check = { provider, model, chunks: 0, contentBytes: 0, types: {}, pass: false };
      try {
        const models = await ctx.llm.listModels(provider); check.modelCount = models.length;
        check.listed = models.some(m => m.id === model);
        for await (const chunk of ctx.llm.stream({ provider, model, maxTokens: 2048, reasoningEffort: 'low',
          messages: [{ role: 'user', content: [{ type: 'text', text: 'Reply with exactly ROUTER_OK.' }] }],
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]) })) {
          check.chunks++; check.types[chunk.type]=(check.types[chunk.type]??0)+1;
          if (chunk.type === 'text-delta') check.contentBytes += chunk.text?.length ?? 0;
          if(chunk.type==='finish'){ check.finish=chunk.reason?.kind; if(['error','aborted'].includes(check.finish)) check.errorCode=chunk.reason?.failure?.code??check.finish; }
        }
        check.pass = check.listed && check.contentBytes > 0 && !check.errorCode;
      } catch (error) { check.errorCode = error.code ?? error.name; }
      report.checks.push(check);
      report.pass = report.checks.length === 4 && report.checks.every(c => c.pass);
      await writeFile(outputFile, JSON.stringify(report, null, 2), { mode: 0o600 });
    }
  })();
}
