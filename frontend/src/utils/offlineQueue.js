/**
 * Offline action queue — persists critical API requests to localStorage
 * and replays them automatically when the network is restored.
 *
 * Usage:
 *   import { enqueue, queueSize, initOfflineQueue } from './utils/offlineQueue';
 *
 *   // Once at app startup — pass apiFetch so the queue can replay
 *   initOfflineQueue(apiFetch);
 *
 *   // When offline, store a request instead of failing
 *   const id = enqueue('/create-deal', { method:'POST', body: '...' }, 'Create Deal');
 */

const QUEUE_KEY   = 'aegibit_offline_queue';
const MAX_ENTRIES = 25;
const MAX_AGE_MS  = 24 * 60 * 60 * 1000; // drop entries older than 24 h

let _fetchFn  = null;
let _draining = false;

// ── Persistence ───────────────────────────────────────────────────────────────

function load() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
  catch { return []; }
}

function save(q) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }
  catch { /* storage quota exceeded — silently skip */ }
}

function pruned(q) {
  const cutoff = Date.now() - MAX_AGE_MS;
  return q.filter(e => e.ts >= cutoff);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Add a request to the queue. Returns the entry id, or null when the queue
 * is full (25 entries). Dispatches 'offlineQueueChanged' so UI can update.
 */
export function enqueue(path, options, label = '') {
  const q = pruned(load());
  if (q.length >= MAX_ENTRIES) return null;

  const id = `q${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  q.push({ id, path, options, label, ts: Date.now(), attempts: 0 });
  save(q);
  window.dispatchEvent(new CustomEvent('offlineQueueChanged', { detail: { size: q.length } }));
  return id;
}

/** Current number of pending entries. */
export function queueSize() {
  return pruned(load()).length;
}

/**
 * Replay all queued entries in order.
 * Safe to call multiple times — guards against concurrent drains and
 * skips immediately when offline or no fetch function is registered.
 */
export async function drain() {
  if (_draining || !navigator.onLine || !_fetchFn) return;

  const q = pruned(load());
  if (!q.length) return;

  _draining = true;
  window.dispatchEvent(new CustomEvent('offlineQueueDraining', { detail: { count: q.length } }));

  const failed = [];
  let succeeded = 0;

  for (const entry of q) {
    try {
      await _fetchFn(entry.path, entry.options);
      succeeded++;
      window.dispatchEvent(new CustomEvent('offlineQueueItemDone', {
        detail: { label: entry.label },
      }));
    } catch {
      // Keep entry only if it hasn't hit the per-entry attempt cap.
      // Entries that permanently fail (e.g. 400 Bad Request) are dropped
      // to avoid replay loops.
      if (entry.attempts < 3) {
        failed.push({ ...entry, attempts: entry.attempts + 1 });
      }
    }
  }

  save(failed);
  _draining = false;

  window.dispatchEvent(new CustomEvent('offlineQueueDrained', {
    detail: { succeeded, failed: failed.length },
  }));
  if (failed.length) {
    window.dispatchEvent(new CustomEvent('offlineQueueChanged', { detail: { size: failed.length } }));
  }
}

/**
 * Register the fetch function and attach the online→drain listener.
 * Call once at module load time, passing `apiFetch` from api.js.
 */
export function initOfflineQueue(fetchFn) {
  _fetchFn = fetchFn;
  window.addEventListener('online', drain);
}
