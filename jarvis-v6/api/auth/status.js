// Is the user logged in? Return profile info.
import { readSession } from '../lib/session.js';

export default async function handler(req, res) {
  const session = await readSession(req);
  if (!session) return res.status(200).json({ authenticated: false });
  res.status(200).json({
    authenticated: true,
    email: session.email,
    name: session.name,
    picture: session.picture
  });
}
