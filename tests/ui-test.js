// Headless browser test + screenshots: node tests/ui-test.js [baseUrl]
const { chromium } = require('playwright-core');
const BASE = process.argv[2] || 'http://localhost:4180';
const OUT = __dirname + '/../screenshots';
const shots = process.argv.includes('--shots');
// Build a small solid-colour PNG in memory (no fixtures needed).
function makePng(w, h, [r, g, b]) {
  const zlib = require('zlib');
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const x of buf) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array(w).fill([r, g, b]).flat())]);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(Array(h).fill(row)))), chunk('IEND', Buffer.alloc(0))]);
}
const imgLoaded = (page, sel) => page.waitForFunction((s) => { const i = document.querySelector(s); return i && i.complete && i.naturalWidth > 0; }, sel, { timeout: 10000 });
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => d.accept());
  const step = (m) => console.log('  ✓', m);

  await page.goto(BASE + '/');
  await page.waitForSelector('form[data-form=auth]');
  if ((await page.title()) !== 'ZuZu') throw new Error('page title is not ZuZu: ' + await page.title());
  if (!(await page.textContent('.auth')).includes('ZuZu')) throw new Error('login page lacks ZuZu wordmark');
  if (/x ?clone/i.test(await page.content())) throw new Error('old X clone branding still on login page');
  step('login page shows ZuZu branding');
  const cfg = await (await fetch(BASE + '/api/config')).json();
  if (!cfg.google && await page.$('[data-google]')) throw new Error('Google button shown although Google sign-in is not configured');
  step('Google button ' + (cfg.google ? 'configured' : 'hidden (GOOGLE_CLIENT_ID not set)'));
  if (shots) await page.screenshot({ path: OUT + '/1-login.png' });
  step('login page');

  // sign up new user
  const u = 'ui' + Math.floor(Math.random() * 1e5);
  await page.click('text=Sign up');
  await page.fill('input[name=name]', 'UI Tester');
  await page.fill('input[name=username]', u);
  await page.fill('input[name=password]', 'secret123');
  await page.click('button[type=submit]');
  await page.waitForURL('**/home');
  step('signed up as ' + u);

  // post
  await page.fill('#home-composer textarea', 'My first post from the headless browser! #testing');
  await page.click('#home-composer button[type=submit]');
  await page.waitForSelector('#feed .post:has-text("headless browser")');
  step('created post');
  if (!(await page.textContent('.nav .logo')).includes('ZuZu')) throw new Error('nav wordmark missing');
  step('nav shows ZuZu wordmark');

  // post with image (stored in Postgres, served from /media/:id)
  await page.fill('#home-composer textarea', 'Posting a picture #testing');
  await page.setInputFiles('#home-composer input[name=image]', { name: 'blue.png', mimeType: 'image/png', buffer: makePng(320, 180, [29, 155, 240]) });
  await page.waitForSelector('#home-composer .preview:not([hidden])');
  await page.click('#home-composer button[type=submit]');
  await page.waitForSelector('#feed .post:has-text("Posting a picture") .media img[src^="/media/"]');
  await imgLoaded(page, '#feed .post .media img[src^="/media/"]');
  step('created post with image (served from /media)');

  // counter over limit disables button
  await page.fill('#home-composer textarea', 'a'.repeat(285));
  if (!(await page.isDisabled('#home-composer button[type=submit]'))) throw new Error('over-limit not disabled');
  await page.fill('#home-composer textarea', '');
  step('280 counter disables Post');

  // follow someone from explore, like, reply
  await page.goto(BASE + '/u/spacenerd');
  await page.click('.pf button:has-text("Follow")');
  await page.waitForSelector('.pf button:has-text("Following")');
  step('followed @spacenerd');
  const firstLike = page.locator('#feed .post .act.like').first();
  await firstLike.click();
  await page.waitForSelector('#feed .post .act.like.on');
  step('liked a post');
  await page.locator('#feed .post .act.reply').first().click();
  await page.fill('#modal-composer textarea', 'Great post! (reply from UI test)');
  await page.click('#modal-composer button[type=submit]');
  await page.waitForSelector('#modal-root:empty', { state: 'attached' });
  step('replied via modal');
  await page.locator('#feed .post .meta a[href^="/post/"]').first().click();
  await page.waitForSelector('#replies .post:has-text("reply from UI test")');
  step('reply visible in thread');
  await page.locator('.focus .act.rt').click();
  await page.waitForSelector('.focus .act.rt.on');
  step('reposted');

  // home feed now includes spacenerd
  await page.goto(BASE + '/home');
  await page.waitForSelector('#feed .post');
  await page.click('.tab:has-text("Following")');
  await page.waitForSelector('#feed .post:has-text("Meera Iyer")');
  step('home feed shows followed user');

  // edit profile
  await page.goto(BASE + '/u/' + u);
  await page.click('text=Edit profile');
  await page.fill('#edit-form textarea[name=bio]', 'I am a robot that tests things 🤖');
  await page.setInputFiles('#edit-form input[name=avatar]', { name: 'av.png', mimeType: 'image/png', buffer: makePng(96, 96, [249, 24, 128]) });
  await page.setInputFiles('#edit-form input[name=banner]', { name: 'bn.png', mimeType: 'image/png', buffer: makePng(600, 200, [0, 186, 124]) });
  await page.click('[data-action=save-profile]');
  await page.waitForSelector('.pf .bio:has-text("robot")');
  await page.waitForSelector('.pf img.avatar[src^="/media/"]');
  await imgLoaded(page, '.pf img.avatar');
  if (!/\/media\//.test(await page.getAttribute('.banner', 'style') || '')) throw new Error('banner not set');
  step('edited profile with avatar + banner');
  await page.reload(); await page.waitForSelector('.pf img.avatar[src^="/media/"]'); await imgLoaded(page, '.pf img.avatar');
  step('avatar persists after reload');

  // search
  await page.fill('.side input[name=q]', 'priya');
  await page.press('.side input[name=q]', 'Enter');
  await page.waitForSelector('#results .user-row:has-text("Priya")');
  step('search');

  // delete own post
  await page.goto(BASE + '/u/' + u);
  await page.waitForSelector('#feed .post:has-text("headless browser")');
  await page.locator('#feed .post:has-text("headless browser") .more').first().click();
  await page.click('.dropdown .danger');
  await page.waitForSelector('#feed .post:has-text("headless browser")', { state: 'detached' });
  step('deleted own post');

  // logout -> demo login
  await page.goto(BASE + '/home');
  await page.click('.me-chip'); await page.click('.menu button:has-text("Log out")');
  await page.waitForURL('**/login');
  await page.fill('input[name=username]', 'demo'); await page.fill('input[name=password]', 'demo1234');
  await page.click('button[type=submit]'); await page.waitForURL('**/home');
  step('logout + demo login');
  await page.goto(BASE + '/notifications');
  await page.waitForSelector('.notif');
  step('notifications page');

  if (shots) {
    await page.goto(BASE + '/home');
    await page.click('.tab:has-text("Following")');
    await page.waitForSelector('#feed .post'); await page.waitForTimeout(400);
    await page.screenshot({ path: OUT + '/2-home-feed.png' });
    await page.goto(BASE + '/u/priya_codes');
    await page.waitForSelector('#feed .post'); await page.waitForTimeout(400);
    await page.screenshot({ path: OUT + '/3-profile.png' });
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, storageState: await ctx.storageState() });
    const mp = await m.newPage();
    await mp.goto(BASE + '/home'); await mp.waitForSelector('#feed .post'); await mp.waitForTimeout(400);
    await mp.screenshot({ path: OUT + '/4-mobile-feed.png' });
    await mp.goto(BASE + '/u/demo'); await mp.waitForSelector('#feed .post'); await mp.waitForTimeout(400);
    await mp.screenshot({ path: OUT + '/5-mobile-profile.png' });
    step('screenshots saved');
  }
  await googleUi(browser, errors, step);
  console.log(errors.length ? 'JS errors:\n' + errors.join('\n') : 'No JS errors');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });

