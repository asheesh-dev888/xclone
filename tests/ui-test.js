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
  // The main server may have a real GROQ_API_KEY: never let Momo ask it for thoughts during tests (served locally instead).
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (opts) => {
    const c = await newContext(opts);
    await c.route(BASE.replace(/\/$/, '') + '/api/monkey/**', (r) => r.fulfill({ json: { thought: 'Test thought from the stubbed endpoint 🍌', source: 'test' } }));
    return c;
  };
  const errors = [];
  if (process.env.UI_ONLY === 'batchc') { await batchCUi(errors, (m) => console.log('  ✓', m)); console.log(errors.length ? 'JS errors:\n' + errors.join('\n') : 'No JS errors'); await browser.close(); process.exit(errors.length ? 1 : 0); }
  if (process.env.UI_ONLY === 'settings') { await settingsUi(browser, errors, (m) => console.log('  ✓', m)); console.log(errors.length ? 'JS errors:\n' + errors.join('\n') : 'No JS errors'); await browser.close(); process.exit(errors.length ? 1 : 0); }
  if (process.env.UI_ONLY === 'video') { // quick run of one section
    await videoUi(browser, errors, (m) => console.log('  ✓', m));
    console.log(errors.length ? 'JS errors:\n' + errors.join('\n') : 'No JS errors');
    await browser.close(); process.exit(errors.length ? 1 : 0);
  }
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
  console.log('\n  Momo the monkey');
  await monkeyUi(browser, errors, step);
  console.log('\n  Admin dashboard');
  await adminUi(browser, errors, step, await ctx.storageState());
  console.log('\n  Choose your ideal');
  await idealUi(browser, errors, step);
  console.log('\n  Video posts + Reels');
  await videoUi(browser, errors, step);
  console.log('\n  Polls, voice posts, Momo moods + outfits');
  await batchCUi(errors, step);
  console.log('\n  Settings: language + push');
  await settingsUi(browser, errors, step);
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
    try { await page.waitForURL(/\/home(\?ideal=1)?$/, { timeout: 10000 }); } catch (e) { throw new Error('Google flow did not reach /home; at ' + page.url() + '\n' + app.log()); }
    // First Google sign-in: the "Choose your ideal" picker opens once.
    await page.waitForSelector('.ideal-modal #ideal-modal-picker .ideal-card');
    if (new URL(page.url()).search) throw new Error('?ideal=1 not cleaned from the URL');
    await page.click('.ideal-modal [data-ideal-card=tagore]');
    await page.click('.ideal-modal [data-action=save-ideal]');
    await page.waitForSelector('#modal-root:empty', { state: 'attached' });
    step('first Google sign-in opens the "Choose your ideal" picker; picked Tagore');
    const sel = `.nav .me-chip img.avatar[src^="https://lh3.googleusercontent.com/"]`;
    await page.waitForSelector(sel);
    if (await page.getAttribute(sel, 'referrerpolicy') !== 'no-referrer') throw new Error('external avatar lacks referrerpolicy=no-referrer');
    await imgLoaded(page, sel);
    if (!(await page.textContent('.me-chip')).includes('@ui.google' + rnd)) throw new Error('unexpected username after Google sign-in');
    step('Continue with Google signs in a new user (@ui.google' + rnd + ') and shows the Google avatar');
    await page.goto(GB + '/u/ui.google' + rnd);
    try { await imgLoaded(page, '.pf img.avatar[src^="https://"]'); } catch (e) { throw new Error('profile avatar: ' + page.url() + ' ' + await page.evaluate(() => (document.querySelector('#profile') || document.body).innerHTML.slice(0, 600))); }
    step('external avatar renders on profile');
    await page.waitForSelector('.pf .ideal-badge:has-text("Rabindranath Tagore")');
    if (await page.evaluate(() => getComputedStyle(document.querySelector('.pf .ideal-badge .dot')).backgroundColor) !== 'rgb(168, 85, 247)') throw new Error('Tagore badge is not purple');
    step('Google user profile shows the ideal chosen at first sign-in (purple)');
    await page.goto(GB + '/home'); await page.waitForSelector('#feed');
    if (await page.$('.ideal-modal, #ideal-prompt')) throw new Error('picker / prompt shown again after choosing an ideal');
    step('picker is not shown again on later visits');
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

// ---------- Admin dashboard (/admin) ----------
async function adminUi(browser, errors, step, loggedIn) {
  const watch = (p) => { p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); };
  // Main server has no ADMIN_USERNAMES for demo: no Admin nav item.
  let c = await browser.newContext({ viewport: { width: 1366, height: 900 }, storageState: loggedIn });
  let p = await c.newPage(); watch(p);
  await p.goto(BASE + '/home'); await p.waitForSelector('.nav .nav-item');
  if (await p.$('.nav a[href="/admin"]')) throw new Error('main server: non-admin sees the Admin nav item');
  await c.close();
  step('non-admin: no Admin item in the nav');
  if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) return console.log('  (skipping admin UI: needs a local server)');

  const { startApp } = require('./ai-server');
  const app = await startApp({ port: 4198, env: { ADMIN_USERNAMES: 'DEMO', ADMIN_TOKEN: '' } });
  const login = async (user, opts = {}) => {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, ...opts });
    const r = await ctx.request.post(app.url + '/api/login', { data: { username: user, password: 'demo1234' } });
    if (!r.ok()) throw new Error(user + ' login failed');
    const page = await ctx.newPage(); watch(page);
    return { ctx, page };
  };
  try {
    // Non-admin on the admin-enabled server: no nav item, page + API 404.
    let { ctx, page } = await login('priya_codes');
    await page.goto(app.url + '/home'); await page.waitForSelector('.nav .nav-item');
    if (await page.$('a[href="/admin"]')) throw new Error('non-admin sees an Admin link');
    if ((await ctx.request.get(app.url + '/admin')).status() !== 404) throw new Error('non-admin /admin is not 404');
    if ((await ctx.request.get(app.url + '/api/admin/stats')).status() !== 404) throw new Error('non-admin /api/admin/stats is not 404');
    await ctx.close();
    step('non-admin on admin-enabled server: no nav item, /admin + API -> 404');

    // Admin: nav item -> dashboard.
    ({ ctx, page } = await login('demo'));
    await page.goto(app.url + '/home'); await page.waitForSelector('.nav a.nav-item[href="/admin"]');
    if (!(await page.textContent('.nav a.nav-item[href="/admin"]')).includes('Admin')) throw new Error('Admin nav label missing');
    await page.click('.nav a.nav-item[href="/admin"]');
    await page.waitForURL('**/admin');
    await page.waitForSelector('.stat-grid .stat-card');
    const api = await (await ctx.request.get(app.url + '/api/admin/stats')).json();
    const cards = await page.$$eval('.stat-card', l => l.map(e => e.dataset.stat));
    for (const k of ['total', 'today', 'yesterday', 'last7', 'last30', 'active', 'posts', 'dms']) if (!cards.includes(k)) throw new Error('missing stat card ' + k);
    const total = await page.textContent('[data-stat=total] .stat-value');
    if (total.replace(/\D/g, '') !== String(api.users.total)) throw new Error(`total card ${total} != API ${api.users.total}`);
    if (!(await page.textContent('[data-stat=total] .stat-sub')).match(/real .* demo/)) throw new Error('real/demo split missing');
    step(`admin: Admin nav item opens /admin with ${cards.length} stat cards (total ${total} matches the API)`);
    const bars = await page.$$eval('#signup-chart .bar-col', l => l.map(e => ({ d: e.dataset.date, n: +e.dataset.count, h: e.querySelector('.bar').getBoundingClientRect().height })));
    if (bars.length !== 30) throw new Error('chart has ' + bars.length + ' bars');
    if (bars.map(b => b.d).join() !== api.daily_signups.map(x => x.date).join() || bars.some((b, i) => b.n !== api.daily_signups[i].count)) throw new Error('chart does not match daily_signups');
    const maxBar = bars.reduce((a, b) => b.n > a.n ? b : a);
    if (maxBar.n > 0 && maxBar.h < 50) throw new Error('tallest bar not drawn: ' + JSON.stringify(maxBar));
    if (bars.some(b => b.n === 0 && b.h > 0)) throw new Error('zero days drawn with height');
    step('chart: 30 daily bars (CSS, no libraries) matching the API');
    const iq = await page.$$eval('#ideal-breakdown .iq-row', l => l.map(e => ({ q: e.dataset.quality, n: +e.dataset.count, c: getComputedStyle(e.querySelector('.dot')).backgroundColor })));
    if (iq.length !== 10 || iq.some((r, i) => r.q !== api.ideals.by_quality[i].quality || r.n !== api.ideals.by_quality[i].count)) throw new Error('ideal breakdown does not match the API: ' + JSON.stringify(iq));
    if (new Set(iq.map(r => r.c)).size !== 10) throw new Error('ideal breakdown colours are not distinct');
    step(`"Ideals chosen" breakdown: 10 coloured quality rows + ${await page.$$eval('#ideal-breakdown .ii-row', l => l.length)} top ideals, matching the API`);
    const rows = await page.$$eval('.admin-table tbody tr', l => l.length);
    if (rows !== Math.min(20, api.latest_signups.length)) throw new Error('table rows ' + rows);
    const href = await page.getAttribute('.admin-table tbody tr a.adm-user', 'href');
    if (href !== '/u/' + api.latest_signups[0].username) throw new Error('first row link ' + href);
    step(`latest sign-ups table: ${rows} rows linking to profiles`);
    const before = await page.textContent('#admin-updated');
    await page.waitForTimeout(1100);
    const [resp] = await Promise.all([page.waitForResponse(r => r.url().endsWith('/api/admin/stats')), page.click('[data-action="admin-refresh"]')]);
    if (resp.status() !== 200) throw new Error('refresh failed');
    await page.waitForFunction((b) => document.querySelector('#admin-updated').textContent !== b, before);
    step('refresh button reloads the stats (' + (await page.textContent('#admin-updated')) + ')');
    await page.waitForTimeout(300);
    await page.screenshot({ path: OUT + '/14-admin.png', fullPage: true });
    step('screenshot 14-admin.png');
    await page.click('.admin-table tbody tr a.adm-user');
    await page.waitForURL('**' + href); await page.waitForSelector('.profile, #feed');
    step('profile link opens the user profile');
    await ctx.close();

    // Mobile: fits the screen, Admin reachable from the top bar.
    ({ ctx, page } = await login('demo', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }));
    await page.goto(app.url + '/home'); await page.waitForSelector('.mobile-top a.mobile-admin');
    await page.tap('.mobile-top a.mobile-admin'); await page.waitForURL('**/admin');
    await page.waitForSelector('#signup-chart .bar-col');
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cols: getComputedStyle(document.querySelector('.stat-grid')).gridTemplateColumns.split(' ').length }));
    if (m.sw > 390 || m.cols !== 2) throw new Error('mobile admin layout: ' + JSON.stringify(m));
    step('mobile: Admin icon in the top bar; 2-column cards, no horizontal overflow');
    await ctx.close();
  } finally { app.child.kill(); }
}

