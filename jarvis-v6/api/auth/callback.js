// Handle Google OAuth callback
import { exchangeCode, getUserInfo } from '../lib/google.js';
import { writeSession } from '../lib/session.js';

export default async function handler(req, res) {
  const code = req.query.code;
  const error = req.query.error;
  if (error) return res.status(400).send('Auth error: ' + error);
  if (!code) return res.status(400).send('Missing code');
  try {
    const tokens = await exchangeCode(req, code);
    const user = await getUserInfo(tokens.access_token);
    await writeSession(res, {
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000,
      email: user.email,
      name: user.name,
      picture: user.picture
    });
    // Redirect back to JARVIS
    res.writeHead(302, { Location: '/?connected=1' });
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).send('OAuth callback failed: ' + e.message);
  }
}
