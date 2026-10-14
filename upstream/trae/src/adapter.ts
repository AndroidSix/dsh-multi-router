import { createProvider } from '@earendil-works/pi-ai'
import type { Api, AuthContext, Context, CredentialStore, Message, Model, Provider, ProviderStreams, Tool } from '@earendil-works/pi-ai'
import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy'
import { resolveRetryPolicy } from '@deepseek-ai/dsh-llm'
import { PiAiAdapter } from '@deepseek-ai/dsh-llm-pi-ai'
import type { ResolvedPiAiProviderProfile } from '@deepseek-ai/dsh-llm-pi-ai'
import type { AttachmentStore } from '@deepseek-ai/dsh-attachment'
import { traeInputModalities, traeModelDisplayName, type TraeCatalog, type TraeModelInfo } from './catalog.ts'
import { piAiRuntimeInfo, type PiAiGeneration } from './pi-ai-runtime.ts'
import type { TraeShim } from './shim.ts'
import type { TraeRegion } from './region.ts'

/** Provider route this bundle owns for the domestic (CN) gateway. */
export const TRAE_PROVIDER = 'trae'

/**
 * Provider route this bundle owns for the international (trae.ai) gateway.
 * Named `-global` to match the plugin family's convention (`workbuddy-global`);
 * the internal region bucket stays `ai`, which is the gateway/protocol name.
 */
export const TRAE_AI_PROVIDER = 'trae-global'

/** The provider id each region registers as. */
export const TRAE_PROVIDERS: Readonly<Record<TraeRegion, string>> = {
  cn: TRAE_PROVIDER,
  ai: TRAE_AI_PROVIDER,
}

/** Human-readable provider names, shown in the DSH model picker. */
export const TRAE_PROVIDER_DISPLAY_NAMES: Readonly<Record<TraeRegion, string>> = {
  cn: 'Trae',
  ai: 'Trae Global',
}

/** Region a provider route id belongs to. */
export function regionOfTraeProvider(provider: string): TraeRegion | undefined {
  for (const [region, id] of Object.entries(TRAE_PROVIDERS) as [TraeRegion, string][]) {
    if (id === provider) return region
  }
  return undefined
}

export const TRAE_STREAM_IDLE_TIMEOUT_MS = 300_000

const INERT_AUTH: { credentials: CredentialStore; authContext: AuthContext } = {
  credentials: {
    async read() { return undefined },
    async list() { return [] },
    async modify() { throw new Error('dsh-connect-trae has no pi-ai credential lifecycle') },
    async delete() {},
  },
  authContext: {
    async env() { return undefined },
    async fileExists() { return false },
  },
}

const REQUEST_IMAGE_BUDGETS = {
  maxRequestImageBytes: 20_971_520,
  requestImagePixelBudget: 4_194_304,
  requestImageMaxBytes: 1_048_576,
} as const

/**
 * Conservative context capacity used only when a served model row carries no
 * window of its own. Every fallback row and every live Trae row is expected to
 * state its real window; this is the backstop that keeps one unsized row from
 * failing the entire provider route (`INVALID_MODEL_CONTEXT`).
 */
const FALLBACK_CONTEXT_WINDOW = 200_000

function toPiModel(info: TraeModelInfo, baseUrl: string, providerId: string): Model<Api> {
  return {
    id: info.id,
    name: traeModelDisplayName(info),
    api: 'openai-completions',
    provider: providerId,
    baseUrl,
    input: traeInputModalities(info),
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    reasoning: info.reasoningEfforts !== undefined,
    ...(info.reasoningEfforts === undefined ? {} : {
      thinkingLevelMap: {
        off: null,
        minimal: null,
        low: info.reasoningEfforts.low ?? null,
        medium: null,
        high: info.reasoningEfforts.high ?? null,
        xhigh: info.reasoningEfforts.xhigh ?? null,
        max: null,
      },
    }),
    ...(info.contextWindow === undefined ? {} : { contextWindow: info.contextWindow }),
    ...(info.maxTokens === undefined ? {} : { maxTokens: info.maxTokens }),
    compat: { supportsReasoningEffort: info.reasoningEfforts !== undefined },
  } as unknown as Model<Api>
}

/**
 * One `role: 'system'` entry as it appears in a NORMALIZED transcript (pi-ai
 * 0.86+). The legacy `Message` union has no system variant at all — that
 * absence is the whole defect (issue #27) — so the shape is declared here and
 * read structurally rather than through the library's types.
 */
