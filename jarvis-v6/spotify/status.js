import { readSession } from '../lib/session.js';
import { getSpotifyToken, spotifyApi } from '../lib/spotify.js';

export default async function handler(req, res) {
  const session = await readSession(req);
  if (!session?.spotify?.refreshToken) return res.status(200).json({ connected: false });
  try {
    const t = await getSpotifyToken(req, res);
    const now = await spotifyApi(t.accessToken, '/me/player/currently-playing');
    res.status(200).json({
      connected: true,
      playing: !!now?.is_playing,
      track: now?.item ? { name: now.item.name, artist: now.item.artists.map(a=>a.name).join(', '), album: now.item.album?.name } : null
    });
  } catch (e) {
    res.status(200).json({ connected: true, error: e.message });
  }
}
