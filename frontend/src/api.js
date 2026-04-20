/**
 * AEGIBIT Flow — API Client (Cookie Auth Edition)
 *
 * Security model:
 *   - Zero tokens in JavaScript / localStorage
 *   - Auth handled entirely via HTTP-only cookies set by the server
 *   - credentials: "include" on every request so the browser sends the cookie
 *   - XSS cannot steal the session — cookie is invisible to JS
 *
 * Reliability:
 *   - 15-second request timeout with specific "server slow" message
 *   - Retry: max 2 attempts, 300ms → 800ms backoff, network/5xx only
 *   - navigator.onLine offline check before every request
 *   - Standard response envelope unwrapping ({ success, data, error, request_id })
 *   - X-Request-ID per request for support tracing (attached to ApiError)
 *   - 401 → authExpired event (cookie expired)
 *   - 403 → permission_denied event
 *   - 5xx → server_error event (with retry)
 *   - Network failure → network_down event (cross-browser)
 */

import * as Sentry from '@sentry/react';

// ── Platform detection ────────────────────────────────────────────────────────
// Capacitor sets window.Capacitor when running as a native app.
// This is available at module load time — no async needed.
const isNative = !!(window.Capacitor?.isNativePlatform?.());

// Native: call backend directly (no Vercel proxy available in WebView).
// Web: use relative URL so Vercel proxy handles it (first-party cookie).
const API_BASE_URL = isNative
  ? 'https://aegibit-backend.onrender.com/api/v1'
  : (import.meta.env.VITE_API_BASE_URL || '/api/v1');

const WS_BASE = import.meta.env.VITE_WS_BASE ||
  (isNative ? 'wss://aegibit-backend.onrender.com' : '/');

const isDev = import.meta.env.DEV;
const REQUEST_TIMEOUT_MS = isNative ? 20_000 : 15_000; // extra time for mobile networks

// ── Native token storage (Capacitor Preferences) ─────────────────────────────
// On native, JWT is stored in device secure storage — not a cookie, not localStorage.
// On web, auth is entirely cookie-based; these functions are no-ops.

const NATIVE_TOKEN_KEY = 'access_token';

async function getNativeToken() {
  if (!isNative) return null;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: NATIVE_TOKEN_KEY });
    return value;
  } catch {
    return null;
  }
}

async function setNativeToken(token) {
  if (!isNative || !token) return;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: NATIVE_TOKEN_KEY, value: token });
  } catch { /* ignore */ }
}

async function clearNativeToken() {
  if (!isNative) return;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.remove({ key: NATIVE_TOKEN_KEY });
  } catch { /* ignore */ }
}

// ── User state (non-sensitive — UI only, no tokens) ───────────────────────────

const USER_KEY = 'aegibit_user';

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearAuthState() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('aegibit_org_id');
  localStorage.removeItem('aegibit_role');
  localStorage.removeItem('aegibit_org_name');
  await clearNativeToken();
}

// Legacy aliases — kept so App.jsx and callers don't need changes
export function getToken()  { return null; }
export function setToken()  { /* no-op */ }
export function clearToken() { clearAuthState(); }
export function isAuthenticated() { return !!getUser(); }

export function getOrgId() {
  const user = getUser();
  return user?.organization_id || localStorage.getItem('aegibit_org_id') || '';
}

export function setOrgId(id) {
  localStorage.setItem('aegibit_org_id', id);
}

export function getRole() {
  const user = getUser();
  return user?.role || localStorage.getItem('aegibit_role') || 'SALES';
}

export function setRole(role) {
  localStorage.setItem('aegibit_role', role);
}

// ── Error class ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(message, status = 0, actionable = true, requestId = null) {
    super(message);
    this.name      = 'ApiError';
    this.status    = status;
    this.actionable = actionable;
    this.requestId  = requestId;
  }
}

// ── App-level error events ────────────────────────────────────────────────────

export function dispatchAppError(type, message) {
  window.dispatchEvent(new CustomEvent('appError', { detail: { type, message } }));
}

