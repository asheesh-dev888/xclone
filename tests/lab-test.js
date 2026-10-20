// AI Lab + Sharpness test: static /lab page (clean, self-contained), sharpness allowlist and temperature mapping (mock Groq). node tests/lab-test.js
const fs = require('fs'), path = require('path');
const { startMockGroq, startApp } = require('./ai-server');
const ai = require('../ai');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
const uname = (p) => p + Math.random().toString(36).slice(2, 8);
(async () => {
  // unit: allowlist + mapping
  ok(ai.parseBody({ action: 'explain' }).sharpness === 'natural', 'sharpness defaults to natural');
  ok(ai.parseBody({ action: 'explain', sharpness: 'sharp' }).sharpness === 'sharp', 'sharp accepted');
  for (const bad of ['hot', 'SHARP', '__proto__', 'constructor', 2, true]) ok(!!ai.parseBody({ action: 'explain', sharpness: bad }).error, 'rejected sharpness ' + JSON.stringify(bad));
  ok(ai.tempFor('natural') === 0.5 && ai.tempFor('sharp') === 0.455, 'natural = T 0.5, sharp = 0.5 × 0.91 = 0.455');
  // static files are self-contained: no external scripts, trackers or secrets
  const pub = path.join(__dirname, '..', 'public');
  const files = ['lab.html', 'lab/core.js', 'lab/lab.js', 'lab/tagger.js', 'lab/back.js'].map(f => [f, fs.readFileSync(path.join(pub, f), 'utf8')]);
  for (const [f, s] of files) ok(!/https?:\/\//i.test(s.replace(/http:\/\/www\.w3\.org[^"']*/g, '')) && !/\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|eval|importScripts)\s*\(|document\.cookie|localStorage/.test(s) && !/gtag|analytics|api[_-]?key|secret|token/i.test(s), f + ' has no network calls, trackers or secrets');
  // Trit Bot: self-contained page (model + engine inline), ternary engine answers in English/Hinglish/Hindi
  const tb = fs.readFileSync(path.join(pub, 'lab/tritbot.html'), 'utf8');
  ok(!/https?:\/\//i.test(tb) && !/\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|eval|importScripts)\s*\(|document\.cookie|localStorage|<script[^>]+src=/.test(tb) && !/api[_-]?key|secret|token/i.test(tb), 'tritbot.html has no network calls, external scripts or secrets');
  const TBm = JSON.parse(tb.match(/const MODEL=(\{.*?\});<\/script>/s)[1]);
  const TB = new Function('module', tb.match(/\/\*ENGINE\*\/([\s\S]*?)\/\*END\*\//)[1] + '\nreturn TB;')(undefined);
  const net = TB.load(TBm), top = (q) => { const p = net.infer(q).probs; return TBm.intents[p.indexOf(Math.max(...p))]; };
  ok(top('ek joke sunao') === 'joke' && top('hello') === 'greeting' && top('कहानी सुनाओ') === 'story', 'Trit Bot ternary engine: joke / greeting / Hindi story intents');
  ok(net.zeros > 0 && net.total === TBm.NB * TBm.H + TBm.H * TBm.C, 'Trit Bot weights unpack to ternary (' + (100 * net.zeros / net.total).toFixed(0) + '% zeros)');
  // S-Bot: self-contained page, weights only {0,1} plus sparse ∞ collapse links, base-3 softmax, bilingual S-framework intents
  const sb = fs.readFileSync(path.join(pub, 'lab/sbot.html'), 'utf8');
  ok(!/https?:\/\//i.test(sb) && !/\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|eval|importScripts)\s*\(|document\.cookie|localStorage|<script[^>]+src=/.test(sb) && !/api[_-]?key|secret|token/i.test(sb), 'sbot.html has no network calls, external scripts or secrets');
  ok(!/akhil|ranjan|rajan/i.test(sb + fs.readFileSync(path.join(pub, 'lab.html'), 'utf8')), 'S-Bot and Lab pages carry no personal names');
  const SBm = JSON.parse(sb.match(/const MODEL=(\{.*?\});<\/script>/s)[1]);
  if (typeof atob === 'undefined') global.atob = (x) => Buffer.from(x, 'base64').toString('binary');
  const SBe = new Function(sb.match(/\/\*SENGINE\*\/([\s\S]*?)\/\*SEND\*\//)[1] + '\nreturn SB;')();
  const sn = SBe.load(SBm), si = (q) => sn.infer(q);
  ok(si('what is S').intent === 's_unity' && si('S kya hai').intent === 's_unity', "'what is S' and 'S kya hai' → Sacred Unity");
  ok(si('why is 3S = 3').intent === 's_collapse' && si('what is S divided by S').intent === 's_singularity' && si('black hole information').intent === 's_physics' && si('hello').intent === 'greeting' && si('joke sunao').intent === 'joke', 'collapse / singularity / physics / greeting / joke intents');
  const c = si('what is the collapse rule'); ok(c.collapsed && c.state === '∞' && c.intent === 's_collapse', '∞ keyword collapses the decision outright (k·S = k)');
  const gb = si('asdf qwzx'); ok(gb.intent === 'unknown' && gb.state === '0', 'gibberish → S = 0 void');
  ok(si('hello').state === '1' && !si('hello').collapsed, 'ordinary answer → S = 1 unity');
  const pp = SBe.p3([1, 0]); ok(Math.abs(pp[0] - 0.75) < 1e-9, 'base-3 softmax: 3^1/(3^1+3^0) = 0.75');
  ok(sn.zeros > 0 && sn.total === SBm.nets.length * (SBm.NB * SBm.H + 2 * SBm.H * SBm.C) && Object.keys(SBm.INF).length <= 20, 'S-Bot weights are 0/1 bits (' + (100 * sn.zeros / sn.total).toFixed(0) + '% void) with ' + Object.keys(SBm.INF).length + ' sparse ∞ links');
  ok(Object.values(SBm.replies).every(r => r.en && r.hi) && ['s_maths', 's_physics', 's_mind'].every(k => /speculative/i.test(SBm.replies[k].en)), 'every intent has English + Hinglish replies; maths/physics/mind flagged speculative');
  ok(SBm.stats.heldout_acc >= 0.85 && SBm.stats.gibberish_rej >= 0.9, 'S-Bot held-out ' + (100 * SBm.stats.heldout_acc).toFixed(1) + '%, gibberish rejection ' + (100 * SBm.stats.gibberish_rej).toFixed(0) + '%');
  // tagger model
  global.window = {}; global.document = { getElementById: () => null };
  const g = {}; new Function('window', 'document', files[1][1].replace('if(typeof module', 'if(false&&typeof module') + '\n' + files[3][1] + '\nreturn window;')(g, global.document);
  const t = g.zuzuTagger;
  ok(t && t.acc >= 0.9 && t.tag('bahut accha laga').label === 'pos' && t.tag('bahut bura').label === 'neg' && t.tag('kal office jaana hai').label === 'neu' && t.tag('') === null, 'ternary tagger trains in-page and tags pos/neg/neu');
  ok(t.zeros > 0 && t.n === 768, 'tagger weights are ternary with zeros (' + t.zeros + '/' + t.n + ')');

  const mock = await startMockGroq();
  const app = await startApp({ port: 4243, ai: { baseUrl: mock.url } });
  try {
    const B = app.url; let r = await fetch(B + '/lab'); const html = await r.text();
    ok(r.status === 200 && /AI Lab · ZuZu/.test(html) && /id="lab-back"/.test(html) && !/<script[^>]+src="https?:/.test(html), '/lab serves the static Lab page with a ZuZu header and back link');
    ok((await fetch(B + '/lab/')).status === 200, '/lab/ works too');
    ok(/href="\/lab\/tritbot"/.test(html) && /Chat with Trit Bot/.test(html), 'Lab links to Trit Bot with a card');
    ok(/href="\/lab\/sbot"/.test(html) && /Chat with S-Bot/.test(html), 'Lab links to S-Bot with a card');
    r = await fetch(B + '/lab/sbot'); const sbh = await r.text(); ok(r.status === 200 && /S-Bot · ZuZu AI Lab/.test(sbh) && /id="sb-back" aria-label="Back to the AI Lab"/.test(sbh) && /href="\/lab"/.test(sbh), '/lab/sbot serves S-Bot with a ZuZu header and back link');
    ok((await fetch(B + '/lab/sbot/')).status === 200, '/lab/sbot/ works too');
    r = await fetch(B + '/lab/tritbot'); const tbh = await r.text(); ok(r.status === 200 && /Trit Bot · ZuZu AI Lab/.test(tbh) && /id="tb-back"/.test(tbh), '/lab/tritbot serves Trit Bot with a ZuZu header and back link');
    for (const f of ['core.js', 'lab.js', 'tagger.js']) { r = await fetch(B + '/lab/' + f); ok(r.status === 200 && /javascript/.test(r.headers.get('content-type')), '/lab/' + f + ' served as JS'); }
    r = await fetch(B + '/games'); ok(/<div id="app"|app\.js/.test(await r.text()), 'SPA routes still get the app shell');
    const sw = await (await fetch(B + '/sw.js')).text(); ok(/zuzu-v20/.test(sw) && /lab/.test(sw), 'sw v20 and the Lab never replaces the cached app shell');
    // Sharpness over the wire
    let cookie = ''; const call = async (m, p, body) => { const h = { 'content-type': 'application/json' }; if (cookie) h.cookie = cookie; const res = await fetch(B + p, { method: m, headers: h, body: body && JSON.stringify(body) }); const sc = res.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0]; return res; };
    await call('POST', '/api/signup', { username: uname('lab_'), password: 'secret123' });
    const post = await (await call('POST', '/api/posts', { text: 'Base three versus base e, kaun jeetega?' })).json();
    const id = post.post.id;
    const temps = async (sh) => { const n = mock.calls.length; const res = await call('POST', '/api/ai/post/' + id, { question: 'What does this mean? ' + Math.random(), ...(sh === undefined ? {} : { sharpness: sh }) }); await res.text(); const c = mock.calls.slice(n).find(x => x.url === '/chat/completions' && x.body.stream); return { status: res.status, temp: c && c.body.temperature }; };
    let x = await temps(undefined); ok(x.status === 200 && x.temp === 0.5, 'no sharpness: Groq temperature 0.5');
    x = await temps('natural'); ok(x.status === 200 && x.temp === 0.5, 'natural (base-e): temperature 0.5');
    x = await temps('sharp'); ok(x.status === 200 && x.temp === 0.455, 'sharp (base-3): temperature 0.455');
    x = await temps('scorching'); ok(x.status === 400 && x.temp === undefined, 'unknown sharpness: 400 and Groq is not called');
    // cache key separates sharpness for cacheable actions
    const n0 = mock.calls.length;
    for (const sh of ['natural', 'sharp']) { const res = await call('POST', '/api/ai/post/' + id, { action: 'explain', sharpness: sh }); await res.text(); }
    ok(mock.calls.slice(n0).filter(c => c.body.stream).map(c => c.body.temperature).join() === '0.5,0.455', 'cached answers are kept per sharpness');
  } finally { app.child.kill(); mock.srv.close(); }
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
