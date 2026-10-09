// Demo data for ZuZu. Never wipes anything: server.js calls seed() on startup
// only when the users table is empty. `node seed.js` does the same check.
const bcrypt = require('bcryptjs');

const users = [
  ['demo', 'Demo User', 'Just trying out ZuZu 👋', 'Bengaluru, India'],
  ['akhil', 'Akhil Rajan', 'Builder. Curious about everything.', 'India'],
  ['priya_codes', 'Priya Sharma', 'Full-stack dev · chai enthusiast ☕ · open source', 'Pune'],
  ['rahul_cricket', 'Rahul Verma', 'Cricket, stats and hot takes 🏏', 'Mumbai'],
  ['spacenerd', 'Meera Iyer', 'Astrophysics PhD student. Stars > people (mostly).', 'Chennai'],
  ['foodie_arjun', 'Arjun Nair', 'Eating my way across India 🍛', 'Kochi'],
  ['newsbot', 'Daily Brief', 'Automated headlines. Not real news — demo account.', ''],
  ['design_ananya', 'Ananya Das', 'Product designer. Pixels & typography.', 'Kolkata'],
];
const posts = [
  ['priya_codes', 'Shipped a new side project this weekend. SQLite is honestly all you need for 90% of apps. #buildinpublic', 600],
  ['rahul_cricket', 'That last over was absolutely insane. Who else stayed up to watch it? 🏏 #cricket', 540],
  ['spacenerd', 'Fun fact: a day on Venus is longer than its year. The universe is weird and I love it ✨ #space', 500],
  ['foodie_arjun', 'Rainy evening + masala chai + pakoras = perfection. Fight me. ☔', 460],
  ['newsbot', 'Morning brief: markets open flat, monsoon withdraws from north-west India, and a new metro line opens for trials. (demo content)', 420],
  ['design_ananya', 'Hot take: dark mode isn’t just black backgrounds. Contrast, elevation and borders do the heavy lifting. #design', 380],
  ['akhil', 'Building ZuZu from scratch to see how hard it really is. So far: surprisingly fun.', 340],
  ['priya_codes', 'Reminder: hash your passwords. bcrypt, argon2, scrypt — pick one. Never store plain text. #security', 300],
  ['spacenerd', 'Clear skies tonight! Saturn is visible right after sunset if you look south-east 🪐', 260],
  ['rahul_cricket', 'Unpopular opinion: Test cricket is still the best format. Five days of chess on grass.', 220],
  ['design_ananya', 'Spent 3 hours choosing between two shades of grey. Designer life. #design', 180],
  ['foodie_arjun', 'Best dosa I’ve ever had was at a tiny stall near the bus stand. No name, no signboard, just magic.', 140],
  ['demo', 'Hello world! This is my first post on ZuZu 🎉', 100],
  ['akhil', 'Feature request list for ZuZu: bookmarks, DMs, polls. What else? #buildinpublic', 60],
  ['newsbot', 'Evening brief: tech stocks up, a new space mission announced, and weekend weather looks clear. (demo content)', 30],
];

