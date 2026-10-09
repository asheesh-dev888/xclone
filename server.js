// ZuZu: Express + PostgreSQL (pg), vanilla JS SPA frontend.
const express = require('express');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const db = require('./db');

const PORT = parseInt(process.env.PORT || '4180', 10);
const ROOT = __dirname;
const MAX_UPLOAD = 5 * 1024 * 1024;

const now = () => Date.now();
const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
// Wrap async handlers so rejected promises reach the error handler (Express 4).
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------- auth ----------
app.use(h(async (req, res, next) => {
  const token = req.cookies.sid || (req.headers.authorization || '').replace(/^Bearer /, '');
  req.user = token && !req.path.startsWith('/media/') && !/\.(js|css|svg|png|ico)$/.test(req.path)
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
const publicUser = (u) => u && ({ id: u.id, username: u.username, name: u.name, bio: u.bio, location: u.location, avatar: u.avatar, banner: u.banner, created_at: u.created_at });
const findUser = (name) => db.get('SELECT * FROM users WHERE lower(username)=lower($1)', [String(name)]);

const USERNAME_RE = /^[A-Za-z0-9_]{3,15}$/;
app.post('/api/signup', h(async (req, res) => {
  const { username = '', password = '', name = '' } = req.body || {};
  if (!USERNAME_RE.test(username)) return res.status(400).json({ error: 'Username must be 3–15 letters, numbers or _' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (await findUser(username)) return res.status(409).json({ error: 'Username already taken' });
  let u;
  try {
    u = await db.get('INSERT INTO users(username,name,password_hash,created_at) VALUES ($1,$2,$3,$4) RETURNING *',
      [username, (name || username).slice(0, 50), bcrypt.hashSync(password, 10), now()]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Username already taken' });
    throw e;
  }
  await startSession(res, u.id);
  res.json({ user: publicUser(u) });
}));
app.post('/api/login', h(async (req, res) => {
  const { username = '', password = '' } = req.body || {};
  const u = await findUser(String(username).replace(/^@/, ''));
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
  res.json({ user: publicUser(req.user), unread: c });
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
  const m = await db.get('SELECT mime, data FROM media WHERE id=$1', [req.params.id]);
  if (!m) return res.status(404).end();
  res.set({ 'Content-Type': m.mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
  res.send(m.data);
}));

// ---------- posts ----------
// Base select for a post with author + counts + viewer state.
const POST_SELECT = `
SELECT p.id, p.text, p.image, p.parent_id, p.created_at, p.user_id,
  u.username, u.name, u.avatar,
  (SELECT COUNT(*)::int FROM likes l WHERE l.post_id=p.id) like_count,
  (SELECT COUNT(*)::int FROM posts r WHERE r.parent_id=p.id) reply_count,
  (SELECT COUNT(*)::int FROM posts r WHERE r.repost_of=p.id) repost_count,
  EXISTS(SELECT 1 FROM likes l WHERE l.post_id=p.id AND l.user_id=@me) liked,
  EXISTS(SELECT 1 FROM posts r WHERE r.repost_of=p.id AND r.user_id=@me) reposted,
  (SELECT pu.username FROM posts pp JOIN users pu ON pu.id=pp.user_id WHERE pp.id=p.parent_id) reply_to
FROM posts p JOIN users u ON u.id=p.user_id`;
const getPost = (id, me) => db.get(POST_SELECT + ' WHERE p.id=@id', { id, me: me || 0 });
async function getPosts(ids, me) {
  if (!ids.length) return new Map();
  const rows = await db.all(POST_SELECT + ' WHERE p.id = ANY(@ids::int[])', { ids, me: me || 0 });
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

async function notify(userId, actorId, type, postId, client) {
  if (userId === actorId) return;
  await db.run('INSERT INTO notifications(user_id,actor_id,type,post_id,created_at) VALUES ($1,$2,$3,$4,$5)', [userId, actorId, type, postId || null, now()], client);
}

app.post('/api/posts', auth, upload.single('image'), h(async (req, res) => {
  const text = (req.body.text || '').trim();
  const parentId = req.body.parent_id ? parseInt(req.body.parent_id, 10) : null;
  if (!text && !req.file) return res.status(400).json({ error: 'Post cannot be empty' });
  if ([...text].length > 280) return res.status(400).json({ error: 'Post is over 280 characters' });
  let parent = null;
  if (parentId) {
    parent = await db.get('SELECT * FROM posts WHERE id=$1 AND repost_of IS NULL', [parentId]);
    if (!parent) return res.status(404).json({ error: 'Post you are replying to was not found' });
  }
  const id = await db.tx(async (c) => {
    const { id } = await db.get('INSERT INTO posts(user_id,text,parent_id,created_at) VALUES ($1,$2,$3,$4) RETURNING id', [req.user.id, text, parentId, now()], c);
    if (req.file) {
      const url = await saveMedia(c, req.file, req.user.id, id);
      await db.run('UPDATE posts SET image=$1 WHERE id=$2', [url, id], c);
    }
    if (parent) await notify(parent.user_id, req.user.id, 'reply', id, c);
    return id;
  });
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
  const replies = await db.all(POST_SELECT + ' WHERE p.parent_id=@id ORDER BY p.created_at ASC', { id: post.id, me });
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
  await db.run('DELETE FROM posts WHERE id=$1', [p.id]); // cascades to replies, likes, reposts, notifications, media
  res.json({ ok: true });
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
  EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=@me AND f.followee_id=u.id) is_following,
  EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=u.id AND f.followee_id=@me) follows_you
FROM users u`;
const toProfile = (r) => ({ ...publicUser(r), followers: r.followers, following: r.following, posts: r.posts, is_following: r.is_following, follows_you: r.follows_you });
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
    items = keyed(await db.all(POST_SELECT + ' WHERE p.user_id=@uid AND p.parent_id IS NOT NULL ORDER BY p.created_at DESC LIMIT 100', { uid: u.id, me }));
  } else if (tab === 'likes') {
    items = keyed(await db.all(POST_SELECT + ' JOIN likes lk ON lk.post_id=p.id AND lk.user_id=@uid ORDER BY lk.created_at DESC LIMIT 100', { uid: u.id, me }));
  } else if (tab === 'media') {
    items = keyed(await db.all(POST_SELECT + ' WHERE p.user_id=@uid AND p.image IS NOT NULL ORDER BY p.created_at DESC LIMIT 100', { uid: u.id, me }));
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
  const posts = (await db.all(POST_SELECT + ` WHERE p.repost_of IS NULL AND p.text ILIKE @q ORDER BY p.created_at DESC LIMIT 50`, { q: escLike(q), me })).map(p => ({ ...p, key: 'p' + p.id }));
  res.json({ users, posts });
}));

app.get('/api/notifications', auth, h(async (req, res) => {
  const rows = await db.all(`SELECT n.*, u.username, u.name, u.avatar, p.text post_text, p.parent_id
    FROM notifications n JOIN users u ON u.id=n.actor_id LEFT JOIN posts p ON p.id=n.post_id
    WHERE n.user_id=$1 ORDER BY n.created_at DESC LIMIT 100`, [req.user.id]);
  await db.run('UPDATE notifications SET read=TRUE WHERE user_id=$1 AND NOT read', [req.user.id]);
  res.json({ items: rows });
}));

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
  if (err instanceof multer.MulterError) {
    return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Image must be under 5 MB' : err.message });
  }
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Server error' });
});

app.use(express.static(path.join(ROOT, 'public'), { index: false }));
app.get('*', (req, res) => res.sendFile(path.join(ROOT, 'public', 'index.html')));

db.init().then(({ seeded }) => {
  if (seeded) console.log('Empty database: seeded demo data');
  app.listen(PORT, '0.0.0.0', () => console.log(`ZuZu listening on http://localhost:${PORT}`));
}).catch((e) => { console.error('Could not initialise database:', e.message); process.exit(1); });
