#!/usr/bin/env bash
# (Re)start the X clone app + Cloudflare quick tunnel in the background.
# Usage: ./start.sh            -> restart app and tunnel (tunnel URL changes)
#        ./start.sh app        -> restart only the app (tunnel URL stays)
#        ./start.sh tunnel     -> restart only the tunnel (new URL)
cd "$(dirname "$0")"
PORT="${PORT:-4180}"
what="${1:-all}"
if [[ $what == all || $what == app ]]; then
  pkill -f "node /workspace/xclone/server.js" 2>/dev/null; sleep 0.5
  PORT=$PORT setsid nohup node /workspace/xclone/server.js >> server.log 2>&1 < /dev/null &
  for i in $(seq 20); do curl -fs "localhost:$PORT/healthz" >/dev/null && break; sleep 0.5; done
  curl -fs "localhost:$PORT/healthz" >/dev/null && echo "App running: http://localhost:$PORT" || { echo "App failed to start; see server.log"; exit 1; }
fi
if [[ $what == all || $what == tunnel ]]; then
  pkill -f "cloudflared tunnel --url http://localhost:$PORT" 2>/dev/null; sleep 0.5
  : > tunnel.log
  setsid nohup ./bin/cloudflared tunnel --no-autoupdate --url "http://localhost:$PORT" >> tunnel.log 2>&1 < /dev/null &
  for i in $(seq 60); do url=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' tunnel.log | head -1); [[ -n $url ]] && break; sleep 1; done
  [[ -z $url ]] && { echo "Tunnel URL not issued; see tunnel.log"; exit 1; }
  for i in $(seq 45); do grep -q "Registered tunnel connection" tunnel.log && break; sleep 1; done
  if grep -q "Registered tunnel connection" tunnel.log; then echo "$url" > PUBLIC_URL.txt; echo "Public URL: $url"
  else echo "Tunnel got $url but could not connect to Cloudflare edge (port 7844 blocked?). See tunnel.log"; exit 1; fi
fi
