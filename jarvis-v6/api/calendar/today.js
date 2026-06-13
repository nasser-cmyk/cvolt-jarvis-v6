// Today's calendar events
import { requireAuth, calendarListEvents, parseEvent } from '../lib/google.js';

export default async function handler(req, res) {
  const auth = await requireAuth(req, res);
  if (!auth) return;
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    const list = await calendarListEvents(auth.accessToken, start, end, 30);
    const events = (list.items || []).map(parseEvent);
    res.status(200).json({ events, count: events.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
