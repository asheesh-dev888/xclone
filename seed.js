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
    ids[u] = (await one('INSERT INTO users(username,name,password_hash,bio,location,created_at,is_demo) VALUES ($1,$2,$3,$4,$5,$6,TRUE) RETURNING id',
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
// Demo DMs: added only when there are no DM conversations at all and the demo users exist.
// Never touches existing data. [user, text, minutesAgo] per message; readUpTo = minutes-ago each side has read up to.
const dms = [
  { pair: ['akhil', 'demo'], msgs: [
    ['akhil', 'Hey! Welcome to ZuZu 👋', 300],
    ['demo', 'Thanks! Loving it so far.', 295],
    ['akhil', 'DMs just shipped. Tell me if anything breaks 🙏', 40],
    ['akhil', 'Docs are here: https://zuzu-app.onrender.com', 39],
  ], read: { akhil: 0, demo: 290 } },
  { pair: ['priya_codes', 'demo'], msgs: [
    ['priya_codes', 'Saw your first post! Want to pair on a side project this weekend?', 200],
    ['demo', 'Yes! What stack?', 190],
    ['priya_codes', 'Express + Postgres. Keep it boring ☕', 185],
    ['demo', 'Perfect, see you Saturday', 180],
  ], read: { priya_codes: 0, demo: 0 } },
  { pair: ['spacenerd', 'design_ananya'], msgs: [
    ['spacenerd', 'Could you design a poster for the stargazing meetup? 🔭', 120],
    ['design_ananya', 'Only if I get to pick the font 😄', 110],
  ], read: { spacenerd: 0, design_ananya: 0 } },
];
async function seedDMs(client) {
  const { rows: [{ n }] } = await client.query('SELECT COUNT(*)::int n FROM dm_conversations');
  if (n > 0) return false;
  const names = [...new Set(dms.flatMap(d => d.pair))];
  const { rows } = await client.query('SELECT id, lower(username) u FROM users WHERE lower(username) = ANY($1::text[])', [names.map(x => x.toLowerCase())]);
  const ids = Object.fromEntries(rows.map(r => [r.u, r.id]));
  const T0 = Date.now();
  let made = 0;
  for (const d of dms) {
    const [x, y] = d.pair.map(u => ids[u.toLowerCase()]);
    if (!x || !y) continue;
    const created = T0 - d.msgs[0][2] * 60000 - 1000;
    const last = T0 - d.msgs[d.msgs.length - 1][2] * 60000;
    const { rows: [c] } = await client.query(
      'INSERT INTO dm_conversations(user_a,user_b,created_by,created_at,last_message_at) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [Math.min(x, y), Math.max(x, y), ids[d.msgs[0][0].toLowerCase()], created, last]);
    for (const u of d.pair) {
      const readAt = T0 - d.read[u] * 60000;
      await client.query('INSERT INTO dm_members(conversation_id,user_id,last_read_at) VALUES ($1,$2,$3)', [c.id, ids[u.toLowerCase()], d.read[u] ? readAt : last]);
    }
    for (const [u, text, m] of d.msgs) {
      await client.query('INSERT INTO dm_messages(conversation_id,sender_id,text,created_at) VALUES ($1,$2,$3,$4)', [c.id, ids[u.toLowerCase()], text, T0 - m * 60000]);
    }
    made++;
  }
  if (made) console.log('Seeded', made, 'demo DM conversations');
  return made > 0;
}
// Seeded usernames (flagged is_demo; schema.sql backfills the same list once).
const DEMO_USERNAMES = users.map(u => u[0]);
module.exports = { seed, seedDMs, DEMO_USERNAMES };

// `node seed.js`: create schema + seed if the database is empty (same as server startup, without listening).
if (require.main === module) {
  require('./db').init().then(({ seeded }) => { if (!seeded) console.log('Users table not empty; nothing seeded.'); process.exit(0); })
    .catch(e => { console.error(e.message); process.exit(1); });
}
