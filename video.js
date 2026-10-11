// Video posts + Reels, stored on Cloudinary (never in Postgres or on the Render disk).
//
//   CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME   enables the feature (/api/config video:true)
//
// Flow: POST /api/video/sign (login) returns signed upload params -> the browser uploads straight to
// https://api.cloudinary.com/v1_1/<cloud>/video/upload (XHR progress, chunked over ~20 MB) -> POST /api/posts
// with video {public_id, ...}. The server then looks the asset up with the Admin API (GET resources/video/upload/<id>,
// basic auth) and only trusts Cloudinary's own metadata: our cloud, a video, our folder, allowed format, size and
// duration limits, uploaded by this user (signed context uid). Deleting a post queues the asset for the signed
// destroy API (best effort, retried).
//
// Test-only overrides: CLOUDINARY_API_BASE (default https://api.cloudinary.com/v1_1), CLOUDINARY_DELIVERY_BASE
// (default https://res.cloudinary.com), VIDEO_CHUNK_SIZE / VIDEO_CHUNK_THRESHOLD (bytes).
const crypto = require('crypto');

const MAX_BYTES = 100 * 1024 * 1024;
const MAX_POST_SECONDS = 180;
const MAX_REEL_SECONDS = 90;
const FORMATS = ['mp4', 'mov', 'webm', '3gp', 'mkv'];
const FOLDER = 'zuzu';
// Delivery transformations (params sorted the way the SDKs write them, so the eager ones match the URLs exactly).
const T_AUTO = 'c_limit,f_auto,q_auto,vc_auto,w_720';   // best format/codec per browser, max 720px wide
const T_MP4 = 'c_limit,q_auto,vc_h264,w_720';            // universal H.264 MP4 fallback
const T_POSTER = (dur) => `c_limit,q_auto,so_${dur != null && dur < 1.5 ? 0 : 1},w_720`; // first-second JPG poster
// Generated in the background right after upload (free plans can't transform big videos on the fly).
const EAGER = `${T_MP4}/mp4|${T_POSTER(10)}/jpg`;

let warned = false;
function config() {
  const raw = String(process.env.CLOUDINARY_URL || '').trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const cfg = { apiKey: decodeURIComponent(u.username), apiSecret: decodeURIComponent(u.password), cloudName: decodeURIComponent(u.hostname) };
    if (u.protocol !== 'cloudinary:' || !cfg.apiKey || !cfg.apiSecret || !/^[\w-]{1,100}$/.test(cfg.cloudName)) throw new Error('bad');
    return cfg;
  } catch {
    if (!warned) { warned = true; console.warn('CLOUDINARY_URL is set but is not cloudinary://API_KEY:API_SECRET@CLOUD_NAME; video uploads are off.'); }
    return null;
  }
}
const enabled = () => !!config();
const apiBase = () => String(process.env.CLOUDINARY_API_BASE || 'https://api.cloudinary.com/v1_1').replace(/\/+$/, '');
const deliveryBase = () => String(process.env.CLOUDINARY_DELIVERY_BASE || 'https://res.cloudinary.com').replace(/\/+$/, '');
const intEnv = (k, d) => { const n = parseInt(process.env[k] || '', 10); return n > 0 ? n : d; };

