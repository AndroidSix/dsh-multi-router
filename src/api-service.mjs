import { createServer } from 'node:http';
import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { withFileLock } from '@deepseek-ai/dsh-atomic-write';
import { writePrivateJson, beijingDay } from './config.mjs';
import { RouteError, abortable } from './router.mjs';
import { REASONING_EFFORTS } from './reasoning.mjs';
import { hostIsLoopback } from '../upstream/workbuddy/src/loopback.ts';
import { SseDecoder } from '../upstream/trae/src/sse.ts';

const defaults = () => ({ version: 1, enabled: false, port: 8787, allowLan: false, modelIds: null, key: null });
const revision = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail = (status, code) => { throw new RouteError(status, code); };
const json = (res, status, value) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(value));
};
function validate(value) {
  if (!value || value.version !== 1 || typeof value.enabled !== 'boolean' || typeof value.allowLan !== 'boolean'
    || !Number.isInteger(value.port) || value.port < 1024 || value.port > 65535
    || value.modelIds !== null && (!Array.isArray(value.modelIds) || value.modelIds.length > 1000 || value.modelIds.some(id => typeof id !== 'string' || !/^[\w.-]{1,128}$/.test(id)))
    || value.key !== null && !/^sk-dsh-[A-Za-z0-9_-]{43}$/.test(value.key)
    || value.enabled && !value.key) throw Error('API 设置无效：端口需为 1024–65535，启用前请生成 API Key。');
  return value;
}

