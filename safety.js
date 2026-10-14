// Account deletion (self-serve, Play Store requirement) + reports on posts/profiles/DM messages (moderated on /admin).
const bcrypt = require('bcryptjs');
const path = require('path');
const video = require('./video');
const admin = require('./admin');

const REASONS = { spam: 'Spam', abuse: 'Abuse or harassment', nudity: 'Nudity or sexual content', hate: 'Hate speech', violence: 'Violence or threats', misinformation: 'Misinformation', other: 'Something else' };
const TYPES = ['post', 'user', 'message'];
const NOTE_MAX = 500;
const REPORT_RATE_MAX = () => parseInt(process.env.REPORT_RATE_MAX || '10', 10); // per user per hour (DB-backed, works across instances)

// Queue every Cloudinary video that disappears with this user: their posts' subtrees (others' replies under them too)
// and their own replies anywhere.
async function queueVideosForUser(db, client, userId) {
  return db.run(`INSERT INTO video_deletions(public_id, cloud_name, created_at)
    WITH RECURSIVE t AS (SELECT id FROM posts WHERE user_id=$1 UNION SELECT p.id FROM posts p JOIN t ON p.parent_id=t.id OR p.repost_of=t.id)
    SELECT v.public_id, v.cloud_name, $2::bigint FROM post_videos v JOIN t ON t.id=v.post_id
    ON CONFLICT (public_id) DO NOTHING`, [userId, Date.now()], client);
}