interface TranscriptSystemMessage {
  role: 'system'
  content?: unknown
  sections?: unknown
  toolsAdded?: unknown
  toolsRemoved?: unknown
}

function isSystemMessage(message: unknown): message is TranscriptSystemMessage {
  return typeof message === 'object'
    && message !== null
    && (message as { role?: unknown }).role === 'system'
}

/**
 * The text of one system message: its `content` (a string, as
 * `normalizeContext` writes, or text blocks, which a provider may send back)
 * followed by its named `sections` — exactly the join pi-ai's own
 * `getSystemMessageText` performs.
 *
 * `sections` is not decoration: it is the modern transcript's second carrier of
 * prompt text ("named, ordered prompt sections rendered verbatim after
 * content"). Folding `content` alone would silently drop a prompt that arrives
 * section-shaped, which is the same asymmetric-loss failure this adapter exists
 * to prevent.
 */
function systemTextOf(message: TranscriptSystemMessage): string {
  const parts = [contentTextOf(message.content)]
  const sections = message.sections
  if (typeof sections === 'object' && sections !== null && !Array.isArray(sections)) {
    for (const text of Object.values(sections)) {
      if (typeof text === 'string') parts.push(text)
    }
  }
  return parts.filter(part => part.length > 0).join('\n\n')
}

function contentTextOf(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  const texts: string[] = []
  for (const block of content) {
    if (typeof block !== 'object' || block === null) continue
    const candidate = block as { type?: unknown, text?: unknown }
    if (candidate.type === 'text' && typeof candidate.text === 'string') texts.push(candidate.text)
  }
  return texts.join('\n\n')
}

/**
 * Replay one transcript system message's tool deltas into `state`, the same
 * merge pi-ai's own `getCurrentTools` performs: removals first, then additions,
 * keyed by name so a mid-conversation redeclaration replaces the original.
 */
function replayToolState(message: TranscriptSystemMessage, state: Map<string, Tool>): void {
  const removed = message.toolsRemoved
  if (Array.isArray(removed)) {
    for (const tool of removed) {
      const name = (tool as { name?: unknown } | null)?.name
      if (typeof name === 'string') state.delete(name)
    }
  }
  const added = message.toolsAdded
  if (Array.isArray(added)) {
    for (const tool of added) {
      const name = (tool as { name?: unknown } | null)?.name
      if (typeof name === 'string') state.set(name, tool as Tool)
    }
  }
}

/**
 * Fold a NORMALIZED transcript back into the `{ systemPrompt, tools, messages }`
 * shape a LEGACY (≤0.85) api consumes — issue #27's crash and its two silent
 * siblings.
 *
 * WHY (issue #27). 0.86+ normalizes at every public entry point, and DSH's host
 * calls `Models.streamSimple()`, so on a modern host the context arriving here
 * ALWAYS carries its prompt and its tool declarations on a leading system
 * message — the top-level fields are gone. A legacy api has no branch for that
 * message: `estimateMessageTokens` iterates the string `content` character by
 * character and reads `.name` off a character, throwing
 * `Cannot read properties of undefined (reading 'length')` before the request
 * is even built. That is what surfaced as `PI_AI_ERROR` with all-zero usage.
 *
 * The fold must carry MORE than the prompt. `toolsAdded` is the ONLY remaining
 * carrier of the tool declarations once `normalizeContext` has run, and a
 * legacy api reads tools exclusively from `context.tools` — so lifting the text
 * alone would trade a loud crash for a silent one: a model that can never emit
 * a `toolCall` because the request declared no tools.
 *
 * Shape-guarded, not version-guarded: it asks "is there a system message inside
 * `messages`?" rather than "which pi-ai is loaded?". A version test would be
 * wrong the moment either side moves, and this predicate is an identity for the
 * legacy shape, so the ordinary path stays byte-for-byte untouched. WHICH
 * branch runs at all IS generation-gated — see {@link withContextAdaptation}.
 *
 * Returns the SAME object when there is nothing to fold, so a legacy host
 * (which never normalizes) pays one `Array.some` and nothing else.
 */
