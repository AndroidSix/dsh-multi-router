/** The only external seam for communication with Qoder. */

import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import type { AttachmentStore } from '@deepseek-ai/dsh-attachment'
import type { QoderAccountInfo } from '../account.ts'
import type { QoderCatalogModel } from '../catalog.ts'
import type { QoderRegion } from '../region.ts'
import type { QoderCheckInResult } from './checkin.ts'
import { DefaultQoderTransport, defaultStreamIdleTimeoutMs } from './default-transport.ts'
import { defaultResponseHeaderTimeoutMs } from './request.ts'
import type { QoderLogger } from './logging.ts'

export { defaultResponseHeaderTimeoutMs, defaultStreamIdleTimeoutMs }
export type { QoderCheckInResult }

export interface QoderTransport {
  stream(options: GenerateOptions, model?: QoderCatalogModel): AsyncIterable<StreamChunk>
  discoverModels(signal?: AbortSignal): Promise<readonly QoderCatalogModel[]>
  readAccount(options?: { force?: boolean | undefined; signal?: AbortSignal | undefined }): Promise<QoderAccountInfo>
  checkIn(signal?: AbortSignal): Promise<QoderCheckInResult>
}

export interface QoderTransportOptions {
  region: QoderRegion
  resolvePat: () => Promise<string>
  fetch?: typeof fetch
  logger?: QoderLogger
  streamIdleTimeoutMs?: number
  responseHeaderTimeoutMs?: number
  metadataTimeoutMs?: number
  resolveMachineId?: () => string
  attachments?: Pick<AttachmentStore, 'imageLimits' | 'readImageRequest'>
  /** Deadline for one center image publication attempt. */
  imageUploadTimeoutMs?: number
  /** Lifetime of a remembered center image URL. */
  imageUrlCacheTtlMs?: number
  /** Whether prior assistant reasoning content is preserved across turns. */
  preserveThinking?: boolean
  /**
   * Called once per successful re-auth refresh, right after a fresh job token
   * was exchanged and accepted following a 401 rejection. The plugin host
   * surfaces this as a visible "token auto-refreshed" notice on its card.
   */
  onJobTokenRefreshed?: (info: { region: QoderRegion; at: number }) => void
  /**
   * Called once per unresolved self-heal failure: the transport exchanged a
   * fresh job token, retried the chat, and the upstream rejected it anyway.
   *
   * The success notice alone left this case silent — the user saw only a bare
   * authorization failure with no sign that the plugin had already tried to
   * recover. Reported at most once per outage (reset when a later chat is
   * accepted), so a long rejection storm does not print a row per retry.
   */
  onJobTokenRefreshFailed?: (info: { region: QoderRegion; at: number; status?: number }) => void
}

export function createQoderTransport(options: QoderTransportOptions): QoderTransport {
  return new DefaultQoderTransport(options)
}
