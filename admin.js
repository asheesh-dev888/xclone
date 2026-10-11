// Private admin dashboard: GET /api/admin/stats and the /admin page.
// Access (anything else gets a plain 404, so the dashboard's existence isn't revealed):
//   - logged-in users listed in ADMIN_USERNAMES (comma-separated, case-insensitive): page + API
//   - `Authorization: Bearer <ADMIN_TOKEN>` (compared in constant time): GET /api/admin/stats only.
//     Token access is off when ADMIN_TOKEN is unset or empty.
// All "today"/day boundaries are Asia/Kolkata (IST, UTC+05:30, no DST).
const crypto = require('crypto');
const path = require('path');
const ideals = require('./ideals');

const IST_OFFSET_MS = 330 * 60e3;
const DAY_MS = 864e5;
const SERIES_DAYS = 30;
const LATEST_N = 20;
const SINCE_LIST_MAX = 500;

const adminUsernames = () => new Set(String(process.env.ADMIN_USERNAMES || '').split(',').map(s => s.trim().replace(/^@/, '').toLowerCase()).filter(Boolean));
const isAdminUser = (u) => !!(u && u.username && adminUsernames().has(String(u.username).toLowerCase()));

// Constant-time token check: hash both sides to equal-length digests, then timingSafeEqual.
function tokenOk(header) {
  const want = process.env.ADMIN_TOKEN || '';
  if (!want) return false;
  const m = /^Bearer\s+(\S+)\s*$/i.exec(String(header || ''));
  if (!m) return false;
  const a = crypto.createHash('sha256').update(m[1]).digest();
  const b = crypto.createHash('sha256').update(want).digest();
  return crypto.timingSafeEqual(a, b);
}

// IST calendar helpers (pure; exported for tests).
const istDayNumber = (ms) => Math.floor((ms + IST_OFFSET_MS) / DAY_MS); // days since 1970-01-01 IST
const istDayStart = (dayNum) => dayNum * DAY_MS - IST_OFFSET_MS;          // epoch ms of 00:00 IST that day
const istDateString = (dayNum) => new Date(dayNum * DAY_MS).toISOString().slice(0, 10);
function windows(nowMs) {
  const today = istDayNumber(nowMs);
  return {
    today,
    todayStart: istDayStart(today),
    yesterdayStart: istDayStart(today - 1),
    last7Start: istDayStart(today - 6),                 // today + previous 6 IST days
    last30Start: istDayStart(today - (SERIES_DAYS - 1)), // today + previous 29 IST days
  };
}

const NOT_FOUND = (res) => res.status(404).json({ error: 'Not found' });
const userOut = (r) => ({ id: r.id, username: r.username, name: r.name, created_at: r.created_at, google: !!r.google, profile_url: '/u/' + r.username });

