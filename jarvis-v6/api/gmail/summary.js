// Email summary — unread count + top threads from last 24h
import { requireAuth, gmailListMessages, gmailGetMessage, parseMessage } from '../lib/google.js';

export default async function handler(req, res) {
  const auth = await requireAuth(req, res);
  if (!auth) return;
  try {
    const [unread, recent] = await Promise.all([
      gmailListMessages(auth.accessToken, 'is:unread', 30),
      gmailListMessages(auth.accessToken, 'newer_than:1d', 25)
    ]);
    const unreadIds = (unread.messages || []).map(m => m.id);
    const recentIds = (recent.messages || []).map(m => m.id);
    const sampleIds = [...new Set([...unreadIds.slice(0, 10), ...recentIds.slice(0, 10)])];
    const detail = await Promise.all(sampleIds.map(id => gmailGetMessage(auth.accessToken, id).catch(() => null)));
    const parsed = detail.filter(Boolean).map(parseMessage);
    res.status(200).json({
      unreadCount: unreadIds.length,
      recentCount: recentIds.length,
      messages: parsed.slice(0, 15)
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
