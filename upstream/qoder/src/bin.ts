#!/usr/bin/env node
/** Standalone status/diagnostics/PAT CLI for the dsh-qoder-connect bundle. */

import { realpathSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { QoderCredentialStore, qoderCredentialIdentity } from './auth.ts'
import { QoderUpstreamClient, validateApiKey } from './upstream.ts'
import { createQoderTransport } from './qoder/transport/index.ts'
import { FALLBACK_QODER_MODELS } from './catalog.ts'
import { QoderCatalogStore, qoderCatalogPath } from './catalog-store.ts'
import { QODER_CONNECT_VERSION } from './version.ts'
import { isHeartbeatProcessAlive, qoderHostHeartbeatPath, readHostHeartbeat } from './host-heartbeat.ts'
import { CHINA_VARIANT, QODER_VARIANTS, variantFor, type QoderVariant } from './variants.ts'

type Action = 'doctor' | 'status' | 'pat' | 'logout' | 'catalog'
type PatCommand = 'set' | 'clear'
type CatalogCommand = 'refresh'

const JSON_SCHEMA_VERSION = 1

/** Remove token-like strings from an unexpected diagnostic message. */
function safeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gu, '[redacted token]')
    .replace(/(\b(?:code|token|pat)=)[^&\s]+/giu, '$1[redacted]')
}

function printHelp(): void {
  process.stdout.write([
    'Usage: dsh-qoder-connect <doctor|status|pat|logout|catalog> [--provider <id>] [--json] [--file <path>]',
    '',
    '  doctor         secret-free environment diagnostics',
    '  status         credential state and remaining Qoder credit',
    '  pat set        validate and store a Personal Access Token (arg, --file, or stdin)',
    '  pat clear      remove the stored credential',
    '  logout         alias for `pat clear`',
    '  catalog refresh   re-fetch the model list and save it for this account',
    '',
    '  --provider  which product to act on; defaults to qoder',
    `              one of: ${QODER_VARIANTS.map(variant => variant.id).join(', ')}`,
    '  --json      emit one secret-free JSON document (doctor/status only)',
    '  --file      file to read the token from with `pat set`; "-" reads standard input',
    '',
    '  A token can also arrive as the positional argument after `pat set`.',
    '  Environment fallback: QODER_CN_PERSONAL_ACCESS_TOKEN (qoder) or',
    '  QODER_PERSONAL_ACCESS_TOKEN (qoder-global) when no file is saved.',
    '',
  ].join('\n'))
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`)
}

/** One variant's store. */
function makeStore(variant: QoderVariant): QoderCredentialStore {
  return new QoderCredentialStore({ variant })
}

/** One variant's store plus the upstream client riding its transport. */
function makeClient(store: QoderCredentialStore, variant: QoderVariant): QoderUpstreamClient {
  const transport = createQoderTransport({
    region: variant.region,
    resolvePat: () => store.patPromise(),
  })
  return new QoderUpstreamClient({
    region: variant.region,
    providerId: variant.id,
    getPat: () => store.patPromise(),
    transport,
  })
}

async function doctor(jsonOutput: boolean, variant: QoderVariant): Promise<number> {
  const store = makeStore(variant)
  const status = await store.status()
  const heartbeat = await readHostHeartbeat()
  const hostAlive = heartbeat !== undefined && isHeartbeatProcessAlive(heartbeat)
  const report = {
    schemaVersion: JSON_SCHEMA_VERSION,
    package: 'dsh-qoder-connect',
    version: QODER_CONNECT_VERSION,
    node: process.version,
    provider: variant.id,
    displayName: variant.displayName,
    region: variant.region,
    credentialFile: store.ownAuthPath(),
    hostHeartbeat: {
      path: qoderHostHeartbeatPath(),
      present: heartbeat !== undefined,
      ...heartbeat === undefined ? {} : { registeredAt: heartbeat.registeredAt, pid: heartbeat.pid },
      processAlive: hostAlive,
    },
    signIn: status.state,
    ...status.pat === undefined ? {} : { pat: status.pat },
    ...status.reason === undefined ? {} : { reason: status.reason },
    fallbackModels: FALLBACK_QODER_MODELS.length,
    hints: [
      ...status.state === 'configured'
        ? []
        : [`Save a token with \`dsh-qoder-connect pat set <token> --provider ${variant.id}\`, or from the plugin's settings card.`],
      ...hostAlive ? [] : ['Host bundle not running in this DSH profile (or the process exited). The browser card is unavailable until DSH starts the plugin; the pat command above still works.'],
    ],
  }
  if (jsonOutput) {
    printJson(report)
  } else {
    process.stdout.write([
      `${variant.displayName} Connect ${QODER_CONNECT_VERSION} on ${process.version}`,
      `Region: ${report.region}`,
      `Credential file: ${report.credentialFile}`,
      `Host bundle: ${hostAlive ? `running (pid ${heartbeat!.pid})` : heartbeat !== undefined ? 'stale heartbeat (process exited)' : 'not started'}`,
      `Credential: ${status.state === 'configured' ? `configured (${status.pat?.source ?? 'file'}${status.pat?.patTail === undefined ? '' : `, tail …${status.pat.patTail}`})` : 'missing'}`,
      ...status.reason === undefined ? [] : [`Note: ${status.reason}`],
      `Static fallback models: ${report.fallbackModels}`,
      ...report.hints.map(hint => `Hint: ${hint}`),
      '',
    ].join('\n'))
  }
  return status.state === 'configured' ? 0 : 1
}

