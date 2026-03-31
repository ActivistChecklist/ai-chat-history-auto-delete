/**
 * DISCOVERY MODE - Delete this folder before release.
 * Intercepts fetch and XHR on claude.ai. Browse the chat list, paginate, delete a chat.
 * Run __claudeDiscoveryExportSummary() for a compact output (~few KB) to share.
 */

const MAX_BODY_LENGTH = 800;

const logs = [];
const seenPatterns = new Set();

function truncate(str, max = MAX_BODY_LENGTH) {
  if (typeof str !== 'string') return str;
  return str.length > max ? str.slice(0, max) + '...[truncated]' : str;
}

/** Normalize URL to pattern: /api/organizations/org-xxx/... -> /api/organizations/:orgId/... */
function urlToPattern(urlStr) {
  try {
    const u = new URL(urlStr);
    let path = u.pathname
      .replace(/\/org-[a-z0-9-]+/gi, '/:orgId')
      .replace(/\/conv-[a-z0-9-]+/gi, '/:chatId')
      .replace(/\/[a-f0-9-]{20,}/gi, '/:id');
    const q = u.searchParams.toString();
    return q ? `${path}?${q.split('&').map((p) => p.split('=')[0]).sort().join('&')}` : path;
  } catch {
    return urlStr;
  }
}

function getPatternKey(type, method, url) {
  return `${type}:${method}:${urlToPattern(url)}`;
}

function log(entry, skipIfDuplicate) {
  const key = entry._patternKey || getPatternKey(entry.type, entry.method || 'GET', entry.url || '');
  if (skipIfDuplicate && seenPatterns.has(key)) return;
  if (skipIfDuplicate) seenPatterns.add(key);

  const record = { ...entry, timestamp: new Date().toISOString() };
  delete record._patternKey;
  logs.push(record);
  console.log('[Claude API Discovery]', record);
}

/** Extract minimal structure from JSON for provider update - no full content */
function summarizeBody(bodyStr, isResponse) {
  if (!bodyStr || typeof bodyStr !== 'string') return null;
  const trimmed = bodyStr.replace(/\.\.\.\[truncated\]$/, '');
  try {
    const data = JSON.parse(trimmed);
    if (Array.isArray(data)) {
      return { _type: 'array', length: data.length, sampleKeys: data[0] ? Object.keys(data[0]) : [] };
    }
    if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data);
      const summary = { _keys: keys };
      for (const k of keys) {
        const v = data[k];
        if (Array.isArray(v)) {
          summary[k] = { _type: 'array', length: v.length, sampleKeys: v[0] ? Object.keys(v[0]) : [] };
        } else if (v && typeof v === 'object') {
          summary[k] = { _type: 'object', keys: Object.keys(v) };
        } else {
          summary[k] = typeof v;
        }
      }
      return summary;
    }
    return { _type: typeof data };
  } catch {
    return isResponse ? truncate(bodyStr, 200) : truncate(bodyStr, 200);
  }
}

const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const [url, options = {}] = args;
  const urlStr = typeof url === 'string' ? url : url?.url || String(url);
  if (!urlStr.includes('claude.ai')) {
    return originalFetch.apply(this, args);
  }
  const reqBody = options.body ? String(options.body) : null;
  log({
    type: 'fetch',
    method: options.method || 'GET',
    url: urlStr,
    requestBody: reqBody ? truncate(reqBody) : null
  }, true);
  try {
    const res = await originalFetch.apply(this, args);
    const clone = res.clone();
    let resBody;
    try {
      resBody = await clone.text();
    } catch {
      resBody = '[binary or error]';
    }
    log({
      type: 'fetch_response',
      method: options.method || 'GET',
      url: urlStr,
      status: res.status,
      responseBody: truncate(resBody),
      _summary: summarizeBody(resBody, true)
    }, true);
    return res;
  } catch (err) {
    log({ type: 'fetch_error', url: urlStr, error: String(err) });
    throw err;
  }
};

const XHROpen = XMLHttpRequest.prototype.open;
const XHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function (method, url) {
  this._discovery = { method, url };
  return XHROpen.apply(this, arguments);
};

XMLHttpRequest.prototype.send = function (body) {
  const { method, url } = this._discovery || {};
  if (url && url.includes('claude.ai')) {
    log({
      type: 'xhr',
      method: method || 'GET',
      url,
      requestBody: body ? truncate(String(body)) : null
    }, true);
    this.addEventListener('load', function () {
      let resBody;
      try {
        resBody = this.responseText;
      } catch {
        resBody = '[parse error]';
      }
      log({
        type: 'xhr_response',
        method: method || 'GET',
        url,
        status: this.status,
        responseBody: truncate(resBody),
        _summary: summarizeBody(resBody, true)
      }, true);
    });
  }
  return XHRSend.apply(this, arguments);
};

setInterval(() => {
  if (logs.length > 0) {
    window.postMessage({ type: 'CLAUDE_DISCOVERY_LOGS', logs: [...logs] }, '*');
  }
}, 5000);

/** Full export (can still be large if many unique endpoints) */
window.__claudeDiscoveryExport = function () {
  return JSON.stringify(logs, null, 2);
};

/**
 * Compact summary for provider update - only unique endpoints with structure, no full bodies.
 * Use this instead of __claudeDiscoveryExport() when sharing (typically < 10KB).
 */
window.__claudeDiscoveryExportSummary = function () {
  const byPattern = new Map();
  for (const entry of logs) {
    const pattern = urlToPattern(entry.url || '');
    const baseKey = `${entry.method || 'GET'}:${pattern}`;
    const isResponse = entry.type === 'fetch_response' || entry.type === 'xhr_response';
    if (!byPattern.has(baseKey)) {
      byPattern.set(baseKey, {
        method: entry.method || 'GET',
        urlPattern: pattern,
        sampleUrl: entry.url,
        requestSummary: null,
        responseSummary: null,
        status: null
      });
    }
    const rec = byPattern.get(baseKey);
    if (isResponse) {
      rec.responseSummary = entry._summary || (entry.responseBody ? summarizeBody(entry.responseBody, true) : null);
      rec.status = entry.status;
    } else {
      rec.requestSummary = entry.requestBody ? summarizeBody(entry.requestBody, false) : null;
    }
  }
  const summary = {
    _note: 'Use this to update src/providers/claude.js - endpoints and response structure',
    endpoints: [...byPattern.values()]
  };
  return JSON.stringify(summary, null, 2);
};

console.log('[Claude API Discovery] Loaded. Browse: open chat list, paginate, delete a chat. Then run __claudeDiscoveryExportSummary() and share the output (compact).');