// Start Google OAuth flow
import { buildAuthUrl } from '../lib/google.js';

export default async function handler(req, res) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: 'GOOGLE_CLIENT_ID not configured' });
  }
  const state = Math.random().toString(36).slice(2);
  const url = buildAuthUrl(req, state);
  res.writeHead(302, { Location: url });
  res.end();
}
