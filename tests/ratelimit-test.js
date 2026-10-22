// Login/signup rate-limit test: node tests/ratelimit-test.js [baseUrl]  (server must use default LOGIN_RATE_MAX=5)
const BASE = process.argv[2] || 'http://localhost:4180';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
const login = (username, password, ip) => fetch(BASE + '/api/login', { method: 'POST',
  headers: { 'content-type': 'application/json', ...(ip ? { 'x-forwarded-for': ip } : {}) }, body: JSON.stringify({ username, password }) });
(async () => {
  const { netOf } = require('../ratelimit');
  ok(netOf('140.248.50.12') === netOf('::ffff:140.248.50.101') && netOf('1.2.3.4') !== netOf('1.2.4.4'), 'IPv4 grouped by /24');
  ok(netOf('2001:db8:1:2:aaaa::1') === netOf('2001:db8:1:2:bbbb::9'), 'IPv6 grouped by /64');
  const fake = 'rl_nobody_' + Math.random().toString(36).slice(2, 8);
  for (let i = 1; i <= 5; i++) { const r = await login(fake, 'wrong' + i); ok(r.status === 401, `bad login #${i} -> 401`); }
  const r6 = await login(fake, 'wrong6'); const j = await r6.json();
  ok(r6.status === 429 && /Too many failed sign-in attempts/.test(j.error) && +r6.headers.get('retry-after') > 0, '6th bad login -> 429 with friendly message + Retry-After');
  const other = await login(fake + 'x', 'wrong'); ok(other.status === 401, 'a different username from same IP is not blocked');
  const ip2 = await login(fake, 'wrong', '198.51.100.' + Math.floor(Math.random() * 200 + 1)); ok(ip2.status === 401 || ip2.status === 429, 'other IP request handled (' + ip2.status + ')');
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