export function adaptLegacyPiAiContext(context: Context): Context {
  if (context === null || typeof context !== 'object') return context
  const messages = Array.isArray(context.messages) ? context.messages : undefined
  if (messages === undefined) return context
  if (!messages.some(isSystemMessage)) return context

  const systemTexts: string[] = []
  const rest: Message[] = []
  const toolState = new Map<string, Tool>()
  for (const message of messages) {
    if (!isSystemMessage(message)) {
      rest.push(message)
      continue
    }
    const text = systemTextOf(message)
    if (text !== '') systemTexts.push(text)
    replayToolState(message, toolState)
  }

  // A top-level prompt the caller already set wins its place at the head; the
  // folded texts follow, so a mixed context loses nothing and keeps its order.
  const texts = [
    ...(context.systemPrompt === undefined || context.systemPrompt === '' ? [] : [context.systemPrompt]),
    ...systemTexts,
  ]
  const systemPrompt = texts.length > 0 ? texts.join('\n\n') : undefined

  // Only a context with NO top-level tools gets the promoted set: when the
  // caller supplied one, it is authoritative for their shape.
  const promoted = Array.isArray(context.tools)
    ? undefined
    : [...toolState.values()]

  // The system messages are dropped from `messages` even when no text could be
  // extracted — leaving one there is exactly what crashes the legacy estimator,
  // and an entry with no text has nothing to lose. `systemPrompt` stays ABSENT
  // rather than `''` so no empty system turn is emitted on the wire.
  return {
    ...context,
    ...systemPrompt === undefined ? {} : { systemPrompt },
    ...promoted === undefined || promoted.length === 0 ? {} : { tools: promoted },
    messages: rest,
  }
}

/**
 * Lift the legacy `{ systemPrompt, tools, messages }` shape into the normalized
 * transcript a MODERN (0.86+) api consumes — the reverse mismatch, and just as
 * silent.
 *
 * WHY. DSH spans both generations (`dsh-llm-pi-ai` ≤0.2.0-rc.1 pins `^0.85.1`)
 * while this plugin may resolve a newer copy than its host. A LEGACY host never
 * normalizes, so it hands the api the legacy shape; a modern api reads the
 * prompt from a leading system message and the tools from its `toolsAdded`, and
 * never looks at the top-level fields — so both are dropped without a sound.
 * Verified against the published tarballs: the request that reaches the wire
 * carries no system turn and `tools: []`.
 *
 * Identity for anything already in transcript shape, and for a context with
 * neither a prompt nor tools (pi-ai's own `createInitialSystemMessage` returns
 * `undefined` there, keeping an empty transcript empty).
 */
export function adaptModernPiAiContext(context: Context): Context {
  if (context === null || typeof context !== 'object') return context
  const messages = Array.isArray(context.messages) ? context.messages : undefined
  if (messages === undefined) return context
  const prompt = context.systemPrompt
  const tools = Array.isArray(context.tools) && context.tools.length > 0 ? context.tools : undefined
  const hasPrompt = typeof prompt === 'string' && prompt.length > 0
  if (!hasPrompt && tools === undefined) return context

  const head: TranscriptSystemMessage = {
    role: 'system',
    content: prompt ?? '',
    ...tools === undefined ? {} : { toolsAdded: tools },
  }

  // `systemPrompt` is dropped: a modern api never reads it, and leaving it set
  // is what makes a later fold-up decide the context is already legacy-shaped.
  //
  // Prepend unconditionally, exactly as pi-ai's own `normalizeContext` does —
  // including for a MIXED context that already carries a system message, where
  // that reference implementation also prepends rather than replacing. Its
  // providers then collapse the two (`collapseSystemMessages`, joined with a
  // blank line) or keep both when the model accepts mid-conversation system
  // turns, so nothing is lost either way. Skipping the prepend when a system
  // message is already present would be the divergent choice: the top-level
  // prompt and its tools would be silently discarded. This function exists to
  // reconstruct what `normalizeContext` would have produced on a host that does
  // not call it, so it must not invent different semantics.
  const { systemPrompt: _lifted, tools: _liftedTools, ...rest } = context
  return { ...rest, messages: [head as unknown as Message, ...messages] }
}

/**
 * Wrap one pi-ai API module so BOTH stream entry points receive a context its
 * own generation can consume.
 *
 * The gate is the copy THIS plugin resolved (see {@link piAiRuntimeInfo}) —
 * what the host runs says nothing about it, because a nested copy on disk
 * shadows host injection and vice versa. The wrapping is cheap and lazy: only
 * `stream`/`streamSimple` are intercepted, the deferred-fetch entry points take
 * no context and are passed through untouched, and each adapter function is an
 * identity unless the context is actually the other generation's shape. So a
 * healthy install does one `Array.some` per request.
 */
