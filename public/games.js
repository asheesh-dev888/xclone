// ZuZu Games (lazy loaded): lobby, Prediction Arena (Brier-scored), ZuZu Royale (canvas battle royale).
// Everything is drawn in code (no image assets). Shares Momo's sound toggle via __zg.sfx.
(function () {
  const Z = window.__zg, esc = Z.esc, $ = (s, r = document) => r.querySelector(s);
  const root = () => $('#games-root');
  const rankMedal = (r) => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : '#' + r;
  const boardHTML = (items, fmt) => items.length ? `<ol class="gm-board">${items.map(x => `<li class="${x.me ? 'me' : ''}"><span class="rk">${rankMedal(x.rank)}</span>${Z.avatar({ name: x.name, avatar: x.avatar, username: x.username }, 'sm')}<a class="nm" href="/u/${esc(x.username)}" data-link>${esc(x.name)}<small> @${esc(x.username)}</small></a><b>${fmt(x)}</b></li>`).join('')}</ol>` : `<p class="muted">Nobody yet today. Be the first! 🐒</p>`;
  const head = (title, back = '/games') => `<div class="header"><div class="header-row"><a class="back" href="${back}" data-link aria-label="Back">←</a><h1>${title}</h1></div></div>`;
  const setPage = (title, html, back) => { const r = document.querySelector('.main .header'); if (r) r.outerHTML = head(title, back); root().innerHTML = html; };

  // ---------- lobby ----------
  async function lobby() {
    setPage('Games', Z.loader());
    const hdr = document.querySelector('.main .header'); if (hdr) hdr.outerHTML = `<div class="header"><div class="header-row"><h1>Games</h1></div></div>`;
    let s; try { s = await Z.api('GET', '/api/games/summary'); } catch (e) { root().innerHTML = `<div class="empty"><h3>${esc(e.message)}</h3></div>`; return; }
    let top = []; try { top = (await Z.api('GET', '/api/games/arena/leaderboard')).items.slice(0, 3); } catch {}
    root().innerHTML = `<div class="gm-lobby">
      <p class="gm-note">Games on ZuZu reward <b>calibration and connection</b>, not endless scrolling. Quick rounds, no streak-guilt. 🐒</p>
      <a class="gm-card arena" href="/games/arena" data-link data-testid="card-arena"><div class="gm-art">🔮</div><div class="gm-body"><h2>Prediction Arena</h2>
        <p>Will it happen? Pick Yes or No and stake how sure you are. Scored with the Brier rule, the same maths forecasters use.</p>
        <div class="gm-meta">${s.arena.played ? `✅ Today’s round done: <b>${s.arena.score}</b>/1000` : '🆕 Today’s round is ready'} · ${s.arena.players} played today</div></div></a>
      <a class="gm-card royale" href="/games/royale" data-link data-testid="card-royale"><div class="gm-art">🍌</div><div class="gm-body"><h2>ZuZu Royale</h2>
        <p>You vs 19 Momo bots with banana blasters. Grab loot, stay in the shrinking zone, be the last monkey standing. No gore, just bananas.</p>
        <div class="gm-meta">${s.royale.plays ? `Best score <b>${s.royale.best}</b> · ${s.royale.plays} runs` : 'Free to play · works on phones'}</div></div></a>
      <section class="gm-sec"><h3>Today’s Arena top 3</h3>${boardHTML(top, x => x.score)}</section>
      <p class="muted small">Your calibration lives on your profile. <a class="link" href="/u/${esc(Z.meName)}" data-link>See it →</a></p></div>`;
  }

  // ---------- Prediction Arena ----------
  const pts = (c, right) => Math.round(100 * (1 - (right ? (1 - c / 100) ** 2 : (c / 100) ** 2)));
  async function arena(opts = {}) {
    setPage('Prediction Arena', Z.loader());
    let r; try { r = await Z.api('GET', '/api/games/arena/round' + (opts.practice ? '?mode=practice' : '')); } catch (e) { root().innerHTML = `<div class="empty"><h3>${esc(e.message)}</h3></div>`; return; }
    if (r.played) return arenaResults({ mode: 'daily', score: r.score, ...r.result }, null);
    const qs = r.questions, answers = []; let i = 0, side = null, c = 70;
    const draw = () => {
      const q = qs[i];
      root().innerHTML = `<div class="gm-arena" data-testid="arena-q">
        <div class="gm-prog">${qs.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'cur' : ''}"></i>`).join('')}</div>
        <div class="gm-mode">${r.mode === 'practice' ? '🧪 Practice round (not ranked)' : '📅 Today’s round'} · Question ${i + 1} of ${qs.length}</div>
        <div class="gm-q">${esc(q.t)}</div>
        <div class="gm-sides"><button class="gm-side yes ${side === true ? 'on' : ''}" data-side="1">✅ Haan <small>True</small></button><button class="gm-side no ${side === false ? 'on' : ''}" data-side="0">❌ Nahi <small>False</small></button></div>
        <label class="gm-conf">How sure are you? <b id="gm-c">${c}%</b><input id="gm-slider" type="range" min="50" max="99" value="${c}" aria-label="Confidence percent"></label>
        <div class="gm-stakes" id="gm-stakes"></div>
        <button class="btn btn-primary gm-next" id="gm-next" ${side === null ? 'disabled' : ''}>${i === qs.length - 1 ? 'Lock it & see score 🎯' : 'Lock it 🔒'}</button></div>`;
      const stakes = () => { $('#gm-c').textContent = c + '%'; $('#gm-stakes').innerHTML = `Right: <b class="g">+${pts(c, true)}</b> · Wrong: <b class="r">${pts(c, false)}</b> pts`; };
      stakes();
      $('#gm-slider').oninput = (e) => { c = +e.target.value; stakes(); };
      root().querySelectorAll('.gm-side').forEach(b => b.onclick = () => { side = b.dataset.side === '1'; root().querySelectorAll('.gm-side').forEach(x => x.classList.toggle('on', x === b)); $('#gm-next').disabled = false; Z.sfx('tick'); });
      $('#gm-next').onclick = async () => {
        answers.push({ id: q.id, side, c }); side = null; i++;
        if (i < qs.length) { Z.sfx('tick'); return draw(); }
        $('#gm-next').disabled = true;
        try { const res = await Z.api('POST', '/api/games/arena/submit', { mode: r.mode, answers }); Z.sfx('win'); arenaResults(res, r.mode); }
        catch (e) { if (e.status === 409) { Z.toast(e.message); return arena(); } Z.toast(e.message); $('#gm-next').disabled = false; i--; answers.pop(); }
      };
    };
    draw();
  }
  function arenaResults(res, mode) {
    const rows = res.rows || [], n = rows.length || 1, right = rows.filter(x => x.correct).length;
    const acc = Math.round(100 * (res.accuracy != null ? res.accuracy : right / n)), conf = Math.round(res.avgConfidence || 0);
    const verdict = conf > acc + 8 ? 'Thoda overconfident. Momo says: pehle sochna, phir bolna 🐒' : conf < acc - 8 ? 'Underconfident! Apne pe bharosa rakho 💪' : 'Well calibrated! Momo ne tali bajayi 👏';
    const shareText = `I scored ${res.score}/1000 (Brier ${res.brier}) in ZuZu Prediction Arena 🔮🐒 Try today’s round:`;
    root().innerHTML = `<div class="gm-results" data-testid="arena-results">
      <div class="gm-score"><span>${res.score}</span><small>/ 1000</small></div>
      <div class="gm-sub">Brier score <b>${res.brier}</b> <span class="muted">(lower is better; 0.25 = coin flip)</span></div>
      <div class="gm-verdict">You were ~${conf}% sure on average and right ${acc}% of the time.<br>${verdict}</div>
      <div class="gm-rows">${rows.map(x => `<div class="gm-row ${x.correct ? 'ok' : 'bad'}"><div>${x.correct ? '✅' : '❌'} ${esc(x.t)}</div><small>You said <b>${x.side ? 'Haan' : 'Nahi'}</b> at ${x.c}% · actually <b>${x.outcome ? 'True' : 'False'}</b> · ${x.points} pts. ${esc(x.why || '')}</small></div>`).join('')}</div>
      <div class="gm-actions"><a class="btn btn-primary" href="/u/${esc(Z.meName)}" data-link>See my calibration 🎯</a><button class="btn btn-outline" id="gm-practice">Practice round 🧪</button><button class="btn btn-outline" id="gm-share">Share</button></div>
      ${mode === 'practice' ? '<p class="muted small">Practice rounds are not ranked.</p>' : ''}
      <section class="gm-sec"><h3>Today’s leaderboard</h3><div id="gm-lb">${Z.loader()}</div></section></div>`;
    $('#gm-practice').onclick = () => arena({ practice: true });
    $('#gm-share').onclick = () => share(shareText, location.origin + '/games/arena');
    Z.api('GET', '/api/games/arena/leaderboard').then(l => { const el = $('#gm-lb'); if (el) el.innerHTML = boardHTML(l.items, x => x.score); }).catch(() => {});
  }
  async function share(text, url) {
    try { if (navigator.share) await navigator.share({ text, url }); else { await navigator.clipboard.writeText(text + ' ' + url); Z.toast('Copied to clipboard'); } } catch { Z.toast(text + ' ' + url); }
  }

  // ---------- ZuZu Royale ----------
  const NAMES = ['Kela Kid', 'Bandar Bob', 'Gabbar', 'Chai Monk', 'Jugaadu', 'Masala', 'Dhoom', 'Pinky', 'Banana Bhai', 'Tiger', 'Lassi', 'Chintu', 'Rocket', 'Bunty', 'Desi Don', 'Mango', 'Tadka', 'Zoomer', 'Jalebi'];
  const FUR = ['#8b5a2b', '#a06a35', '#6f4518', '#b07a45', '#7a4f2a', '#9c6b3c'];
  const HATS = ['#ff4d6d', '#4dabf7', '#51cf66', '#ffd43b', '#b197fc', '#ff922b', '#22b8cf', '#f06595'];
  const WORLD = 2600, VIEW = 620, PR = 18;
  const PHASES = [[18, 22, 820], [14, 18, 540], [12, 16, 320], [10, 14, 160], [8, 12, 40]]; // wait s, shrink s, end radius
  function royale() {
    setPage('ZuZu Royale', `<div class="gm-menu" data-testid="royale-menu"><div class="gm-art big">🍌🐒</div><h2>ZuZu Royale</h2>
      <p>20 monkeys, one banana blaster each. Grab loot (🍎 heal · 🛡️ shield · 🍌 ammo · ⚡ boost), stay inside the shrinking zone and be the last one standing.</p>
      <p class="muted small">Move: <b>WASD / arrows</b> or the left joystick · Aim: <b>mouse</b> (touch auto-aims) · Fire: <b>click / Space</b> or the 🍌 button. Sounds follow Momo’s sound toggle.</p>
      <button class="btn btn-primary btn-big" id="rr-play" data-testid="royale-play">Play now 🍌</button>
      <section class="gm-sec"><h3>Today’s top monkeys</h3><div id="rr-lb">${Z.loader()}</div></section></div>`, '/games');
    Z.api('GET', '/api/games/royale/leaderboard').then(l => { const el = $('#rr-lb'); if (el) el.innerHTML = boardHTML(l.items, x => x.score); }).catch(() => {});
    $('#rr-play').onclick = startGame;
  }
  function startGame() {
    const touch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
    const ov = document.createElement('div'); ov.id = 'royale-root'; ov.setAttribute('data-testid', 'royale');
    ov.innerHTML = `<canvas id="rr-cv"></canvas>
      <div class="rr-hud"><div class="rr-top"><span id="rr-alive">🐒 20</span><span id="rr-kills">🍌 0</span><span id="rr-zone">Zone safe</span><button class="rr-pause" id="rr-pause" aria-label="Pause">⏸</button></div>
      <canvas id="rr-mini" width="96" height="96"></canvas><div class="rr-feed" id="rr-feed"></div>
      <div class="rr-bars"><div class="rr-bar hp"><i id="rr-hp"></i></div><div class="rr-bar sh"><i id="rr-sh"></i></div><span id="rr-ammo">🍌 40</span></div></div>
      ${touch ? '<div class="rr-stick" id="rr-stick"><i></i></div><button class="rr-fire" id="rr-fire" aria-label="Fire">🍌</button>' : ''}
      <div class="rr-panel" id="rr-panel" hidden></div>`;
    document.body.appendChild(ov); document.body.classList.add('royale-on');
    const cv = $('#rr-cv'), ctx = cv.getContext('2d'), mini = $('#rr-mini').getContext('2d');
    let DPR = Math.min(window.devicePixelRatio || 1, 1.5), cw = 0, ch = 0, zoom = 1;
    const resize = () => { cw = innerWidth; ch = innerHeight; cv.width = Math.round(cw * DPR); cv.height = Math.round(ch * DPR); cv.style.width = cw + 'px'; cv.style.height = ch + 'px'; zoom = (Math.min(cw, ch) / VIEW) * DPR * (touch ? 1.05 : 1); };
    resize(); addEventListener('resize', resize);
    // ---- world ----
    const rnd = (a, b) => a + Math.random() * (b - a), dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const zc = { x: rnd(WORLD * 0.38, WORLD * 0.62), y: rnd(WORLD * 0.38, WORLD * 0.62) };
    const rocks = []; for (let k = 0; k < 34; k++) { const r = rnd(30, 70); rocks.push({ x: rnd(120, WORLD - 120), y: rnd(120, WORLD - 120), r }); }
    const ents = [], bullets = [], loot = [], puffs = [], feed = [];
    const mk = (i, isP) => { let x, y, tries = 0; do { const a = Math.random() * 6.283, d = rnd(300, 1150); x = zc.x + Math.cos(a) * d; y = zc.y + Math.sin(a) * d; tries++; } while (tries < 20 && (x < 80 || y < 80 || x > WORLD - 80 || y > WORLD - 80 || rocks.some(r => Math.hypot(r.x - x, r.y - y) < r.r + 40)));
      return { id: i, name: isP ? 'You' : NAMES[i - 1] || 'Bot' + i, isP, x, y, vx: 0, vy: 0, hp: 100, sh: 0, ammo: isP ? 40 : 999, ang: 0, cd: 0, alive: true, kills: 0, boost: 0, fur: FUR[i % FUR.length], hat: HATS[i % HATS.length], tgt: null, think: Math.random() * 0.3, wp: { x: zc.x, y: zc.y }, strafe: Math.random() < 0.5 ? 1 : -1, hurt: 0 }; };
    for (let i = 0; i < 20; i++) ents.push(mk(i, i === 0));
    const P = ents[0];
    const LOOT = [['heal', '🍎', 0.3], ['shield', '🛡️', 0.2], ['ammo', '🍌', 0.35], ['boost', '⚡', 0.15]];
    const spawnLoot = () => { const roll = Math.random(); let a = 0, t = LOOT[0]; for (const l of LOOT) { a += l[2]; if (roll <= a) { t = l; break; } } const an = Math.random() * 6.283, d = Math.sqrt(Math.random()) * 1150; loot.push({ x: Math.min(WORLD - 60, Math.max(60, zc.x + Math.cos(an) * d)), y: Math.min(WORLD - 60, Math.max(60, zc.y + Math.sin(an) * d)), type: t[0], e: t[1] }); };
    for (let k = 0; k < 70; k++) spawnLoot();
    // ---- sprites (prerendered once) ----
    const spr = (e) => { if (e.sprite) return e.sprite; const s = document.createElement('canvas'); s.width = s.height = 64; const g = s.getContext('2d');
      g.fillStyle = e.fur; [[10, 14], [54, 14]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); g.fillStyle = '#f0c9a0'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); g.fillStyle = e.fur; });
      g.beginPath(); g.arc(32, 34, 26, 0, 7); g.fill(); g.fillStyle = '#f0c9a0'; g.beginPath(); g.ellipse(32, 40, 17, 15, 0, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(24, 30, 6, 0, 7); g.arc(40, 30, 6, 0, 7); g.fill(); g.fillStyle = '#222'; g.beginPath(); g.arc(25, 31, 3, 0, 7); g.arc(41, 31, 3, 0, 7); g.fill();
      g.fillStyle = '#7a3b1d'; g.beginPath(); g.arc(32, 44, 3.5, 0, 7); g.fill(); g.strokeStyle = '#7a3b1d'; g.lineWidth = 2; g.beginPath(); g.arc(32, 46, 7, 0.2, 2.9); g.stroke();
      g.fillStyle = e.hat; g.fillRect(8, 10, 48, 8); g.beginPath(); g.arc(32, 10, 14, Math.PI, 0); g.fill();
      return (e.sprite = s); };
    const emo = {}; const emoSpr = (c) => emo[c] || (emo[c] = (() => { const s = document.createElement('canvas'); s.width = s.height = 44; const g = s.getContext('2d'); g.font = '32px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c, 22, 24); return s; })());
    const grass = (() => { const s = document.createElement('canvas'); s.width = s.height = 128; const g = s.getContext('2d'); g.fillStyle = '#3f8f4a'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#459a50'; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64); g.fillStyle = '#378243'; for (let k = 0; k < 18; k++) g.fillRect(Math.random() * 124, Math.random() * 124, 3, 7); return ctx.createPattern(s, 'repeat'); })();
    // ---- input ----
    const keys = {}; const mouse = { x: cw / 2, y: ch / 2, down: false }; const stick = { id: null, dx: 0, dy: 0, ox: 0, oy: 0 }; let fireHeld = false;
    const kd = (e) => { keys[e.code] = true; if (e.code === 'Space') e.preventDefault(); if (e.code === 'Escape') togglePause(); }, ku = (e) => { keys[e.code] = false; };
    addEventListener('keydown', kd); addEventListener('keyup', ku);
    cv.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { mouse.x = e.clientX; mouse.y = e.clientY; } });
    cv.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') { mouse.down = true; mouse.x = e.clientX; mouse.y = e.clientY; return; }
      if (stick.id == null && e.clientX < cw * 0.55) { stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stick.dx = stick.dy = 0; const s = $('#rr-stick'); if (s) { s.style.left = e.clientX - 55 + 'px'; s.style.top = e.clientY - 55 + 'px'; s.classList.add('on'); } cv.setPointerCapture(e.pointerId); }
    });
    cv.addEventListener('pointermove', (e) => { if (e.pointerId === stick.id) { let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy; const m = Math.hypot(dx, dy), mx = 55; if (m > mx) { dx = dx / m * mx; dy = dy / m * mx; } stick.dx = dx / mx; stick.dy = dy / mx; const k = $('#rr-stick i'); if (k) k.style.transform = `translate(${dx}px,${dy}px)`; } });
    const endStick = (e) => { if (e.pointerId === stick.id) { stick.id = null; stick.dx = stick.dy = 0; const s = $('#rr-stick'); if (s) s.classList.remove('on'); const k = $('#rr-stick i'); if (k) k.style.transform = ''; } if (e.pointerType === 'mouse') mouse.down = false; };
    cv.addEventListener('pointerup', endStick); cv.addEventListener('pointercancel', endStick);
    const fb = $('#rr-fire'); if (fb) { fb.addEventListener('pointerdown', (e) => { fireHeld = true; fb.setPointerCapture(e.pointerId); e.preventDefault(); }); const up = () => { fireHeld = false; }; fb.addEventListener('pointerup', up); fb.addEventListener('pointercancel', up); }
    ov.addEventListener('contextmenu', (e) => e.preventDefault());
    // ---- helpers ----
    let t = 0, over = false, paused = false, raf = 0, last = 0, acc = 0, nextHud = 0, shake = 0, zoneMsgAt = 0;
    const zone = { r: 1250, phase: -1, from: 1250, to: 1250, t0: 0, t1: 0, shrinking: false, nextAt: PHASES[0][0] };
    const alive = () => ents.reduce((n, e) => n + (e.alive ? 1 : 0), 0);
    const addFeed = (txt) => { feed.push({ txt, at: t }); if (feed.length > 4) feed.shift(); };
    const damage = (e, d, by) => {
      if (!e.alive || over || (e.isP && (t < 5 || e.god))) return;
      if (e.sh > 0) { const a = Math.min(e.sh, d); e.sh -= a; d -= a; }
      e.hp -= d; e.hurt = 0.18; if (e.isP) { Z.sfx('hit'); shake = 6; }
      if (e.hp <= 0) {
        e.alive = false; const place = alive() + 1; e.place = place; puffs.push({ x: e.x, y: e.y, t: 0 });
        if (by && by !== e) { by.kills++; addFeed(`${by.isP ? 'You' : by.name} 🍌 ${e.isP ? 'you' : e.name}`); } else addFeed(`${e.isP ? 'You were' : e.name + ' was'} caught outside the zone ☁️`);
        if (e.isP) finish(place, 1.1); else if (alive() === 1 && P.alive) { P.place = 1; finish(1, 1.0); }
      }
    };
    const fire = (e, ang) => { if (e.cd > 0 || !e.alive) return; if (e.isP) { if (e.ammo <= 0) return; e.ammo--; } e.cd = e.isP ? 0.26 : 0.6 + Math.random() * 0.25; bullets.push({ x: e.x + Math.cos(ang) * 24, y: e.y + Math.sin(ang) * 24, vx: Math.cos(ang) * 640, vy: Math.sin(ang) * 640, life: 0.8, by: e }); if (e.isP) Z.sfx('shoot'); };
    const inZone = (e, m = 0) => Math.hypot(e.x - zc.x, e.y - zc.y) < zone.r - m;
    const nearestEnemy = (e, maxD) => { let b = null, bd = maxD; for (const o of ents) { if (o === e || !o.alive) continue; const d = dist(e, o); if (d < bd) { bd = d; b = o; } } return b; };
    function move(e, dx, dy, sp, dt) { const m = Math.hypot(dx, dy); if (m > 0.01) { const k = Math.min(1, m); e.vx = dx / m * sp * k; e.vy = dy / m * sp * k; } else { e.vx *= 0.7; e.vy *= 0.7; }
      e.x += e.vx * dt; e.y += e.vy * dt; e.x = Math.max(PR, Math.min(WORLD - PR, e.x)); e.y = Math.max(PR, Math.min(WORLD - PR, e.y));
      for (const r of rocks) { const d = Math.hypot(e.x - r.x, e.y - r.y), mn = r.r + PR; if (d < mn && d > 0.01) { e.x = r.x + (e.x - r.x) / d * mn; e.y = r.y + (e.y - r.y) / d * mn; } } }
    function botThink(b) {
      const en = nearestEnemy(b, 460), lowHp = b.hp < 35;
      if (!inZone(b, 90)) { b.tgt = { x: zc.x + rnd(-80, 80), y: zc.y + rnd(-80, 80), mode: 'zone' }; b.en = null; return; }
      b.en = en;
      if (en && !lowHp) { b.tgt = null; b.mode = 'fight'; if (Math.random() < 0.3) b.strafe *= -1; return; }
      let best = null, bd = lowHp ? 600 : 420; for (const l of loot) { const d = Math.hypot(l.x - b.x, l.y - b.y); if (d < bd && (l.type !== 'heal' || b.hp < 90)) { bd = d; best = l; } }
      if (best) { b.tgt = { x: best.x, y: best.y, mode: 'loot' }; return; }
      if (!b.tgt || b.tgt.mode !== 'wander' || Math.hypot(b.tgt.x - b.x, b.tgt.y - b.y) < 60) b.tgt = { x: zc.x + rnd(-1, 1) * (zone.r - 150), y: zc.y + rnd(-1, 1) * (zone.r - 150), mode: 'wander' };
    }
    // ---- update ----
    function update(dt) {
      t += dt;
      // zone phases
      if (zone.phase + 1 < PHASES.length && t >= zone.nextAt && !zone.shrinking) { zone.phase++; zone.from = zone.r; zone.to = PHASES[zone.phase][2]; zone.t0 = t; zone.t1 = t + PHASES[zone.phase][1]; zone.shrinking = true; Z.sfx('zone'); addFeed('⚠️ The zone is shrinking!'); }
      if (zone.shrinking) { const k = Math.min(1, (t - zone.t0) / (zone.t1 - zone.t0)); zone.r = zone.from + (zone.to - zone.from) * k; if (k >= 1) { zone.shrinking = false; zone.nextAt = zone.phase + 1 < PHASES.length ? t + PHASES[zone.phase + 1][0] : 1e9; } }
      const zdps = 4 + Math.max(0, zone.phase) * 3.5;
      // player
      if (P.alive) {
        let dx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), dy = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
        if (stick.id != null) { dx = stick.dx; dy = stick.dy; }
        move(P, dx, dy, 235 * (P.boost > 0 ? 1.35 : 1), dt);
        let firing = keys.Space || mouse.down || fireHeld, ang = P.ang;
        if (touch) { const en = nearestEnemy(P, 560); if (en) ang = Math.atan2(en.y - P.y, en.x - P.x); else if (Math.hypot(dx, dy) > 0.2) ang = Math.atan2(dy, dx); }
        else ang = Math.atan2((mouse.y - ch / 2), (mouse.x - cw / 2));
        P.ang = ang; if (firing) fire(P, ang);
      }
      // bots
      for (const b of ents) {
        if (b.isP || !b.alive) continue;
        b.think -= dt; if (b.think <= 0) { b.think = 0.22 + Math.random() * 0.12; botThink(b); }
        let dx = 0, dy = 0;
        const en = b.en && b.en.alive ? b.en : null;
        if (en && b.tgt === null) { const d = dist(b, en), a = Math.atan2(en.y - b.y, en.x - b.x); b.ang = a; const want = d > 280 ? 1 : d < 170 ? -1 : 0; dx = Math.cos(a) * want + Math.cos(a + 1.57) * b.strafe * 0.6; dy = Math.sin(a) * want + Math.sin(a + 1.57) * b.strafe * 0.6; if (d < 480 && b.hp > 0) fire(b, a + rnd(-0.22, 0.22)); }
        else if (b.tgt) { dx = b.tgt.x - b.x; dy = b.tgt.y - b.y; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m; b.ang = Math.atan2(dy, dx); if (m < 40 && b.tgt.mode !== 'wander') b.tgt = null; }
        move(b, dx, dy, 190 * (b.boost > 0 ? 1.3 : 1), dt);
      }
      // common: cooldowns, zone damage, loot, separation
      for (const e of ents) {
        if (!e.alive) continue;
        e.cd -= dt; e.hurt -= dt; if (e.boost > 0) e.boost -= dt;
        if (!inZone(e)) damage(e, zdps * dt, null);
        if (!e.alive) continue;
        for (let k = loot.length - 1; k >= 0; k--) { const l = loot[k]; if (Math.abs(l.x - e.x) < 30 && Math.abs(l.y - e.y) < 30) {
          if (l.type === 'heal') { if (e.hp >= 100) continue; e.hp = Math.min(100, e.hp + 30); } else if (l.type === 'shield') e.sh = Math.min(50, e.sh + 40); else if (l.type === 'ammo') { if (e.isP) e.ammo = Math.min(99, e.ammo + 20); } else e.boost = 6;
          loot.splice(k, 1); if (e.isP) Z.sfx('pickup'); } }
      }
      for (let i = 0; i < ents.length; i++) { const a = ents[i]; if (!a.alive) continue; for (let j = i + 1; j < ents.length; j++) { const b = ents[j]; if (!b.alive) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d < PR * 2 && d > 0.01) { const p = (PR * 2 - d) / 2; a.x -= dx / d * p; a.y -= dy / d * p; b.x += dx / d * p; b.y += dy / d * p; } } }
      if (loot.length < 40 && Math.random() < dt * 0.6) spawnLoot();
      // bullets
      for (let k = bullets.length - 1; k >= 0; k--) {
        const b = bullets[k]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; let dead = b.life <= 0 || b.x < 0 || b.y < 0 || b.x > WORLD || b.y > WORLD;
        if (!dead) for (const r of rocks) if (Math.hypot(b.x - r.x, b.y - r.y) < r.r) { dead = true; break; }
        if (!dead) for (const e of ents) if (e.alive && e !== b.by && Math.abs(e.x - b.x) < PR + 4 && Math.abs(e.y - b.y) < PR + 4 && Math.hypot(e.x - b.x, e.y - b.y) < PR + 4) { damage(e, b.by && b.by.isP ? 14 : 11, b.by); puffs.push({ x: b.x, y: b.y, t: 0.55, s: 1 }); dead = true; break; }
        if (dead) bullets.splice(k, 1);
      }
      for (let k = puffs.length - 1; k >= 0; k--) { puffs[k].t += dt * 1.6; if (puffs[k].t > 1) puffs.splice(k, 1); }
      if (feed.length && t - feed[0].at > 4) feed.shift();
      shake *= 0.85;
    }
    // ---- render ----
    function render() {
      const camX = Math.max(cw / 2 / (zoom / DPR), Math.min(WORLD - cw / 2 / (zoom / DPR), P.x)), camY = Math.max(ch / 2 / (zoom / DPR), Math.min(WORLD - ch / 2 / (zoom / DPR), P.y));
      const sx = shake ? rnd(-shake, shake) : 0, sy = shake ? rnd(-shake, shake) : 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#1d3b24'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.setTransform(zoom, 0, 0, zoom, cv.width / 2 - camX * zoom + sx, cv.height / 2 - camY * zoom + sy);
      const vw = cv.width / zoom, vh = cv.height / zoom, x0 = camX - vw / 2 - 80, y0 = camY - vh / 2 - 80, x1 = camX + vw / 2 + 80, y1 = camY + vh / 2 + 80;
      ctx.fillStyle = grass; ctx.fillRect(0, 0, WORLD, WORLD);
      ctx.strokeStyle = '#143a1c'; ctx.lineWidth = 10; ctx.strokeRect(0, 0, WORLD, WORLD);
      for (const r of rocks) { if (r.x + r.r < x0 || r.x - r.r > x1 || r.y + r.r < y0 || r.y - r.r > y1) continue; ctx.fillStyle = '#7d8590'; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 7); ctx.fill(); ctx.fillStyle = '#9aa3ad'; ctx.beginPath(); ctx.arc(r.x - r.r * 0.2, r.y - r.r * 0.25, r.r * 0.6, 0, 7); ctx.fill(); }
      for (const l of loot) { if (l.x < x0 || l.x > x1 || l.y < y0 || l.y > y1) continue; ctx.drawImage(emoSpr(l.e), l.x - 18, l.y - 18 + Math.sin(t * 4 + l.x) * 2, 36, 36); }
      for (const e of ents) { if (!e.alive || e.x < x0 || e.x > x1 || e.y < y0 || e.y > y1) continue;
        ctx.save(); ctx.translate(e.x, e.y);
        ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, 16, 17, 8, 0, 0, 7); ctx.fill();
        ctx.save(); ctx.rotate(e.ang); ctx.fillStyle = '#ffd43b'; ctx.strokeStyle = '#b08900'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(20, 0, 11, -1.0, 1.0); ctx.arc(20, 0, 6, 1.0, -1.0, true); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
        ctx.globalAlpha = e.hurt > 0 ? 0.55 : 1; ctx.drawImage(spr(e), -PR - 4, -PR - 6, PR * 2 + 8, PR * 2 + 8); ctx.globalAlpha = 1;
        if (e.sh > 0) { ctx.strokeStyle = 'rgba(80,170,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, PR + 6, 0, 7); ctx.stroke(); }
        if (e.isP) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 2, PR + 9, 0, 7); ctx.stroke(); } else { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(-16, -PR - 14, 32, 4); ctx.fillStyle = '#ff5d6c'; ctx.fillRect(-16, -PR - 14, 32 * Math.max(0, e.hp) / 100, 4); }
        ctx.restore(); }
      ctx.fillStyle = '#ffe14d'; for (const b of bullets) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx)); ctx.beginPath(); ctx.ellipse(0, 0, 9, 4, 0, 0, 7); ctx.fill(); ctx.restore(); }
      for (const p of puffs) { ctx.globalAlpha = 1 - p.t; ctx.fillStyle = p.s ? '#fff4a8' : '#fff'; const n = p.s ? 5 : 8; for (let k = 0; k < n; k++) { const a = k / n * 6.283 + p.t * 2, d = 8 + p.t * (p.s ? 18 : 40); ctx.fillRect(p.x + Math.cos(a) * d - 3, p.y + Math.sin(a) * d - 3, 6, 6); } ctx.globalAlpha = 1; }
      // zone (outside tinted)
      ctx.fillStyle = 'rgba(150,20,110,.30)'; ctx.beginPath(); ctx.rect(x0 - 200, y0 - 200, x1 - x0 + 400, y1 - y0 + 400); ctx.arc(zc.x, zc.y, zone.r, 0, 6.283, true); ctx.fill('evenodd');
      ctx.strokeStyle = '#ff5ad1'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(zc.x, zc.y, zone.r, 0, 6.283); ctx.stroke();
      if (P.hp < 30 && P.alive) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(255,0,40,${0.10 + 0.08 * Math.sin(t * 8)})`; ctx.fillRect(0, 0, cv.width, cv.height); }
    }
    function hud(force) {
      if (!force && t < nextHud) return; nextHud = t + 0.2;
      $('#rr-alive').textContent = '🐒 ' + alive() + ' left'; $('#rr-kills').textContent = '🍌 ' + P.kills;
      $('#rr-hp').style.width = Math.max(0, P.hp) + '%'; $('#rr-sh').style.width = P.sh * 2 + '%'; $('#rr-ammo').textContent = (P.boost > 0 ? '⚡ ' : '🍌 ') + P.ammo;
      const zl = zone.shrinking ? 'Zone shrinking!' : zone.phase + 1 < PHASES.length ? 'Zone in ' + Math.max(0, Math.ceil(zone.nextAt - t)) + 's' : 'Final zone';
      const zEl = $('#rr-zone'); zEl.textContent = zl; zEl.classList.toggle('warn', zone.shrinking || !inZone(P));
      $('#rr-feed').innerHTML = feed.map(f => `<div>${esc(f.txt)}</div>`).join('');
      mini.clearRect(0, 0, 96, 96); mini.fillStyle = 'rgba(10,20,14,.7)'; mini.fillRect(0, 0, 96, 96); const k = 96 / WORLD;
      mini.strokeStyle = '#ff5ad1'; mini.beginPath(); mini.arc(zc.x * k, zc.y * k, zone.r * k, 0, 6.283); mini.stroke();
      mini.fillStyle = '#ff7a7a'; for (const e of ents) if (e.alive && !e.isP) mini.fillRect(e.x * k - 1, e.y * k - 1, 2, 2);
      if (P.alive) { mini.fillStyle = '#fff'; mini.fillRect(P.x * k - 2, P.y * k - 2, 4, 4); }
    }
    // ---- loop + results ----
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (paused) { last = now; return; }
      let dt = Math.min(0.1, (now - last) / 1000 || 0.016); last = now; acc += dt;
      let n = 0; while (acc >= 1 / 60 && n < 3) { update(1 / 60); acc -= 1 / 60; n++; } if (n === 3) acc = 0;
      render(); hud(false);
    }
    let finishing = false;
    function finish(place, delay) {
      if (finishing) return; finishing = true;
      setTimeout(() => { over = true; showResults(place); }, delay * 1000);
    }
    async function showResults(place) {
      const kills = P.kills, secs = Math.round(t), score = (21 - place) * 50 + kills * 100 + (place === 1 ? 500 : 0), won = place === 1;
      Z.sfx(won ? 'win' : 'lose');
      const panel = $('#rr-panel'); panel.hidden = false;
      const text = won ? `I won ZuZu Royale 🏆🍌 with ${kills} banana hits! Can you beat ${score} points?` : `I placed #${place} of 20 in ZuZu Royale 🍌🐒 with ${kills} hits (${score} pts). Beat me:`;
      panel.innerHTML = `<div class="rr-card" data-testid="royale-results"><div class="rr-trophy">${won ? '🏆' : '🐒'}</div><h2>${won ? 'Last monkey standing!' : 'Eliminated'}</h2>
        <div class="rr-place">#${place}<small> of 20</small></div><div class="rr-stats"><span>🍌 ${kills} hits</span><span>⏱ ${secs}s</span><span>⭐ ${score} pts</span></div>
        <p class="muted small" id="rr-saved">Saving score…</p>
        <div class="gm-actions"><button class="btn btn-primary" id="rr-again">Play again</button><button class="btn btn-outline" id="rr-share">Share 📤</button><button class="btn btn-outline" id="rr-lobby">Games</button></div></div>`;
      $('#rr-again').onclick = () => { cleanup(); startGame(); };
      $('#rr-share').onclick = () => share(text, location.origin + '/games/royale');
      $('#rr-lobby').onclick = () => { cleanup(); Z.go('/games'); };
      try { const r = await Z.api('POST', '/api/games/royale/score', { placement: place, kills, seconds: secs }); const el = $('#rr-saved'); if (el) el.textContent = `Saved. Your best: ${r.best}`; }
      catch (e) { const el = $('#rr-saved'); if (el) el.textContent = e.message; }
    }
    function togglePause() { if (over || finishing) return; paused = !paused; const p = $('#rr-panel'); p.hidden = !paused; if (paused) { p.innerHTML = `<div class="rr-card"><h2>Paused ⏸</h2><div class="gm-actions"><button class="btn btn-primary" id="rr-resume">Resume</button><button class="btn btn-outline" id="rr-quit">Quit</button></div></div>`; $('#rr-resume').onclick = togglePause; $('#rr-quit').onclick = () => { cleanup(); Z.go('/games'); }; } }
    $('#rr-pause').onclick = togglePause;
    const vis = () => { if (document.hidden && !paused && !over) togglePause(); };
    document.addEventListener('visibilitychange', vis);
    function cleanup() { cancelAnimationFrame(raf); removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('resize', resize); document.removeEventListener('visibilitychange', vis); ov.remove(); document.body.classList.remove('royale-on'); window.__royale = null; if (window.__gameTeardown === cleanup) window.__gameTeardown = null; }
    window.__gameTeardown = cleanup;
    window.__royale = { ents, P, zone, get t() { return t; }, get over() { return over; }, get finishing() { return finishing; }, finish: (place) => { P.place = place; finish(place, 0); }, canvas: cv };
    last = performance.now(); raf = requestAnimationFrame(frame); hud(true); Z.sfx('pickup');
  }
  window.ZuzuGames = { lobby, arena: () => arena(), royale };
})();
