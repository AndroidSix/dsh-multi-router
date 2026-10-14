import { readConfig } from '../src/config.mjs';
import { Router } from '../lib/router.js';
import { createAccountClient } from '../lib/clients.js';
import { homedir } from 'node:os';
import { join } from 'node:path';

// Explicit opt-in diagnostic: sends one small request per imported account.
// Reports routing metadata only; never prints credentials or upstream error bodies.
// Config path: argv[2] > DSH_MULTI_ROUTER_CONFIG > ~/.dsh/multi-router/router.json
const config = await readConfig(process.argv[2] ?? process.env.DSH_MULTI_ROUTER_CONFIG
  ?? join(homedir(), '.dsh', 'multi-router', 'router.json'));
const ids = { workbuddy: 'deepseek-v4.1-flash', trae: 'deepseek-v4.1-flash', qoder: 'dfmodel' };
await Promise.all(config.accounts.map(async account => {
  const model = ids[account.provider];
  if (!model) return;
  const isolated = { ...config, accounts: [account], routes: { probe: {
    contextWindow: 200000, maxTokens: 512, targets: [{ provider: account.provider, model }],
  } } };
  const attempts = [];
  const router = new Router(isolated, a => createAccountClient(a, isolated), e => attempts.push(e));
  try {
    const selected = await router.chat({ model: 'probe', stream: true, max_tokens: 512,
      reasoning_effort: 'low', messages: [{ role: 'user', content: 'Reply with exactly ROUTER_OK.' }] }, AbortSignal.timeout(60000));
    let text = '', events = 0, contentBytes = 0, reasoningBytes = 0, streamError = false, done = false;
    for await (const bytes of selected.response.body) {
      text += new TextDecoder().decode(bytes, { stream: true });
      const lines = text.split('\n'); text = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') { done = true; continue; }
        try {
          const event = JSON.parse(data); events++; streamError ||= !!event.error;
          for (const choice of event.choices ?? []) {
            contentBytes += (choice.delta?.content ?? '').length;
            reasoningBytes += (choice.delta?.reasoning_content ?? '').length;
          }
        } catch { /* Non-JSON keepalive. */ }
      }
    }
    console.log(JSON.stringify({ account: account.id, provider: account.provider, model, status: 200,
      events, contentBytes, reasoningBytes, done, streamError, pass: contentBytes > 0 && !streamError, attempts }));
  } catch (error) {
    console.log(JSON.stringify({ account: account.id, provider: account.provider, model,
      status: error.status ?? 0, code: error.code ?? error.name, pass: false, attempts: error.attempts ?? attempts }));
  }
}));
// Provider transports may retain heartbeat handles; all diagnostic requests have settled.
process.exit(0);
