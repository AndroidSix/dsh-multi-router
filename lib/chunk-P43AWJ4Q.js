import {
  hostIsLoopback,
  originIsLoopback
} from "./chunk-DNQPZMPF.js";
import {
  RouteError
} from "./chunk-J3XO7RTF.js";
import {
  REASONING_EFFORTS
} from "./chunk-MCHV2R25.js";

// src/shim.mjs
import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
function createShim(router, { modelPrefix = "" } = {}) {
  let active = 0;
  const secret = randomBytes(32).toString("base64url");
  const server = createServer((req, res) => {
    void handle(req, res);
  });
  const ready = new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  server.listen(0, "127.0.0.1");
  const json = (res, status, value) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(value));
  };
  async function handle(req, res) {
    active++;
    const controller = new AbortController();
    req.on("aborted", () => controller.abort());
    res.on("close", () => {
      if (!res.writableEnded) controller.abort();
    });
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(router.config.requestTimeoutMs)]);
    try {
      if (!hostIsLoopback(req.headers.host) || !originIsLoopback(req.headers.origin)) throw new RouteError(403, "loopback_required");
      const bearer = Buffer.from((req.headers.authorization ?? "").replace(/^Bearer\s+/i, ""));
      const expected = Buffer.from(secret);
      if (bearer.length !== expected.length || !timingSafeEqual(bearer, expected)) throw new RouteError(401, "unauthorized");
      if (req.method === "GET" && req.url === "/router/status") {
        json(res, 200, router.status());
        return;
      }
      if (req.method === "GET" && req.url === "/v1/models") {
        json(res, 200, { object: "list", data: Object.keys(router.config.routes).filter((id) => modelPrefix ? id.startsWith(modelPrefix) : !id.includes("::")).map((id) => ({ id: modelPrefix ? id.slice(modelPrefix.length) : id, object: "model", created: 0, owned_by: "multi-router" })) });
        return;
      }
      if (req.method !== "POST" || req.url !== "/v1/chat/completions") throw new RouteError(404, "not_found");
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] ?? "")) throw new RouteError(415, "json_required");
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 32 * 1024 * 1024) throw new RouteError(413, "request_too_large");
        chunks.push(chunk);
        signal.throwIfAborted();
      }
      let input;
      try {
        input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        throw new RouteError(400, "invalid_json");
      }
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new RouteError(400, "invalid_request");
      const effort = req.headers["x-multi-router-reasoning"];
      if (effort !== void 0) {
        if (effort !== "default" && !REASONING_EFFORTS.includes(effort)) throw new RouteError(400, "invalid_reasoning_effort");
        input.reasoning_effort = effort === "default" ? null : effort;
      }
      const selected = await router.chat({ ...input, model: modelPrefix + input.model }, signal, { callId: typeof req.headers["x-multi-router-call"] === "string" ? req.headers["x-multi-router-call"] : void 0, session: typeof req.headers["x-multi-router-session"] === "string" ? req.headers["x-multi-router-session"] : void 0 });
      signal.throwIfAborted();
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
        "X-Router-Account": selected.account,
        "X-Router-Provider": selected.provider
      });
      await pipeline(Readable.fromWeb(selected.response.body), res, { signal });
    } catch (error) {
      if (res.destroyed) return;
      if (res.headersSent) {
        res.destroy();
        return;
      }
      const status = error instanceof RouteError ? error.status : signal.aborted ? 504 : 500;
      json(res, status, { error: {
        type: error instanceof RouteError ? error.code : signal.aborted ? "request_timeout" : "internal_error",
        message: error instanceof RouteError ? error.message : "Router request failed",
        hint: error instanceof RouteError ? error.hint : void 0,
        attempts: error instanceof RouteError ? error.attempts : []
      } });
    } finally {
      active--;
    }
  }
  return {
    ready,
    active: () => active,
    token: () => secret,
    baseUrl: () => `http://127.0.0.1:${server.address().port}`,
    // Stop accepting new work, let an already streaming response finish. A
    // reload can race a call that began immediately after the idle check.
    close: async () => {
      await ready.catch(() => {
      });
      await new Promise((resolve) => server.close(resolve));
    }
  };
}

export {
  createShim
};
//# sourceMappingURL=chunk-P43AWJ4Q.js.map
