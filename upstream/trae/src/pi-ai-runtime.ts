/**
 * Which `@earendil-works/pi-ai` copy THIS plugin resolves at runtime, and which
 * context shape that copy consumes (issue #27).
 *
 * WHY THIS EXISTS. The plugin declares pi-ai as a peer, so the module it
 * imports is whatever the install provides — and the two generations consume
 * DIFFERENT context shapes:
 *
 * - **modern** (0.86+): every public entry point calls `normalizeContext()`
 *   once, so what reaches a provider is a normalized *transcript*:
 *   `{ messages: [ { role: 'system', content, toolsAdded }, … ] }`. The system
 *   prompt and the tool declarations live ONLY on that leading system message;
 *   the top-level `systemPrompt` / `tools` fields are gone, and the api never
 *   reads them back.
 * - **legacy** (≤0.85): expects `{ systemPrompt, tools, messages }` and has no
 *   branch for a `system` message inside `messages` at all. Its token estimator
 *   crashes on one — `estimateMessageTokens` iterates the string `content`
 *   character by character and reads `.name` off a character — and its wire
 *   converter silently drops it.
 *
 * The mismatch is reachable in BOTH directions, because DSH itself spans both
 * generations (`dsh-llm-pi-ai` ≤0.2.0-rc.1 declares `^0.85.1`; 0.2.0-rc.2 and
 * later declare `^0.87.1`, 0.2.1-alpha.2 declares `^1.0.2`), while this plugin
 * accepts the whole range (`>=0.1.7-rc.1 <0.3.0-0`). Whichever side is newer,
 * the other one is wrong:
 *
 * | host | resolved api | outcome |
 * |---|---|---|
 * | legacy | legacy | fine |
 * | legacy | modern | no crash, but prompt + tools silently LOST |
 * | modern | legacy | CRASH: `Cannot read properties of undefined (reading 'length')` |
 * | modern | modern | fine |
 *
 * THE BOUNDARY IS 0.86, NOT 0.87. Checked against the published tarballs:
 * `dist/utils/transcript.js` — and with it `normalizeContext`, the
 * `role === 'system'` estimator branch, and the switch away from reading
 * `systemPrompt`/`tools` — first appears in **0.86.0**. A `>= 0.87` gate
 * misclassifies 0.86.x as legacy and folds a context the modern api consumes
 * natively, which deletes the only carrier of the prompt and the tools.
 *
 * HOW the generation is decided, in order:
 *
 * 1. **The manifest version** of the copy this plugin resolved. Numeric semver
 *    comparison (`minor >= 86`), so `0.86.0` and the already-shipped `1.x` line
 *    both land on modern, and `0.9.0` correctly sorts below `0.86.0`.
 * 2. **The package's own layout**, when no version could be read: the transcript
 *    module sits at `dist/utils/transcript.js` (the exports map's
 *    `"./utils/*" → "./dist/utils/*.js"` convention is identical in every
 *    published generation, 0.82 through 1.x).
 *
 * Both checks are deliberately resolver-independent. `import.meta.resolve()` is
 * NOT used to answer this question: bundler-style resolvers (vite, and equally
 * `vitest` under it) expand the `"./utils/*"` wildcard to a path and return it
 * WITHOUT checking that the file exists, so a probe built on it answers "modern"
 * for 0.85.1 — the exact false positive that would leave issue #27 unfixed while
 * claiming to be capability-based. Reading the package directory cannot be
 * fooled that way.
 *
 * The version is therefore the primary signal, and it also keeps the gate
 * forward-compatible for free: a future 2.x needs no change here, whereas a
 * file-name check alone would have to know about it.
 *
 * @module dsh-connect-trae/pi-ai-runtime
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The context generation a resolved pi-ai api module speaks. */
export type PiAiGeneration = 'legacy' | 'modern'

/** What {@link piAiRuntimeInfo} reports about the resolved pi-ai copy. */
export interface PiAiRuntimeInfo {
  /** `modern` (0.86+: consumes normalized transcripts) or `legacy` (≤0.85 shape). */
  generation: PiAiGeneration
  /** Version of the resolved copy, when the manifest could be read. */
  version: string | undefined
  /** Package directory of the resolved copy, when it could be located. */
  resolvedFrom: string | undefined
  /**
   * Whether the copy could be inspected at all. `false` means pi-ai does not
   * resolve from this plugin — the normal state of a market install probed
   * OUTSIDE the DSH host, where the host supplies the module at plugin runtime.
   * Inside DSH the copy is always inspectable: a nested one shadows host
   * injection, and without a nested one the host supplies its own.
   */
  inspected: boolean
}

let cached: PiAiRuntimeInfo | undefined

/** Resolve (once) which pi-ai copy this plugin runs against. */
export function piAiRuntimeInfo(): PiAiRuntimeInfo {
  cached ??= inspectResolvedPiAi()
  return cached
}