// ---------- Choose your ideal ----------
const hexRgb = (h) => { const [r, g, b] = h.match(/\w\w/g).map(x => parseInt(x, 16)); return `rgb(${r}, ${g}, ${b})`; };
async function idealUi(browser, errors, step) {
  const { QUALITIES, PRESETS } = require('../public/ideals.js');
  const Q = Object.fromEntries(QUALITIES.map(q => [q.key, q]));
  const watch = (p) => { p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); };
  const rnd = Math.floor(Math.random() * 1e5);
  const newPage = async (opts = {}) => { const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, ...opts }); const p = await ctx.newPage(); watch(p); return { ctx, p }; };
  const fillAccount = async (p, u) => { await p.fill('input[name=name]', 'Ideal ' + u); await p.fill('input[name=username]', u); await p.fill('input[name=password]', 'secret123'); };
  const checked = (p) => p.$$eval('#signup-ideal [data-ideal-card][aria-checked=true]', l => l.map(e => e.dataset.idealCard));
  const badgeColor = (p) => p.evaluate(() => getComputedStyle(document.querySelector('.pf .ideal-badge .dot')).backgroundColor);

  // ---- desktop: picker renders the palette, single selection, custom card ----
  let { ctx, p } = await newPage();
  await p.goto(BASE + '/signup'); await p.waitForSelector('#signup-ideal .ideal-card');
  const order = await p.evaluate(() => { const pw = document.querySelector('input[name=password]'), pk = document.querySelector('#signup-ideal'), b = document.querySelector('form[data-mode=signup] button[type=submit]'); return !!(pw.compareDocumentPosition(pk) & 4) && !!(pk.compareDocumentPosition(b) & 4); });
  if (!order) throw new Error('"Choose your ideal" is not between the password field and the submit button');
  const cards = await p.$$eval('#signup-ideal .ideal-card', l => l.map(e => ({ id: e.dataset.idealCard, border: getComputedStyle(e).borderLeftColor, name: e.querySelector('.ic-name').textContent, chips: [...e.querySelectorAll('.q-chip')].map(c => ({ q: c.dataset.q, color: getComputedStyle(c).color })) })));
  if (cards.length !== PRESETS.length + 1 || cards[cards.length - 1].id !== 'custom') throw new Error('expected ' + PRESETS.length + ' presets + "Make your own", got ' + cards.map(c => c.id));
  for (const pr of PRESETS) {
    const c = cards.find(x => x.id === pr.id);
    if (!c || c.name !== pr.name) throw new Error('missing preset card ' + pr.id);
    if (c.border !== hexRgb(Q[pr.primary].color)) throw new Error(`${pr.name}: border ${c.border} != ${pr.primary} ${Q[pr.primary].color}`);
    const want = [pr.primary, ...pr.secondary];
    if (c.chips.map(x => x.q).join() !== want.join() || c.chips.some(x => x.color !== hexRgb(Q[x.q].color))) throw new Error(pr.name + ': quality chips wrong ' + JSON.stringify(c.chips));
  }
  if (new Set(cards.slice(0, -1).map(c => c.border)).size < 9) throw new Error('preset cards are not using distinct quality colours');
  step(`sign-up shows ${PRESETS.length} preset ideal cards + "Make your own"; each coloured by its primary quality, with quality chips`);
  if ((await checked(p)).join() !== 'skip') throw new Error('"Skip for now" should be the default: ' + await checked(p));
  step('"Skip for now" is selected by default (optional)');
  const u1 = 'idui' + rnd;
  await fillAccount(p, u1);
  await p.click('[data-ideal-card=gandhi]');
  await p.click('[data-ideal-card=kalam]');
  if ((await checked(p)).join() !== 'kalam') throw new Error('single selection broken: ' + await checked(p));
  await p.waitForTimeout(300); // let the ring transition finish
  const sel = await p.$eval('[data-ideal-card=kalam]', e => ({ shadow: getComputedStyle(e).boxShadow, check: getComputedStyle(e.querySelector('.ic-check')).display, checkBg: getComputedStyle(e.querySelector('.ic-check')).backgroundColor }));
  if (!sel.shadow.includes('rgb(6, 182, 212)') || sel.check === 'none' || sel.checkBg !== 'rgb(6, 182, 212)') throw new Error('selected card lacks the coloured ring / check: ' + JSON.stringify(sel));
  step('selecting Kalam: one card at a time, cyan ring + check mark');
  await p.evaluate(() => document.querySelector('#signup-ideal').scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(250);
  await p.screenshot({ path: OUT + '/15-ideal-signup.png' });
  step('screenshot 15-ideal-signup.png');

  // custom card
  await p.click('[data-ideal-card=custom]');
  await p.waitForSelector('#signup-ideal .ideal-custom:not([hidden])');
  await p.click('form[data-mode=signup] button[type=submit]');
  await p.waitForSelector('#signup-ideal .ideal-err:has-text("name")');
  await p.fill('.ideal-name', '<img src=x onerror="window.__idealXss=1">');
  await p.click('[data-ideal-q=courage]');
  await p.click('form[data-mode=signup] button[type=submit]');
  await p.waitForSelector('#signup-ideal .ideal-err:has-text("can’t contain")');
  if (!p.url().endsWith('/signup')) throw new Error('invalid custom ideal submitted');
  step('custom: empty name and HTML in the name are blocked with a message');
  await p.fill('.ideal-name', 'x'.repeat(60));
  if ((await p.inputValue('.ideal-name')).length !== 40) throw new Error('custom name not capped at 40');
  if ((await p.textContent('#signup-ideal .ideal-custom .cnt')) !== '40/40') throw new Error('counter not 40/40');
  await p.fill('.ideal-name', '  My   Grandmother ');
  await p.click('[data-ideal-q=courage]'); // un-pick
  for (const k of ['compassion', 'wisdom', 'discipline']) await p.click(`[data-ideal-q=${k}]`);
  await p.click('[data-ideal-q=creativity]');
  await p.waitForSelector('#signup-ideal .ideal-err:has-text("up to 3")');
  const pressed = await p.$$eval('.q-opt[aria-pressed=true]', l => l.map(e => e.dataset.idealQ + ':' + e.querySelector('.ord').textContent));
  if (pressed.sort().join() !== 'compassion:1,discipline:3,wisdom:2') throw new Error('quality picks wrong: ' + pressed);
  await p.waitForTimeout(300);
  const cc = await p.$eval('[data-ideal-card=custom]', e => ({ border: getComputedStyle(e).borderLeftColor, name: e.querySelector('.ic-name').textContent, chips: [...e.querySelectorAll('.q-chip')].map(c => c.dataset.q).join() }));
  if (cc.border !== 'rgb(236, 72, 153)' || cc.name !== 'My Grandmother' || cc.chips !== 'compassion,wisdom,discipline') throw new Error('custom card preview wrong: ' + JSON.stringify(cc));
  step('custom: name + up to 3 qualities; the first (Compassion) colours the card pink; 4th pick refused');
  await p.click('form[data-mode=signup] button[type=submit]');
  await p.waitForURL('**/home');
  if (await p.$('#ideal-prompt')) throw new Error('ideal prompt shown to a user who has an ideal');
  await p.goto(BASE + '/u/' + u1); await p.waitForSelector('.pf .ideal-badge');
  if ((await p.textContent('.pf .ideal-badge .lbl')) !== 'Ideal: My Grandmother') throw new Error('badge text: ' + await p.textContent('.pf .ideal-badge .lbl'));
  if (await badgeColor(p) !== 'rgb(236, 72, 153)') throw new Error('custom badge not pink: ' + await badgeColor(p));
  if ((await p.$$('.pf .ideal-badge .q-chip')).length !== 3) throw new Error('badge chips missing');
  if (await p.evaluate(() => window.__idealXss)) throw new Error('XSS via ideal name');
  step('signed up with custom ideal; profile badge "Ideal: My Grandmother" in pink with 3 chips');

  // edit profile: same picker, change to Bhagat Singh
  await p.click('text=Edit profile');
  await p.waitForSelector('#edit-ideal [data-ideal-card=custom][aria-checked=true]');
  if ((await p.inputValue('#edit-ideal .ideal-name')) !== 'My Grandmother') throw new Error('edit picker not pre-filled');
  await p.click('#edit-ideal [data-ideal-card=bhagat_singh]');
  await p.click('[data-action=save-profile]');
  await p.waitForSelector('.pf .ideal-badge:has-text("Bhagat Singh")');
  if (await badgeColor(p) !== 'rgb(239, 68, 68)') throw new Error('Bhagat Singh badge not red');
  step('Edit profile reuses the picker (pre-filled); changed to Bhagat Singh -> red badge');
  await p.goto(BASE + '/home');
  await p.fill('#home-composer textarea', 'Inspired today #ideal');
  await p.click('#home-composer button[type=submit]');
  await p.waitForSelector('#feed .post:has-text("Inspired today") .ideal-dot');
  const dot = await p.$eval('#feed .post:has-text("Inspired today") .ideal-dot', e => ({ t: e.title, c: getComputedStyle(e).backgroundColor, w: e.getBoundingClientRect().width }));
  if (dot.t !== 'Ideal: Bhagat Singh' || dot.c !== 'rgb(239, 68, 68)' || dot.w > 10) throw new Error('post ideal dot wrong: ' + JSON.stringify(dot));
  step('posts show a tiny coloured dot next to the name (tooltip "Ideal: Bhagat Singh")');
  await ctx.close();

  // ---- preset sign-up + profile badge screenshot ----
  ({ ctx, p } = await newPage());
  const u2 = 'idkalam' + rnd;
  await p.goto(BASE + '/signup'); await p.waitForSelector('#signup-ideal .ideal-card');
  await fillAccount(p, u2); await p.click('[data-ideal-card=kalam]');
  await p.click('form[data-mode=signup] button[type=submit]'); await p.waitForURL('**/home');
  await p.fill('#home-composer textarea', 'Dream, dream, dream. Dreams transform into thoughts and thoughts result in action. #inspiration');
  await p.click('#home-composer button[type=submit]'); await p.waitForSelector('#feed .post .ideal-dot');
  await p.goto(BASE + '/u/' + u2); await p.waitForSelector('.pf .ideal-badge'); await p.waitForSelector('#feed .post');
  if (await badgeColor(p) !== 'rgb(6, 182, 212)' || !(await p.textContent('.pf .ideal-badge')).includes('Ideal: APJ Abdul Kalam')) throw new Error('Kalam badge wrong');
  await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/17-ideal-profile.png' });
  step('signed up with preset Kalam; cyan "Ideal: APJ Abdul Kalam" badge (screenshot 17-ideal-profile.png)');
  await ctx.close();

  // ---- skipped: one-time dismissible prompt + choose later from the profile ----
  ({ ctx, p } = await newPage());
  const u3 = 'idskip' + rnd;
  await p.goto(BASE + '/signup'); await p.waitForSelector('#signup-ideal .ideal-card');
  await fillAccount(p, u3);
  await p.click('[data-ideal-card=tagore]'); await p.click('[data-ideal-card=skip]');
  await p.click('form[data-mode=signup] button[type=submit]'); await p.waitForURL('**/home');
  await p.waitForSelector('#ideal-prompt:has-text("Choose your ideal")');
  await p.click('#ideal-prompt [data-action=open-ideal]');
  await p.waitForSelector('.ideal-modal #ideal-modal-picker');
  await p.click('.ideal-modal [data-action=close-modal]');
  await p.click('#ideal-prompt [data-action=dismiss-ideal-prompt]');
  await p.waitForSelector('#ideal-prompt', { state: 'detached' });
  await p.reload(); await p.waitForSelector('#home-composer');
  if (await p.$('#ideal-prompt')) throw new Error('dismissed prompt came back');
  const ls = await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('zuzu.idealPromptDismissed')));
  if (ls.length !== 1) throw new Error('dismissal not stored in localStorage');
  step('skipped: home shows a "Choose your ideal" prompt; dismissing it sticks (localStorage)');
  await p.goto(BASE + '/u/' + u3); await p.waitForSelector('.pf .ideal-add');
  await p.click('.pf .ideal-add'); await p.waitForSelector('.ideal-modal [data-ideal-card=skip][aria-checked=true]');
  await p.click('.ideal-modal [data-ideal-card=ambedkar]'); await p.click('.ideal-modal [data-action=save-ideal]');
  await p.waitForSelector('.pf .ideal-badge:has-text("Dr B.R. Ambedkar")');
  if (await badgeColor(p) !== 'rgb(34, 197, 94)') throw new Error('Ambedkar badge not green');
  step('own profile without an ideal: "Choose your ideal" button -> picker -> green Ambedkar badge');
  await ctx.close();

  // ---- mobile ----
  ({ ctx, p } = await newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }));
  const u4 = 'idmob' + rnd;
  await p.goto(BASE + '/signup'); await p.waitForSelector('#signup-ideal .ideal-card');
  const m = await p.evaluate(() => { const g = document.querySelector('#signup-ideal .ideal-grid'), c = g.querySelector('.ideal-card'); return { disp: getComputedStyle(g).display, ox: getComputedStyle(g).overflowX, sw: g.scrollWidth, cw: g.clientWidth, h: g.getBoundingClientRect().height, cardW: c.getBoundingClientRect().width, doc: document.documentElement.scrollWidth }; });
  if (m.disp !== 'flex' || m.ox !== 'auto' || m.sw <= m.cw || m.h > 160 || m.cardW > 260 || m.doc > 390) throw new Error('mobile picker is not a compact horizontal row: ' + JSON.stringify(m));
  step(`mobile: picker is one horizontally scrollable row (${Math.round(m.h)}px tall), no page overflow`);
  await fillAccount(p, u4);
  await p.locator('[data-ideal-card=lakshmibai]').tap();
  if ((await checked(p)).join() !== 'lakshmibai') throw new Error('mobile tap did not select');
  await p.locator('[data-ideal-card=custom]').tap();
  await p.waitForSelector('#signup-ideal .ideal-custom:not([hidden])');
  await p.locator('[data-ideal-card=lakshmibai]').tap();
  await p.waitForSelector('#signup-ideal .ideal-custom[hidden]', { state: 'attached' });
  await p.evaluate(() => document.querySelector('#signup-ideal').scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(300);
  if (await p.evaluate(() => document.documentElement.scrollWidth) > 390) throw new Error('mobile overflow after selecting');
  await p.screenshot({ path: OUT + '/16-ideal-mobile.png' });
  step('mobile: tapping selects (Rani Lakshmibai, red ring) and the custom card opens its editor (screenshot 16-ideal-mobile.png)');
  await p.locator('form[data-mode=signup] button[type=submit]').tap(); await p.waitForURL('**/home');
  await p.goto(BASE + '/u/' + u4); await p.waitForSelector('.pf .ideal-badge');
  if (await badgeColor(p) !== 'rgb(239, 68, 68)') throw new Error('mobile Lakshmibai badge not red');
  if (await p.evaluate(() => document.documentElement.scrollWidth) > 390) throw new Error('mobile profile overflows');
  step('mobile: profile badge fits, red for Courage');
  await ctx.close();
}

