/**
 * The international region's "what plan is this account on" text.
 *
 * WHY THIS IS ITS OWN MODULE: three surfaces now answer that one question — the
 * card's subscription box, the card's per-account rows, and the composer
 * readout. Each previously carried its own copy of the verdict, which is how the
 * card's box and its roster row were able to disagree about one account's tier
 * (the box read the usage document's top-level `payStatus`, which the ai document
 * does not always carry, while the row read the per-account state). A second
 * implementation of the same rule is free to drift; there is now exactly one.
 *
 * @module dsh-connect-trae/client/plan-text
 */

import { traePlanIsPaid } from '../status-paths.ts'
import type { TraeWebPayStatus } from '../status-paths.ts'
import type { TraeSettingsKey } from './locales.ts'

/** A plan verdict expressed as a translation key plus its tier, if any. */
export interface TraePlanVerdict {
  /** Whether this account is on a paid plan. */
  paid: boolean
  /** The tier as the upstream spells it (`Pro`, `Free`, …), when it gave one. */
  tier?: string
  /** The bare label to use when the upstream gave no tier string. */
  label: 'row.subscribed' | 'row.noPackage'
}

/**
 * Decide whether an international account is on a paid plan, and name the plan.
 *
 * Two independent things can entitle it: a package row (`has_package`) and a
 * plan identity (`user_pay_identity_str`). Reading only the first is what
 * rendered a Pro member as "No active package" in issue #19, so either one
 * counts. The tier string rides separately so a caller can name the plan instead
 * of only asserting a boolean.
 */
export function planVerdict(payStatus: TraeWebPayStatus): TraePlanVerdict {
  const tier = payStatus.payIdentityStr?.trim()
  const paid = payStatus.hasPackage || traePlanIsPaid(payStatus.payIdentityStr)
  return {
    paid,
    ...tier === undefined || tier === '' ? {} : { tier },
    label: paid ? 'row.subscribed' : 'row.noPackage',
  }
}

/**
 * The verdict as ONE short string, for a surface that has a single slot.
 *
 * The composer readout is that surface: it is a few characters wide in the tool
 * row, so it gets the tier name alone (`Pro`, `Free`) rather than the card's
 * two-line label-plus-tier. When the upstream named no tier the label stands in,
 * which is still strictly more than the dash the readout used to show for the
 * whole international region.
 */
export function planText(
  payStatus: TraeWebPayStatus,
  t: (key: TraeSettingsKey) => string,
): string {
  const verdict = planVerdict(payStatus)
  return verdict.tier === undefined ? t(verdict.label) : verdict.tier
}
