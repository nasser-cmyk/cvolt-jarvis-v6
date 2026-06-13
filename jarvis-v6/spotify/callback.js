import { spotifyExchangeCode } from '../lib/spotify.js';
import { readSession, writeSession } from '../lib/session.js';

export default async function handler(req, res) {
  const code = req.query.code;
  const error = req.query.error;
  if (error) return res.status(400).send('Spotify auth error: ' + error);
  if (!code) return res.status(400).send('Missing code');
  try {
    const tokens = await spotifyExchangeCode(req, code);
    let session = await readSession(req);
    if (!session) session = {};
    session.spotify = {
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000
    };
    await writeSession(res, session);
    res.writeHead(302, { Location: '/?spotify=1' });
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).send('Spotify callback failed: ' + e.message);
  }
}
