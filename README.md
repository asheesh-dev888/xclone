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

## Local commands
    cd /workspace/xclone
    ./start.sh app        # (re)start the app in the background (logs: server.log)
                          # DATABASE_URL is read from .env.local (git-ignored); local Postgres is started if needed
    ./start.sh tunnel     # (re)start Cloudflare quick tunnel (logs: tunnel.log, URL in PUBLIC_URL.txt)
    ./start.sh            # both
    node seed.js          # create tables + seed demo data if the DB is empty (needs DATABASE_URL)
    node tests/api-test.js    # API checks
    node tests/ui-test.js     # headless Chrome end-to-end flow
    node tests/shots.js       # regenerate screenshots/ (read-only, logs in as demo)

## Files
server.js (API + static), db.js (pg pool, schema init, first-run seed), schema.sql, seed.js,
public/{index.html,style.css,app.js,favicon.svg}, bin/cloudflared, screenshots/.
