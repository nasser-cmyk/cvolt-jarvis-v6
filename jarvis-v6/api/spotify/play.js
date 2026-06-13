import { getSpotifyToken, spotifyApi } from '../lib/spotify.js';

export default async function handler(req, res) {
  const t = await getSpotifyToken(req, res);
  if (!t) return res.status(401).json({ error: 'not_connected' });
  const query = req.query.q;
  try {
    if (query) {
      const search = await spotifyApi(t.accessToken, '/search?type=track&limit=1&q=' + encodeURIComponent(query));
      const track = search.tracks?.items?.[0];
      if (!track) return res.status(404).json({ error: 'not_found', query });
      await spotifyApi(t.accessToken, '/me/player/play', {
        method: 'PUT',
        body: JSON.stringify({ uris: [track.uri] })
      });
      return res.status(200).json({ ok: true, track: { name: track.name, artist: track.artists.map(a=>a.name).join(', ') } });
    }
    await spotifyApi(t.accessToken, '/me/player/play', { method: 'PUT' });
    res.status(200).json({ ok: true, action: 'resumed' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
