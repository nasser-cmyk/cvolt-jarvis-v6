# JARVIS v6.0 — Gmail + Calendar Setup Guide

This unlocks the biggest capability: JARVIS reads your email + calendar autonomously and gives you a morning briefing.

**Total setup time: 30 minutes. One time only.**

---

## Why this needs a backend

Browsers don't allow direct Gmail/Calendar access for security. The `api/` folder you have contains 9 serverless functions that handle Google OAuth and read your inbox/calendar on JARVIS's behalf. They run on Vercel for free.

---

## Part 1 — Google Cloud setup (12 min)

### Step 1.1 — Create a project
1. Go to **console.cloud.google.com**
2. Top bar → project dropdown → **New Project**
3. Name: `cvolt-jarvis` → Create
4. Wait 10 sec, then select that project from the dropdown

### Step 1.2 — Enable APIs
1. Left menu → **APIs & Services** → **Library**
2. Search **Gmail API** → click → **Enable**
3. Back to Library → search **Google Calendar API** → click → **Enable**

### Step 1.3 — Configure OAuth consent screen
1. Left menu → **APIs & Services** → **OAuth consent screen**
2. User type: **External** → Create
3. App information:
   - App name: `C-VOLT JARVIS`
   - User support email: `nasser@voltqatar.com`
   - Developer contact: `nasser@voltqatar.com`
4. Save and Continue
5. **Scopes**: click **Add or Remove Scopes** → search and check:
   - `gmail.readonly`
   - `calendar.readonly`
   - `userinfo.email`
   - `userinfo.profile`
   - `openid`
   - Save and Continue
6. **Test users**: click **+ Add Users** → add:
   - `nasser@voltqatar.com`
   - Abdullah's email
   - Ammar's email
   - Save and Continue
7. Back to Dashboard. **Leave the app in Testing mode** — that's fine for 3 users.

