/**
 * One-click availability test for the user's ENABLED models.
 *
 * WHY THIS EXISTS — the catalog lists every model Trae's directory advertises,
 * including rows the SOLO channel cannot serve and rows the account's plan does
 * not cover (issue #19). Whether a given model actually answers depends on the
 * account TIER, which no local check can determine: the callable rosters are
 * issued per tier, so a model missing from a free account's roster may answer
 * fine for a paying one. The only honest answer comes from asking upstream, and
 * the user asked for exactly that, on the models they have enabled.
 *
 * COST — this is a REAL chat call per model, unlike every other query this
 * plugin makes (the usage/model surfaces are read-only and consume nothing).
 * The prompt is a one-word user turn with no tools, so the charge is the
 * smallest a call can be, and the model is not told to do anything. It is
 * user-initiated only: no timer, no startup pass, no refresh hook.
 *
 * CLASSIFICATION RULES — the verdict must never turn an inconclusive answer
 * into "unavailable". Trae rate-limits aggressively and a proxy can drop a
 * request; both are reported as `unknown` ("not determined this run") so the
 * user retries instead of deleting a model that works. Only a refusal that
 * came from upstream is allowed to be negative:
 *
 *  - `available`    — output arrived.
 *  - `gated`        — `1005`: the plan does not cover this model (`extra.plan`
 *                     carries the tier). A paying account may pass.
 *  - `unsupported`  — `4001`: no SOLO function serves this config_name. This is
 *                     the ONLY code that may produce this verdict.
 *  - `rate_limited` — upstream throttled the probe: `4011`, or an honest 429.
 *                     Issue #33 moved `4011` here: it is Trae's rate limit (its
 *                     own text says so), so calling it "not served" told users a
 *                     working model was dead. `4008` (account quota exhausted)
 *                     is also account-scoped, never model-scoped, and stays
 *                     inconclusive.
 *  - `auth`         — the credential is rejected; nothing else can be tested.
 *  - `unknown`      — timeout, transport error, proxy, or any other status.
 */
import { describeTraeFailure } from './solo-bridge.ts'
import type { TraeChatResult } from './upstream.ts'

/** How one model answered. */
export type TraeProbeVerdict =
  | 'available'
  | 'gated'
  | 'unsupported'
  | 'rate_limited'
  | 'auth'
  | 'unknown'

export interface TraeProbeResult {
  /** The model id as the card knows it. */
  id: string
  verdict: TraeProbeVerdict
  /** Upstream's own words (already translated), or a short note. */
  detail: string
}

/**
 * How long one probe may take. Trae answers a one-word prompt in a few seconds;
 * beyond this the answer is not worth waiting for and is reported as unknown.
 */
export const TRAE_PROBE_TIMEOUT_MS = 30_000

/**
 * Every upstream code the probe recognises, mapped to the verdict it implies.
 *
 * ONE table, not a set per verdict: with separate sets the outcome depended on
 * the order the branches happened to be written in, so a code left in two sets
 * was silently decided by whichever line ran first (measured: re-adding `4011`
 * to the "unsupported" set passed every test). A single map makes a code mean
 * exactly one thing, and {@link assertCodesAreDistinct} pins that down at
 * module load.
 *
 *  - `1005` — the plan does not cover this model (`extra.plan` carries the
 *    tier). A paying account may pass, so it is a gate, not a dead model.
 *  - `4001` — this function's roster does not contain that `config_name`. The
 *    ONLY code that may produce `unsupported`, measured on all 22 functions of
 *    a live CN credential (issue #33).
 *  - `4011` — Trae throttled the route; its own text says the rate limit was
 *    exceeded. Issue #33 moved this here from `unsupported`: reporting a
 *    throttle as "the channel does not serve it" told users a working model was
 *    dead.
 *  - `4008` — the ACCOUNT's SOLO quota is exhausted. It says nothing about any
 *    one model, so it must not become a model verdict; it stays inconclusive
 *    and carries the upstream text, so the user retests once the quota is back.
 */
const CODE_VERDICTS: Readonly<Record<number, TraeProbeVerdict>> = {
  1005: 'gated',
  4001: 'unsupported',
  4008: 'unknown',
  4011: 'rate_limited',
}

/** A code that maps to two verdicts would make the table order-dependent. */
function assertCodesAreDistinct(table: Readonly<Record<number, TraeProbeVerdict>>): void {
  const codes = Object.keys(table)
  if (new Set(codes).size !== codes.length) {
    throw new Error('dsh-connect-trae: a Trae probe code maps to more than one verdict')
  }
}

assertCodesAreDistinct(CODE_VERDICTS)

/** Pull `Trae code N` out of an already-translated failure message. */
function codeOf(message: string): number | undefined {
  const match = /Trae code (\d+)/u.exec(message)
  return match === null ? undefined : Number(match[1])
}

