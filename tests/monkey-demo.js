// Record a short demo of Momo hopping between posts while scrolling: node tests/monkey-demo.js
// Uses a local app instance with the mock Groq (never the real API). Output: screenshots/monkey-demo.gif (+ .mp4).
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { startMockGroq, startApp, clearMockThoughts } = require('./ai-server');
const OUT = path.join(__dirname, '..', 'screenshots');
(async () => {
  await clearMockThoughts();
  const mock = await startMockGroq();
  const app = await startApp({ port: 4205, ai: { baseUrl: mock.url } });
  const dir = fs.mkdtempSync('/tmp/momo-video-');
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  try {
    const size = { width: 1100, height: 720 };
    const ctx = await browser.newContext({ viewport: size, recordVideo: { dir, size } });
    await ctx.request.post(app.url + '/api/login', { data: { username: 'demo', password: 'demo1234' } });
    const p = await ctx.newPage();
    await p.goto(app.url + '/home'); await p.waitForSelector('#feed .post');
    const main = await p.evaluate(() => { const r = document.querySelector('.main').getBoundingClientRect(); return { x: Math.max(0, Math.round(r.left) - 20), w: Math.round(r.width) + 90 }; });
    await p.mouse.move(main.x + 300, 400);
    const smooth = async (dy) => { for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, dy / 12); await p.waitForTimeout(28); } };
    await p.waitForTimeout(2600);
    for (const dy of [520, 430, 560, -380]) { await smooth(dy); await p.waitForTimeout(3000); }
    await p.close(); await ctx.close();
    const webm = fs.readdirSync(dir).filter(f => f.endsWith('.webm')).map(f => path.join(dir, f))[0];
    const crop = `crop=${Math.min(main.w, size.width - main.x)}:${size.height}:${main.x}:0`;
    const gif = path.join(OUT, 'monkey-demo.gif'), mp4 = path.join(OUT, 'monkey-demo.mp4');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '0.6', '-i', webm, '-vf', `${crop},fps=12,scale=420:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`, gif]);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '0.6', '-i', webm, '-vf', `${crop},scale=trunc(iw/2)*2:trunc(ih/2)*2`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '28', '-movflags', '+faststart', mp4]);
    for (const f of [gif, mp4]) console.log(f, (fs.statSync(f).size / 1048576).toFixed(2) + ' MB');
  } finally {
    await browser.close(); app.child.kill(); mock.srv.close();
    await clearMockThoughts().catch(() => {});
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((e) => { console.error(e); process.exit(1); });