// ---------- Momo the monkey ----------
async function monkeyUi(browser, errors, step) {
  if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) return console.log('  (skipping Momo UI: needs a local server)');
  const watch = (p) => { p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); };
  const { startMockGroq, startApp, MOCK_THOUGHTS, clearMockThoughts } = require('./ai-server');
  await clearMockThoughts(); // start fresh so thoughts really come from the (mock) Groq
  const mock = await startMockGroq();
  const app = await startApp({ port: 4204, ai: { baseUrl: mock.url } });
  const B = app.url;
  const desktop = { viewport: { width: 1366, height: 900 } };
  const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  const fetched = [];
  const login = async (opts) => {
    const ctx = await browser.newContext(opts);
    const r = await ctx.request.post(B + '/api/login', { data: { username: 'demo', password: 'demo1234' } });
    if (!r.ok()) throw new Error('demo login failed');
    const page = await ctx.newPage(); watch(page);
    page.on('request', (q) => { const m = q.url().match(/\/api\/monkey\/thought\/(\d+)/); if (m) fetched.push(+m[1]); });
    await page.addInitScript(() => {
      window.__momoStates = [];
      new MutationObserver(() => { const m = document.getElementById('momo'); if (m && !m.__w) { m.__w = 1; new MutationObserver(() => window.__momoStates.push(m.dataset.state)).observe(m, { attributes: true, attributeFilter: ['data-state'] }); } })
        .observe(document, { childList: true, subtree: true });
    });
    return { ctx, page };
  };
  const info = (p) => p.evaluate(() => {
    const m = document.getElementById('momo'); if (!m) return { exists: false, hidden: true };
    const r = m.querySelector('.momo-svg').getBoundingClientRect();
    return { exists: true, hidden: m.hidden || getComputedStyle(m).display === 'none', state: m.dataset.state, post: m.dataset.post || '', h: r.height, top: r.top, bottom: r.bottom,
      bubble: !m.querySelector('.momo-bubble').hidden, text: m.querySelector('.mb-text').textContent };
  });
  const visible = (p) => p.waitForFunction(() => { const m = document.getElementById('momo'); return m && !m.hidden; }, null, { timeout: 5000 });
  const hiddenNow = async (p, where) => { await p.waitForTimeout(150); const i = await info(p); if (!i.hidden) throw new Error('Momo should be hidden ' + where); };
  const settled = (p, notPost = '') => p.waitForFunction((np) => { const m = document.getElementById('momo'); return m && !m.hidden && m.dataset.post && m.dataset.post !== np && ['sit', 'think'].includes(m.dataset.state); }, notPost, { timeout: 8000 });
  const bubbleUp = (p) => p.waitForFunction(() => { const m = document.getElementById('momo'); return m && !m.querySelector('.momo-bubble').hidden && m.querySelector('.mb-text').textContent.trim().length > 0; }, null, { timeout: 6000 });
  const perch = (p) => p.evaluate(() => {
    const m = document.getElementById('momo'), r = m.querySelector('.momo-svg').getBoundingClientRect();
    const post = document.querySelector(`#center [data-post="${m.dataset.post}"]`), pr = (post.closest('.repost-wrap') || post).getBoundingClientRect();
    const hit = (a, b) => a.right > b.left + 1 && a.left < b.right - 1 && a.bottom > b.top + 1 && a.top < b.bottom - 1;
    // The drawing's painted area (the 100x120 box has transparent margins); body above the seat line, legs below it are click-through.
    const fig = { left: r.left + r.width * 0.12, right: r.left + r.width * 0.96, top: r.top, bottom: r.bottom }, seat = r.top + r.height * 96 / 120;
    const blocked = [...document.querySelectorAll(innerWidth <= 700 ? '#center .actions .act .ic, #center .composer' : '#center .actions .act, #center .composer')].filter(e => hit(fig, e.getBoundingClientRect()))
      .concat([...document.querySelectorAll('#center .more, #center .ai-btn')].filter(e => hit({ ...fig, bottom: seat }, e.getBoundingClientRect()))).map(e => e.className);
    return { onTopEdge: r.top < pr.top && r.bottom > pr.top, withinPost: r.left >= pr.left - 1 && r.left < pr.right, rightSide: (r.left + r.right) / 2 > pr.left + pr.width / 2, blocked, postTop: pr.top, momoTop: r.top, momoBottom: r.bottom };
  });
  const scroll = (p, dy) => p.evaluate((d) => window.scrollBy(0, d), dy);
  try {
    let { ctx, page: p } = await login(desktop);
    await p.goto(B + '/home'); await p.waitForSelector('#feed .post');
    await visible(p);
    let i = await info(p);
    if (i.h < 88 || i.h > 96) throw new Error('desktop Momo should be ~92px tall, got ' + i.h);
    step(`Momo is visible on home (fixed, ${Math.round(i.h)}px tall)`);

    // scroll, stop -> jumps onto the post nearest the centre, sitting on its top-right edge
    await p.mouse.move(683, 450); await p.mouse.wheel(0, 700);
    await settled(p);
    let pc = await perch(p);
    if (!pc.onTopEdge || !pc.withinPost || !pc.rightSide) throw new Error('Momo is not sitting on the post\'s top-right edge: ' + JSON.stringify(pc));
    if (pc.blocked.length) throw new Error('Momo covers buttons / composer: ' + pc.blocked.join());
    const states = await p.evaluate(() => window.__momoStates.slice());
    if (!['crouch', 'jump', 'land'].every(s => states.includes(s))) throw new Error('no crouch/jump/land sequence: ' + states.join());
    i = await info(p);
    step(`after scrolling stops Momo crouches, jumps and lands on post ${i.post}: overlaps its top edge at the right, covers no buttons`);
    await bubbleUp(p);
    i = await info(p);
    if (!MOCK_THOUGHTS.includes(i.text) || [...i.text].length > 90) throw new Error('unexpected bubble text: ' + i.text);
    if (!(await p.$('#momo.st-think'))) throw new Error('Momo should be thinking (hand on chin) while the bubble shows');
    step(`thought bubble appears with text: "${i.text}"`);
    await p.waitForTimeout(400);
    await p.screenshot({ path: OUT + '/18-monkey-desktop.png' });
    step('screenshot 18-monkey-desktop.png');

    // rides along while scrolling
    const firstPost = i.post;
    await scroll(p, 90); await p.waitForTimeout(80);
    pc = await perch(p);
    if (!pc.onTopEdge) throw new Error('Momo did not ride along with its post while scrolling: ' + JSON.stringify(pc));
    step('rides along with its post while the page scrolls');
    // ...and hops to another post when scrolling stops elsewhere
    await p.evaluate(() => { window.__momoStates.length = 0; });
    await p.mouse.wheel(0, 650);
    await settled(p, firstPost);
    pc = await perch(p); i = await info(p);
    if (!pc.onTopEdge || pc.blocked.length) throw new Error('second perch wrong: ' + JSON.stringify(pc));
    step(`hops to the next post (${firstPost} -> ${i.post}) when scrolling stops again`);
    await bubbleUp(p);

    // bubble fades after ~6 s; tapping Momo shows it again (no refetch)
    const t0 = Date.now();
    await p.waitForFunction(() => document.querySelector('#momo .momo-bubble').hidden, null, { timeout: 9000 });
    const lasted = Date.now() - t0;
    if (lasted < 4000) throw new Error('bubble disappeared too early: ' + lasted + 'ms');
    i = await info(p);
    const thoughtText = (await p.evaluate(() => document.querySelector('#momo .mb-text').textContent));
    await p.click('#momo .momo-fig');
    await bubbleUp(p);
    if ((await info(p)).text !== thoughtText) throw new Error('tap should show the thought again');
    await p.click('#momo .momo-fig');
    await p.waitForTimeout(100);
    if ((await info(p)).text === thoughtText) throw new Error('second tap should show a new line');
    const dup = fetched.filter((id, k) => fetched.indexOf(id) !== k);
    if (dup.length) throw new Error('thoughts refetched for posts ' + dup.join());
    step(`bubble fades after ~${Math.round(lasted / 1000)}s; tap shows the thought again, tap again for a new one; thoughts cached client-side (${fetched.length} fetches, no repeats)`);

    // tapping the bubble opens Ask ZuZu AI for that post; Momo hides while panels/modals are open
    await p.click('#momo .momo-fig'); await p.click('#momo .momo-fig'); // make sure a thought (not a tap line) is showing
    await p.waitForFunction(() => document.querySelector('#momo .momo-bubble.can-ask'), null, { timeout: 5000 }).catch(async () => { await p.click('#momo .momo-fig'); await p.waitForSelector('#momo .momo-bubble.can-ask', { timeout: 5000 }); });
    const askId = (await info(p)).post;
    await p.click('#momo .mb-cloud');
    await p.waitForSelector('#ai-root .ai-panel');
    const aiPostText = await p.textContent('#ai-root .ai-post');
    const postText = await p.textContent(`#center [data-post="${askId}"] .text`);
    if (!aiPostText.includes(postText.trim().slice(0, 30))) throw new Error('AI panel opened for the wrong post');
    await hiddenNow(p, 'while the AI panel is open');
    await p.keyboard.press('Escape'); await p.waitForSelector('#ai-root', { state: 'detached' });
    await visible(p);
    step('tapping the bubble opens "Ask ZuZu AI" for that post; Momo hides while the panel is open and returns after');
    await p.click('.nav [data-action=compose]'); await p.waitForSelector('.modal textarea');
    await hiddenNow(p, 'while the compose modal is open');
    await p.keyboard.press('Escape'); await visible(p);
    step('hidden while the compose modal is open');

    // other pages
    await p.goto(B + '/post/1'); await p.waitForSelector('.focus'); await visible(p); await scroll(p, 200); await settled(p);
    if (!(await perch(p)).onTopEdge) throw new Error('not perched on a post in the thread view');
    await p.goto(B + '/u/priya_codes'); await p.waitForSelector('#feed .post'); await visible(p); await scroll(p, 500); await settled(p);
    await p.goto(B + '/explore'); await p.waitForSelector('#feed .post'); await visible(p); await scroll(p, 400); await settled(p);
    step('shown and perching on the thread view, profiles and explore');
    await p.goto(B + '/messages'); await p.waitForSelector('#dm-convs'); await hiddenNow(p, 'on DMs');
    await p.goto(B + '/notifications'); await p.waitForSelector('.header'); await hiddenNow(p, 'on notifications');
    step('hidden on DMs (and other pages without a feed)');

    // toggle in the left nav, persisted in localStorage
    await p.goto(B + '/home'); await p.waitForSelector('#feed .post'); await visible(p);
    if ((await p.getAttribute('.nav .nav-momo', 'aria-pressed')) !== 'true' || !(await p.textContent('.nav .nav-momo')).includes('Show Momo 🐒')) throw new Error('"Show Momo 🐒" toggle missing / not on by default');
    await p.click('.nav .nav-momo');
    await hiddenNow(p, 'after turning the toggle off');
    if (await p.evaluate(() => localStorage.getItem('zuzu.momo')) !== '0') throw new Error('toggle not saved');
    await p.reload(); await p.waitForSelector('#feed .post'); await p.waitForTimeout(800);
    await hiddenNow(p, 'after reload with the toggle off');
    if ((await p.getAttribute('.nav .nav-momo', 'aria-pressed')) !== 'false') throw new Error('toggle state not shown after reload');
    await p.click('.nav .nav-momo'); await visible(p);
    step('"Show Momo 🐒" toggle in the left nav hides him; the choice persists across reloads; on again');

    // falls asleep when idle ("zzz"), wakes on scroll
    await p.evaluate(() => localStorage.setItem('zuzu.momoIdleMs', '2500'));
    await p.reload(); await p.waitForSelector('#feed .post'); await visible(p);
    await p.waitForFunction(() => document.getElementById('momo').dataset.state === 'sleep', null, { timeout: 9000 });
    i = await info(p);
    if (!i.bubble || !/z z z/.test(i.text)) throw new Error('no zzz bubble while asleep');
    await p.mouse.wheel(0, 300);
    await p.waitForFunction(() => document.getElementById('momo').dataset.state !== 'sleep', null, { timeout: 3000 });
    await p.evaluate(() => localStorage.removeItem('zuzu.momoIdleMs'));
    step('falls asleep with a "z z z" bubble when idle, wakes on scroll');
    await ctx.close();

    // logged out: login / sign-up pages
    ctx = await browser.newContext(desktop); p = await ctx.newPage(); watch(p);
    await p.goto(B + '/login'); await p.waitForSelector('form[data-form=auth]'); await hiddenNow(p, 'on the login page');
    await p.goto(B + '/signup'); await p.waitForSelector('form[data-mode=signup]'); await hiddenNow(p, 'on the sign-up page');
    await ctx.close();
    step('hidden on login and sign-up');

    // reduced motion: fades between posts instead of jumping
    ({ ctx, page: p } = await login({ ...desktop, reducedMotion: 'reduce' }));
    await p.goto(B + '/home'); await p.waitForSelector('#feed .post'); await visible(p);
    await p.mouse.move(683, 450); await p.mouse.wheel(0, 700); await settled(p);
    let st = await p.evaluate(() => window.__momoStates.slice());
    if (st.includes('jump') || st.includes('crouch') || !st.includes('fade')) throw new Error('reduced motion should fade, not jump: ' + st.join());
    if (!(await perch(p)).onTopEdge) throw new Error('reduced motion: not on the post');
    await ctx.close();
    step('prefers-reduced-motion: fades between positions (no jump)');

    // mobile: smaller, clear of the bottom tab bar
    ({ ctx, page: p } = await login(mobile));
    await p.goto(B + '/home'); await p.waitForSelector('#feed .post'); await visible(p);
    if (!(await p.isVisible('.mobile-top .momo-mtoggle'))) throw new Error('mobile Momo toggle missing');
    { let ok = false; for (const y of [650, -200, 300, -150, 400]) { await scroll(p, y); try { await settled(p); ok = true; break; } catch {} } if (!ok) throw new Error("mobile Momo never perched"); }
    i = await info(p); pc = await perch(p);
    const navTop = await p.evaluate(() => document.querySelector('.bottom-nav').getBoundingClientRect().top);
    if (i.h < 68 || i.h > 76) throw new Error('mobile Momo should be ~72px tall, got ' + i.h);
    if (i.bottom > navTop || !pc.onTopEdge || pc.blocked.length) throw new Error('mobile perch wrong: ' + JSON.stringify({ ...pc, navTop }));
    await bubbleUp(p); await p.waitForTimeout(400);
    if (await p.evaluate(() => document.documentElement.scrollWidth) > 390) throw new Error('mobile horizontal overflow with Momo');
    await p.screenshot({ path: OUT + '/19-monkey-mobile.png' });
    step(`mobile: ${Math.round(i.h)}px tall, perched above the bottom tab bar (screenshot 19-monkey-mobile.png)`);
    await p.locator('.mobile-top .momo-mtoggle').tap(); await hiddenNow(p, 'after the mobile toggle');
    await p.locator('.mobile-top .momo-mtoggle').tap(); await visible(p);
    step('mobile toggle (🐒 in the top bar) works');
    await ctx.close();
    const n = mock.calls.length;
    if (!n || n > new Set(fetched).size || mock.calls.some(c => c.body.stream !== false || !/You are Momo/.test(c.body.messages[0].content))) throw new Error('unexpected Groq traffic: ' + n);
    step(`${n} mocked Groq calls, one per post at most (${new Set(fetched).size} posts, ${fetched.length} fetches); never the real API`);
  } finally {
    app.child.kill(); mock.srv.close();
    await clearMockThoughts().catch(() => {});
  }
}

