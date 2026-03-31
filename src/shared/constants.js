export const DEBUG = true;

export const DEFAULT_DAYS_THRESHOLD = 30;
export const DEFAULT_RUN_FREQUENCY = 'manual';
export const DEFAULT_AUTO_CONFIRM = true;
export const DEFAULT_IGNORE_STARRED = true;
export const DEFAULT_RECORD_ACTIVITY = true;
/** When true, show the top bar briefly after each run with deletion count (default UX). */
export const DEFAULT_SHOW_DELETED_COUNT_AFTER_RUN = true;
export const DEFAULT_PROVIDER = 'claude';
export const DEFAULT_ENABLED_SITES = { claude: true };

export const RUN_FREQUENCIES = {
  manual: { label: 'Manual only', minutes: null },
  daily: { label: 'Daily', minutes: 24 * 60 },
  weekly: { label: 'Weekly', minutes: 7 * 24 * 60 },
  monthly: { label: 'Monthly', minutes: 30 * 24 * 60 }
};

/** Frequencies we persist; anything else is normalized in getSettings() */
export const VALID_RUN_FREQUENCIES = Object.keys(RUN_FREQUENCIES);

export const CHAT_PAGE_LIMIT = 100;
export const PAGINATION_DELAY_MS = 600;
export const DELETE_BATCH_SIZE = 5;
export const DELETE_BATCH_DELAY_MS = 1000;
export const MAX_RETRIES = 3;
export const RATE_LIMIT_BACKOFF_MS = [2000, 4000, 8000];

export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  /** Set by background before opening options; options page reads and scrolls, then clears */
  OPTIONS_PENDING_HASH: 'options_pending_hash',
  ACTIVITY_HISTORY: 'activity_history',
  LAST_RUN: 'last_run',
  PENDING_CONFIRM: 'pending_confirm',
  DELETION_PROGRESS: 'deletion_progress',
  CACHED_ORG_ID: 'cached_org_id',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  TOP_BAR_DISMISSED_RUN: 'top_bar_dismissed_run'
};

export const ALARM_NAME = 'auto-delete-check';

/** Full path under extension root — use with chrome.runtime.getURL() */
export const ONBOARDING_PAGE = 'src/onboarding/onboarding.html';
