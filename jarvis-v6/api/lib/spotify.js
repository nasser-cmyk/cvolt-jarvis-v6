// Spotify OAuth + Web API helpers
import { readSession, writeSession } from './session.js';

export const SP_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-top-read',
  'streaming',
  'playlist-read-private',
  'user-library-read'
].join(' ');

export function getSpotifyRedirectUri(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}/api/spotify/callback`;
}

export function buildSpotifyAuthUrl(req, state) {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: getSpotifyRedirectUri(req),
    scope: SP_SCOPES,
    state: state || ''
  });
  return 'https://accounts.spotify.com/authorize?' + params.toString();
}

export async function spotifyExchangeCode(req, code) {
  const basic = Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getSpotifyRedirectUri(req)
  });
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!r.ok) throw new Error('Spotify token exchange failed: ' + await r.text());
  return await r.json();
}

export async function spotifyRefresh(refreshToken) {
  const basic = Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64');
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken });
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!r.ok) throw new Error('Spotify refresh failed');
  return await r.json();
}

export async function getSpotifyToken(req, res) {
  const session = await readSession(req);
  if (!session?.spotify?.refreshToken) return null;
  const sp = session.spotify;
  if (sp.accessToken && sp.expiresAt && Date.now() < sp.expiresAt - 60000) {
    return { accessToken: sp.accessToken, session };
  }
  const t = await spotifyRefresh(sp.refreshToken);
  session.spotify.accessToken = t.access_token;
  session.spotify.expiresAt = Date.now() + (t.expires_in || 3600) * 1000;
  if (t.refresh_token) session.spotify.refreshToken = t.refresh_token;
  await writeSession(res, session);
  return { accessToken: session.spotify.accessToken, session };
}

export async function spotifyApi(accessToken, endpoint, opts = {}) {
  const r = await fetch('https://api.spotify.com/v1' + endpoint, {
    ...opts,
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    }
  });
  if (r.status === 204) return null;  // No content (common for playback commands)
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Spotify API ${r.status}: ${text}`);
  }
  return await r.json();
}
