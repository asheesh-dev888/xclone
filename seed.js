// Seeds demo users/posts. Run: node seed.js   (wipes data/app.db first)
const fs = require('fs'), path = require('path');
const dbPath = path.join(__dirname, 'data', 'app.db');
for (const f of fs.readdirSync(path.join(__dirname, 'uploads'))) fs.unlinkSync(path.join(__dirname, 'uploads', f));
for (const f of [dbPath, dbPath + '-wal', dbPath + '-shm']) if (fs.existsSync(f)) fs.unlinkSync(f);
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
// let server.js create schema without listening
process.env.SCHEMA_ONLY = '1';
const db = new Database(dbPath);
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

const users = [
  ['demo', 'Demo User', 'Just trying out this X clone 👋', 'Bengaluru, India'],
  ['akhil', 'Akhil Rajan', 'Builder. Curious about everything.', 'India'],
  ['priya_codes', 'Priya Sharma', 'Full-stack dev · chai enthusiast ☕ · open source', 'Pune'],
  ['rahul_cricket', 'Rahul Verma', 'Cricket, stats and hot takes 🏏', 'Mumbai'],
  ['spacenerd', 'Meera Iyer', 'Astrophysics PhD student. Stars > people (mostly).', 'Chennai'],
  ['foodie_arjun', 'Arjun Nair', 'Eating my way across India 🍛', 'Kochi'],
  ['newsbot', 'Daily Brief', 'Automated headlines. Not real news — demo account.', ''],
  ['design_ananya', 'Ananya Das', 'Product designer. Pixels & typography.', 'Kolkata'],
];
const hash = bcrypt.hashSync('demo1234', 10);
const colors = ['#1d9bf0', '#f91880', '#00ba7c', '#ffd400', '#7856ff', '#ff7a00', '#8b98a5', '#e0245e'];
const ids = {};
const T0 = Date.now();
users.forEach(([u, n, b, l], i) => {
  ids[u] = db.prepare('INSERT INTO users(username,name,password_hash,bio,location,created_at) VALUES (?,?,?,?,?,?)')
    .run(u, n, hash, b, l, T0 - (400 - i * 20) * 864e5).lastInsertRowid;
});
const posts = [
  ['priya_codes', 'Shipped a new side project this weekend. SQLite is honestly all you need for 90% of apps. #buildinpublic', 600],
  ['rahul_cricket', 'That last over was absolutely insane. Who else stayed up to watch it? 🏏 #cricket', 540],
  ['spacenerd', 'Fun fact: a day on Venus is longer than its year. The universe is weird and I love it ✨ #space', 500],
  ['foodie_arjun', 'Rainy evening + masala chai + pakoras = perfection. Fight me. ☔', 460],
  ['newsbot', 'Morning brief: markets open flat, monsoon withdraws from north-west India, and a new metro line opens for trials. (demo content)', 420],
  ['design_ananya', 'Hot take: dark mode isn’t just black backgrounds. Contrast, elevation and borders do the heavy lifting. #design', 380],
  ['akhil', 'Building an X clone from scratch to see how hard it really is. So far: surprisingly fun.', 340],
  ['priya_codes', 'Reminder: hash your passwords. bcrypt, argon2, scrypt — pick one. Never store plain text. #security', 300],
  ['spacenerd', 'Clear skies tonight! Saturn is visible right after sunset if you look south-east 🪐', 260],
  ['rahul_cricket', 'Unpopular opinion: Test cricket is still the best format. Five days of chess on grass.', 220],
  ['design_ananya', 'Spent 3 hours choosing between two shades of grey. Designer life. #design', 180],
  ['foodie_arjun', 'Best dosa I’ve ever had was at a tiny stall near the bus stand. No name, no signboard, just magic.', 140],
  ['demo', 'Hello world! This is my first post on the clone 🎉', 100],
  ['akhil', 'Feature request list for the clone: bookmarks, DMs, polls. What else? #buildinpublic', 60],
  ['newsbot', 'Evening brief: tech stocks up, a new space mission announced, and weekend weather looks clear. (demo content)', 30],
];
const pid = {};
posts.forEach(([u, t, minsAgo], i) => {
  pid[i] = db.prepare('INSERT INTO posts(user_id,text,created_at) VALUES (?,?,?)').run(ids[u], t, T0 - minsAgo * 60000).lastInsertRowid;
});
const reply = (u, i, t, minsAgo) => db.prepare('INSERT INTO posts(user_id,text,parent_id,created_at) VALUES (?,?,?,?)').run(ids[u], t, pid[i], T0 - minsAgo * 60000).lastInsertRowid;
reply('akhil', 0, 'Agreed. WAL mode + a single box gets you really far.', 590);
reply('demo', 0, 'What did you build?', 580);
reply('priya_codes', 2, 'Wait, really?? Mind blown.', 490);
reply('spacenerd', 2, '243 Earth days per rotation vs 225 per orbit 😄', 485);
reply('foodie_arjun', 9, 'Hard disagree, T20 forever', 210);
reply('rahul_cricket', 12, 'Welcome! 👋', 95);
reply('design_ananya', 12, 'Welcome aboard!', 90);
const follow = (a, b) => db.prepare('INSERT OR IGNORE INTO follows VALUES (?,?,?)').run(ids[a], ids[b], T0 - 864e5);
['akhil', 'priya_codes', 'spacenerd', 'design_ananya'].forEach(u => follow('demo', u));
['priya_codes', 'rahul_cricket', 'spacenerd', 'foodie_arjun', 'design_ananya'].forEach(u => follow(u, 'akhil'));
['priya_codes', 'spacenerd', 'design_ananya'].forEach(u => follow('akhil', u));
['rahul_cricket', 'foodie_arjun', 'spacenerd'].forEach(u => follow(u, 'priya_codes'));
['priya_codes', 'akhil'].forEach(u => follow(u, 'demo'));
follow('design_ananya', 'spacenerd'); follow('foodie_arjun', 'rahul_cricket');
const like = (u, i) => db.prepare('INSERT OR IGNORE INTO likes VALUES (?,?,?)').run(ids[u], pid[i], T0 - 3600000);
[[0, ['akhil', 'demo', 'spacenerd', 'design_ananya', 'rahul_cricket']], [2, ['priya_codes', 'akhil', 'demo', 'foodie_arjun']], [3, ['rahul_cricket', 'priya_codes']],
 [5, ['priya_codes', 'akhil', 'spacenerd']], [6, ['priya_codes', 'demo', 'design_ananya']], [8, ['akhil', 'design_ananya']], [12, ['akhil', 'priya_codes']], [13, ['priya_codes']]]
  .forEach(([i, us]) => us.forEach(u => like(u, i)));
const repost = (u, i, minsAgo) => db.prepare('INSERT INTO posts(user_id,text,repost_of,created_at) VALUES (?,?,?,?)').run(ids[u], '', pid[i], T0 - minsAgo * 60000);
repost('akhil', 7, 290); repost('spacenerd', 5, 170); repost('priya_codes', 13, 50);
// a couple of notifications for demo
const n = (to, from, type, i, m) => db.prepare('INSERT INTO notifications(user_id,actor_id,type,post_id,created_at) VALUES (?,?,?,?,?)').run(ids[to], ids[from], type, i == null ? null : pid[i], T0 - m * 60000);
n('demo', 'akhil', 'like', 12, 80); n('demo', 'priya_codes', 'like', 12, 70); n('demo', 'priya_codes', 'follow', null, 1440); n('demo', 'akhil', 'follow', null, 1400);
console.log('Seeded', users.length, 'users,', posts.length, 'posts. Login: demo / demo1234 (all demo users share this password)');