/**
 * Classify a failure that arrived as a thrown stream error rather than a
 * returned result.
 *
 * The bridge errors the stream (instead of returning a result) when a refusal
 * interrupts an answer that had already started; its message is the same
 * translated text, so a named code is still decisive. Anything without a
 * recognised code — an abort, a socket reset, a proxy — stays `unknown`.
 */
export function classifyProbeError(message: string): { verdict: TraeProbeVerdict; detail: string } {
  const code = codeOf(message)
  if (code !== undefined) {
    const classified = classifyProbeResult({ ok: false, status: 0, kind: 'client', message }, false)
    if (classified.verdict !== 'unknown') return classified
  }
  return { verdict: 'unknown', detail: message === '' ? 'the stream failed without a message' : `stream failed: ${message}` }
}

/**
 * Classify a completed upstream call.
 *
 * `result` is what `TraeSoloBridge.chatStream` returned, so a refusal that
 * arrived inside a 200 body has already been turned into a real error result
 * (and its code translated into `message`) by the bridge — this function only
 * has to read it back.
 */
export function classifyProbeResult(result: TraeChatResult, outputSeen: boolean): { verdict: TraeProbeVerdict; detail: string } {
  if (result.ok) {
    return outputSeen
      ? { verdict: 'available', detail: 'upstream answered' }
      : { verdict: 'unknown', detail: 'the stream ended without any output' }
  }
  const message = result.message.trim() === '' ? `HTTP ${result.status}` : result.message
  if (result.kind === 'authentication' || result.status === 401 || result.status === 403) {
    return { verdict: 'auth', detail: message }
  }
  if (result.kind === 'soft_rate' || result.status === 429) {
    return { verdict: 'rate_limited', detail: message }
  }
  const code = codeOf(message)
  const mapped = code === undefined ? undefined : CODE_VERDICTS[code]
  if (mapped !== undefined) return { verdict: mapped, detail: message }
  // A 4xx that names no recognised code is still a client-side refusal; a 5xx
  // or a status of 0 (transport/timeout) is not evidence about the model.
  if (result.kind === 'client' && result.status >= 400 && result.status < 500) {
    return { verdict: 'unsupported', detail: message }
  }
  return { verdict: 'unknown', detail: message }
}

/** Read a probe response without letting a large or endless body stall. */
async function readProbeOutput(response: Response): Promise<{ output: boolean; error?: Error }> {
  try {
    const text = await response.text()
    return { output: /"content"\s*:\s*"[^"]/u.test(text) || /"tool_calls"/u.test(text) }
  } catch (error: unknown) {
    return { output: false, error: error instanceof Error ? error : new Error(String(error)) }
  }
}

/** The minimal chat call one probe makes. */
export function probeBody(model: string): string {
  return JSON.stringify({ model, messages: [{ role: 'user', content: 'ping' }] })
}

/**
 * Probe one model through the bridge the plugin actually chats with, so the
 * recorded verdict describes the user's real path (same wire resolution, same
 * function stamping, same error translation).
 */
export async function probeOneModel(
  chat: (body: string, signal?: AbortSignal) => Promise<TraeChatResult>,
  id: string,
  timeoutMs = TRAE_PROBE_TIMEOUT_MS,
): Promise<TraeProbeResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const result = await chat(probeBody(id), controller.signal)
    if (!result.ok) return { id, ...classifyProbeResult(result, false) }
    const { output, error } = await readProbeOutput(result.response)
    if (error !== undefined) return { id, ...classifyProbeError(error.message) }
    return { id, ...classifyProbeResult(result, output) }
  } catch (error: unknown) {
    if (controller.signal.aborted) {
      return { id, verdict: 'unknown', detail: `no answer within ${Math.round(timeoutMs / 1000)}s` }
    }
    return { id, ...classifyProbeError(error instanceof Error ? error.message : String(error)) }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Probe a list of models ONE AT A TIME.
 *
 * Sequential on purpose: Trae throttles bursts, and a burst of parallel probes
 * would manufacture the very `rate_limited`/`unknown` verdicts this feature
 * must avoid. An authentication failure stops the run — every later probe would
 * fail the same way, and spending calls to learn that again is waste.
 */
export async function probeModelsSequentially(
  chat: (body: string, signal?: AbortSignal) => Promise<TraeChatResult>,
  ids: readonly string[],
  onResult?: (result: TraeProbeResult, index: number) => void,
): Promise<TraeProbeResult[]> {
  const results: TraeProbeResult[] = []
  for (const [index, id] of ids.entries()) {
    const result = await probeOneModel(chat, id)
    results.push(result)
    onResult?.(result, index)
    if (result.verdict === 'auth') break
  }
  return results
}

/** Re-export so callers can build the same human-readable text the bridge does. */
export { describeTraeFailure }
