/**
 * The one UTC+8 day calculation the check-in logic is allowed to use.
 *
 * Qoder opens the daily benefit at 10:00 Beijing time and closes it at 09:59
 * the next morning, so the unit that matters is a *window*, not a calendar
 * date — for the last ten hours of every window the two disagree. The
 * transport (which must say which window a campaign belongs to) and the
 * scheduler (which must decide whether today is settled) therefore have to name
 * that day identically, or one of them settles a day the other has not claimed.
 * That disagreement is exactly what silently cost a day's credits, so the
 * conversion lives here instead of being re-derived in each of them.
 *
 * @module dsh-qoder-connect/utc8
 */

/** Beijing time's offset from UTC, in minutes. */
export const UTC8_OFFSET_MINUTES = 480

/**
 * The UTC+8 wall clock of an instant, as a Date whose *local* fields hold it.
 *
 * Shifting by the host's own offset cancels the host timezone out, so the
 * result reads the same on a UTC+8 machine and on a UTC-5 one. Callers must
 * therefore use the local getters (`getHours`, `getFullYear`, …) on it.
 */
export function utc8WallClock(atMs: number): Date {
  const d = new Date(atMs)
  return new Date(d.getTime() + (d.getTimezoneOffset() + UTC8_OFFSET_MINUTES) * 60_000)
}

/**
 * Format an epoch-ms instant as its UTC+8 calendar date, `YYYY-MM-DD`.
 */
export function formatUtc8Date(atMs: number): string {
  const utc8 = utc8WallClock(atMs)
  const y = utc8.getFullYear()
  const m = String(utc8.getMonth() + 1).padStart(2, '0')
  const day = String(utc8.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
