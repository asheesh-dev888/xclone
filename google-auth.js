// "Continue with Google": OAuth 2.0 authorization-code flow (server side, plain fetch).
// Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, PUBLIC_URL (optional; else derived from the request).
// GOOGLE_TOKEN_URL / GOOGLE_USERINFO_URL exist only so tests can point at a mock server.
const crypto = require('crypto');

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = () => process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token';
const USERINFO_URL = () => process.env.GOOGLE_USERINFO_URL || 'https://openidconnect.googleapis.com/v1/userinfo';
const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);
const USERNAME_RE = /^[A-Za-z0-9_.]{3,20}$/;
const MAX_LEN = 20;

const config = () => ({ clientId: process.env.GOOGLE_CLIENT_ID || '', clientSecret: process.env.GOOGLE_CLIENT_SECRET || '' });
const enabled = () => { const c = config(); return !!(c.clientId && c.clientSecret); };

function baseUrl(req) {
  const pub = (process.env.PUBLIC_URL || '').trim().replace(/\/+$/, '');
  if (pub) return pub;
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost').split(',')[0].trim();
  return `${proto}://${host}`;
}
const redirectUri = (req) => baseUrl(req) + '/auth/google/callback';

function authUrl({ clientId, redirectUri, state, nonce }) {
  const q = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: 'code',
    scope: 'openid email profile', state, nonce, prompt: 'select_account',
  });
  return `${AUTH_URL}?${q}`;
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
};

function decodeJwtPayload(jwt) {
  const parts = String(jwt || '').split('.');
  if (parts.length !== 3) throw new Error('malformed id_token');
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
}

// The id_token comes straight from Google's token endpoint over TLS (authenticated with our
// client secret), so per OpenID Connect Core 3.1.3.7 the TLS server validation stands in for
// signature checking. We still validate the claims.
function verifyClaims(claims, { clientId, nonce, nowMs = Date.now() }) {
  if (!claims || typeof claims !== 'object') throw new Error('no claims');
  if (!ISSUERS.has(claims.iss)) throw new Error('bad iss');
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(clientId)) throw new Error('bad aud');
  if (Array.isArray(claims.aud) && claims.aud.length > 1 && claims.azp !== clientId) throw new Error('bad azp');
  if (!(Number(claims.exp) * 1000 > nowMs - 60e3)) throw new Error('id_token expired');
  if (nonce && claims.nonce !== undefined && !safeEqual(claims.nonce, nonce)) throw new Error('bad nonce');
  if (!claims.sub) throw new Error('no sub');
  if (!claims.email || !(claims.email_verified === true || claims.email_verified === 'true')) throw new Error('email not verified');
  return claims;
}

// Exchange the authorization code and return verified profile: { sub, email, name, picture }.
async function fetchProfile({ code, redirectUri, nonce }) {
  const { clientId, clientSecret } = config();
  const r = await fetch(TOKEN_URL(), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    signal: AbortSignal.timeout(10000),
  });
  const tok = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('token exchange failed: ' + (tok.error || r.status));
  let claims;
  if (tok.id_token) {
    claims = verifyClaims(decodeJwtPayload(tok.id_token), { clientId, nonce });
  } else if (tok.access_token) {
    const u = await fetch(USERINFO_URL(), { headers: { authorization: 'Bearer ' + tok.access_token }, signal: AbortSignal.timeout(10000) });
    if (!u.ok) throw new Error('userinfo failed: ' + u.status);
    const info = await u.json();
    if (!info.sub || !info.email || !(info.email_verified === true || info.email_verified === 'true')) throw new Error('email not verified');
    claims = info;
  } else throw new Error('no id_token or access_token');
  return { sub: String(claims.sub), email: String(claims.email).toLowerCase(), name: claims.name || claims.given_name || '', picture: claims.picture || '' };
}

// Username base from the email local part (or the name), cut down to the signup rules.
function usernameBase(email, name) {
  const clean = (s) => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_').replace(/[^A-Za-z0-9_.]/g, '').replace(/^[._]+|[._]+$/g, '').slice(0, MAX_LEN);
  const local = String(email || '').split('@')[0].split('+')[0];
  for (const cand of [clean(local), clean(name)]) if (cand.length >= 3) return cand;
  const short = clean(local) || clean(name);
  return short ? (short + '_user').slice(0, MAX_LEN) : 'user';
}

// First free name: base, base1, base2, ... (trimming base so it stays <= 20 chars).
// isTaken(name) -> Promise<boolean>, case-insensitive check against existing users.
async function uniqueUsername(base, isTaken, { maxTries = 200 } = {}) {
  base = USERNAME_RE.test(base) ? base : usernameBase('', base);
  if (!await isTaken(base)) return base;
  for (let n = 1; n <= maxTries; n++) {
    const s = String(n), cand = base.slice(0, MAX_LEN - s.length) + s;
    if (!await isTaken(cand)) return cand;
  }
  for (;;) {
    const s = String(crypto.randomInt(1000, 1e9)), cand = base.slice(0, MAX_LEN - s.length) + s;
    if (!await isTaken(cand)) return cand;
  }
}

// Google profile photos: ask for a larger square than the default 96px; https only.
function avatarUrl(picture) {
  try {
    const u = new URL(picture);
    if (u.protocol !== 'https:') return null;
    return u.toString().replace(/=s\d+-c$/, '=s400-c');
  } catch { return null; }
}

module.exports = { enabled, config, redirectUri, baseUrl, authUrl, safeEqual, decodeJwtPayload, verifyClaims, fetchProfile, usernameBase, uniqueUsername, avatarUrl, USERNAME_RE };