// Cloudinary signature: every param except file/cloud_name/resource_type/api_key, sorted, k=v joined by &, + secret, SHA-1.
const SIGN_EXCLUDE = new Set(['file', 'cloud_name', 'resource_type', 'api_key', 'signature']);
function signParams(params, secret) {
  const str = Object.keys(params).filter(k => !SIGN_EXCLUDE.has(k) && params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort().map(k => `${k}=${Array.isArray(params[k]) ? params[k].join(',') : params[k]}`).join('&');
  return crypto.createHash('sha1').update(str + secret).digest('hex');
}

const PUBLIC_ID_RE = /^[\w\-./]{1,255}$/;
const encPid = (pid) => pid.split('/').map(encodeURIComponent).join('/');
const basicAuth = (cfg) => 'Basic ' + Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString('base64');

function urls(cloud, publicId, version, duration) {
  const b = `${deliveryBase()}/${encodeURIComponent(cloud)}/video/upload`;
  const v = version ? `v${version}/` : '';
  const pid = encPid(publicId);
  return {
    src: `${b}/${T_AUTO}/${v}${pid}`,
    mp4: `${b}/${T_MP4}/${v}${pid}.mp4`,
    poster: `${b}/${T_POSTER(duration)}/${v}${pid}.jpg`,
  };
}

// Columns added to the post SELECT (LEFT JOIN post_videos v) -> the `video` object the client renders.
const SELECT_COLS = `v.public_id v_public_id, v.cloud_name v_cloud, v.version v_version, v.duration v_duration, v.width v_width,
  v.height v_height, v.poster v_poster, v.is_reel v_is_reel`;
const JOIN = 'LEFT JOIN post_videos v ON v.post_id=p.id';
function videoOut(r) {
  const { v_public_id, v_cloud, v_version, v_duration, v_width, v_height, v_poster, v_is_reel, ...rest } = r;
  if (v_public_id) {
    const u = urls(v_cloud, v_public_id, v_version, v_duration);
    rest.video = {
      public_id: v_public_id, duration: v_duration, width: v_width, height: v_height, is_reel: !!v_is_reel,
      poster: v_poster || u.poster,
      sources: [{ src: u.src }, { src: u.mp4, type: 'video/mp4' }],
    };
  } else rest.video = null;
  return rest;
}

const fail = (status, error) => Object.assign(new Error(error), { status, expose: true });
const fmtSec = (s) => s >= 60 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')} min` : `${Math.round(s)} s`;

// Admin API lookup (basic auth). Returns the resource JSON or null if it doesn't exist on our cloud as a video.
async function fetchResource(cfg, publicId) {
  const url = `${apiBase()}/${encodeURIComponent(cfg.cloudName)}/resources/video/upload/${encPid(publicId)}?media_metadata=true`;
  let r;
  try {
    r = await fetch(url, { headers: { Authorization: basicAuth(cfg), Accept: 'application/json' }, signal: AbortSignal.timeout(intEnv('CLOUDINARY_TIMEOUT_MS', 10000)) });
  } catch (e) { console.warn('Cloudinary lookup failed:', e.name === 'TimeoutError' ? 'timeout' : e.message); throw fail(502, 'Couldn’t check your video with Cloudinary. Please try again.'); }
  if (r.status === 404) return null;
  if (!r.ok) { console.warn('Cloudinary lookup HTTP', r.status); throw fail(502, 'Couldn’t check your video with Cloudinary. Please try again.'); }
  return r.json();
}

// Parse + verify the client's video claim. Only Cloudinary's metadata is trusted.
async function verify(input, { userId, isReel }) {
  const cfg = config();
  if (!cfg) throw fail(503, 'Video uploads are not available right now');
  let v = input;
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch { throw fail(400, 'Invalid video'); } }
  if (!v || typeof v !== 'object') throw fail(400, 'Invalid video');
  const publicId = String(v.public_id || '');
  if (!PUBLIC_ID_RE.test(publicId) || publicId.includes('..')) throw fail(400, 'Invalid video id');
  if (v.cloud_name != null && String(v.cloud_name) !== cfg.cloudName) throw fail(400, 'That video isn’t from ZuZu’s Cloudinary');
  if (v.secure_url != null) {
    let ok = false;
    try { const u = new URL(String(v.secure_url)); ok = u.pathname.split('/')[1] === cfg.cloudName; } catch {}
    if (!ok) throw fail(400, 'That video isn’t from ZuZu’s Cloudinary');
  }
  const res = await fetchResource(cfg, publicId);
  if (!res) throw fail(400, 'Video not found. It must be a video uploaded to ZuZu.');
  if (res.resource_type !== 'video' || (res.type && res.type !== 'upload') || res.is_audio) throw fail(400, 'That file isn’t a video');
  const inFolder = String(res.public_id || publicId).startsWith(FOLDER + '/') || res.asset_folder === FOLDER || res.folder === FOLDER;
  if (!inFolder || (res.public_id && res.public_id !== publicId)) throw fail(400, 'That video wasn’t uploaded through ZuZu');
  const uid = res.context && res.context.custom && res.context.custom.uid;
  if (uid != null && String(uid) !== String(userId)) throw fail(403, 'You can only post videos you uploaded');
  const format = String(res.format || '').toLowerCase();
  if (!FORMATS.includes(format)) throw fail(400, `Unsupported video format${format ? ' (' + format + ')' : ''}. Use MP4, MOV, WebM, 3GP or MKV.`);
  const bytes = Number(res.bytes);
  if (!(bytes > 0)) throw fail(400, 'That video is empty');
  if (bytes > MAX_BYTES) throw fail(400, 'Video must be 100 MB or smaller');
  let duration = Number(res.duration ?? res.video_duration);
  if (!(duration > 0)) duration = Number(v.duration); // older accounts may omit it; the client measured it before upload
  if (!(duration > 0)) throw fail(400, 'Couldn’t read the video’s length');
  const limit = isReel ? MAX_REEL_SECONDS : MAX_POST_SECONDS;
  if (duration > limit + 0.5) throw fail(400, isReel ? `Reels can be up to ${MAX_REEL_SECONDS} seconds (this one is ${fmtSec(duration)})` : `Videos can be up to 3 minutes (this one is ${fmtSec(duration)})`);
  const width = Math.round(Number(res.width)) || null, height = Math.round(Number(res.height)) || null;
  const version = Number(res.version) || null;
  return { public_id: publicId, cloud_name: cfg.cloudName, version, format, duration, width, height, bytes, poster: urls(cfg.cloudName, publicId, version, duration).poster };
}

