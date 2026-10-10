// Test helpers for ZuZu AI: a mock Groq (OpenAI-compatible) chat endpoint and local app instances
// started with/without GROQ_API_KEY. Always uses the local DB from .env.local; never the real Groq API.
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const { localDbUrl } = require('./google-server');
const ROOT = path.join(__dirname, '..');
const MOCK_KEY = 'test-groq-key';

// Behaviour is picked from the last user message:
//   MOCK_HTTP_500 / MOCK_HTTP_429 / MOCK_HTTP_401 -> that HTTP error; MOCK_STREAM_ERROR -> a few tokens then an error event;
//   MOCK_HANG -> never answers; MOCK_XSS -> answer with HTML/script; otherwise a markdown answer streamed in small chunks.
function startMockGroq({ chunkDelay = 15 } = {}) {
  const calls = [];
  const srv = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => body += c);
    req.on('end', async () => {
      let j = {};
      try { j = JSON.parse(body); } catch {}
      calls.push({ url: req.url, auth: req.headers.authorization, body: j });
      const json = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
      if (req.url !== '/chat/completions' || req.method !== 'POST') return json(404, { error: { message: 'not found' } });
      if (req.headers.authorization !== 'Bearer ' + MOCK_KEY) return json(401, { error: { message: 'Invalid API Key' } });
      const msgs = j.messages || [];
      const last = (msgs.filter(m => m.role === 'user').pop() || {}).content || '';
      const code = (last.match(/MOCK_HTTP_(\d{3})/) || [])[1];
      if (code) return json(+code, { error: { message: 'mock error ' + code } });
      if (/MOCK_HANG/.test(last)) return; // never answer (timeout test)
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
      const chunk = (delta, finish = null) => res.write(`data: ${JSON.stringify({ id: 'mock', object: 'chat.completion.chunk', model: j.model, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`);
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      let answer;
      if (/MOCK_XSS/.test(last)) answer = 'Careful: <img src=x onerror="window.__aiXss=1"><script>window.__aiXss=2</script> and [bad](javascript:alert(1)) but **bold** is fine.';
      else {
        const action = (last.match(/^Quick action: ([^.]+)\./) || [])[1];
        const q = (last.match(/^My question about this post: ([\s\S]*)$/) || [])[1];
        const turn = msgs.filter(m => m.role === 'user').length - 1; // first user message is the context block
        answer = `**Mock answer** (turn ${turn}) to ${action ? 'action "' + action + '"' : 'question "' + q + '"'}.\n\n- Point one about the post\n- Point two with a [source](https://example.com/docs)\n\nDone.`;
      }
      if (/MOCK_STREAM_ERROR/.test(last)) {
        chunk({ role: 'assistant', content: '' }); chunk({ content: 'Partial ' }); await sleep(chunkDelay);
        res.write(`data: ${JSON.stringify({ error: { message: 'mock stream failure' } })}\n\n`);
        return res.end();
      }
      chunk({ role: 'assistant', content: '' });
      for (const piece of answer.match(/[\s\S]{1,6}/g)) { if (res.destroyed) return; chunk({ content: piece }); await sleep(chunkDelay); }
      chunk({}, 'stop');
      res.write('data: [DONE]\n\n'); res.end();
    });
  });
  return new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve({ srv, calls, url: `http://127.0.0.1:${srv.address().port}` })));
}

// Start a local ZuZu instance. ai: { baseUrl } enables AI against the mock; ai: null starts it without GROQ_API_KEY.
async function startApp({ port, ai = null, env: extra = {} }) {
  const env = { ...process.env, DATABASE_URL: localDbUrl(), PORT: String(port), ...extra };
  delete env.GROQ_API_KEY; delete env.GROQ_BASE_URL; delete env.GROQ_MODEL;
  delete env.GOOGLE_CLIENT_ID; delete env.GOOGLE_CLIENT_SECRET;
  if (ai) { env.GROQ_API_KEY = MOCK_KEY; env.GROQ_BASE_URL = ai.baseUrl; if (ai.model) env.GROQ_MODEL = ai.model; }
  const child = spawn(process.execPath, [path.join(ROOT, 'server.js')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (d) => log += d); child.stderr.on('data', (d) => log += d);
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error('test server exited:\n' + log);
    try { if ((await fetch(`http://localhost:${port}/healthz`)).ok) return { child, url: `http://localhost:${port}`, log: () => log }; } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  child.kill(); throw new Error('test server did not start:\n' + log);
}

module.exports = { startMockGroq, startApp, MOCK_KEY };
