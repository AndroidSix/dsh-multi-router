/**
 * The shared busy veil: one overlay for every account write whose result only
 * lands on screen after the Host re-reads its settings document.
 *
 * The card's two write paths (saveModels, writePreference) each carry a
 * "busy" moment that the rest of the card can only hint at with disabled
 * controls and a label swap. A user watching a specific row change needs to
 * see PROGRESS, not just greying-out — so the veil exists to say "waiting for
 * this step to land". It is the same shape as the sibling workbuddy plugin's
 * veil (both plugins were written by the same author and share one
 * external-presentation language); its message is provided by the caller per
 * scenario, and the veil itself never times out or narrates — it only renders.
 *
 * The veil comes down exactly when the write path that raised it finishes
 * (its finally clears the busying flag), which is when the re-read has caught
 * up — so the delay the user would otherwise see as "saved but not there" is
 * rendered as "waiting while it happens" instead.
 *
 * The spinner follows the host's own state spinner rather than a
 * self-invented border ring: an SVG arc that breathes while it turns,
 * currentColor so it inherits whatever tier it sits in, and the same 1.5s
 * beat as every other spinner in the shell.
 *
 * @module dsh-connect-trae/client/BusyOverlay
 */

import type { ReactElement } from 'react'

/** Props: the veil's message, whether it is showing, and an optional detail line. */
export interface BusyOverlayProps {
  /** The scenario line, already translated by the caller (e.g. "Saving…"). */
  message: string
  /** Extra detail under the message, already translated; omitted when absent. */
  hint?: string
  /**
   * Whether the veil is up. Rendering nothing while false keeps the common
   * resting case free of an invisible layer that would still eat clicks.
   */
  visible: boolean
}

/**
 * The shared busy veil's spinner: an arc that breathes while it turns.
 *
 * Deliberately the host's own state-spinner shape (dsh's `_dsh-state-dot-spin`)
 * rather than a border-ring: a two-tone CSS ring at .7s read as a loading
 * indicator from another decade and was out of step with every spinner in the
 * shell. The motion lives in CSS (`dsm-trae-veil-spin` / `-dash`), so this
 * element only describes the geometry; `currentColor` lets it inherit whatever
 * tier it sits in.
 *
 * `aria-hidden` because the veil's `role="status"` already announces the
 * message — a second announcement from a decorative arc is noise.
 */
function VeilSpinner(): ReactElement {
  return (
    <svg className="dsm-trae-veil-spinner" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle className="dsm-trae-veil-spinner-track" cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle className="dsm-trae-veil-spinner-arc" cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/**
 * The veil. Deliberately NOT a modal dialog: it carries no focusable control
 * and no dismissal — there is nothing for the user to decide, only a step to
 * wait through. `aria-busy` plus a polite live region state that to screen
 * readers, which is the whole accessibility contract a wait screen needs.
 */
export function BusyOverlay({ message, hint, visible }: BusyOverlayProps): ReactElement | null {
  if (!visible) return null
  return (
    <div className="dsm-trae-veil" role="status" aria-busy="true" aria-live="polite">
      <div className="dsm-trae-veil-card">
        <VeilSpinner />
        <span className="dsm-trae-veil-text">{message}</span>
        {hint === undefined ? null : <span className="dsm-trae-veil-hint">{hint}</span>}
      </div>
    </div>
  )
}
