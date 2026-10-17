// Games API test: Prediction Arena (Brier scoring, daily uniqueness, leaderboard) + Royale scores. node tests/games-test.js [baseUrl]
const BASE = process.argv[2] || 'http://localhost:4180';
const G = require('../games');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
function client() {
  let cookie = '';
  return async (method, path, body) => {
    const headers = cookie ? { cookie } : {}; let b;
    if (body) { headers['content-type'] = 'application/json'; b = JSON.stringify(body); }
    const r = await fetch(BASE + path, { method, headers, body: b });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    let j = null; try { j = await r.json(); } catch {}
    return { status: r.status, body: j };
  };
}
const uname = (p) => p + Math.random().toString(36).slice(2, 8);
(async () => {
  // pure scoring maths
  const q = G.QUESTIONS;
  ok(q.length >= 40 && new Set(q.map(x => x.id)).size === q.length && q.every(x => typeof x.a === 'boolean' && x.t && x.why), 'seed list has 40+ unique questions with outcomes');
  const tid = q.find(x => x.a).id, fid = q.find(x => !x.a).id;
  let r = G.scoreAnswers([{ id: tid, side: true, c: 50 }]);
  ok(r.brier === 0.25 && r.score === 750, 'coin flip: Brier 0.25, score 750');
  r = G.scoreAnswers([{ id: tid, side: true, c: 100 }]); ok(r.brier === 0 && r.score === 1000, 'certain and right: Brier 0');
  r = G.scoreAnswers([{ id: tid, side: false, c: 90 }]); ok(Math.abs(r.brier - 0.81) < 1e-9 && r.rows[0].correct === false, '90% sure and wrong: Brier 0.81');
  r = G.scoreAnswers([{ id: fid, side: false, c: 80 }]); ok(Math.abs(r.brier - 0.04) < 1e-9 && r.rows[0].correct, '80% "No" on a false statement: Brier 0.04');
  ok(JSON.stringify(G.dailyIds('2026-01-01')) === JSON.stringify(G.dailyIds('2026-01-01')) && G.dailyIds('2026-01-01').length === 5, 'daily set is deterministic, 5 questions');

  ok(G.royaleScore({ placement: 1, kills: 3 }) === 20 * 50 + 300 + 500, 'royale score formula');
  const A = client(), B = client(), anon = client(), ua = uname('ga_'), ub = uname('gb_');
  await A('POST', '/api/signup', { username: ua, password: 'secret123' }); await B('POST', '/api/signup', { username: ub, password: 'secret123' });
  r = await anon('GET', '/api/games/summary'); ok(r.status === 401, 'games need login');
  r = await A('GET', '/api/games/summary'); ok(r.status === 200 && r.body.arena.played === false && r.body.questions >= 40, 'summary: not played yet');
  r = await A('GET', '/api/games/arena/round');
  const ids = r.body.questions.map(x => x.id);
  ok(r.status === 200 && r.body.mode === 'daily' && ids.length === 5 && r.body.questions.every(x => x.t && x.a === undefined && x.why === undefined), 'daily round: 5 questions, outcomes not leaked');
  ok(JSON.stringify(ids) === JSON.stringify(G.dailyIds(G.istDay())), 'same questions for everyone today');
  const mk = (side, c, list = ids) => ({ answers: list.map(id => ({ id, side, c })) });
  r = await A('POST', '/api/games/arena/submit', { answers: ids.slice(0, 4).map(id => ({ id, side: true, c: 60 })) }); ok(r.status === 400, 'needs 5 answers');
  r = await A('POST', '/api/games/arena/submit', mk(true, 100)); ok(r.status === 400, 'confidence above 99 rejected');
  r = await A('POST', '/api/games/arena/submit', mk(true, 49)); ok(r.status === 400, 'confidence below 50 rejected');
  r = await A('POST', '/api/games/arena/submit', { answers: ids.map(id => ({ id, side: 'yes', c: 70 })) }); ok(r.status === 400, 'side must be boolean');
  const others = q.filter(x => !ids.includes(x.id)).slice(0, 5).map(x => x.id);
  r = await A('POST', '/api/games/arena/submit', mk(true, 70, others)); ok(r.status === 400, 'daily round only accepts today’s questions');
  // A answers correctly with confidence 90
  const correct = ids.map(id => ({ id, side: q.find(x => x.id === id).a, c: 90 }));
  r = await A('POST', '/api/games/arena/submit', { answers: correct });
  ok(r.status === 200 && Math.abs(r.body.brier - 0.01) < 1e-9 && r.body.score === 990 && r.body.rows.every(x => x.correct && x.why), 'daily submit scores Brier 0.01 -> 990 with explanations');
  ok(r.body.leaderboard.some(x => x.username === ua && x.me && x.rank >= 1), 'leaderboard contains me');
  r = await A('POST', '/api/games/arena/submit', { answers: correct }); ok(r.status === 409 && r.body.score === 990, 'only one daily play per day');
  r = await A('GET', '/api/games/arena/round'); ok(r.body.played === true && r.body.score === 990 && !r.body.questions, 'round endpoint reports already played');
  // B overconfident and wrong
  const wrong = ids.map(id => ({ id, side: !q.find(x => x.id === id).a, c: 99 }));
  r = await B('POST', '/api/games/arena/submit', { answers: wrong }); ok(r.status === 200 && r.body.score < 100, 'overconfident and wrong scores near zero (' + r.body.score + ')');
  r = await B('GET', '/api/games/arena/leaderboard'); const ia = r.body.items.findIndex(x => x.username === ua), ib = r.body.items.findIndex(x => x.username === ub);
  ok(ia >= 0 && ib >= 0 && ia < ib && r.body.items[ia].brier === 0.01, 'leaderboard ranks the better-calibrated player first');
  // practice never touches the board
  r = await B('GET', '/api/games/arena/round?mode=practice'); const pids = r.body.questions.map(x => x.id);
  ok(r.body.mode === 'practice' && pids.length === 5, 'practice round available any time');
  r = await B('POST', '/api/games/arena/submit', { mode: 'practice', answers: pids.map(id => ({ id, side: true, c: 70 })) }); ok(r.status === 200 && r.body.mode === 'practice' && !r.body.leaderboard, 'practice scores but is not ranked');
  r = await B('GET', '/api/games/arena/leaderboard'); ok(r.body.items.filter(x => x.username === ub).length === 1, 'practice did not add a leaderboard row');
  // royale
  r = await A('POST', '/api/games/royale/score', { placement: 0, kills: 1, seconds: 10 }); ok(r.status === 400, 'royale: invalid placement rejected');
  r = await A('POST', '/api/games/royale/score', { placement: 3, kills: 25, seconds: 10 }); ok(r.status === 400, 'royale: impossible kills rejected');
  r = await A('POST', '/api/games/royale/score', { placement: 1, kills: 4, seconds: 150 }); ok(r.status === 200 && r.body.score === 20 * 50 + 400 + 500 && r.body.best === r.body.score, 'royale: win with 4 kills = 1900');
  r = await A('POST', '/api/games/royale/score', { placement: 5, kills: 1, seconds: 60 }); ok(r.status === 429, 'royale: scores are rate-limited');
  r = await B('POST', '/api/games/royale/score', { placement: 12, kills: 0, seconds: 40 }); ok(r.status === 200 && r.body.score === 450, 'royale: placement 12, no kills = 450');
  r = await B('GET', '/api/games/royale/leaderboard'); const ra = r.body.items.findIndex(x => x.username === ua), rb = r.body.items.findIndex(x => x.username === ub); ok(ra >= 0 && rb > ra && r.body.items[ra].score === 1900 && r.body.items[rb].score === 450 && r.body.items.every((x, k, a) => !k || a[k - 1].score >= x.score), 'royale leaderboard ordered by score');
  r = await A('GET', '/api/games/summary'); ok(r.body.arena.played && r.body.arena.score === 990 && r.body.royale.best === 1900 && r.body.royale.plays === 1, 'summary reflects both games');
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