// ── Request ID ────────────────────────────────────────────────────────────────

function generateRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Standard response unwrap ──────────────────────────────────────────────────
// Backend wraps all /api/v1 responses in { success, data, error, request_id }.
// Unwrap transparently so all downstream code sees the original payload.

function unwrap(json) {
  if (json && typeof json === 'object' && 'success' in json) {
    return json.data;
  }
  return json; // fallback for non-wrapped responses
}

function extractErrorMessage(json, fallback) {
  if (json?.error?.message) return json.error.message;
  if (json?.detail)         return typeof json.detail === 'string' ? json.detail : JSON.stringify(json.detail);
  return fallback;
}

// ── Retry helpers ─────────────────────────────────────────────────────────────

const RETRY_DELAYS = [300, 800];

function isRetryable(status) {
  return status === 0 || status >= 500;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Single attempt ────────────────────────────────────────────────────────────

async function _attempt(path, options, requestId) {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // Native: attach Bearer token. Web: use cookie (credentials: include).
  const authHeaders = {};
  if (isNative) {
    const token = await getNativeToken();
    if (token) authHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: isNative ? 'omit' : 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        ...authHeaders,
        ...options.headers,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    // ── 401 Unauthorized — cookie expired or missing ─────────────────────────
    if (res.status === 401) {
      clearAuthState();
      window.dispatchEvent(new CustomEvent('authExpired'));
      throw new ApiError('Session expired. Please log in again.', 401, false, requestId);
    }

    // ── 403 Forbidden ─────────────────────────────────────────────────────────
    if (res.status === 403) {
      dispatchAppError('permission_denied', 'You do not have permission for this action.');
      throw new ApiError('Permission denied.', 403, false, requestId);
    }

    // ── 5xx Server error ──────────────────────────────────────────────────────
    if (res.status >= 500) {
      const body = await res.json().catch(() => null);
      const message = extractErrorMessage(body, 'Server error. Please try again.');
      if (isDev) console.error(`[API] ${options.method || 'GET'} ${path} → ${res.status}`, body);
      throw new ApiError(message, res.status, true, requestId);
    }

    // ── Other non-2xx ─────────────────────────────────────────────────────────
    if (!res.ok) {
      const body = await res.json().catch(async () => {
        const t = await res.text().catch(() => '');
        return { error: { message: t || res.statusText } };
      });
      if (isDev) console.error(`[API] ${options.method || 'GET'} ${path} → ${res.status}`, body);
      const message = extractErrorMessage(body, res.statusText || 'Request failed');
      const err = new ApiError(message, res.status, true, requestId);
      err.detail = message;
      throw err;
    }

    // ── Success — unwrap standard envelope ────────────────────────────────────
    try {
      const json = await res.json();
      return unwrap(json);
    } catch {
      throw new ApiError('Invalid response from server.', res.status, false, requestId);
    }

  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof ApiError) throw err;

    if (err.name === 'AbortError') {
      throw new ApiError('Server is taking too long to respond. Please try again.', 0, true, requestId);
    }

    if (
      err instanceof TypeError ||
      err.message?.toLowerCase().includes('fetch') ||
      err.message?.toLowerCase().includes('network') ||
      err.message?.toLowerCase().includes('load failed')
    ) {
      throw new ApiError('Cannot connect to server.', 0, true, requestId);
    }

    throw err;
  }
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  // Offline check — fail immediately, no round-trip
  if (!navigator.onLine) {
    dispatchAppError('network_down', 'You are offline. Please check your connection.');
    throw new ApiError('You are offline.', 0, true);
  }

  const requestId = generateRequestId();

  // Retry loop — max 2 retries for network/5xx only
  let lastErr;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      return await _attempt(path, options, requestId);
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err.status)) throw err;
      if (attempt >= RETRY_DELAYS.length) break;
      if (isDev) console.warn(`[API] Retry ${attempt + 1} for ${path} in ${RETRY_DELAYS[attempt]}ms`);
      await sleep(RETRY_DELAYS[attempt]);
    }
  }

  // All retries exhausted — surface appropriate error event
  Sentry.captureException(lastErr, { extra: { path, requestId } });
  if (lastErr.status === 0) {
    if (lastErr.message.includes('taking too long')) {
      dispatchAppError('server_unreachable', 'Server is taking too long to respond.');
    } else {
      dispatchAppError('network_down', 'Cannot reach the server. Check your connection.');
    }
  } else {
    dispatchAppError('server_error', 'Server error. Please try again in a moment.');
  }
  throw lastErr;
}

