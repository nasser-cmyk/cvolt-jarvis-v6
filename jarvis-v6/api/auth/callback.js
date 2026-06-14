import { exchangeCode, getUserInfo } from '../lib/google.js';
import { readSession, writeSession } from '../lib/session.js';

export default async function handler(req, res) {
  const code = req.query.code;
  const error = req.query.error;
  if (error) return res.status(400).send('Auth error: ' + error);
  if (!code) return res.status(400).send('Missing code');
  try {
    const tokens = await exchangeCode(req, code);
    const user = await getUserInfo(tokens.access_token);
    // MERGE with existing session — preserve Spotify if already connected
    let session = await readSession(req);
    if (!session) session = {};
    session.refreshToken = tokens.refresh_token;
    session.accessToken = tokens.access_token;
    session.expiresAt = Date.now() + (tokens.expires_in || 3600) * 1000;
    session.email = user.email;
    session.name = user.name;
    session.picture = user.picture;
    await writeSession(res, session);
    res.writeHead(302, { Location: '/?connected=1' });
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).send('OAuth callback failed: ' + e.message);
  }
}
