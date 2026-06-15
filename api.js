import * as SecureStore from 'expo-secure-store';
import { API_BASE } from './config';

const TOKEN_KEY = 'iecc_token';

export async function getToken() {
  try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
}
export async function setToken(t) {
  try { await SecureStore.setItemAsync(TOKEN_KEY, t); } catch {}
}
export async function clearToken() {
  try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch {}
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const t = await getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error('تعذّر الاتصال بالسيرفر. تأكد من الإنترنت ومن رابط الـ API.');
  }
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    throw new Error((data && data.error) || `خطأ من السيرفر (${res.status})`);
  }
  return data;
}

// ---- Auth ----
export async function register(payload) {
  const data = await request('/auth/register.php', { method: 'POST', body: payload, auth: false });
  if (data.token) await setToken(data.token);
  return data;
}
export async function login(email, password) {
  const data = await request('/auth/login.php', { method: 'POST', body: { email, password }, auth: false });
  if (data.token) await setToken(data.token);
  return data;
}
export async function me() {
  return request('/auth/me.php');
}
export async function logout() {
  await clearToken();
}

// ---- AI ----
export async function aiCaption({ brief, platform, tone, business_name }) {
  return request('/ai/caption.php', { method: 'POST', body: { brief, platform, tone, business_name } });
}
export async function aiReply({ comment, platform, tone, business_name, post_context }) {
  return request('/ai/reply.php', { method: 'POST', body: { comment, platform, tone, business_name, post_context } });
}

// ---- Profile ----
export async function updateProfile(payload) {
  return request('/profile.php', { method: 'POST', body: payload });
}

// ---- Image upload (multipart) ----
export async function uploadImage(uri) {
  const t = await getToken();
  const form = new FormData();
  const name = uri.split('/').pop() || 'photo.jpg';
  const ext = (name.split('.').pop() || 'jpg').toLowerCase();
  const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  form.append('image', { uri, name, type });
  let res;
  try {
    res = await fetch(`${API_BASE}/upload.php`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
      body: form,
    });
  } catch {
    throw new Error('تعذّر رفع الصورة. تأكد من الإنترنت.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || 'فشل رفع الصورة');
  return data; // { url }
}

// ---- Scheduling ----
export async function schedulePost({ message, image_url, platforms, run_at }) {
  return request('/schedule.php', { method: 'POST', body: { message, image_url, platforms, run_at } });
}
export async function getSchedule() {
  return request('/schedule.php');
}

// ---- Comments ----
export async function getComments(platform) {
  const q = platform ? `?platform=${platform}` : '';
  return request(`/comments/list.php${q}`);
}
export async function replyComment({ platform, account_id, comment_id, message }) {
  return request('/comments/reply.php', { method: 'POST', body: { platform, account_id, comment_id, message } });
}

// ---- Data ----
export async function getAccounts() {
  return request('/accounts.php');
}
export async function getPlans() {
  return request('/plans.php');
}

// ---- Meta connect + publish ----
export async function oauthStartMeta(returnUrl) {
  return request(`/oauth/meta/start.php?return=${encodeURIComponent(returnUrl)}`);
}
export async function disconnect(platform) {
  return request('/disconnect.php', { method: 'POST', body: { platform } });
}
export async function publish({ message, platforms, image_url }) {
  return request('/publish.php', { method: 'POST', body: { message, platforms, image_url } });
}
