/** Qoder campaign inquiry and daily benefit check-in service. */

import { formatUtc8Date } from '../../utc8.ts'
import type { QoderAuthService } from './auth.ts'
import {
  getQoderCampaignsUrl,
  getQoderClaimCampaignUrl,
  resolveQoderEndpoints,
  type QoderRegion,
} from './endpoints.ts'
import { isQoderAuthRejection, QoderLlmError } from '../errors.ts'
import type { QoderLogger } from './logging.ts'
import { openApiJsonRequest } from './request.ts'
import { qoderDesktopClientType } from './wire/cosy.ts'

export interface QoderCampaignBenefit {
  kind?: string
  amount?: number
  validity?: {
    mode?: string
    days?: number
  }
}

export interface QoderCampaign {
  campaignId: string
  campaignKey?: string
  actionType: string
  claimStatus: string
  startAt?: number
  endAt?: number
  benefit?: QoderCampaignBenefit
}

export interface QoderCampaignsResponse {
  uid?: string
  claimable?: boolean
  campaigns?: QoderCampaign[]
}

export interface QoderClaimResponse {
  status?: string
  replayed?: boolean
  benefit?: {
    kind?: string
    amount?: number
  }
  expiresAt?: string
}

export interface QoderCheckInResult {
  variantId: string
  date: string
  timestamp: number
  status: 'claimed' | 'already-claimed' | 'before-window' | 'no-campaign' | 'error'
  amount?: number | undefined
  campaignKey?: string | undefined
  message?: string | undefined
}

export interface QoderCheckInServiceOptions {
  authService: QoderAuthService
  fetch?: typeof fetch | undefined
  region?: QoderRegion | undefined
  variantId?: string | undefined
  logger?: QoderLogger | undefined
  timeoutMs?: number | undefined
}

const defaultCheckInTimeoutMs = 15_000

/**
 * The longest span still recognised as one daily benefit window.
 *
 * Qoder's daily window runs 10:00 → 09:59 the next morning (86_340 s). The
 * slack above 24h absorbs a clock or rounding difference; a genuinely longer
 * campaign is *not* a daily window, and its start day says nothing about which
 * day one claim of it belongs to, so it must fall back to the calendar day
 * rather than mislabel every day of its run.
 */
const DAILY_WINDOW_MAX_MS = 24 * 60 * 60_000

/**
 * Which day's benefit the campaign the upstream is currently serving belongs to.
 *
 * Before 10:00 UTC+8 the upstream is still serving *yesterday's* window and its
 * `CLAIMED` describes yesterday, so "the campaign says CLAIMED" is not the same
 * statement as "today is done". Separating those two cases is the whole fix.
 */
type CampaignWindow =
  /** Today's window is open; `date` is the day it belongs to. */
  | { kind: 'open'; date: string }
  /** Today's window has not opened yet. */
  | { kind: 'not-open' }
  /** The served window belongs to an earlier day; `date` names it. */
  | { kind: 'earlier'; date: string }
  /** No usable window bounds; the calendar day is the only signal available. */
  | { kind: 'unknown' }

export class QoderCheckInService {
  private readonly authService: QoderAuthService
  private readonly fetchImpl: typeof fetch
  private readonly region: QoderRegion
  private readonly variantId: string
  private readonly logger: QoderLogger | undefined
  private readonly timeoutMs: number

  constructor(options: QoderCheckInServiceOptions) {
    this.authService = options.authService
    this.fetchImpl = options.fetch ?? globalThis.fetch
    this.region = options.region ?? 'china'
    this.variantId = options.variantId ?? 'qoder'
    this.logger = options.logger
    this.timeoutMs = options.timeoutMs ?? defaultCheckInTimeoutMs
  }

  async fetchCampaigns(token: string, signal?: AbortSignal): Promise<QoderCampaign[]> {
    const url = getQoderCampaignsUrl(this.region)
    const data = await openApiJsonRequest<QoderCampaignsResponse>(this.fetchImpl, {
      url,
      token,
      // The campaign family gates on the desktop identifier; the generic one
      // answers 200 with an empty list (see `qoderDesktopClientType`).
      headers: { 'cosy-clienttype': qoderDesktopClientType },
      signal,
      timeoutMs: this.timeoutMs,
      logger: this.logger,
      operation: 'Campaigns',
      logCategory: 'campaigns.list',
    })
    return Array.isArray(data?.campaigns) ? data.campaigns : []
  }

  async claimCampaign(token: string, campaignId: string, signal?: AbortSignal): Promise<QoderClaimResponse> {
    const url = getQoderClaimCampaignUrl(this.region, campaignId)
    const { openApiUrl } = resolveQoderEndpoints(this.region)
    return openApiJsonRequest<QoderClaimResponse>(this.fetchImpl, {
      url,
      method: 'POST',
      token,
      headers: { origin: openApiUrl, 'cosy-clienttype': qoderDesktopClientType },
      signal,
      timeoutMs: this.timeoutMs,
      logger: this.logger,
      operation: 'ClaimCampaign',
      logCategory: 'campaigns.claim',
    })
  }

