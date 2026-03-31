import { ALARM_NAME, RUN_FREQUENCIES } from './constants.js';

export function syncAlarmFromSettings(settings) {
  chrome.alarms.clear(ALARM_NAME);
  const freq = RUN_FREQUENCIES[settings.runFrequency];
  if (freq?.minutes) {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 60 });
  }
}
