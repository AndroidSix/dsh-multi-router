import type { TraeCredential, TraeRefreshOutcome } from './auth.ts'
import type { TraeEdition } from './paths.ts'
import { hostname } from 'node:os'
import { randomBytes, sign } from 'node:crypto'

/**
 * Per-edition refresh contracts (docs/INTL_SG_EVIDENCE.md §2.2; re-verified
 * 2026-10-11 against the shipped 3.4.2 / 3.6.2 clients AND their own request
 * logs).
 *
 * History matters here, because the contract has MOVED:
 *
 *   - The pre-3.x clients (and every plugin release up to 3.0.1) refreshed on
 *     `/cloudide/api/v3/trae/oauth/ExchangeToken` with no proof. That shape is
 *     still answered with HTTP 200 today for ALL FOUR editions — but only when
 *     the ClientID matches the credential's own OAuth client (see below), so it
 *     is kept as the fallback.
 *   - The current clients refresh on `/trae/api/v3/oauth/ExchangeToken` and
 *     attach a `DeviceProof`: an ECDSA P-256 signature made with the per-install
 *     keypair stored in the same `storage.json`. Sending the new path without
 *     that proof is refused with `20405 Device proof required`, and sending it
 *     with a proof from a different key is refused with `20403 Token device not
 *     match` — so the proof is both required and verified, and the keypair is
 *     not optional.
 *
 * The refresh contract is the ONE contract that forks by edition rather than by
 * region. Every request hangs off the credential's own host, never a hardcoded
 * base.
 *
 * Verified matrix (all four editions answered HTTP 200 on BOTH contracts):
 *
 *   | edition | ClientID         | PlatformCode |
 *   |---------|------------------|--------------|
 *   | cn      | ono9krqynydwx5   | IDE_PC       |
 *   | sg      | ono9krqynydwx5   | IDE_PC       |
 *   | solo    | en1oxy7wnw8j9n   | SOLO_PC      |
 *   | solo-sg | en1oxy7wnw8j9n   | SOLO_PC      |
 *
 * The ClientID split follows the official client's own branch exactly: every
 * SOLO package (CN and international alike) takes the SOLO ClientID and
 * `SOLO_PC`, and everything else takes the desktop one and `IDE_PC`.
 *
 * That split is enforced by the OAuth CLIENT rather than by the endpoint, so it
 * applies on the LEGACY path too: a SOLO refresh token is refused by the desktop
 * client on either path with `10101 refresh token is not matched to the client`.
 * Both contracts therefore read `CURRENT_CONTRACT[edition].clientId`.
 */
interface TraeRefreshContract {
  readonly path: string
  readonly clientId: string
  /** Value the official client sends as `PlatformCode`. */
  readonly platformCode: string
}

/** Path of the current token-exchange endpoint, relative to the credential host. */
export const TRAE_EXCHANGE_TOKEN_PATH = '/trae/api/v3/oauth/ExchangeToken'

/** Path of the superseded endpoint; only reachable as the fallback. */
export const TRAE_LEGACY_EXCHANGE_TOKEN_PATH = '/cloudide/api/v3/trae/oauth/ExchangeToken'

/** Shared desktop ClientID; the current contract also uses it for `cn` / `sg`. */
const DESKTOP_CLIENT_ID = 'ono9krqynydwx5'

/** SOLO ClientID; every SOLO package uses it, CN and international alike. */
const SOLO_CLIENT_ID = 'en1oxy7wnw8j9n'

/** The current contract: `/trae/api/v3`, per-edition ClientID, always proofed. */
const CURRENT_CONTRACT: Readonly<Record<TraeEdition, TraeRefreshContract>> = {
  cn: { path: TRAE_EXCHANGE_TOKEN_PATH, clientId: DESKTOP_CLIENT_ID, platformCode: 'IDE_PC' },
  sg: { path: TRAE_EXCHANGE_TOKEN_PATH, clientId: DESKTOP_CLIENT_ID, platformCode: 'IDE_PC' },
  solo: { path: TRAE_EXCHANGE_TOKEN_PATH, clientId: SOLO_CLIENT_ID, platformCode: 'SOLO_PC' },
  'solo-sg': { path: TRAE_EXCHANGE_TOKEN_PATH, clientId: SOLO_CLIENT_ID, platformCode: 'SOLO_PC' },
}

/**
 * Stable device identity for the DeviceInfo body, sourced from the app's own
 * storage. Every field except `deviceId`/`machineId` is optional: the server
 * requires `DeviceID`, `PlatformCode` and `DeviceType` (verified: dropping
 * `DeviceType` yields `20403`, dropping `MachineID` does not), so a machine that
 * cannot read the cosmetic fields must still be able to refresh.
 */
