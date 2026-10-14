/**
 * Probe control route: the only state-changing endpoint the plugin exposes.
 *
 * Two guards, because they stop different things (see `docs/reasoning-effort-probe-plan.md`
 * §6.4 and the v0.3.1 note in AGENTS.md about their exact scope):
 *
 * 1. **Loopback Host + Origin**, shared with the status route. This drops
 *    DNS-rebinding pages, whose requests arrive addressed to the attacker's
 *    domain.
 * 2. **An in-process random key**, minted per process and handed only to the
 *    same-origin card. Loopback alone is *not* authentication — any local
 *    process can write `Host: 127.0.0.1` — so a route that spends the user's
 *    credit must prove the caller was told the key.
 *
 * The route never accepts a prompt, a model id outside the live catalog, or a
 * sentinel from the browser: a probe request is assembled entirely host-side.
 *
 * @module dsh-qoder-connect/probe-route
 */

import { randomBytes, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { hostIsLoopback, originIsLoopback } from './loopback.ts'
import { QODER_PROBE_PATH } from './status-paths.ts'
import type { QoderProbeAction } from './status-paths.ts'

/** Largest control body accepted; these payloads are a few dozen bytes. */
const MAX_BODY_BYTES = 4096

/** Constructor dependencies. */
export interface QoderProbeRouteOptions {
  /**
   * Run a probe for one model. Resolves to a short status string, never a raw
   * upstream body.
   */
  probe: (modelId: string) => Promise<{ state: string; reason?: string }>
  /** Drop every recorded observation. */
  clear: () => void
  /**
   * Re-read the credential and re-fetch the model catalog for this variant.
   *
   * It lives on this route rather than the status GET because it is a write
   * that spends a request against the upstream: the read-only status route's
   * loopback guard protects against a rebinding *page*, which is not the same
   * as authorizing an action. Requires the same in-process key as `probe`.
   */
  refresh?: () => Promise<{ state: string; reason?: string }>
  /** Persist and apply the international context-window preference. */
  setMaximumContextWindow?: (enabled: boolean) => Promise<{ state: string; reason?: string }>
  /** Enable or disable models for this variant. */
  setModelsEnabled?: (options: { models: readonly string[]; enabled: boolean }) => Promise<{ state: string; reason?: string }>
  /** Drop every recorded check-in log entry for this variant. */
  clearCheckInLogs?: () => void
  /** Trigger manual check-in for this variant. */
  checkIn?: () => Promise<{ state: string; reason?: string; amount?: number }>
  /**
   * Route path to mount. Defaults to the CN variant's path so existing callers
   * and tests keep their behaviour; the international variant passes its own.
   */
  path?: string
}

/** Mint the per-process control key. */
export function createProbeKey(): string {
  return randomBytes(24).toString('hex')
}

/**
 * Constant-time key comparison; a length mismatch is a failure, not a crash.
 */
function keyMatches(expected: string, presented: string | undefined): boolean {
  if (presented === undefined || presented.length !== expected.length) return false
  const a = Buffer.from(expected)
  const b = Buffer.from(presented)
  return a.length === b.length && timingSafeEqual(a, b)
}

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) })
  res.end(payload)
}