async function status(jsonOutput: boolean, variant: QoderVariant): Promise<number> {
  const store = makeStore(variant)
  const auth = await store.status()
  const base = {
    schemaVersion: JSON_SCHEMA_VERSION,
    package: 'dsh-qoder-connect',
    version: QODER_CONNECT_VERSION,
    provider: variant.id,
    region: variant.region,
    credentialFile: auth.filePath,
    signIn: auth.state,
    ...auth.pat === undefined ? {} : { pat: auth.pat },
    ...auth.reason === undefined ? {} : { reason: auth.reason },
  }
  if (auth.state !== 'configured') {
    if (jsonOutput) printJson({ ...base, credits: undefined })
    else {
      process.stdout.write([
        `${variant.displayName}: no credential configured at ${auth.filePath}`,
        ...auth.reason === undefined ? [] : [`Note: ${auth.reason}`],
        'Save a token with `pat set` or from the plugin\u2019s settings card.',
        '',
      ].join('\n'))
    }
    return 1
  }
  const client = makeClient(store, variant)
  try {
    const credits = await client.fetchCredits()
    if (jsonOutput) printJson({ ...base, credits })
    else {
      process.stdout.write([
        `${variant.displayName} (${variant.region}): token from ${auth.pat?.source ?? 'file'}${auth.pat?.patTail === undefined ? '' : `, tail …${auth.pat.patTail}`}`,
        credits.unlimited ? 'Quota: unlimited for the current cycle' : `Quota: ${Math.max(0, 100 - credits.total).toFixed(1)}% remaining of the cycle allowance`,
        ...credits.accounts.map(account => `  ${account.packageName}: ${account.remain}/${account.size}${account.unlimited ? ' (unlimited)' : ''}`),
        ...credits.cycleResetTime === undefined ? [] : [`  resets: ${credits.cycleResetTime}`],
        '',
      ].join('\n'))
    }
    return 0
  } catch (error: unknown) {
    if (jsonOutput) printJson({ ...base, creditsError: safeMessage(error) })
    else process.stdout.write(`${variant.displayName}: credential stored, but the quota call failed: ${safeMessage(error)}\n`)
    return 1
  }
}

/** Read a token from the positional arg, --file, or standard input. */
async function readPat(source: string | undefined, rest: readonly string[]): Promise<string> {
  const inline = rest.find(argument => !argument.startsWith('--'))
  const raw = source === undefined
    ? inline ?? await readStdin()
    : source === '-' ? await readStdin() : await readFile(source, 'utf8')
  const pat = raw?.trim() ?? ''
  if (pat === '') throw new Error('no token given: pass it as an argument, via --file <path>, or on standard input')
  return pat
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string))
  }
  return Buffer.concat(chunks).toString('utf8')
}

async function patSet(variant: QoderVariant, file: string | undefined, rest: readonly string[]): Promise<number> {
  const store = makeStore(variant)
  const pat = await readPat(file, rest)
  process.stdout.write(`Validating a token against ${variant.displayName} (${variant.region})…\n`)
  // Validate before writing: a file the plugin saved should always be a file
  // the plugin believes works. A refusal costs one discovery call, a bad save
  // costs every later request an opaque 401.
  if (!await validateApiKey(pat, variant.region)) {
    process.stderr.write(`dsh-qoder-connect: the token was refused by ${variant.displayName} (${variant.region}). Nothing was saved.\n`)
    process.stderr.write('If this token belongs to the other Qoder product, use --provider for that one.\n')
    return 2
  }
  await store.save(pat, 'cli')
  const status = await store.status()
  process.stdout.write([
    `Saved to ${store.ownAuthPath()}${status.pat?.patTail === undefined ? '' : ` (tail …${status.pat.patTail})`}`,
    'The running plugin picks the token up on its next sweep; no restart needed.',
    '',
  ].join('\n'))
  return 0
}

