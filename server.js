// ZuZu: Express + PostgreSQL (pg), vanilla JS SPA frontend.
const express = require('express');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const db = require('./db');
const google = require('./google-auth');
const ai = require('./ai');
const admin = require('./admin');
const ideals = require('./ideals');
const monkey = require('./monkey');
const video = require('./video');
const safety = require('./safety');
const push = require('./push');
const batchd = require('./batchd');
const recovery = require('./recovery');
const mail = require('./mail');
const probes = require('./probes');
const games = require('./games');

const PORT = parseInt(process.env.PORT || '4180', 10);
const ROOT = __dirname;
const MAX_UPLOAD = 5 * 1024 * 1024;

const now = () => Date.now();
const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ---------- PWA / Android (Trusted Web Activity) ----------
// Digital Asset Links for the ZuZu Android app (com.zuzu.app). Edit assetlinks.json to change the signing cert.
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.type('application/json').sendFile(path.join(ROOT, 'assetlinks.json'));
});
app.get('/sw.js', (req, res) => {
  res.set({ 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/' });
  res.type('application/javascript').sendFile(path.join(ROOT, 'public', 'sw.js'));
});
app.get('/manifest.webmanifest', (req, res) => {
  res.type('application/manifest+json').sendFile(path.join(ROOT, 'public', 'manifest.webmanifest'));
});
// Android app download (signed APK for com.zuzu.app, committed at public/download/ZuZu.apk).
const APK_PATH = path.join(ROOT, 'public', 'download', 'ZuZu.apk');
app.get('/download/ZuZu.apk', (req, res, next) => {
  res.set({
    'Content-Type': 'application/vnd.android.package-archive',
    'Content-Disposition': 'attachment; filename="ZuZu.apk"',
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });
  res.sendFile(APK_PATH, (err) => { if (err && !res.headersSent) { res.removeHeader('Content-Disposition'); res.status(404).type('text').send('Not found'); } });
});
// Wrap async handlers so rejected promises reach the error handler (Express 4).
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------- auth ----------
app.use(h(async (req, res, next) => {
  const token = req.cookies.sid || (req.headers.authorization || '').replace(/^Bearer /, '');
  req.user = token && !req.path.startsWith('/media/') && !/\.(js|css|svg|png|ico|webmanifest|apk)$/.test(req.path)
    ? await db.get('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=$1', [token])
    : null;
  next();
}));
const auth = (req, res, next) => req.user ? next() : res.status(401).json({ error: 'Not logged in' });

async function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await db.run('INSERT INTO sessions(token,user_id,created_at) VALUES ($1,$2,$3)', [token, userId, now()]);
  res.cookie('sid', token, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 864e5 });
  return token;
}
const publicUser = (u) => u && ({ id: u.id, username: u.username, name: u.name, bio: u.bio, location: u.location, avatar: u.avatar, banner: u.banner, created_at: u.created_at, ideal: ideals.idealOut(u) });
const findUser = (name) => db.get('SELECT * FROM users WHERE lower(username)=lower($1)', [String(name)]);

