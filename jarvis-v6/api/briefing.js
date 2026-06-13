// Combined morning briefing — Gmail + Calendar in one call
import { requireAuth, gmailListMessages, gmailGetMessage, parseMessage, calendarListEvents, parseEvent } from './lib/google.js';

export default async function handler(req, res) {
  const auth = await requireAuth(req, res);
  if (!auth) return;
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59).toISOString();
    const weekEnd = new Date(now.getTime() + 7*24*3600*1000).toISOString();

    const [unread, recent, todayEv, weekEv] = await Promise.all([
      gmailListMessages(auth.accessToken, 'is:unread', 30),
      gmailListMessages(auth.accessToken, 'newer_than:1d', 20),
      calendarListEvents(auth.accessToken, todayStart, todayEnd, 20),
      calendarListEvents(auth.accessToken, todayEnd, weekEnd, 30)
    ]);

    // Get details on top 10 unread or recent
    const ids = [...new Set([
      ...((unread.messages || []).slice(0, 8).map(m => m.id)),
      ...((recent.messages || []).slice(0, 5).map(m => m.id))
    ])];
    const detail = await Promise.all(ids.map(id => gmailGetMessage(auth.accessToken, id).catch(() => null)));
    const emails = detail.filter(Boolean).map(parseMessage);

    res.status(200).json({
      generatedAt: now.toISOString(),
      user: { email: auth.session.email, name: auth.session.name },
      email: {
        unreadCount: (unread.messages || []).length,
        recentCount: (recent.messages || []).length,
        topMessages: emails
      },
      calendar: {
        today: (todayEv.items || []).map(parseEvent),
        upcoming: (weekEv.items || []).slice(0, 12).map(parseEvent)
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
