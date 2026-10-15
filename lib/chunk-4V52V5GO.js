// upstream/trae/src/sse.ts
var SseDecoder = class {
  buffer = "";
  event;
  id;
  retry;
  data = [];
  push(chunk) {
    this.buffer += chunk;
    const events = [];
    while (true) {
      const match = /\r?\n/.exec(this.buffer);
      if (match === null || match.index === void 0) break;
      const line = this.buffer.slice(0, match.index);
      this.buffer = this.buffer.slice(match.index + match[0].length);
      const emitted = this.consumeLine(line);
      if (emitted !== void 0) events.push(emitted);
    }
    return events;
  }
  finish() {
    const events = [];
    if (this.buffer !== "") {
      const emitted = this.consumeLine(this.buffer);
      this.buffer = "";
      if (emitted !== void 0) events.push(emitted);
    }
    const final = this.dispatch();
    if (final !== void 0) events.push(final);
    return events;
  }
  consumeLine(line) {
    if (line === "") return this.dispatch();
    if (line.startsWith(":")) return void 0;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") this.event = value;
    else if (field === "data") this.data.push(value);
    else if (field === "id" && !value.includes("\0")) this.id = value;
    else if (field === "retry" && /^\d+$/.test(value)) this.retry = Number(value);
    return void 0;
  }
  dispatch() {
    if (this.data.length === 0) {
      this.event = void 0;
      this.retry = void 0;
      return void 0;
    }
    const result = {
      ...this.event === void 0 || this.event === "" ? {} : { event: this.event },
      data: this.data.join("\n"),
      ...this.id === void 0 ? {} : { id: this.id },
      ...this.retry === void 0 ? {} : { retry: this.retry }
    };
    this.event = void 0;
    this.retry = void 0;
    this.data = [];
    return result;
  }
};
function decodeTraeEvent(event) {
  if (event.data === "[DONE]") return { type: "done", finishReason: "stop" };
  let payload;
  try {
    payload = JSON.parse(event.data);
  } catch {
    return { type: "unknown", ...event.event === void 0 ? {} : { event: event.event }, data: event.data };
  }
  const record = typeof payload === "object" && payload !== null && !Array.isArray(payload) ? payload : {};
  if (event.event === "request_wait_in_queue") {
    return { type: "queue", ...typeof record["position"] === "number" ? { position: record["position"] } : {} };
  }
  if (event.event === "progress_notice") return { type: "progress", notice: payload };
  if (event.event === "token_usage") {
    return {
      type: "usage",
      ...typeof record["prompt_tokens"] === "number" ? { inputTokens: record["prompt_tokens"] } : {},
      ...typeof record["completion_tokens"] === "number" ? { outputTokens: record["completion_tokens"] } : {},
      ...typeof record["total_tokens"] === "number" ? { totalTokens: record["total_tokens"] } : {},
      ...typeof record["reasoning_tokens"] === "number" ? { reasoningTokens: record["reasoning_tokens"] } : {},
      ...typeof record["cache_read_input_tokens"] === "number" ? { cacheReadTokens: record["cache_read_input_tokens"] } : {},
      ...typeof record["cache_creation_input_tokens"] === "number" ? { cacheWriteTokens: record["cache_creation_input_tokens"] } : {}
    };
  }
  if (event.event === "done" || typeof record["finish_reason"] === "string" && record["response"] === void 0) {
    return { type: "done", finishReason: typeof record["finish_reason"] === "string" ? record["finish_reason"] : "stop" };
  }
  if (event.event === "output" || record["response"] !== void 0 || record["reasoning_content"] !== void 0) {
    return {
      type: "delta",
      text: typeof record["response"] === "string" ? record["response"] : "",
      ...typeof record["reasoning_content"] === "string" ? { reasoning: record["reasoning_content"] } : {},
      ...record["tool_calls"] === void 0 || record["tool_calls"] === null ? {} : { toolCalls: record["tool_calls"] }
    };
  }
  return { type: "unknown", ...event.event === void 0 ? {} : { event: event.event }, data: payload };
}

export {
  SseDecoder,
  decodeTraeEvent
};
//# sourceMappingURL=chunk-4V52V5GO.js.map