// ---------- Video posts + Reels (against a local mock Cloudinary) ----------
async function videoUi(browser, errors, step) {
  if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) return console.log('  (skipping video UI: needs a local server)');
  const fs = require('fs');
  const watch = (p) => { p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); };
  const { startMockGroq, startApp, clearMockThoughts } = require('./ai-server');
  const { startMockCloudinary, makeVideo, cleanup } = require('./cloudinary-server');
  const vert = makeVideo({ w: 360, h: 640, seconds: 3 }), horiz = makeVideo({ w: 320, h: 180, seconds: 2 });
  const vert2 = makeVideo({ w: 360, h: 640, seconds: 2 }), long = makeVideo({ w: 64, h: 36, seconds: 185 });
  const vSize = fs.statSync(vert).size, hSize = fs.statSync(horiz).size;
  if (hSize >= vSize / 2) throw new Error('test clips: horizontal should be much smaller than vertical');
  const mock = await startMockCloudinary({ uploadDelayMs: 450 });
  const groq = await startMockGroq();
  const chunk = Math.ceil(vSize / 3);
  const on = await startApp({ port: 4224, ai: { baseUrl: groq.url }, env: { ...mock.env, VIDEO_CHUNK_THRESHOLD: String(Math.floor(vSize / 2)), VIDEO_CHUNK_SIZE: String(chunk) } });
  const off = await startApp({ port: 4225 });
  const B = on.url;
  const desktop = { viewport: { width: 1366, height: 900 } };
  const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  const rnd = Math.floor(Math.random() * 1e5);
  const contexts = [];
  const newUser = async (base, name, opts = desktop) => {
    const ctx = await browser.newContext(opts); contexts.push(ctx);
    const r = await ctx.request.post(base + '/api/signup', { data: { username: name + rnd, password: 'secret123', name: name.toUpperCase() + ' Tester' } });
    if (!r.ok()) throw new Error('signup failed ' + name);
    const page = await ctx.newPage(); watch(page); page.on('dialog', d => d.accept());
    const out = { ctx, page, user: (await r.json()).user };
    if (base === B) users.push(out);
    return out;
  };
  // Poll a <video> (Playwright selectors, e.g. :has-text) until it is really playing / paused.
  const waitVideo = async (p, sel, want, ms) => {
    const t0 = Date.now(); let last;
    while (Date.now() - t0 < ms) {
      last = await p.locator(sel).first().evaluate((v) => ({ paused: v.paused, t: v.currentTime, rs: v.readyState, err: v.error && v.error.code })).catch(() => null);
      if (last && (want === 'playing' ? !last.paused && last.t > 0.05 && last.rs >= 2 : last.paused)) return;
      await p.waitForTimeout(100);
    }
    throw new Error(`video ${sel} not ${want}: ${JSON.stringify(last)}`);
  };
  const playing = (p, sel) => waitVideo(p, sel, 'playing', 10000);
  const paused = (p, sel) => waitVideo(p, sel, 'paused', 8000);
  const signs = []; // POST /api/video/sign requests seen by the browser
  const users = [];
  const tidy = async () => {
    let n = 0;
    for (const { ctx, user } of users) {
      const items = (await (await ctx.request.get(`${B}/api/users/${user.username}/posts?tab=media`)).json()).items || [];
      for (const x of items) if (x.video) { await ctx.request.delete(`${B}/api/posts/${x.id}`); n++; }
    }
    return n;
  };
  try {
    // ---------- composer: vertical clip, chunked upload with progress, auto-suggested Reel ----------
    const A = await newUser(B, 'vida');
    let p = A.page;
    p.on('request', (q) => { if (q.url().endsWith('/api/video/sign')) signs.push(q.url()); });
    await p.goto(B + '/home'); await p.waitForSelector('#home-composer');
    if (!(await p.isVisible('#home-composer .tool-video'))) throw new Error('video button missing next to the image button');
    const order = await p.evaluate(() => [...document.querySelectorAll('#home-composer .tool-row .tool')].map(l => l.className));
    if (!/tool$/.test(order[0]) || !/tool-video/.test(order[1])) throw new Error('video button should come right after the image button: ' + order);
    if (await p.getAttribute('#home-composer input[name=video]', 'accept') !== 'video/*,.mkv,.3gp,.mov') throw new Error('video input accept is wrong');
    if (await p.isVisible('#home-composer .tool-record')) throw new Error('camera record button should only show on touch devices');
    if (!(await p.isVisible('.nav a[href="/reels"]'))) throw new Error('Reels missing from the left nav');
    step('composer has a video button (accept video/*) next to the image button; Reels in the left nav');

    // client-side limits: wrong type and over 3 minutes are refused before any upload
    await p.setInputFiles('#home-composer input[name=video]', { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
    await p.waitForSelector('#toast:not([hidden]):has-text("MP4, MOV, WebM, 3GP or MKV")');
    await p.setInputFiles('#home-composer input[name=video]', long);
    await p.waitForSelector('#toast:not([hidden]):has-text("up to 3 minutes")');
    if (signs.length || await p.isVisible('#home-composer .vpreview')) throw new Error('rejected files must not start an upload');
    step('client-side limits: non-video and 3:05 clip refused before upload (no signing request)');

    // cancel an upload in progress
    await p.setInputFiles('#home-composer input[name=video]', horiz);
    await p.waitForSelector('#home-composer .vpreview[data-state=uploading] .vprog');
    await p.click('#home-composer .vcancel');
    await p.waitForSelector('#home-composer .vpreview', { state: 'hidden' });
    if (!(await p.isDisabled('#home-composer button[type=submit]'))) throw new Error('Post should be disabled after cancelling');
    step('upload can be cancelled');

    const nChunks = mock.calls.chunks.length;
    await p.setInputFiles('#home-composer input[name=video]', vert);
    await p.waitForSelector('#home-composer .vpreview:not([hidden]) video');
    await p.waitForSelector('#home-composer .vprog', { state: 'visible' });
    if (!(await p.isDisabled('#home-composer button[type=submit]'))) throw new Error('Post must wait for the upload');
    if (await p.textContent('#home-composer .vpreview .vdur') !== '0:03') throw new Error('preview should show the duration 0:03');
    if (!(await p.isChecked('#home-composer input[name=is_reel]'))) throw new Error('vertical ≤ 90 s clip should auto-suggest Post as Reel');
    await p.fill('#home-composer textarea', 'My first reel 🎬 #reels');
    await p.waitForFunction(() => { const b = document.querySelector('#home-composer .vprog-bar'); const w = parseFloat(b.style.width); return w > 0 && w < 100; }, null, { timeout: 8000 });
    const pct = await p.textContent('#home-composer .vprog-txt');
    await p.screenshot({ path: OUT + '/22-composer-video.png', clip: { x: 340, y: 0, width: 640, height: 720 } });
    await p.waitForSelector('#home-composer .vpreview[data-state=done]', { timeout: 15000 });
    const ch = mock.calls.chunks.slice(nChunks);
    if (ch.length !== 3 || new Set(ch.map(c => c.id)).size !== 1 || ch[2].range !== `bytes ${2 * chunk}-${vSize - 1}/${vSize}`) throw new Error('expected a 3-chunk upload with one X-Unique-Upload-Id: ' + JSON.stringify(ch));
    step(`vertical clip: preview + 0:03 + progress bar ("${pct}"), chunked upload (3 × Content-Range, one upload id), Reel auto-suggested (screenshot 22-composer-video.png)`);
    await p.click('#home-composer button[type=submit]');
    const reelSel = '#feed .post:has-text("My first reel") .vmedia video';
    await p.waitForSelector(reelSel);
    await p.waitForSelector('#toast:has-text("reel")');
    const attrs = await p.$eval(reelSel, (v) => ({ poster: v.getAttribute('poster'), preload: v.getAttribute('preload'), inline: v.hasAttribute('playsinline'), muted: v.muted, loop: v.loop, sources: [...v.querySelectorAll('source')].map(s => s.src) }));
    if (!/so_1.*\.jpg$/.test(attrs.poster) || attrs.preload !== 'metadata' || !attrs.inline || !attrs.muted || !attrs.loop) throw new Error('feed player attributes wrong: ' + JSON.stringify(attrs));
    if (attrs.sources.length !== 2 || !/f_auto/.test(attrs.sources[0]) || !/vc_h264.*\.mp4$/.test(attrs.sources[1])) throw new Error('player sources wrong: ' + attrs.sources);
    if ((await p.textContent('#feed .post:has-text("My first reel") .vdur-badge')).trim() !== '0:03') throw new Error('duration badge missing');
    if (!(await p.isVisible('#feed .post:has-text("My first reel") .vreel'))) throw new Error('reel badge missing');
    await p.waitForFunction(() => { const v = document.querySelector('#feed .vmedia video'); return v && v.poster; });
    if (!mock.calls.delivery.some(d => d.ext === 'jpg')) throw new Error('poster image was never requested');
    await playing(p, reelSel);
    if (!(await p.$eval(reelSel, v => v.muted))) throw new Error('autoplay must be muted');
    step('posted as a Reel: feed shows the inline player (poster, preload=metadata, playsinline, f_auto + mp4 sources, 0:03 badge) and autoplays muted');

    // horizontal clip: normal video post (no Reel suggestion)
    await p.setInputFiles('#home-composer input[name=video]', horiz);
    await p.waitForSelector('#home-composer .vpreview[data-state=done]', { timeout: 15000 });
    if (await p.isChecked('#home-composer input[name=is_reel]')) throw new Error('horizontal clip should not be suggested as a Reel');
    await p.fill('#home-composer textarea', 'Sunset timelapse, landscape');
    await p.click('#home-composer button[type=submit]');
    await p.waitForSelector('#feed .post:has-text("Sunset timelapse") .vmedia video');
    if (await p.isVisible('#feed .post:has-text("Sunset timelapse") .vreel')) throw new Error('normal video should not have the Reels badge');
    step('horizontal clip posted as a normal video (Reel not suggested)');

    // one at a time, tap-to-unmute, pause when scrolled away
    await p.goto(B + '/explore'); await p.waitForSelector('#feed .vmedia video');
    const first = '#feed .post:has-text("Sunset timelapse") .vmedia video';
    await playing(p, first);
    const nPlaying = await p.evaluate(() => [...document.querySelectorAll('video')].filter(v => !v.paused).length);
    if (nPlaying !== 1) throw new Error('only one video should play at a time, got ' + nPlaying);
    await p.click('#feed .post:has-text("Sunset timelapse") .vmute');
    if (await p.$eval(first, v => v.muted)) throw new Error('tap-to-unmute did not unmute');
    await p.click('#feed .post:has-text("Sunset timelapse") .vmute');
    if (!(await p.$eval(first, v => v.muted))) throw new Error('mute icon did not mute again');
    step('only one video plays at a time; mute icon toggles sound');
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await p.waitForFunction(() => [...document.querySelectorAll('#feed video')].every(v => v.paused), null, { timeout: 8000 });
    await p.evaluate(() => window.scrollTo(0, 0));
    await playing(p, first);
    step('videos pause when scrolled out of view and resume when ≥60% visible again');
    await p.click(first); await paused(p, first);
    await p.waitForSelector('#feed .post:has-text("Sunset timelapse") .vmedia.paused .vpaused', { state: 'visible' });
    await p.click(first); await playing(p, first);
    step('tap the video to pause / resume');

    // AI panel on a video post knows it's a video
    await p.click('#feed .post:has-text("My first reel") .ai-btn');
    await p.waitForSelector('#ai-root .ai-vid:has-text("Reel")');
    await p.keyboard.press('Escape');
    step('Ask ZuZu AI on a video post: panel shows the caption + "Reel · 0:03 (reads the caption, not the video)"');

    // screenshot 20: home feed with both video posts
    await p.goto(B + '/home'); await p.waitForSelector('#feed .vmedia video');
    await playing(p, '#feed .vmedia video');
    await p.waitForTimeout(700);
    await p.screenshot({ path: OUT + '/20-video-feed.png' });
    step('screenshot 20-video-feed.png');

    // ---------- more reels (direct upload through the API, like the browser does) ----------
    const reelIds = [+(await p.getAttribute('#feed .post:has-text("My first reel")', 'data-post'))];
    const apiReel = async (ctx, file, text) => {
      const s = await (await ctx.request.post(B + '/api/video/sign')).json();
      const f = new FormData(); for (const [k, v] of Object.entries(s.params)) f.append(k, String(v));
      f.append('file', new Blob([fs.readFileSync(file)], { type: 'video/mp4' }), 'clip.mp4');
      const up = await (await fetch(s.uploadUrl, { method: 'POST', body: f })).json();
      const r = await ctx.request.post(B + '/api/posts', { data: { text, video: { public_id: up.public_id }, is_reel: true } });
      if (!r.ok()) throw new Error('reel post failed ' + r.status());
      return (await r.json()).post.id;
    };
    const Bu = await newUser(B, 'vidb');
    reelIds.push(await apiReel(Bu.ctx, vert2, 'Second reel from B #dance'));
    reelIds.push(await apiReel(A.ctx, vert2, 'Third reel, newest'));

    // ---------- Reels page (desktop): centred 9:16 column, snap feed, overlay, swipe, tap to pause ----------
    await p.click('.nav a[href="/reels"]');
    await p.waitForSelector('.reel.active');
    const layout = await p.evaluate(() => {
      const r = document.querySelector('#reels'), cs = getComputedStyle(r), b = r.getBoundingClientRect(), reel = document.querySelector('.reel').getBoundingClientRect();
      return { snap: cs.scrollSnapType, align: getComputedStyle(document.querySelector('.reel')).scrollSnapAlign, w: b.width, h: b.height, cx: b.left + b.width / 2, vw: innerWidth, rh: reel.height, side: !!document.querySelector('aside.side') };
    });
    if (!/y/.test(layout.snap) || !/mandatory/.test(layout.snap) || !/start/.test(layout.align)) throw new Error('reels need scroll-snap y mandatory: ' + JSON.stringify(layout));
    if (Math.abs(layout.w / layout.h - 9 / 16) > 0.02 || Math.abs(layout.rh - layout.h) > 1 || layout.side) throw new Error('desktop reels should be one 9:16 reel per screen: ' + JSON.stringify(layout));
    const activeId = () => p.evaluate(() => +document.querySelector('.reel.active').dataset.reel);
    if (await activeId() !== reelIds[2]) throw new Error('newest reel should be first');
    const act = '.reel.active';
    for (const b of ['like', 'comment', 'share', 'ai', 'mute']) if (!(await p.isVisible(`${act} .reel-act.${b}`))) throw new Error('reel overlay button missing: ' + b);
    if (!(await p.textContent(`${act} .reel-info`)).includes('@vida' + rnd)) throw new Error('author handle missing at the bottom');
    await playing(p, `${act} video`);
    if (await p.$eval(`${act} video`, v => v.muted)) throw new Error('after a user gesture (nav click), reels should play with sound');
    if (new URL(p.url()).pathname !== '/reels/' + reelIds[2]) throw new Error('URL should become the shareable /reels/:id');
    const preload = await p.$eval('.reel.active + .reel video', v => v.preload);
    if (preload !== 'auto') throw new Error('next reel should be preloaded, got ' + preload);
    if (await p.evaluate(() => { const m = document.getElementById('momo'); return !!m && !m.hidden; })) throw new Error('Momo must be hidden on /reels');
    step('Reels (desktop): centred 9:16 column, scroll-snap y mandatory, like/comment/share/AI/mute + @handle overlay, plays with sound after a gesture, next one preloaded, URL /reels/:id, no Momo');
    // like from the overlay
    await p.click(`${act} .reel-act.like`);
    await p.waitForSelector(`${act} .reel-act.like.on`);
    // swipe (scroll) to the next reel
    const prevSel = `.reel[data-reel="${reelIds[2]}"] video`;
    await p.$eval('#reels', (r) => r.scrollBy({ top: r.clientHeight }));
    await p.waitForFunction((id) => +document.querySelector('.reel.active').dataset.reel === id, reelIds[1], { timeout: 8000 });
    await playing(p, `.reel[data-reel="${reelIds[1]}"] video`);
    await paused(p, prevSel);
    if (new URL(p.url()).pathname !== '/reels/' + reelIds[1]) throw new Error('URL should follow the active reel');
    step('swiping (scrolling the snap container) moves to the next reel: it plays, the previous one pauses');
    await p.keyboard.press('ArrowDown');
    await p.waitForFunction((id) => +document.querySelector('.reel.active').dataset.reel === id, reelIds[0], { timeout: 8000 });
    await playing(p, `.reel[data-reel="${reelIds[0]}"] video`);
    step('ArrowDown goes to the next reel too');
    // tap to pause / resume, mute toggle
    await p.click(`${act} .reel-tap`, { position: { x: 120, y: 200 } });
    await paused(p, `${act} video`);
    await p.waitForSelector(`${act}.paused .reel-paused`, { state: 'visible' });
    await p.click(`${act} .reel-tap`, { position: { x: 120, y: 200 } });
    await playing(p, `${act} video`);
    await p.click(`${act} .reel-act.mute`);
    if (!(await p.$eval(`${act} video`, v => v.muted))) throw new Error('mute toggle did not mute');
    step('tap to pause / resume; mute toggle');
    // share copies /reels/:id; AI opens on the reel; comment opens the thread
    await p.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: B });
    await p.evaluate(() => { try { delete navigator.share; } catch {} Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); });
    await p.click(`${act} .reel-act.share`);
    await p.waitForSelector('#toast:not([hidden]):has-text("Link copied")');
    const copied = await p.evaluate(() => navigator.clipboard.readText());
    if (copied !== B + '/reels/' + reelIds[0]) throw new Error('share should copy the /reels/:id link, got ' + copied);
    await p.click(`${act} .reel-act.ai`);
    await p.waitForSelector('#ai-root .ai-vid:has-text("Reel")');
    await p.keyboard.press('Escape');
    await p.click(`${act} .reel-act.comment`);
    await p.waitForURL('**/post/' + reelIds[0]);
    await p.waitForSelector('.focus .vmedia video');
    step('share copies the /reels/:id link; AI sparkle opens ZuZu AI; comment opens the thread (with the player)');
    // shareable link straight to a reel
    await p.goto(B + '/reels/' + reelIds[1]);
    await p.waitForSelector('.reel.active');
    if (await activeId() !== reelIds[1] || await p.evaluate(() => +document.querySelector('.reel').dataset.reel) !== reelIds[1]) throw new Error('/reels/:id should open that reel first');
    if (!(await p.$(`.reel[data-reel="${reelIds[0]}"]`))) throw new Error('/reels/:id should continue with older reels below');
    step('/reels/:id opens that reel first, older reels follow');
    // A shared link opened cold (no user gesture yet; headless Chrome always reports one, so emulate a fresh visit).
    const cold = await A.ctx.newPage(); watch(cold);
    await cold.addInitScript(() => Object.defineProperty(Navigator.prototype, 'userActivation', { get: () => ({ hasBeenActive: false, isActive: false }) }));
    await cold.goto(B + '/reels/' + reelIds[1]); await cold.waitForSelector('.reel.active');
    await playing(cold, `${act} video`);
    if (!(await cold.$eval(`${act} video`, v => v.muted))) throw new Error('opened from a link (no gesture yet): reel should autoplay muted');
    await cold.click(`${act} .reel-tap`, { position: { x: 120, y: 200 } });
    await playing(cold, `${act} video`);
    if (await cold.$eval(`${act} video`, v => v.muted)) throw new Error('first tap should turn the sound on (and keep playing)');
    await cold.click(`${act} .reel-tap`, { position: { x: 120, y: 200 } });
    await paused(cold, `${act} video`);
    await cold.close();
    step('opened cold from a shared link: autoplays muted; the first tap turns the sound on without pausing, the next tap pauses');

    // ---------- profile Reels tab ----------
    await p.goto(B + '/u/vida' + rnd + '/reels');
    await p.waitForSelector('.reel-grid .reel-tile img');
    const tiles = await p.$$eval('.reel-tile', (t) => t.map(x => +x.dataset.reelTile));
    if (tiles.length !== 2 || !tiles.includes(reelIds[0]) || !tiles.includes(reelIds[2])) throw new Error('profile Reels grid wrong: ' + tiles);
    await imgLoaded(p, '.reel-tile img');
    if (!(await p.isVisible('.tabs a.tab.active:has-text("Reels")'))) throw new Error('Reels tab not active');
    await p.click(`.reel-tile[data-reel-tile="${reelIds[0]}"]`);
    await p.waitForURL('**/reels/' + reelIds[0]);
    await p.waitForSelector('.reel.active');
    step('profile Reels tab: grid of posters; a tile opens /reels/:id');

    // ---------- mobile ----------
    const m = await browser.newContext({ ...mobile, storageState: await A.ctx.storageState() }); contexts.push(m);
    const mp = await m.newPage(); watch(mp);
    await mp.goto(B + '/home'); await mp.waitForSelector('#home-composer');
    if (!(await mp.isVisible('#home-composer .tool-record'))) throw new Error('record button should show on touch devices');
    if (await mp.getAttribute('#home-composer input[name=video_capture]', 'capture') !== 'environment') throw new Error('record input needs capture');
    if (!(await mp.isVisible('.bottom-nav a[href="/reels"]'))) throw new Error('Reels missing from the mobile bottom bar');
    await mp.tap('.bottom-nav a[href="/reels"]');
    await mp.waitForSelector('.reel.active');
    await playing(mp, '.reel.active video');
    const ml = await mp.evaluate(() => { const r = document.querySelector('#reels').getBoundingClientRect(); return { w: r.width, h: r.height, top: r.top, nav: document.querySelector('.bottom-nav').getBoundingClientRect().top, mt: getComputedStyle(document.querySelector('.mobile-top')).display }; });
    if (ml.w !== 390 || Math.abs(ml.top) > 1 || Math.abs(ml.top + ml.h - ml.nav) > 1 || ml.mt !== 'none') throw new Error('mobile reels should fill the screen above the tab bar: ' + JSON.stringify(ml));
    for (const b of ['like', 'comment', 'share', 'ai', 'mute']) if (!(await mp.isVisible(`.reel.active .reel-act.${b}`))) throw new Error('mobile overlay button missing: ' + b);
    await mp.waitForTimeout(600);
    await mp.screenshot({ path: OUT + '/21-reels-mobile.png' });
    const mFirst = await mp.evaluate(() => +document.querySelector('.reel.active').dataset.reel);
    await mp.$eval('#reels', (r) => r.scrollBy({ top: r.clientHeight }));
    await mp.waitForFunction((id) => +document.querySelector('.reel.active').dataset.reel !== id, mFirst, { timeout: 8000 });
    await playing(mp, '.reel.active video');
    step('mobile: Reels in the bottom bar, full-screen snap feed above the tab bar, overlay buttons, swipe to next (screenshot 21-reels-mobile.png)');

    // ---------- video UI hidden when Cloudinary isn't configured ----------
    const O = await newUser(off.url, 'vidoff');
    const op = O.page;
    await op.goto(off.url + '/home'); await op.waitForSelector('#home-composer');
    if (await op.$('#home-composer .tool-video, #home-composer .tool-record, #home-composer .vpreview, .nav a[href="/reels"]')) throw new Error('video UI should be hidden when video:false');
    await op.goto(off.url + '/u/vidoff' + rnd); await op.waitForSelector('.pf');
    if (await op.$('.tabs a:has-text("Reels")')) throw new Error('profile Reels tab should be hidden when video:false');
    await op.goto(off.url + '/reels'); await op.waitForURL('**/home');
    const om = await browser.newContext({ ...mobile, storageState: await O.ctx.storageState() }); contexts.push(om);
    const omp = await om.newPage(); watch(omp);
    await omp.goto(off.url + '/home'); await omp.waitForSelector('.bottom-nav');
    if (await omp.$('.bottom-nav a[href="/reels"]')) throw new Error('mobile Reels tab should be hidden when video:false');
    step('CLOUDINARY_URL unset: no video/record buttons, no Reels nav (desktop + mobile), no profile Reels tab, /reels -> /home');

    const n = mock.calls.destroy.length;
    if (await tidy() < 4) throw new Error('expected 4 video posts to delete');
    for (let i = 0; i < 40 && mock.calls.destroy.length - n < 4; i++) await new Promise(r => setTimeout(r, 100));
    if (mock.calls.destroy.length - n < 4) throw new Error('deleting video posts should destroy their Cloudinary assets');
    step('deleted video posts -> Cloudinary destroy called for each');
  } finally {
    await tidy().catch(() => {}); // never leave this run's video posts in the local DB (their assets only exist in the mock)
    for (const c of contexts) await c.close().catch(() => {});
    on.child.kill(); off.child.kill(); await mock.close(); groq.srv.close(); cleanup();
    await clearMockThoughts().catch(() => {});
  }
}

