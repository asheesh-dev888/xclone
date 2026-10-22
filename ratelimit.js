// Small in-memory fixed-window limiter for auth endpoints (single Render instance).
// req.ip is the real client IP because server.js sets `trust proxy` (Render's load balancer adds X-Forwarded-For).
const int = (k, d) => parseInt(process.env[k] || '', 10) || d;
function createLimiter({ max, windowMs }) {
  const hits = new Map(); // key -> { n, reset }
  const entry = (key, t = Date.now()) => {
    let e = hits.get(key);
    if (!e || e.reset <= t) { e = { n: 0, reset: t + windowMs }; hits.set(key, e); }
    return e;
  };
  setInterval(() => { const t = Date.now(); for (const [k, e] of hits) if (e.reset <= t) hits.delete(k); }, 60e3).unref();
  return {
    blocked: (key) => { const e = hits.get(key); return !!(e && e.reset > Date.now() && e.n >= max) && Math.ceil((e.reset - Date.now()) / 1000); },
    hit: (key) => { entry(key).n++; },
    reset: (key) => { hits.delete(key); },
  };
}
const tooMany = (res, secs, msg) => { res.set('Retry-After', String(secs)); return res.status(429).json({ error: msg }); };
// Login: LOGIN_RATE_MAX failed attempts (default 5) per client network + username per 15 minutes. A successful login clears the counter.
const login = createLimiter({ max: int('LOGIN_RATE_MAX', 5), windowMs: 15 * 60e3 });
// Signup: SIGNUP_RATE_MAX attempts (default 10) per IP per hour.
const signup = createLimiter({ max: int('SIGNUP_RATE_MAX', 10), windowMs: 3600e3 });
// Group the client address by network (IPv4 /24, IPv6 /64) so clients whose egress IP rotates within one
// provider range (common with mobile carriers / NAT pools) still share a counter.
function netOf(ip) {
  const s = String(ip || '').replace(/^::ffff:/, '');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(s)) return s.split('.').slice(0, 3).join('.') + '.0/24';
  if (s.includes(':')) return s.split(':').slice(0, 4).join(':') + '::/64';
  return s;
}
const loginKey = (req, username) => netOf(req.ip) + '|' + String(username || '').trim().replace(/^@/, '').toLowerCase().slice(0, 64);
const waitMsg = (secs) => `Too many failed sign-in attempts. Please wait ${Math.max(1, Math.ceil(secs / 60))} minute${secs > 60 ? 's' : ''} and try again, or use “Forgot password?”.`;
module.exports = { createLimiter, netOf, tooMany, login, signup, loginKey, waitMsg };