// ── Phone Verification (legacy SMS OTP — /api/v1/phone/...) ──────────────────

export async function checkCustomer(phone) {
  return apiFetch(`/phone/check-customer?phone=${encodeURIComponent(phone)}`);
}

export async function sendOtp(phoneNumber) {
  return apiFetch('/phone/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone_number: phoneNumber }),
  });
}

export async function verifyOtp(phoneNumber, otp) {
  return apiFetch('/phone/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone_number: phoneNumber, otp }),
  });
}

export async function fetchFraudLogs(phone = null, salespersonId = null, limit = 50) {
  const params = new URLSearchParams();
  if (phone) params.append('phone', phone);
  if (salespersonId) params.append('salesperson_id', salespersonId);
  params.append('limit', limit);
  return apiFetch(`/phone/fraud-logs?${params.toString()}`);
}

// ── Email OTP Verification (otp_secure — /api/v1/...) ────────────────────────

export async function checkPhone(phone) {
  return apiFetch(`/check-phone?phone=${encodeURIComponent(phone)}`);
}

export async function sendEmailOtp(email, phone) {
  return apiFetch('/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email, phone }),
  });
}

export async function verifyEmailOtp(email, phone, otp) {
  return apiFetch('/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, phone, otp }),
  });
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(email, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  // Web: token is in the HTTP-only cookie, data.access_token is ignored.
  // Native: token is in data.access_token, stored in device secure storage.
  if (isNative && data.access_token) {
    await setNativeToken(data.access_token);
  }
  setUser(data.user);
  setOrgId(data.user.organization_id);
  setRole(data.user.role);
  return data.user;
}

export async function logout() {
  await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
  await clearAuthState();
}

export async function fetchCurrentUser() {
  return apiFetch('/auth/me');
}

