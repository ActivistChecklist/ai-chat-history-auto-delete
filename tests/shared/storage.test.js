import { describe, it, expect } from 'vitest';
import { getStore } from '../helpers/chrome-mock.js';
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  getActivityHistory,
  clearActivityHistory,
  addActivityEntry,
  getLastRun,
  setLastRun,
  getPendingConfirm,
  setPendingConfirm,
  clearPendingConfirm,
  isOnboardingComplete,
  setOnboardingComplete
} from '../../src/shared/storage.js';

describe('DEFAULT_SETTINGS', () => {
  it('has expected shape', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      daysThreshold: 30,
      runFrequency: 'manual',
      autoConfirm: true,
      ignoreStarred: true,
      recordActivity: true,
      showDeletedCountAfterRun: true,
      provider: 'claude',
      enabledSites: { claude: true }
    });
  });
});

describe('getSettings', () => {
  it('returns defaults when nothing is stored', async () => {
    const settings = await getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('merges stored settings over defaults', async () => {
    const store = getStore();
    store.settings = { daysThreshold: 7, runFrequency: 'daily' };
    const settings = await getSettings();
    expect(settings.daysThreshold).toBe(7);
    expect(settings.runFrequency).toBe('daily');
    expect(settings.autoConfirm).toBe(true);
  });

  it('normalizes legacy runFrequency "every3days" to "weekly"', async () => {
    const store = getStore();
    store.settings = { runFrequency: 'every3days' };
    const settings = await getSettings();
    expect(settings.runFrequency).toBe('weekly');
  });

  it('resets invalid runFrequency to default', async () => {
    const store = getStore();
    store.settings = { runFrequency: 'bogus' };
    const settings = await getSettings();
    expect(settings.runFrequency).toBe('manual');
  });
});

describe('saveSettings', () => {
  it('persists settings to storage', async () => {
    const data = { daysThreshold: 14, runFrequency: 'weekly' };
    await saveSettings(data);
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ settings: data });
    const store = getStore();
    expect(store.settings).toEqual(data);
  });
});

describe('getActivityHistory', () => {
  it('returns empty array when nothing stored', async () => {
    const history = await getActivityHistory();
    expect(history).toEqual([]);
  });

  it('returns recent entries and filters out old ones', async () => {
    const now = Date.now();
    const recent = { timestamp: now - 1000, deletedCount: 5 };
    const old = { timestamp: now - 31 * 24 * 60 * 60 * 1000 - 1000, deletedCount: 3 };
    getStore().activity_history = [recent, old];
    const history = await getActivityHistory();
    expect(history).toHaveLength(1);
    expect(history[0].deletedCount).toBe(5);
  });
});

describe('clearActivityHistory', () => {
  it('sets activity_history to empty array', async () => {
    getStore().activity_history = [{ timestamp: Date.now(), deletedCount: 1 }];
    await clearActivityHistory();
    expect(getStore().activity_history).toEqual([]);
  });
});

describe('addActivityEntry', () => {
  it('prepends a new entry with timestamp', async () => {
    const before = Date.now();
    await addActivityEntry(10);
    const store = getStore();
    expect(store.activity_history).toHaveLength(1);
    expect(store.activity_history[0].deletedCount).toBe(10);
    expect(store.activity_history[0].timestamp).toBeGreaterThanOrEqual(before);
  });

  it('trims entries older than 30 days', async () => {
    const now = Date.now();
    getStore().activity_history = [
      { timestamp: now - 29 * 24 * 60 * 60 * 1000, deletedCount: 2 },
      { timestamp: now - 31 * 24 * 60 * 60 * 1000, deletedCount: 1 }
    ];
    await addActivityEntry(5);
    const store = getStore();
    const counts = store.activity_history.map((h) => h.deletedCount);
    expect(counts).toContain(5);
    expect(counts).toContain(2);
    expect(counts).not.toContain(1);
  });
});

describe('getLastRun / setLastRun', () => {
  it('returns null when nothing stored', async () => {
    expect(await getLastRun()).toBeNull();
  });

  it('stores and retrieves last run', async () => {
    const data = { deleted: 3, timestamp: Date.now() };
    await setLastRun(data);
    const result = await getLastRun();
    expect(result).toEqual(data);
  });
});

describe('getPendingConfirm / setPendingConfirm / clearPendingConfirm', () => {
  it('returns null when nothing stored', async () => {
    expect(await getPendingConfirm()).toBeNull();
  });

  it('stores and retrieves pending confirm', async () => {
    const data = { count: 5, timestamp: Date.now() };
    await setPendingConfirm(data);
    expect(await getPendingConfirm()).toEqual(data);
  });

  it('clears pending confirm', async () => {
    await setPendingConfirm({ count: 5, timestamp: Date.now() });
    await clearPendingConfirm();
    expect(await getPendingConfirm()).toBeNull();
  });
});

describe('isOnboardingComplete / setOnboardingComplete', () => {
  it('returns false when nothing stored', async () => {
    expect(await isOnboardingComplete()).toBe(false);
  });

  it('returns true after being set', async () => {
    await setOnboardingComplete(true);
    expect(await isOnboardingComplete()).toBe(true);
  });

  it('coerces truthy values to boolean', async () => {
    await setOnboardingComplete(1);
    expect(await isOnboardingComplete()).toBe(true);
    await setOnboardingComplete(0);
    expect(await isOnboardingComplete()).toBe(false);
  });
});
