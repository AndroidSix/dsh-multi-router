/**
 * The two Qoder products this one plugin serves.
 *
 * Both are the same upstream in different regions, and they differ by route
 * (endpoints per `src/qoder/transport/endpoints.ts`), file identity, and display
 * identity. Everything that varies between them is collected here as one
 * descriptor, so no module has to carry its own `if (international)` branch and
 * a third variant would be a data change rather than a refactor.
 *
 * Each variant holds its own Personal Access Token: a token minted on
 * qoder.com does not work against the China deployment and vice versa, and the
 * two files, routes, and catalogs never cross.
 *
 * This module is host-side (it names files and routes). The browser half takes
 * the same ids and routes from the Node-free `status-paths.ts`, which stays the
 * single source shared by both halves.
 *
 * @module dsh-qoder-connect/variants
 */

import {
  QODER_AUTH_PATH,
  QODER_GLOBAL_AUTH_PATH,
  QODER_GLOBAL_PROBE_PATH,
  QODER_GLOBAL_STATUS_PATH,
  QODER_PROBE_PATH,
  QODER_STATUS_PATH,
} from './status-paths.ts'
import type { QoderVariantId } from './status-paths.ts'
import type { QoderRegion } from './qoder/region.ts'

export type { QoderVariantId }

/** One Qoder product variant. */
export interface QoderVariant {
  /** Provider id registered with DSH, e.g. `qoder-global`. */
  id: QoderVariantId
  /** Model-group heading and card title stem, e.g. `Qoder Global`. */
  displayName: string
  /** Product name as users know it, for diagnostics and error copy. */
  appName: string
  /** Which upstream region this variant's transport talks to. */
  region: QoderRegion
  /** Basename of the plugin-owned credential file under the data dir. */
  ownFilename: string
  /** Basename of the plugin-owned probe-record file under the data dir. */
  probeFilename: string
  /**
   * Basename of the plugin-owned saved-catalog file under the data dir.
   *
   * One per variant, like the probe records: the two deployments disagree about
   * rates, windows, and even which models exist for a shared id, so a catalog
   * saved from one must never be served as the other's.
   */
  catalogFilename: string
  /** Same-origin status route consumed by this variant's card. */
  statusPath: string
  /** Same-origin probe-control route consumed by this variant's card. */
  probePath: string
  /** Same-origin PAT route consumed by this variant's card. */
  authPath: string
}

/** China Qoder first: the no-suffix arm keeps the plugin's primary routes. */
export const QODER_VARIANTS: readonly QoderVariant[] = [
  {
    id: 'qoder',
    displayName: 'Qoder',
    appName: 'Qoder',
    region: 'china',
    ownFilename: '.qoder-auth.json',
    probeFilename: '.qoder-probe.json',
    catalogFilename: '.qoder-catalog.json',
    statusPath: QODER_STATUS_PATH,
    probePath: QODER_PROBE_PATH,
    authPath: QODER_AUTH_PATH,
  },
  {
    id: 'qoder-global',
    displayName: 'Qoder Global',
    appName: 'Qoder Global',
    region: 'global',
    ownFilename: '.qoder-global-auth.json',
    probeFilename: '.qoder-global-probe.json',
    catalogFilename: '.qoder-global-catalog.json',
    statusPath: QODER_GLOBAL_STATUS_PATH,
    probePath: QODER_GLOBAL_PROBE_PATH,
    authPath: QODER_GLOBAL_AUTH_PATH,
  },
]

/** The China variant; the plugin's default and compatibility anchor. */
export const CHINA_VARIANT: QoderVariant = QODER_VARIANTS[0]!

/** The international variant. */
export const GLOBAL_VARIANT: QoderVariant = QODER_VARIANTS[1]!

/** Look up a variant by provider id. */
export function variantFor(id: string): QoderVariant | undefined {
  return QODER_VARIANTS.find(variant => variant.id === id)
}
