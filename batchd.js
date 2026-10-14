// Batch D: daily thought challenge, ideal circles, 24-hour stories.
//
// Daily thought: one prompt per IST calendar day (PROMPTS[dayNumber % PROMPTS.length]). Answers are ordinary posts
// carrying posts.challenge_day (one per user per day); /api/challenge lists a day's answers by likes, top 3 featured.
// Circles: one per preset ideal (public/ideals.js). Join/leave; the circle feed is its members' top-level posts.
// Stories: a photo (stored like post images) or a short Cloudinary video, a Momo sticker and a text overlay, live for
// 24 h. Every read filters on expires_at > now; a sweeper deletes expired rows, their media and queues the video
// for Cloudinary's destroy API.
const video = require('./video');
const ideals = require('./ideals');

const PROMPTS = [
  'What small thing made you smile today?', 'Which habit would you teach your younger self?', 'Describe your perfect chai break.',
  'What is one thing you learned this week?', 'Who inspired you recently, and why?', 'What would you do with one extra hour every day?',
  'Which book or film changed how you think?', 'What does kindness look like to you?', 'Share a tiny win from today.',
  'What is a skill you want to learn this year?', 'Which place in India would you visit tomorrow if you could?', 'What advice would your grandparents give you today?',
  'What is your favourite monsoon memory?', 'What makes a friend a real friend?', 'What is one thing you are grateful for right now?',
  'If you could fix one problem in your city, what would it be?', 'What song is stuck in your head lately?', 'What is the best compliment you ever got?',
  'Which festival food can you never say no to?', 'What does success mean to you?', 'What would you tell someone starting their first job?',
  'What is a fear you have overcome?', 'Which teacher do you still remember, and why?', 'What would your ideal weekend look like?',
  'What is something people often misunderstand about you?', 'What is a simple pleasure you love?', 'Which invention could you not live without?',
  'What is a goal you are working on quietly?', 'What is the most useful thing you learned online?', 'What makes you feel calm?',
  'What would you name a new planet?', 'What is a tradition you want to keep alive?', 'Who would you like to have dinner with?',
  'What is one rule you live by?', 'Which quote keeps you going?', 'What is your go-to comfort food?',
  'What is something you changed your mind about?', 'What would you build if money did not matter?', 'Describe today in three words.',
  'What is a moment you felt really proud?', 'What does home mean to you?', 'Which hobby would you pick up tomorrow?',
  'What is a question you wish people asked you?', 'What is the bravest thing you have done?', 'What is a lesson cricket (or any sport) taught you?',
  'What is your favourite way to help others?', 'Which childhood game do you miss?', 'What is a small change that improved your life?',
  'What is something beautiful you saw this week?', 'What is your superpower in a team?', 'What would you put in a time capsule?',
  'What do you do when you feel stuck?', 'What makes a good leader?', 'Which language would you love to speak fluently?',
  'What is a mistake that taught you a lot?', 'What does your ideal morning look like?', 'What is the kindest thing a stranger did for you?',
  'What are you looking forward to this month?', 'Which value matters most to you?', 'What would you like to be remembered for?',
];
const IST_MS = 330 * 60e3;
const istDay = (t = Date.now()) => new Date(t + IST_MS).toISOString().slice(0, 10);
const dayNumber = (day) => Math.floor(Date.parse(day + 'T00:00:00Z') / 86400e3);
const promptFor = (day) => PROMPTS[((dayNumber(day) % PROMPTS.length) + PROMPTS.length) % PROMPTS.length];
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const STORY_MS = () => parseInt(process.env.STORY_TTL_MS || '', 10) || 24 * 3600e3;
const STICKERS = ['happy', 'sad', 'funny', 'angry', 'thoughtful'];
const CAPTION_MAX = 120;

