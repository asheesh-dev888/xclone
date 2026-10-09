// Test helper: start a second, local-only ZuZu instance with Google sign-in configured
// against a mock Google token endpoint. Always uses the local DB from .env.local.
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function localDbUrl() {
  const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
  const m = env.match(/^\s*DATABASE_URL\s*=\s*['"]?([^'"\n]+)/m);
  if (!m) throw new Error('DATABASE_URL missing from .env.local');
  const host = new URL(m[1]).hostname;
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)) throw new Error('refusing to test against non-local DB host ' + host);
  return m[1];
}

const b64url = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
// The mock treats the authorization code as base64url(JSON claims) and returns them as an id_token.
const codeFor = (claims) => b64url(claims);

function startMockGoogle(clientId, clientSecret) {
  const calls = [];
  const srv = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => body += c);
    req.on('end', () => {
      const p = new URLSearchParams(body);
      calls.push(Object.fromEntries(p));
      const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
      if (req.url !== '/token' || p.get('grant_type') !== 'authorization_code' || p.get('client_id') !== clientId || p.get('client_secret') !== clientSecret) return send(400, { error: 'invalid_client' });
      let claims;
      try { claims = JSON.parse(Buffer.from(p.get('code'), 'base64url').toString()); } catch { return send(400, { error: 'invalid_grant' }); }
      const full = { iss: 'https://accounts.google.com', aud: clientId, exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000), email_verified: true, ...claims };
      send(200, { access_token: 'mock-access', token_type: 'Bearer', expires_in: 3599, id_token: `${b64url({ alg: 'RS256' })}.${b64url(full)}.mock-signature` });
    });
  });
  return new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve({ srv, calls, url: `http://127.0.0.1:${srv.address().port}/token` })));
}

async function startGoogleApp({ port, clientId, clientSecret, tokenUrl, publicUrl }) {
  const env = { ...process.env, DATABASE_URL: localDbUrl(), PORT: String(port), GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret };
  if (tokenUrl) env.GOOGLE_TOKEN_URL = tokenUrl;
  if (publicUrl) env.PUBLIC_URL = publicUrl; else delete env.PUBLIC_URL;
  const child = spawn(process.execPath, [path.join(ROOT, 'server.js')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (d) => log += d); child.stderr.on('data', (d) => log += d);
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error('google test server exited:\n' + log);
    try { if ((await fetch(`http://localhost:${port}/healthz`)).ok) return { child, log: () => log }; } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  child.kill(); throw new Error('google test server did not start:\n' + log);
}

module.exports = { localDbUrl, codeFor, startMockGoogle, startGoogleApp };
