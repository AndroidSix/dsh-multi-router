/**
 * Qoder credential storage — one Personal Access Token per variant.
 *
 * Every credential the plugin holds is a PAT the human pasted into the
 * variant's card (or exported into the environment, or saved by the CLI).
 * There is no device flow, no token refresh, and no expiry: a PAT is valid
 * until the user revokes it, so this store only reads, writes, and deletes a
 * small JSON document.
 *
 * One file per variant inside the plugin's data directory
 * (`<.dsh-qoder-connect>/`). The on-disk schema is
 * `{version: 2, pat, region, savedAt}` — deliberately narrower than the
 * WorkBuddy-era document it replaces: anything this file does not name is
 * not a fact the plugin knows.
 *
 * @module dsh-qoder-connect/auth
 */

import { createHash } from 'node:crypto'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'
import { qoderPluginDataDir, QODER_DATA_DIR_ENV, QODER_DATA_DIR_NAME } from './paths.ts'
import type { QoderRegion } from './qoder/region.ts'
import type { QoderCredentialSource, QoderPatSummary } from './status-paths.ts'
import type { QoderVariant } from './variants.ts'

// Re-exported for compatibility: existing callers import these from here.
export { qoderPluginDataDir, QODER_DATA_DIR_ENV, QODER_DATA_DIR_NAME }

/** The on-disk document version this writer produces. */
const AUTH_SCHEMA_VERSION = 2

/** Environment fallback for the global arm when no file exists. */
export const QODER_PAT_ENV_GLOBAL = 'QODER_PERSONAL_ACCESS_TOKEN'

/** Environment fallback for the China arm when no file exists. */
export const QODER_PAT_ENV_CN = 'QODER_CN_PERSONAL_ACCESS_TOKEN'

/** Basename of the China variant's credential file inside the data directory. */
export const QODER_AUTH_FILENAME = '.qoder-auth.json'

/** Minimal logger surface the plugin context already provides. */
export interface AuthLogger {
  warn?(...args: unknown[]): void
}

/** Runtime credential, timestamps in epoch milliseconds. */
export interface QoderCredential {
  pat: string
  region: QoderRegion
  /** When the stored token was saved; absent for environment-sourced tokens. */
  savedAtMs?: number
  source: QoderCredentialSource
}

/** Read-only sign-in summary for status, the PAT route, and doctor output. */
export interface QoderAuthStatus {
  state: 'configured' | 'missing'
  /** Redacted summary of the token in effect, when there is one. */
  pat?: QoderPatSummary
  /** Which upstream region the token is used against. */
  region?: QoderRegion
  /** Why no credential is usable, when diagnosable (a stale legacy file). */
  reason?: string
  /** Absolute path of the credential file this store owns. */
  filePath: string
}

/** Constructor options. */
export interface QoderStoreOptions {
  variant: QoderVariant
  /** Explicit plugin-owned credential path, defaulting under the data dir. */
  ownPath?: string
  /** Logger for the legacy-file warning; optional so tests stay quiet. */
  logger?: AuthLogger
}

/** Last four characters of a token, for display. */
export function patTail(pat: string): string | undefined {
  const trimmed = pat.trim()
  return trimmed.length >= 4 ? trimmed.slice(-4) : undefined
}

/**
 * Stable identity key for a credential, used by probe records and saved
 * catalogs.
 *
 * A PAT is a bearer secret, so the key is its one-way hash rather than any
 * suffix of it: surfaces that show the key (cards, JSON diagnostics) leak
 * nothing usable, while two reads of the same token still correlate locally.
 */
