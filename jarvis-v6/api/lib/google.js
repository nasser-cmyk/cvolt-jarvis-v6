// Google OAuth + Gmail/Calendar helpers
import { readSession, writeSession } from './session.js';

export const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid'
].join(' ');

export function getRedirectUri(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}/api/auth/callback`;
}

export function buildAuthUrl(req, state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: getRedirectUri(req),
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: state || ''
  });
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
}

export async function exchangeCode(req, code) {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: getRedirectUri(req),
    grant_type: 'authorization_code'
  });
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!r.ok) throw new Error('Token exchange failed: ' + await r.text());
  return await r.json();
}

export async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!r.ok) throw new Error('Token refresh failed: ' + await r.text());
  return await r.json();
}

export async function getUserInfo(accessToken) {
  const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { 'Authorization': 'Bearer ' + accessToken }
  });
  if (!r.ok) throw new Error('User info failed');
  return await r.json();
}

// Get a valid access token from the session — refreshes if expired
export async function getAccessToken(req, res) {
  const session = await readSession(req);
  if (!session || !session.refreshToken) return null;
  // Reuse access token if still fresh
  if (session.accessToken && session.expiresAt && Date.now() < session.expiresAt - 60000) {
    return { accessToken: session.accessToken, session };
  }
  // Refresh
  const t = await refreshAccessToken(session.refreshToken);
  session.accessToken = t.access_token;
  session.expiresAt = Date.now() + (t.expires_in || 3600) * 1000;
  await writeSession(res, session);
  return { accessToken: session.accessToken, session };
}

// Wrapper: requires auth, returns access token or sends 401
export async function requireAuth(req, res) {
  const t = await getAccessToken(req, res);
  if (!t) {
    res.status(401).json({ error: 'not_authenticated' });
    return null;
  }
  return t;
}

// Gmail helpers
export async function gmailListMessages(accessToken, query, max=20) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${max}&q=${encodeURIComponent(query||'')}`;
  const r = await fetch(url, { headers: { 'Authorization': 'Bearer ' + accessToken } });
  if (!r.ok) throw new Error('Gmail list failed: ' + r.status);
  return await r.json();
}

export async function gmailGetMessage(accessToken, id) {
  const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`, {
    headers: { 'Authorization': 'Bearer ' + accessToken }
  });
  if (!r.ok) throw new Error('Gmail get failed: ' + r.status);
  return await r.json();
}

export function parseMessage(m) {
  const headers = {};
  for (const h of (m.payload?.headers || [])) headers[h.name.toLowerCase()] = h.value;
  return {
    id: m.id,
    threadId: m.threadId,
    from: headers.from || '',
    subject: headers.subject || '(no subject)',
    date: headers.date || '',
    snippet: m.snippet || '',
    unread: (m.labelIds||[]).includes('UNREAD'),
    important: (m.labelIds||[]).includes('IMPORTANT'),
    starred: (m.labelIds||[]).includes('STARRED'),
  };
}

// Calendar helpers
export async function calendarListEvents(accessToken, timeMin, timeMax, maxResults=20) {
  const params = new URLSearchParams({
    timeMin, timeMax, maxResults: String(maxResults),
    singleEvents: 'true', orderBy: 'startTime'
  });
  const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { 'Authorization': 'Bearer ' + accessToken }
  });
  if (!r.ok) throw new Error('Calendar list failed: ' + r.status);
  return await r.json();
}

export function parseEvent(e) {
  const start = e.start?.dateTime || e.start?.date;
  const end = e.end?.dateTime || e.end?.date;
  return {
    id: e.id,
    title: e.summary || '(no title)',
    start, end,
    location: e.location || null,
    attendees: (e.attendees || []).map(a => a.email),
    description: (e.description || '').slice(0, 300),
    htmlLink: e.htmlLink,
    isAllDay: !!e.start?.date
  };
}
