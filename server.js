// X-clone prototype: Express + SQLite (better-sqlite3), vanilla JS SPA frontend.
const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const PORT = parseInt(process.env.PORT || '4180', 10);
const ROOT = __dirname;
const UPLOADS = path.join(ROOT, 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });
fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });

const db = new Database(path.join(ROOT, 'data', 'app.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.join(ROOT, 'schema.sql'), 'utf8'));

const now = () => Date.now();
const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ---------- auth ----------
function getUser(req) {
  const token = req.cookies.sid || (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!token) return null;
  return db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?`).get(token) || null;
}
app.use((req, res, next) => { req.user = getUser(req); next(); });
const auth = (req, res, next) => req.user ? next() : res.status(401).json({ error: 'Not logged in' });

function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(token, userId, now());
  res.cookie('sid', token, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 864e5 });
  return token;
}
const publicUser = (u) => u && ({ id: u.id, username: u.username, name: u.name, bio: u.bio, location: u.location, avatar: u.avatar, banner: u.banner, created_at: u.created_at });

const USERNAME_RE = /^[A-Za-z0-9_]{3,15}$/;
app.post('/api/signup', (req, res) => {
  const { username = '', password = '', name = '' } = req.body || {};
  if (!USERNAME_RE.test(username)) return res.status(400).json({ error: 'Username must be 3–15 letters, numbers or _' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (db.prepare('SELECT 1 FROM users WHERE username=?').get(username)) return res.status(409).json({ error: 'Username already taken' });
  const info = db.prepare('INSERT INTO users(username,name,password_hash,created_at) VALUES (?,?,?,?)')
    .run(username, (name || username).slice(0, 50), bcrypt.hashSync(password, 10), now());
  startSession(res, info.lastInsertRowid);
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid)) });
});
app.post('/api/login', (req, res) => {
  const { username = '', password = '' } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE username=?').get(username.replace(/^@/, ''));
  if (!u || !bcrypt.compareSync(password, u.password_hash)) return res.status(401).json({ error: 'Wrong username or password' });
  startSession(res, u.id);
  res.json({ user: publicUser(u) });
});
app.post('/api/logout', (req, res) => {
  if (req.cookies.sid) db.prepare('DELETE FROM sessions WHERE token=?').run(req.cookies.sid);
  res.clearCookie('sid'); res.json({ ok: true });
});
app.get('/api/me', (req, res) => {
  if (!req.user) return res.json({ user: null });
  const unread = db.prepare('SELECT COUNT(*) c FROM notifications WHERE user_id=? AND read=0').get(req.user.id).c;
  res.json({ user: publicUser(req.user), unread });
});

// ---------- uploads ----------
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + (path.extname(file.originalname).toLowerCase().match(/^\.(png|jpe?g|gif|webp)$/) ? path.extname(file.originalname).toLowerCase() : '.img')),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(png|jpe?g|gif|webp)$/.test(file.mimetype)),
});
app.use('/uploads', express.static(UPLOADS, { maxAge: '7d' }));

// ---------- posts ----------
// Base select for a post with author + counts + viewer state.
const POST_SELECT = `
SELECT p.id, p.text, p.image, p.parent_id, p.created_at, p.user_id,
  u.username, u.name, u.avatar,
  (SELECT COUNT(*) FROM likes l WHERE l.post_id=p.id) like_count,
  (SELECT COUNT(*) FROM posts r WHERE r.parent_id=p.id) reply_count,
  (SELECT COUNT(*) FROM posts r WHERE r.repost_of=p.id) repost_count,
  EXISTS(SELECT 1 FROM likes l WHERE l.post_id=p.id AND l.user_id=@me) liked,
  EXISTS(SELECT 1 FROM posts r WHERE r.repost_of=p.id AND r.user_id=@me) reposted,
  (SELECT pu.username FROM posts pp JOIN users pu ON pu.id=pp.user_id WHERE pp.id=p.parent_id) reply_to
FROM posts p JOIN users u ON u.id=p.user_id`;
const getPost = (id, me) => db.prepare(POST_SELECT + ' WHERE p.id=@id').get({ id, me });

// Timeline rows (originals + reposts) -> hydrated items
function hydrate(rows, me) {
  const seen = new Set();
  return rows.filter(r => { const k = r.repost_of || r.id; if (seen.has(k)) return false; seen.add(k); return true; }).map(r => {
    if (r.repost_of) {
      const post = getPost(r.repost_of, me);
      return post && { ...post, key: 'r' + r.id, reposted_by: { username: r.username, name: r.name }, sort_at: r.created_at };
    }
    return { ...getPost(r.id, me), key: 'p' + r.id, sort_at: r.created_at };
  }).filter(Boolean);
}
const TL = `SELECT p.id, p.repost_of, p.created_at, u.username, u.name FROM posts p JOIN users u ON u.id=p.user_id`;
const pageArgs = (req) => ({ before: parseInt(req.query.before || '0', 10) || 9e15, limit: Math.min(parseInt(req.query.limit || '30', 10) || 30, 100) });

app.get('/api/feed/home', auth, (req, res) => {
  const { before, limit } = pageArgs(req);
  const rows = db.prepare(`${TL} WHERE p.parent_id IS NULL AND p.created_at < @before AND
    (p.user_id=@me OR p.user_id IN (SELECT followee_id FROM follows WHERE follower_id=@me))
    ORDER BY p.created_at DESC LIMIT @limit`).all({ me: req.user.id, before, limit });
  res.json({ items: hydrate(rows, req.user.id) });
});
app.get('/api/feed/explore', (req, res) => {
  const { before, limit } = pageArgs(req);
  const me = req.user ? req.user.id : 0;
  const rows = db.prepare(`${TL} WHERE p.parent_id IS NULL AND p.repost_of IS NULL AND p.created_at < @before
    ORDER BY p.created_at DESC LIMIT @limit`).all({ before, limit });
  res.json({ items: hydrate(rows, me) });
});

function notify(userId, actorId, type, postId) {
  if (userId === actorId) return;
  db.prepare('INSERT INTO notifications(user_id,actor_id,type,post_id,created_at) VALUES (?,?,?,?,?)').run(userId, actorId, type, postId || null, now());
}

app.post('/api/posts', auth, upload.single('image'), (req, res) => {
  const text = (req.body.text || '').trim();
  const parentId = req.body.parent_id ? parseInt(req.body.parent_id, 10) : null;
  const image = req.file ? '/uploads/' + req.file.filename : null;
  if (!text && !image) return res.status(400).json({ error: 'Post cannot be empty' });
  if ([...text].length > 280) return res.status(400).json({ error: 'Post is over 280 characters' });
  let parent = null;
  if (parentId) {
    parent = db.prepare('SELECT * FROM posts WHERE id=? AND repost_of IS NULL').get(parentId);
    if (!parent) return res.status(404).json({ error: 'Post you are replying to was not found' });
  }
  const info = db.prepare('INSERT INTO posts(user_id,text,image,parent_id,created_at) VALUES (?,?,?,?,?)').run(req.user.id, text, image, parentId, now());
  if (parent) notify(parent.user_id, req.user.id, 'reply', info.lastInsertRowid);
  res.json({ post: getPost(info.lastInsertRowid, req.user.id) });
});

app.get('/api/posts/:id', (req, res) => {
  const me = req.user ? req.user.id : 0;
  const post = getPost(+req.params.id, me);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const ancestors = [];
  let cur = post;
  while (cur.parent_id && ancestors.length < 20) { cur = getPost(cur.parent_id, me); if (!cur) break; ancestors.unshift(cur); }
  const replies = db.prepare(POST_SELECT + ' WHERE p.parent_id=@id ORDER BY p.created_at ASC').all({ id: post.id, me });
  res.json({ post, ancestors, replies });
});

app.delete('/api/posts/:id', auth, (req, res) => {
  const p = db.prepare('SELECT * FROM posts WHERE id=?').get(+req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  if (p.user_id !== req.user.id) return res.status(403).json({ error: 'You can only delete your own posts' });
  db.prepare('DELETE FROM posts WHERE id=?').run(p.id);
  if (p.image) fs.unlink(path.join(ROOT, p.image), () => {});
  res.json({ ok: true });
});

app.post('/api/posts/:id/like', auth, (req, res) => {
  const p = db.prepare('SELECT * FROM posts WHERE id=?').get(+req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const r = db.prepare('INSERT OR IGNORE INTO likes VALUES (?,?,?)').run(req.user.id, p.id, now());
  if (r.changes) notify(p.user_id, req.user.id, 'like', p.id);
  res.json({ post: getPost(p.id, req.user.id) });
});
app.delete('/api/posts/:id/like', auth, (req, res) => {
  db.prepare('DELETE FROM likes WHERE user_id=? AND post_id=?').run(req.user.id, +req.params.id);
  db.prepare("DELETE FROM notifications WHERE actor_id=? AND post_id=? AND type='like'").run(req.user.id, +req.params.id);
  res.json({ post: getPost(+req.params.id, req.user.id) });
});
app.post('/api/posts/:id/repost', auth, (req, res) => {
  const p = db.prepare('SELECT * FROM posts WHERE id=? AND repost_of IS NULL').get(+req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  if (!db.prepare('SELECT 1 FROM posts WHERE user_id=? AND repost_of=?').get(req.user.id, p.id)) {
    db.prepare('INSERT INTO posts(user_id,text,repost_of,created_at) VALUES (?,?,?,?)').run(req.user.id, '', p.id, now());
    notify(p.user_id, req.user.id, 'repost', p.id);
  }
  res.json({ post: getPost(p.id, req.user.id) });
});
app.delete('/api/posts/:id/repost', auth, (req, res) => {
  db.prepare('DELETE FROM posts WHERE user_id=? AND repost_of=?').run(req.user.id, +req.params.id);
  db.prepare("DELETE FROM notifications WHERE actor_id=? AND post_id=? AND type='repost'").run(req.user.id, +req.params.id);
  res.json({ post: getPost(+req.params.id, req.user.id) });
});

// ---------- users ----------
function profile(u, me) {
  return {
    ...publicUser(u),
    followers: db.prepare('SELECT COUNT(*) c FROM follows WHERE followee_id=?').get(u.id).c,
    following: db.prepare('SELECT COUNT(*) c FROM follows WHERE follower_id=?').get(u.id).c,
    posts: db.prepare('SELECT COUNT(*) c FROM posts WHERE user_id=? AND repost_of IS NULL').get(u.id).c,
    is_following: !!(me && db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND followee_id=?').get(me, u.id)),
    follows_you: !!(me && db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND followee_id=?').get(u.id, me)),
  };
}
const findUser = (name) => db.prepare('SELECT * FROM users WHERE username=?').get(name);

app.get('/api/users/:username', (req, res) => {
  const u = findUser(req.params.username);
  if (!u) return res.status(404).json({ error: 'This account doesn’t exist' });
  res.json({ user: profile(u, req.user && req.user.id) });
});
app.get('/api/users/:username/posts', (req, res) => {
  const u = findUser(req.params.username);
  if (!u) return res.status(404).json({ error: 'Not found' });
  const me = req.user ? req.user.id : 0;
  const tab = req.query.tab || 'posts';
  let items;
  if (tab === 'replies') {
    items = db.prepare(POST_SELECT + ' WHERE p.user_id=@uid AND p.parent_id IS NOT NULL ORDER BY p.created_at DESC LIMIT 100').all({ uid: u.id, me }).map(p => ({ ...p, key: 'p' + p.id }));
  } else if (tab === 'likes') {
    items = db.prepare(POST_SELECT + ' JOIN likes lk ON lk.post_id=p.id AND lk.user_id=@uid ORDER BY lk.created_at DESC LIMIT 100').all({ uid: u.id, me }).map(p => ({ ...p, key: 'p' + p.id }));
  } else if (tab === 'media') {
    items = db.prepare(POST_SELECT + ' WHERE p.user_id=@uid AND p.image IS NOT NULL ORDER BY p.created_at DESC LIMIT 100').all({ uid: u.id, me }).map(p => ({ ...p, key: 'p' + p.id }));
  } else {
    items = hydrate(db.prepare(`${TL} WHERE p.user_id=? AND p.parent_id IS NULL ORDER BY p.created_at DESC LIMIT 100`).all(u.id), me);
  }
  res.json({ items });
});
app.get('/api/users/:username/:list(followers|following)', (req, res) => {
  const u = findUser(req.params.username);
  if (!u) return res.status(404).json({ error: 'Not found' });
  const sql = req.params.list === 'followers'
    ? 'SELECT u.* FROM follows f JOIN users u ON u.id=f.follower_id WHERE f.followee_id=? ORDER BY f.created_at DESC'
    : 'SELECT u.* FROM follows f JOIN users u ON u.id=f.followee_id WHERE f.follower_id=? ORDER BY f.created_at DESC';
  res.json({ users: db.prepare(sql).all(u.id).map(x => profile(x, req.user && req.user.id)) });
});
app.post('/api/users/:username/follow', auth, (req, res) => {
  const u = findUser(req.params.username);
  if (!u) return res.status(404).json({ error: 'Not found' });
  if (u.id === req.user.id) return res.status(400).json({ error: 'You can’t follow yourself' });
  const r = db.prepare('INSERT OR IGNORE INTO follows VALUES (?,?,?)').run(req.user.id, u.id, now());
  if (r.changes) notify(u.id, req.user.id, 'follow', null);
  res.json({ user: profile(u, req.user.id) });
});
app.delete('/api/users/:username/follow', auth, (req, res) => {
  const u = findUser(req.params.username);
  if (!u) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM follows WHERE follower_id=? AND followee_id=?').run(req.user.id, u.id);
  db.prepare("DELETE FROM notifications WHERE actor_id=? AND user_id=? AND type='follow'").run(req.user.id, u.id);
  res.json({ user: profile(u, req.user.id) });
});
app.put('/api/me', auth, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), (req, res) => {
  const name = (req.body.name ?? req.user.name).trim().slice(0, 50) || req.user.username;
  const bio = (req.body.bio ?? req.user.bio).slice(0, 160);
  const location = (req.body.location ?? req.user.location ?? '').slice(0, 30);
  const avatar = req.files && req.files.avatar ? '/uploads/' + req.files.avatar[0].filename : req.user.avatar;
  const banner = req.files && req.files.banner ? '/uploads/' + req.files.banner[0].filename : req.user.banner;
  db.prepare('UPDATE users SET name=?, bio=?, location=?, avatar=?, banner=? WHERE id=?').run(name, bio, location, avatar, banner, req.user.id);
  res.json({ user: profile(db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id), req.user.id) });
});

app.get('/api/suggestions', (req, res) => {
  const me = req.user ? req.user.id : 0;
  const users = db.prepare(`SELECT u.*, (SELECT COUNT(*) FROM follows f WHERE f.followee_id=u.id) fc FROM users u
    WHERE u.id<>@me AND u.id NOT IN (SELECT followee_id FROM follows WHERE follower_id=@me)
    ORDER BY fc DESC, u.id LIMIT 5`).all({ me });
  res.json({ users: users.map(u => profile(u, me)) });
});
app.get('/api/trends', (req, res) => {
  const rows = db.prepare(`SELECT text FROM posts WHERE text LIKE '%#%' AND created_at > ?`).all(now() - 30 * 864e5);
  const counts = {};
  rows.forEach(r => (r.text.match(/#[\p{L}\p{N}_]+/gu) || []).forEach(t => { const k = t.toLowerCase(); counts[k] = counts[k] || { tag: t, n: 0 }; counts[k].n++; }));
  res.json({ trends: Object.values(counts).sort((a, b) => b.n - a.n).slice(0, 5) });
});

app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').trim();
  const me = req.user ? req.user.id : 0;
  if (!q) return res.json({ users: [], posts: [] });
  const like = '%' + q.replace(/^@/, '').replace(/[%_\\]/g, m => '\\' + m) + '%';
  const users = db.prepare(`SELECT * FROM users WHERE username LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\' LIMIT 20`).all(like, like).map(u => profile(u, me));
  const plike = '%' + q.replace(/[%_\\]/g, m => '\\' + m) + '%';
  const posts = db.prepare(POST_SELECT + ` WHERE p.repost_of IS NULL AND p.text LIKE @q ESCAPE '\\' ORDER BY p.created_at DESC LIMIT 50`).all({ q: plike, me }).map(p => ({ ...p, key: 'p' + p.id }));
  res.json({ users, posts });
});

app.get('/api/notifications', auth, (req, res) => {
  const rows = db.prepare(`SELECT n.*, u.username, u.name, u.avatar, p.text post_text, p.parent_id
    FROM notifications n JOIN users u ON u.id=n.actor_id LEFT JOIN posts p ON p.id=n.post_id
    WHERE n.user_id=? ORDER BY n.created_at DESC LIMIT 100`).all(req.user.id);
  db.prepare('UPDATE notifications SET read=1 WHERE user_id=?').run(req.user.id);
  res.json({ items: rows });
});

app.get('/healthz', (req, res) => res.json({ ok: true }));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => { console.error(err); res.status(err.status || 500).json({ error: err.message || 'Server error' }); });

app.use(express.static(path.join(ROOT, 'public'), { index: false }));
app.get('*', (req, res) => res.sendFile(path.join(ROOT, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`xclone listening on http://localhost:${PORT}`));
