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
  await expectAppLink(page, '.auth .get-app-auth a[data-get-app]', 'login page');
  const linkBelowForm = await page.evaluate(() => !!(document.querySelector('form[data-form=auth]').compareDocumentPosition(document.querySelector('.get-app-auth')) & 4));
  if (!linkBelowForm) throw new Error('Get the Android app link is not under the login form');
  if (!(await page.textContent('.get-app-auth')).includes('Requires Chrome. Allow install from unknown sources.')) throw new Error('install note missing on login page');
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '/8-download-login.png' });
  step('login page shows "Get the Android app" + note under the form (screenshot 8-download-login.png)');

  // sign up new user
  const u = 'ui' + Math.floor(Math.random() * 1e5);
  await page.click('text=Sign up');
  await page.waitForSelector('form[data-mode=signup]');
  await expectAppLink(page, '.auth .get-app-auth a[data-get-app]', 'sign-up page');
  step('sign-up page shows "Get the Android app"');
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
  await expectAppLink(page, '.nav a.nav-app[data-get-app]', 'left nav');
  await expectAppLink(page, '.side #app-card a[data-get-app]', 'right sidebar card');
  if (!(await page.textContent('#app-card')).includes('Requires Chrome. Allow install from unknown sources.')) throw new Error('install note missing in sidebar card');
  if (await page.isVisible('#app-banner')) throw new Error('mobile app banner should not show on desktop');
  step('logged-in desktop: "Get the Android app" in left nav + sidebar card (no mobile banner)');

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
  console.log('\n  Direct messages');
  await dmUi(browser, errors, step);
  await dmShots(browser, await ctx.storageState(), step);
  await downloadUi(browser, errors, step, await ctx.storageState());
  await googleUi(browser, errors, step);
  console.log('\n  ZuZu AI');
  await aiUi(browser, errors, step, await ctx.storageState());
  console.log(errors.length ? 'JS errors:\n' + errors.join('\n') : 'No JS errors');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });

// ---------- Android app download link ----------
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';
const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
async function expectAppLink(page, sel, where) {
  await page.waitForSelector(sel, { state: 'visible', timeout: 5000 }).catch(() => { throw new Error(`"Get the Android app" not visible in ${where} (${sel})`); });
  const href = await page.getAttribute(sel, 'href');
  if (href !== '/download/ZuZu.apk') throw new Error(`${where}: link href is ${href}`);
  if (!(await page.$(sel + ' svg'))) throw new Error(`${where}: Android icon missing`);
}
const APP_LINK_SEL = '[data-get-app], #app-card, #app-banner, .get-app-auth';
async function expectNoAppLink(page, where) {
  const n = await page.$$eval(APP_LINK_SEL, (els) => els.length);
  if (n) throw new Error(`"Get the Android app" should be hidden (${where}) but ${n} element(s) found`);
}
async function downloadUi(browser, errors, step, loggedIn) {
  const watch = (p) => { p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); };
  const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

  // Android phone browser: dismissible banner at the top of the home feed, remembered in localStorage.
  let c = await browser.newContext({ ...mobile, userAgent: ANDROID_UA, storageState: loggedIn });
  let p = await c.newPage(); watch(p);
  await p.goto(BASE + '/home'); await p.waitForSelector('#feed .post');
  await expectAppLink(p, '#app-banner a[data-get-app]', 'mobile home banner');
  const atTop = await p.evaluate(() => { const b = document.querySelector('#app-banner'), f = document.querySelector('#home-composer'); return !!(b.compareDocumentPosition(f) & 4); });
  if (!atTop) throw new Error('banner is not at the top of the home feed');
  if (!(await p.textContent('#app-banner')).includes('Requires Chrome. Allow install from unknown sources.')) throw new Error('install note missing in banner');
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT + '/9-download-mobile.png' });
  step('Android mobile: banner at top of home feed (screenshot 9-download-mobile.png)');
  await p.click('#app-banner [data-action="dismiss-app-banner"]');
  await p.waitForSelector('#app-banner', { state: 'detached' });
  if (await p.evaluate(() => localStorage.getItem('zuzu.appBannerDismissed')) !== '1') throw new Error('dismissal not stored in localStorage');
  await p.reload(); await p.waitForSelector('#feed .post');
  if (await p.$('#app-banner')) throw new Error('banner came back after dismissal + reload');
  step('banner dismissal remembered in localStorage');
  await c.close();
  c = await browser.newContext({ ...mobile, userAgent: ANDROID_UA });
  p = await c.newPage(); watch(p);
  await p.goto(BASE + '/login'); await p.waitForSelector('form[data-form=auth]');
  await expectAppLink(p, '.get-app-auth a[data-get-app]', 'Android login page');
  step('Android mobile login page shows the link');
  await c.close();

  // Inside the app: display-mode standalone, ?source=twa (kept in sessionStorage), android-app:// referrer.
  const standalone = () => {
    const orig = window.matchMedia.bind(window);
    window.matchMedia = (q) => /display-mode:\s*standalone/.test(q)
      ? { matches: true, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } }
      : orig(q);
  };
  const cases = [
    ['display-mode standalone', { init: standalone }],
    ['?source=twa', { query: '?source=twa' }],
    ['android-app://com.zuzu.app referrer', { init: () => Object.defineProperty(Document.prototype, 'referrer', { get: () => 'android-app://com.zuzu.app' }) }],
  ];
  for (const [name, { init, query = '' }] of cases) {
    for (const [label, opts] of [['desktop', { viewport: { width: 1366, height: 900 } }], ['Android', { ...mobile, userAgent: ANDROID_UA }]]) {
      c = await browser.newContext(opts);
      if (init) await c.addInitScript(init);
      p = await c.newPage(); watch(p);
      await p.goto(BASE + '/login' + query); await p.waitForSelector('form[data-form=auth]');
      await expectNoAppLink(p, `${name}, ${label} login`);
      await p.click('text=Sign up'); await p.waitForSelector('form[data-mode=signup]');
      await expectNoAppLink(p, `${name}, ${label} sign-up`);
      await p.click('text=Sign in'); await p.waitForSelector('form[data-mode=login]');
      await p.fill('input[name=username]', 'demo'); await p.fill('input[name=password]', 'demo1234');
      await p.click('button[type=submit]'); await p.waitForURL('**/home'); await p.waitForSelector('#feed .post');
      await expectNoAppLink(p, `${name}, ${label} home`);
      if (query) {
        await p.goto(BASE + '/explore'); await p.waitForSelector('#feed .post');
        await expectNoAppLink(p, `${name}, ${label} after full reload without the flag`);
      }
      await c.close();
    }
    step(`hidden inside the Android app (${name}): login, sign-up, nav, sidebar, banner`);
  }

  // iOS: never shown.
  for (const [label, opts] of [['iPhone', { ...mobile, userAgent: IOS_UA }], ['iPad (desktop UA)', { viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15' }]]) {
    const ipadTouch = () => Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => 5 }); // real iPads report 5
    c = await browser.newContext({ ...opts, storageState: loggedIn }); await c.addInitScript(ipadTouch);
    p = await c.newPage(); watch(p);
    await p.goto(BASE + '/home'); await p.waitForSelector('#feed .post');
    await expectNoAppLink(p, label + ' home');
    await c.close();
    c = await browser.newContext(opts); await c.addInitScript(ipadTouch);
    p = await c.newPage(); watch(p);
    await p.goto(BASE + '/login'); await p.waitForSelector('form[data-form=auth]');
    await expectNoAppLink(p, label + ' login');
    await c.close();
  }
  step('hidden on iOS (iPhone + iPad)');
}

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