export function qoderCredentialIdentity(credential: Pick<QoderCredential, 'pat'>): string {
  return `pat:${createHash('sha256').update(credential.pat).digest('hex').slice(0, 16)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRegion(value: unknown): value is QoderRegion {
  return value === 'global' || value === 'china'
}

export class QoderCredentialStore {
  private readonly variant: QoderVariant
  private readonly ownPath: string
  private readonly logger: AuthLogger | undefined
  /** The legacy-file warning is emitted once per process, not per read. */
  private legacyWarned = false

  constructor(options: QoderStoreOptions) {
    this.variant = options.variant
    this.ownPath = options.ownPath ?? join(qoderPluginDataDir(), options.variant.ownFilename)
    this.logger = options.logger
  }

  /** Absolute path of this variant's credential file, for display and tests. */
  ownAuthPath(): string {
    return this.ownPath
  }

  /**
   * The credential currently in effect, or `undefined` when there is none.
   *
   * Resolution order: the plugin-owned file, then the arm's environment
   * variable (only when no file exists — a saved token always wins over a
   * stray env), then nothing. There is no refresh and no expiry check: a PAT
   * lives until revoked.
   */
  async current(): Promise<QoderCredential | undefined> {
    const stored = await this.readOwn()
    if (stored !== undefined) return stored
    return this.fromEnvironment()
  }

  /**
   * The credential, or a thrown `MISSING_CREDENTIAL` error.
   *
   * Callers that serve requests (the shim, the catalog sweep) use this so the
   * absence of a token surfaces as the same classified failure the transport
   * itself raises when a saved token turns out empty.
   */
  async resolve(): Promise<QoderCredential> {
    const credential = await this.current()
    if (credential === undefined || credential.pat.trim() === '') {
      throw new Error('qoder: MISSING_CREDENTIAL — no Personal Access Token is configured. Add one in the Qoder settings card.')
    }
    return credential
  }

  /** The token in effect as a bare string, rejecting when there is none. */
  async patPromise(): Promise<string> {
    return (await this.resolve()).pat
  }

  /**
   * Persist a token for this variant. The caller is responsible for having
   * validated it against the region first (`validateApiKey` upstream).
   */
  async save(pat: string, source: QoderCredentialSource = 'card'): Promise<QoderCredential> {
    const trimmed = pat.trim()
    if (trimmed === '') throw new Error('qoder: cannot save an empty Personal Access Token')
    const credential: QoderCredential = {
      pat: trimmed,
      region: this.variant.region,
      savedAtMs: Date.now(),
      source,
    }
    await this.writeOwn(credential)
    return credential
  }

  /** Remove the stored credential. A missing file is not an error. */
  async clear(): Promise<void> {
    try {
      await rm(this.ownPath, { force: true })
    } catch {
      // Best effort: a file that cannot be removed will fail validation later
      // and surface through `status()` the same way.
    }
  }

  /** Alias kept for call-site readability (`logout` is just clearing). */
  async logout(): Promise<void> {
    await this.clear()
  }

  /** Redacted summary for the card, the PAT route, and doctor output. */
  async status(): Promise<QoderAuthStatus> {
    const base: { filePath: string; region?: QoderRegion } = {
      filePath: this.ownPath,
      region: this.variant.region,
    }
    const credential = await this.current()
    if (credential === undefined) {
      return {
        state: 'missing',
        ...base,
        ...this.pendingLegacyReason === undefined ? {} : { reason: this.pendingLegacyReason },
      }
    }
    const tail = patTail(credential.pat)
    return {
      state: 'configured',
      ...base,
      pat: {
        source: credential.source,
        ...credential.savedAtMs === undefined ? {} : { savedAtMs: credential.savedAtMs },
        ...tail === undefined ? {} : { patTail: tail },
      },
    }
  }

  /** Set when a read found a stale WorkBuddy-era file; consumed once. */
  private pendingLegacyReason: string | undefined

  private async fromEnvironment(): Promise<QoderCredential | undefined> {
    const name = this.variant.region === 'china' ? QODER_PAT_ENV_CN : QODER_PAT_ENV_GLOBAL
    const value = process.env[name]?.trim()
    if (value === undefined || value === '') return undefined
    return { pat: value, region: this.variant.region, source: 'env' }
  }

  private async readOwn(): Promise<QoderCredential | undefined> {
    let text: string
    try {
      text = await readFile(this.ownPath, 'utf8')
    } catch (error: unknown) {
      // An absent file means "not signed in". Any other read failure is treated
      // the same way rather than thrown: the only recovery either way is to
      // save the token again, and a status read must never break the card.
      this.pendingLegacyReason = undefined
      return undefined
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      this.pendingLegacyReason = undefined
      return undefined
    }
    if (!isRecord(parsed)) {
      this.pendingLegacyReason = undefined
      return undefined
    }
    // A WorkBuddy-era document (it carries `accessToken` and no `pat`) is not a
    // credential this plugin can use in any form. Treat it as invalid — never a
    // fake migration — and say so, so the card points at the right fix.
    if (typeof parsed['accessToken'] === 'string' && parsed['pat'] === undefined) {
      this.pendingLegacyReason = 'stale WorkBuddy credential file; save a Qoder Personal Access Token instead'
      if (!this.legacyWarned) {
        this.legacyWarned = true
        this.logger?.warn?.(
          `qoder: ${this.variant.displayName}: ${this.ownPath} holds a WorkBuddy-era credential;`
          + ' it is ignored. Save a Qoder Personal Access Token to replace it.',
        )
      }
      return undefined
    }
    this.pendingLegacyReason = undefined
    const pat = typeof parsed['pat'] === 'string' ? parsed['pat'].trim() : ''
    if (pat === '') return undefined
    const region = isRegion(parsed['region']) ? parsed['region'] : this.variant.region
    const savedAt = typeof parsed['savedAt'] === 'number' && Number.isFinite(parsed['savedAt'])
      ? parsed['savedAt']
      : undefined
    return {
      pat,
      region,
      ...savedAt === undefined ? {} : { savedAtMs: savedAt },
      // A file this store wrote came from the card or the CLI; `source` is not
      // persisted because "card vs cli" only records who typed the command, and
      // a file left by any other tool is indistinguishable from the card's.
      source: 'card',
    }
  }

  private async writeOwn(credential: QoderCredential): Promise<void> {
    const document = {
      version: AUTH_SCHEMA_VERSION,
      pat: credential.pat,
      region: credential.region,
      savedAt: credential.savedAtMs ?? Date.now(),
    }
    const directory = dirname(this.ownPath)
    try {
      await mkdir(directory, { recursive: true, mode: 0o700 })
    } catch {
      // An existing or uncreatable directory surfaces on the write below.
    }
    await writeFileAtomic(this.ownPath, `${JSON.stringify(document, null, 2)}\n`, {
      mode: 0o600,
      dirMode: 0o700,
    })
    this.pendingLegacyReason = undefined
  }
}

/**
 * The plugin-owned credential path for one variant's default filename.
 * Kept as a free function for the CLI, which builds no store per display line.
 */
export function qoderOwnAuthPath(variant: QoderVariant): string {
  return join(qoderPluginDataDir(), variant.ownFilename)
}
