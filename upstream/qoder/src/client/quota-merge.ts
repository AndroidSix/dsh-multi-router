/**
 * Sidebar quota merging: collapse same-named packages sharing an expiry.
 *
 * The upstream reports one entry per purchased package. A single account can
 * hold several entries of the SAME package name (repeated purchases stack), so
 * the sidebar card groups them into one bar per (packageName, packageEndTime)
 * pair instead of listing near-duplicates. This module is the whole merge —
 * a pure function over the status document's credit accounts, driven by Node
 * tests, with no React and no fetch.
 */

import type { QoderWebCreditAccount } from '../status-paths.ts'

/** One merged sidebar row: a package group and its summed figures. */
export interface QuotaGroup {
  /** Package display name, verbatim from the upstream. */
  packageName: string
  /**
   * The group's expiry, verbatim, or undefined when no member reported one.
   * Grouping treats "no expiry" as its own bucket, so a dated and an undated
   * package with the same name never merge.
   */
  packageEndTime: string | undefined
  /** Summed remaining credit across the group's members. */
  remain: number
  /** Summed total across the group's members. */
  size: number
  /** Any member is unlimited — the group renders as unlimited, not as sums. */
  unlimited: boolean
}

/**
 * Group credit accounts by (packageName, packageEndTime) and sum each group.
 *
 * A missing figure counts as 0 (the user's ruling): a package whose total the
 * upstream did not report contributes nothing to the group's `size` rather
 * than poisoning the bar into "unknown". A group whose summed `size` is still
 * 0 keeps an honest "unknown total" rendering in the card — the merge never
 * invents a denominator. `unlimited` is sticky: one unlimited member makes the
 * whole group unlimited, and its sums are not displayed as a quota.
 *
 * MERGE KEY IS THE NAME ALONE (the user's correction): same-named packages
 * whose expiries differ by seconds (stacked purchase batches) must still be
 * one overview row — keying on the expiry exploded 28 same-named packages
 * back into 28 separate bars the moment the host started reporting real
 * dates. The expiry travels on the group (earliest of the members) for the
 * sort/visibility rules; the itemised per-expiry breakdown lives in the
 * dashboard's table.
 *
 * @param accounts - the status document's per-package credit entries.
 * @returns one group per distinct package NAME, in first-seen order.
 */
export function mergeCreditAccounts(accounts: readonly QoderWebCreditAccount[]): QuotaGroup[] {
  const groups = new Map<string, QuotaGroup>()
  for (const account of accounts) {
    const key = account.packageName
    const existing = groups.get(key)
    if (existing === undefined) {
      groups.set(key, {
        packageName: account.packageName,
        packageEndTime: account.packageEndTime,
        remain: account.remain,
        size: account.size,
        unlimited: account.unlimited === true,
      })
      continue
    }
    // A member figure the upstream did not report (undefined → 0 here) drags
    // the sum down, never up: the bar may understate one obscure field, but it
    // cannot fabricate quota the upstream never granted.
    existing.remain += account.remain
    existing.size += account.size
    existing.unlimited = existing.unlimited || account.unlimited === true
    // Keep the EARLIEST expiry across the stack: the soonest deadline is the
    // operationally meaningful one for the overview row.
    if (existing.packageEndTime !== undefined && account.packageEndTime !== undefined) {
      const a = Date.parse(existing.packageEndTime)
      const b = Date.parse(account.packageEndTime)
      if (!Number.isNaN(a) && !Number.isNaN(b) && b < a) existing.packageEndTime = account.packageEndTime
    } else {
      existing.packageEndTime = existing.packageEndTime ?? account.packageEndTime
    }
  }
  return [...groups.values()]
}

/** Clamp helper shared by the card's percent math. */
export function clampPercent(remain: number, size: number): number | undefined {
  if (!(size > 0)) return undefined
  const percent = (remain / size) * 100
  if (!Number.isFinite(percent)) return undefined
  return Math.min(100, Math.max(0, percent))
}

/** Parse an upstream expiry string ("YYYY-MM-DD HH:mm:ss") into a timestamp; undefined when unparseable. */
function parseExpiry(value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

/** Whether a group is spent (remain 0) and NOT unlimited. */
function isSpent(group: QuotaGroup): boolean {
  return !group.unlimited && group.remain <= 0
}

/** Whether a spent group's expiry date has already passed (undated → false: no proof of expiry). */
function isExpired(group: QuotaGroup, now: number): boolean {
  if (!isSpent(group)) return false
  const expiry = parseExpiry(group.packageEndTime)
  return expiry !== undefined && expiry < now
}

/**
 * SIDEBAR overview rule (the user's spec, restored after it was wrongly
 * applied to the panel):
 *
 * - A group with credit LEFT (remain > 0, or unlimited) renders.
 * - A SPENT group (remain 0) renders ONLY when EVERY group is spent AND it
 *   is not expired — the account's standing quota whose emptiness is itself
 *   the news. When anything still has credit, spent rows are noise.
 * - An EXPIRED group (spent and its expiry date has passed) renders
 *   NOWHERE, whatever the rest of the account looks like.
 *
 * Applied AFTER the merge so the sums are settled before the test.
 * "Now" is injectable for tests.
 *
 * @param groups - merged groups, in first-seen order.
 * @param now - current timestamp (defaults to Date.now()).
 * @returns the groups to display, in first-seen order.
 */
export function visibleQuotaGroups(groups: readonly QuotaGroup[], now: number = Date.now()): QuotaGroup[] {
  const hasCredit = groups.some(group => group.unlimited || group.remain > 0)
  return groups.filter(group => {
    if (group.unlimited || group.remain > 0) return true
    // Spent: visible only when the WHOLE account is spent and this group has
    // not lapsed.
    return !hasCredit && !isExpired(group, now)
  })
}

/**
 * PANEL detail-table ordering (the user's spec): every row renders — the
 * panel is the itemised ledger — but spent-yet-still-active rows sink to the
 * BOTTOM (lowest priority), and expired rows are dropped entirely. Rows keep
 * their first-seen order within each band.
 *
 * @param rows - per-package rows, unmerged, in first-seen order.
 * @param now - current timestamp (defaults to Date.now()).
 */
export function sortPackageRows<T extends { remain: number; unlimited?: true; packageEndTime?: string }>(rows: readonly T[], now: number = Date.now()): T[] {
  const live: T[] = []
  const spent: T[] = []
  for (const row of rows) {
    const unlimited = row.unlimited === true
    const expiry = parseExpiry(row.packageEndTime)
    const expired = !unlimited && row.remain <= 0 && expiry !== undefined && expiry < now
    if (expired) continue
    if (unlimited || row.remain > 0) live.push(row)
    else spent.push(row)
  }
  return [...live, ...spent]
}
