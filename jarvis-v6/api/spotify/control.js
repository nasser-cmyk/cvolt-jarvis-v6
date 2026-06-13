import { getSpotifyToken, spotifyApi } from '../lib/spotify.js';

export default async function handler(req, res) {
  const t = await getSpotifyToken(req, res);
  if (!t) return res.status(401).json({ error: 'not_connected' });
  const action = req.query.action;
  try {
    if (action === 'pause') {
      await spotifyApi(t.accessToken, '/me/player/pause', { method: 'PUT' });
    } else if (action === 'next') {
      await spotifyApi(t.accessToken, '/me/player/next', { method: 'POST' });
    } else if (action === 'previous') {
      await spotifyApi(t.accessToken, '/me/player/previous', { method: 'POST' });
    } else if (action === 'shuffle') {
      const state = req.query.state === 'true';
      await spotifyApi(t.accessToken, '/me/player/shuffle?state=' + state, { method: 'PUT' });
    } else if (action === 'volume') {
      const vol = Math.max(0, Math.min(100, parseInt(req.query.level || '50')));
      await spotifyApi(t.accessToken, '/me/player/volume?volume_percent=' + vol, { method: 'PUT' });
    } else {
      return res.status(400).json({ error: 'unknown_action' });
    }
    res.status(200).json({ ok: true, action });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