// ---------- Settings: UI language switch (English / हिंदी / Hinglish), AI language, push opt-in ----------
async function settingsUi(browser, errors, step) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const name = 'lang' + Math.floor(Math.random() * 1e6);
  const r = await ctx.request.post(BASE + '/api/signup', { data: { username: name, password: 'secret123', name: 'Lang Tester' } });
  if (!r.ok()) throw new Error('signup failed');
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(BASE + '/settings'); await p.waitForSelector('#set-ui-lang');
  if (!(await p.isVisible('#set-push'))) throw new Error('push section missing');
  await p.selectOption('#set-ui-lang', 'hi');
  await p.waitForFunction(() => [...document.querySelectorAll('.nav .nav-item')].some(a => a.textContent.includes('होम')), null, { timeout: 4000 });
  step('switching to हिंदी translates the nav instantly');
  await p.goto(BASE + '/home'); await p.waitForSelector('#feed');
  await p.waitForFunction(() => document.body.textContent.includes('सूचनाएँ'), null, { timeout: 4000 });
  const prefs = await (await ctx.request.get(BASE + '/api/me/prefs')).json();
  if (prefs.ui_lang !== 'hi') throw new Error('ui_lang not saved: ' + JSON.stringify(prefs));
  step('the choice is saved on the account and survives navigation');
  await p.goto(BASE + '/settings'); await p.waitForSelector('#set-ui-lang');
  await p.selectOption('#set-ui-lang', 'hinglish');
  await p.waitForFunction(() => document.body.textContent.includes('Bhasha') && !document.body.textContent.includes('भाषा'), null, { timeout: 4000 });
  await p.selectOption('#set-ai-lang', 'hi');
  await p.waitForFunction(async () => (await (await fetch('/api/me/prefs')).json()).ai_lang === 'hi', null, { timeout: 4000 });
  step('Hinglish UI + AI language preference saved');
  await p.selectOption('#set-ui-lang', 'en');
  await p.waitForFunction(() => [...document.querySelectorAll('.nav .nav-item')].some(a => a.textContent.includes('Home')), null, { timeout: 4000 });
  step('back to English restores the original text');
  await p.screenshot({ path: OUT + '/20-settings.png' });
  await ctx.request.delete(BASE + '/api/me', { data: { confirm: name } });
  await ctx.close();
}

