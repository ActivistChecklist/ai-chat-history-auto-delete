/**
 * Resolves the day threshold for a single deletion run (matches background RUN_NOW options).
 * When `options.daysOverride` is set (e.g. from the top-bar modal), it wins over saved settings.
 */
export function resolveRunDaysThreshold(settings, options = {}) {
  const saved = settings?.daysThreshold ?? 30;
  return options.daysOverride ?? saved;
}

/** Milliseconds for the age cutoff used when filtering chats (fixed `now` for tests). */
export function deletionCutoffMs(daysThreshold, nowMs = Date.now()) {
  return nowMs - daysThreshold * 24 * 60 * 60 * 1000;
}