// The service owns only its listener and private access key. Routing, provider
// credentials, failover and metering remain with the existing Manager/Router.
export class ApiService {
  constructor(file, manager) {
    this.file = file; this.manager = manager; this.settings = defaults();
    this.phase = 'stopped'; this.controllers = new Set(); this.queue = Promise.resolve();
  }
  async load() {
    this.configError = false;
    try { this.settings = validate(JSON.parse(await readFile(this.file, 'utf8'))); }
    catch (e) { if (e.code !== 'ENOENT') { this.configError = true; this.phase = 'error'; this.error = 'API 配置无法读取，服务未启动。请重新保存设置。'; } }
  }
  choices() { return this.manager.adapterModels().filter(m => !m.freeOnly || m.dynamicFree); }
  models() { return this.choices().filter(m => this.settings.modelIds === null ? m.visible !== false : this.settings.modelIds.includes(m.id)); }
  state() {
    const { key, ...settings } = this.settings;
    const port = this.server?.address()?.port ?? settings.port;
    const events = this.manager.telemetry.data.events.filter(e => e.source === 'api' && beijingDay(e.at) === beijingDay(Date.now()));
    const addresses = settings.allowLan ? [...new Set(Object.values(networkInterfaces()).flat().filter(a => a && a.family === 'IPv4' && !a.internal).map(a => `http://${a.address}:${port}/v1`))] : [];
    return { ...settings, revision: revision(this.settings), phase: this.phase, error: this.error,
      hasKey: !!key, keyHint: key ? `sk-dsh-••••${key.slice(-4)}` : null, active: this.controllers.size,
      baseUrl: `http://127.0.0.1:${port}/v1`, lanUrls: addresses,
      choices: this.choices().map(m => ({ id: m.id, name: m.name, visible: m.visible !== false, reasoning: m.reasoning })),
      models: this.models().map(m => ({ id: m.id, name: m.name })),
      today: { calls: new Set(events.map(e => e.callId)).size, attempts: events.length, tokens: events.reduce((n, e) => n + (e.tokens ?? 0), 0) } };
  }
  action(input) {
    const task = this.queue.catch(() => {}).then(() => withFileLock(this.file, async () => {
      if (this.closed) throw Error('API 服务已关闭。');
      // Compare the on-disk revision too; two DSH instances must not overwrite a key.
      let current = this.settings;
      try { current = validate(JSON.parse(await readFile(this.file, 'utf8'))); } catch (e) { if (e.code !== 'ENOENT' && this.phase !== 'error') throw e; }
      if (input.apiRevision !== revision(current)) throw Error('API 配置已更新，请刷新面板后重试。');
      const next = structuredClone(current);
      let apiKey;
      if (input.action === 'api.key.reveal') return { apiKey: next.key };
      if (input.action === 'api.key.create') { next.key = `sk-dsh-${randomBytes(32).toString('base64url')}`; apiKey = next.key; }
      else if (input.action === 'api.key.revoke') { next.key = null; next.enabled = false; }
      else if (input.action === 'api.settings') {
        for (const k of ['enabled', 'port', 'allowLan', 'modelIds']) if (input[k] !== undefined) next[k] = input[k];
        if (next.modelIds?.some(id => !this.choices().some(m => m.id === id) && !current.modelIds?.includes(id))) throw Error('模型目录已变化，请刷新面板后重新选择。');
      } else throw Error('未知 API 操作。');
      validate(next);
      await writePrivateJson(this.file, next);
      this.configError = false;
      const restart = next.enabled !== this.settings.enabled || next.port !== this.settings.port || next.allowLan !== this.settings.allowLan;
      this.settings = next;
      if (restart || this.phase === 'error' || !this.server && next.enabled) await this.reconcile();
      return { apiKey };
    }, { waitMs: 10000 }));
    this.queue = task; return task;
  }
  async reconcile() {
    await this.stop();
    if (this.configError) { this.phase = 'error'; return; }
    this.error = undefined;
    if (this.closed || !this.settings.enabled) { this.phase = 'stopped'; return; }
    this.phase = 'starting';
    const server = createServer((req, res) => { void this.handle(req, res); });
    server.requestTimeout = 30000; server.headersTimeout = 10000; server.keepAliveTimeout = 5000;
    this.server = server;
    try {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(this.settings.port, this.settings.allowLan ? '0.0.0.0' : '127.0.0.1', resolve);
      });
      this.phase = 'running';
      server.on('error', () => { this.phase = 'error'; this.error = 'API 监听异常，请重新保存设置。'; });
    } catch (e) {
      this.server = undefined; this.phase = 'error';
      this.error = e.code === 'EADDRINUSE' ? '端口已被占用，请修改端口后保存。' : e.code === 'EACCES' ? '没有监听此端口的权限，请修改端口。' : 'API 服务启动失败，请检查端口设置。';
    }
  }
  async stop() {
    const server = this.server; this.server = undefined;
    for (const c of this.controllers) c.abort();
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    this.phase = 'stopped';
  }
  async close() { this.closed = true; await this.queue.catch(() => {}); await this.stop(); }
  async handle(req, res) {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(Math.min(this.manager.config.requestTimeoutMs, 2147483647))]);
    req.on('aborted', () => controller.abort());
    res.on('close', () => { if (!res.writableEnded) controller.abort(); });
    let selected;
    try {
      if (!this.settings.enabled || this.closed) fail(503, 'service_disabled');
      if (!this.settings.allowLan && !hostIsLoopback(req.headers.host)) fail(403, 'loopback_required');
      // No browser CORS access: an unrelated page must never drive the local service.
      if (req.headers.origin || req.headers['sec-fetch-site'] === 'cross-site') fail(403, 'browser_origin_not_allowed');
      const token = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? '')?.[1] ?? '';
      const actual = Buffer.from(token), expected = Buffer.from(this.settings.key ?? '');
      if (!expected.length || actual.length !== expected.length || !timingSafeEqual(actual, expected)) fail(401, 'invalid_api_key');
      if (req.method === 'GET' && req.url === '/v1/models') {
        json(res, 200, { object: 'list', data: this.models().map(m => ({ id: m.id, object: 'model', created: 0, owned_by: 'dsh-multi-router' })) }); return;
      }
      if (req.method !== 'POST' || req.url !== '/v1/chat/completions') fail(404, 'not_found');
      if (this.controllers.size >= 8) fail(429, 'too_many_requests');
      this.controllers.add(controller);
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? '')) fail(415, 'json_required');
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 32 * 1024 * 1024) fail(413, 'request_too_large'); signal.throwIfAborted(); chunks.push(chunk); }
      let input;
      try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail(400, 'invalid_json'); }
      if (!input || typeof input !== 'object' || Array.isArray(input) || typeof input.model !== 'string'
        || !Array.isArray(input.messages) || !input.messages.length || input.messages.some(m => !m || typeof m !== 'object' || !['system', 'developer', 'user', 'assistant', 'tool', 'function'].includes(m.role))
        || input.stream !== undefined && typeof input.stream !== 'boolean') fail(400, 'invalid_request');
      if (!this.models().some(m => m.id === input.model)) fail(404, 'model_not_exposed');
      if (input.n !== undefined && input.n !== 1) fail(400, 'only_n_1_supported');
      if (input.reasoning_effort != null && !REASONING_EFFORTS.includes(input.reasoning_effort)) fail(400, 'invalid_reasoning_effort');
      // Never accept internal account/session headers or persist caller user IDs.
      selected = await abortable(this.manager.router.chat({ ...input, stream: true }, signal, { callId: randomUUID(), source: 'api' }), signal);
      signal.throwIfAborted();
      const frames = completionFrames(selected.response, input.model, signal);
      if (input.stream === true) {
        res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' });
        await pipeline(Readable.from((async function* () {
          for await (const frame of frames) {
            if (!input.stream_options?.include_usage && !frame.choices?.length && frame.usage) continue;
            if (!input.stream_options?.include_usage) delete frame.usage;
            yield `data: ${JSON.stringify(frame)}\n\n`;
          }
          yield 'data: [DONE]\n\n';
        })()), res, { signal });
      } else json(res, 200, await collectCompletion(frames, input.model));
    } catch (e) {
      if (res.destroyed) return;
      if (res.headersSent) { res.destroy(); return; }
      const status = e instanceof RouteError ? e.status : signal.aborted ? 504 : 500;
      const code = e instanceof RouteError ? e.code : signal.aborted ? 'request_timeout' : 'internal_error';
      // RouteError.message includes account IDs; upstream exception text can contain credentials.
      json(res, status, { error: { message: code, type: status === 401 ? 'authentication_error' : status < 500 ? 'invalid_request_error' : 'server_error', code, param: null } });
    } finally {
      this.controllers.delete(controller);
      if (selected?.response.body && !selected.response.body.locked) await selected.response.body.cancel().catch(() => {});
    }
  }
}