function register(app, { auth, h, db, hydrate, getPosts, saveMedia, upload, now }) {
  // ---------- daily thought ----------
  app.get('/api/challenge/today', auth, h(async (req, res) => {
    const day = istDay();
    const r = await db.get(`SELECT COUNT(*)::int n, MAX(CASE WHEN user_id=$2 THEN id END) mine FROM posts
      WHERE challenge_day=$1 AND parent_id IS NULL AND repost_of IS NULL`, [day, req.user.id]);
    res.json({ day, prompt: promptFor(day), count: r.n, answered: r.mine || null });
  }));
  app.get('/api/challenge', auth, h(async (req, res) => {
    const day = DAY_RE.test(String(req.query.day || '')) ? String(req.query.day) : istDay();
    if (day > istDay()) return res.status(404).json({ error: 'That day hasn’t happened yet' });
    const rows = await db.all(`SELECT p.id FROM posts p WHERE p.challenge_day=$1 AND p.parent_id IS NULL AND p.repost_of IS NULL
      ORDER BY (SELECT COUNT(*) FROM likes l WHERE l.post_id=p.id) DESC, p.created_at ASC LIMIT 100`, [day]);
    const map = await getPosts(rows.map(r => r.id), req.user.id);
    const items = rows.map((r, i) => map.get(r.id) && { ...map.get(r.id), key: 'p' + r.id, rank: i + 1, featured: i < 3 }).filter(Boolean);
    res.json({ day, prompt: promptFor(day), today: day === istDay(), items });
  }));

  // ---------- ideal circles (preset ideals) ----------
  const circleOut = async (p, me) => {
    const r = await db.get(`SELECT COUNT(*)::int n, BOOL_OR(user_id=$2) joined FROM circle_members WHERE circle=$1`, [p.id, me]);
    return { id: p.id, name: p.name, description: p.desc || null, qualities: [p.primary, ...(p.secondary || [])].filter(k => ideals.QUALITY.has(k)).slice(0, 3),
      color: (ideals.QUALITY.get(p.primary) || {}).color || null, member_count: r.n, joined: !!r.joined };
  };
  const findCircle = (req, res) => { const p = ideals.PRESET.get(String(req.params.id)); if (!p) res.status(404).json({ error: 'Circle not found' }); return p; };
  app.get('/api/circles', auth, h(async (req, res) => {
    const counts = new Map((await db.all('SELECT circle, COUNT(*)::int n, BOOL_OR(user_id=$1) joined FROM circle_members GROUP BY circle', [req.user.id])).map(r => [r.circle, r]));
    res.json({ circles: ideals.PRESETS.map(p => ({ id: p.id, name: p.name, color: (ideals.QUALITY.get(p.primary) || {}).color || null,
      member_count: (counts.get(p.id) || {}).n || 0, joined: !!(counts.get(p.id) || {}).joined })) });
  }));
  app.get('/api/circles/:id', auth, h(async (req, res) => {
    const p = findCircle(req, res); if (!p) return;
    const members = await db.all(`SELECT u.id, u.username, u.name, u.avatar, u.bio, EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=$2 AND f.followee_id=u.id) is_following
      FROM circle_members m JOIN users u ON u.id=m.user_id WHERE m.circle=$1 ORDER BY m.joined_at DESC LIMIT 60`, [p.id, req.user.id]);
    res.json({ circle: await circleOut(p, req.user.id), members });
  }));
  app.get('/api/circles/:id/feed', auth, h(async (req, res) => {
    const p = findCircle(req, res); if (!p) return;
    const before = parseInt(req.query.before || '0', 10) || 9e15;
    const rows = await db.all(`SELECT p.id, p.repost_of, p.created_at, u.username, u.name FROM posts p JOIN users u ON u.id=p.user_id
      WHERE p.parent_id IS NULL AND p.repost_of IS NULL AND p.created_at < $2 AND p.user_id IN (SELECT user_id FROM circle_members WHERE circle=$1)
      ORDER BY p.created_at DESC LIMIT 30`, [p.id, before]);
    res.json({ items: await hydrate(rows, req.user.id) });
  }));
  app.post('/api/circles/:id/join', auth, h(async (req, res) => {
    const p = findCircle(req, res); if (!p) return;
    await db.run('INSERT INTO circle_members(circle,user_id,joined_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [p.id, req.user.id, now()]);
    res.json({ circle: await circleOut(p, req.user.id) });
  }));
  app.delete('/api/circles/:id/join', auth, h(async (req, res) => {
    const p = findCircle(req, res); if (!p) return;
    await db.run('DELETE FROM circle_members WHERE circle=$1 AND user_id=$2', [p.id, req.user.id]);
    res.json({ circle: await circleOut(p, req.user.id) });
  }));

  // ---------- stories ----------
  const storyOut = (s, me) => {
    const out = { id: s.id, kind: s.kind, sticker: s.sticker, caption: s.caption, caption_pos: s.caption_pos, created_at: Number(s.created_at), expires_at: Number(s.expires_at), seen: !!s.seen };
    if (s.kind === 'photo') out.src = '/media/' + s.media_id;
    else { const u = video.urls(s.cloud_name, s.public_id, s.version, s.duration); out.src = u.mp4; out.sources = [{ src: u.src }, { src: u.mp4, type: 'video/mp4' }]; out.poster = u.poster; out.duration = s.duration; }
    if (s.user_id === me) out.view_count = s.view_count || 0;
    return out;
  };
  const SEL = `SELECT s.*, EXISTS(SELECT 1 FROM story_views v WHERE v.story_id=s.id AND v.user_id=@me) seen,
    (SELECT COUNT(*)::int FROM story_views v WHERE v.story_id=s.id) view_count FROM stories s`;
  // Rings: me first (if I have any), then people I follow with live stories, unseen first, newest first.
  app.get('/api/stories', auth, h(async (req, res) => {
    const me = req.user.id;
    const rows = await db.all(`${SEL} WHERE s.expires_at > @now AND (s.user_id=@me OR s.user_id IN (SELECT followee_id FROM follows WHERE follower_id=@me))
      ORDER BY s.created_at ASC`, { me, now: now() });
    const byUser = new Map();
    for (const r of rows) { if (!byUser.has(r.user_id)) byUser.set(r.user_id, []); byUser.get(r.user_id).push(storyOut(r, me)); }
    const users = byUser.size ? await db.all('SELECT id, username, name, avatar FROM users WHERE id = ANY($1::int[])', [[...byUser.keys()]]) : [];
    const rings = users.map(u => { const st = byUser.get(u.id); return { user: u, stories: st, all_seen: u.id === me || st.every(s => s.seen), latest: st[st.length - 1].created_at, mine: u.id === me }; });
    rings.sort((a, b) => (b.mine - a.mine) || (a.all_seen - b.all_seen) || (b.latest - a.latest));
    res.json({ rings });
  }));
  app.get('/api/users/:username/stories', auth, h(async (req, res) => {
    const u = await db.get('SELECT id, username, name, avatar FROM users WHERE LOWER(username)=LOWER($1)', [req.params.username]);
    if (!u) return res.status(404).json({ error: 'User not found' });
    const rows = await db.all(`${SEL} WHERE s.user_id=@uid AND s.expires_at > @now ORDER BY s.created_at ASC`, { me: req.user.id, uid: u.id, now: now() });
    res.json({ user: u, stories: rows.map(r => storyOut(r, req.user.id)) });
  }));
  app.post('/api/stories', auth, upload.single('image'), h(async (req, res) => {
    const b = req.body || {};
    const caption = String(b.caption || '').replace(/\s+/g, ' ').trim();
    if ([...caption].length > CAPTION_MAX) return res.status(400).json({ error: `Story text can be up to ${CAPTION_MAX} characters` });
    const sticker = b.sticker ? String(b.sticker) : null;
    if (sticker && !STICKERS.includes(sticker)) return res.status(400).json({ error: 'Unknown sticker' });
    let pos = b.caption_pos != null && b.caption_pos !== '' ? Number(b.caption_pos) : 0.5;
    if (!(pos >= 0 && pos <= 1)) pos = 0.5;
    const hasVideo = b.video != null && b.video !== '';
    if (!req.file && !hasVideo) return res.status(400).json({ error: 'Add a photo or a video to your story' });
    if (req.file && hasVideo) return res.status(400).json({ error: 'A story is a photo or a video, not both' });
    let vid = null;
    if (hasVideo) {
      try { vid = await video.verify(b.video, { userId: req.user.id, isReel: true }); }
      catch (e) { if (e.expose) return res.status(e.status).json({ error: e.message }); throw e; }
      if (await db.get('SELECT 1 FROM post_videos WHERE public_id=$1 UNION ALL SELECT 1 FROM stories WHERE public_id=$1', [vid.public_id])) return res.status(409).json({ error: 'That video is already posted' });
    }
    const t = now();
    const id = await db.tx(async (c) => {
      const mediaUrl = req.file ? await saveMedia(c, req.file, req.user.id) : null;
      const r = await db.get(`INSERT INTO stories(user_id,kind,media_id,public_id,cloud_name,version,duration,width,height,sticker,caption,caption_pos,created_at,expires_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [req.user.id, vid ? 'video' : 'photo', mediaUrl ? mediaUrl.slice(7) : null, vid && vid.public_id, vid && vid.cloud_name, vid && vid.version, vid && vid.duration, vid && vid.width, vid && vid.height,
        sticker, caption || null, pos, t, t + STORY_MS()], c);
      return r.id;
    });
    const s = await db.get(`${SEL} WHERE s.id=@id`, { id, me: req.user.id });
    res.json({ story: storyOut(s, req.user.id) });
  }));
  app.post('/api/stories/:id/view', auth, h(async (req, res) => {
    const s = await db.get('SELECT id, user_id FROM stories WHERE id=$1 AND expires_at > $2', [parseInt(req.params.id, 10) || 0, now()]);
    if (!s) return res.status(404).json({ error: 'Story not found' });
    if (s.user_id !== req.user.id) await db.run('INSERT INTO story_views(story_id,user_id,viewed_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [s.id, req.user.id, now()]);
    res.json({ ok: true });
  }));
  app.get('/api/stories/:id/viewers', auth, h(async (req, res) => {
    const s = await db.get('SELECT id, user_id FROM stories WHERE id=$1 AND expires_at > $2', [parseInt(req.params.id, 10) || 0, now()]);
    if (!s || s.user_id !== req.user.id) return res.status(404).json({ error: 'Story not found' });
    const viewers = await db.all(`SELECT u.username, u.name, u.avatar, v.viewed_at FROM story_views v JOIN users u ON u.id=v.user_id WHERE v.story_id=$1 ORDER BY v.viewed_at DESC LIMIT 200`, [s.id]);
    res.json({ count: viewers.length, viewers });
  }));
  app.delete('/api/stories/:id', auth, h(async (req, res) => {
    const s = await db.get('SELECT * FROM stories WHERE id=$1', [parseInt(req.params.id, 10) || 0]);
    if (!s || s.user_id !== req.user.id) return res.status(404).json({ error: 'Story not found' });
    await removeStories(db, [s]);
    res.json({ ok: true });
  }));

  const sweep = () => sweepExpired(db, now()).catch(e => console.warn('Story cleanup failed:', e.message));
  setInterval(sweep, 10 * 60e3).unref();
  setTimeout(sweep, 15e3).unref();
  app.post('/api/stories/sweep', auth, h(async (req, res) => { // admin/test helper: run the sweep now
    if (!(process.env.STORY_SWEEP_OPEN === '1' || (process.env.ADMIN_USERNAMES || '').split(',').map(s => s.trim().toLowerCase()).includes(req.user.username.toLowerCase()))) return res.status(404).json({ error: 'Not found' });
    res.json({ removed: await sweepExpired(db, now()) });
  }));
}

async function removeStories(db, rows) {
  if (!rows.length) return 0;
  await db.tx(async (c) => {
    for (const s of rows) {
      if (s.public_id) await db.run('INSERT INTO video_deletions(public_id, cloud_name, created_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [s.public_id, s.cloud_name, Date.now()], c);
      if (s.media_id) await db.run('DELETE FROM media WHERE id=$1', [s.media_id], c);
      await db.run('DELETE FROM stories WHERE id=$1', [s.id], c);
    }
  });
  if (rows.some(s => s.public_id)) video.flushSoon();
  return rows.length;
}
async function sweepExpired(db, t) {
  const rows = await db.all('SELECT id, public_id, cloud_name, media_id FROM stories WHERE expires_at <= $1 ORDER BY id LIMIT 200', [t]);
  return removeStories(db, rows);
}

// Post creation hook: validates `challenge` and returns the IST day to store (or null).
function challengeDay(body, { parentId, poll }) {
  if (!['1', 'true', 'on', true].includes(body.challenge)) return null;
  if (parentId) throw Object.assign(new Error('Replies can’t answer the daily thought'), { status: 400 });
  return istDay();
}

module.exports = { register, PROMPTS, istDay, promptFor, challengeDay, sweepExpired, STICKERS };