// ---------- Batch C: polls, voice posts (fake microphone), Momo moods + outfits ----------
async function batchCUi(errors, step) {
  if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) return console.log('  (skipping: needs a local server)');
  const { startMockGroq, startApp } = require('./ai-server');
  const { startMockCloudinary } = require('./cloudinary-server');
  const cld = await startMockCloudinary(), groq = await startMockGroq();
  const app = await startApp({ port: 4226, ai: { baseUrl: groq.url }, env: { ...cld.env } });
  const B = app.url;
  const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const rnd = Math.floor(Math.random() * 1e5);
  const users = [];
  const user = async (name, mood) => {
    const ctx = await br.newContext({ viewport: { width: 1366, height: 900 }, permissions: ['microphone'] });
    await ctx.route(B + '/api/monkey/**', (r) => r.fulfill({ json: { thought: 'Stub thought 🍌', mood: mood || 'happy', source: 'test' } }));
    await ctx.addInitScript(() => { window.__momoMoods = []; });
    const r = await ctx.request.post(B + '/api/signup', { data: { username: name + rnd, password: 'secret123', name: name.toUpperCase() + ' C' } });
    if (!r.ok()) throw new Error('signup ' + name);
    const page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
    const u = { ctx, page, username: name + rnd }; users.push(u); return u;
  };
  try {
    const a = await user('pollster', 'funny'), b = await user('voter');
    const A = a.page, Bp = b.page;
    // poll
    await A.goto(B + '/home'); await A.waitForSelector('#home-composer, form[data-form="compose"]');
    const f = A.locator('#center form[data-form="compose"]').first();
    await f.locator('textarea').fill('Chai or coffee?');
    await f.locator('.tool-poll').click();
    const opts = f.locator('.pe-opt');
    await opts.nth(0).fill('Chai'); await opts.nth(1).fill('Coffee');
    await f.locator('[data-action="poll-add"]').click(); await opts.nth(2).fill('Both');
    await f.locator('.pe-len').selectOption('60');
    await f.locator('button[type=submit]').click();
    await A.waitForSelector('#feed .poll .poll-opt');
    const pid = await A.getAttribute('#feed .post:has(.poll)', 'data-post');
    if ((await A.locator(`[data-poll="${pid}"] .poll-opt`).count()) !== 3) throw new Error('poll options not rendered');
    step('composer: add a 3-choice, 1-hour poll; it shows up in the feed as vote buttons');
    await Bp.goto(B + '/post/' + pid); await Bp.waitForSelector('.poll .poll-opt');
    await Bp.locator('.poll .poll-opt', { hasText: 'Coffee' }).click();
    await Bp.waitForSelector('.poll .poll-res.mine');
    const txt = await Bp.textContent('.poll');
    if (!/100%/.test(txt) || !/1 vote/.test(txt) || !/left/.test(txt)) throw new Error('results wrong: ' + txt);
    step('voting shows the results (100% Coffee ✓, 1 vote, time left); one vote per user');
    await Bp.screenshot({ path: OUT + '/21-poll.png', clip: await (await Bp.$('.focus')).boundingBox() });
    // voice
    await A.goto(B + '/home'); await A.waitForSelector('#center form[data-form="compose"] [data-action="voice-rec"]');
    const g = A.locator('#center form[data-form="compose"]').first();
    await g.locator('textarea').fill('A quick voice note');
    await g.locator('[data-action="voice-rec"]').click();
    await A.waitForSelector('#center .voice-box[data-state="recording"]');
    await A.waitForTimeout(1800);
    await g.locator('[data-action="voice-stop"]').click();
    await A.waitForSelector('#center .voice-box[data-state="done"]', { timeout: 15000 });
    await g.locator('button[type=submit]').click();
    await A.waitForSelector('#feed .post .voice');
    const up = cld.calls.upload.find(u => /voice/.test(u.params.tags || ''));
    if (!up) throw new Error('voice note was not uploaded through the signed path');
    const src = await A.getAttribute('#feed .post .voice audio', 'src');
    if (!/\.mp3$/.test(src)) throw new Error('voice src ' + src);
    step('record a voice note with the mic (fake device), it uploads to Cloudinary (signed, tagged voice) and posts with an inline player');
    await A.locator('#feed .post .voice [data-action="voice-play"]').first().click();
    await A.waitForTimeout(300);
    step('inline player: tap to play/pause');
    // outfits
    await A.goto(B + '/settings'); await A.waitForSelector('.outfit-card[data-outfit-key="cap"]');
    if (await A.locator('.outfit-card[data-outfit-key="sunglasses"].locked').count() !== 1) throw new Error('sunglasses should be locked');
    await A.locator('.outfit-card[data-outfit-key="cap"]').click();
    await A.waitForSelector('.outfit-card[data-outfit-key="cap"].on');
    await A.screenshot({ path: OUT + '/22-outfits.png', clip: await (await A.$('#set-outfit')).boundingBox() });
    step('outfit picker: cap unlocked by the first post, others locked with progress; picking it saves');
    // Momo wears it + mood animation from the thought's mood
    await A.goto(B + '/home'); await A.waitForSelector('#feed .post');
    await A.waitForFunction(() => { const m = document.getElementById('momo'); return m && m.dataset.outfit === 'cap'; }, null, { timeout: 5000 });
    await A.mouse.move(683, 450); await A.mouse.wheel(0, 300);
    await A.waitForFunction(() => window.__momoMoods.includes('funny') && document.getElementById('momo').dataset.mood === 'funny', null, { timeout: 15000 });
    const laugh = await A.evaluate(() => getComputedStyle(document.querySelector('#momo .m-laugh')).display);
    if (laugh === 'none') throw new Error('laugh mouth not shown');
    const box = await (await A.$('#momo')).boundingBox();
    await A.screenshot({ path: OUT + '/23-momo-mood.png', clip: { x: Math.max(0, box.x - 120), y: Math.max(0, box.y - 90), width: 300, height: 220 } });
    step('Momo wears the cap and plays the "funny" (laugh) animation for a funny thought');
  } finally {
    for (const u of users) { await u.ctx.request.delete(B + '/api/me', { data: { confirm: u.username } }).catch(() => {}); await u.ctx.close(); }
    await br.close(); app.child.kill(); groq.srv.close(); await cld.close();
  }
}