// Continue with Google against a local instance configured with a mock Google token endpoint.
async function googleUi(browser, errors, step) {
  if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) return console.log('  (skipping Google UI: needs a local server)');
  const { startMockGoogle, startGoogleApp, codeFor } = require('./google-server');
  const cid = 'ui-client.apps.googleusercontent.com', secret = 'ui-secret', PORT = 4189, GB = `http://localhost:${PORT}`;
  const mock = await startMockGoogle(cid, secret);
  const app = await startGoogleApp({ port: PORT, clientId: cid, clientSecret: secret, tokenUrl: mock.url, publicUrl: GB });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  try {
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(GB + '/login');
    await page.waitForSelector('a.btn-google[href="/auth/google"]:has-text("Continue with Google")');
    const order = await page.evaluate(() => { const g = document.querySelector('.btn-google'), o = document.querySelector('.auth .or'), f = document.querySelector('form[data-form=auth]'); return !!(g.compareDocumentPosition(o) & 4) && !!(o.compareDocumentPosition(f) & 4); });
    if (!order) throw new Error('Google button / "or" divider not above the form');
    await page.waitForTimeout(300);
    await page.screenshot({ path: OUT + '/7-google-login.png' });
    step('login page shows Continue with Google above "or" (screenshot 7-google-login.png)');
    await page.click('text=Sign up');
    await page.waitForSelector('form[data-mode=signup]'); await page.waitForSelector('a.btn-google[href="/auth/google"]');
    step('sign-up page shows Google button');
    await page.goto(GB + '/login?error=google');
    await page.waitForSelector('.auth .err:has-text("Couldn’t sign in with Google")');
    if (new URL(page.url()).search) throw new Error('error param not cleaned from URL');
    step('/login?error=google shows a friendly message');

    // Full flow: "Google" (intercepted) bounces straight back with a mock code for the same state.
    const rnd = Math.floor(Math.random() * 1e6);
    const picture = `https://lh3.googleusercontent.com/a/ui-test-${rnd}=s96-c`;
    // Chromium doesn't hand server-side redirects to page.route, so wrap /auth/google itself:
    // let the app answer (state cookie + redirect to Google), then point that redirect at the callback.
    await page.route(GB + '/auth/google', async (route) => {
      const resp = await route.fetch({ maxRedirects: 0 });
      const u = new URL(resp.headers()['location']);
      if (u.origin !== 'https://accounts.google.com') throw new Error('not redirected to Google: ' + u);
      const code = codeFor({ sub: 'ui' + rnd, email: `ui.google${rnd}@gmail.com`, name: 'UI Googler', picture });
      await route.fulfill({ status: 302, headers: { ...resp.headers(), location: `${u.searchParams.get('redirect_uri')}?code=${code}&state=${u.searchParams.get('state')}` } });
    });
    await page.route('https://lh3.googleusercontent.com/**', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: makePng(96, 96, [66, 133, 244]) }));
    await page.goto(GB + '/login');
    await page.click('a.btn-google');
    try { await page.waitForURL('**/home', { timeout: 10000 }); } catch (e) { throw new Error('Google flow did not reach /home; at ' + page.url() + '\n' + app.log()); }
    const sel = `.nav .me-chip img.avatar[src^="https://lh3.googleusercontent.com/"]`;
    await page.waitForSelector(sel);
    if (await page.getAttribute(sel, 'referrerpolicy') !== 'no-referrer') throw new Error('external avatar lacks referrerpolicy=no-referrer');
    await imgLoaded(page, sel);
    if (!(await page.textContent('.me-chip')).includes('@ui.google' + rnd)) throw new Error('unexpected username after Google sign-in');
    step('Continue with Google signs in a new user (@ui.google' + rnd + ') and shows the Google avatar');
    await page.goto(GB + '/u/ui.google' + rnd);
    try { await imgLoaded(page, '.pf img.avatar[src^="https://"]'); } catch (e) { throw new Error('profile avatar: ' + page.url() + ' ' + await page.evaluate(() => (document.querySelector('#profile') || document.body).innerHTML.slice(0, 600))); }
    step('external avatar renders on profile');
  } finally {
    await ctx.close(); app.child.kill(); mock.srv.close();
  }
}
