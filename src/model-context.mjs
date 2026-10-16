const positive = n => Number.isSafeInteger(n) && n > 0;

// Preserve native/default tiers separately from the local DSH budget.
export function contextInfo(model) {
  const defaultContextWindow = positive(model.defaultContextWindow) ? model.defaultContextWindow
    : positive(model.contextWindow) ? model.contextWindow : 200000;
  const supportedContextWindows = [...new Set([defaultContextWindow, model.contextWindow, model.maxContextWindow,
    ...(Array.isArray(model.supportedContextWindows) ? model.supportedContextWindows : [])].filter(positive))].sort((a, b) => a - b);
  const maxContextWindow = supportedContextWindows.at(-1);
  return { defaultContextWindow, supportedContextWindows, maxContextWindow, contextWindow: maxContextWindow };
}

export function resolveContext(models, selected, fallback = 200000) {
  const infos = models.map(contextInfo);
  const maxContextWindow = infos.length ? Math.max(...infos.map(m => m.maxContextWindow)) : fallback;
  const contextWindow = positive(selected) ? Math.min(selected, maxContextWindow) : maxContextWindow;
  return { maxContextWindow, contextWindow, contextKnown: infos.length > 0, configuredContextWindow: positive(selected) ? selected : null,
    supportedContextWindows: [...new Set([contextWindow, ...infos.flatMap(m => m.supportedContextWindows)])].sort((a, b) => a - b) };
}

// Select the smallest real wire tier that can honour a local budget. Never mutate
// the shared discovered catalog: concurrent routes may request different tiers.
export function qoderContextModel(model, budget) {
  if (!model?.contextOptions) return model;
  const entries = Object.entries(model.contextOptions).filter(([, v]) => positive(v.tokenCount)).sort((a, b) => a[1].tokenCount - b[1].tokenCount);
  if (!entries.length) return model;
  const selected = budget == null ? entries.at(-1) : entries.find(([, v]) => v.tokenCount >= budget);
  if (!selected) throw Object.assign(Error('context_window_unavailable'), { status: 400, code: 'context_window_unavailable' });
  return { ...model, contextWindow: selected[1].tokenCount,
    contextOptions: Object.fromEntries(Object.entries(model.contextOptions).map(([key, value]) => [key, { ...value, isDefault: key === selected[0] }])) };
}
