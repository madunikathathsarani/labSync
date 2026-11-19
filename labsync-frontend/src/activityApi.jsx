const API_BASE = 'http://localhost:8080';
const KEY = 'labsync_actor';

// Remembers who is signed in
export const setActor = (userId) => {
  try {
    if (userId) localStorage.setItem(KEY, userId);
    else localStorage.removeItem(KEY);
  } catch (e) { /* ignore */ }
};

export const getActor = () => {
  try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; }
};

// Every request to the backend now carries "X-User-Id", so the Activity Log can show who did it
if (typeof window !== 'undefined' && !window.__labsyncFetchPatched) {
  window.__labsyncFetchPatched = true;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const actor = getActor();
    if (actor && url.startsWith(API_BASE)) {
      const headers = new Headers(init.headers || {});
      headers.set('X-User-Id', actor);
      init = { ...init, headers };
    }
    return nativeFetch(input, init);
  };
}

// Reports an event the server cannot see by itself (sign-in, sign-out)
export const logActivity = (userId, details) => {
  fetch(`${API_BASE}/api/activity-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: userId || getActor() || null, actionDetails: details }),
  }).catch(() => {});
};