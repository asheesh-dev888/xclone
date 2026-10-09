// End-to-end API test: node tests/api-test.js [baseUrl]
const BASE = process.argv[2] || 'http://localhost:4180';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
function client() {
  let cookie = '';
  return async (method, path, body, isForm) => {
    const headers = cookie ? { cookie } : {};
    let b;
    if (isForm) b = body; else if (body) { headers['content-type'] = 'application/json'; b = JSON.stringify(body); }
    const r = await fetch(BASE + path, { method, headers, body: b });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    return { status: r.status, data: await r.json().catch(() => ({})) };
  };
}
(async () => {
  const u = 'tester' + Math.floor(Math.random() * 1e5);
  const a = client(), d = client();
  let r = await a('POST', '/api/signup', { username: u, password: 'secret123', name: 'Test User' });
  ok(r.status === 200 && r.data.user.username === u, 'sign up ' + u);
  r = await a('POST', '/api/signup', { username: u, password: 'secret123' }); ok(r.status === 409, 'duplicate username rejected');
  r = await d('POST', '/api/login', { username: 'demo', password: 'wrong' }); ok(r.status === 401, 'bad password rejected');
  r = await d('POST', '/api/login', { username: 'demo', password: 'demo1234' }); ok(r.status === 200, 'demo login');
  r = await d('POST', '/api/login', { username: 'DEMO', password: 'demo1234' }); ok(r.status === 200, 'login is case-insensitive');
  r = await a('POST', '/api/signup', { username: u.toUpperCase(), password: 'secret123' }); ok(r.status === 409, 'duplicate username (different case) rejected');
  r = await a('POST', '/api/posts', (() => { const f = new FormData(); f.append('text', 'x'.repeat(281)); return f; })(), true); ok(r.status === 400, '281 chars rejected');
  const fd = new FormData(); fd.append('text', 'Hello from the API test #testing');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  fd.append('image', new Blob([png], { type: 'image/png' }), 'dot.png');
  r = await a('POST', '/api/posts', fd, true); ok(r.status === 200 && r.data.post.image, 'create post with image');
  const pid = r.data.post.id;
  const img = r.data.post.image;
  ok(/^\/media\/[0-9a-f]{24}$/.test(img || ''), 'image stored in DB: ' + img);
  let mr = await fetch(BASE + img); let bytes = Buffer.from(await mr.arrayBuffer());
  ok(mr.status === 200 && mr.headers.get('content-type') === 'image/png' && bytes.equals(png), 'GET ' + img + ' returns the same PNG bytes');
  const big = new FormData(); big.append('text', 'too big'); big.append('image', new Blob([Buffer.alloc(5 * 1024 * 1024 + 1)], { type: 'image/png' }), 'big.png');
  r = await a('POST', '/api/posts', big, true); ok(r.status === 413, 'image over 5MB rejected (413)');
  r = await d('POST', `/api/posts/${pid}/like`); ok(r.data.post.like_count === 1 && r.data.post.liked, 'demo likes post');
  const rf = new FormData(); rf.append('text', 'Nice post!'); rf.append('parent_id', pid);
  r = await d('POST', '/api/posts', rf, true); ok(r.data.post.parent_id === pid, 'demo replies');
  r = await d('POST', `/api/posts/${pid}/repost`); ok(r.data.post.repost_count === 1 && r.data.post.reposted, 'demo reposts');
  r = await d('POST', `/api/users/${u}/follow`); ok(r.data.user.followers === 1 && r.data.user.is_following, 'demo follows tester');
  r = await d('GET', '/api/feed/home'); ok(r.data.items.some(p => p.id === pid), 'post appears in demo home feed');
  ok(r.data.items.some(p => p.reposted_by && p.reposted_by.username === 'demo'), 'repost appears in feed');
  r = await a('GET', `/api/posts/${pid}`); ok(r.data.replies.length === 1 && r.data.post.reply_count === 1, 'thread has reply');
  r = await a('GET', '/api/notifications'); const types = r.data.items.map(n => n.type).sort().join(',');
  ok(['follow', 'like', 'reply', 'repost'].every(t => types.includes(t)), 'notifications: ' + types);
  r = await a('GET', `/api/users/${u}`); ok(r.data.user.followers === 1 && r.data.user.posts === 1, 'profile counts');
  const ef = new FormData(); ef.append('name', 'Renamed Tester'); ef.append('bio', 'I test things');
  ef.append('avatar', new Blob([png], { type: 'image/png' }), 'av.png'); ef.append('banner', new Blob([png], { type: 'image/png' }), 'bn.png');
  r = await a('PUT', '/api/me', ef, true); ok(r.data.user.name === 'Renamed Tester' && r.data.user.bio === 'I test things', 'edit profile');
  const av1 = r.data.user.avatar;
  ok(/^\/media\//.test(av1 || '') && /^\/media\//.test(r.data.user.banner || ''), 'avatar + banner stored in DB');
  mr = await fetch(BASE + av1); ok(mr.status === 200 && mr.headers.get('content-type') === 'image/png', 'avatar served from ' + av1);
  const ef2 = new FormData(); ef2.append('avatar', new Blob([png], { type: 'image/png' }), 'av2.png');
  r = await a('PUT', '/api/me', ef2, true); ok(r.data.user.avatar !== av1 && r.data.user.name === 'Renamed Tester', 'avatar replaced, other fields kept');
  mr = await fetch(BASE + av1); ok(mr.status === 404, 'old avatar removed from DB');
  r = await a('GET', '/api/search?q=' + u); ok(r.data.users.some(x => x.username === u), 'search users');
  r = await d('GET', `/api/users/${u}/followers`); ok(r.data.users.some(x => x.username === 'demo'), 'followers list');
  r = await d('GET', '/api/users/demo/following'); ok(r.data.users.some(x => x.username === u), 'following list');
  r = await a('GET', '/api/search?q=%23testing'); ok(r.data.posts.some(p => p.id === pid), 'search posts by hashtag');
  r = await d('DELETE', `/api/posts/${pid}/like`); ok(r.data.post.like_count === 0, 'unlike');
  r = await d('DELETE', `/api/users/${u}/follow`); ok(r.data.user.followers === 0, 'unfollow');
  r = await d('DELETE', `/api/posts/${pid}`); ok(r.status === 403, 'cannot delete others\' post');
  r = await a('DELETE', `/api/posts/${pid}`); ok(r.status === 200, 'delete own post');
  r = await a('GET', `/api/posts/${pid}`); ok(r.status === 404, 'deleted post is gone');
  mr = await fetch(BASE + img); ok(mr.status === 404, 'deleted post\'s image is gone');
  r = await a('GET', '/healthz'); ok(r.status === 200 && r.data.db === 'ok', 'healthz checks DB');
  r = await a('POST', '/api/logout'); r = await a('GET', '/api/feed/home'); ok(r.status === 401, 'logout ends session');
  await googleTests();
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FAILED:', e); process.exit(1); });

// ---------- Continue with Google ----------
async function googleTests() {
  const g = require('../google-auth');
  console.log('\n  Google sign-in');
  let r = await fetch(BASE + '/api/config'); let cfg = await r.json();
  ok(r.status === 200 && typeof cfg.google === 'boolean', '/api/config returns {google: ' + cfg.google + '}');

  // unit: username derivation + uniqueness
  ok(g.usernameBase('jane.doe+news@gmail.com', 'Jane Doe') === 'jane.doe', 'username from email local part (+tag dropped)');
  ok(g.usernameBase('a@x.com', 'Ánna María') === 'Anna_Maria', 'short local part falls back to name (accents stripped, spaces -> _)');
  ok(g.usernameBase('a-very-long.email-address_here_123@x.com', '') === 'averylong.emailaddre', 'invalid chars removed, cut to 20');
  ok(g.usernameBase('ab@x.com', '李') === 'ab_user', 'too-short base padded');
  ok(g.usernameBase('李@x.com', '') === 'user', 'nothing usable -> "user"');
  ok(g.usernameBase('..__x__..@x.com', '') === 'x_user', 'edge punctuation trimmed');
  const taken = new Set(['jane.doe', 'jane.doe1', 'jane.doe2', 'abcdefghijklmnopqrst', 'abcdefghijklmnopqrs1']);
  const isTaken = async (n) => taken.has(n.toLowerCase());
  ok(await g.uniqueUsername('newname', isTaken) === 'newname', 'free base kept');
  ok(await g.uniqueUsername('Jane.Doe', isTaken) === 'Jane.Doe3', 'taken base gets next numeric suffix (case-insensitive)');
  const long = await g.uniqueUsername('abcdefghijklmnopqrst', isTaken);
  ok(long === 'abcdefghijklmnopqrs2' && g.USERNAME_RE.test(long), 'suffix keeps 20-char limit: ' + long);
  const cid = 'test-client.apps.googleusercontent.com', base = { iss: 'https://accounts.google.com', aud: cid, exp: Date.now() / 1000 + 60, sub: '1', email: 'a@b.c', email_verified: true };
  const throws = (c) => { try { g.verifyClaims(c, { clientId: cid }); return false; } catch { return true; } };
  ok(!throws(base) && throws({ ...base, aud: 'other' }) && throws({ ...base, iss: 'evil.com' }) && throws({ ...base, exp: Date.now() / 1000 - 3600 }) && throws({ ...base, email_verified: false }),
    'id_token claims: aud / iss / exp / email_verified checked');
  const savedPub = process.env.PUBLIC_URL;
  process.env.PUBLIC_URL = 'https://zuzu-app.onrender.com/';
  ok(g.redirectUri({ headers: {}, protocol: 'http' }) === 'https://zuzu-app.onrender.com/auth/google/callback', 'redirect URI built from PUBLIC_URL');
  if (savedPub === undefined) delete process.env.PUBLIC_URL; else process.env.PUBLIC_URL = savedPub;

  if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) { console.log('  (skipping Google flow tests: needs a local server)'); return; }
  const { startMockGoogle, startGoogleApp, codeFor, localDbUrl } = require('./google-server');
  const secret = 'test-secret', PORT = 4189, GB = `http://localhost:${PORT}`;
  const mock = await startMockGoogle(cid, secret);
  const app = await startGoogleApp({ port: PORT, clientId: cid, clientSecret: secret, tokenUrl: mock.url });
  const { Client } = require('pg');
  const pg = new Client({ connectionString: localDbUrl() }); await pg.connect();
  try {
    cfg = await (await fetch(GB + '/api/config')).json(); ok(cfg.google === true, '/api/config -> {google: true} when env set');
    r = await fetch(GB + '/auth/google', { redirect: 'manual', headers: { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'zuzu.example.test' } });
    const loc = new URL(r.headers.get('location') || 'about:blank'), sc = r.headers.get('set-cookie') || '';
    const cookieState = (sc.match(/g_oauth=([0-9a-f]+)\./) || [])[1];
    ok(r.status === 302 && loc.origin === 'https://accounts.google.com', '/auth/google redirects to accounts.google.com');
    ok(loc.searchParams.get('client_id') === cid && loc.searchParams.get('response_type') === 'code', 'client_id + response_type=code');
    ok(loc.searchParams.get('redirect_uri') === 'https://zuzu.example.test/auth/google/callback', 'redirect_uri derived from request (x-forwarded-proto): ' + loc.searchParams.get('redirect_uri'));
    ok(loc.searchParams.get('scope') === 'openid email profile' && loc.searchParams.get('prompt') === 'select_account', 'scope + prompt=select_account');
    ok(cookieState && cookieState === loc.searchParams.get('state') && /HttpOnly/i.test(sc) && /Max-Age=600/.test(sc), 'state matches short-lived httpOnly cookie');

    // One full sign-in round trip; returns { status, location, sid }.
    async function googleLogin(claims, { tamperState = false } = {}) {
      const s = await fetch(GB + '/auth/google', { redirect: 'manual' });
      const ck = (s.headers.get('set-cookie') || '').split(';')[0];
      const st = new URL(s.headers.get('location')).searchParams.get('state');
      const cb = await fetch(`${GB}/auth/google/callback?code=${codeFor(claims)}&state=${tamperState ? 'bad' + st : st}`, { redirect: 'manual', headers: { cookie: ck } });
      const sid = ((cb.headers.get('set-cookie') || '').match(/sid=([0-9a-f]+)/) || [])[1];
      return { status: cb.status, location: cb.headers.get('location'), sid };
    }
    const me = async (sid) => (await (await fetch(GB + '/api/me', { headers: { cookie: 'sid=' + sid } })).json()).user;
    const rnd = Math.floor(Math.random() * 1e6);

    let res = await googleLogin({ sub: 'g' + rnd, email: `bad${rnd}@example.com`, name: 'Bad' }, { tamperState: true });
    ok(res.status === 302 && res.location === '/login?error=google' && !res.sid, 'callback rejects a bad state -> /login?error=google');
    r = await fetch(`${GB}/auth/google/callback?code=x&state=abc`, { redirect: 'manual' });
    ok(r.status === 302 && r.headers.get('location') === '/login?error=google', 'callback without state cookie rejected');
    r = await fetch(`${GB}/auth/google/callback?error=access_denied`, { redirect: 'manual' });
    ok(r.headers.get('location') === '/login?error=google', 'user cancelling at Google -> /login?error=google');
    res = await googleLogin({ sub: 'g' + rnd, email: `aud${rnd}@example.com`, aud: 'someone-else' });
    ok(res.location === '/login?error=google' && !res.sid, 'id_token with wrong aud rejected');
    res = await googleLogin({ sub: 'g' + rnd, email: `unv${rnd}@example.com`, email_verified: false });
    ok(res.location === '/login?error=google' && !res.sid, 'unverified email rejected');

    // new user
    const email = `Goo.Gler${rnd}+zuzu@Example.com`;
    res = await googleLogin({ sub: 'new' + rnd, email, name: 'Goo Gler', picture: 'https://lh3.googleusercontent.com/a/abc=s96-c' });
    ok(res.status === 302 && res.location === '/home' && res.sid, 'new Google user signed in -> /home');
    let u = await me(res.sid);
    ok(u && u.username === `goo.gler${rnd}` && u.name === 'Goo Gler', 'username derived from email: @' + (u && u.username));
    ok(u && u.avatar === 'https://lh3.googleusercontent.com/a/abc=s400-c', 'Google photo stored as avatar URL');
    ok(u && u.email === undefined && u.google_id === undefined, 'email/google_id not exposed in API');
    const row = await pg.query('SELECT * FROM users WHERE id=$1', [u.id]);
    ok(row.rows[0].google_id === 'new' + rnd && row.rows[0].email === email.toLowerCase() && row.rows[0].password_hash === null, 'stored google_id + email, no password');
    res = await googleLogin({ sub: 'new' + rnd, email, name: 'Changed Name' });
    ok((await me(res.sid)).id === u.id, 'returning Google user -> same account (by google_id)');
    r = await fetch(GB + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: u.username, password: 'anything' }) });
    const lj = await r.json();
    ok(r.status === 401 && /Google/.test(lj.error), 'password login on Google-only account rejected cleanly: ' + lj.error);

    // username collision -> numeric suffix
    const taken2 = 'gcol' + rnd;
    await fetch(GB + '/api/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: taken2, password: 'secret123' }) });
    res = await googleLogin({ sub: 'col' + rnd, email: `${taken2.toUpperCase()}@gmail.com`, name: 'Col' });
    ok((await me(res.sid)).username === taken2 + '1', 'taken username gets numeric suffix: @' + taken2 + '1');

    // link existing password account by verified email
    const linkU = 'glink' + rnd;
    r = await fetch(GB + '/api/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: linkU, password: 'secret123', name: 'Linker' }) });
    const linkId = (await r.json()).user.id;
    await pg.query('UPDATE users SET email=$1 WHERE id=$2', [`linker${rnd}@example.com`, linkId]);
    res = await googleLogin({ sub: 'link' + rnd, email: `Linker${rnd}@Example.com`, name: 'Linker G' });
    u = await me(res.sid);
    ok(u && u.id === linkId && u.username === linkU, 'existing account linked by matching email');
    ok((await pg.query('SELECT google_id FROM users WHERE id=$1', [linkId])).rows[0].google_id === 'link' + rnd, 'google_id saved on linked account');
    r = await fetch(GB + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: linkU, password: 'secret123' }) });
    ok(r.status === 200, 'linked account can still log in with password');
    ok(mock.calls.every(c => c.redirect_uri === GB + '/auth/google/callback' && c.code), 'token exchange sent code + matching redirect_uri');
  } finally {
    await pg.end(); app.child.kill(); mock.srv.close();
  }
}