const USERNAME_RE = /^[A-Za-z0-9_.]{3,20}$/;
const cleanUsername = (u) => String(u || '').trim().replace(/^@/, '').replace(/\s+/g, '_');
app.post('/api/signup', h(async (req, res) => {
  const { password = '', name = '' } = req.body || {};
  const username = cleanUsername((req.body || {}).username);
  if (!USERNAME_RE.test(username)) return res.status(400).json({ error: 'Username must be 3–20 characters: letters, numbers, _ or . (no spaces or emoji)' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  let ideal;
  try { ideal = ideals.parseIdeal((req.body || {}).ideal); } catch (e) { return res.status(400).json({ error: e.message }); }
  let email = null;
  try { email = recovery.cleanEmail((req.body || {}).email); } catch (e) { return res.status(400).json({ error: e.message }); }
  if (await findUser(username)) return res.status(409).json({ error: 'Username already taken' });
  if (email && await db.get('SELECT 1 FROM users WHERE lower(email)=lower($1)', [email])) return res.status(409).json({ error: 'That email is already used by another account' });
  let u;
  try {
    u = await db.get(`INSERT INTO users(username,name,password_hash,created_at,ideal_name,ideal_preset_id,ideal_qualities)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [username, (name || String((req.body || {}).username || '').trim().replace(/^@/, '') || username).slice(0, 50), bcrypt.hashSync(password, 10), now(),
        ideal ? ideal.name : null, ideal ? ideal.preset_id : null, ideal ? ideal.qualities : null]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Username already taken' });
    throw e;
  }
  const recovery_code = await recovery.issueCode(db, u.id);
  if (email) {
    try { u = await db.get('UPDATE users SET email=$1 WHERE id=$2 RETURNING *', [email, u.id]); await recovery.sendVerify(db, u, email).catch(() => false); }
    catch (e) { if (e.code !== '23505') throw e; }
  }
  await startSession(res, u.id);
  res.json({ user: publicUser(u), recovery_code });
}));
app.post('/api/login', h(async (req, res) => {
  const { username = '', password = '' } = req.body || {};
  const u = await findUser(String(username).replace(/^@/, ''));
  if (u && !u.password_hash) return res.status(401).json({ error: 'This account uses Google sign-in. Use “Continue with Google”.' });
  if (!u || !bcrypt.compareSync(String(password), u.password_hash)) return res.status(401).json({ error: 'Wrong username or password' });
  await startSession(res, u.id);
  res.json({ user: publicUser(u) });
}));
app.post('/api/logout', h(async (req, res) => {
  if (req.cookies.sid) await db.run('DELETE FROM sessions WHERE token=$1', [req.cookies.sid]);
  res.clearCookie('sid'); res.json({ ok: true });
}));
app.get('/api/me', h(async (req, res) => {
  if (!req.user) return res.json({ user: null });
  const { c } = await db.get('SELECT COUNT(*)::int c FROM notifications WHERE user_id=$1 AND NOT read', [req.user.id]);
  const dm = await db.get(`SELECT COUNT(*)::int n FROM dm_members mb JOIN dm_messages m ON m.conversation_id=mb.conversation_id
    WHERE mb.user_id=$1 AND m.sender_id<>$1 AND m.created_at>mb.last_read_at`, [req.user.id]);
  const out = { user: publicUser(req.user), unread: c, dm_unread: dm.n, prefs: { ui_lang: req.user.ui_lang || 'en', ai_lang: req.user.ai_lang || 'auto', momo_outfit: req.user.momo_outfit || null }, account: recovery.accountOut(req.user) };
  if (admin.isAdminUser(req.user)) out.admin = true; // only admins see the flag (and the Admin nav item)
  res.json(out);
}));

// ---------- Continue with Google (OAuth 2.0 authorization code flow) ----------
app.get('/api/config', (req, res) => res.json({ google: google.enabled(), ai: ai.enabled(), video: video.enabled(), email: mail.enabled() }));

const G_COOKIE = 'g_oauth';
const gCookieOpts = (req) => ({ httpOnly: true, sameSite: 'lax', secure: google.redirectUri(req).startsWith('https:'), path: '/auth/google' });
app.get('/auth/google', (req, res) => {
  if (!google.enabled()) return res.redirect('/login?error=google');
  const state = crypto.randomBytes(24).toString('hex'), nonce = crypto.randomBytes(16).toString('hex');
  res.cookie(G_COOKIE, state + '.' + nonce, { ...gCookieOpts(req), maxAge: 10 * 60e3 });
  res.redirect(google.authUrl({ clientId: google.config().clientId, redirectUri: google.redirectUri(req), state, nonce }));
});

// Find the user for this Google account: by google_id, else link by verified email, else create one.
async function userForGoogle(g) {
  let u = await db.get('SELECT * FROM users WHERE google_id=$1', [g.sub]);
  if (u) {
    if (!u.email) await db.run('UPDATE users SET email=$1 WHERE id=$2', [g.email, u.id]);
    return u;
  }
  const avatar = google.avatarUrl(g.picture);
  u = await db.get('SELECT * FROM users WHERE lower(email)=lower($1) AND google_id IS NULL ORDER BY id LIMIT 1', [g.email]);
  if (u) {
    return db.get('UPDATE users SET google_id=$1, avatar=COALESCE(avatar,$2) WHERE id=$3 RETURNING *', [g.sub, avatar, u.id]);
  }
  const base = google.usernameBase(g.email, g.name);
  for (let attempt = 0; ; attempt++) {
    const username = await google.uniqueUsername(base, async (n) => !!(await findUser(n)));
    try {
      const created = await db.get(`INSERT INTO users(username,name,password_hash,email,google_id,avatar,created_at)
        VALUES ($1,$2,NULL,$3,$4,$5,$6) RETURNING *`,
        [username, (String(g.name || '').trim() || username).slice(0, 50), g.email, g.sub, avatar, now()]);
      created.isNew = true;
      return created;
    } catch (e) {
      if (e.code !== '23505' || attempt >= 3) throw e;
      const again = await db.get('SELECT * FROM users WHERE google_id=$1', [g.sub]); // concurrent callback won
      if (again) return again;
    }
  }
}

app.get('/auth/google/callback', h(async (req, res) => {
  const fail = (why) => { console.warn('Google sign-in failed:', why); res.redirect('/login?error=google'); };
  const [state, nonce] = String(req.cookies[G_COOKIE] || '').split('.');
  res.clearCookie(G_COOKIE, gCookieOpts(req));
  if (!google.enabled()) return fail('not configured');
  if (req.query.error) return fail('google returned ' + req.query.error);
  if (!state || !google.safeEqual(state, req.query.state)) return fail('state mismatch');
  if (!req.query.code) return fail('missing code');
  let profile;
  try {
    profile = await google.fetchProfile({ code: String(req.query.code), redirectUri: google.redirectUri(req), nonce });
  } catch (e) { return fail(e.message); }
  const u = await userForGoogle(profile);
  if (req.cookies.sid) await db.run('DELETE FROM sessions WHERE token=$1', [req.cookies.sid]);
  await startSession(res, u.id);
  // Brand-new Google accounts get the "Choose your ideal" picker once (the SPA opens it for ?ideal=1).
  res.redirect(u.isNew && !u.ideal_name ? '/home?ideal=1' : '/home');
}));

// ---------- uploads (stored in Postgres, served from /media/:id) ----------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD },
  fileFilter: (req, file, cb) => cb(null, /^image\/(png|jpe?g|gif|webp)$/.test(file.mimetype)),
});
const newMediaId = () => crypto.randomBytes(12).toString('hex');
async function saveMedia(client, file, userId, postId = null) {
  const id = newMediaId();
  await db.run('INSERT INTO media(id,user_id,post_id,mime,size,data,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [id, userId, postId, file.mimetype, file.size, file.buffer, now()], client);
  return '/media/' + id;
}
const mediaIdOf = (url) => (url && url.startsWith('/media/') ? url.slice(7) : null);

app.get('/media/:id', h(async (req, res) => {
  if (!/^[0-9a-f]{24}$/.test(req.params.id)) return res.status(404).end();
  const meta = await db.get('SELECT conversation_id FROM media WHERE id=$1', [req.params.id]);
  if (!meta) return res.status(404).end();
  if (meta.conversation_id) {
    // DM image: only the two members of that conversation may see it.
    const token = req.cookies.sid || (req.headers.authorization || '').replace(/^Bearer /, '');
    const member = token && await db.get(`SELECT 1 FROM sessions s JOIN dm_members mb ON mb.user_id=s.user_id
      WHERE s.token=$1 AND mb.conversation_id=$2`, [token, meta.conversation_id]);
    if (!member) return res.status(404).end();
  }
  const m = await db.get('SELECT mime, data FROM media WHERE id=$1', [req.params.id]);
  if (!m) return res.status(404).end();
  res.set({ 'Content-Type': m.mime, 'Cache-Control': meta.conversation_id ? 'private, max-age=86400' : 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
  res.send(m.data);
}));

// ---------- posts ----------
// Base select for a post with author + counts + viewer state.
const POST_SELECT = `
SELECT p.id, p.text, p.image, p.parent_id, p.created_at, p.user_id, p.challenge_day, ${probes.PROBE_COLS},
  u.username, u.name, u.avatar, u.ideal_name, u.ideal_preset_id, u.ideal_qualities,
  (SELECT COUNT(*)::int FROM likes l WHERE l.post_id=p.id) like_count,
  (SELECT COUNT(*)::int FROM posts r WHERE r.parent_id=p.id) reply_count,
  (SELECT COUNT(*)::int FROM posts r WHERE r.repost_of=p.id) repost_count,
  EXISTS(SELECT 1 FROM likes l WHERE l.post_id=p.id AND l.user_id=@me) liked,
  EXISTS(SELECT 1 FROM posts r WHERE r.repost_of=p.id AND r.user_id=@me) reposted,
  (SELECT pu.username FROM posts pp JOIN users pu ON pu.id=pp.user_id WHERE pp.id=p.parent_id) reply_to,
  ${video.SELECT_COLS},
  (SELECT json_build_object('options', pl.options, 'ends_at', pl.ends_at,
     'counts', (SELECT json_object_agg(x.option_idx, x.n) FROM (SELECT option_idx, COUNT(*)::int n FROM poll_votes WHERE post_id=pl.post_id GROUP BY option_idx) x),
     'my_vote', (SELECT option_idx FROM poll_votes WHERE post_id=pl.post_id AND user_id=@me)) FROM polls pl WHERE pl.post_id=p.id) poll_raw
FROM posts p JOIN users u ON u.id=p.user_id ${video.JOIN}`;
// Poll results are shown only after you vote or when the poll has ended (the total is always shown).
function pollOut(raw) {
  if (!raw) return null;
  const counts = raw.counts || {}, n = raw.options.length;
  const votes = Array.from({ length: n }, (_, i) => counts[i] || 0), total = votes.reduce((a, b) => a + b, 0);
  const ended = Date.now() >= Number(raw.ends_at), voted = raw.my_vote != null;
  return { options: raw.options, ends_at: Number(raw.ends_at), ended, total, my_vote: voted ? raw.my_vote : null, votes: voted || ended ? votes : null };
}
// Author's ideal (for the small coloured dot next to names) replaces the raw ideal_* columns.
function postOut(r) {
  if (!r) return r;
  const { ideal_name, ideal_preset_id, ideal_qualities, poll_raw, ...p } = video.videoOut(r);
  p.poll = pollOut(poll_raw);
  p.challenge = p.challenge_day ? { day: p.challenge_day, prompt: batchd.promptFor(p.challenge_day) } : null;
  delete p.challenge_day;
  p.evidence = Array.isArray(p.evidence) ? p.evidence : [];
  p.resolve_by = p.resolve_by == null ? null : Number(p.resolve_by);
  p.resolved_at = p.resolved_at == null ? null : Number(p.resolved_at);
  const i = ideals.idealOut({ ideal_name, ideal_preset_id, ideal_qualities });
  p.ideal = i ? { name: i.name, primary: i.primary, color: i.color } : null;
  return p;
}
const getPost = async (id, me) => postOut(await db.get(POST_SELECT + ' WHERE p.id=@id', { id, me: me || 0 }));
const allPosts = async (sql, params) => (await db.all(sql, params)).map(postOut);
async function getPosts(ids, me) {
  if (!ids.length) return new Map();
  const rows = await allPosts(POST_SELECT + ' WHERE p.id = ANY(@ids::int[])', { ids, me: me || 0 });
  return new Map(rows.map(r => [r.id, r]));
}

// Timeline rows (originals + reposts) -> hydrated items, fetched in one query.
async function hydrate(rows, me) {
  const seen = new Set();
  rows = rows.filter(r => { const k = r.repost_of || r.id; if (seen.has(k)) return false; seen.add(k); return true; });
  const posts = await getPosts(rows.map(r => r.repost_of || r.id), me);
  return rows.map(r => {
    const post = posts.get(r.repost_of || r.id);
    if (!post) return null;
    return r.repost_of
      ? { ...post, key: 'r' + r.id, reposted_by: { username: r.username, name: r.name }, sort_at: r.created_at }
      : { ...post, key: 'p' + r.id, sort_at: r.created_at };
  }).filter(Boolean);
}
const TL = `SELECT p.id, p.repost_of, p.created_at, u.username, u.name FROM posts p JOIN users u ON u.id=p.user_id`;
const pageArgs = (req) => ({ before: parseInt(req.query.before || '0', 10) || 9e15, limit: Math.min(parseInt(req.query.limit || '30', 10) || 30, 100) });

app.get('/api/feed/home', auth, h(async (req, res) => {
  const { before, limit } = pageArgs(req);
  const rows = await db.all(`${TL} WHERE p.parent_id IS NULL AND p.created_at < @before AND
    (p.user_id=@me OR p.user_id IN (SELECT followee_id FROM follows WHERE follower_id=@me))
    ORDER BY p.created_at DESC LIMIT @limit`, { me: req.user.id, before, limit });
  res.json({ items: await hydrate(rows, req.user.id) });
}));
app.get('/api/feed/explore', h(async (req, res) => {
  const { before, limit } = pageArgs(req);
  const me = req.user ? req.user.id : 0;
  const rows = await db.all(`${TL} WHERE p.parent_id IS NULL AND p.repost_of IS NULL AND p.created_at < @before
    ORDER BY p.created_at DESC LIMIT @limit`, { before, limit });
  res.json({ items: await hydrate(rows, me) });
}));

async function notify(userId, actorId, type, postId, client, queue) {
  if (userId === actorId) return;
  await db.run('INSERT INTO notifications(user_id,actor_id,type,post_id,created_at) VALUES ($1,$2,$3,$4,$5)', [userId, actorId, type, postId || null, now()], client);
  // Inside a transaction the caller passes `queue` and sends after commit (a rollback never notifies).
  if (queue) queue.push([userId, type, actorId, postId]); else push.send(userId, type, { actorId, postId });
}
const flushPush = (queue) => { for (const [u, t, a, p] of queue) push.send(u, t, { actorId: a, postId: p }); };

app.post('/api/posts', auth, upload.single('image'), h(async (req, res) => {
  const text = String(req.body.text || '').trim();
  const parentId = req.body.parent_id ? parseInt(req.body.parent_id, 10) : null;
  const hasVoice = req.body.voice != null && req.body.voice !== '';
  const hasVideo = (req.body.video != null && req.body.video !== '') || hasVoice;
  if (!text && !req.file && !hasVideo) return res.status(400).json({ error: 'Post cannot be empty' });
  if ([...text].length > 280) return res.status(400).json({ error: 'Post is over 280 characters' });
  if (req.file && hasVideo) return res.status(400).json({ error: 'A post can have a photo or a video, not both' });
  if (hasVoice && req.body.video != null && req.body.video !== '') return res.status(400).json({ error: 'A post can have a video or a voice note, not both' });
  // Poll: poll_options (JSON array or repeated field) + poll_minutes (60..10080). Top-level posts only.
  let poll = null;
  if (req.body.poll_options != null && req.body.poll_options !== '') {
    let opts = req.body.poll_options;
    if (typeof opts === 'string') { try { opts = JSON.parse(opts); } catch { opts = null; } }
    if (!Array.isArray(opts)) return res.status(400).json({ error: 'Invalid poll' });
    opts = opts.map(o => String(o == null ? '' : o).replace(/\s+/g, ' ').trim());
    if (opts.length < 2 || opts.length > 4 || opts.some(o => !o)) return res.status(400).json({ error: 'A poll needs 2 to 4 options' });
    if (opts.some(o => [...o].length > 25)) return res.status(400).json({ error: 'Poll options can be up to 25 characters' });
    if (new Set(opts.map(o => o.toLowerCase())).size !== opts.length) return res.status(400).json({ error: 'Poll options must be different' });
    const mins = parseInt(req.body.poll_minutes || '1440', 10);
    if (!(mins >= 60 && mins <= 7 * 24 * 60)) return res.status(400).json({ error: 'Polls can run from 1 hour to 7 days' });
    if (parentId) return res.status(400).json({ error: 'Replies can’t have polls' });
    if (!text) return res.status(400).json({ error: 'Ask a question for your poll' });
    if (req.file || hasVideo) return res.status(400).json({ error: 'A poll can’t have media' });
    poll = { opts, ends: now() + mins * 60e3 };
  }
  let challenge = null;
  try { challenge = batchd.challengeDay(req.body, { parentId }); } catch (e) { return res.status(e.status).json({ error: e.message }); }
  if (challenge && !text) return res.status(400).json({ error: 'Write your thought to answer the daily challenge' });
  let probe;
  try { probe = probes.parseProbe(req.body, { parentId, now }); } catch (e) { return res.status(e.status || 400).json({ error: e.message }); }
  if (probe.kind !== 'normal' && !text) return res.status(400).json({ error: 'Write your ' + probe.kind.replace('_', ' ') + ' first' });
  let parent = null;
  if (parentId) {
    parent = await db.get('SELECT * FROM posts WHERE id=$1 AND repost_of IS NULL', [parentId]);
    if (!parent) return res.status(404).json({ error: 'Post you are replying to was not found' });
  }
  // Video: checked against Cloudinary's own metadata (our cloud, a video, limits). Reels are top-level posts only.
  const isReel = hasVideo && !parentId && ['1', 'true', 'on', true].includes(req.body.is_reel);
  let vid = null;
  if (hasVideo) {
    try { vid = await video.verify(hasVoice ? req.body.voice : req.body.video, { userId: req.user.id, isReel, voice: hasVoice }); }
    catch (e) { if (e.expose) return res.status(e.status).json({ error: e.message }); throw e; }
  }
  let id; const pushQ = [];
  try {
    id = await db.tx(async (c) => {
      const { id } = await db.get('INSERT INTO posts(user_id,text,parent_id,created_at,challenge_day,kind,evidence,resolve_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id', [req.user.id, text, parentId, now(), challenge, probe.kind, probe.evidence && JSON.stringify(probe.evidence), probe.resolveBy], c);
      if (req.file) {
        const url = await saveMedia(c, req.file, req.user.id, id);
        await db.run('UPDATE posts SET image=$1 WHERE id=$2', [url, id], c);
      }
      if (vid) await video.insert(db, c, id, vid, isReel);
      if (poll) await db.run('INSERT INTO polls(post_id,options,ends_at,created_at) VALUES ($1,$2,$3,$4)', [id, JSON.stringify(poll.opts), poll.ends, now()], c);
      if (parent) await notify(parent.user_id, req.user.id, 'reply', id, c, pushQ);
      for (const uid of await push.mentionedUsers(text, req.user.id)) if (!parent || uid !== parent.user_id) await notify(uid, req.user.id, 'mention', id, c, pushQ);
      return id;
    });
  } catch (e) {
    if (e.code === '23505' && challenge && /challenge/.test(e.constraint || '')) return res.status(409).json({ error: 'You already answered today’s daily thought' });
    if (e.code === '23505' && vid) return res.status(409).json({ error: 'That video is already posted' });
    throw e;
  }
  flushPush(pushQ);
  res.json({ post: await getPost(id, req.user.id) });
}));

app.get('/api/posts/:id', h(async (req, res) => {
  const me = req.user ? req.user.id : 0;
  const id = parseInt(req.params.id, 10);
  const post = Number.isSafeInteger(id) && id > 0 && id < 2 ** 31 ? await getPost(id, me) : null;
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const anc = await db.all(`WITH RECURSIVE anc AS (
      SELECT id, parent_id, 0 AS d FROM posts WHERE id=$1
      UNION ALL SELECT p.id, p.parent_id, anc.d + 1 FROM posts p JOIN anc ON p.id=anc.parent_id WHERE anc.d < 20)
    SELECT id FROM anc WHERE d > 0 ORDER BY d DESC`, [post.id]);
  const map = await getPosts(anc.map(a => a.id), me);
  const ancestors = anc.map(a => map.get(a.id)).filter(Boolean);
  const replies = await allPosts(POST_SELECT + ' WHERE p.parent_id=@id ORDER BY p.created_at ASC', { id: post.id, me });
  res.json({ post, ancestors, replies });
}));

// Parse :id route param; respond 404 for junk ids.
const postIdParam = (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!(Number.isSafeInteger(id) && id > 0 && id < 2 ** 31)) { res.status(404).json({ error: 'Not found' }); return null; }
  return id;
};

app.delete('/api/posts/:id', auth, h(async (req, res) => {
  const id = postIdParam(req, res); if (!id) return;
  const p = await db.get('SELECT * FROM posts WHERE id=$1', [id]);
  if (!p) return res.status(404).json({ error: 'Not found' });
  if (p.user_id !== req.user.id) return res.status(403).json({ error: 'You can only delete your own posts' });
  // Cascades to replies, likes, reposts, notifications, media and post_videos; videos are queued for Cloudinary destroy first.
  const queued = await db.tx(async (c) => {
    const n = await video.queueForPost(db, c, p.id);
    await db.run('DELETE FROM posts WHERE id=$1', [p.id], c);
    return n;
  });
  if (queued) video.flushSoon();
  res.json({ ok: true });
}));

app.post('/api/posts/:id/vote', auth, h(async (req, res) => {
  const id = postIdParam(req, res); if (!id) return;
  const pl = await db.get('SELECT * FROM polls WHERE post_id=$1', [id]);
  if (!pl) return res.status(404).json({ error: 'Poll not found' });
  const opt = Number(req.body && req.body.option);
  if (!Number.isInteger(opt) || opt < 0 || opt >= pl.options.length) return res.status(400).json({ error: 'Pick one of the options' });
  if (Date.now() >= Number(pl.ends_at)) return res.status(409).json({ error: 'This poll has ended' });
  const n = await db.run('INSERT INTO poll_votes(post_id,user_id,option_idx,created_at) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [id, req.user.id, opt, now()]);
  if (!n) return res.status(409).json({ error: 'You already voted', post: await getPost(id, req.user.id) });
  res.json({ post: await getPost(id, req.user.id) });
}));
app.post('/api/posts/:id/like', auth, h(async (req, res) => {
  const id = postIdParam(req, res); if (!id) return;
  const p = await db.get('SELECT * FROM posts WHERE id=$1', [id]);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const n = await db.run('INSERT INTO likes(user_id,post_id,created_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [req.user.id, p.id, now()]);
  if (n) await notify(p.user_id, req.user.id, 'like', p.id);
  res.json({ post: await getPost(p.id, req.user.id) });
}));
app.delete('/api/posts/:id/like', auth, h(async (req, res) => {
  const id = postIdParam(req, res); if (!id) return;
  await db.run('DELETE FROM likes WHERE user_id=$1 AND post_id=$2', [req.user.id, id]);
  await db.run("DELETE FROM notifications WHERE actor_id=$1 AND post_id=$2 AND type='like'", [req.user.id, id]);
  res.json({ post: await getPost(id, req.user.id) });
}));
app.post('/api/posts/:id/repost', auth, h(async (req, res) => {
  const id = postIdParam(req, res); if (!id) return;
  const p = await db.get('SELECT * FROM posts WHERE id=$1 AND repost_of IS NULL', [id]);
  if (!p) return res.status(404).json({ error: 'Not found' });
  if (!await db.get('SELECT 1 FROM posts WHERE user_id=$1 AND repost_of=$2', [req.user.id, p.id])) {
    await db.run('INSERT INTO posts(user_id,text,repost_of,created_at) VALUES ($1,$2,$3,$4)', [req.user.id, '', p.id, now()]);
    await notify(p.user_id, req.user.id, 'repost', p.id);
  }
  res.json({ post: await getPost(p.id, req.user.id) });
}));
app.delete('/api/posts/:id/repost', auth, h(async (req, res) => {
  const id = postIdParam(req, res); if (!id) return;
  await db.run('DELETE FROM posts WHERE user_id=$1 AND repost_of=$2', [req.user.id, id]);
  await db.run("DELETE FROM notifications WHERE actor_id=$1 AND post_id=$2 AND type='repost'", [req.user.id, id]);
  res.json({ post: await getPost(id, req.user.id) });
}));

// ---------- users ----------
const PROFILE_SELECT = `SELECT u.*,
  (SELECT COUNT(*)::int FROM follows f WHERE f.followee_id=u.id) followers,
  (SELECT COUNT(*)::int FROM follows f WHERE f.follower_id=u.id) following,
  (SELECT COUNT(*)::int FROM posts p WHERE p.user_id=u.id AND p.repost_of IS NULL) posts,
  ${probes.CALIB_COLS},
  EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=@me AND f.followee_id=u.id) is_following,
  EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=u.id AND f.followee_id=@me) follows_you
FROM users u`;
const toProfile = (r) => ({ ...publicUser(r), followers: r.followers, following: r.following, posts: r.posts, is_following: r.is_following, follows_you: r.follows_you, calibration: probes.calibrationOut(r.pred_resolved, r.pred_held) });
const profileById = async (id, me) => toProfile(await db.get(PROFILE_SELECT + ' WHERE u.id=@id', { id, me: me || 0 }));

app.get('/api/users/:username', h(async (req, res) => {
  const u = await findUser(req.params.username);
  if (!u) return res.status(404).json({ error: 'This account doesn’t exist' });
  res.json({ user: await profileById(u.id, req.user && req.user.id) });
}));
app.get('/api/users/:username/posts', h(async (req, res) => {
  const u = await findUser(req.params.username);
  if (!u) return res.status(404).json({ error: 'Not found' });
  const me = req.user ? req.user.id : 0;
  const tab = req.query.tab || 'posts';
  const keyed = (rows) => rows.map(p => ({ ...p, key: 'p' + p.id }));
  let items;
  if (tab === 'replies') {
    items = keyed(await allPosts(POST_SELECT + ' WHERE p.user_id=@uid AND p.parent_id IS NOT NULL ORDER BY p.created_at DESC LIMIT 100', { uid: u.id, me }));
  } else if (tab === 'likes') {
    items = keyed(await allPosts(POST_SELECT + ' JOIN likes lk ON lk.post_id=p.id AND lk.user_id=@uid ORDER BY lk.created_at DESC LIMIT 100', { uid: u.id, me }));
  } else if (tab === 'media') {
    items = keyed(await allPosts(POST_SELECT + ' WHERE p.user_id=@uid AND (p.image IS NOT NULL OR v.post_id IS NOT NULL) ORDER BY p.created_at DESC LIMIT 100', { uid: u.id, me }));
  } else if (tab === 'reels') {
    items = keyed(await allPosts(POST_SELECT + ' WHERE p.user_id=@uid AND v.is_reel AND p.parent_id IS NULL ORDER BY p.created_at DESC LIMIT 100', { uid: u.id, me }));
  } else {
    items = await hydrate(await db.all(`${TL} WHERE p.user_id=$1 AND p.parent_id IS NULL ORDER BY p.created_at DESC LIMIT 100`, [u.id]), me);
  }
  res.json({ items });
}));
app.get('/api/users/:username/:list(followers|following)', h(async (req, res) => {
  const u = await findUser(req.params.username);
  if (!u) return res.status(404).json({ error: 'Not found' });
  const [join, where] = req.params.list === 'followers' ? ['fl.follower_id', 'fl.followee_id'] : ['fl.followee_id', 'fl.follower_id'];
  const rows = await db.all(`${PROFILE_SELECT} JOIN follows fl ON u.id=${join} WHERE ${where}=@uid ORDER BY fl.created_at DESC`,
    { uid: u.id, me: (req.user && req.user.id) || 0 });
  res.json({ users: rows.map(toProfile) });
}));
app.post('/api/users/:username/follow', auth, h(async (req, res) => {
  const u = await findUser(req.params.username);
  if (!u) return res.status(404).json({ error: 'Not found' });
  if (u.id === req.user.id) return res.status(400).json({ error: 'You can’t follow yourself' });
  const n = await db.run('INSERT INTO follows(follower_id,followee_id,created_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [req.user.id, u.id, now()]);
  if (n) await notify(u.id, req.user.id, 'follow', null);
  res.json({ user: await profileById(u.id, req.user.id) });
}));
app.delete('/api/users/:username/follow', auth, h(async (req, res) => {
  const u = await findUser(req.params.username);
  if (!u) return res.status(404).json({ error: 'Not found' });
  await db.run('DELETE FROM follows WHERE follower_id=$1 AND followee_id=$2', [req.user.id, u.id]);
  await db.run("DELETE FROM notifications WHERE actor_id=$1 AND user_id=$2 AND type='follow'", [req.user.id, u.id]);
  res.json({ user: await profileById(u.id, req.user.id) });
}));
app.put('/api/me', auth, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), h(async (req, res) => {
  const me = req.user;
  const name = String(req.body.name ?? me.name).trim().slice(0, 50) || me.username;
  const bio = String(req.body.bio ?? me.bio).slice(0, 160);
  const location = String(req.body.location ?? me.location ?? '').slice(0, 30);
  await db.tx(async (c) => {
    let { avatar, banner } = me;
    const old = [];
    if (req.files && req.files.avatar) { old.push(mediaIdOf(avatar)); avatar = await saveMedia(c, req.files.avatar[0], me.id); }
    if (req.files && req.files.banner) { old.push(mediaIdOf(banner)); banner = await saveMedia(c, req.files.banner[0], me.id); }
    await db.run('UPDATE users SET name=$1, bio=$2, location=$3, avatar=$4, banner=$5 WHERE id=$6', [name, bio, location, avatar, banner, me.id], c);
    const stale = old.filter(Boolean);
    if (stale.length) await db.run('DELETE FROM media WHERE id = ANY($1::text[]) AND user_id=$2 AND post_id IS NULL', [stale, me.id], c);
  });
  res.json({ user: await profileById(me.id, me.id) });
}));

// "Choose your ideal": presets + palette, and set/change/clear your own ideal ({ideal: null} clears it).
app.get('/api/ideals', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ qualities: ideals.QUALITIES, presets: ideals.PRESETS, custom_name_max: ideals.CUSTOM_NAME_MAX, custom_qualities_max: ideals.CUSTOM_QUALITIES_MAX });
});
app.put('/api/me/ideal', auth, h(async (req, res) => {
  if (!req.body || !('ideal' in req.body)) return res.status(400).json({ error: 'Missing ideal' });
  let ideal;
  try { ideal = ideals.parseIdeal(req.body.ideal); } catch (e) { return res.status(400).json({ error: e.message }); }
  await db.run('UPDATE users SET ideal_name=$1, ideal_preset_id=$2, ideal_qualities=$3 WHERE id=$4',
    [ideal ? ideal.name : null, ideal ? ideal.preset_id : null, ideal ? ideal.qualities : null, req.user.id]);
  res.json({ user: await profileById(req.user.id, req.user.id) });
}));

app.get('/api/suggestions', h(async (req, res) => {
  const me = req.user ? req.user.id : 0;
  const rows = await db.all(`SELECT * FROM (${PROFILE_SELECT}
    WHERE u.id<>@me AND u.id NOT IN (SELECT followee_id FROM follows WHERE follower_id=@me)) s
    ORDER BY followers DESC, id LIMIT 5`, { me });
  res.json({ users: rows.map(toProfile) });
}));
app.get('/api/trends', h(async (req, res) => {
  const rows = await db.all(`SELECT text FROM posts WHERE text LIKE '%#%' AND created_at > $1`, [now() - 30 * 864e5]);
  const counts = {};
  rows.forEach(r => (r.text.match(/#[\p{L}\p{N}_]+/gu) || []).forEach(t => { const k = t.toLowerCase(); counts[k] = counts[k] || { tag: t, n: 0 }; counts[k].n++; }));
  res.json({ trends: Object.values(counts).sort((a, b) => b.n - a.n).slice(0, 5) });
}));

app.get('/api/search', h(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const me = req.user ? req.user.id : 0;
  if (!q) return res.json({ users: [], posts: [] });
  const escLike = (s) => '%' + s.replace(/[%_\\]/g, m => '\\' + m) + '%';
  const like = escLike(q.replace(/^@/, ''));
  const users = (await db.all(`${PROFILE_SELECT} WHERE u.username ILIKE @q OR u.name ILIKE @q ORDER BY u.id LIMIT 20`, { q: like, me })).map(toProfile);
  const posts = (await allPosts(POST_SELECT + ` WHERE p.repost_of IS NULL AND p.text ILIKE @q ORDER BY p.created_at DESC LIMIT 50`, { q: escLike(q), me })).map(p => ({ ...p, key: 'p' + p.id }));
  res.json({ users, posts });
}));

app.get('/api/notifications', auth, h(async (req, res) => {
  const rows = await db.all(`SELECT n.*, u.username, u.name, u.avatar, p.text post_text, p.parent_id
    FROM notifications n JOIN users u ON u.id=n.actor_id LEFT JOIN posts p ON p.id=n.post_id
    WHERE n.user_id=$1 ORDER BY n.created_at DESC LIMIT 100`, [req.user.id]);
  await db.run('UPDATE notifications SET read=TRUE WHERE user_id=$1 AND NOT read', [req.user.id]);
  res.json({ items: rows });
}));

// ---------- direct messages ----------
const DM_MAX_LEN = 1000;
const DM_RATE_MAX = parseInt(process.env.DM_RATE_MAX || '30', 10); // messages per user per window
const DM_RATE_WINDOW = 60 * 1000;
// Real image type from the file's magic bytes (the client-sent mimetype is not trusted).
function sniffImage(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (/^GIF8[79]a$/.test(buf.toString('latin1', 0, 6))) return 'image/gif';
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}
const dmUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD, files: 1, fields: 5 },
  fileFilter: (req, file, cb) => /^image\/(png|jpe?g|gif|webp)$/.test(file.mimetype)
    ? cb(null, true)
    : cb(Object.assign(new Error('Only images (PNG, JPEG, GIF or WebP) can be sent'), { status: 400 })),
});
// Simple in-memory sliding-window limiter per user (per server instance).
const dmSends = new Map();
function dmRateCheck(req, res, next) {
  const t = now(), recent = (dmSends.get(req.user.id) || []).filter(x => t - x < DM_RATE_WINDOW);
  dmSends.set(req.user.id, recent);
  if (recent.length >= DM_RATE_MAX) {
    res.set('Retry-After', String(Math.ceil((recent[0] + DM_RATE_WINDOW - t) / 1000)));
    return res.status(429).json({ error: 'You’re sending messages too fast. Try again in a minute.' });
  }
  next();
}
const dmRecordSend = (userId) => { const a = dmSends.get(userId) || []; a.push(now()); dmSends.set(userId, a); };
setInterval(() => { const t = now(); for (const [k, a] of dmSends) if (!a.some(x => t - x < DM_RATE_WINDOW)) dmSends.delete(k); }, 5 * 60e3).unref();

// DM responses are private and live: never cache.
app.use('/api/dm', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); }, auth);

const dmMessage = (m) => ({ id: m.id, conversation_id: m.conversation_id, sender_id: m.sender_id, text: m.text, image: m.media_id ? '/media/' + m.media_id : null, created_at: m.created_at });
const dmUser = (r) => ({ id: r.uid, username: r.username, name: r.name, avatar: r.avatar });
// Conversation rows for user @me (one per conversation), with the other member, last message and unread count.
const DM_CONV_SELECT = `
SELECT c.id, c.created_at, c.created_by, mb.last_read_at, om.last_read_at other_last_read_at,
  o.id uid, o.username, o.name, o.avatar,
  lm.id lm_id, lm.text lm_text, lm.media_id lm_media, lm.sender_id lm_sender, lm.created_at lm_at,
  (SELECT COUNT(*)::int FROM dm_messages x WHERE x.conversation_id=c.id AND x.sender_id<>@me AND x.created_at>mb.last_read_at) unread
FROM dm_members mb
JOIN dm_conversations c ON c.id=mb.conversation_id
JOIN dm_members om ON om.conversation_id=c.id AND om.user_id<>@me
JOIN users o ON o.id=om.user_id
LEFT JOIN LATERAL (SELECT * FROM dm_messages m WHERE m.conversation_id=c.id ORDER BY m.id DESC LIMIT 1) lm ON TRUE
WHERE mb.user_id=@me`;
const dmConv = (r) => ({
  id: r.id, user: dmUser(r), unread: r.unread, created_at: r.created_at,
  updated_at: r.lm_at || r.created_at, other_last_read_at: r.other_last_read_at,
  last_message: r.lm_id ? { id: r.lm_id, text: [...r.lm_text].slice(0, 100).join(''), has_image: !!r.lm_media, sender_id: r.lm_sender, created_at: r.lm_at } : null,
});
const dmUnreadTotal = async (userId) => (await db.get(`SELECT COUNT(*)::int n FROM dm_members mb JOIN dm_messages m ON m.conversation_id=mb.conversation_id
  WHERE mb.user_id=$1 AND m.sender_id<>$1 AND m.created_at>mb.last_read_at`, [userId])).n;
// Load the conversation for :id if the current user is a member; otherwise 404 (don't reveal it exists).
async function dmMembership(req, res) {
  const id = postIdParam(req, res); if (!id) return null;
  const c = await db.get(`SELECT c.*, mb.last_read_at FROM dm_members mb JOIN dm_conversations c ON c.id=mb.conversation_id
    WHERE mb.conversation_id=$1 AND mb.user_id=$2`, [id, req.user.id]);
  if (!c) { res.status(404).json({ error: 'Conversation not found' }); return null; }
  return c;
}

app.get('/api/dm/unread', h(async (req, res) => res.json({ unread: await dmUnreadTotal(req.user.id) })));

app.get('/api/dm/conversations', h(async (req, res) => {
  // Empty conversations only show for the person who opened them.
  const rows = await db.all(`${DM_CONV_SELECT} AND (lm.id IS NOT NULL OR c.created_by=@me)
    ORDER BY COALESCE(lm.created_at, c.created_at) DESC, c.id DESC LIMIT 100`, { me: req.user.id });
  res.json({ conversations: rows.map(dmConv) });
}));

app.post('/api/dm/conversations', h(async (req, res) => {
  const other = await findUser(cleanUsername((req.body || {}).username));
  if (!other) return res.status(404).json({ error: 'User not found' });
  if (other.id === req.user.id) return res.status(400).json({ error: 'You can’t message yourself' });
  const [a, b] = [Math.min(req.user.id, other.id), Math.max(req.user.id, other.id)];
  const created = await db.tx(async (c) => {
    const row = await db.get(`INSERT INTO dm_conversations(user_a,user_b,created_by,created_at) VALUES ($1,$2,$3,$4)
      ON CONFLICT ON CONSTRAINT dm_pair_unique DO NOTHING RETURNING id`, [a, b, req.user.id, now()], c);
    if (!row) return null;
    await db.run('INSERT INTO dm_members(conversation_id,user_id) VALUES ($1,$2),($1,$3)', [row.id, a, b], c);
    return row.id;
  });
  const id = created || (await db.get('SELECT id FROM dm_conversations WHERE user_a=$1 AND user_b=$2', [a, b])).id;
  const row = await db.get(DM_CONV_SELECT + ' AND c.id=@id', { me: req.user.id, id });
  res.status(created ? 201 : 200).json({ conversation: dmConv(row), created: !!created });
}));

app.get('/api/dm/conversations/:id', h(async (req, res) => {
  const c = await dmMembership(req, res); if (!c) return;
  res.json({ conversation: dmConv(await db.get(DM_CONV_SELECT + ' AND c.id=@id', { me: req.user.id, id: c.id })) });
}));

// ?before=<message id> pages backwards (older); ?after=<message id> returns newer ones (polling).
app.get('/api/dm/conversations/:id/messages', h(async (req, res) => {
  const c = await dmMembership(req, res); if (!c) return;
  const limit = Math.min(Math.max(parseInt(req.query.limit || '30', 10) || 30, 1), 100);
  const before = parseInt(req.query.before || '0', 10) || 0, after = parseInt(req.query.after || '0', 10) || 0;
  let rows, hasMore;
  if (after > 0) {
    rows = await db.all('SELECT * FROM dm_messages WHERE conversation_id=$1 AND id>$2 ORDER BY id ASC LIMIT $3', [c.id, after, limit + 1]);
    hasMore = rows.length > limit; rows = rows.slice(0, limit);
  } else {
    rows = await db.all(`SELECT * FROM dm_messages WHERE conversation_id=$1 AND id<$2 ORDER BY id DESC LIMIT $3`, [c.id, before > 0 ? before : 2 ** 31 - 1, limit + 1]);
    hasMore = rows.length > limit; rows = rows.slice(0, limit).reverse();
  }
  const other = await db.get('SELECT last_read_at FROM dm_members WHERE conversation_id=$1 AND user_id<>$2', [c.id, req.user.id]);
  res.json({ messages: rows.map(dmMessage), has_more: hasMore, my_last_read_at: c.last_read_at, other_last_read_at: other ? other.last_read_at : 0 });
}));

app.post('/api/dm/conversations/:id/messages', dmRateCheck, dmUpload.single('image'), h(async (req, res) => {
  const c = await dmMembership(req, res); if (!c) return;
  const text = String((req.body || {}).text || '').trim();
  if (!text && !req.file) return res.status(400).json({ error: 'Message cannot be empty' });
  if ([...text].length > DM_MAX_LEN) return res.status(400).json({ error: `Message is over ${DM_MAX_LEN} characters` });
  let mime = null;
  if (req.file) {
    mime = sniffImage(req.file.buffer);
    if (!mime) return res.status(400).json({ error: 'That file isn’t a valid image (PNG, JPEG, GIF or WebP)' });
  }
  const msg = await db.tx(async (cl) => {
    // Lock the conversation so created_at is strictly increasing per conversation (read tracking compares timestamps).
    const conv = await db.get('SELECT last_message_at FROM dm_conversations WHERE id=$1 FOR UPDATE', [c.id], cl);
    const ts = Math.max(now(), conv.last_message_at + 1);
    let mediaId = null;
    if (req.file) {
      mediaId = newMediaId();
      await db.run('INSERT INTO media(id,user_id,conversation_id,mime,size,data,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [mediaId, req.user.id, c.id, mime, req.file.size, req.file.buffer, ts], cl);
    }
    const m = await db.get('INSERT INTO dm_messages(conversation_id,sender_id,text,media_id,created_at) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [c.id, req.user.id, text, mediaId, ts], cl);
    await db.run('UPDATE dm_conversations SET last_message_at=$1 WHERE id=$2', [ts, c.id], cl);
    await db.run('UPDATE dm_members SET last_read_at=GREATEST(last_read_at,$1) WHERE conversation_id=$2 AND user_id=$3', [ts, c.id, req.user.id], cl);
    return m;
  });
  dmRecordSend(req.user.id);
  { const other = await db.get('SELECT user_id FROM dm_members WHERE conversation_id=$1 AND user_id<>$2', [msg.conversation_id, req.user.id]);
    if (other) push.send(other.user_id, 'dm', { actorId: req.user.id, conversationId: msg.conversation_id, body: msg.text || '📷 Photo' }); }
  res.status(201).json({ message: dmMessage(msg) });
}));

// Mark read up to message `up_to` (what the client has shown), or everything if omitted.
app.post('/api/dm/conversations/:id/read', h(async (req, res) => {
  const c = await dmMembership(req, res); if (!c) return;
  const upTo = parseInt((req.body || {}).up_to || '0', 10) || 0;
  const r = await db.get(`SELECT MAX(created_at) t FROM dm_messages WHERE conversation_id=$1 ${upTo ? 'AND id<=$2' : ''}`, upTo ? [c.id, upTo] : [c.id]);
  if (r && r.t) await db.run('UPDATE dm_members SET last_read_at=GREATEST(last_read_at,$1) WHERE conversation_id=$2 AND user_id=$3', [r.t, c.id, req.user.id]);
  res.json({ ok: true, unread: await dmUnreadTotal(req.user.id) });
}));

app.delete('/api/dm/messages/:id', h(async (req, res) => {
  const id = postIdParam(req, res); if (!id) return;
  const m = await db.get(`SELECT m.* FROM dm_messages m JOIN dm_members mb ON mb.conversation_id=m.conversation_id AND mb.user_id=$2 WHERE m.id=$1`, [id, req.user.id]);
  if (!m) return res.status(404).json({ error: 'Message not found' });
  if (m.sender_id !== req.user.id) return res.status(403).json({ error: 'You can only delete your own messages' });
  await db.tx(async (c) => {
    await db.run('DELETE FROM dm_messages WHERE id=$1', [m.id], c);
    if (m.media_id) await db.run('DELETE FROM media WHERE id=$1', [m.media_id], c);
  });
  res.json({ ok: true });
}));

// ---------- ZuZu AI (Ask about a post; Groq, streamed as SSE) ----------
ai.register(app, { auth, h, db, postIdParam });

// ---------- Video posts + Reels (Cloudinary direct uploads; sign, discard, reels feed) ----------
video.register(app, { auth, h, db, getPosts });

// ---------- Momo the monkey: short cached thoughts on posts (Groq once per post, local fallback) ----------
monkey.register(app, { auth, h, db, postIdParam });

// ---------- Web Push + language preferences ----------
push.register(app, { auth, h, db });

// ---------- Change password, recovery codes, email + reset links ----------
recovery.register(app, { auth, h, db, startSession, publicUser, findUser });

// ---------- Daily thought challenge, ideal circles, stories ----------
games.register(app, { auth, h, db, now });
probes.register(app, { auth, h, db, postIdParam, now, getPost });
batchd.register(app, { auth, h, db, hydrate, getPosts, saveMedia, upload, now });

// ---------- Account deletion + reports ----------
safety.register(app, { auth, h, db });

// ---------- Admin dashboard (ADMIN_USERNAMES / ADMIN_TOKEN; 404 for everyone else) ----------
admin.register(app, { h, db, root: ROOT });

app.get('/healthz', h(async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ ok: true, db: 'ok' });
  } catch (e) {
    res.status(503).json({ ok: false, db: 'error', error: e.message });
  }
}));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  if (res.headersSent) { console.error(err); return res.end(); }
  if (err instanceof multer.MulterError) {
    return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Image must be under 5 MB' : err.message });
  }
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Server error' });
});

app.use(express.static(path.join(ROOT, 'public'), { index: false }));
app.get('*', (req, res) => res.sendFile(path.join(ROOT, 'public', 'index.html')));

db.init().then(({ seeded, seededDMs }) => {
  if (seeded) console.log('Empty database: seeded demo data');
  if (seededDMs) console.log('No DMs yet: seeded demo conversations');
  app.listen(PORT, '0.0.0.0', () => console.log(`ZuZu listening on http://localhost:${PORT}`));
}).catch((e) => { console.error('Could not initialise database:', e.message); process.exit(1); });
