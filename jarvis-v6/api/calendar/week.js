// Next 7 days of events
import { requireAuth, calendarListEvents, parseEvent } from '../lib/google.js';

export default async function handler(req, res) {
  const auth = await requireAuth(req, res);
  if (!auth) return;
  try {
    const now = new Date();
    const start = now.toISOString();
    const end = new Date(now.getTime() + 7*24*3600*1000).toISOString();
    const list = await calendarListEvents(auth.accessToken, start, end, 50);
    const events = (list.items || []).map(parseEvent);
    res.status(200).json({ events, count: events.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