export async function changePassword(currentPassword, newPassword) {
  return apiFetch('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

// ── User Management (ADMIN only) ──────────────────────────────────────────────

export async function createUser(userData) {
  return apiFetch('/users', { method: 'POST', body: JSON.stringify(userData) });
}

export async function fetchUsers() {
  return apiFetch('/users');
}

export async function toggleUserStatus(userId) {
  return apiFetch(`/users/${userId}/toggle`, { method: 'PATCH' });
}

export async function fetchCreatableRoles() {
  return apiFetch('/users/creatable-roles');
}

// ── Organizations ─────────────────────────────────────────────────────────────

export async function fetchOrganizations() {
  return apiFetch('/organizations');
}

// ── Deals ─────────────────────────────────────────────────────────────────────

export async function analyzeDeal(data) {
  return apiFetch('/deal/analyze', { method: 'POST', body: JSON.stringify(data) });
}

export async function createDeal(data) {
  return apiFetch('/create-deal', { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchDashboard() {
  return apiFetch('/dashboard/summary');
}

export async function fetchDeals(status = null) {
  const params = status ? `?status=${status}` : '';
  return apiFetch(`/deals${params}`);
}

export async function fetchDealDetail(dealId) {
  return apiFetch(`/deals/${dealId}`);
}

export async function approveGM(dealId) {
  return apiFetch('/approve-gm', { method: 'POST', body: JSON.stringify({ deal_id: dealId }) });
}

export async function approveDirector(dealId) {
  return apiFetch('/approve-director', { method: 'POST', body: JSON.stringify({ deal_id: dealId }) });
}

export async function rejectDeal(dealId) {
  return apiFetch('/reject', { method: 'POST', body: JSON.stringify({ deal_id: dealId }) });
}

// ── Soft Delete (ADMIN only) ──────────────────────────────────────────────────

export async function deleteDeal(dealId) {
  return apiFetch(`/deals/${dealId}`, { method: 'DELETE' });
}

export async function restoreDeal(dealId) {
  return apiFetch(`/deals/${dealId}/restore`, { method: 'POST' });
}

export async function fetchDeletedDeals() {
  return apiFetch('/deals/deleted');
}

// ── Variants ──────────────────────────────────────────────────────────────────

export async function fetchVariants() {
  return apiFetch('/variants');
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export async function fetchGMTasks() {
  return apiFetch('/tasks/gm');
}

export async function fetchDirectorTasks() {
  return apiFetch('/tasks/director');
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function fetchNotifications() {
  return apiFetch('/notifications');
}

export async function markNotificationRead(notificationId) {
  return apiFetch(`/notifications/${notificationId}/read`, { method: 'POST' });
}

export async function markAllNotificationsRead() {
  return apiFetch('/notifications/mark-all-read', { method: 'POST' });
}

export async function fetchUnreadCount() {
  return apiFetch('/notifications/unread-count');
}

// ── Upload ─────────────────────────────────────────────────────────────────────

export async function uploadPricing(file) {
  const requestId = generateRequestId();
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 60_000); // 60s for file upload

  const formData = new FormData();
  formData.append('file', file);

  const uploadAuthHeaders = {};
  if (isNative) {
    const token = await getNativeToken();
    if (token) uploadAuthHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/upload-excel`, {
      method: 'POST',
      credentials: isNative ? 'omit' : 'include',
      headers: { 'X-Request-ID': requestId, ...uploadAuthHeaders },
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.status === 401) {
      clearAuthState();
      window.dispatchEvent(new CustomEvent('authExpired'));
      throw new ApiError('Session expired. Please log in again.', 401, false, requestId);
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message = extractErrorMessage(body, `Upload failed (HTTP ${res.status})`);
      throw new ApiError(message, res.status, true, requestId);
    }

    const json = await res.json();
    return unwrap(json);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) throw err;
    if (err.name === 'AbortError') throw new ApiError('Upload timed out.', 0, true, requestId);
    throw new ApiError('Upload failed. Check your connection.', 0, true, requestId);
  }
}

// ── WebSocket ─────────────────────────────────────────────────────────────────

export function createWebSocket(orgId, onMessage) {
  let ws             = null;
  let reconnectTimer = null;
  let isIntentionalClose = false;
  let retryCount     = 0;
  const MAX_RETRIES  = 20;
  const BASE_DELAY   = 1000;
  const MAX_DELAY    = 30_000;

  function getBackoffDelay() {
    const exp    = Math.min(BASE_DELAY * Math.pow(2, retryCount), MAX_DELAY);
    const jitter = Math.random() * 500;
    return exp + jitter;
  }

  function connect() {
    if (!orgId) return;
    ws = new WebSocket(`${WS_BASE}/ws/${orgId}`);

    ws.onopen = () => {
      if (isDev) console.log('[WS] Connected to org:', orgId);
      retryCount = 0;
    };

    ws.onmessage = (event) => {
      try {
        onMessage(JSON.parse(event.data));
      } catch {
        if (isDev) console.error('[WS] Parse error on message');
      }
    };

    ws.onclose = () => {
      if (!isIntentionalClose) {
        if (retryCount >= MAX_RETRIES) {
          if (isDev) console.warn('[WS] Max reconnect attempts reached.');
          return;
        }
        const delay = getBackoffDelay();
        if (isDev) console.log(`[WS] Reconnecting in ${Math.round(delay)}ms (attempt ${retryCount + 1})...`);
        reconnectTimer = setTimeout(() => { retryCount++; connect(); }, delay);
      }
    };

    ws.onerror = () => {
      if (isDev) console.error('[WS] Connection error');
    };
  }

  function sendJson(data) {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
  }

  function disconnect() {
    isIntentionalClose = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
  }

  connect();
  return { disconnect, sendJson };
}
