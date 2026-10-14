// Inspect only the prelude. Once text, reasoning or a tool call exists, never replay.
export async function preflightStream(response, signal) {
  if (!response.body) return { ok: false, status: 502, kind: 'empty_stream' };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const buffered = [];
  let pending = '', size = 0;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', abort, { once: true });
  const clean = () => signal?.removeEventListener('abort', abort);
  try {
    while (true) {
      signal?.throwIfAborted();
      const { value, done } = await reader.read();
      signal?.throwIfAborted();
      if (done) { clean(); return { ok: false, status: 502, kind: 'stream_ended_before_answer' }; }
      buffered.push(value); size += value.byteLength;
      pending += decoder.decode(value, { stream: true });
      let boundary;
      while ((boundary = /\r?\n\r?\n/.exec(pending))) {
        const frame = pending.slice(0, boundary.index);
        pending = pending.slice(boundary.index + boundary[0].length);
        const data = frame.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n');
        if (!data) continue;
        let payload;
        if (data === '[DONE]') return accepted();
        try { payload = JSON.parse(data); } catch { await reader.cancel(); clean(); return { ok: false, status: 502, kind: 'invalid_sse' }; }
        if (payload.error || /^event:\s*error$/m.test(frame)) {
          const error = payload.error ?? payload;
          const status = Number(error.status ?? error.status_code ?? error.code);
          const kind = error.type ?? error.code;
          const mapped = ['soft_rate', 'RATE_LIMIT', 'rate_limit', 'rate_limit_exceeded'].includes(kind) ? 429
            : ['hard_credit', 'QUOTA', 'quota_exhausted'].includes(kind) ? 402
            : ['session_dead', 'authentication', 'AUTH', 'missing_credential'].includes(kind) ? 401 : 502;
          await reader.cancel(); clean();
          return { ok: false, status: status >= 400 && status <= 599 ? status : mapped, kind: 'early_stream_error' };
        }
        if (payload.choices?.some(choice => choice.finish_reason || choice.delta?.content || choice.delta?.reasoning_content || choice.delta?.tool_calls?.length || choice.delta?.function_call)) return accepted();
      }
      // A huge prelude is malformed; do not treat a partial JSON frame as an answer.
      if (size > 128 * 1024) { await reader.cancel(); clean(); return { ok: false, status: 502, kind: 'stream_prelude_too_large' }; }
    }
  } catch (error) { await reader.cancel().catch(() => {}); clean(); throw error; }
  function accepted() {
    let index = 0;
    const stream = new ReadableStream({
      async pull(controller) {
        try {
          signal?.throwIfAborted();
          if (index < buffered.length) { controller.enqueue(buffered[index++]); return; }
          const chunk = await reader.read();
          signal?.throwIfAborted();
          if (chunk.done) { clean(); controller.close(); } else controller.enqueue(chunk.value);
        } catch (error) { clean(); controller.error(error); await reader.cancel().catch(() => {}); }
      },
      async cancel(reason) { clean(); await reader.cancel(reason); },
    });
    return { ok: true, response: new Response(stream, { status: response.status, headers: response.headers }) };
  }
}
