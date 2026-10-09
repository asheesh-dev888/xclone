# X Clone prototype

Node/Express + SQLite (better-sqlite3) backend, vanilla-JS single-page frontend (no build step).

- App: http://localhost:4180   (PORT env var to change)
- Demo login: demo / demo1234  (all seeded users use demo1234)

## Commands
    cd /workspace/xclone
    ./start.sh app        # (re)start the app in the background (logs: server.log)
    ./start.sh tunnel     # (re)start Cloudflare quick tunnel (logs: tunnel.log, URL in PUBLIC_URL.txt)
    ./start.sh            # both
    node seed.js          # WIPE and reseed demo data (stop the app first, then ./start.sh app)
    node tests/api-test.js    # 24 API checks
    node tests/ui-test.js     # headless Chrome end-to-end flow
    node tests/shots.js       # regenerate screenshots/ (read-only, logs in as demo)

## Files
server.js (API + static), schema.sql, seed.js, public/{index.html,style.css,app.js},
data/app.db (SQLite), uploads/ (images), bin/cloudflared, screenshots/.