export interface TraeRefreshDevice {
  deviceId: string
  machineId: string
  deviceName?: string
  deviceModel?: string
  deviceBrand?: string
  deviceCpu?: string
  osVersion?: string
  appVersion?: string
  /**
   * The install's registered keypair, read from `storage.json`. Its presence is
   * exactly what decides whether the CURRENT contract can be attempted: without
   * it there is no proof to sign, and the server would answer `20405`.
   */
  deviceKeyPair?: { privateKeyPEM: string; publicKeyPEM: string }
}

/** The ClientID the official client uses for one edition. */
export function refreshClientIdOf(edition: TraeEdition): string {
  return CURRENT_CONTRACT[edition].clientId
}

/**
 * The `PlatformCode` the official client sends for one edition. Exported so the
 * settings card and diagnostics can describe the same table the refresh uses.
 */
export function refreshPlatformCodeOf(edition: TraeEdition): string {
  return CURRENT_CONTRACT[edition].platformCode
}

function normalizeHost(host: string): string {
  const value = host.trim()
  if (value === '') throw new Error('Trae refresh host is missing')
  return value.replace(/\/$/, '')
}

/** `OSInfo` value the official client sends (a bare platform word). */
function osInfo(platform: NodeJS.Platform = process.platform): string {
  return platform === 'darwin' ? 'mac' : platform === 'win32' ? 'windows' : platform
}

/**
 * Build the exact string the official client signs.
 *
 * The separator is a NEWLINE, not a space: the shipped bundle joins the six
 * fields with `.join("\n")`. This is load-bearing rather than cosmetic — a
 * space-joined message of identical fields is rejected with `20403 Token device
 * not match`, which is indistinguishable from a wrong key and sends debugging
 * in entirely the wrong direction.
 */
export function traeDeviceProofMessage(input: {
  path: string
  clientId: string
  refreshToken: string
  timestamp: number
  nonce: string
}): string {
  return ['POST', input.path, input.clientId, input.refreshToken, String(input.timestamp), input.nonce].join('\n')
}

/**
 * Sign a device proof with the install's own private key.
 *
 * `timestamp`/`nonce` are injectable so tests can pin a deterministic signature;
 * the defaults are the whole-second timestamp and 16 random bytes the official
 * client uses.
 */
export function signTraeDeviceProof(input: {
  path: string
  clientId: string
  refreshToken: string
  privateKeyPEM: string
  timestamp?: number
  nonce?: string
}): { Signature: string; Timestamp: number; Nonce: string } {
  const timestamp = input.timestamp ?? Math.floor(Date.now() / 1000)
  const nonce = input.nonce ?? randomBytes(16).toString('hex')
  const message = traeDeviceProofMessage({
    path: input.path, clientId: input.clientId, refreshToken: input.refreshToken, timestamp, nonce,
  })
  const Signature = sign('sha256', Buffer.from(message), input.privateKeyPEM).toString('base64')
  return { Signature, Timestamp: timestamp, Nonce: nonce }
}

/** The `DeviceInfo` block the current contract sends. */
export function traeDeviceInfoBody(contract: TraeRefreshContract, device: TraeRefreshDevice, platform?: NodeJS.Platform): Record<string, unknown> {
  const os = osInfo(platform)
  return {
    DeviceID: device.deviceId,
    MachineID: device.machineId,
    PlatformCode: contract.platformCode,
    DeviceType: 'PC',
    ...device.deviceName === undefined ? {} : { DeviceName: device.deviceName },
    ...device.deviceModel === undefined ? {} : { DeviceModel: device.deviceModel },
    ...device.appVersion === undefined ? {} : { ClientVersion: device.appVersion },
    ...device.deviceKeyPair === undefined ? {} : { DevicePublicKey: device.deviceKeyPair.publicKeyPEM },
    ...device.deviceBrand === undefined ? {} : { DeviceBrand: device.deviceBrand },
    ...device.deviceCpu === undefined ? {} : { DeviceCPU: device.deviceCpu },
    OSInfo: os,
    OSVersion: device.osVersion ?? `${os} ${hostname()}`,
  }
}

/** The current contract's complete request body. */
function currentBody(credential: TraeCredential, contract: TraeRefreshContract, device: TraeRefreshDevice): Record<string, unknown> {
  return {
    ClientID: contract.clientId,
    ClientSecret: '',
    RefreshToken: credential.refreshToken,
    DeviceInfo: traeDeviceInfoBody(contract, device),
    DeviceProof: signTraeDeviceProof({
      path: contract.path,
      clientId: contract.clientId,
      refreshToken: credential.refreshToken ?? '',
      privateKeyPEM: device.deviceKeyPair!.privateKeyPEM,
    }),
    ...device.appVersion === undefined ? {} : { IDEVersion: device.appVersion },
  }
}

