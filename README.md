# ZuZu

An X-style social app: Node/Express + PostgreSQL (`pg`) backend, vanilla-JS single-page frontend (no build step).

- Live: https://xclone-dy1g.onrender.com (Render free tier, auto-deploys from `main`)
- Local: http://localhost:4180 (PORT env var to change)
- Demo login: demo / demo1234 (all seeded users use demo1234)

## Database
All data lives in PostgreSQL, set via `DATABASE_URL` (required). SSL is used automatically
when the host isn't localhost (`ssl: { rejectUnauthorized: false }`), e.g. for Neon.

On every start the server runs `schema.sql` (idempotent `CREATE ... IF NOT EXISTS`) and seeds
the demo users/posts **only if the users table is empty**. It never wipes data.
Uploaded images (post images, avatars, banners; max 5 MB) are stored in the `media` table
(bytea) and served from `GET /media/:id`, so nothing depends on the local disk.
`GET /healthz` checks the database connection.

## Render
Set `DATABASE_URL` (Neon connection string) in the service's Environment settings.
Build: `npm install`, start: `npm start` (= `node server.js`), health check: `/healthz`.

## Continue with Google (optional)
Server-side OAuth 2.0 authorization-code flow (`google-auth.js`, plain fetch). The button on the
login/sign-up pages only shows when both of these are set (`GET /api/config` -> `{"google": true}`):

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — OAuth client (type "Web application") from Google Cloud
- `PUBLIC_URL` — e.g. `https://zuzu-app.onrender.com`; redirect URI is `${PUBLIC_URL}/auth/google/callback`.
  If unset it is derived from the request (honours `x-forwarded-proto`/`x-forwarded-host`).

Flow: `GET /auth/google` (state + nonce in a 10-minute httpOnly cookie, `prompt=select_account`) ->
Google -> `GET /auth/google/callback` (state check, code exchange, id_token claims checked: aud, iss,
exp, email_verified) -> user found by `google_id`, else linked by matching `email`, else created
(username from the email local part, numeric suffix if taken; Google photo URL as avatar) -> `/home`.
Failures redirect to `/login?error=google`. Google-only users have no password (`password_hash` NULL),
so password login tells them to use Google. `GOOGLE_TOKEN_URL` is only for tests (mock token endpoint).

## Android app download
The signed APK (package `com.zuzu.app`) is committed at `public/download/ZuZu.apk` and served from
`GET /download/ZuZu.apk` (`Content-Type: application/vnd.android.package-archive`,
`Content-Disposition: attachment; filename="ZuZu.apk"`). The service worker never caches `/download`.
To ship a new build, replace that file and commit.

The SPA shows "Get the Android app" (with "Requires Chrome. Allow install from unknown sources.") under the
login/sign-up form, in the left nav and as a right-sidebar card when logged in, and on mobile as a dismissible
banner at the top of the home feed (dismissal kept in `localStorage` `zuzu.appBannerDismissed`).
It is shown only on Android and desktop browsers: hidden on iOS and inside the app itself, detected by
`display-mode: standalone`, a `document.referrer` starting with `android-app://com.zuzu.app`, or `?source=twa`
(remembered in `sessionStorage` for the tab).

## Direct messages
X-style 1:1 DMs. Tables (in `schema.sql`, idempotent): `dm_conversations` (one per pair, `user_a < user_b`
unique), `dm_members` (per-user `last_read_at` for read tracking) and `dm_messages` (text up to 1000 chars,
optional image in `media` with `conversation_id` set). DM images are only served to the two members
(`/media/:id` returns 404 to anyone else, `Cache-Control: private`). Message timestamps are strictly increasing
per conversation so read tracking by timestamp is exact.

API (login required; non-members get 404; responses are `Cache-Control: no-store`):

    GET    /api/dm/conversations                  list: other user, last message preview, unread, newest first
    POST   /api/dm/conversations {username}       get or create (400 for yourself)
    GET    /api/dm/conversations/:id              one conversation
    GET    /api/dm/conversations/:id/messages     ?before=<msg id>&limit= (older pages) or ?after=<msg id> (polling)
                                                  also returns other_last_read_at (for "Seen")
    POST   /api/dm/conversations/:id/messages     multipart text and/or image (PNG/JPEG/GIF/WebP, 5 MB,
                                                  type checked by magic bytes); 30 messages/min per user (429)
    POST   /api/dm/conversations/:id/read         {up_to: <msg id>} optional
    GET    /api/dm/unread                         total unread messages (also `dm_unread` in /api/me)
    DELETE /api/dm/messages/:id                   own messages only (403 otherwise)

UI: `/messages` (inbox + "search people to message") and `/messages/:id` (chat). Two panes on desktop; list then
full-screen chat with a back button on mobile. The open chat polls every 3 s and the Messages badge every 15 s,
both paused while the tab is hidden. Message text is escaped; http(s) URLs are linkified.
On startup, if there are no DM conversations at all, 3 short demo conversations are added (2 with `demo`).
The rate limiter is in memory, so it is per server instance and resets on restart.

## Local commands
    cd /workspace/xclone
    ./start.sh app        # (re)start the app in the background (logs: server.log)
                          # DATABASE_URL is read from .env.local (git-ignored); local Postgres is started if needed
    ./start.sh tunnel     # (re)start Cloudflare quick tunnel (logs: tunnel.log, URL in PUBLIC_URL.txt)
    ./start.sh            # both
    node seed.js          # create tables + seed demo data if the DB is empty (needs DATABASE_URL)
    node tests/api-test.js    # API checks (+ Google flow against a mock token endpoint on :4189)
    node tests/ui-test.js     # headless Chrome end-to-end flow
    node tests/shots.js       # regenerate screenshots/ (logs in as demo; opening DMs marks them read)

## Files
server.js (API + static), db.js (pg pool, schema init, first-run seed), schema.sql, seed.js,
public/{index.html,style.css,app.js,favicon.svg,sw.js,download/ZuZu.apk}, bin/cloudflared, screenshots/.