export function withContextAdaptation(api: ProviderStreams, generation: PiAiGeneration): ProviderStreams {
  const adapt = generation === 'modern' ? adaptModernPiAiContext : adaptLegacyPiAiContext
  return {
    ...api,
    stream: (model, context, options) => api.stream(model, adapt(context), options),
    streamSimple: (model, context, options) => api.streamSimple(model, adapt(context), options),
  }
}

export interface TraeAdapterOptions {
  shim: TraeShim
  catalog: TraeCatalog
  /** Provider route id this instance serves; defaults to the CN route. */
  provider?: string
  /** pi-ai provider name and profile display name; defaults to the CN name. */
  displayName?: string
  resolveAttachments?: () => AttachmentStore | undefined
  /**
   * Override the resolved pi-ai generation (see {@link withContextAdaptation});
   * tests use it to exercise the combination this machine does not have
   * installed.
   */
  piAiGeneration?: PiAiGeneration
}

export interface TraeAdapter {
  adapter: PiAiAdapter
  invalidate(): void
}

export function createTraeAdapter(options: TraeAdapterOptions): TraeAdapter {
  const providerId = options.provider ?? TRAE_PROVIDER
  const providerName = options.displayName ?? 'Trae'
  // The generation gate: what THIS plugin resolves, not what the host runs.
  // Getting it from the host would be wrong in exactly the case that produced
  // issue #27 — a nested older copy shadows the host's newer one.
  const generation = options.piAiGeneration ?? piAiRuntimeInfo().generation
  const buildModels = (): Model<Api>[] => options.catalog.current()
    .map(info => toPiModel(info, `${options.shim.baseUrl()}/v1`, providerId))

  const base = createProvider({
    id: providerId,
    name: providerName,
    auth: {
      apiKey: {
        name: 'Trae loopback secret',
        async resolve({ credential }) {
          const apiKey = credential?.key
          return apiKey === undefined || apiKey.length === 0
            ? undefined
            : { auth: { apiKey }, source: 'Trae loopback' }
        },
      },
    },
    models: buildModels(),
    api: withContextAdaptation(openAICompletionsApi(), generation),
  })
  const provider: Provider = { ...base, getModels: () => buildModels() }
  const profile: ResolvedPiAiProviderProfile = {
    provider: providerId,
    displayName: providerName,
    streamIdleTimeoutMs: TRAE_STREAM_IDLE_TIMEOUT_MS,
    retryPolicy: resolveRetryPolicy(undefined, 'dsh-connect-trae retryPolicy'),
    configuredMaxTokens: new Map(),
    // DSH 0.1.5 made `modelErrors` a required field on this profile: the
    // adapter now consults it per model before a request and fails the call
    // with `INVALID_CONFIG` when the id is present. This plugin builds its
    // provider by hand from a live Trae catalog, so the kernel's own
    // catalog-resolution step (which populates this map) never runs for it;
    // an empty map states the correct fact — every served model is
    // serviceable. `piProvider` also became optional in 0.1.5, which this
    // hand-built profile still satisfies by always supplying it.
    modelErrors: new Map(),
    // Last-resort context capacity for any model row this route serves without
    // its own `contextWindow`. DSH rejects a model whose resolved window is not
    // a positive integer, and that rejection fails the WHOLE provider route, so
    // one unsized row would take an entire region offline (docs/ISSUE8_DIAGNOSIS.md).
    // Both fallback catalogs and live Trae rows now carry a real window, so this
    // value should never be consulted; it exists so that a future unsized row
    // degrades to one conservative model instead of a dead region.
    defaultContextWindow: FALLBACK_CONTEXT_WINDOW,
    ...REQUEST_IMAGE_BUDGETS,
    piProvider: provider,
  }
  // Replacing (not mutating) the map is what `invalidate` uses to force the
  // adapter's next profiles read to rebuild its snapshot.
  let profiles = new Map<string, ResolvedPiAiProviderProfile>([[providerId, profile]])
  const adapter = new PiAiAdapter({
    profiles: () => profiles,
    auth: INERT_AUTH,
    resolveApiKey: async () => options.shim.token(),
    ...options.resolveAttachments === undefined ? {} : { resolveAttachments: options.resolveAttachments },
  })

  return {
    adapter,
    invalidate() {
      profiles = new Map([[providerId, profile]])
    },
  }
}
