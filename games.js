// Games: Prediction Arena (Brier-scored "will it happen?" rounds) + ZuZu Royale score board.
const QUESTIONS = [
  ['Mount Everest ki ooNchai 8,800 metre se zyada hai.', true, 'Everest 8,849 m hai.'],
  ['Ganga ki lambai 2,000 km se zyada hai.', true, 'Ganga lagbhag 2,525 km lambi hai.'],
  ['The Moon is more than 500,000 km away from Earth.', false, 'Chand ~384,000 km door hai.'],
  ['Light can circle the Earth more than 5 times in one second.', true, 'Roshni ek second mein Earth ke ~7.5 chakkar lagati hai.'],
  ['An adult human has more than 250 bones.', false, 'Adult mein 206 haddiyan hoti hain.'],
  ['A cheetah can run faster than 100 km/h.', true, 'Cheetah 100+ km/h tak pahunch sakta hai.'],
  ['India ki aabadi 2023 mein China se zyada ho gayi.', true, 'UN ke anuman ke mutabik India sabse aage nikla.'],
  ['17 × 23, 400 se zyada hai.', false, '17 × 23 = 391.'],
  ['The Great Wall of China is longer than 20,000 km (all sections counted).', true, 'Surveys ke mutabik ~21,196 km.'],
  ['Blue whale sabse bada jaanwar hai jo kabhi dharti par raha.', true, 'Haan, dinosaurs se bhi bada.'],
  ['A resting adult heart beats more than 100 times a minute on average.', false, 'Aaram mein 60 se 100 baar.'],
  ['Pacific Ocean sabse bada mahasagar hai.', true, 'Poori dharti ka ~30% hissa.'],
  ['Sound travels faster than 1,000 m/s in air.', false, 'Hawa mein ~343 m/s.'],
  ['India mein 28 states hain.', true, '28 states aur 8 union territories.'],
  ['Chandrayaan-3 Chand ke south pole ke paas utra tha.', true, 'August 2023 mein.'],
  ['India ne Cricket World Cup 2011 jeeta.', true, 'Mumbai, Wankhede mein final.'],
  ['The human brain is more than 10% of body weight.', false, 'Lagbhag 2%.'],
  ['Honey, sahi tarah rakha jaye to, kabhi kharab nahi hota.', true, 'Pyramids mein bhi khaane layak shahad mila.'],
  ['Python programming language ka naam saanp se aaya.', false, 'Monty Python comedy group se.'],
  ['Pani sea level par 100°C par ubalta hai.', true, 'Haan.'],
  ['Venus is the hottest planet in our solar system.', true, 'Venus ~465°C, Mercury se bhi garam.'],
  ['Mercury sabse garam planet hai kyunki Sun ke sabse paas hai.', false, 'Venus ki mote atmosphere se wo zyada garam hai.'],
  ['Bharat ka rashtriya pakshi mor hai.', true, 'Peacock, 1963 se.'],
  ['The Titanic sank in 1912.', true, '15 April 1912.'],
  ['2 ki power 10, 1000 se zyada hai.', true, '2^10 = 1024.'],
  ['An ant can lift about 50 times its own weight.', true, 'Kai species 50 guna tak.'],
  ['Insaan ke DNA ka aadhe se zyada hissa kele (banana) se milta hai.', true, 'Lagbhag 60% genes kisi na kisi form mein common. Momo khush! 🍌'],
  ['Botanically, bananas are berries but strawberries are not.', true, 'Haan, botany ka funny sach.'],
  ['Gandhi Jayanti 2 October ko hoti hai.', true, 'Haan.'],
  ['A Rubik’s Cube has more than 43 quintillion combinations.', true, '≈ 4.3 × 10^19.'],
  ['Binary 1010 ka matlab decimal mein 10 hota hai.', true, '8 + 2 = 10.'],
  ['Sabse chhota prime number 1 hai.', false, 'Sabse chhota prime 2 hai.'],
  ['The internet’s ancestor ARPANET started before 1980.', true, '1969 mein pehla message.'],
  ['Octopus ke teen dil hote hain.', true, 'Do gills ke liye, ek body ke liye.'],
  ['A goldfish remembers things for only 3 seconds.', false, 'Mahino tak yaad rakh sakti hai.'],
  ['15% of 240, 40 se zyada hai.', false, '15% of 240 = 36.'],
  ['Sahara desert Africa mein hai.', true, 'Duniya ka sabse bada garam registan.'],
  ['Mumbai local trains rozana 5 million se zyada yatriyon ko le jaati hain.', true, 'Lagbhag 7 million+ rozana.'],
  ['Kolkata ka purana naam Calcutta tha.', true, '2001 mein naam badla.'],
  ['Taj Mahal Yamuna nadi ke kinare Agra mein hai.', true, 'Shah Jahan ne Mumtaz Mahal ki yaad mein banwaya.'],
].map(([t, a, why], i) => ({ id: i + 1, t, a, why }));
const Q = new Map(QUESTIONS.map(q => [q.id, q]));
const ROUND_SIZE = 5;
const istDay = (ms = Date.now()) => new Date(ms + 5.5 * 3600e3).toISOString().slice(0, 10);
function rng(seedStr) { let h = 1779033703 ^ seedStr.length; for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; }
function pick(rand) { const ids = QUESTIONS.map(q => q.id); for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; } return ids.slice(0, ROUND_SIZE); }
const dailyIds = (day) => pick(rng('zuzu-arena-' + day));
const pub = (id) => ({ id, t: Q.get(id).t });