// ---------- direct messages ----------
async function dmUi(browser, errors, step) {
  const rnd = Math.floor(Math.random() * 1e5);
  const watch = (p) => { p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); p.on('dialog', d => d.accept()); };
  const desktop = { viewport: { width: 1366, height: 900 } };
  const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  async function user(name) {
    const ctx = await browser.newContext(desktop);
    const r = await ctx.request.post(BASE + '/api/signup', { data: { username: name + rnd, password: 'secret123', name: name[0].toUpperCase() + name.slice(1) } });
    if (!r.ok()) throw new Error('signup failed for ' + name);
    const page = await ctx.newPage(); watch(page);
    return { ctx, page, username: name + rnd };
  }
  const alice = await user('alice'), bob = await user('bob');
  const A = alice.page, B = bob.page;
  const must = async (cond, msg) => { if (!(await cond)) throw new Error(msg); };

  // Bob sits on the home page; his Messages badge must appear without a reload once Alice writes.
  await B.goto(BASE + '/home'); await B.waitForSelector('#feed');
  await must(B.isVisible('.nav a.nav-item[href="/messages"]:has-text("Messages") svg'), 'Messages nav item with icon missing');
  await must(B.isVisible('.bottom-nav a[href="/messages"]').then(v => !v), 'bottom nav should be hidden on desktop');
  if (await B.$('.nav a[href="/messages"] [data-dm-badge]')) throw new Error('badge shown with no unread DMs');
  step('left nav has Messages with envelope icon (no badge yet)');

  // Profile "Message" button opens (creates) the chat.
  await A.goto(BASE + '/u/' + bob.username);
  await A.waitForSelector('.pf button[data-action="dm-user"][aria-label="Message"] svg');
  await A.click('.pf button[data-action="dm-user"]');
  await A.waitForURL(/\/messages\/\d+$/);
  const convUrl = A.url();
  await A.waitForSelector(`.dm-chat-head .dm-peer:has-text("@${bob.username}")`);
  await A.waitForSelector('.dm-hello');
  step('profile Message button opens a new chat with @' + bob.username);
  await must(A.evaluate(() => { const l = document.querySelector('.dm-list'), c = document.querySelector('.dm-chat'); const a = l.getBoundingClientRect(), b = c.getBoundingClientRect(); return a.width > 200 && b.width > 400 && a.right <= b.left + 1 && getComputedStyle(l).display !== 'none'; }), 'desktop is not two-pane');
  await A.waitForSelector(`.dm-conv.active:has-text("@${bob.username}")`);
  step('desktop two-pane layout: list + chat, active conversation highlighted');

  // Enter to send; Shift+Enter for a new line; textarea grows.
  const ta = '#dm-compose textarea';
  const h0 = await A.$eval(ta, e => e.offsetHeight);
  await A.click(ta);
  await A.keyboard.type('line one'); for (const l of ['two', 'three', 'four']) { await A.keyboard.press('Shift+Enter'); await A.keyboard.type('line ' + l); }
  const h1 = await A.$eval(ta, e => e.offsetHeight);
  if (!(h1 > h0 + 30)) throw new Error(`textarea did not grow (${h0} -> ${h1})`);
  await A.keyboard.press('Enter');
  await A.waitForSelector('.msg.mine .bubble:has-text("line four")');
  if (!(await A.$eval('.msg.mine .bubble', e => e.textContent)).includes('line one\nline two')) throw new Error('newlines lost');
  if (await A.$eval(ta, e => e.value) !== '') throw new Error('composer not cleared after send');
  step('Enter sends, Shift+Enter adds a line, textarea grows and resets');

  // XSS is shown as text; URLs become safe links.
  const evil = `<img src=x onerror="window.__xss=1"><b>bold</b><script>window.__xss=2</script> see https://example.com/path?q=1&r=2.`;
  await A.fill(ta, evil); await A.press(ta, 'Enter');
  await A.waitForSelector('.msg.mine .bubble:has-text("<b>bold</b>")');
  const res = await A.evaluate(() => {
    const b = [...document.querySelectorAll('.msg.mine .bubble')].pop();
    const a = b.querySelector('a');
    return { imgs: b.querySelectorAll('img,script,b').length, text: b.textContent, href: a && a.getAttribute('href'), rel: a && a.rel, target: a && a.target, xss: window.__xss };
  });
  if (res.imgs || res.xss) throw new Error('XSS: markup rendered in a message ' + JSON.stringify(res));
  if (!res.text.includes('<img src=x onerror="window.__xss=1">')) throw new Error('escaped text not shown verbatim');
  if (res.href !== 'https://example.com/path?q=1&r=2' || !/noopener/.test(res.rel) || res.target !== '_blank') throw new Error('URL not linkified safely: ' + JSON.stringify(res));
  step('XSS text is escaped (shown literally, nothing executes); URL linkified without trailing "."');

  // Image attach.
  await A.setInputFiles('#dm-compose input[name=image]', { name: 'pic.png', mimeType: 'image/png', buffer: makePng(200, 120, [255, 122, 0]) });
  await A.waitForSelector('#dm-compose .dm-preview:not([hidden]) img');
  await A.click('#dm-compose button.send');
  await A.waitForSelector('.msg.mine img.dm-img[src^="/media/"]');
  await imgLoaded(A, '.msg.mine img.dm-img');
  await must(A.isHidden('#dm-compose .dm-preview'), 'image preview not cleared');
  step('attach + send an image');

  // Badge updates on Bob's page by polling (no reload).
  await B.waitForSelector('.nav a[href="/messages"] [data-dm-badge]:has-text("3")', { timeout: 25000 });
  step('recipient\'s unread badge updates live (3)');
  await B.click('.nav a[href="/messages"]');
  await B.waitForSelector(`.dm-conv.unread:has-text("@${alice.username}") .dm-dot:has-text("3")`);
  step('inbox shows the conversation as unread with a count');
  await B.click(`.dm-conv:has-text("@${alice.username}")`);
  await B.waitForSelector('.msg.theirs img.dm-img');
  await B.waitForSelector('.nav a[href="/messages"] [data-dm-badge]', { state: 'detached' });
  step('opening the chat marks it read and clears the badge');
  const style = await B.evaluate(() => {
    const t = document.querySelector('.msg.theirs .bubble'), el = document.querySelector('#dm-msgs');
    return { bg: getComputedStyle(t).backgroundColor, left: t.getBoundingClientRect().left - el.getBoundingClientRect().left, bottom: Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) };
  });
  if (style.bg !== 'rgb(47, 51, 54)' || style.left > 40) throw new Error('their bubble should be grey, on the left: ' + JSON.stringify(style));
  if (style.bottom > 5) throw new Error('chat did not auto-scroll to bottom: ' + style.bottom);
  step('their messages: grey on the left; chat auto-scrolled to the bottom');

  // Seen on Alice's side; Bob's reply arrives on Alice's side by polling.
  await A.waitForSelector('.msg.mine .seen:has-text("Seen")', { timeout: 10000 });
  if (await A.$$eval('.msg .seen', l => l.length) !== 1) throw new Error('Seen should only be under the last own message');
  await must(A.evaluate(() => { const ms = [...document.querySelectorAll('.msg')]; return ms.at(-1).classList.contains('mine') && !!ms.at(-1).querySelector('.seen'); }), 'Seen is not under the last message');
  step('"Seen" shows under Alice\'s last message once Bob reads');
  await B.fill(ta, 'Hey Alice! 👋'); await B.press(ta, 'Enter');
  await B.waitForSelector('.msg.mine .bubble:has-text("Hey Alice!")');
  const mine = await B.evaluate(() => { const b = [...document.querySelectorAll('.msg.mine .bubble')].pop(), el = document.querySelector('#dm-msgs'); return { bg: getComputedStyle(b).backgroundColor, right: el.getBoundingClientRect().right - b.getBoundingClientRect().right }; });
  if (mine.bg !== 'rgb(29, 155, 240)' || mine.right > 40) throw new Error('own bubble should be blue, on the right: ' + JSON.stringify(mine));
  step('own messages: blue on the right');
  await A.waitForSelector('.msg.theirs .bubble:has-text("Hey Alice!")', { timeout: 10000 });
  step('reply arrives in the open chat within the 3s poll');
  if (!(await A.$('.msg time'))) throw new Error('timestamps missing');

  // Delete own message (only own messages have a delete button).
  if (await A.$('.msg.theirs .msg-del')) throw new Error('delete button on someone else\'s message');
  const before = await A.$$eval('.msg.mine', l => l.length);
  await A.hover('.msg.mine >> nth=0'); await A.click('.msg.mine >> nth=0 >> .msg-del');
  await A.waitForFunction((n) => document.querySelectorAll('.msg.mine').length === n - 1, before);
  step('delete own message');

  // Load older on scroll up.
  const cid = +convUrl.split('/').pop();
  for (let i = 0; i < 20; i++) await alice.ctx.request.post(`${BASE}/api/dm/conversations/${cid}/messages`, { data: { text: 'bulk A ' + i } });
  for (let i = 0; i < 20; i++) await bob.ctx.request.post(`${BASE}/api/dm/conversations/${cid}/messages`, { data: { text: 'bulk B ' + i } });
  await A.reload(); await A.waitForSelector('.msg .bubble:has-text("bulk B 19")');
  const n1 = await A.$$eval('.msg', l => l.length);
  if (n1 !== 30 || !(await A.$('.dm-older'))) throw new Error('expected 30 messages and a load-older control, got ' + n1);
  await A.$eval('#dm-msgs', el => { el.scrollTop = 0; });
  await A.waitForFunction(() => document.querySelectorAll('.msg').length > 30);
  await A.waitForSelector('.dm-older', { state: 'detached' });
  await A.waitForSelector('.msg .bubble:has-text("<b>bold</b>")');
  const keep = await A.$eval('#dm-msgs', el => el.scrollTop);
  if (keep < 50) throw new Error('scroll position jumped to the top after loading older');
  step(`scrolling up loads older messages (${n1} -> ${await A.$$eval('.msg', l => l.length)}), keeping position`);

  // New message search in the inbox.
  await A.goto(BASE + '/messages');
  await A.waitForSelector('.dm-pick:has-text("Select a message")');
  await A.fill('form[data-form="dm-new"] input', 'priya');
  await A.waitForSelector('#dm-results .dm-result[data-username="priya_codes"]');
  await A.click('#dm-results .dm-result[data-username="priya_codes"]');
  await A.waitForSelector('.dm-chat-head:has-text("@priya_codes")');
  step('inbox search starts a new message by username');

  // Mobile: list page, then full-screen chat with a back button.
  const m = await browser.newContext({ ...mobile, storageState: await bob.ctx.storageState() });
  const mp = await m.newPage(); watch(mp);
  await mp.goto(BASE + '/home'); await mp.waitForSelector('#feed');
  await mp.waitForSelector('.bottom-nav a[href="/messages"] svg', { state: 'visible' });
  await mp.click('.bottom-nav a[href="/messages"]');
  await mp.waitForSelector(`.dm-conv:has-text("@${alice.username}")`);
  await must(mp.isHidden('.dm-chat'), 'mobile list page should not show the chat pane');
  await must(mp.isVisible('.bottom-nav'), 'bottom nav should show on the mobile inbox');
  step('mobile: Messages tab in bottom bar -> inbox list');
  await mp.click(`.dm-conv:has-text("@${alice.username}")`);
  await mp.waitForSelector('.msg .bubble:has-text("bulk B 19")');
  const lay = await mp.evaluate(() => { const c = document.querySelector('.dm-chat').getBoundingClientRect(), f = document.querySelector('#dm-compose').getBoundingClientRect(); return { w: c.width, h: c.height, top: c.top, fBottom: f.bottom, nav: getComputedStyle(document.querySelector('.bottom-nav')).display, list: getComputedStyle(document.querySelector('.dm-list')).display, back: getComputedStyle(document.querySelector('.dm-back')).display }; });
  if (lay.w !== 390 || lay.top !== 0 || Math.abs(lay.h - 844) > 2 || lay.nav !== 'none' || lay.list !== 'none' || lay.back === 'none' || lay.fBottom > 845) throw new Error('mobile chat is not full-screen: ' + JSON.stringify(lay));
  step('mobile: chat is full-screen with a back button (no bottom bar)');
  await mp.click('.dm-back');
  await mp.waitForURL('**/messages'); await mp.waitForSelector('.dm-list', { state: 'visible' });
  await must(mp.isVisible('.bottom-nav'), 'bottom nav should come back');
  step('mobile: back button returns to the inbox');
  await m.close(); await alice.ctx.close(); await bob.ctx.close();
}