  /**
   * Attribute the campaign the upstream is serving to a day, or say why it
   * cannot be attributed to today.
   *
   * The daily benefit window is 10:00 UTC+8 → 09:59 the next morning, so a
   * calendar date and the window's own date agree for only fourteen hours of
   * every twenty-four. Treating them as the same thing is what recorded a
   * pre-10:00 read of the *previous* window's `CLAIMED` against today.
   */
  private classifyCampaignWindow(
    campaign: QoderCampaign,
    nowMs: number,
    today: string,
  ): CampaignWindow {
    const startAt = campaign.startAt
    if (typeof startAt !== 'number' || !Number.isFinite(startAt) || startAt <= 0) {
      // Nothing to attribute a status to: the calendar day is all there is.
      return { kind: 'unknown' }
    }
    const endAt = campaign.endAt
    if (typeof endAt === 'number' && Number.isFinite(endAt)) {
      const spanMs = (endAt - startAt) * 1000
      if (spanMs <= 0 || spanMs > DAILY_WINDOW_MAX_MS) return { kind: 'unknown' }
    }
    const startMs = startAt * 1000
    if (startMs > nowMs) return { kind: 'not-open' }
    const date = formatUtc8Date(startMs)
    return date === today ? { kind: 'open', date } : { kind: 'earlier', date }
  }

  async checkIn(pat: string, signal?: AbortSignal): Promise<QoderCheckInResult> {
    const nowMs = Date.now()
    // One instant decides both the calendar day and the window comparison, so
    // an attempt can never straddle the 10:00 boundary and mix two days.
    const today = formatUtc8Date(nowMs)

    if (!pat || typeof pat !== 'string' || pat.trim() === '') {
      return {
        variantId: this.variantId,
        date: today,
        timestamp: nowMs,
        status: 'error',
        message: 'No PAT available',
      }
    }

    const executeWithToken = async (authToken: string): Promise<QoderCheckInResult> => {
      const campaigns = await this.fetchCampaigns(authToken, signal)
      // Look for daily benefit campaign (actionType === 'CLAIM_BENEFIT')
      const benefitCampaign = campaigns.find(c => c.actionType === 'CLAIM_BENEFIT')
      if (!benefitCampaign) {
        return {
          variantId: this.variantId,
          date: today,
          timestamp: nowMs,
          status: 'no-campaign',
          message: 'No claimable benefit campaign found for this region',
        }
      }

      const campaignWindow = this.classifyCampaignWindow(benefitCampaign, nowMs, today)
      // Only today's own window may settle today, and which window the
      // upstream is serving is the only thing that can say so: a window that
      // has not opened yet, or one that is still yesterday's, is not today's
      // benefit however the upstream reports its status. This is also what
      // refuses a pre-window attempt (#13, a manual click at 09:58 that read
      // the previous window's `CLAIMED` and cost the day): nothing is claimed
      // and the day stays retryable, so the run after the window opens still
      // does the claiming.
      //
      // Deliberately driven by the campaign's own `startAt`/`endAt` rather than
      // any clock constant: the opening moment is the upstream's to state, and
      // the China and Global products need not share it. A local "nothing can
      // be claimed before 10:00" rule would have hard-coded the one product's
      // measured boundary onto both.
      //
      // `before-window` rather than `no-campaign`: the campaign exists and the
      // day is still claimable, only the window is not open. Sharing one status
      // with "this account has no campaign at all" (the Global shape, #6/#12)
      // made the card say the same sentence for both, which is how a user
      // reads "nothing to claim" while a claim is still owed to them.
      if (campaignWindow.kind === 'not-open' || campaignWindow.kind === 'earlier') {
        return {
          variantId: this.variantId,
          date: today,
          timestamp: nowMs,
          status: 'before-window',
          campaignKey: benefitCampaign.campaignKey,
          message: campaignWindow.kind === 'not-open'
            ? "Today's benefit window has not opened yet"
            : `Upstream is still serving the benefit window of ${campaignWindow.date}`,
        }
      }
      const windowDate = campaignWindow.kind === 'open' ? campaignWindow.date : today

      if (benefitCampaign.claimStatus === 'CLAIMED') {
        return {
          variantId: this.variantId,
          date: windowDate,
          timestamp: nowMs,
          status: 'already-claimed',
          campaignKey: benefitCampaign.campaignKey,
          amount: benefitCampaign.benefit?.amount ?? 100,
          message: 'Already claimed today',
        }
      }

      // Claim it
      const claimResult = await this.claimCampaign(authToken, benefitCampaign.campaignId, signal)
      const isClaimed = claimResult.status === 'CLAIMED'
      const replayed = Boolean(claimResult.replayed)
      const amount = claimResult.benefit?.amount ?? benefitCampaign.benefit?.amount ?? 100

      if (isClaimed) {
        return {
          variantId: this.variantId,
          date: windowDate,
          timestamp: nowMs,
          status: replayed ? 'already-claimed' : 'claimed',
          amount,
          campaignKey: benefitCampaign.campaignKey,
          message: replayed ? 'Already claimed today' : `Successfully claimed ${amount} credits`,
        }
      }

      return {
        variantId: this.variantId,
        date: today,
        timestamp: nowMs,
        status: 'error',
        campaignKey: benefitCampaign.campaignKey,
        message: `Claim returned status ${claimResult.status ?? 'unknown'}`,
      }
    }

    try {
      const creds = await this.authService.getCredentials(pat, signal)
      try {
        return await executeWithToken(creds.authToken)
      } catch (innerError) {
        // If 401 token rejection, attempt one fresh token rotation and retry
        if (isQoderAuthRejection(innerError)) {
          this.logger?.warn?.(`[Qoder CheckIn] Auth token rejected, retrying with fresh exchange`)
          const freshCreds = await this.authService.exchangeFresh(pat, signal)
          return await executeWithToken(freshCreds.authToken)
        }
        throw innerError
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger?.error?.(`[Qoder CheckIn] Check-in failed: ${message}`)
      return {
        variantId: this.variantId,
        date: today,
        timestamp: nowMs,
        status: 'error',
        message,
      }
    }
  }
}