async function stats(db, { nowMs = Date.now(), since = null } = {}) {
  const w = windows(nowMs);
  const p = { t0: w.todayStart, y0: w.yesterdayStart, d7: w.last7Start, d30: w.last30Start, off: IST_OFFSET_MS, day: DAY_MS };
  const [u, daily, latest, posts, dms, active, idealRows] = await Promise.all([
    db.get(`SELECT COUNT(*)::int total,
        COUNT(*) FILTER (WHERE NOT is_demo)::int real,
        COUNT(*) FILTER (WHERE is_demo)::int demo,
        COUNT(*) FILTER (WHERE NOT is_demo AND google_id IS NOT NULL)::int google,
        COUNT(*) FILTER (WHERE NOT is_demo AND created_at >= @t0)::int today,
        COUNT(*) FILTER (WHERE NOT is_demo AND created_at >= @y0 AND created_at < @t0)::int yesterday,
        COUNT(*) FILTER (WHERE NOT is_demo AND created_at >= @d7)::int last7,
        COUNT(*) FILTER (WHERE NOT is_demo AND created_at >= @d30)::int last30
      FROM users`, p),
    db.all(`SELECT floor((created_at + @off)::numeric / @day)::int d, COUNT(*)::int n
      FROM users WHERE NOT is_demo AND created_at >= @d30 GROUP BY 1`, p),
    db.all(`SELECT id, username, name, created_at, google_id IS NOT NULL google FROM users
      WHERE NOT is_demo ORDER BY created_at DESC, id DESC LIMIT ${LATEST_N}`),
    db.get(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE created_at >= @t0)::int today,
        COUNT(*) FILTER (WHERE parent_id IS NOT NULL AND created_at >= @t0)::int replies_today
      FROM posts WHERE repost_of IS NULL`, p),
    db.get(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE created_at >= @t0)::int today FROM dm_messages`, p),
    // Anyone who posted (incl. replies and reposts), liked or sent a DM today. Uses created_at indexes.
    db.get(`SELECT COUNT(*)::int n FROM (
        SELECT user_id FROM posts WHERE created_at >= @t0
        UNION SELECT user_id FROM likes WHERE created_at >= @t0
        UNION SELECT sender_id FROM dm_messages WHERE created_at >= @t0) a`, p),
    // Ideals chosen by real users: presets grouped by id, "make your own" grouped by name (case-insensitive).
    db.all(`SELECT ideal_preset_id preset_id, CASE WHEN ideal_preset_id IS NULL THEN lower(ideal_name) END k,
        MIN(ideal_name) ideal_name, MIN(ideal_qualities[1]) q1, COUNT(*)::int n
      FROM users WHERE NOT is_demo AND ideal_name IS NOT NULL GROUP BY 1, 2`),
  ]);
  const byDay = new Map(daily.map(r => [r.d, r.n]));
  const series = [];
  for (let d = w.today - (SERIES_DAYS - 1); d <= w.today; d++) series.push({ date: istDateString(d), count: byDay.get(d) || 0 });
  const out = {
    generated_at: nowMs,
    timezone: 'Asia/Kolkata',
    today: istDateString(w.today),
    users: { total: u.total, real: u.real, demo: u.demo, google: u.google },
    signups: { today: u.today, yesterday: u.yesterday, last_7_days: u.last7, last_30_days: u.last30 },
    daily_signups: series,
    latest_signups: latest.map(userOut),
    posts: { total: posts.total, today: posts.today, replies_today: posts.replies_today },
    dms: { total: dms.total, today: dms.today },
    active_users_today: active.n,
    ideals: idealBreakdown(idealRows, u.real),
  };
  if (since !== null) {
    const c = await db.get('SELECT COUNT(*)::int n FROM users WHERE NOT is_demo AND created_at > $1', [since]);
    const rows = await db.all(`SELECT id, username, name, created_at, google_id IS NOT NULL google FROM users
      WHERE NOT is_demo AND created_at > $1 ORDER BY created_at DESC, id DESC LIMIT ${SINCE_LIST_MAX}`, [since]);
    out.since = { since, count: c.n, users: rows.map(userOut), truncated: c.n > rows.length };
  }
  return out;
}

// Count per ideal (top IDEALS_TOP) and per primary quality (all qualities, zeros included).
const IDEALS_TOP = 50;
function idealBreakdown(rows, realUsers) {
  const byQ = new Map(ideals.QUALITIES.map(q => [q.key, 0]));
  const list = rows.map(r => {
    const i = ideals.idealOut({ ideal_name: r.ideal_name, ideal_preset_id: r.preset_id, ideal_qualities: r.q1 ? [r.q1] : [] });
    if (!i) return null;
    if (i.primary) byQ.set(i.primary, byQ.get(i.primary) + r.n);
    return { name: i.name, preset_id: i.preset_id, custom: i.custom, primary: i.primary, color: i.color, count: r.n };
  }).filter(Boolean).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const chosen = list.reduce((a, x) => a + x.count, 0);
  return {
    users_with_ideal: chosen,
    users_without_ideal: Math.max(0, realUsers - chosen),
    custom: list.filter(x => x.custom).reduce((a, x) => a + x.count, 0),
    by_ideal: list.slice(0, IDEALS_TOP),
    by_quality: ideals.QUALITIES.map(q => ({ quality: q.key, label: q.label, color: q.color, count: byQ.get(q.key) }))
      .sort((a, b) => b.count - a.count),
  };
}

function register(app, { h, db, root }) {
  const noStore = (req, res, next) => { res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }); next(); };
  app.use('/api/admin', noStore);
  app.get('/api/admin/stats', h(async (req, res) => {
    if (!isAdminUser(req.user) && !tokenOk(req.headers.authorization)) return NOT_FOUND(res);
    let since = null;
    if (req.query.since !== undefined) {
      if (!/^\d{1,15}$/.test(String(req.query.since))) return res.status(400).json({ error: 'since must be a millisecond timestamp' });
      since = Number(req.query.since);
    }
    res.json(await stats(db, { since }));
  }));
  // Every other /api/admin path: 404 for everyone (falls through to the API 404 handler).
  app.get('/admin', noStore, (req, res) => {
    if (!isAdminUser(req.user)) return res.status(404).type('html').send('<!doctype html><meta charset="utf-8"><title>Not found</title><body style="background:#000;color:#e7e9ea;font-family:sans-serif;text-align:center;padding:60px">Not found · <a style="color:#1d9bf0" href="/home">ZuZu</a></body>');
    res.sendFile(path.join(root, 'public', 'index.html'));
  });
}

module.exports = { register, stats, windows, istDayNumber, istDayStart, istDateString, isAdminUser, tokenOk, IST_OFFSET_MS };
