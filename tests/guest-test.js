// Read-only (guest) mode: sessionless reads work, every sessionless write is 401. node tests/guest-test.js [baseUrl]
const BASE = process.argv[2] || 'http://localhost:4180';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
const req = async (method, path, body) => {
  const r = await fetch(BASE + path, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  let data = {}; try { data = await r.json(); } catch {}
  return { status: r.status, data, headers: r.headers };
};
(async () => {
  // reads
  let r = await req('GET', '/api/me'); ok(r.status === 200 && r.data.user === null, 'guest /api/me -> user null');
  r = await req('GET', '/api/feed/explore'); ok(r.status === 200 && Array.isArray(r.data.items) && r.data.items.length > 0, 'guest reads explore feed');
  const post = r.data.items[0];
  r = await req('GET', '/api/posts/' + post.id); ok(r.status === 200 && r.data.post.id === post.id, 'guest reads a post thread');
  r = await req('GET', '/api/users/' + post.username); ok(r.status === 200 && r.data.user.username === post.username && !('email' in r.data.user) && !('password_hash' in r.data.user), 'guest reads a profile (no email/hash)');
  r = await req('GET', '/api/users/' + post.username + '/posts'); ok(r.status === 200 && Array.isArray(r.data.items), 'guest reads profile posts');
  r = await req('GET', '/api/reels'); ok(r.status === 200 && Array.isArray(r.data.items), 'guest reads reels');
  r = await req('GET', '/api/search?q=a'); ok(r.status === 200, 'guest search');
  r = await req('GET', '/api/trends'); ok(r.status === 200, 'guest trends');
  for (const p of ['/lab', '/lab/tritbot', '/lab/reasoner']) { const x = await fetch(BASE + p); ok(x.status === 200, 'guest opens ' + p); }
  const rz = await fetch(BASE + '/lab/reasoner', { headers: { 'accept-encoding': 'br' } });
  ok(rz.headers.get('content-encoding') === 'br' && /must-revalidate/.test(rz.headers.get('cache-control')) && rz.headers.get('etag'), '/lab/reasoner precompressed + ETag + Cache-Control');
  // private reads stay closed
  for (const p of ['/api/feed/home', '/api/notifications', '/api/dm/conversations', '/api/dm/unread', '/api/me/account', '/api/me/prefs', '/api/games/summary'])
    { r = await req('GET', p); ok(r.status === 401, 'guest GET ' + p + ' -> 401'); }
  r = await req('GET', '/api/admin/stats'); ok(r.status === 404 || r.status === 401, 'guest admin stats hidden');
  // writes
  const writes = [['POST', '/api/posts', { text: 'guest post' }], ['POST', `/api/posts/${post.id}/like`], ['DELETE', `/api/posts/${post.id}/like`],
    ['POST', `/api/posts/${post.id}/repost`], ['POST', `/api/posts/${post.id}/vote`, { option: 0 }], ['POST', `/api/users/${post.username}/follow`],
    ['POST', '/api/dm/conversations', { username: post.username }], ['POST', '/api/dm/conversations/1/messages', { text: 'hi' }],
    ['PUT', '/api/me', { name: 'x' }], ['PUT', '/api/me/prefs', { ui_lang: 'en' }], ['PUT', '/api/me/ideal', {}], ['POST', `/api/ai/post/${post.id}`, { q: 'hi' }],
    ['POST', '/api/video/sign', {}], ['POST', '/api/push/subscribe', {}], ['POST', '/api/me/password', {}], ['DELETE', `/api/posts/${post.id}`],
    ['POST', '/api/anything-new', {}]];
  for (const [m, p, b] of writes) { r = await req(m, p, b); ok(r.status === 401, `guest ${m} ${p} -> 401 (${r.status})`); }
  r = await req('POST', '/api/posts', { text: 'guest post' }); ok(r.data.guest === true && /Sign up to join the conversation/.test(r.data.error), 'guest write error is the friendly sign-up prompt');
  // auth endpoints still work sessionless
  r = await req('POST', '/api/login', { username: 'nobody_' + Date.now(), password: 'wrong' }); ok(r.status === 401 && !r.data.guest, 'login still reachable without session');
  // no demo credentials in the shipped UI
  const html = await (await fetch(BASE + '/login')).text(), js = await (await fetch(BASE + '/app.js')).text();
  ok(!/demo1234|Demo login/i.test(html + js), 'no demo credentials in login page / app.js');
  ok(/Browse in read-only mode/.test(js), 'read-only mode button present');
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