// client: a connected pg client (inside a transaction). Returns false if users already exist.
async function seed(client) {
  const { rows: [{ n }] } = await client.query('SELECT COUNT(*)::int n FROM users');
  if (n > 0) return false;
  const one = async (sql, params) => (await client.query(sql, params)).rows[0];
  const hash = bcrypt.hashSync('demo1234', 10);
  const ids = {};
  const T0 = Date.now();
  for (const [i, [u, n, b, l]] of users.entries()) {
    ids[u] = (await one('INSERT INTO users(username,name,password_hash,bio,location,created_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [u, n, hash, b, l, T0 - (400 - i * 20) * 864e5])).id;
  }
  const pid = {};
  for (const [i, [u, t, minsAgo]] of posts.entries()) {
    pid[i] = (await one('INSERT INTO posts(user_id,text,created_at) VALUES ($1,$2,$3) RETURNING id', [ids[u], t, T0 - minsAgo * 60000])).id;
  }
  const reply = (u, i, t, minsAgo) => one('INSERT INTO posts(user_id,text,parent_id,created_at) VALUES ($1,$2,$3,$4) RETURNING id', [ids[u], t, pid[i], T0 - minsAgo * 60000]);
  await reply('akhil', 0, 'Agreed. WAL mode + a single box gets you really far.', 590);
  await reply('demo', 0, 'What did you build?', 580);
  await reply('priya_codes', 2, 'Wait, really?? Mind blown.', 490);
  await reply('spacenerd', 2, '243 Earth days per rotation vs 225 per orbit 😄', 485);
  await reply('foodie_arjun', 9, 'Hard disagree, T20 forever', 210);
  await reply('rahul_cricket', 12, 'Welcome! 👋', 95);
  await reply('design_ananya', 12, 'Welcome aboard!', 90);
  const follow = (a, b) => client.query('INSERT INTO follows VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [ids[a], ids[b], T0 - 864e5]);
  const follows = [
    ...['akhil', 'priya_codes', 'spacenerd', 'design_ananya'].map(u => ['demo', u]),
    ...['priya_codes', 'rahul_cricket', 'spacenerd', 'foodie_arjun', 'design_ananya'].map(u => [u, 'akhil']),
    ...['priya_codes', 'spacenerd', 'design_ananya'].map(u => ['akhil', u]),
    ...['rahul_cricket', 'foodie_arjun', 'spacenerd'].map(u => [u, 'priya_codes']),
    ...['priya_codes', 'akhil'].map(u => [u, 'demo']),
    ['design_ananya', 'spacenerd'], ['foodie_arjun', 'rahul_cricket'],
  ];
  for (const [a, b] of follows) await follow(a, b);
  const likes = [[0, ['akhil', 'demo', 'spacenerd', 'design_ananya', 'rahul_cricket']], [2, ['priya_codes', 'akhil', 'demo', 'foodie_arjun']], [3, ['rahul_cricket', 'priya_codes']],
    [5, ['priya_codes', 'akhil', 'spacenerd']], [6, ['priya_codes', 'demo', 'design_ananya']], [8, ['akhil', 'design_ananya']], [12, ['akhil', 'priya_codes']], [13, ['priya_codes']]];
  for (const [i, us] of likes) for (const u of us) await client.query('INSERT INTO likes VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [ids[u], pid[i], T0 - 3600000]);
  const repost = (u, i, minsAgo) => client.query('INSERT INTO posts(user_id,text,repost_of,created_at) VALUES ($1,$2,$3,$4)', [ids[u], '', pid[i], T0 - minsAgo * 60000]);
  await repost('akhil', 7, 290); await repost('spacenerd', 5, 170); await repost('priya_codes', 13, 50);
  const notif = (to, from, type, i, m) => client.query('INSERT INTO notifications(user_id,actor_id,type,post_id,created_at) VALUES ($1,$2,$3,$4,$5)', [ids[to], ids[from], type, i == null ? null : pid[i], T0 - m * 60000]);
  await notif('demo', 'akhil', 'like', 12, 80); await notif('demo', 'priya_codes', 'like', 12, 70);
  await notif('demo', 'priya_codes', 'follow', null, 1440); await notif('demo', 'akhil', 'follow', null, 1400);
  console.log('Seeded', users.length, 'users,', posts.length, 'posts. Login: demo / demo1234 (all demo users share this password)');
  return true;
}
module.exports = { seed };

// `node seed.js`: create schema + seed if the database is empty (same as server startup, without listening).
if (require.main === module) {
  require('./db').init().then(({ seeded }) => { if (!seeded) console.log('Users table not empty; nothing seeded.'); process.exit(0); })
    .catch(e => { console.error(e.message); process.exit(1); });
}
