// Password change + recovery: one-time recovery codes (hashed), optional verified email, email reset links.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mail = require('./mail');

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
function genCode() {
  const b = crypto.randomBytes(16);
  const s = [...b].map(x => ALPHA[x % 32]).join(''); // 32 divides 256: no modulo bias
  return s.match(/.{4}/g).join('-');
}
const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/O/g, '0').replace(/I/g, '1');
const sha = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');
const EMAIL_RE = /^[^\s@<>()",;:]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
const RESET_MS = 30 * 60e3, VERIFY_MS = 48 * 3600e3;
const lim = (k, d) => parseInt(process.env[k] || '', 10) || d;
const publicUrl = () => (process.env.PUBLIC_URL || 'https://zuzu-app.onrender.com').trim().replace(/\/+$/, '');

async function issueCode(db, userId, client) {
  const code = genCode();
  await db.run('UPDATE users SET recovery_hash=$1 WHERE id=$2', [bcrypt.hashSync(normCode(code), 10), userId], client);
  return code;
}
// DB-backed limiter: true if allowed (and records the attempt).
async function allow(db, key, max, windowMs) {
  const t = Date.now();
  const { n } = await db.get('SELECT COUNT(*)::int n FROM auth_attempts WHERE key=$1 AND at > $2', [key, t - windowMs]);
  if (n >= max) return false;
  await db.run('INSERT INTO auth_attempts(key, at) VALUES ($1,$2)', [key, t]);
  if (Math.random() < 0.02) db.run('DELETE FROM auth_attempts WHERE at < $1', [t - 86400e3]).catch(() => {});
  return true;
}
const tooMany = (res) => { res.set('Retry-After', '900'); return res.status(429).json({ error: 'Too many attempts. Please wait 15 minutes and try again.' }); };
const pwError = (p) => (typeof p !== 'string' || p.length < 6) ? 'Password must be at least 6 characters' : p.length > 200 ? 'Password is too long' : null;
function cleanEmail(e) {
  if (e == null || e === '') return null;
  const s = String(e).trim();
  if (!s) return null;
  if (s.length > 254 || !EMAIL_RE.test(s)) throw Object.assign(new Error('Enter a valid email address'), { status: 400 });
  return s;
}

async function sendVerify(db, user, email) {
  if (!mail.enabled()) return false;
  const token = crypto.randomBytes(32).toString('hex');
  await db.run('INSERT INTO auth_tokens(token_hash,kind,user_id,email,expires_at,created_at) VALUES ($1,$2,$3,$4,$5,$6)', [sha(token), 'verify', user.id, email, Date.now() + VERIFY_MS, Date.now()]);
  const link = `${publicUrl()}/verify-email?token=${token}`;
  await mail.send({ to: email, subject: 'Confirm your email for ZuZu',
    text: `Hi @${user.username},\n\nConfirm this email for your ZuZu account:\n${link}\n\nIf you didn’t add it, ignore this message.`,
    html: `<p>Hi @${user.username},</p><p>Confirm this email for your ZuZu account:</p><p><a href="${link}">Confirm email</a></p><p>If you didn’t add it, ignore this message.</p>` });
  return true;
}
const accountOut = (u) => ({ email: u.email || null, email_verified: !!u.email_verified, has_recovery_code: !!u.recovery_hash, has_password: !!u.password_hash, email_enabled: mail.enabled() });

function register(app, { auth, h, db, startSession, publicUser, findUser }) {
  app.use(['/api/me/password', '/api/me/recovery-code', '/api/me/account', '/api/me/email', '/api/password'], (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

  app.get('/api/me/account', auth, (req, res) => res.json({ account: accountOut(req.user) }));

  // Change password: current password required; every other session is signed out.
  app.post('/api/me/password', auth, h(async (req, res) => {
    const { current = '', new_password: np } = req.body || {};
    if (!await allow(db, 'pw:' + req.user.id, lim('AUTH_RATE_USER', 10), 15 * 60e3)) return tooMany(res);
    if (req.user.password_hash && !bcrypt.compareSync(String(current), req.user.password_hash)) return res.status(401).json({ error: 'Current password is wrong' });
    const e = pwError(np); if (e) return res.status(400).json({ error: e });
    const token = req.cookies.sid || (req.headers.authorization || '').replace(/^Bearer /, '');
    await db.tx(async (c) => {
      await db.run('UPDATE users SET password_hash=$1 WHERE id=$2', [bcrypt.hashSync(np, 10), req.user.id], c);
      await db.run('DELETE FROM sessions WHERE user_id=$1 AND token<>$2', [req.user.id, token], c);
      await db.run(`UPDATE auth_tokens SET used_at=$2 WHERE user_id=$1 AND kind='reset' AND used_at IS NULL`, [req.user.id, Date.now()], c);
    });
    res.json({ ok: true });
  }));

  // (Re)generate the recovery code: password required (if the account has one). Shown once.
  app.post('/api/me/recovery-code', auth, h(async (req, res) => {
    if (!await allow(db, 'pw:' + req.user.id, lim('AUTH_RATE_USER', 10), 15 * 60e3)) return tooMany(res);
    if (req.user.password_hash && !bcrypt.compareSync(String((req.body || {}).password || ''), req.user.password_hash)) return res.status(401).json({ error: 'Password is wrong' });
    res.json({ recovery_code: await issueCode(db, req.user.id) });
  }));

  // Optional email (unique, case-insensitive). Saved unverified; a link is sent when email is configured.
  app.put('/api/me/email', auth, h(async (req, res) => {
    let email;
    try { email = cleanEmail((req.body || {}).email); } catch (e) { return res.status(400).json({ error: e.message }); }
    if (email && req.user.email && email.toLowerCase() === req.user.email.toLowerCase() && req.user.email_verified) return res.json({ account: accountOut(req.user), sent: false });
    if (email && !await allow(db, 'email:' + req.user.id, lim('EMAIL_RATE_USER', 5), 3600e3)) return tooMany(res);
    let u;
    try { u = await db.get('UPDATE users SET email=$1, email_verified=FALSE WHERE id=$2 RETURNING *', [email, req.user.id]); }
    catch (e) { if (e.code === '23505') return res.status(409).json({ error: 'That email is already used by another account' }); throw e; }
    await db.run(`DELETE FROM auth_tokens WHERE user_id=$1 AND kind='verify'`, [u.id]);
    let sent = false;
    if (email) sent = await sendVerify(db, u, email).catch((e) => { console.warn('verify mail failed:', e.message); return false; });
    res.json({ account: accountOut(u), sent });
  }));
  app.get('/verify-email', h(async (req, res) => {
    const t = String(req.query.token || '');
    const row = /^[0-9a-f]{64}$/.test(t) && await db.get(`SELECT * FROM auth_tokens WHERE token_hash=$1 AND kind='verify' AND used_at IS NULL AND expires_at > $2`, [sha(t), Date.now()]);
    let ok = false;
    if (row) {
      const r = await db.run('UPDATE users SET email_verified=TRUE WHERE id=$1 AND lower(email)=lower($2)', [row.user_id, row.email]);
      await db.run('UPDATE auth_tokens SET used_at=$1 WHERE token_hash=$2', [Date.now(), row.token_hash]);
      ok = (r.rowCount ?? r.changes ?? 1) > 0;
    }
    res.set('Cache-Control', 'no-store').type('html').send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>ZuZu</title>
<body style="background:#000;color:#e7e9ea;font:17px system-ui;text-align:center;padding:60px 20px"><h1>${ok ? 'Email confirmed ✓' : 'Link expired or invalid'}</h1>
<p>${ok ? 'You can now reset your password by email if you ever forget it.' : 'Add your email again in Settings to get a new link.'}</p><p><a style="color:#1d9bf0" href="/settings">Go to ZuZu</a></p></body>`);
  }));

  // Forgot password, way 1: username + recovery code + new password. Consumes the code and returns a new one.
  app.post('/api/password/recover', h(async (req, res) => {
    const b = req.body || {};
    const uname = String(b.username || '').trim().replace(/^@/, '').toLowerCase().slice(0, 40);
    if (!await allow(db, 'rec-ip:' + req.ip, lim('RECOVER_RATE_IP', 20), 15 * 60e3)) return tooMany(res);
    if (!await allow(db, 'rec-user:' + uname, lim('RECOVER_RATE_USER', 5), 15 * 60e3)) return tooMany(res);
    const e = pwError(b.new_password); if (e) return res.status(400).json({ error: e });
    const u = uname && await findUser(uname);
    const code = normCode(b.code);
    const ok = u && u.recovery_hash && code.length === 16 && bcrypt.compareSync(code, u.recovery_hash);
    if (!ok) return res.status(400).json({ error: 'That username and recovery code don’t match' });
    let fresh;
    await db.tx(async (c) => {
      await db.run('UPDATE users SET password_hash=$1 WHERE id=$2', [bcrypt.hashSync(b.new_password, 10), u.id], c);
      await db.run('DELETE FROM sessions WHERE user_id=$1', [u.id], c);
      fresh = await issueCode(db, u.id, c);
    });
    await startSession(res, u.id);
    res.json({ ok: true, user: publicUser(u), recovery_code: fresh });
  }));

  // Forgot password, way 2: email a single-use link (username or email). Always the same generic answer.
  app.post('/api/password/email', h(async (req, res) => {
    if (!mail.enabled()) return res.status(503).json({ error: 'Email reset isn’t available yet. Use your recovery code.' });
    const login = String((req.body || {}).login || '').trim().replace(/^@/, '').slice(0, 254);
    const generic = { ok: true, message: 'If that account has a confirmed email, a reset link is on its way. It works for 30 minutes.' };
    if (!await allow(db, 'mail-ip:' + req.ip, lim('MAIL_RATE_IP', 10), 3600e3)) return tooMany(res);
    if (!login || !await allow(db, 'mail-login:' + login.toLowerCase(), lim('MAIL_RATE_LOGIN', 3), 3600e3)) return res.json(generic);
    const u = login.includes('@')
      ? await db.get('SELECT * FROM users WHERE lower(email)=lower($1) AND email_verified', [login])
      : await db.get('SELECT * FROM users WHERE lower(username)=lower($1) AND email IS NOT NULL AND email_verified', [login]);
    if (u) {
      const token = crypto.randomBytes(32).toString('hex');
      await db.run('INSERT INTO auth_tokens(token_hash,kind,user_id,email,expires_at,created_at) VALUES ($1,$2,$3,$4,$5,$6)', [sha(token), 'reset', u.id, u.email, Date.now() + RESET_MS, Date.now()]);
      const link = `${publicUrl()}/reset?token=${token}`;
      mail.send({ to: u.email, subject: 'Reset your ZuZu password',
        text: `Hi @${u.username},\n\nReset your ZuZu password with this link (valid for 30 minutes, one use):\n${link}\n\nIf you didn’t ask for this, ignore this email; your password stays the same.`,
        html: `<p>Hi @${u.username},</p><p>Reset your ZuZu password with this link (valid for 30 minutes, one use):</p><p><a href="${link}">Reset password</a></p><p>If you didn’t ask for this, ignore this email; your password stays the same.</p>` })
        .catch((e) => console.warn('reset mail failed:', e.message));
    }
    res.json(generic);
  }));
  app.post('/api/password/reset', h(async (req, res) => {
    const b = req.body || {}, t = String(b.token || '');
    if (!await allow(db, 'reset-ip:' + req.ip, lim('RESET_RATE_IP', 20), 15 * 60e3)) return tooMany(res);
    const e = pwError(b.new_password); if (e) return res.status(400).json({ error: e });
    const row = /^[0-9a-f]{64}$/.test(t) && await db.get(`SELECT * FROM auth_tokens WHERE token_hash=$1 AND kind='reset' AND used_at IS NULL AND expires_at > $2`, [sha(t), Date.now()]);
    if (!row) return res.status(400).json({ error: 'This reset link is invalid or has expired. Ask for a new one.' });
    await db.tx(async (c) => {
      const r = await db.get(`UPDATE auth_tokens SET used_at=$1 WHERE token_hash=$2 AND used_at IS NULL RETURNING user_id`, [Date.now(), row.token_hash], c);
      if (!r) throw Object.assign(new Error('This reset link was already used'), { status: 400 });
      await db.run('UPDATE users SET password_hash=$1 WHERE id=$2', [bcrypt.hashSync(b.new_password, 10), row.user_id], c);
      await db.run('DELETE FROM sessions WHERE user_id=$1', [row.user_id], c);
      await db.run(`UPDATE auth_tokens SET used_at=$1 WHERE user_id=$2 AND kind='reset' AND used_at IS NULL`, [Date.now(), row.user_id], c);
    });
    const u = await db.get('SELECT username FROM users WHERE id=$1', [row.user_id]);
    res.json({ ok: true, username: u && u.username });
  }));
}

module.exports = { register, genCode, normCode, issueCode, cleanEmail, sendVerify, accountOut, sha };
