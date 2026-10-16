import test from 'node:test';
import assert from 'node:assert/strict';
import { modelInfo } from '../lib/manager.js';
import { qoderContextModel } from '../lib/clients.js';

test('catalog normalization retains all context tiers and defaults to the largest advertised window', () => {
  for (const raw of [
    { contextWindow: 200000, maxContextWindow: 1000000 },
    { contextWindow: 300000, supportedContextWindows: [300000, 600000, 1000000] },
  ]) {
    const model = modelInfo({ id: 'model', maxTokens: 128000, ...raw });
    assert.equal(model.contextWindow, 1000000);
    assert.equal(model.maxContextWindow, 1000000);
    assert.equal(model.defaultContextWindow, raw.contextWindow);
    assert.ok(model.supportedContextWindows.includes(raw.contextWindow));
    assert.ok(model.supportedContextWindows.includes(1000000));
    assert.deepEqual(modelInfo(model), model); // Loading a persisted catalog cannot shrink it again.
  }
});

test('Qoder requests select real wire tiers independently, without mutating concurrent requests', () => {
  const raw = { id: 'qmodel_38max', contextWindow: 200000, contextOptions: {
    normal: { tokenCount: 200000, isDefault: true }, medium: { tokenCount: 500000, isDefault: false },
    max: { tokenCount: 1000000, isDefault: false },
  } };
  const original = structuredClone(raw);
  const maximum = qoderContextModel(raw), normal = qoderContextModel(raw, 200000), between = qoderContextModel(raw, 300000);
  const selected = m => Object.entries(m.contextOptions).filter(([, v]) => v.isDefault).map(([k]) => k);
  assert.deepEqual(selected(maximum), ['max']);
  assert.deepEqual(selected(normal), ['normal']);
  assert.deepEqual(selected(between), ['medium']);
  assert.deepEqual(selected(maximum), ['max']);
  assert.deepEqual(raw, original);
  assert.throws(() => qoderContextModel(raw, 1000001), /context_window_unavailable/);
});