const DELETE_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Delete your ZuZu account</title><link rel="icon" href="/favicon.svg">
<style>body{margin:0;background:#000;color:#e7e9ea;font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
main{max-width:640px;margin:0 auto;padding:40px 20px}h1{font-size:28px;margin:0 0 8px}h2{font-size:19px;margin:28px 0 8px}a{color:#1d9bf0}
li{margin:6px 0}.muted{color:#71767b}.btn{display:inline-block;background:#1d9bf0;color:#fff;border-radius:999px;padding:10px 18px;font-weight:700;text-decoration:none;margin-top:8px}</style></head>
<body><main>
<h1>Delete your ZuZu account</h1>
<p class="muted">ZuZu (web app and the Android app <code>com.zuzu.app</code>)</p>
<p>You can delete your ZuZu account yourself at any time. Deletion is immediate and can’t be undone.</p>
<h2>How to delete</h2>
<ol>
<li><b>On the web:</b> sign in at <a href="/settings">zuzu-app.onrender.com/settings</a>, scroll to <b>Delete account</b>, type your username (or password) to confirm, and press <b>Delete my account</b>.</li>
<li><b>In the Android app:</b> open your profile, tap the <b>⋮</b> menu, choose <b>Delete account</b>, type your username (or password) and confirm.</li>
</ol>
<a class="btn" href="/settings">Go to settings</a>
<h2>What gets deleted</h2>
<ul>
<li>Your profile, username, password and sign-in sessions</li>
<li>Your posts, replies, reposts, likes and follows (replies other people wrote under your posts are removed with them)</li>
<li>Your photos and avatar/banner images, and the videos/reels you uploaded (removed from our video host shortly after)</li>
<li>Your direct-message conversations and the images sent in them</li>
<li>Your notifications and any reports you filed</li>
</ul>
<h2>What may be kept</h2>
<p>Nothing tied to your account is kept after deletion. Server logs without your content may persist for up to 30 days. If you can’t sign in any more, contact the ZuZu team through the app’s listing page and we’ll delete the account for you.</p>
</main></body></html>`;

function register(app, { auth, h, db }) {
  app.get(['/delete-account', '/account/delete'], (req, res) => { res.set('Cache-Control', 'public, max-age=600'); res.type('html').send(DELETE_PAGE); });

  // DELETE /api/me {confirm}: your username (case-insensitive) or your current password.
  app.delete('/api/me', auth, h(async (req, res) => {
    const confirm = String((req.body || {}).confirm || '').trim();
    const me = req.user;
    const okName = confirm && confirm.replace(/^@/, '').toLowerCase() === me.username.toLowerCase();
    const okPass = !okName && confirm && me.password_hash && bcrypt.compareSync(confirm, me.password_hash);
    if (!okName && !okPass) return res.status(400).json({ error: 'Type your username (or password) exactly to confirm' });
    await db.tx(async (c) => {
      await queueVideosForUser(db, c, me.id);
      // media rows (post images, avatars, DM images) and everything else go via ON DELETE CASCADE
      await db.run('DELETE FROM users WHERE id=$1', [me.id], c);
    });
    video.flushSoon();
    res.clearCookie('sid');
    res.json({ ok: true, deleted: me.username });
  }));

  app.get('/api/report-reasons', (req, res) => res.json({ reasons: Object.entries(REASONS).map(([key, label]) => ({ key, label })) }));

  // POST /api/reports {type: post|user|message, id | username, reason, note?}
  app.post('/api/reports', auth, h(async (req, res) => {
    const b = req.body || {};
    const type = String(b.type || '');
    const reason = String(b.reason || '');
    const note = String(b.note || '').trim().slice(0, NOTE_MAX);
    if (!TYPES.includes(type)) return res.status(400).json({ error: 'Unknown report type' });
    if (!REASONS[reason]) return res.status(400).json({ error: 'Pick a reason' });
    const hour = Date.now() - 3600e3;
    const { n } = await db.get('SELECT COUNT(*)::int n FROM reports WHERE reporter_id=$1 AND created_at>$2', [req.user.id, hour]);
    if (n >= REPORT_RATE_MAX()) { res.set('Retry-After', '3600'); return res.status(429).json({ error: 'You’ve sent a lot of reports. Please try again later.' }); }
    let target = null;
    if (type === 'post') {
      const id = parseInt(b.id, 10);
      target = id > 0 && id < 2 ** 31 ? await db.get('SELECT p.id, p.user_id, p.text FROM posts p WHERE p.id=$1', [id]) : null;
      if (target) target = { id: target.id, user: target.user_id, snap: target.text };
    } else if (type === 'user') {
      const u = b.username ? await db.get('SELECT id, username, name, bio FROM users WHERE lower(username)=lower($1)', [String(b.username).replace(/^@/, '')])
        : (parseInt(b.id, 10) > 0 ? await db.get('SELECT id, username, name, bio FROM users WHERE id=$1', [parseInt(b.id, 10)]) : null);
      if (u) target = { id: u.id, user: u.id, snap: `@${u.username} · ${u.name}${u.bio ? ' · ' + u.bio : ''}` };
    } else {
      const id = parseInt(b.id, 10);
      // only messages in a conversation you're part of, and not your own
      const m = id > 0 && id < 2 ** 31 ? await db.get(`SELECT m.id, m.sender_id, m.text FROM dm_messages m JOIN dm_members mb ON mb.conversation_id=m.conversation_id AND mb.user_id=$2 WHERE m.id=$1`, [id, req.user.id]) : null;
      if (m) target = { id: m.id, user: m.sender_id, snap: m.text };
    }
    if (!target) return res.status(404).json({ error: 'Not found' });
    if (target.user === req.user.id) return res.status(400).json({ error: 'You can’t report yourself' });
    const r = await db.get(`INSERT INTO reports(reporter_id,target_type,target_id,target_user_id,reason,note,snapshot,created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (reporter_id, target_type, target_id) WHERE status='open' DO NOTHING RETURNING id`,
      [req.user.id, type, target.id, target.user, reason, note, String(target.snap || '').slice(0, 500), Date.now()]);
    res.status(r ? 201 : 200).json({ ok: true, duplicate: !r });
  }));

  // Admin: list + resolve (admins only; everyone else 404s like the rest of /api/admin).
  const isAdmin = (req) => admin.isAdminUser(req.user) || admin.tokenOk(req.headers.authorization);
  app.get('/api/admin/reports', h(async (req, res) => {
    if (!isAdmin(req)) return res.status(404).json({ error: 'Not found' });
    const status = req.query.status === 'resolved' ? 'resolved' : req.query.status === 'all' ? null : 'open';
    const rows = await db.all(`SELECT r.*, ru.username reporter, tu.username target_username,
        (SELECT COUNT(*)::int FROM reports x WHERE x.target_type=r.target_type AND x.target_id=r.target_id) total_for_target
      FROM reports r JOIN users ru ON ru.id=r.reporter_id LEFT JOIN users tu ON tu.id=r.target_user_id
      ${status ? 'WHERE r.status=$1' : ''} ORDER BY r.created_at DESC LIMIT 200`, status ? [status] : []);
    const { open } = await db.get(`SELECT COUNT(*)::int open FROM reports WHERE status='open'`);
    res.json({ open, reasons: REASONS, reports: rows.map(r => ({ id: r.id, type: r.target_type, target_id: r.target_id, target_username: r.target_username,
      reason: r.reason, reason_label: REASONS[r.reason] || r.reason, note: r.note, snapshot: r.snapshot, status: r.status, reporter: r.reporter,
      created_at: Number(r.created_at), resolved_at: r.resolved_at ? Number(r.resolved_at) : null, total_for_target: r.total_for_target })) });
  }));
  app.post('/api/admin/reports/:id/resolve', h(async (req, res) => {
    if (!isAdmin(req)) return res.status(404).json({ error: 'Not found' });
    const id = parseInt(req.params.id, 10);
    const r = await db.get(`UPDATE reports SET status='resolved', resolved_at=$2, resolved_by=$3 WHERE id=$1 RETURNING id`, [id > 0 && id < 2 ** 31 ? id : 0, Date.now(), req.user ? req.user.id : null]);
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  }));
}

module.exports = { register, REASONS, queueVideosForUser, DELETE_PAGE };
