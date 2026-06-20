# Calendar Booking App

A calendar booking page built with **Next.js (App Router)**, the official
**Google Calendar API for Node.js** (`googleapis`), and **Upstash Redis** (via
Vercel's Marketplace Redis integration) for token storage.

- The **owner** connects their Google Calendar once (OAuth).
- **Visitors** see a weekly calendar with the owner's existing events blocked out
  (via the **FreeBusy API** — no private event details are exposed), pick an open
  slot, and submit their name/email.
- An event is created on the owner's calendar and the visitor is added as an
  attendee (they get an email invite). A server-side re-check prevents
  double-booking.

## Architecture

```
app/
  page.tsx                     Booking page (server) → client orchestrator
  api/
    auth/google/route.ts       Redirect to Google consent
    auth/callback/route.ts     Exchange code, verify owner, store refresh token
    auth/status/route.ts       { connected: boolean }
    availability/route.ts      FreeBusy → busy blocks + bookable free slots
    book/route.ts              Create event (with double-book guard)
  components/                  FullCalendar UI, booking modal, connect banner
lib/
  config.ts                    Env + booking rules
  google.ts                    OAuth2 client factory + owner calendar
  tokens.ts                    Upstash Redis refresh-token persistence
  availability.ts              FreeBusy fetch + free-slot math (Luxon)
```

Why a backend at all? The Google **client secret** and the owner's **refresh
token** must never reach the browser. Next.js Route Handlers hold them; the
client only ever talks to `/api/*`.

## 1. Google Cloud setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) → create
   (or pick) a project.
2. **APIs & Services → Library** → enable **Google Calendar API**.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External** (or Internal for a Workspace org).
   - Add the scopes `calendar.readonly`, `calendar.events`, and `userinfo.email`.
   - While in **Testing**, add your Google account under **Test users**.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized redirect URIs**: add
     `http://localhost:3000/api/auth/callback` (and your production URL, e.g.
     `https://your-app.vercel.app/api/auth/callback`).
   - Copy the **Client ID** and **Client secret**.

## 2. Redis (token store)

The owner's refresh token is stored in **Upstash Redis** (`@upstash/redis`).
Provision it either way:

- **Via Vercel:** dashboard → your project → **Storage** → **Create Database** →
  **Redis (Upstash)**. Connect it; Vercel injects the REST URL/token into the
  project's environment automatically.
- **Directly:** create a free database at [upstash.com](https://upstash.com),
  then copy its **REST URL** and **REST token**.

The app reads `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, and also
accepts the `KV_REST_API_URL` / `KV_REST_API_TOKEN` names that some Vercel
integrations inject.

## 3. Local development

```bash
npm install

# Pull the KV env vars Vercel created (requires `npm i -g vercel` + `vercel link`)
vercel env pull .env.local

# Then add your Google values to .env.local (see .env.example for the full list):
#   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
#   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback,
#   OWNER_EMAIL=you@example.com

npm run dev
```

Open <http://localhost:3000>, click **Connect Google Calendar**, and authorize
with the **owner** account (must match `OWNER_EMAIL`). Once connected, the
banner disappears and slots appear.

> No Vercel account yet? A free Upstash database works for local dev — just put
> its `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` in `.env.local`. To
> use a different store entirely, swap `lib/tokens.ts`.

## 4. Configuration

All booking rules live in environment variables (see `.env.example`):

| Variable | Default | Meaning |
|---|---|---|
| `CALENDAR_ID` | `primary` | Which calendar to read/write |
| `TIMEZONE` | `America/New_York` | IANA timezone for slot math + display |
| `BOOKING_START_HOUR` | `9` | First bookable hour (24h) |
| `BOOKING_END_HOUR` | `17` | Last bookable hour (24h) |
| `SLOT_MINUTES` | `30` | Slot length |
| `OWNER_EMAIL` | — | Only this account may connect |

## 5. Deploy to Vercel

```bash
vercel
```

Set the same env vars in the Vercel project settings, and make sure
`GOOGLE_REDIRECT_URI` points at your deployed callback URL (and that this URL is
listed in the Google OAuth client's Authorized redirect URIs).

## Notes & next steps

- **Single owner.** Tokens are stored under one fixed KV key. For multiple
  owners, key by owner id in `lib/tokens.ts` and add owner auth.
- **Race safety.** `/api/book` re-queries FreeBusy and re-validates the slot
  before inserting, so two visitors can't grab the same slot.
- **Privacy.** Availability uses FreeBusy, so visitors never see event titles or
  details — only busy/free.
- **Token expiry.** A Google refresh token can be revoked or (for unverified
  apps in Testing) expire after ~7 days. If bookings start failing, reconnect.