async function insert(db, client, postId, v, isReel) {
  await db.run(`INSERT INTO post_videos(post_id,public_id,cloud_name,version,format,duration,width,height,bytes,poster,is_reel,created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
  [postId, v.public_id, v.cloud_name, v.version, v.format, v.duration, v.width, v.height, v.bytes, v.poster, !!isReel, Date.now()], client);
}

// ---------- deletion: signed destroy API, queued in video_deletions so failures are retried ----------
async function destroy(cfg, publicId) {
  const params = { public_id: publicId, timestamp: Math.floor(Date.now() / 1000), invalidate: 'true' };
  const body = new URLSearchParams({ ...params, api_key: cfg.apiKey, signature: signParams(params, cfg.apiSecret) });
  const r = await fetch(`${apiBase()}/${encodeURIComponent(cfg.cloudName)}/video/destroy`, { method: 'POST', body, signal: AbortSignal.timeout(intEnv('CLOUDINARY_TIMEOUT_MS', 10000)) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('HTTP ' + r.status);
  if (j.result !== 'ok' && j.result !== 'not found') throw new Error('result ' + j.result);
  return j.result;
}
let dbRef = null, flushing = null;
async function flushDeletions() {
  const cfg = config();
  if (!cfg || !dbRef) return 0;
  if (flushing) return flushing;
  flushing = (async () => {
    let done = 0;
    const rows = await dbRef.all('SELECT public_id, cloud_name FROM video_deletions WHERE attempts < 10 ORDER BY created_at LIMIT 25');
    for (const row of rows) {
      if (row.cloud_name && row.cloud_name !== cfg.cloudName) continue; // another cloud's asset: leave it for that config
      try {
        await destroy(cfg, row.public_id);
        await dbRef.run('DELETE FROM video_deletions WHERE public_id=$1', [row.public_id]);
        done++;
      } catch (e) {
        await dbRef.run('UPDATE video_deletions SET attempts=attempts+1, last_error=$1 WHERE public_id=$2', [String(e.message).slice(0, 200), row.public_id]);
      }
    }
    return done;
  })().catch((e) => { console.warn('Cloudinary cleanup failed:', e.message); return 0; }).finally(() => { flushing = null; });
  return flushing;
}
const flushSoon = () => setImmediate(() => flushDeletions());
// Queue every video in a post's subtree (replies are deleted with it) before the post row goes.
async function queueForPost(db, client, postId) {
  return db.run(`INSERT INTO video_deletions(public_id, cloud_name, created_at)
    WITH RECURSIVE t AS (SELECT id FROM posts WHERE id=$1 UNION ALL SELECT p.id FROM posts p JOIN t ON p.parent_id=t.id)
    SELECT v.public_id, v.cloud_name, $2::bigint FROM post_videos v JOIN t ON t.id=v.post_id
    ON CONFLICT (public_id) DO NOTHING`, [postId, Date.now()], client);
}

// ---------- routes ----------
const signHits = new Map();
function register(app, { auth, h, db, getPosts }) {
  dbRef = db;
  setInterval(() => flushDeletions(), 15 * 60e3).unref();
  setTimeout(() => flushDeletions(), 20e3).unref();
  setInterval(() => { const t = Date.now(); for (const [k, a] of signHits) if (!a.some(x => t - x < 3600e3)) signHits.delete(k); }, 10 * 60e3).unref();

  app.use('/api/video', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

  // Signed params for one direct browser upload (valid ~1 hour, as Cloudinary enforces).
  app.post('/api/video/sign', auth, (req, res) => {
    const cfg = config();
    if (!cfg) return res.status(503).json({ error: 'Video uploads are not available right now' });
    const t = Date.now(), recent = (signHits.get(req.user.id) || []).filter(x => t - x < 3600e3);
    if (recent.length >= intEnv('VIDEO_SIGN_RATE_MAX', 30)) return res.status(429).json({ error: 'Too many video uploads. Try again later.' });
    recent.push(t); signHits.set(req.user.id, recent);
    const params = {
      allowed_formats: FORMATS.join(','),
      context: `uid=${req.user.id}`,
      eager: EAGER,
      eager_async: 'true',
      folder: FOLDER,
      tags: 'zuzu',
      timestamp: Math.floor(t / 1000),
    };
    const signature = signParams(params, cfg.apiSecret);
    res.json({
      cloudName: cfg.cloudName, apiKey: cfg.apiKey, timestamp: params.timestamp, signature,
      folder: FOLDER, resource_type: 'video', eager: params.eager, eager_async: params.eager_async,
      allowed_formats: params.allowed_formats, context: params.context, tags: params.tags,
      params: { ...params, api_key: cfg.apiKey, signature }, // exactly the fields to POST with the file
      uploadUrl: `${apiBase()}/${encodeURIComponent(cfg.cloudName)}/video/upload`,
      chunkSize: intEnv('VIDEO_CHUNK_SIZE', 10 * 1024 * 1024),
      chunkThreshold: intEnv('VIDEO_CHUNK_THRESHOLD', 20 * 1024 * 1024),
      limits: { maxBytes: MAX_BYTES, maxSeconds: MAX_POST_SECONDS, maxReelSeconds: MAX_REEL_SECONDS, formats: FORMATS },
    });
  });

  // The composer was cancelled/cleared after an upload finished: remove that (unposted) asset again.
  app.post('/api/video/discard', auth, h(async (req, res) => {
    const cfg = config();
    if (!cfg) return res.status(503).json({ error: 'Video uploads are not available right now' });
    const pid = String((req.body || {}).public_id || '');
    if (!PUBLIC_ID_RE.test(pid) || pid.includes('..')) return res.status(400).json({ error: 'Invalid video id' });
    if (await db.get('SELECT 1 FROM post_videos WHERE public_id=$1', [pid])) return res.status(409).json({ error: 'That video is posted' });
    const r = await fetchResource(cfg, pid);
    if (!r) return res.json({ ok: true });
    const uid = r.context && r.context.custom && r.context.custom.uid;
    if (String(uid) !== String(req.user.id)) return res.status(403).json({ error: 'Not your video' });
    await db.run('INSERT INTO video_deletions(public_id, cloud_name, created_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [pid, cfg.cloudName, Date.now()]);
    flushSoon();
    res.json({ ok: true });
  }));

  // Reels feed, newest first: ?cursor=<last post id seen>&limit=
  app.get('/api/reels', auth, h(async (req, res) => {
    const cursor = parseInt(req.query.cursor || '0', 10) || 2 ** 31 - 1;
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10) || 10, 1), 30);
    const rows = await db.all(`SELECT v.post_id FROM post_videos v JOIN posts p ON p.id=v.post_id
      WHERE v.is_reel AND p.parent_id IS NULL AND v.post_id < $1 ORDER BY v.post_id DESC LIMIT $2`, [cursor, limit + 1]);
    const more = rows.length > limit;
    const ids = rows.slice(0, limit).map(r => r.post_id);
    const map = await getPosts(ids, req.user.id);
    const items = ids.map(id => map.get(id)).filter(Boolean).map(p => ({ ...p, key: 'p' + p.id }));
    res.json({ items, next_cursor: more && ids.length ? ids[ids.length - 1] : null });
  }));
}

module.exports = {
  register, enabled, config, verify, insert, videoOut, queueForPost, flushDeletions, flushSoon, signParams, urls,
  SELECT_COLS, JOIN, MAX_BYTES, MAX_POST_SECONDS, MAX_REEL_SECONDS, FORMATS, FOLDER, EAGER,
};
