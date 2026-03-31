import { describe, it, expect } from 'vitest';
import { syncAlarmFromSettings } from '../../src/shared/alarms.js';
import { ALARM_NAME } from '../../src/shared/constants.js';

describe('syncAlarmFromSettings', () => {
  it('clears existing alarm', () => {
    syncAlarmFromSettings({ runFrequency: 'manual' });
    expect(chrome.alarms.clear).toHaveBeenCalledWith(ALARM_NAME);
  });

  it('does not create alarm for manual frequency', () => {
    syncAlarmFromSettings({ runFrequency: 'manual' });
    expect(chrome.alarms.create).not.toHaveBeenCalled();
  });

  it('creates alarm for daily frequency', () => {
    syncAlarmFromSettings({ runFrequency: 'daily' });
    expect(chrome.alarms.create).toHaveBeenCalledWith(ALARM_NAME, { periodInMinutes: 60 });
  });

  it('creates alarm for weekly frequency', () => {
    syncAlarmFromSettings({ runFrequency: 'weekly' });
    expect(chrome.alarms.create).toHaveBeenCalledWith(ALARM_NAME, { periodInMinutes: 60 });
  });

  it('creates alarm for monthly frequency', () => {
    syncAlarmFromSettings({ runFrequency: 'monthly' });
    expect(chrome.alarms.create).toHaveBeenCalledWith(ALARM_NAME, { periodInMinutes: 60 });
  });

  it('does not create alarm for unknown frequency', () => {
    syncAlarmFromSettings({ runFrequency: 'unknown' });
    expect(chrome.alarms.create).not.toHaveBeenCalled();
  });
});
