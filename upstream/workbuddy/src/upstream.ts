/**
 * WorkBuddy (CodeBuddy / copilot.tencent.com) upstream client: chat streaming,
 * token refresh, model catalog, and credit balance. The wire behavior is
 * ported from Sliverkiss/workbuddy2api (MIT), whose Go implementation is
 * battle-tested against the real endpoint.
 *
 * @module dsh-workbuddy-connect/upstream
 */

import { randomUUID } from 'node:crypto'
import { appUserAgent, resolveAppVersion, type AppVersionInfo } from './app-version.ts'
import { chatUserAgent, fallbackChatIdentity, resolveChatIdentity, type ChatIdentity } from './client-identity.ts'
import type { WorkBuddyCredential } from './auth.ts'
import type { ProbeAttempt } from './probe.ts'
import { PROBE_MAX_TOKENS, PROBE_PROMPT } from './probe.ts'

/** WorkBuddy region selected by the credential's login domain. */
export type WorkBuddyRegion = 'cn' | 'global'
