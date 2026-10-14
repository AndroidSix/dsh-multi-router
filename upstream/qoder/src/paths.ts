/**
 * The plugin's data directory — the ONE place every file the plugin owns
 * lives.
 *
 * Layout: `<profile>/.dsh-qoder-connect/state/` (the profile discovered
 * the same way the credential store always did). Everything — PAT files,
 * saved catalogs, probe records, the host heartbeat, and the machine-id
 * seed — writes there, so a profile directory never collects loose
 * `.qoder-*` files and the whole plugin's footprint is one folder.
 *
 * Fallbacks, in order: `DSH_QODER_DATA_DIR` env override → the discovered
 * profile → the Harness home (a checkout running its own tests, or a host
 * loading the plugin from outside any profile).
 *
 * Split out of `auth.ts` so catalog/probe/heartbeat stores can import the
 * directory without pulling in the credential code (and its upstream
 * dependency) — these modules stay leaf-light on purpose.
 *
 * @module dsh-qoder-connect/paths
 */

import { readFileSync, readdirSync, realpathSync, type Dirent } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'

/** The per-profile directory the plugin's data folder lives under. */
export const QODER_DATA_DIR_NAME = '.dsh-qoder-connect'

/** The directory inside the data dir where the rebuildable state files live. */
export const QODER_STATE_DIR_NAME = 'state'

/** Environment override for the whole data directory. */
export const QODER_DATA_DIR_ENV = 'DSH_QODER_DATA_DIR'

const PROFILES_DIR_NAME = 'profiles'

/** The npm name of this package, as a profile's manifest declares it. */
const PLUGIN_PACKAGE_NAME = 'dsh-qoder-connect'

function pluginPackageRoot(): string | undefined {
  try {
    // `<root>/lib/paths.js` in a build, `<root>/src/paths.ts` from source.
    return dirname(dirname(fileURLToPath(import.meta.url)))
  } catch {
    // Not loaded from a file URL (a bundled or synthetic module).
    return undefined
  }
}

/**
 * Whether a profile directory declares this plugin.
 *
 * Read from the profile's manifest rather than inferred from this module's own
 * location, because DSH installs a plugin into a profile by *link*: the manifest
 * carries `"dsh-qoder-connect": "link:/path/to/checkout"`, while Node
 * resolves the module to that real path, which lies outside `$DSH_HOME` entirely.
 * Walking up from the module would therefore miss the profile for exactly the
 * install shape a developer uses.
 */
function profileDeclaresPlugin(profileDir: string): boolean {
  try {
    const manifest = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, unknown>
      devDependencies?: Record<string, unknown>
    }
    return typeof manifest.dependencies?.[PLUGIN_PACKAGE_NAME] === 'string'
      || typeof manifest.devDependencies?.[PLUGIN_PACKAGE_NAME] === 'string'
  } catch {
    // Not a profile, or unreadable: it simply is not a candidate.
    return false
  }
}

/**
 * Whether a profile's installed copy of this plugin resolves to this package.
 *
 * This is what separates two profiles that both declare the plugin — a `web` and
 * a `desktop` profile can each list it — so the data directory follows the
 * profile whose copy is actually running rather than the first one found.
 */
function profileLinksToThisPackage(profileDir: string): boolean {
  const own = pluginPackageRoot()
  if (own === undefined) return false
  try {
    return realpathSync(join(profileDir, 'node_modules', PLUGIN_PACKAGE_NAME)) === realpathSync(own)
  } catch {
    // No installed copy, or an unreadable link.
    return false
  }
}

/**
 * The profile directory this plugin belongs to, or undefined when none can be
 * determined.
 *
 * A single declaring profile is accepted without the link test, so a normal
 * (non-linked) install still resolves.
 */
function discoverProfileDir(): string | undefined {
  const profilesRoot = join(resolveDshHome(), PROFILES_DIR_NAME)
  let entries: Dirent[]
  try {
    entries = readdirSync(profilesRoot, { withFileTypes: true })
  } catch {
    // No profiles directory at all: nothing to discover.
    return undefined
  }
  const candidates: string[] = []
  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
    const dir = join(profilesRoot, entry.name)
    if (profileDeclaresPlugin(dir)) candidates.push(dir)
  }
  if (candidates.length === 0) return undefined
  if (candidates.length === 1) return candidates[0]
  return candidates.find(candidate => profileLinksToThisPackage(candidate))
}

/**
 * The plugin's data directory: `<profile>/.dsh-qoder-connect`.
 *
 * Falls back to the Harness home when no profile can be discovered — a
 * checkout running its own tests, or a host that loads the plugin from
 * outside a profile — so the plugin always has somewhere to write, and
 * `DSH_QODER_DATA_DIR` overrides either way.
 */
export function qoderPluginDataDir(): string {
  const override = process.env[QODER_DATA_DIR_ENV]
  if (override !== undefined && override.trim() !== '') return override
  const base = discoverProfileDir() ?? resolveDshHome()
  return join(base, QODER_DATA_DIR_NAME)
}

/**
 * The directory the rebuildable state files live in:
 * `<data dir>/state/` (saved catalogs, probe records, the host heartbeat).
 */
export function qoderStateDir(): string {
  return join(qoderPluginDataDir(), QODER_STATE_DIR_NAME)
}

/**
 * The plugin-owned seed for the Qoder transport's machine id.
 *
 * The transport's `getMachineId(paths)` helper reads a list of trusted
 * locations and writes its created UUID into the last one; this is the
 * DSH-side location the host wires into that chain, so the identifier stays
 * inside the plugin's own folder instead of scattering files near `$HOME`.
 */
export function qoderMachineIdPath(): string {
  return join(qoderStateDir(), '.qoder-machine-id')
}