/** Read the request body with a hard ceiling. */
async function readBody(req: IncomingMessage): Promise<string | undefined> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string)
    total += buffer.length
    if (total > MAX_BODY_BYTES) return undefined
    chunks.push(buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/** Parse and shape-check an action; unknown fields are ignored, not trusted. */
function parseAction(text: string): QoderProbeAction | undefined {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return undefined
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined
  const wrapped = parsed as Record<string, unknown>
  const action = wrapped['action']
  if (action === 'clear') return { action: 'clear' }
  if (action === 'clear-checkin-logs') return { action: 'clear-checkin-logs' }
  if (action === 'checkin') return { action: 'checkin' }
  // No payload: the variant is already known from the route the request arrived
  // on, so the browser cannot ask this route to refresh a different provider.
  if (action === 'refresh') return { action: 'refresh' }
  if (action === 'set-maximum-context-window') {
    return typeof wrapped['enabled'] === 'boolean'
      ? { action: 'set-maximum-context-window', enabled: wrapped['enabled'] }
      : undefined
  }
  if (action === 'set-models-enabled') {
    if (typeof wrapped['enabled'] !== 'boolean') return undefined
    const rawModels = wrapped['models']
    const rawModel = wrapped['model']
    let models: string[] = []
    if (Array.isArray(rawModels)) {
      models = rawModels.filter((m): m is string => typeof m === 'string' && m.trim() !== '').map(m => m.trim())
    } else if (typeof rawModel === 'string' && rawModel.trim() !== '') {
      models = [rawModel.trim()]
    }
    if (models.length === 0) return undefined
    return { action: 'set-models-enabled', models, enabled: wrapped['enabled'] }
  }
  if (action === 'probe') {
    const model = wrapped['model']
    if (typeof model !== 'string' || model.trim() === '') return undefined
    return { action: 'probe', model: model.trim() }
  }
  return undefined
}

/**
 * The control route's handler, extracted so tests can mount it on a bare
 * server with a known key.
 */
export function qoderProbeHandler(
  deps: QoderProbeRouteOptions,
  key: string,
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  return async (req, res) => {
    if (req.method !== 'POST') {
      json(res, 405, { error: 'method not allowed' })
      return
    }
    if (!hostIsLoopback(req.headers.host) || !originIsLoopback(req.headers.origin)) {
      json(res, 403, { error: 'request-not-trusted' })
      return
    }
    if (!keyMatches(key, req.headers['x-qoder-probe-key'] as string | undefined)) {
      json(res, 403, { error: 'invalid-probe-key' })
      return
    }
    const body = await readBody(req)
    if (body === undefined) {
      json(res, 413, { error: 'body too large' })
      return
    }
    const action = parseAction(body)
    if (action === undefined) {
      json(res, 400, { error: 'invalid action' })
      return
    }
    try {
      if (action.action === 'clear-checkin-logs') {
        deps.clearCheckInLogs?.()
        json(res, 200, { state: 'cleared' })
        return
      }
      if (action.action === 'checkin') {
        if (deps.checkIn === undefined) {
          json(res, 404, { error: 'checkin-not-supported' })
          return
        }
        json(res, 200, await deps.checkIn())
        return
      }
      if (action.action === 'clear') {
        deps.clear()
        json(res, 200, { state: 'cleared' })
        return
      }
      if (action.action === 'refresh') {
        if (deps.refresh === undefined) {
          json(res, 404, { error: 'refresh-not-supported' })
          return
        }
        json(res, 200, await deps.refresh())
        return
      }
      if (action.action === 'set-maximum-context-window') {
        if (deps.setMaximumContextWindow === undefined) {
          json(res, 404, { error: 'context-window-setting-not-supported' })
          return
        }
        json(res, 200, await deps.setMaximumContextWindow(action.enabled === true))
        return
      }
      if (action.action === 'set-models-enabled') {
        if (deps.setModelsEnabled === undefined) {
          json(res, 404, { error: 'models-enabled-setting-not-supported' })
          return
        }
        json(res, 200, await deps.setModelsEnabled({
          models: action.models ?? (action.model ? [action.model] : []),
          enabled: action.enabled === true,
        }))
        return
      }
      json(res, 200, await deps.probe(action.model as string))
    } catch (error: unknown) {
      json(res, 500, { error: error instanceof Error ? error.message : String(error) })
    }
  }
}

/** Mount the POST probe-control route on an optional webServer context. */
export function registerQoderProbeRoute(
  ctx: Context,
  deps: QoderProbeRouteOptions,
  key: string,
): void {
  const path = deps.path ?? QODER_PROBE_PATH
  ctx.effect(() => {
    const dispose = ctx.webServer.register({
      kind: 'exact',
      path,
      handler: qoderProbeHandler(deps, key),
    })
    return () => {
      dispose()
    }
  }, 'dsh-qoder-connect: probe control route')
}