/**
 * The superseded shape, kept as a fallback for installs the current contract
 * cannot serve: a machine whose `storage.json` carries no device keypair (an
 * older install that has never refreshed on the new contract, or a CLI-only
 * home) has nothing to sign a proof with.
 *
 * The ClientID split is the SAME one the current contract uses, and that is not
 * a coincidence — it is enforced by the OAuth CLIENT, not by the endpoint: a
 * SOLO-package refresh token is refused by the DESKTOP client with `10101
 * refresh token is not matched to the client`, and vice versa, on this path
 * exactly as on the current one. Verified 2026-10-11 across all four editions:
 * each answers 200 here with its own ClientID and 400 with the other one.
 *
 * The pre-3.1.0 code hardcoded the desktop ClientID on this path, which is why
 * an international SOLO account had no working fallback at all.
 */
function legacyBody(credential: TraeCredential, clientId: string): Record<string, unknown> {
  return {
    ClientID: clientId,
    ClientSecret: '-',
    RefreshToken: credential.refreshToken,
    UserID: credential.userId,
  }
}

/** Parse one ExchangeToken response into an outcome, or throw with the reason. */
function outcomeOf(payload: { Result?: Record<string, unknown> }, label: string): TraeRefreshOutcome {
  const result = payload.Result
  const accessToken = typeof result?.['Token'] === 'string' ? result['Token'] : ''
  if (accessToken === '') throw new Error(`${label} returned no token`)
  const expiry = result?.['TokenExpireAt']
  const expiresAtMs = typeof expiry === 'number' ? expiry : typeof expiry === 'string' ? Date.parse(expiry) : Number.NaN
  if (!Number.isFinite(expiresAtMs)) throw new Error(`${label} returned an invalid expiry`)
  const refreshToken = typeof result?.['RefreshToken'] === 'string' && result['RefreshToken'] !== '' ? result['RefreshToken'] : undefined
  // The current contract also reports when the REFRESH token dies. Recording it
  // is what lets the store know a refresh is impossible before asking again,
  // instead of surfacing the same 401 forever.
  const refreshExpiry = result?.['RefreshExpireAt']
  const parsedRefreshExpiry = typeof refreshExpiry === 'string' ? Date.parse(refreshExpiry) : Number.NaN
  const refreshExpiresAtMs = typeof refreshExpiry === 'number' && Number.isFinite(refreshExpiry) && refreshExpiry > 0
    ? refreshExpiry
    : Number.isFinite(parsedRefreshExpiry) ? parsedRefreshExpiry : undefined
  return {
    accessToken,
    ...refreshToken === undefined ? {} : { refreshToken },
    expiresAtMs,
    ...refreshExpiresAtMs === undefined ? {} : { refreshExpiresAtMs },
  }
}

/** POST one refresh body and parse it, labelling failures with the path tried. */
async function postExchangeToken(
  host: string,
  path: string,
  body: Record<string, unknown>,
  signal: AbortSignal | undefined,
  label: string,
): Promise<TraeRefreshOutcome> {
  const response = await fetch(`${normalizeHost(host)}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`${label} failed (http ${response.status})`)
  return outcomeOf(await response.json() as { Result?: Record<string, unknown> }, label)
}

/**
 * Exchange a refresh token for a fresh access token.
 *
 * The CURRENT contract is attempted first whenever it is possible at all — it is
 * what the shipped clients use. It needs the install's device keypair; without
 * one there is nothing to sign, so the request is skipped rather than sent to be
 * rejected with `20405`.
 *
 * The SUPERSEDED contract is then tried as a fallback, which is what keeps older
 * installs and CLI-only machines working; it carries no device block but the
 * SAME per-edition ClientID, because that split belongs to the OAuth client
 * rather than to the endpoint (see {@link legacyBody}). When both are impossible
 * or both fail, the error names every attempt so a "sign in again" verdict is
 * diagnosable rather than mysterious.
 */
export async function refreshTraeCredential(
  credential: TraeCredential,
  signal?: AbortSignal,
  device?: TraeRefreshDevice,
): Promise<TraeRefreshOutcome> {
  const contract = CURRENT_CONTRACT[credential.edition]
  if (contract === undefined) throw new Error(`Trae ${credential.edition} refresh contract is not verified`)
  if (credential.refreshToken === undefined) throw new Error('Trae refresh token is missing')

  const attempts: string[] = []

  // --- Current contract: needs a registered device keypair to sign with. ---
  if (device?.deviceKeyPair === undefined) {
    attempts.push(`${contract.path}: no device keypair in this install's storage`)
  } else {
    try {
      return await postExchangeToken(credential.host, contract.path, currentBody(credential, contract, device), signal, 'Trae token refresh')
    } catch (error: unknown) {
      attempts.push(`${contract.path}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // --- Superseded contract: no device block, but the same ClientID split. ---
  try {
    return await postExchangeToken(credential.host, TRAE_LEGACY_EXCHANGE_TOKEN_PATH, legacyBody(credential, contract.clientId), signal, 'Trae token refresh (legacy)')
  } catch (error: unknown) {
    attempts.push(`${TRAE_LEGACY_EXCHANGE_TOKEN_PATH}: ${error instanceof Error ? error.message : String(error)}`)
  }

  throw new Error(`Trae token refresh failed — ${attempts.join('; ')}`)
}
