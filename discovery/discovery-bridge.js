const LOG_KEY = 'discovery_logs';

window.addEventListener('message', (e) => {
  if (e.data?.type === 'CLAUDE_DISCOVERY_LOGS' && Array.isArray(e.data.logs)) {
    chrome.storage.local.set({ [LOG_KEY]: e.data.logs.slice(-500) });
  }
});