// Screenshots 10/11: demo user with a chat open (desktop two-pane + mobile full-screen chat).
async function dmShots(browser, loggedIn, step) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, storageState: loggedIn });
  const p = await ctx.newPage();
  await p.goto(BASE + '/messages'); await p.waitForSelector('.dm-conv');
  await p.click('.dm-conv:has-text("@priya_codes")'); await p.waitForSelector('.msg'); await p.waitForTimeout(500);
  await p.screenshot({ path: OUT + '/10-dm-desktop.png' });
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, storageState: loggedIn });
  const mp = await m.newPage();
  await mp.goto(BASE + '/messages'); await mp.waitForSelector('.dm-conv');
  await mp.click('.dm-conv:has-text("@akhil")'); await mp.waitForSelector('.msg'); await mp.waitForTimeout(500);
  await mp.screenshot({ path: OUT + '/11-dm-mobile.png' });
  await ctx.close(); await m.close();
  step('DM screenshots saved (10-dm-desktop.png, 11-dm-mobile.png)');
}

// ---------- ZuZu AI: button on posts, panel, streaming chips, follow-ups, mobile bottom sheet ----------
async function aiUi(browser, errors, step, loggedIn) {
  const watch = (p) => { p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); };
  const must = async (cond, msg) => { if (!(await cond)) throw new Error(msg); };
  // Main server: button shown exactly when /api/config says ai:true (never clicked here, so no real AI calls).
  const cfg = await (await fetch(BASE + '/api/config')).json();
  let c = await browser.newContext({ viewport: { width: 1366, height: 900 }, storageState: loggedIn });
  let p = await c.newPage(); watch(p);
  await p.goto(BASE + '/explore'); await p.waitForSelector('#feed .post');
  const n = await p.$$eval('#feed .post .ai-btn', l => l.length);
  if (cfg.ai ? n === 0 : n > 0) throw new Error(`main server: ai=${cfg.ai} but ${n} AI buttons`);
  await c.close();
  step(`main server (${BASE}): AI button ${cfg.ai ? 'shown' : 'hidden'}, matching /api/config ai=${cfg.ai}`);
  if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) return console.log('  (skipping ZuZu AI UI: needs a local server)');

  const { startMockGroq, startApp } = require('./ai-server');
  const mock = await startMockGroq({ chunkDelay: 40 });
  const off = await startApp({ port: 4195 });
  const on = await startApp({ port: 4194, ai: { baseUrl: mock.url } });
  const login = async (base, opts) => {
    const ctx = await browser.newContext(opts);
    const r = await ctx.request.post(base + '/api/login', { data: { username: 'demo', password: 'demo1234' } });
    if (!r.ok()) throw new Error('demo login failed');
    const page = await ctx.newPage(); watch(page);
    return { ctx, page };
  };
  const desktop = { viewport: { width: 1366, height: 900 } };
  const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  try {
    // Not configured: no button anywhere.
    ({ ctx: c, page: p } = await login(off.url, desktop));
    for (const path of ['/explore', '/u/priya_codes']) {
      await p.goto(off.url + path); await p.waitForSelector('#feed .post');
      if (await p.$('.ai-btn')) throw new Error('AI button shown without GROQ_API_KEY on ' + path);
    }
    await p.goto(off.url + '/post/1'); await p.waitForSelector('.focus');
    if (await p.$('.ai-btn')) throw new Error('AI button shown without GROQ_API_KEY on the thread view');
    await c.close();
    step('not configured (ai:false): no AI button in feed, profile or thread');

    // Configured: a button on every post in feed, thread and profile.
    ({ ctx: c, page: p } = await login(on.url, desktop));
    const A = p;
    await A.goto(on.url + '/explore'); await A.waitForSelector('#feed .post .ai-btn');
    const counts = await A.evaluate(() => [document.querySelectorAll('#feed .post').length, document.querySelectorAll('#feed .post .meta .ai-btn[aria-label="Ask ZuZu AI"] svg').length]);
    if (!counts[0] || counts[0] !== counts[1]) throw new Error('AI button not on every feed post: ' + counts);
    const place = await A.evaluate(() => { const post = document.querySelector('#feed .post'), b = post.querySelector('.ai-btn').getBoundingClientRect(), r = post.getBoundingClientRect(), more = post.querySelector('.more').getBoundingClientRect(); return { right: r.right - b.right, top: b.top - r.top, beforeMore: b.right <= more.left + 1 }; });
    if (place.right > 70 || place.top > 30 || !place.beforeMore) throw new Error('AI button not at the top-right of the post: ' + JSON.stringify(place));
    await A.goto(on.url + '/u/priya_codes'); await A.waitForSelector('#feed .post');
    await must(A.evaluate(() => [...document.querySelectorAll('#feed .post')].every(p => p.querySelector('.ai-btn'))), 'AI button missing on profile posts');
    await A.goto(on.url + '/post/1'); await A.waitForSelector('#replies .post');
    await must(A.evaluate(() => !!document.querySelector('.focus .head .ai-btn') && [...document.querySelectorAll('#replies .post')].every(p => p.querySelector('.ai-btn'))), 'AI button missing in thread view');
    step(`configured (ai:true): "Ask ZuZu AI" sparkle at the top-right of every post (${counts[0]} in feed, profile, thread + replies)`);

    // Open the panel from the focused post.
    const url0 = A.url();
    await A.click('.focus .ai-btn');
    await A.waitForSelector('#ai-root.in .ai-panel[role=dialog]');
    await A.waitForTimeout(350);
    if (A.url() !== url0) throw new Error('clicking the AI button navigated away');
    const postText = await A.textContent('.focus .text');
    await must(A.evaluate((t) => document.querySelector('.ai-post .t').textContent === t, postText), 'panel does not show the post');
    const chips = await A.$$eval('.ai-chip', l => l.map(x => x.textContent.trim()));
    for (const label of ['Explain this post', 'Give context', 'Summarize the replies', 'Fact-check']) if (!chips.includes(label)) throw new Error('missing chip ' + label + ': ' + chips);
    if (!chips.some(l => /^Translate to (Hindi|English)$/.test(l))) throw new Error('missing translate chip: ' + chips);
    const box = await A.$eval('.ai-panel', e => { const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, h: r.height, w: r.width }; });
    if (Math.abs(box.right - 1366) > 1 || box.top !== 0 || box.h !== 900 || box.w !== 440) throw new Error('desktop panel should be a full-height right side panel: ' + JSON.stringify(box));
    await must(A.evaluate(() => document.activeElement && document.activeElement.matches('.ai-ask textarea')), 'question box not focused on open');
    step('panel opens as a right side panel on desktop: post + chips (' + chips.join(', ') + ') + question box');

    // Chip -> streamed answer, rendered as safe markdown.
    await A.click('.ai-chip:has-text("Explain this post")');
    await A.waitForSelector('.ai-q:has-text("Explain this post")');
    await A.waitForSelector('.ai-a.streaming .ai-md:not(:empty)');
    const partial = await A.$eval('.ai-a .ai-md', e => e.textContent.length);
    await must(A.evaluate(() => [...document.querySelectorAll('.ai-chip')].every(b => b.disabled)), 'chips should be disabled while answering');
    await A.waitForSelector('.ai-a:not(.streaming)', { timeout: 10000 });
    const ans = await A.$eval('.ai-a .ai-md', e => ({ text: e.textContent, strong: e.querySelectorAll('strong').length, li: e.querySelectorAll('ul li').length, a: e.querySelector('a') && { href: e.querySelector('a').getAttribute('href'), target: e.querySelector('a').target, rel: e.querySelector('a').rel } }));
    if (!(partial > 0 && partial < ans.text.length)) throw new Error(`answer did not stream (partial ${partial}, final ${ans.text.length})`);
    if (!ans.text.includes('Mock answer (turn 1) to action "Explain this post"') || ans.strong !== 1 || ans.li !== 2) throw new Error('markdown not rendered: ' + JSON.stringify(ans));
    if (!ans.a || ans.a.href !== 'https://example.com/docs' || ans.a.target !== '_blank' || !/noopener/.test(ans.a.rel)) throw new Error('link not rendered safely: ' + JSON.stringify(ans.a));
    await must(A.evaluate(() => [...document.querySelectorAll('.ai-chip')].every(b => !b.disabled)), 'chips not re-enabled');
    const ctxMsg = mock.calls.at(-1).body.messages[1].content;
    if (!ctxMsg.includes(JSON.stringify(postText).slice(1, 30))) throw new Error('post text not sent as context');
    step(`chip "Explain this post" streams an answer (${partial} -> ${ans.text.length} chars), rendered as markdown (bold, list, safe link)`);
    await A.screenshot({ path: OUT + '/12-ai-desktop.png' });
    step('screenshot 12-ai-desktop.png');

    // Follow-up keeps the conversation.
    await A.fill('.ai-ask textarea', 'Is this a good idea for beginners?');
    await A.press('.ai-ask textarea', 'Enter');
    await A.waitForSelector('.ai-q:has-text("Is this a good idea for beginners?")');
    await A.waitForSelector('.ai-a >> nth=1 >> .ai-md:has-text("(turn 2)")');
    await A.waitForSelector('.ai-a.streaming', { state: 'detached' });
    const hist = mock.calls.at(-1).body.messages;
    if (hist.length !== 5 || hist[2].content !== 'Explain this post' || hist[3].role !== 'assistant' || !hist[3].content.includes('Mock answer')) throw new Error('follow-up did not send the conversation history');
    if (await A.$eval('.ai-ask textarea', e => e.value) !== '') throw new Error('question box not cleared');
    step('follow-up question answered in the same panel (history sent)');

    // Untrusted output is escaped.
    await A.fill('.ai-ask textarea', 'MOCK_XSS please'); await A.press('.ai-ask textarea', 'Enter');
    await A.waitForSelector('.ai-a >> nth=2 >> .ai-md:has-text("is fine")');
    await A.waitForSelector('.ai-a.streaming', { state: 'detached' });
    const x = await A.evaluate(() => { const md = document.querySelectorAll('.ai-a .ai-md')[2]; return { bad: md.querySelectorAll('img,script').length, links: [...md.querySelectorAll('a')].map(a => a.getAttribute('href')), text: md.textContent, xss: window.__aiXss }; });
    if (x.bad || x.xss || x.links.length || !x.text.includes('<img src=x onerror=')) throw new Error('AI answer not escaped: ' + JSON.stringify(x));
    step('HTML/script/javascript: links in an answer are shown as text, nothing executes');

    // Friendly error. (Chrome logs the expected 502 response to the console; that one entry is not a JS error.)
    const nErr = errors.length;
    await A.fill('.ai-ask textarea', 'MOCK_HTTP_500'); await A.press('.ai-ask textarea', 'Enter');
    await A.waitForSelector('.ai-a.err .ai-err:has-text("ZuZu AI couldn’t answer right now")');
    await A.waitForTimeout(200);
    const extra = errors.splice(nErr);
    errors.push(...extra.filter(e => !/status of 502 \(Bad Gateway\)/.test(e)));
    if (extra.length - (errors.length - nErr) !== 1) throw new Error('expected exactly one logged 502: ' + extra.join(' | '));
    step('Groq error shows a friendly message in the panel');

    // Question length cap in the UI.
    await A.fill('.ai-ask textarea', 'x'.repeat(600));
    if ((await A.$eval('.ai-ask textarea', e => e.value.length)) !== 500) throw new Error('question box not capped at 500');
    await A.fill('.ai-ask textarea', '');

    // Escape closes and returns focus.
    await A.keyboard.press('Escape');
    await A.waitForSelector('#ai-root', { state: 'detached' });
    await must(A.evaluate(() => document.activeElement && document.activeElement.matches('.focus .ai-btn')), 'focus not returned to the AI button');
    await must(A.evaluate(() => document.body.style.overflow !== 'hidden' && !document.body.classList.contains('ai-open')), 'page scroll not restored');
    step('Escape closes the panel and returns focus to the button');
    // Opening from the feed, then navigating closes the panel.
    await A.goto(on.url + '/explore'); await A.waitForSelector('#feed .post .ai-btn');
    await A.locator('#feed .post .ai-btn').first().click(); await A.waitForSelector('#ai-root.in');
    await A.click('#ai-root [data-ai-bg]', { position: { x: 100, y: 100 } });
    await A.waitForSelector('#ai-root', { state: 'detached' });
    if (!A.url().endsWith('/explore')) throw new Error('feed click on AI button navigated');
    step('feed: button opens the panel without opening the post; clicking outside closes it');
    await c.close();

    // Mobile bottom sheet.
    const { ctx: m, page: M } = await login(on.url, mobile);
    await M.goto(on.url + '/home'); await M.waitForSelector('#feed .post .ai-btn');
    await M.locator('#feed .post .ai-btn').first().tap();
    await M.waitForSelector('#ai-root.in .ai-panel'); await M.waitForTimeout(350);
    const sheet = await M.evaluate(() => { const r = document.querySelector('.ai-panel').getBoundingClientRect(), a = document.querySelector('.ai-ask').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, w: r.width, h: r.height, radius: getComputedStyle(document.querySelector('.ai-panel')).borderTopLeftRadius, grab: getComputedStyle(document.querySelector('.ai-grab')).display, askBottom: a.bottom }; });
    if (sheet.w !== 390 || Math.abs(sheet.bottom - 844) > 1 || sheet.top < 60 || sheet.top > 200 || sheet.radius === '0px' || sheet.grab === 'none' || sheet.askBottom > 844) throw new Error('mobile panel is not a bottom sheet: ' + JSON.stringify(sheet));
    step('mobile: panel is a bottom sheet (' + Math.round(sheet.h) + 'px tall, rounded, drag handle)');
    await M.locator('.ai-chip').first().tap();
    await M.waitForSelector('.ai-a.streaming .ai-md:not(:empty)');
    await M.waitForSelector('.ai-a:not(.streaming) .ai-md:has-text("Mock answer")', { timeout: 10000 });
    await M.fill('.ai-ask textarea', 'Who wrote it?'); await M.locator('.ai-send').tap();
    await M.waitForSelector('.ai-a >> nth=1 >> .ai-md:has-text("(turn 2)")');
    await M.waitForSelector('.ai-a.streaming', { state: 'detached' });
    step('mobile: chip streams an answer and a follow-up works');
    await M.screenshot({ path: OUT + '/13-ai-mobile.png' });
    step('screenshot 13-ai-mobile.png');
    await M.locator('[data-ai-bg]').tap({ position: { x: 195, y: 30 } });
    await M.waitForSelector('#ai-root', { state: 'detached' });
    step('mobile: tapping outside the sheet closes it');
    await m.close();
  } finally {
    on.child.kill(); off.child.kill(); mock.srv.close();
  }
}