async function* completionFrames(response, model, signal) {
  if (!response.body) fail(502, 'empty_upstream_response');
  const reader = response.body.getReader(), decoder = new TextDecoder(), sse = new SseDecoder();
  let finished = false, total = 0, frameBytes = 0;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  function parse(event) {
    if (event.data === '[DONE]') return null;
    let value;
    try { value = JSON.parse(event.data); } catch { fail(502, 'invalid_upstream_stream'); }
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.error) fail(502, 'upstream_stream_error');
    if (value.choices !== undefined && (!Array.isArray(value.choices) || value.choices.length > 32)) fail(502, 'invalid_upstream_stream');
    for (const c of value.choices ?? []) {
      if (!c || !Number.isInteger(c.index) || c.index < 0 || c.index > 31) fail(502, 'invalid_upstream_stream');
      if (c.delta?.tool_calls && (!Array.isArray(c.delta.tool_calls) || c.delta.tool_calls.some(t => !t || !Number.isInteger(t.index) || t.index < 0 || t.index > 127))) fail(502, 'invalid_upstream_stream');
    }
    if (value.choices?.some(c => c.finish_reason)) finished = true;
    return { ...value, model };
  }
  try {
    while (true) {
      signal.throwIfAborted(); const chunk = await reader.read(); signal.throwIfAborted();
      if (chunk.done) break;
      total += chunk.value.byteLength; frameBytes += chunk.value.byteLength;
      if (total > 32 * 1024 * 1024 || frameBytes > 1024 * 1024) fail(502, 'upstream_response_too_large');
      const events = sse.push(decoder.decode(chunk.value, { stream: true }));
      if (events.length) frameBytes = 0;
      for (const event of events) { const value = parse(event); if (value) yield value; }
    }
    for (const event of sse.finish()) { const value = parse(event); if (value) yield value; }
    if (!finished) fail(502, 'upstream_stream_incomplete');
  } finally { signal.removeEventListener('abort', abort); await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

async function collectCompletion(frames, model) {
  const result = { id: `chatcmpl-${randomUUID()}`, object: 'chat.completion', created: Math.floor(Date.now() / 1000), model, choices: [] };
  const choices = new Map();
  for await (const frame of frames) {
    if (frame.id) result.id = frame.id;
    if (frame.created != null) result.created = frame.created;
    if (frame.usage) result.usage = frame.usage;
    for (const part of frame.choices ?? []) {
      const index = part.index ?? 0;
      if (!choices.has(index)) choices.set(index, { index, message: { role: 'assistant', content: null }, finish_reason: null, logprobs: null });
      const choice = choices.get(index), delta = part.delta ?? {};
      for (const k of ['content', 'reasoning_content', 'reasoning', 'refusal']) if (typeof delta[k] === 'string') choice.message[k] = (choice.message[k] ?? '') + delta[k];
      if (delta.function_call) {
        choice.message.function_call ??= { name: '', arguments: '' };
        for (const k of ['name', 'arguments']) if (typeof delta.function_call[k] === 'string') choice.message.function_call[k] += delta.function_call[k];
      }
      if (delta.tool_calls) for (const tool of delta.tool_calls) {
        choice.message.tool_calls ??= [];
        const i = tool.index ?? 0;
        const value = choice.message.tool_calls[i] ??= { id: '', type: 'function', function: { name: '', arguments: '' } };
        if (tool.id) value.id += tool.id;
        if (tool.type) value.type = tool.type;
        for (const k of ['name', 'arguments']) if (typeof tool.function?.[k] === 'string') value.function[k] += tool.function[k];
      }
      if (part.finish_reason) choice.finish_reason = part.finish_reason;
    }
  }
  result.choices = [...choices.values()].sort((a, b) => a.index - b.index);
  return result;
}
