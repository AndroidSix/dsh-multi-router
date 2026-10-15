import {
  SseDecoder
} from "./chunk-4V52V5GO.js";
import {
  hostIsLoopback
} from "./chunk-DNQPZMPF.js";
import {
  RouteError,
  abortable
} from "./chunk-ROZINFTV.js";
import {
  REASONING_EFFORTS,
  beijingDay,
  writePrivateJson
} from "./chunk-WVNY4LSL.js";

// src/api-service.mjs
import { createServer } from "node:http";
import { randomBytes, randomUUID, createHash, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { withFileLock } from "@deepseek-ai/dsh-atomic-write";
var defaults = () => ({ version: 1, enabled: false, port: 8787, allowLan: false, modelIds: null, key: null });
var revision = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
var fail = (status, code) => {
  throw new RouteError(status, code);
};
var json = (res, status, value) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(JSON.stringify(value));
};
function validate(value) {
  if (!value || value.version !== 1 || typeof value.enabled !== "boolean" || typeof value.allowLan !== "boolean" || !Number.isInteger(value.port) || value.port < 1024 || value.port > 65535 || value.modelIds !== null && (!Array.isArray(value.modelIds) || value.modelIds.length > 1e3 || value.modelIds.some((id) => typeof id !== "string" || !/^[\w.-]{1,128}$/.test(id))) || value.key !== null && !/^sk-dsh-[A-Za-z0-9_-]{43}$/.test(value.key) || value.enabled && !value.key) throw Error("API \u8BBE\u7F6E\u65E0\u6548\uFF1A\u7AEF\u53E3\u9700\u4E3A 1024\u201365535\uFF0C\u542F\u7528\u524D\u8BF7\u751F\u6210 API Key\u3002");
  return value;
}
var ApiService = class {
  constructor(file, manager) {
    this.file = file;
    this.manager = manager;
    this.settings = defaults();
    this.phase = "stopped";
    this.controllers = /* @__PURE__ */ new Set();
    this.queue = Promise.resolve();
  }
  async load() {
    this.configError = false;
    try {
      this.settings = validate(JSON.parse(await readFile(this.file, "utf8")));
    } catch (e) {
      if (e.code !== "ENOENT") {
        this.configError = true;
        this.phase = "error";
        this.error = "API \u914D\u7F6E\u65E0\u6CD5\u8BFB\u53D6\uFF0C\u670D\u52A1\u672A\u542F\u52A8\u3002\u8BF7\u91CD\u65B0\u4FDD\u5B58\u8BBE\u7F6E\u3002";
      }
    }
  }
  choices() {
    return this.manager.adapterModels().filter((m) => !m.freeOnly || m.dynamicFree);
  }
  models() {
    return this.choices().filter((m) => this.settings.modelIds === null ? m.visible !== false : this.settings.modelIds.includes(m.id));
  }
  state() {
    const { key, ...settings } = this.settings;
    const port = this.server?.address()?.port ?? settings.port;
    const events = this.manager.telemetry.data.events.filter((e) => e.source === "api" && beijingDay(e.at) === beijingDay(Date.now()));
    const addresses = settings.allowLan ? [...new Set(Object.values(networkInterfaces()).flat().filter((a) => a && a.family === "IPv4" && !a.internal).map((a) => `http://${a.address}:${port}/v1`))] : [];
    return {
      ...settings,
      revision: revision(this.settings),
      phase: this.phase,
      error: this.error,
      hasKey: !!key,
      keyHint: key ? `sk-dsh-\u2022\u2022\u2022\u2022${key.slice(-4)}` : null,
      active: this.controllers.size,
      baseUrl: `http://127.0.0.1:${port}/v1`,
      lanUrls: addresses,
      choices: this.choices().map((m) => ({ id: m.id, name: m.name, visible: m.visible !== false, reasoning: m.reasoning })),
      models: this.models().map((m) => ({ id: m.id, name: m.name })),
      today: { calls: new Set(events.map((e) => e.callId)).size, attempts: events.length, tokens: events.reduce((n, e) => n + (e.tokens ?? 0), 0) }
    };
  }
  action(input) {
    const task = this.queue.catch(() => {
    }).then(() => withFileLock(this.file, async () => {
      if (this.closed) throw Error("API \u670D\u52A1\u5DF2\u5173\u95ED\u3002");
      let current = this.settings;
      try {
        current = validate(JSON.parse(await readFile(this.file, "utf8")));
      } catch (e) {
        if (e.code !== "ENOENT" && this.phase !== "error") throw e;
      }
      if (input.apiRevision !== revision(current)) throw Error("API \u914D\u7F6E\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u5237\u65B0\u9762\u677F\u540E\u91CD\u8BD5\u3002");
      const next = structuredClone(current);
      let apiKey;
      if (input.action === "api.key.reveal") return { apiKey: next.key };
      if (input.action === "api.key.create") {
        next.key = `sk-dsh-${randomBytes(32).toString("base64url")}`;
        apiKey = next.key;
      } else if (input.action === "api.key.revoke") {
        next.key = null;
        next.enabled = false;
      } else if (input.action === "api.settings") {
        for (const k of ["enabled", "port", "allowLan", "modelIds"]) if (input[k] !== void 0) next[k] = input[k];
        if (next.modelIds?.some((id) => !this.choices().some((m) => m.id === id) && !current.modelIds?.includes(id))) throw Error("\u6A21\u578B\u76EE\u5F55\u5DF2\u53D8\u5316\uFF0C\u8BF7\u5237\u65B0\u9762\u677F\u540E\u91CD\u65B0\u9009\u62E9\u3002");
      } else throw Error("\u672A\u77E5 API \u64CD\u4F5C\u3002");
      validate(next);
      await writePrivateJson(this.file, next);
      this.configError = false;
      const restart = next.enabled !== this.settings.enabled || next.port !== this.settings.port || next.allowLan !== this.settings.allowLan;
      this.settings = next;
      if (restart || this.phase === "error" || !this.server && next.enabled) await this.reconcile();
      return { apiKey };
    }, { waitMs: 1e4 }));
    this.queue = task;
    return task;
  }
  async reconcile() {
    await this.stop();
    if (this.configError) {
      this.phase = "error";
      return;
    }
    this.error = void 0;
    if (this.closed || !this.settings.enabled) {
      this.phase = "stopped";
      return;
    }
    this.phase = "starting";
    const server = createServer((req, res) => {
      void this.handle(req, res);
    });
    server.requestTimeout = 3e4;
    server.headersTimeout = 1e4;
    server.keepAliveTimeout = 5e3;
    this.server = server;
    try {
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(this.settings.port, this.settings.allowLan ? "0.0.0.0" : "127.0.0.1", resolve);
      });
      this.phase = "running";
      server.on("error", () => {
        this.phase = "error";
        this.error = "API \u76D1\u542C\u5F02\u5E38\uFF0C\u8BF7\u91CD\u65B0\u4FDD\u5B58\u8BBE\u7F6E\u3002";
      });
    } catch (e) {
      this.server = void 0;
      this.phase = "error";
      this.error = e.code === "EADDRINUSE" ? "\u7AEF\u53E3\u5DF2\u88AB\u5360\u7528\uFF0C\u8BF7\u4FEE\u6539\u7AEF\u53E3\u540E\u4FDD\u5B58\u3002" : e.code === "EACCES" ? "\u6CA1\u6709\u76D1\u542C\u6B64\u7AEF\u53E3\u7684\u6743\u9650\uFF0C\u8BF7\u4FEE\u6539\u7AEF\u53E3\u3002" : "API \u670D\u52A1\u542F\u52A8\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7AEF\u53E3\u8BBE\u7F6E\u3002";
    }
  }
  async stop() {
    const server = this.server;
    this.server = void 0;
    for (const c of this.controllers) c.abort();
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    this.phase = "stopped";
  }
  async close() {
    this.closed = true;
    await this.queue.catch(() => {
    });
    await this.stop();
  }
  async handle(req, res) {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(Math.min(this.manager.config.requestTimeoutMs, 2147483647))]);
    req.on("aborted", () => controller.abort());
    res.on("close", () => {
      if (!res.writableEnded) controller.abort();
    });
    let selected;
    try {
      if (!this.settings.enabled || this.closed) fail(503, "service_disabled");
      if (!this.settings.allowLan && !hostIsLoopback(req.headers.host)) fail(403, "loopback_required");
      if (req.headers.origin || req.headers["sec-fetch-site"] === "cross-site") fail(403, "browser_origin_not_allowed");
      const token = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? "")?.[1] ?? "";
      const actual = Buffer.from(token), expected = Buffer.from(this.settings.key ?? "");
      if (!expected.length || actual.length !== expected.length || !timingSafeEqual(actual, expected)) fail(401, "invalid_api_key");
      if (req.method === "GET" && req.url === "/v1/models") {
        json(res, 200, { object: "list", data: this.models().map((m) => ({ id: m.id, object: "model", created: 0, owned_by: "dsh-multi-router" })) });
        return;
      }
      if (req.method !== "POST" || req.url !== "/v1/chat/completions") fail(404, "not_found");
      if (this.controllers.size >= 8) fail(429, "too_many_requests");
      this.controllers.add(controller);
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] ?? "")) fail(415, "json_required");
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 32 * 1024 * 1024) fail(413, "request_too_large");
        signal.throwIfAborted();
        chunks.push(chunk);
      }
      let input;
      try {
        input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        fail(400, "invalid_json");
      }
      if (!input || typeof input !== "object" || Array.isArray(input) || typeof input.model !== "string" || !Array.isArray(input.messages) || !input.messages.length || input.messages.some((m) => !m || typeof m !== "object" || !["system", "developer", "user", "assistant", "tool", "function"].includes(m.role)) || input.stream !== void 0 && typeof input.stream !== "boolean") fail(400, "invalid_request");
      if (!this.models().some((m) => m.id === input.model)) fail(404, "model_not_exposed");
      if (input.n !== void 0 && input.n !== 1) fail(400, "only_n_1_supported");
      if (input.reasoning_effort != null && !REASONING_EFFORTS.includes(input.reasoning_effort)) fail(400, "invalid_reasoning_effort");
      selected = await abortable(this.manager.router.chat({ ...input, stream: true }, signal, { callId: randomUUID(), source: "api" }), signal);
      signal.throwIfAborted();
      const frames = completionFrames(selected.response, input.model, signal);
      if (input.stream === true) {
        res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" });
        await pipeline(Readable.from((async function* () {
          for await (const frame of frames) {
            if (!input.stream_options?.include_usage && !frame.choices?.length && frame.usage) continue;
            if (!input.stream_options?.include_usage) delete frame.usage;
            yield `data: ${JSON.stringify(frame)}

`;
          }
          yield "data: [DONE]\n\n";
        })()), res, { signal });
      } else json(res, 200, await collectCompletion(frames, input.model));
    } catch (e) {
      if (res.destroyed) return;
      if (res.headersSent) {
        res.destroy();
        return;
      }
      const status = e instanceof RouteError ? e.status : signal.aborted ? 504 : 500;
      const code = e instanceof RouteError ? e.code : signal.aborted ? "request_timeout" : "internal_error";
      json(res, status, { error: { message: code, type: status === 401 ? "authentication_error" : status < 500 ? "invalid_request_error" : "server_error", code, param: null } });
    } finally {
      this.controllers.delete(controller);
      if (selected?.response.body && !selected.response.body.locked) await selected.response.body.cancel().catch(() => {
      });
    }
  }
};
async function* completionFrames(response, model, signal) {
  if (!response.body) fail(502, "empty_upstream_response");
  const reader = response.body.getReader(), decoder = new TextDecoder(), sse = new SseDecoder();
  let finished = false, total = 0, frameBytes = 0;
  const abort = () => {
    void reader.cancel().catch(() => {
    });
  };
  signal.addEventListener("abort", abort, { once: true });
  function parse(event) {
    if (event.data === "[DONE]") return null;
    let value;
    try {
      value = JSON.parse(event.data);
    } catch {
      fail(502, "invalid_upstream_stream");
    }
    if (!value || typeof value !== "object" || Array.isArray(value) || value.error) fail(502, "upstream_stream_error");
    if (value.choices !== void 0 && (!Array.isArray(value.choices) || value.choices.length > 32)) fail(502, "invalid_upstream_stream");
    for (const c of value.choices ?? []) {
      if (!c || !Number.isInteger(c.index) || c.index < 0 || c.index > 31) fail(502, "invalid_upstream_stream");
      if (c.delta?.tool_calls && (!Array.isArray(c.delta.tool_calls) || c.delta.tool_calls.some((t) => !t || !Number.isInteger(t.index) || t.index < 0 || t.index > 127))) fail(502, "invalid_upstream_stream");
    }
    if (value.choices?.some((c) => c.finish_reason)) finished = true;
    return { ...value, model };
  }
  try {
    while (true) {
      signal.throwIfAborted();
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      frameBytes += chunk.value.byteLength;
      if (total > 32 * 1024 * 1024 || frameBytes > 1024 * 1024) fail(502, "upstream_response_too_large");
      const events = sse.push(decoder.decode(chunk.value, { stream: true }));
      if (events.length) frameBytes = 0;
      for (const event of events) {
        const value = parse(event);
        if (value) yield value;
      }
    }
    for (const event of sse.finish()) {
      const value = parse(event);
      if (value) yield value;
    }
    if (!finished) fail(502, "upstream_stream_incomplete");
  } finally {
    signal.removeEventListener("abort", abort);
    await reader.cancel().catch(() => {
    });
    reader.releaseLock();
  }
}
async function collectCompletion(frames, model) {
  const result = { id: `chatcmpl-${randomUUID()}`, object: "chat.completion", created: Math.floor(Date.now() / 1e3), model, choices: [] };
  const choices = /* @__PURE__ */ new Map();
  for await (const frame of frames) {
    if (frame.id) result.id = frame.id;
    if (frame.created != null) result.created = frame.created;
    if (frame.usage) result.usage = frame.usage;
    for (const part of frame.choices ?? []) {
      const index = part.index ?? 0;
      if (!choices.has(index)) choices.set(index, { index, message: { role: "assistant", content: null }, finish_reason: null, logprobs: null });
      const choice = choices.get(index), delta = part.delta ?? {};
      for (const k of ["content", "reasoning_content", "reasoning", "refusal"]) if (typeof delta[k] === "string") choice.message[k] = (choice.message[k] ?? "") + delta[k];
      if (delta.function_call) {
        choice.message.function_call ??= { name: "", arguments: "" };
        for (const k of ["name", "arguments"]) if (typeof delta.function_call[k] === "string") choice.message.function_call[k] += delta.function_call[k];
      }
      if (delta.tool_calls) for (const tool of delta.tool_calls) {
        choice.message.tool_calls ??= [];
        const i = tool.index ?? 0;
        const value = choice.message.tool_calls[i] ??= { id: "", type: "function", function: { name: "", arguments: "" } };
        if (tool.id) value.id += tool.id;
        if (tool.type) value.type = tool.type;
        for (const k of ["name", "arguments"]) if (typeof tool.function?.[k] === "string") value.function[k] += tool.function[k];
      }
      if (part.finish_reason) choice.finish_reason = part.finish_reason;
    }
  }
  result.choices = [...choices.values()].sort((a, b) => a.index - b.index);
  return result;
}

export {
  ApiService
};
//# sourceMappingURL=chunk-SNEZMYNU.js.map
