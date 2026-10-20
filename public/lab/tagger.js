// Tiny ternary sentiment tagger: hashed bag-of-words -> 3 classes, weights in {-1,0,+1} x per-class-row absmean scale.
// Trained in the browser with latent float weights + straight-through estimator (quantM from /lab/core.js). Lab only.
(function () {
  const D = 256, LABELS = ['neg', 'neu', 'pos'], NAMES = { neg: '😟 negative', neu: '😐 neutral', pos: '😊 positive' };
  const DATA = [
    ['I love this, amazing work', 2], ['this is so good', 2], ['great idea yaar', 2], ['bahut accha laga', 2], ['bahut badhiya', 2], ['mast hai', 2], ['ekdum zabardast', 2],
    ['so happy today', 2], ['aaj bahut khush hoon', 2], ['thank you so much', 2], ['shukriya dost', 2], ['beautiful photo', 2], ['congratulations on the launch', 2], ['mubarak ho', 2],
    ['best day ever', 2], ['wonderful news', 2], ['proud of you', 2], ['ye toh kamaal hai', 2], ['nice work team', 2], ['I really enjoyed it', 2], ['pyaara post', 2], ['awesome', 2],
    ['I hate this', 0], ['this is terrible', 0], ['so bad', 0], ['bahut bura laga', 0], ['bekaar hai', 0], ['bakwaas', 0], ['very sad today', 0], ['main udaas hoon', 0],
    ['worst experience', 0], ['I am angry', 0], ['gussa aa raha hai', 0], ['this is boring', 0], ['not good at all', 0], ['accha nahi tha', 0], ['disappointed again', 0],
    ['traffic is horrible', 0], ['dukh hua sunke', 0], ['I feel awful', 0], ['ye galat hai', 0], ['stupid decision', 0], ['so tired and upset', 0], ['ugly', 0],
    ['the meeting is at 5', 1], ['kal office jaana hai', 1], ['I am at home', 1], ['train 10 baje hai', 1], ['posting from Pune', 1], ['what time is it', 1], ['kya scene hai', 1],
    ['the report is attached', 1], ['lunch at 1 pm', 1], ['aaj Monday hai', 1], ['reading a book', 1], ['new phone liya', 1], ['weather update for Delhi', 1], ['chai pi raha hoon', 1],
    ['bus late hai', 1], ['link in bio', 1], ['class starts tomorrow', 1], ['main ghar pe hoon', 1], ['update: version 2 is out', 1], ['kaun aa raha hai', 1],
  ];
  const NEG = new Set(['not', 'no', 'never', 'nahi', 'na', 'mat']);
  const tok = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, ' ').split(/\s+/).filter(Boolean);
  const hash = (w) => { let h = 2166136261; for (let i = 0; i < w.length; i++) { h ^= w.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % D; };
  function feats(s) {
    const t = tok(s), x = new Array(D).fill(0);
    t.forEach((w, i) => { x[hash(w)] += 1; if (i && NEG.has(t[i - 1])) x[hash('¬' + w)] += 1; if (i < t.length - 1 && NEG.has(t[i + 1])) x[hash(w + '¬')] += 1; });
    const n = Math.sqrt(t.length || 1); return { x: x.map(v => v / n), known: t.length };
  }
  const X = DATA.map(d => feats(d[0]).x), Y = DATA.map(d => d[1]);
  const W = [0, 1, 2].map(() => new Array(D).fill(0).map((_, j) => ((j * 7919 + 13) % 97 / 97 - 0.5) * 0.02)), b = [0, 0, 0];
  const mW = W.map(r => r.map(() => 0)), vW = W.map(r => r.map(() => 0)); let step = 0;
  const softmax = (z) => { const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), s = e.reduce((a, c) => a + c, 0); return e.map(v => v / s); };
  const qW = () => W.map(r => quantM([r]).W[0]); // per-class absmean ternary
  const logits = (Q, x) => [0, 1, 2].map(k => { let s = b[k]; for (let j = 0; j < D; j++) if (x[j]) s += Q[k][j] * x[j]; return s; });
  function epoch() {
    const Q = qW(), g = W.map(r => r.map(() => 0)), gb = [0, 0, 0];
    X.forEach((x, i) => { const p = softmax(logits(Q, x)); for (let k = 0; k < 3; k++) { const d = p[k] - (Y[i] === k ? 1 : 0); gb[k] += d; for (let j = 0; j < D; j++) if (x[j]) g[k][j] += d * x[j]; } });
    step++; const lr = 0.05, n = X.length;
    for (let k = 0; k < 3; k++) { b[k] -= lr * gb[k] / n; for (let j = 0; j < D; j++) { const gi = g[k][j] / n + 1e-4 * W[k][j]; mW[k][j] = 0.9 * mW[k][j] + 0.1 * gi; vW[k][j] = 0.999 * vW[k][j] + 0.001 * gi * gi; W[k][j] -= lr * (mW[k][j] / (1 - 0.9 ** step)) / (Math.sqrt(vW[k][j] / (1 - 0.999 ** step)) + 1e-8); } }
  }
  for (let e = 0; e < 250; e++) epoch();
  const Q = qW();
  function tag(s) { const f = feats(s); if (!f.known) return null; const p = softmax(logits(Q, f.x)); let k = p.indexOf(Math.max(...p)); return { label: LABELS[k], p: p[k] }; }
  const acc = X.filter((x, i) => { const p = softmax(logits(Q, x)); return p.indexOf(Math.max(...p)) === Y[i]; }).length / X.length;
  const T = W.map(r => quantM([r]).T[0]).flat(), zeros = T.filter(v => v === 0).length, bits = T.length * Math.log2(3) + 3 * 32 + 3 * 32;
  window.zuzuTagger = { tag, acc, zeros, n: T.length };
  const $ = (id) => document.getElementById(id);
  if (!$('tg-in')) return;
  const show = () => { const r = tag($('tg-in').value), el = $('tg-badge'); if (!r) { el.className = 'badge-s'; el.textContent = '…'; return; } el.className = 'badge-s ' + r.label; el.textContent = NAMES[r.label] + ' · ' + Math.round(r.p * 100) + '%'; };
  $('tg-in').addEventListener('input', show);
  ['Aaj ka din bahut accha tha', 'Traffic ne mood kharab kar diya, bahut bura', 'Meeting kal 11 baje hai'].forEach(t => { const bt = document.createElement('button'); bt.className = 'ex'; bt.textContent = t; bt.onclick = () => { $('tg-in').value = t; show(); }; $('tg-ex').appendChild(bt); });
  $('tg-stats').textContent = `${T.length} ternary weights (${(zeros / T.length * 100).toFixed(0)}% are zero) ≈ ${Math.ceil(bits / 8)} bytes including float biases and scales, vs ${T.length * 4 + 24} bytes in float32. Training accuracy ${(acc * 100).toFixed(0)}% on ${X.length} example lines.`;
})();
