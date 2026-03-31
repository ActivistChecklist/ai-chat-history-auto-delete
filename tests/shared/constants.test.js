import { describe, it, expect } from 'vitest';
import {
  DEBUG,
  DEFAULT_DAYS_THRESHOLD,
  DEFAULT_RUN_FREQUENCY,
  DEFAULT_AUTO_CONFIRM,
  DEFAULT_IGNORE_STARRED,
  DEFAULT_RECORD_ACTIVITY,
  DEFAULT_SHOW_DELETED_COUNT_AFTER_RUN,
  DEFAULT_PROVIDER,
  DEFAULT_ENABLED_SITES,
  RUN_FREQUENCIES,
  VALID_RUN_FREQUENCIES,
  CHAT_PAGE_LIMIT,
  PAGINATION_DELAY_MS,
  DELETE_BATCH_SIZE,
  DELETE_BATCH_DELAY_MS,
  MAX_RETRIES,
  RATE_LIMIT_BACKOFF_MS,
  STORAGE_KEYS,
  ALARM_NAME,
  ONBOARDING_PAGE
} from '../../src/shared/constants.js';

describe('constants', () => {
  it('exports expected default values', () => {
    expect(DEFAULT_DAYS_THRESHOLD).toBe(30);
    expect(DEFAULT_RUN_FREQUENCY).toBe('manual');
    expect(DEFAULT_AUTO_CONFIRM).toBe(true);
    expect(DEFAULT_IGNORE_STARRED).toBe(true);
    expect(DEFAULT_RECORD_ACTIVITY).toBe(true);
    expect(DEFAULT_SHOW_DELETED_COUNT_AFTER_RUN).toBe(true);
    expect(DEFAULT_PROVIDER).toBe('claude');
    expect(DEFAULT_ENABLED_SITES).toEqual({ claude: true });
  });

  it('DEBUG is a boolean', () => {
    expect(typeof DEBUG).toBe('boolean');
  });

  it('RUN_FREQUENCIES has correct keys and structure', () => {
    expect(Object.keys(RUN_FREQUENCIES)).toEqual(['manual', 'daily', 'weekly', 'monthly']);
    expect(RUN_FREQUENCIES.manual.minutes).toBeNull();
    expect(RUN_FREQUENCIES.daily.minutes).toBe(24 * 60);
    expect(RUN_FREQUENCIES.weekly.minutes).toBe(7 * 24 * 60);
    expect(RUN_FREQUENCIES.monthly.minutes).toBe(30 * 24 * 60);
    Object.values(RUN_FREQUENCIES).forEach((f) => {
      expect(f).toHaveProperty('label');
      expect(typeof f.label).toBe('string');
    });
  });

  it('VALID_RUN_FREQUENCIES matches RUN_FREQUENCIES keys', () => {
    expect(VALID_RUN_FREQUENCIES).toEqual(Object.keys(RUN_FREQUENCIES));
  });

  it('exports numeric constants with sane values', () => {
    expect(CHAT_PAGE_LIMIT).toBeGreaterThan(0);
    expect(PAGINATION_DELAY_MS).toBeGreaterThan(0);
    expect(DELETE_BATCH_SIZE).toBeGreaterThan(0);
    expect(DELETE_BATCH_DELAY_MS).toBeGreaterThan(0);
    expect(MAX_RETRIES).toBeGreaterThanOrEqual(1);
    expect(RATE_LIMIT_BACKOFF_MS).toBeInstanceOf(Array);
    expect(RATE_LIMIT_BACKOFF_MS.length).toBeGreaterThan(0);
    RATE_LIMIT_BACKOFF_MS.forEach((ms) => expect(ms).toBeGreaterThan(0));
  });

  it('STORAGE_KEYS has all required keys', () => {
    const required = [
      'SETTINGS', 'OPTIONS_PENDING_HASH', 'ACTIVITY_HISTORY', 'LAST_RUN', 'PENDING_CONFIRM',
      'DELETION_PROGRESS', 'CACHED_ORG_ID', 'ONBOARDING_COMPLETE', 'TOP_BAR_DISMISSED_RUN'
    ];
    required.forEach((key) => {
      expect(STORAGE_KEYS).toHaveProperty(key);
      expect(typeof STORAGE_KEYS[key]).toBe('string');
    });
  });

  it('ALARM_NAME is a non-empty string', () => {
    expect(typeof ALARM_NAME).toBe('string');
    expect(ALARM_NAME.length).toBeGreaterThan(0);
  });

  it('ONBOARDING_PAGE is a valid path', () => {
    expect(ONBOARDING_PAGE).toMatch(/\.html$/);
  });
});