async function patClear(variant: QoderVariant): Promise<number> {
  const store = makeStore(variant)
  // Only this variant's stored credential is removed, so signing out of
  // one product never affects the other. An environment token is not ours to
  // remove; say so rather than pretend the state is fully signed out.
  await store.clear()
  const status = await store.status()
  process.stdout.write(
    status.state === 'configured'
      ? `${variant.displayName} Connect: removed the stored file, but a token is still active from the environment (${status.pat?.source ?? 'env'}).\n`
      : `${variant.displayName} Connect: signed out; removed ${store.ownAuthPath()}\n`,
  )
  return 0
}

async function catalogRefresh(variant: QoderVariant): Promise<number> {
  const store = makeStore(variant)
  const credential = await store.resolve()
  const client = makeClient(store, variant)
  const models = await client.fetchModels()
  const identity = qoderCredentialIdentity(credential)
  const fetch = client.lastCatalog
  // The CLI writes the same saved-catalog file the host reads, so a refresh
  // here survives a restart of the plugin exactly like a live fetch would.
  new QoderCatalogStore({ path: qoderCatalogPath(variant.catalogFilename) }).set(identity, {
    source: fetch?.source ?? 'unknown',
    fetchedAtMs: fetch?.fetchedAtMs ?? Date.now(),
    models: [...models],
  })
  process.stdout.write(`${variant.displayName}: fetched ${models.length} models; saved for account ${identity}.\n`)
  return 0
}

/** Execute one boot-free command. */
export async function run(argv: readonly string[]): Promise<number> {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    printHelp()
    return 0
  }
  const [rawAction, ...flags] = argv
  const actions: readonly Action[] = ['doctor', 'status', 'pat', 'logout', 'catalog']
  if (!actions.includes(rawAction as Action)) {
    process.stderr.write(`dsh-qoder-connect: expected doctor, status, pat, logout, or catalog; got ${JSON.stringify(rawAction)}\n`)
    return 1
  }
  const action = rawAction as Action
  const jsonOutput = flags.includes('--json')

  // `--provider <id>` (or `--provider=<id>`); absent means the China provider,
  // so every invocation without a flag keeps acting on `qoder`. `--file <path>`
  // names the file `pat set` reads the token from.
  let providerId: string | undefined
  let file: string | undefined
  const rest: string[] = []
  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index]!
    if (flag === '--provider') {
      providerId = flags[index + 1]
      index += 1
      continue
    }
    if (flag.startsWith('--provider=')) {
      providerId = flag.slice('--provider='.length)
      continue
    }
    if (flag === '--file') {
      file = flags[index + 1]
      index += 1
      continue
    }
    if (flag.startsWith('--file=')) {
      file = flag.slice('--file='.length)
      continue
    }
    rest.push(flag)
  }
  const variant = providerId === undefined ? CHINA_VARIANT : variantFor(providerId)
  if (variant === undefined) {
    process.stderr.write(
      `dsh-qoder-connect: unknown provider ${JSON.stringify(providerId)}; expected one of ${QODER_VARIANTS.map(v => v.id).join(', ')}\n`,
    )
    return 1
  }
  // `pat` and `catalog` carry a subcommand; peel it off `rest` before the
  // flag hygiene below can mistake it for an unknown option.
  let patCommand: PatCommand | undefined
  let catalogCommand: CatalogCommand | undefined
  if (action === 'pat') {
    const sub = rest.shift()
    patCommand = sub === 'set' || sub === 'clear' ? sub : undefined
    if (patCommand === undefined) {
      process.stderr.write(`dsh-qoder-connect: pat needs set or clear; got ${JSON.stringify(sub ?? '')}\n`)
      return 1
    }
  }
  if (action === 'catalog') {
    const sub = rest.shift()
    catalogCommand = sub === 'refresh' ? sub : undefined
    if (catalogCommand === undefined) {
      process.stderr.write(`dsh-qoder-connect: catalog needs refresh; got ${JSON.stringify(sub ?? '')}\n`)
      return 1
    }
  }
  const unknown = rest.filter(flag => flag !== '--json' && !flag.startsWith('--'))
  if (unknown.length > 0 || (jsonOutput && action !== 'doctor' && action !== 'status')) {
    process.stderr.write(`dsh-qoder-connect: invalid options for ${action}: ${flags.join(' ')}\n`)
    return 1
  }
  if (action !== 'pat' && file !== undefined) {
    process.stderr.write(`dsh-qoder-connect: --file applies to pat set, not ${action}\n`)
    return 1
  }
  try {
    switch (action) {
      case 'doctor':
        return await doctor(jsonOutput, variant)
      case 'status':
        return await status(jsonOutput, variant)
      case 'pat':
        return patCommand === 'set'
          ? await patSet(variant, file, rest)
          : await patClear(variant)
      case 'logout':
        return await patClear(variant)
      case 'catalog':
        return await catalogRefresh(variant)
    }
  } catch (error: unknown) {
    process.stderr.write(`dsh-qoder-connect: ${action} failed: ${safeMessage(error)}\n`)
    return 1
  }
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  process.exitCode = await run(process.argv.slice(2))
}