function inspectResolvedPiAi(): PiAiRuntimeInfo {
  const entry = resolveModuleFile()
  const root = entry === undefined ? undefined : findPackageRoot(entry)
  const version = root === undefined ? undefined : readVersion(root)
  const transcriptPresent = root === undefined ? undefined : hasTranscriptModule(root)
  return {
    generation: decidePiAiGeneration(version, transcriptPresent),
    version,
    resolvedFrom: root,
    inspected: root !== undefined,
  }
}

/**
 * The generation decision table, exported so every branch is pinned by tests
 * rather than by a comment here — including the two this development tree can
 * never reach (no local copy, and a copy with no readable version), which are
 * exactly the states a market install founds its gate on.
 *
 * @param version - manifest version of the resolved copy, if readable.
 * @param transcriptPresent - whether that copy actually ships
 *   `dist/utils/transcript.js`; `undefined` when nothing was inspected.
 */
export function decidePiAiGeneration(
  version: string | undefined,
  transcriptPresent: boolean | undefined,
): PiAiGeneration {
  const byVersion = generationOf(version)
  if (byVersion !== undefined) return byVersion
  // No readable version: fall back to what the package layout actually contains.
  if (transcriptPresent === true) return 'modern'
  if (transcriptPresent === false) return 'legacy'
  // Not inspectable: outside the host there is no local copy, and every host
  // that normalizes contexts also ships the modern generation. Pass-through is
  // also the safe answer — it cannot destroy an already-correct context, and a
  // standalone probe never reaches a stream call to fold for. Choosing `legacy`
  // here would fold for a copy that may well be modern, deleting the only
  // carrier of the prompt and the tools.
  return 'modern'
}

/**
 * The generation a version string belongs to, or `undefined` when the string
 * cannot be read as a version at all.
 *
 * Only the minor of the `0.x` line matters for the boundary, and `major >= 1`
 * is modern by definition (1.0.x is already in use by `dsh-llm-pi-ai@0.2.1-alpha.2`
 * and consumes transcripts natively).
 */
export function generationOf(version: string | undefined): PiAiGeneration | undefined {
  if (version === undefined) return undefined
  const match = /^(\d+)\.(\d+)\./u.exec(version)
  if (match === null) return undefined
  const major = Number(match[1])
  const minor = Number(match[2])
  if (major > 0) return 'modern'
  return minor >= 86 ? 'modern' : 'legacy'
}

/**
 * Whether the resolved package actually contains the transcript module.
 *
 * `dist/utils/transcript.js` is the file every modern generation ships and no
 * legacy one has (checked: absent in 0.82.1 and 0.85.1; present in 0.86.0,
 * 0.86.1, 0.87.1 and 1.0.2). Landing on the file directly, rather than asking a
 * resolver to find it, is what keeps this honest under bundler-style resolution
 * — see the module docstring.
 */
function hasTranscriptModule(packageRoot: string): boolean {
  return existsSync(join(packageRoot, 'dist', 'utils', 'transcript.js'))
}

/**
 * The file the main entry resolved to; undefined when resolution itself fails.
 *
 * `import.meta.resolve` (not `require.resolve`): pi-ai's exports map exposes
 * "." under the `import` condition only, so the CJS resolver refuses the bare
 * specifier outright — the ESM resolver is the one this plugin actually imports
 * with, so it is also the one whose answer is meaningful here. Only the package
 * LOCATION is taken from it; the generation question is answered from disk.
 */
function resolveModuleFile(): string | undefined {
  try {
    return fileURLToPath(import.meta.resolve('@earendil-works/pi-ai'))
  } catch {
    return undefined
  }
}

/**
 * The package directory owning `moduleFile`: `dist/index.js` sits directly
 * inside the package, so walking up from the entry finds its manifest. The
 * manifest is claimed only when its `name` matches, so a same-named ancestor (a
 * pnpm virtual-store parent, for instance) cannot be misread.
 */
function findPackageRoot(moduleFile: string): string | undefined {
  let directory = dirname(moduleFile)
  for (let depth = 0; depth < 4; depth++) {
    if (readManifest(directory)?.name === '@earendil-works/pi-ai') return directory
    const parent = dirname(directory)
    if (parent === directory) return undefined
    directory = parent
  }
  return undefined
}

/** Version from the manifest already located by {@link findPackageRoot}. */
function readVersion(packageRoot: string): string | undefined {
  const version = readManifest(packageRoot)?.version
  return typeof version === 'string' ? version : undefined
}

function readManifest(directory: string): { name?: unknown, version?: unknown } | undefined {
  try {
    const parsed: unknown = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'))
    return typeof parsed === 'object' && parsed !== null ? parsed as { name?: unknown, version?: unknown } : undefined
  } catch {
    // No manifest here (or not JSON): the caller keeps walking up.
    return undefined
  }
}
