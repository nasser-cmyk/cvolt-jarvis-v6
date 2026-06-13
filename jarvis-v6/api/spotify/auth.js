import { buildSpotifyAuthUrl } from '../lib/spotify.js';
export default async function handler(req, res) {
  if (!process.env.SPOTIFY_CLIENT_ID) return res.status(500).json({ error: 'SPOTIFY_CLIENT_ID not configured' });
  const url = buildSpotifyAuthUrl(req, Math.random().toString(36).slice(2));
  res.writeHead(302, { Location: url });
  res.end();
}
