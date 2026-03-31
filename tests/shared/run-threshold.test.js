import { describe, it, expect } from 'vitest';
import { resolveRunDaysThreshold, deletionCutoffMs } from '../../src/shared/run-threshold.js';

describe('resolveRunDaysThreshold', () => {
  it('uses daysOverride when provided (modal one-off run)', () => {
    expect(resolveRunDaysThreshold({ daysThreshold: 30 }, { daysOverride: 7 })).toBe(7);
    expect(resolveRunDaysThreshold({ daysThreshold: 90 }, { daysOverride: 1 })).toBe(1);
  });

  it('uses saved daysThreshold when daysOverride is omitted', () => {
    expect(resolveRunDaysThreshold({ daysThreshold: 30 }, {})).toBe(30);
    expect(resolveRunDaysThreshold({ daysThreshold: 14 }, { useSavedSettings: true })).toBe(14);
  });

  it('uses default 30 when settings missing', () => {
    expect(resolveRunDaysThreshold(undefined, {})).toBe(30);
    expect(resolveRunDaysThreshold({}, {})).toBe(30);
  });

  it('daysOverride null falls through to saved (same as ?? in background)', () => {
    expect(resolveRunDaysThreshold({ daysThreshold: 21 }, { daysOverride: null })).toBe(21);
  });
});

describe('deletionCutoffMs', () => {
  it('subtracts N days from now in ms', () => {
    const now = 1_700_000_000_000;
    const dayMs = 24 * 60 * 60 * 1000;
    expect(deletionCutoffMs(30, now)).toBe(now - 30 * dayMs);
    expect(deletionCutoffMs(7, now)).toBe(now - 7 * dayMs);
  });
});