// Proper scoring: p = stated probability that the statement is true. Brier = (p - outcome)^2 (0 best, 1 worst, 0.25 for a coin flip).
function scoreAnswers(answers) {
  let sum = 0; const rows = [];
  for (const a of answers) {
    const q = Q.get(a.id), p = a.side ? a.c / 100 : 1 - a.c / 100, o = q.a ? 1 : 0, brier = (p - o) ** 2;
    sum += brier; rows.push({ id: q.id, t: q.t, side: a.side, c: a.c, correct: a.side === q.a, outcome: q.a, brier: +brier.toFixed(4), points: Math.round(100 * (1 - brier)), why: q.why });
  }
  const mean = sum / answers.length;
  return { rows, brier: +mean.toFixed(4), score: Math.round(1000 * (1 - mean)), accuracy: rows.filter(r => r.correct).length / rows.length, avgConfidence: +(answers.reduce((s, a) => s + a.c, 0) / answers.length).toFixed(1) };
}
function parseAnswers(body, expectIds) {
  const arr = body && Array.isArray(body.answers) ? body.answers : null;
  if (!arr || arr.length !== ROUND_SIZE) return { error: `Answer all ${ROUND_SIZE} questions` };
  const seen = new Set(), out = [];
  for (const a of arr) {
    const id = Number(a && a.id), c = Number(a && a.c);
    if (!Q.has(id) || seen.has(id)) return { error: 'Unknown or repeated question' };
    if (expectIds && !expectIds.includes(id)) return { error: 'These are not today’s questions' };
    if (!Number.isInteger(c) || c < 50 || c > 99) return { error: 'Confidence must be a whole number from 50 to 99' };
    if (typeof a.side !== 'boolean') return { error: 'Pick Yes or No for every question' };
    seen.add(id); out.push({ id, side: a.side, c });
  }
  return { answers: out };
}
const royaleScore = (r) => (21 - r.placement) * 50 + r.kills * 100 + (r.placement === 1 ? 500 : 0);
function parseRoyale(b) {
  const placement = Number(b && b.placement), kills = Number(b && b.kills), secs = Number(b && b.seconds);
  if (!Number.isInteger(placement) || placement < 1 || placement > 20) return { error: 'Invalid placement' };
  if (!Number.isInteger(kills) || kills < 0 || kills > 19) return { error: 'Invalid kills' };
  if (!Number.isFinite(secs) || secs < 0 || secs > 1800) return { error: 'Invalid time' };
  return { placement, kills, seconds: Math.round(secs) };
}
const rl = new Map();
function register(app, { auth, h, db, now }) {
  const board = async (game, day, me) => {
    const rows = await db.all(`SELECT s.score, s.detail, u.username, u.name, u.avatar FROM (
        SELECT DISTINCT ON (user_id) user_id, score, detail FROM game_scores WHERE game=$1 AND day=$2 ORDER BY user_id, score DESC, created_at ASC) s
      JOIN users u ON u.id=s.user_id ORDER BY s.score DESC, u.username ASC LIMIT 20`, [game, day]);
    return rows.map((r, i) => ({ rank: i + 1, username: r.username, name: r.name, avatar: r.avatar, score: r.score, detail: r.detail, me: !!(me && r.username === me.username) }));
  };
  app.get('/api/games/summary', auth, h(async (req, res) => {
    const day = istDay();
    const mine = await db.get("SELECT score, detail FROM game_scores WHERE user_id=$1 AND game='arena' AND mode='daily' AND day=$2", [req.user.id, day]);
    const best = await db.get("SELECT MAX(score)::int s, COUNT(*)::int n FROM game_scores WHERE user_id=$1 AND game='royale'", [req.user.id]);
    const today = await db.get("SELECT COUNT(DISTINCT user_id)::int n FROM game_scores WHERE game='arena' AND day=$1", [day]);
    res.json({ day, arena: { played: !!mine, score: mine ? mine.score : null, brier: mine && mine.detail ? mine.detail.brier : null, players: today.n }, royale: { best: best.s, plays: best.n }, questions: QUESTIONS.length });
  }));
  app.get('/api/games/arena/round', auth, h(async (req, res) => {
    const day = istDay(), practice = req.query.mode === 'practice';
    res.set('Cache-Control', 'no-store');
    if (!practice) {
      const mine = await db.get("SELECT score, detail FROM game_scores WHERE user_id=$1 AND game='arena' AND mode='daily' AND day=$2", [req.user.id, day]);
      if (mine) return res.json({ mode: 'daily', day, played: true, score: mine.score, result: mine.detail });
    }
    const ids = practice ? pick(Math.random) : dailyIds(day);
    res.json({ mode: practice ? 'practice' : 'daily', day, played: false, questions: ids.map(pub) });
  }));
  app.post('/api/games/arena/submit', auth, h(async (req, res) => {
    const day = istDay(), practice = (req.body && req.body.mode) === 'practice';
    const p = parseAnswers(req.body, practice ? null : dailyIds(day));
    if (p.error) return res.status(400).json({ error: p.error });
    const r = scoreAnswers(p.answers), detail = { brier: r.brier, accuracy: r.accuracy, avgConfidence: r.avgConfidence, rows: r.rows };
    if (!practice) {
      const n = await db.run("INSERT INTO game_scores(user_id,game,mode,day,score,detail,created_at) VALUES ($1,'arena','daily',$2,$3,$4,$5) ON CONFLICT DO NOTHING", [req.user.id, day, r.score, JSON.stringify(detail), now()]);
      if (!n) { const mine = await db.get("SELECT score, detail FROM game_scores WHERE user_id=$1 AND game='arena' AND mode='daily' AND day=$2", [req.user.id, day]); return res.status(409).json({ error: 'You already played today’s round', score: mine.score, result: mine.detail }); }
    }
    res.json({ mode: practice ? 'practice' : 'daily', day, score: r.score, ...detail, leaderboard: practice ? undefined : await board('arena', day, req.user) });
  }));
  app.get('/api/games/arena/leaderboard', auth, h(async (req, res) => {
    const day = /^\d{4}-\d{2}-\d{2}$/.test(req.query.day || '') ? req.query.day : istDay();
    res.json({ day, items: (await board('arena', day, req.user)).map(({ detail, ...x }) => ({ ...x, brier: detail && detail.brier })) });
  }));
  app.post('/api/games/royale/score', auth, h(async (req, res) => {
    const p = parseRoyale(req.body); if (p.error) return res.status(400).json({ error: p.error });
    const t = Date.now(), last = rl.get(req.user.id) || 0;
    if (t - last < 15000) return res.status(429).json({ error: 'Slow down: one score every 15 seconds' });
    rl.set(req.user.id, t);
    const score = royaleScore(p), day = istDay();
    await db.run("INSERT INTO game_scores(user_id,game,mode,day,score,detail,created_at) VALUES ($1,'royale','run',$2,$3,$4,$5)", [req.user.id, day, score, JSON.stringify(p), now()]);
    const best = await db.get("SELECT MAX(score)::int s FROM game_scores WHERE user_id=$1 AND game='royale'", [req.user.id]);
    res.json({ score, best: best.s, leaderboard: await board('royale', day, req.user) });
  }));
  app.get('/api/games/royale/leaderboard', auth, h(async (req, res) => {
    const day = /^\d{4}-\d{2}-\d{2}$/.test(req.query.day || '') ? req.query.day : istDay();
    res.json({ day, items: await board('royale', day, req.user) });
  }));
}
module.exports = { QUESTIONS, scoreAnswers, parseAnswers, parseRoyale, royaleScore, dailyIds, istDay, register, ROUND_SIZE };
