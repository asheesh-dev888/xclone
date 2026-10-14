// Web Push (VAPID) for likes, replies, follows, mentions and DMs, plus language preferences (UI + AI style).
// Keys come from VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY; without them push is simply off (everything else works).
const webpush = require('web-push');

const UI_LANGS = ['en', 'hi', 'hinglish'];
const AI_LANGS = ['auto', 'en', 'hi', 'hinglish'];
const enabled = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
let configured = '';
function setup() {
  if (!enabled()) return false;
  if (configured !== process.env.VAPID_PUBLIC_KEY) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:support@zuzu.app', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    configured = process.env.VAPID_PUBLIC_KEY;
  }
  return true;
}

const TEXT = {
  en: { like: '{n} liked your post', reply: '{n} replied to you', follow: '{n} followed you', repost: '{n} reposted your post', mention: '{n} mentioned you', dm: 'New message from {n}' },
  hi: { like: '{n} ने आपकी पोस्ट पसंद की', reply: '{n} ने आपको जवाब दिया', follow: '{n} ने आपको फ़ॉलो किया', repost: '{n} ने आपकी पोस्ट रीपोस्ट की', mention: '{n} ने आपका ज़िक्र किया', dm: '{n} का नया संदेश' },
  hinglish: { like: '{n} ne aapki post like ki', reply: '{n} ne aapko reply kiya', follow: '{n} ne aapko follow kiya', repost: '{n} ne aapki post repost ki', mention: '{n} ne aapko mention kiya', dm: '{n} ka naya message' },
};
const title = (lang, type, name) => ((TEXT[lang] || TEXT.en)[type] || TEXT.en[type] || '{n}').replace('{n}', name);

let db = null;
// Encrypt (aes128gcm) + sign (VAPID) with web-push, deliver with fetch. Returns the push service's status code.
async function deliver(s, payload) {
  const d = webpush.generateRequestDetails({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400, urgency: 'normal' });
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 10000);
  try { const r = await fetch(d.endpoint, { method: d.method, headers: d.headers, body: d.body, signal: ctrl.signal }); return r.status; }
  finally { clearTimeout(t); }
}
// Fire-and-forget: never blocks or fails the request that caused it. Gone subscriptions (404/410) are removed.
function send(userId, type, { actorId, postId, conversationId, body } = {}) {
  if (!db || !setup()) return;
  setImmediate(async () => {
    try {
      const subs = await db.all('SELECT * FROM push_subscriptions WHERE user_id=$1', [userId]);
      if (!subs.length) return;
      const u = await db.get('SELECT ui_lang FROM users WHERE id=$1', [userId]);
      const a = actorId ? await db.get('SELECT name, username, avatar FROM users WHERE id=$1', [actorId]) : null;
      if (!u || (actorId && !a)) return;
      const url = type === 'dm' ? `/messages/${conversationId}` : type === 'follow' ? `/u/${a.username}` : `/post/${postId}`;
      const payload = JSON.stringify({ title: title(u.ui_lang, type, a ? a.name : 'ZuZu'), body: String(body || '').slice(0, 140), url, tag: `${type}-${postId || conversationId || actorId}`, icon: (a && a.avatar) || '/icon-192.png' });
      await Promise.all(subs.map(s => deliver(s, payload)
        .then(code => { if (code === 404 || code === 410) return db.run('DELETE FROM push_subscriptions WHERE id=$1', [s.id]); if (code >= 400) console.warn('push failed:', code); })
        .catch(e => console.warn('push failed:', e.message))));
    } catch (e) { console.warn('push error:', e.message); }
  });
}

// @mentions in a post: existing users only, max 10, never yourself.
async function mentionedUsers(text, selfId) {
  const names = [...new Set([...String(text || '').matchAll(/(^|[^\w@])@([A-Za-z0-9_]{1,30})\b/g)].map(m => m[2].toLowerCase()))].slice(0, 10);
  if (!names.length) return [];
  const rows = await db.all('SELECT id FROM users WHERE lower(username) = ANY($1::text[]) AND id<>$2', [names, selfId]);
  return rows.map(r => r.id);
}

function register(app, deps) {
  db = deps.db; const { auth, h } = deps;
  app.get('/api/push/key', (req, res) => res.json({ enabled: enabled(), key: enabled() ? process.env.VAPID_PUBLIC_KEY : null }));
  app.post('/api/push/subscribe', auth, h(async (req, res) => {
    const s = (req.body && req.body.subscription) || {};
    const endpoint = String(s.endpoint || ''), keys = s.keys || {};
    if (!/^https:\/\//.test(endpoint) && !(process.env.PUSH_ALLOW_HTTP === '1' && /^http:\/\/(localhost|127\.0\.0\.1)[:/]/.test(endpoint))) return res.status(400).json({ error: 'Invalid subscription' });
    if (endpoint.length > 1000 || !keys.p256dh || !keys.auth || String(keys.p256dh).length > 200 || String(keys.auth).length > 100) return res.status(400).json({ error: 'Invalid subscription' });
    const n = await db.get('SELECT COUNT(*)::int n FROM push_subscriptions WHERE user_id=$1', [req.user.id]);
    if (n.n >= 10) await db.run('DELETE FROM push_subscriptions WHERE id IN (SELECT id FROM push_subscriptions WHERE user_id=$1 ORDER BY created_at ASC LIMIT 1)', [req.user.id]);
    await db.run(`INSERT INTO push_subscriptions(user_id,endpoint,p256dh,auth,created_at) VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (endpoint) DO UPDATE SET user_id=EXCLUDED.user_id, p256dh=EXCLUDED.p256dh, auth=EXCLUDED.auth`, [req.user.id, endpoint, String(keys.p256dh), String(keys.auth), Date.now()]);
    res.json({ ok: true });
  }));
  app.post('/api/push/unsubscribe', auth, h(async (req, res) => {
    await db.run('DELETE FROM push_subscriptions WHERE user_id=$1 AND endpoint=$2', [req.user.id, String((req.body && req.body.endpoint) || '')]);
    res.json({ ok: true });
  }));
  app.get('/api/me/prefs', auth, (req, res) => res.json({ ui_lang: req.user.ui_lang || 'en', ai_lang: req.user.ai_lang || 'auto' }));
  app.put('/api/me/prefs', auth, h(async (req, res) => {
    const b = req.body || {};
    const ui = b.ui_lang == null ? req.user.ui_lang : String(b.ui_lang), ai = b.ai_lang == null ? req.user.ai_lang : String(b.ai_lang);
    if (!UI_LANGS.includes(ui) || !AI_LANGS.includes(ai)) return res.status(400).json({ error: 'Unknown language' });
    await db.run('UPDATE users SET ui_lang=$1, ai_lang=$2 WHERE id=$3', [ui, ai, req.user.id]);
    res.json({ ui_lang: ui, ai_lang: ai });
  }));
}

module.exports = { register, send, mentionedUsers, enabled, title, UI_LANGS, AI_LANGS };
