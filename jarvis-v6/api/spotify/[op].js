import { buildSpotifyAuthUrl, spotifyExchangeCode, getSpotifyToken, spotifyApi } from '../lib/spotify.js';
import { readSession, writeSession } from '../lib/session.js';

export default async function handler(req, res) {
  const op = req.query.op;
  try {
    if (op === 'auth') {
      if (!process.env.SPOTIFY_CLIENT_ID) return res.status(500).json({ error: 'SPOTIFY_CLIENT_ID not configured' });
      const url = buildSpotifyAuthUrl(req, Math.random().toString(36).slice(2));
      res.writeHead(302, { Location: url });
      return res.end();
    }
    if (op === 'callback') {
      const code = req.query.code;
      const error = req.query.error;
      if (error) return res.status(400).send('Spotify auth error: ' + error);
      if (!code) return res.status(400).send('Missing code');
      const tokens = await spotifyExchangeCode(req, code);
      let session = await readSession(req); if (!session) session = {};
      session.spotify = {
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token,
        expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000
      };
      await writeSession(res, session);
      res.writeHead(302, { Location: '/?spotify=1' });
      return res.end();
    }
    if (op === 'status') {
      const session = await readSession(req);
      if (!session?.spotify?.refreshToken) return res.status(200).json({ connected: false });
      const t = await getSpotifyToken(req, res);
      const now = await spotifyApi(t.accessToken, '/me/player/currently-playing');
      return res.status(200).json({
        connected: true,
        playing: !!now?.is_playing,
        track: now?.item ? { name: now.item.name, artist: now.item.artists.map(a=>a.name).join(', ') } : null
      });
    }
    if (op === 'play') {
      const t = await getSpotifyToken(req, res);
      if (!t) return res.status(401).json({ error: 'not_connected' });
      const query = req.query.q;
      if (query) {
        // Get top 10 results, pick best match
        const search = await spotifyApi(t.accessToken, '/search?type=track&limit=10&q=' + encodeURIComponent(query));
        const tracks = (search.tracks?.items || []);
        if (!tracks.length) return res.status(404).json({ error: 'not_found', query });
        // Score each track by how many query words appear in name + artist
        const normalize = s => s.toLowerCase().replace(/[^\w\s]/g,' ').replace(/\s+/g,' ').trim();
        const queryWords = normalize(query).split(' ').filter(w => w.length > 1);
        let best = tracks[0]; let bestScore = -1;
        for (const tr of tracks) {
          const haystack = normalize(tr.name + ' ' + tr.artists.map(a=>a.name).join(' '));
          let score = 0;
          for (const w of queryWords) if (haystack.includes(w)) score++;
          // Bonus for original (not remix/cover/live)
          if (!/remix|cover|live|karaoke|tribute|acoustic version/i.test(tr.name + ' ' + (tr.album?.name||''))) score += 0.5;
          // Bonus for popularity
          score += (tr.popularity || 0) / 200;
          if (score > bestScore) { bestScore = score; best = tr; }
        }
        await spotifyApi(t.accessToken, '/me/player/play', { method: 'PUT', body: JSON.stringify({ uris: [best.uri] }) });
        return res.status(200).json({ ok: true, track: { name: best.name, artist: best.artists.map(a=>a.name).join(', ') } });
      }
      await spotifyApi(t.accessToken, '/me/player/play', { method: 'PUT' });
      return res.status(200).json({ ok: true });
    }
    if (op === 'control') {
      const t = await getSpotifyToken(req, res);
      if (!t) return res.status(401).json({ error: 'not_connected' });
      const action = req.query.action;
      if (action === 'pause') await spotifyApi(t.accessToken, '/me/player/pause', { method: 'PUT' });
      else if (action === 'next') await spotifyApi(t.accessToken, '/me/player/next', { method: 'POST' });
      else if (action === 'previous') await spotifyApi(t.accessToken, '/me/player/previous', { method: 'POST' });
      else if (action === 'volume') {
        const vol = Math.max(0, Math.min(100, parseInt(req.query.level || '50')));
        await spotifyApi(t.accessToken, '/me/player/volume?volume_percent=' + vol, { method: 'PUT' });
      } else return res.status(400).json({ error: 'unknown_action' });
      return res.status(200).json({ ok: true, action });
    }
    res.status(400).json({ error: 'unknown_op' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
