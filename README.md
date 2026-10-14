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

## ZuZu AI (Ask about a post)
X/Grok-style AI on every post: a sparkle button labelled "Ask ZuZu AI" at the top-right of each post (feed, thread,
profiles, search). It opens a right side panel on desktop and a bottom sheet on mobile (drag down / tap outside / Esc
to close) with the post, quick-action chips (Explain this post, Give context, Summarize the replies, Fact-check,
Translate to Hindi or Translate to English for Hindi/non-Latin posts) and a free-text box (max 500 characters).
Follow-up questions keep the conversation in the panel. Answers stream in token by token and are rendered as escaped,
safe markdown (bold, italics, code, lists, http(s) links only).

Server (`ai.js`): `POST /api/ai/post/:id` (login required) with `{action | question, history, lang}`.
It builds the context from the post (text, author name + handle, ISO date), the parent post if it is a reply, and up
to 20 replies, and calls Groq's OpenAI-compatible `POST /chat/completions` with `stream: true`. Responses are
Server-Sent Events: `data: {"t": "..."}` per token, then `event: done` (`{model, cached, truncated}`) or `event: error`.
The system prompt defines ZuZu AI (helpful, concise, neutral, answers in the user's language, says when unsure,
can't browse the web). Post and reply content is untrusted: it goes only in a separate message, as JSON between
`<<<ZUZU_DATA_<random nonce>>>>` / `<<<END_ZUZU_DATA_<nonce>>>>` markers (marker-like `<<<`/`>>>` in content is
neutralised), and the system prompt says to treat it as data, never instructions.

Limits: 600 answer tokens (`max_completion_tokens`; +400 headroom for reasoning models such as gpt-oss, which run with
`reasoning_effort: low` and hidden reasoning), 30 s timeout, 20 requests per user per 10 minutes (429 with a friendly
message + `Retry-After`; in memory, per instance), questions up to 500 characters. Identical Explain / Give context
answers (same post, language and model, no history) are cached in memory for 10 minutes and don't count against the
limit. Groq failures return friendly errors (502/503/504), never upstream details. The service worker never caches `/api/ai`.

Environment:

- `GROQ_API_KEY` — enables the feature. Without it `/api/config` returns `"ai": false`, the button is hidden and the
  endpoint returns 503; the app runs normally.
- `GROQ_MODEL` — optional, default `openai/gpt-oss-120b` (Groq retired `llama-3.3-70b-versatile` for
  non-enterprise accounts on 2026-08-16).
- `GROQ_BASE_URL` — tests only (points at the mock Groq server in `tests/ai-server.js`).
- `AI_TIMEOUT_MS`, `AI_RATE_MAX`, `AI_MAX_TOKENS` — optional overrides (defaults 30000, 20, 600).

## Admin dashboard (private)
`/admin` shows sign-up and activity stats; `GET /api/admin/stats` returns them as JSON. Both return a plain
**404** to everyone without access (logged out, non-admins, wrong/missing token), so the dashboard isn't discoverable.

- `ADMIN_USERNAMES` — comma-separated usernames (case-insensitive, `@` optional). These logged-in users get an
  "Admin" item in the left nav (chart icon in the mobile top bar), the `/admin` page and the API. `/api/me` returns
  `admin: true` only for them.
- `ADMIN_TOKEN` — long random string (`openssl rand -hex 32`). `Authorization: Bearer <ADMIN_TOKEN>` can read
  `GET /api/admin/stats` without logging in (not the page). Compared in constant time (SHA-256 + `timingSafeEqual`).
  Unset/empty = token access off.

All dates are **Asia/Kolkata (IST, UTC+05:30)**: "today" starts at 00:00 IST, "last 7/30 days" = today plus the
previous 6/29 IST days. Response (all `Cache-Control: no-store`):

    users            {total, real, demo, google}           demo = seeded accounts (users.is_demo)
    signups          {today, yesterday, last_7_days, last_30_days}   real users only
    daily_signups    [{date: "YYYY-MM-DD", count}] x 30, oldest first, last = today (IST)
    latest_signups   20 newest real users: {id, username, name, created_at (ms), google, profile_url}
    posts            {total, today, replies_today}           posts + replies (reposts not counted)
    dms              {total, today}                         DM messages
    active_users_today                                      posted/replied/reposted, liked or sent a DM today
    since            {since, count, users[], truncated}     only with ?since=<epoch ms>: real users created after it (list max 500)
    ideals           {users_with_ideal, users_without_ideal, custom, by_ideal: [{name, preset_id, custom, primary, color, count}] (top 50),
                      by_quality: [{quality, label, color, count}] (all 10, by primary quality)}   real users only

`curl -H "Authorization: Bearer $ADMIN_TOKEN" https://zuzu-app.onrender.com/api/admin/stats?since=1760000000000`

AI requests aren't counted (ZuZu AI only keeps an in-memory rate-limit window, not a daily log), so they're left out.
Seeded demo accounts are flagged by the idempotent `users.is_demo` column: `schema.sql` adds it once and backfills the
`seed.js` usernames (demo, zuzu_builder, priya_codes, rahul_cricket, spacenerd, foodie_arjun, newsbot, design_ananya;
password accounts only), and `seed.js` sets it for new seeds. The service worker never caches `/api/admin` or `/admin`.

## Choose your ideal
Users can pick an "ideal" (a role model they look up to) when signing up, in Edit profile, or later from their profile
or a one-time home-feed prompt. It's optional ("Skip for now" is the default).

- **Data:** `public/ideals.js` is the single source for the quality palette and the preset ideals. The browser loads it
  as `/ideals.js` (`window.ZUZU_IDEALS`), the server `require()`s it (`ideals.js` at the root validates and formats), and
  `GET /api/ideals` serves it. Edit descriptions/colours/presets there; keep preset `id`s stable once people use them.
- **Palette** (one colour per quality, all >= 4.5:1 on black): Wisdom `#3B82F6`, Courage `#EF4444`, Peace `#E5E7EB`,
  Compassion `#EC4899`, Discipline `#F59E0B`, Creativity `#A855F7`, Leadership `#FACC15`, Devotion `#F97316`,
  Justice `#22C55E`, Innovation `#06B6D4`. Each ideal's primary quality sets its colour; 1-2 secondary qualities show as chips.
- **Make your own:** name (trimmed, spaces collapsed, max 40 chars, no `<`/`>` or control characters) + 1-3 quality keys;
  the first is the primary. Validated on the server; names are always escaped when shown.
- **Storage:** nullable `users.ideal_name`, `ideal_preset_id` (NULL for custom), `ideal_qualities TEXT[]` (idempotent
  `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`). Presets are displayed from the data file, so edits there apply everywhere.
- **API:** `POST /api/signup` takes optional `ideal: {presetId}` or `{custom: {name, qualities}}` (bad ideal -> 400, no
  account created); `PUT /api/me/ideal {ideal}` sets/changes it (`null` clears it). Users (`publicUser`) carry
  `ideal: {name, preset_id, custom, description, qualities, primary, color}` or `null`; posts carry the author's
  `ideal: {name, primary, color}` for the small coloured dot next to names.
- **UI:** coloured card grid after the password field (2 columns, scrolls inside on desktop; one horizontally scrolling
  row on mobile), selected card gets a ring + check. Profile badge "Ideal: <name>" in the primary colour with chips.
  New Google accounts land on `/home?ideal=1`, which opens the picker once. Users without an ideal see a dismissible
  "Choose your ideal" card at the top of the home feed (dismissal in `localStorage` `zuzu.idealPromptDismissed.<user id>`).

## Momo the monkey 🐒
A playful cartoon monkey (inline SVG + CSS, no assets or libraries) that keeps you company in the feed. He's fixed to
the viewport. When scrolling stops for ~600 ms he crouches, jumps in an arc (squash and stretch on landing) onto the post
nearest the centre of the screen and sits on its top-right corner with his legs dangling. While the page scrolls he
rides along with that post; if it leaves the view he hops to the next one. After landing he puts a hand on his chin and
shows a cloud thought bubble (💬) with a short reflection on the post for ~6 s. Tap Momo to see the thought again
(tap again for a playful new line); tap the bubble to open "Ask ZuZu AI" for that post (when AI is enabled).

- Where: home, explore, profiles and the thread view. Hidden on login/sign-up, DMs, admin, other pages, and while the
  ZuZu AI panel or any modal is open. He never perches where he'd cover a post's action buttons, the ⋯ / AI buttons
  (his dangling legs are click-through) or the composer. Mobile: ~56 px tall (72 px on desktop), kept above the
  bottom tab bar.
- Motion: requestAnimationFrame + CSS transforms (one rect read then one transform write per frame), IntersectionObserver
  for which posts are visible / when his post leaves the view, plus scroll-end detection. `prefers-reduced-motion`:
  fades between posts instead of jumping and stops the idle animations. No work while the tab is hidden; after ~2 minutes
  without activity he falls asleep with a "z z z" bubble and wakes on scroll.
- Toggle: "Show Momo 🐒" in the left nav (🐒 button in the mobile top bar), saved in `localStorage` `zuzu.momo`
  (`'0'` = off; on by default).

Server (`monkey.js`): `GET /api/monkey/thought/:postId` (login required, `Cache-Control: no-store`) returns
`{thought, source}` with `source` = `ai` | `cache` | `fallback` | `rate_limited`; 404 for unknown posts (reposts resolve to
the original). Thoughts come from Groq (same `GROQ_*` env and model as ZuZu AI, non-streaming, 60 completion tokens +
the 400-token reasoning headroom for gpt-oss, low reasoning effort, 12 s timeout) with a tight system prompt: "You are
Momo, ZuZu's playful monkey… one short, kind reflection, max 90 characters, at most one emoji, in the post's language
(Hindi / Hinglish when the post is)". The post text is untrusted: it is sent only as JSON between
`<<<MOMO_DATA_<nonce>>>>` markers (marker-like `<<<`/`>>>` neutralised) and the prompt says never to follow instructions
inside it. Output is cleaned (no quotes/labels/markdown, one emoji max) and capped at 90 characters at a word boundary
with "…". The result is stored in `posts.monkey_thought` (nullable column, added idempotently in `schema.sql`), so each
post costs at most one successful Groq call ever; concurrent requests for the same post share one call, and a post whose
call failed isn't retried for 10 minutes. If AI is off (no `GROQ_API_KEY`), Groq fails/times out/returns nothing, the
post has no text, or the user hit the limit (30 Groq-backed thoughts per user per 10 minutes, in memory per instance;
`MONKEY_RATE_MAX` to override), a local fallback line is returned: ~30 cute English lines plus Hindi and Hinglish ones,
picked by post id so it's stable. The client caches thoughts per post id (memory + `sessionStorage`) and never refetches
while Momo just sits there. The service worker never caches `/api/monkey`.
Optional env: `MONKEY_RATE_MAX`, `MONKEY_TIMEOUT_MS`, `MONKEY_MAX_TOKENS`. `localStorage` `zuzu.momoIdleMs` overrides the
2-minute sleep timer (tests only).

## Video posts + Reels (Cloudinary)
Videos never touch Postgres or the Render disk: the browser uploads straight to Cloudinary with a server-signed request,
and Postgres stores only metadata (`post_videos`: public_id, cloud_name, version, format, duration, width, height, bytes,
poster, is_reel; added idempotently in `schema.sql`).

- Enable: set `CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>` (Render dashboard; not committed).
  Without it `/api/config` returns `video:false`, the video/record buttons, Reels nav and profile Reels tab are hidden
  and the app starts normally (existing video posts still render).
- Limits (client + server): 100 MB, mp4/mov/webm/3gp/mkv, posts up to 3 min, Reels up to 90 s. The composer suggests
  "Post as Reel" for vertical clips of 90 s or less. Files over 20 MB upload in 10 MB chunks (`X-Unique-Upload-Id` +
  `Content-Range`) with a progress bar and cancel.
- API: `POST /api/video/sign` (login, 30/hour/user) returns `{cloudName, apiKey, uploadUrl, params, chunkSize,
  chunkThreshold, limits}`; `params` (timestamp, signature, folder `zuzu`, tags, `context=uid=<user>`, allowed_formats,
  async eager `c_limit,q_auto,vc_h264,w_720/mp4|c_limit,q_auto,so_1,w_720/jpg`) is posted as-is. SHA-1 signature computed
  on the server. `POST /api/posts` takes `video` = `{public_id, version, duration, width, height, bytes}` + `is_reel`;
  the server checks the asset with the Admin API (`GET resources/video/upload/<public_id>`: exists, video, folder,
  uploader uid, format, size, duration) before saving. 409 if the asset is already used. `POST /api/video/discard`
  removes an uploaded-but-unposted asset. `GET /api/reels?cursor=&limit=` pages Reels. Deleting a post queues
  the asset in `video_deletions` and destroys it with the signed destroy API (retried every 15 min, up to 10 attempts).
- Delivery: `c_limit,f_auto,q_auto,vc_auto,w_720` plus an H.264 mp4 fallback, poster `so_1` jpg; `preload=metadata`.
- Feed: muted inline player, autoplays when 60% visible, one at a time, pauses out of view, loops clips of 60 s or less,
  tap to pause, mute button, duration badge. Reels (`/reels`, `/reels/:postId`): full-screen scroll-snap feed (centred
  9:16 column on desktop), sound on after the first gesture, tap to pause, like/comment/share/ZuZu AI/mute on the right,
  next reel preloaded, keys ↑/↓/j/k/space/m. Momo is hidden on Reels; ZuZu AI and Momo read the caption only.
- The service worker (`zuzu-v8`) never caches videos, Cloudinary URLs, Range requests, `/api/video` or `/api/reels`.
- Optional env: `CLOUDINARY_TIMEOUT_MS`, `VIDEO_SIGN_RATE_MAX`. Tests only: `CLOUDINARY_API_BASE`,
  `CLOUDINARY_DELIVERY_BASE`, `VIDEO_CHUNK_SIZE`, `VIDEO_CHUNK_THRESHOLD` (tests use the mock in
  `tests/cloudinary-server.js`, which needs system ffmpeg/ffprobe).
- Free plan caveats: about 25 monthly credits shared by storage, bandwidth and transformations; large videos (~40 MB+)
  can't be transformed on the fly, which is why the transforms are generated eagerly (async). The first views of a fresh
  upload may fall back to the mp4 source while they're processing. Admin API is rate limited (~500 calls/hour), and every
  video post makes one call. If the tab is closed mid-compose, the uploaded asset stays orphaned in Cloudinary.

## Local commands
    cd /workspace/xclone
    ./start.sh app        # (re)start the app in the background (logs: server.log)
                          # DATABASE_URL is read from .env.local (git-ignored); local Postgres is started if needed
    ./start.sh tunnel     # (re)start Cloudflare quick tunnel (logs: tunnel.log, URL in PUBLIC_URL.txt)
    ./start.sh            # both
    node seed.js          # create tables + seed demo data if the DB is empty (needs DATABASE_URL)
    node tests/api-test.js    # API checks (+ Google flow against a mock token endpoint on :4189,
                              #  ZuZu AI against a mock Groq server with app instances on :4192/:4193,
                              #  admin dashboard with instances on :4196 (admin on) / :4197 (admin off))
    node tests/ui-test.js     # headless Chrome end-to-end flow (ZuZu AI on :4194/:4195 with the mock;
                              #  writes screenshots 12-ai-desktop.png / 13-ai-mobile.png; admin UI on :4198 -> 14-admin.png;
                              #  ideal picker -> 15-ideal-signup.png / 16-ideal-mobile.png / 17-ideal-profile.png;
                              #  Momo on :4204 with the mock -> 18-monkey-desktop.png / 19-monkey-mobile.png;
                              #  video/Reels on :4224 (mock Cloudinary) / :4225 (off) -> 20-video-feed.png /
                              #  21-reels-mobile.png / 22-composer-video.png; UI_ONLY=video runs just that part)
                              # (api-test: Momo on :4201 (mock Groq) / :4202 (AI off). Mock thoughts cached in the
                              #  local DB are cleared afterwards. Requests to the main server's /api/monkey are stubbed.)
    node tests/monkey-demo.js # record screenshots/monkey-demo.gif + .mp4 (Momo hopping while scrolling; mock Groq on :4205;
                              #  needs `npx playwright-core install ffmpeg` once, plus system ffmpeg)
    # Run tests with `env -u DATABASE_URL` so only the local DB from .env.local is used.
    node tests/shots.js       # regenerate screenshots/ (logs in as demo; opening DMs marks them read)

## Files
server.js (API + static), video.js (Cloudinary video + Reels), ai.js (ZuZu AI), monkey.js (Momo's thoughts), admin.js (admin dashboard API + /admin access), ideals.js (ideal validation/output), db.js (pg pool, schema init, first-run seed), schema.sql, seed.js,
public/{index.html,style.css,app.js,ideals.js,favicon.svg,sw.js,download/ZuZu.apk}, bin/cloudflared, screenshots/.
