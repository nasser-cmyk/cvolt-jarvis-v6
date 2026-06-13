import { clearSession } from '../lib/session.js';

export default async function handler(req, res) {
  clearSession(res);
  res.status(200).json({ ok: true });
}
