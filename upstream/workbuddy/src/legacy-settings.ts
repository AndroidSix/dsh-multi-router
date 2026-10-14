/**
 * The DSH 0.1.2–0.1.6 settings-section API, detected at runtime.
 *
 * Three generations of the host settings service have shipped:
 *
 * - **0.1.5 / 0.1.6** — `ctx.settings.installSection(...)` installs a schema
 *   section per namespace and reports edits back to the plugin.
 * - **0.1.7** — the section API was removed outright.
 * - **0.2.0** — the service was replaced by a Config-derived *forms* facade
 *   (`SettingsForms`: `describe`/`update`/`mutate`), which installs no
 *   sections at all and exposes only `.volatile()` fields of profile entries.
 *
 * Since 0.7.0 the peer range admits 0.2.0 cores only, so the 0.1.x branches
 * are structural compatibility inherited from the 0.6.x line — not a support
 * promise. The detection stays because it is what makes the guard honest on
 * whatever host generation actually loads this code.
 *
 * `installSection` is therefore not merely renamed — it is absent from the
 * 0.2.0 type entirely. That makes detection the only option, but a naive
 * probe is not typeable: `'installSection' in ctx.settings` and
 * `typeof ctx.settings.installSection` are both compile errors against
 * `SettingsForms`, because the property does not exist on the type to check.
 * Casting to `any` would silence the very drift this detection exists to
 * survive, so the probe goes through an unknown-typed view and a structural
 * narrowing instead: `unknown` is the honest type of a value whose shape
 * depends on the host generation, and the narrowing below is what turns it
 * back into something callable.
 *
 * Everything in here is deliberately structural and local: the plugin asks
 * whether the host *can* do the thing, and degrades to a settings-less
 * provider when it cannot — provider, picker, visibility, and the context rows
 * all keep working either way.
 *
 * @module dsh-workbuddy-connect/legacy-settings
 */

import type { Context } from '@deepseek-ai/cordis'
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings'
import type z from '@deepseek-ai/schemastery'

/** The shape a section installer hands back to this plugin. */
export interface LegacySectionHandlers<T> {
  /** Called with the section's live value source once the section is installed. */
  setSource(source: () => T): void
  /** Called after the section's value changed. */
  onChange(): void
}

/** The two members of the pre-0.1.7 settings service this plugin drives. */
export interface LegacySettingsApi {
  installSection<T>(
    ctx: Context,
    ns: SettingsNamespace,
    schema: z<T>,
    initial: T,
    handlers: LegacySectionHandlers<T>,
  ): void
  update(ns: SettingsNamespace, patch: object): Promise<void>
}

/**
 * Narrow one host settings service to the legacy section API, or `undefined`
 * when this host's generation does not carry it.
 *
 * Both members are required: a service with only `installSection` would let
 * this plugin install a section whose edits it could never persist, and the
 * maximum-context preference is written through `update`. A host that ships
 * neither is reported as `undefined` so the caller degrades in one place.
 *
 * @param settings - the host settings service, whose shape is generation-dependent.
 * @returns the legacy API when present, otherwise `undefined`.
 */
export function legacySettingsOf(settings: unknown): LegacySettingsApi | undefined {
  if (typeof settings !== 'object' || settings === null) return undefined
  const candidate = settings as { installSection?: unknown; update?: unknown }
  if (typeof candidate.installSection !== 'function') return undefined
  if (typeof candidate.update !== 'function') return undefined
  return settings as unknown as LegacySettingsApi
}
