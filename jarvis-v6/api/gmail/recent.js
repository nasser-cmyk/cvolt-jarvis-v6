// Recent emails — last N, with headers + snippet
import { requireAuth, gmailListMessages, gmailGetMessage, parseMessage } from '../lib/google.js';

export default async function handler(req, res) {
  const auth = await requireAuth(req, res);
  if (!auth) return;
  const max = Math.min(parseInt(req.query.max || '15'), 30);
  const query = req.query.q || ''; // e.g. 'is:unread' or 'newer_than:1d'
  try {
    const list = await gmailListMessages(auth.accessToken, query, max);
    const ids = (list.messages || []).map(m => m.id);
    const messages = await Promise.all(ids.map(id => gmailGetMessage(auth.accessToken, id)));
    const parsed = messages.map(parseMessage);
    res.status(200).json({ messages: parsed, count: parsed.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
