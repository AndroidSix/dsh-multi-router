import test from 'node:test';
import assert from 'node:assert/strict';
import { Router, matchModel } from '../src/router.mjs';
import { validateConfig } from '../src/config.mjs';
import { preflightStream } from '../src/stream.mjs';
const model = { id: 'deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash' };
const request = { model: 'ds4.1f', stream: true, messages: [{ role: 'user', content: 'hi' }] };
const config = extra => validateConfig({ accounts: ['wb1', 'wb2', 'tr1', 'qd1'].map((id, i) => ({ id,
  provider: ['workbuddy', 'workbuddy', 'trae', 'qoder'][i], credentialFile: `/tmp/${id}.json` })), ...extra });
const sse = data => new Response(`data: ${JSON.stringify(data)}\n\ndata: [DONE]\n\n`);
const answer = () => ({ ok: true, response: sse({ choices: [{ delta: { content: 'hello' } }] }) });

test('every 4xx switches once to next account, then next provider; success remains sticky', async () => {
  for (const status of [400, 401, 402, 403, 404, 408, 409, 422, 429, 499]) {
    const calls = [];
    const router = new Router(config(), async a => ({ models: async () => [model], chat: async input => {
      calls.push(a.id); assert.equal(input.model, model.id);
      return a.id === 'tr1' ? answer() : { ok: false, status, kind: 'refused', message: 'secret-token' };
    } }));
    const selected = await router.chat(request);
    assert.equal(selected.account, 'tr1'); assert.deepEqual(calls, ['wb1', 'wb2', 'tr1']);
    assert.match(await selected.response.text(), /hello/);
    await router.chat(request); assert.deepEqual(calls, ['wb1', 'wb2', 'tr1', 'tr1']);
    assert.equal(router.status()[0].cooldowns.length, 1);
  }
});
test('exhausted pool stays finite and cools down without exposing upstream messages', async () => {
  let count = 0;
  const router = new Router(config(), async () => ({ models: async () => [model], chat: async () => {
    count++; return { ok: false, status: 429, kind: 'soft_rate', message: 'secret-token' };
  } }));
  await assert.rejects(router.chat(request), error => {
    assert.equal(error.status, 503); assert.equal(error.attempts.length, 4); assert.doesNotMatch(error.message, /secret-token/);
    assert.match(error.message, /所有候选账号本次调用均失败并已进入冷却，约 60 秒后可重试/); return true;
  });
  await assert.rejects(router.chat(request), error => {
    assert.match(error.message, /^account_pool_exhausted（全部账号都在失败冷却中，约 \d+ 秒后可重试）$/);
    assert.equal(error.hint, error.message.slice(error.message.indexOf('（') + 1, error.message.lastIndexOf('）')));
    assert.equal(error.attempts.length, 0); return true;
  });
  assert.equal(count, 4);
});
test('exhaustion hints name the cause: missing models, partial cooldown and no candidates', async () => {
  const other = { ...config(), routes: { fixed: { contextWindow: 200000, maxTokens: 1000, targets: [{ provider: 'workbuddy', model: 'gpt-5.2' }] } } };
  const missing = new Router(other, async () => ({ models: async () => [model], chat: async () => answer() }));
  await assert.rejects(missing.chat({ model: 'fixed', stream: true, messages: [{ role: 'user', content: 'hi' }] }),
    /已尝试的账号目录中都没有该模型（或所选推理档位、免费资格不满足）/);

  const mixed = new Router(config(), async a => ({ models: async () => a.id === 'wb1' ? [] : [model],
    chat: async () => ({ ok: false, status: a.id === 'wb2' ? 429 : 403, kind: a.id === 'wb2' ? 'soft_rate' : 'forbidden' }) }));
  const request = { model: 'ds4.1f', stream: true, messages: [{ role: 'user', content: 'hi' }] };
  await assert.rejects(mixed.chat(request), /部分账号仍在失败冷却中，约 \d+ 秒后可重试/);

  const off = config(); off.accounts.forEach(a => { a.enabled = false; });
  const none = new Router(off, async () => ({ models: async () => [model], chat: async () => answer() }));
  await assert.rejects(none.chat(request), /该路由没有可用的账号目标：账号可能已全部禁用，或与目标渠道不匹配/);
});
test('cooldown expires and 5xx retries are opt-in', async () => {
  let now = 100, calls = 0;
  const router = new Router(config({ cooldownMs: 10 }), async () => ({ models: async () => [model], chat: async () => {
    calls++; return { ok: false, status: 401, kind: 'authentication' };
  } }), () => {}, () => now);
  await assert.rejects(router.chat(request)); now = 111; await assert.rejects(router.chat(request)); assert.equal(calls, 8);
  for (const retryServerErrors of [false, true]) {
    let visited = 0;
    const pool = new Router(config({ retryServerErrors }), async () => ({ models: async () => [model], chat: async () => { visited++; return { ok: false, status: 502 }; } }));
    await assert.rejects(pool.chat(request)); assert.equal(visited, retryServerErrors ? 4 : 1);
  }
});
test('strict model equivalence, explicit model bindings, disabled accounts and duplicate targets', async () => {
  assert.equal(matchModel('ds4.1f', {}, [{ id: 'DeepSeek-V4-Flash-Official' }]), undefined);
  assert.equal(matchModel('ds4.1f', {}, [{ id: 'DeepSeek-V4.1-Flash-Official' }]).id, 'DeepSeek-V4.1-Flash-Official');
  const conf = config(); conf.accounts[0].enabled = false;
  conf.routes['ds4.1f'].targets.unshift({ provider: 'workbuddy', model: model.id });
  let calls = 0;
  const pool = new Router(conf, async () => ({ models: async () => [model], chat: async () => { calls++; return { ok: false, status: 403 }; } }));
  await assert.rejects(pool.chat(request)); assert.equal(calls, 3);
  await assert.rejects(pool.chat({ ...request, model: 'toString' }), error => error.status === 404);
});
test('discovery 4xx is classified; cancellation never triggers another account', async () => {
  let calls = 0;
  const pool = new Router(config(), async a => ({ models: async () => {
    calls++; if (a.id === 'wb1') throw new Error('SOLO remote models returned HTTP 403'); return [model];
  }, chat: async () => answer() }));
  assert.equal((await pool.chat(request)).account, 'wb2'); assert.equal(calls, 2);
  const controller = new AbortController();
  const cancelled = new Router(config(), async () => ({ models: async () => [model], chat: async () => {
    controller.abort(); return { ok: false, status: 499 };
  } }));
  await assert.rejects(cancelled.chat(request, controller.signal), e => e.name === 'AbortError');
  assert.equal(cancelled.cooldowns.size, 0);
});
test('preflight buffers fragmented SSE, switches on early error and never replays partial content/tools', async () => {
  const frames = ['data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n', 'data: {"error":{"status":429}}\n\n'];
  const stream = new ReadableStream({ start(c) { for (const frame of frames) for (const part of [frame.slice(0, 9), frame.slice(9)]) c.enqueue(new TextEncoder().encode(part)); c.close(); } });
  assert.equal((await preflightStream(new Response(stream))).status, 429);
  for (const delta of [{ content: 'partial' }, { reasoning_content: 'think' }, { tool_calls: [{ id: 'call1' }] }]) {
    const raw = `data: ${JSON.stringify({ choices: [{ delta }] })}\n\ndata: {"error":{"status":429}}\n\n`;
    const accepted = await preflightStream(new Response(raw));
    assert.equal(accepted.ok, true); assert.equal(await accepted.response.text(), raw);
  }
});
test('config rejects wrong targets, ambiguous aliases and invalid account paths', () => {
  assert.throws(() => config({ accounts: [{ id: '../escape', provider: 'qoder', credentialFile: '/tmp/x' }] }));
  assert.throws(() => config({ routes: { anything: { contextWindow: 2000, maxTokens: 100, targets: [{ provider: 'qoder' }] } } }));
  assert.throws(() => config({ routes: { 'ds4.1f': { contextWindow: 2000, maxTokens: 100, targets: [{ provider: 'qoder', account: 'wb1' }] } } }));
});
