import {
  DEFAULT_DAYS_THRESHOLD,
  DEFAULT_RUN_FREQUENCY,
  DEFAULT_AUTO_CONFIRM,
  DEFAULT_IGNORE_STARRED,
  DEFAULT_RECORD_ACTIVITY,
  DEFAULT_SHOW_DELETED_COUNT_AFTER_RUN,
  DEFAULT_PROVIDER,
  DEFAULT_ENABLED_SITES,
  STORAGE_KEYS,
  VALID_RUN_FREQUENCIES
} from './constants.js';

const LEGACY_RUN_FREQUENCY = {
  every3days: 'weekly'
};

export const DEFAULT_SETTINGS = {
  daysThreshold: DEFAULT_DAYS_THRESHOLD,
  runFrequency: DEFAULT_RUN_FREQUENCY,
  autoConfirm: DEFAULT_AUTO_CONFIRM,
  ignoreStarred: DEFAULT_IGNORE_STARRED,
  recordActivity: DEFAULT_RECORD_ACTIVITY,
  showDeletedCountAfterRun: DEFAULT_SHOW_DELETED_COUNT_AFTER_RUN,
  provider: DEFAULT_PROVIDER,
  enabledSites: DEFAULT_ENABLED_SITES
};

export async function getSettings() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  const merged = { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] };
  if (LEGACY_RUN_FREQUENCY[merged.runFrequency]) {
    merged.runFrequency = LEGACY_RUN_FREQUENCY[merged.runFrequency];
  }
  if (!VALID_RUN_FREQUENCIES.includes(merged.runFrequency)) {
    merged.runFrequency = DEFAULT_RUN_FREQUENCY;
  }
  return merged;
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
}

const ACTIVITY_HISTORY_DAYS = 30;

export async function getActivityHistory() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.ACTIVITY_HISTORY);
  const history = result[STORAGE_KEYS.ACTIVITY_HISTORY] || [];
  const cutoff = Date.now() - ACTIVITY_HISTORY_DAYS * 24 * 60 * 60 * 1000;
  return history.filter((h) => h.timestamp > cutoff);
}

export async function clearActivityHistory() {
  await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVITY_HISTORY]: [] });
}

export async function addActivityEntry(deletedCount) {
  const history = await getActivityHistory();
  history.unshift({
    timestamp: Date.now(),
    deletedCount
  });
  const cutoff = Date.now() - ACTIVITY_HISTORY_DAYS * 24 * 60 * 60 * 1000;
  const trimmed = history.filter((h) => h.timestamp > cutoff);
  await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVITY_HISTORY]: trimmed });
}

export async function getLastRun() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.LAST_RUN);
  return result[STORAGE_KEYS.LAST_RUN] || null;
}

export async function setLastRun(result) {
  await chrome.storage.local.set({ [STORAGE_KEYS.LAST_RUN]: result });
}

export async function getPendingConfirm() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.PENDING_CONFIRM);
  return result[STORAGE_KEYS.PENDING_CONFIRM] || null;
}

export async function setPendingConfirm(data) {
  await chrome.storage.local.set({ [STORAGE_KEYS.PENDING_CONFIRM]: data });
}

export async function clearPendingConfirm() {
  await chrome.storage.local.remove(STORAGE_KEYS.PENDING_CONFIRM);
}

export async function isOnboardingComplete() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.ONBOARDING_COMPLETE);
  return result[STORAGE_KEYS.ONBOARDING_COMPLETE] === true;
}

export async function setOnboardingComplete(done) {
  await chrome.storage.local.set({ [STORAGE_KEYS.ONBOARDING_COMPLETE]: !!done });
}
