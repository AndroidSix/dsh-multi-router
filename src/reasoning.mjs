export const REASONING_EFFORTS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];

// Keep declared modes only. A fixed-thinking model without a declared set uses platform default.
export function reasoningModes(model, provider) {
  const r = model?.reasoning;
  if (!r || (r.supports !== true && !Array.isArray(r.supported))) return [];
  const declared = r.supportedEfforts ?? r.supported ?? [];
  const disable = r.canDisableThinking === true || declared.includes('off');
  const off = disable && !(provider === 'workbuddy' && r.onlyReasoning === true);
  return REASONING_EFFORTS.filter(e => e === 'off' ? off : declared.includes(e));
}

export function routeReasoning(models) {
  const efforts = REASONING_EFFORTS.filter(e => models.some(({ model, provider }) => reasoningModes(model, provider).includes(e)));
  if (!efforts.length) return undefined;
  return { supports: true, supportedEfforts: efforts, canDisableThinking: efforts.includes('off'),
    defaultEffort: efforts.includes('high') ? 'high' : efforts[0] };
}
