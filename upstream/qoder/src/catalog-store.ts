/**
 * The last catalog that actually loaded, kept per variant and per account.
 *
 * Both the plan (§4 "降级顺序为同账号的最近成功目录 → 本版内置保守目录")
 * and the README promise this fallback, and without it a restart always drops
 * the user to the built-in roster even when a good catalog was fetched minutes
 * earlier. The built-in roster is a snapshot taken once; a fetched catalog is
 * what the upstream actually serves to this account.
 *
 * What it deliberately is *not*:
 *
 * - not a cache with a freshness policy — it never prevents a fetch, it only
 *   answers when a fetch cannot;
 * - not shared across accounts (a different account can see a different roster),
 *   nor across variants (the two regions serve overlapping ids with different
 *   capacity and rate answers);
 * - not a place for secrets: model metadata only, never a token. The account
 *   key is a one-way hash of the credential, not the credential itself.
 *
 * @module dsh-qoder-connect/catalog-store
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { qoderStateDir } from './paths.ts'
import type { QoderModelInfo } from './catalog.ts'

/** On-disk format this reader accepts; other versions are discarded. */
const CATALOG_FORMAT_VERSION = 1

/** One saved catalog: the account it belonged to, and the models it listed. */
interface SavedCatalog {
  /** The credential-identity key the catalog was fetched for. */
  account: string
  /** Which answer served, so one region's roster is never used as the other's. */
  source: string
  /** When the fetch succeeded, epoch milliseconds. */
  fetchedAtMs: number
  models: readonly QoderModelInfo[]
}

interface CatalogDocument {
  version: typeof CATALOG_FORMAT_VERSION
  entries: Record<string, SavedCatalog>
}

/** Plugin-owned saved-catalog path inside the plugin's state directory. */
export function qoderCatalogPath(filename: string): string {
  return join(qoderStateDir(), filename)
}

/** Whether a parsed value is a model row worth keeping. */
function isModel(value: unknown): value is QoderModelInfo {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const row = value as Record<string, unknown>
  return typeof row['id'] === 'string' && row['id'] !== ''
    && typeof row['name'] === 'string'
    && typeof row['contextWindow'] === 'number' && Number.isFinite(row['contextWindow'])
    && typeof row['maxTokens'] === 'number' && Number.isFinite(row['maxTokens'])
    && typeof row['supportsImages'] === 'boolean'
}

/** Whether a parsed value is a saved catalog this reader can trust. */
function isSaved(value: unknown): value is SavedCatalog {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const entry = value as Record<string, unknown>
  if (typeof entry['account'] !== 'string' || entry['account'] === '') return false
  if (typeof entry['source'] !== 'string' || entry['source'] === '') return false
  if (typeof entry['fetchedAtMs'] !== 'number' || !Number.isFinite(entry['fetchedAtMs'])) return false
  const models = entry['models']
  if (!Array.isArray(models) || models.length === 0) return false
  return models.every(isModel)
}

/** Options for {@link QoderCatalogStore}. */
export interface QoderCatalogStoreOptions {
  /** Explicit state-file path, overriding the `$DSH_HOME` default. */
  path?: string
}

/**
 * The last successful catalog per account, read once and written atomically.
 *
 * Malformed content reads as "nothing saved" rather than throwing: this file
 * is an optimization for the offline and first-seconds cases, and a corrupt one
 * must never be able to stop the plugin from serving models.
 */
export class QoderCatalogStore {
  private readonly path: string
  private entries: Record<string, SavedCatalog> | undefined

  constructor(options: QoderCatalogStoreOptions | string = {}) {
    this.path = typeof options === 'string'
      ? options
      : options.path ?? qoderCatalogPath('.qoder-catalog.json')
  }

  /** Resolved state-file path, for the CLI and tests. */
  filePath(): string {
    return this.path
  }

  private load(): Record<string, SavedCatalog> {
    if (this.entries !== undefined) return this.entries
    const entries: Record<string, SavedCatalog> = {}
    if (existsSync(this.path)) {
      try {
        const parsed: unknown = JSON.parse(readFileSync(this.path, 'utf8'))
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          const document = parsed as Record<string, unknown>
          const raw = document['version'] === CATALOG_FORMAT_VERSION ? document['entries'] : undefined
          if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
            for (const [key, value] of Object.entries(raw)) {
              if (isSaved(value)) entries[key] = value
            }
          }
        }
      } catch {
        // Corrupt or unreadable: treated as nothing saved.
      }
    }
    this.entries = entries
    return entries
  }

  /** The saved catalog for one account, or `undefined` when there is none. */
  get(account: string): SavedCatalog | undefined {
    const entry = this.load()[account]
    return entry === undefined ? undefined : entry
  }

  /**
   * Remember a catalog for an account, replacing whatever was saved before.
   *
   * A failed write is swallowed: the plugin has already served these models,
   * and losing the *memory* of them is not worth surfacing.
   */
  set(account: string, catalog: Omit<SavedCatalog, 'account'>): void {
    const entries = this.load()
    entries[account] = { account, ...catalog }
    this.persist()
  }

  /** Forget one account's catalog — used when that account signs out. */
  delete(account: string): void {
    const entries = this.load()
    if (!(account in entries)) return
    delete entries[account]
    this.persist()
  }

  private persist(): void {
    const directory = dirname(this.path)
    try {
      if (!existsSync(directory)) mkdirSync(directory, { recursive: true })
      const document: CatalogDocument = { version: CATALOG_FORMAT_VERSION, entries: this.load() }
      const temporary = resolve(`${this.path}.tmp`)
      writeFileSync(temporary, `${JSON.stringify(document, null, 2)}\n`, { mode: 0o600 })
      renameSync(temporary, this.path)
    } catch {
      // See set(): the served catalog does not depend on this write.
    }
  }
}