### Step 1.4 — Create OAuth credentials
1. Left menu → **APIs & Services** → **Credentials**
2. **+ Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `JARVIS web client`
5. **Authorized redirect URIs**: click **+ Add URI** → enter:
   - `https://YOUR-VERCEL-URL.vercel.app/api/auth/callback`
   - **Replace `YOUR-VERCEL-URL` with your actual Vercel URL** (you'll get this after Part 2)
   - For now, add a placeholder like `https://example.vercel.app/api/auth/callback` — we'll update it after Vercel deploys
6. Click **Create**
7. A popup shows your **Client ID** and **Client Secret**
8. **COPY BOTH** into a Notes file — you'll need them in Part 3

---

## Part 2 — Deploy to Vercel (10 min)

This is different from Netlify. Vercel runs serverless functions.

### Step 2.1 — Push the jarvis-v6 folder to GitHub
1. Go to **github.com** → **+** → **New repository**
2. Name: `cvolt-jarvis-v6` → **Public** → Create
3. On the empty repo page → **uploading an existing file**
4. **Drag the ENTIRE `jarvis-v6` folder contents** into the drop zone (including the `api` subfolder)
   - Important: make sure all files including the `api/` subfolders go up
5. Scroll down → **Commit changes**

### Step 2.2 — Deploy on Vercel
1. Go to **vercel.com** → log in (or sign up — Continue with GitHub)
2. **Add New** → **Project**
3. Import `cvolt-jarvis-v6`
4. **Don't change any settings** — Vercel auto-detects
5. **Environment Variables** (click to expand) — add these THREE:

| Name | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | (paste from Part 1, ends in `.apps.googleusercontent.com`) |
| `GOOGLE_CLIENT_SECRET` | (paste from Part 1, looks like `GOCSPX-...`) |
| `COOKIE_SECRET` | Make up any 32+ character random string. Generate one at random.org or just type 40 random characters. |

6. Click **Deploy**
7. Wait 60 seconds
8. Vercel shows your URL: `https://cvolt-jarvis-v6-xyz.vercel.app`
9. **Copy this URL.**

### Step 2.3 — Update Google with the real Vercel URL
1. Go back to **console.cloud.google.com** → APIs & Services → Credentials
2. Click your OAuth client (the one you made in Step 1.4)
3. Under **Authorized redirect URIs**: delete the placeholder, add:
   - `https://YOUR-ACTUAL-VERCEL-URL.vercel.app/api/auth/callback`
4. Save

---

## Part 3 — Connect JARVIS

1. Open your Vercel URL in Chrome/Edge: `https://cvolt-jarvis-v6-xyz.vercel.app`
2. Enter your Anthropic + ElevenLabs keys when JARVIS asks
3. Look at the top right action bar — you'll see **GOOGLE: OFF** button
4. Click **GOOGLE: OFF**
5. Google login page appears → log in with `nasser@voltqatar.com`
6. Approve the permissions (Gmail readonly + Calendar readonly)
7. You bounce back to JARVIS — he says *"Google connected, sir."*
8. Button now shows **GOOGLE: NASSER** in green

---

## Part 4 — Test commands

Try each one out loud (or type):

```
Read my email
Check my inbox
What's on my calendar today?
What's on this week?
Morning briefing
Brief me on my day
Any unread emails?
What's happening today?
```

JARVIS will:
1. Fetch from Gmail/Calendar via the backend
2. Pass the raw data through Claude Sonnet 4.5
3. Speak it back in JARVIS voice — prioritising what matters (Rafeeq, Vmoto, regulators, etc.)

---

## Part 5 — Share with Abdullah and Ammar

Each partner:
1. Opens your Vercel URL on phone/PC
2. Installs as PWA (Share → Add to Home Screen / Install button)
3. Enters their own Anthropic key (or you share yours)
4. Clicks GOOGLE → logs in with **their own** Google account
5. They get briefings for **their own** inbox/calendar

Each user's session is separate (encrypted cookies per browser). Their email never touches your account.

---

## Morning briefing automation (optional, later)

Once Gmail/Calendar work, I can add a **scheduled task** that runs `runBriefing()` at 7am every morning, plays the briefing through your speakers, and pings you on WhatsApp. Tell me when you want this — it requires either:
- iPhone Shortcuts automation, OR
- A Vercel cron job + Twilio for the WhatsApp ping

---

## Cost

- **Google APIs**: Free (Gmail + Calendar APIs have generous free quotas — way more than 3 users will hit)
- **Vercel**: Free Hobby tier (100 GB bandwidth/month — plenty)
- **Anthropic**: ~$5-15/month at light use (capped at your $50 limit)
- **ElevenLabs**: $5/month if you want Scribe STT + good voice; free tier works for testing

**Total: $5-25/month** for 3 founders with a fully autonomous JARVIS reading their email, calendar, and giving morning briefings.

---

## Troubleshooting

**GOOGLE button does nothing when clicked**
→ Vercel URL not matching the redirect URI. Check Part 2.3.

**"OAuth callback failed" after Google login**
→ `COOKIE_SECRET` env var missing. Vercel → Project → Settings → Environment Variables → add it → Redeploy.

**"Email fetch failed, sir"**
→ Your Google session expired. Click GOOGLE button → Disconnect → reconnect.

**"Brief me" returns empty briefing**
→ Likely no emails / events. Try `Read my email` first to confirm Gmail is connected.

**Multiple users sharing JARVIS**
→ Each user's session lives in their browser cookie. Don't share installed apps between people.

---

## What's next (after v6 is running)

1. **Send emails** — let JARVIS draft + send replies (write scope)
2. **Create calendar events** — JARVIS schedules meetings
3. **WhatsApp Business integration** — JARVIS reads/sends WhatsApp
4. **Live Rafeeq fleet telemetry** — when their dashboard is online
5. **Cron-scheduled morning briefing** — auto-plays at 7am
6. **Multi-tenant** — when employees join, give each their own JARVIS link

Pick one when you've tested v6.
