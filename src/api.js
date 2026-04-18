/**
 * API client for JobHunter.AI backend.
 * All methods accept a `getToken` function from Clerk's useAuth() hook
 * to attach the Bearer token automatically.
 */

const API_BASE = '/api';

async function request(path, getToken, options = {}) {
  const token = getToken ? await getToken() : null;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }

  return res.json();
}

/* ── User ──────────────────────────────────── */

export async function fetchProfile(getToken) {
  return request('/users/me', getToken);
}

export async function updateProfile(getToken, data) {
  return request('/users/me', getToken, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/* ── Resumes ───────────────────────────────── */

export async function fetchResumes(getToken, limit = 20) {
  return request(`/resumes?limit=${limit}`, getToken);
}

export async function saveResume(getToken, data) {
  return request('/resumes', getToken, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteResume(getToken, id) {
  return request(`/resumes/${id}`, getToken, { method: 'DELETE' });
}

/* ── Subscriptions ─────────────────────────── */

export async function fetchSubscriptions(getToken) {
  return request('/subscriptions', getToken);
}

export async function fetchActiveSubscription(getToken) {
  return request('/subscriptions/active', getToken);
}

export async function createOrder(getToken, data) {
  return request('/subscriptions/create-order', getToken, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function verifyPayment(getToken, data) {
  return request('/subscriptions/verify', getToken, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/* ── Missions ──────────────────────────────── */

export async function fetchMissions(getToken, limit = 20) {
  return request(`/missions?limit=${limit}`, getToken);
}

export async function saveMission(getToken, data) {
  return request('/missions', getToken, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchMission(getToken, id) {
  return request(`/missions/${id}`, getToken);
}

/* ── AI (Resume Analysis) ─────────────────── */

export async function analyseResumeAPI(getToken, resume_b64, target_role) {
  return request('/ai/analyse-resume', getToken, {
    method: 'POST',
    body: JSON.stringify({ resume_b64, target_role }),
  });
}

export async function generateBulletsAPI(getToken, resume_data, target_role) {
  return request('/ai/generate-bullets', getToken, {
    method: 'POST',
    body: JSON.stringify({ resume_data, target_role }),
  });
}

/* ── Admin ─────────────────────────────────── */

export async function adminLogin(username, password) {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Login failed');
  }
  return res.json();
}

export async function fetchAdminStats(adminToken) {
  const res = await fetch(`${API_BASE}/admin/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchAdminUsers(adminToken) {
  const res = await fetch(`${API_BASE}/admin/users`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

/* ── Health ─────────────────────────────────── */

export async function checkHealth() {
  return request('/health', null);
}
