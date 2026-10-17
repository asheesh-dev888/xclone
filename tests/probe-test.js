// Probes API test: kinds, evidence, resolve, calibration, librarian (mock Groq). node tests/probe-test.js
const { startMockGroq, startApp } = require('./ai-server');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
function client(BASE) {
  let cookie = '';
  const c = async (method, path, body) => {
    const headers = cookie ? { cookie } : {}; let b;
    if (body) { headers['content-type'] = 'application/json'; b = JSON.stringify(body); }
    const r = await fetch(BASE + path, { method, headers, body: b });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    let j = null; try { j = await r.json(); } catch {}
    return { status: r.status, body: j };
  };
  return c;
}
const uname = (p) => p + Math.random().toString(36).slice(2, 8);
(async () => {
  const mock = await startMockGroq();
  const on = await startApp({ port: 4240, ai: { baseUrl: mock.url }, env: { CONN_RATE_MAX: '5', AI_TIMEOUT_MS: '3000' } });
  const off = await startApp({ port: 4241 });
  const created = [];
  try {
    const A = client(on.url), B = client(on.url), O = client(off.url);
    const ua = uname('pa_'), ub = uname('pb_'), uo = uname('po_');
    ok((await A('POST', '/api/signup', { username: ua, password: 'secret123' })).status === 200, 'signup A');
    ok((await B('POST', '/api/signup', { username: ub, password: 'secret123' })).status === 200, 'signup B');
    await O('POST', '/api/signup', { username: uo, password: 'secret123' });
    const post = (c, o) => c('POST', '/api/posts', o);
    let r = await post(A, { text: 'plain post' });
    ok(r.body.post.kind === 'normal' && Array.isArray(r.body.post.evidence) && r.body.post.evidence.length === 0 && r.body.post.outcome === null, 'normal post defaults');
    r = await post(A, { text: 'x', kind: 'bogus' }); ok(r.status === 400, 'unknown kind rejected');
    r = await post(A, { text: 'x', kind: 'claim', evidence: ['javascript:alert(1)'] }); ok(r.status === 400, 'non-http evidence rejected');
    r = await post(A, { text: 'x', kind: 'claim', evidence: ['https://a.example/1', 'https://a.example/2', 'https://a.example/3', 'https://a.example/4'] }); ok(r.status === 400, 'more than 3 evidence links rejected');
    r = await post(A, { text: 'x', evidence: ['https://a.example/1'] }); ok(r.status === 400, 'evidence on a normal post rejected');
    r = await post(A, { text: 'x', kind: 'claim', resolve_by: Date.now() + 864e5 }); ok(r.status === 400, 'resolve_by only for predictions');
    r = await post(A, { text: 'x', kind: 'prediction', resolve_by: Date.now() - 1000 }); ok(r.status === 400, 'past resolve_by rejected');
    r = await post(A, { text: '', kind: 'claim' }); ok(r.status === 400, 'empty probe rejected');
    const claim = (await post(A, { text: 'Cities with more trees have calmer people', kind: 'claim', evidence: ['https://example.com/study'] })).body.post;
    ok(claim.kind === 'claim' && claim.evidence[0] === 'https://example.com/study', 'claim with evidence');
    const rp = await post(A, { text: 'reply', parent_id: claim.id, kind: 'claim' }); ok(rp.status === 400, 'replies cannot be probes');
    const when = Date.now() + 30 * 864e5;
    const preds = [];
    for (let i = 0; i < 4; i++) preds.push((await post(A, { text: 'Prediction number ' + i, kind: 'prediction', resolve_by: when })).body.post);
    ok(preds[0].kind === 'prediction' && preds[0].resolve_by === when, 'prediction with resolve_by');
    const q = (await post(A, { text: 'Is zero a natural number?', kind: 'question' })).body.post;
    const te = (await post(B, { text: 'Imagine a day with no clocks', kind: 'thought_experiment' })).body.post;
    ok(te.kind === 'thought_experiment', 'thought experiment kind');
    const ch = (await post(B, { text: 'Prove me wrong: tabs beat spaces', kind: 'challenge' })).body.post;
    ok(ch.kind === 'challenge', 'challenge kind');
    // feed + single post carry the kind
    r = await A('GET', '/api/posts/' + claim.id); ok(r.body.post.kind === 'claim', 'GET post carries kind');
    r = await A('GET', '/api/feed/explore'); ok(r.body.items.some(p => p.id === claim.id && p.kind === 'claim'), 'explore carries kind');
    // resolve
    r = await A('GET', '/api/users/' + ua); ok(r.body.user.calibration.resolved === 0 && r.body.user.calibration.score === null && r.body.user.calibration.is_new, 'calibration starts empty/new');
    r = await B('POST', `/api/posts/${preds[0].id}/resolve`, { outcome: 'true' }); ok(r.status === 403, 'only author resolves');
    r = await A('POST', `/api/posts/${claim.id}/resolve`, { outcome: 'true' }); ok(r.status === 400, 'only predictions resolve');
    r = await A('POST', `/api/posts/${preds[0].id}/resolve`, { outcome: 'maybe' }); ok(r.status === 400, 'bad outcome rejected');
    r = await A('POST', `/api/posts/${preds[0].id}/resolve`, { outcome: 'true' }); ok(r.status === 200 && r.body.post.outcome === 'true' && r.body.post.resolved_at > 0, 'resolve true');
    r = await A('POST', `/api/posts/${preds[0].id}/resolve`, { outcome: 'false' }); ok(r.status === 409, 'cannot re-resolve');
    r = await A('GET', '/api/users/' + ua); ok(r.body.user.calibration.resolved === 1 && r.body.user.calibration.score === 100 && r.body.user.calibration.is_new, '1 resolved: 100%, still new');
    await A('POST', `/api/posts/${preds[1].id}/resolve`, { outcome: 'false' });
    r = await A('POST', `/api/posts/${preds[2].id}/resolve`, { outcome: 'true' });
    ok(r.body.calibration.resolved === 3 && r.body.calibration.held === 2, 'resolve returns calibration');
    r = await A('GET', '/api/users/' + ua); ok(r.body.user.calibration.score === 67 && !r.body.user.calibration.is_new, '3 resolved: 67%, not new');
    r = await B('GET', '/api/users/' + ub); ok(r.body.user.calibration.resolved === 0, 'other user untouched');
    // librarian
    r = await A('POST', `/api/posts/${te.id}/connections`); ok(r.status === 400, 'connections only for claim/prediction/question');
    const noauth = client(on.url); r = await noauth('POST', `/api/posts/${claim.id}/connections`); ok(r.status === 401, 'connections need login');
    r = await A('POST', `/api/posts/${claim.id}/connections`);
    ok(r.status === 200 && Array.isArray(r.body.links) && r.body.links.length >= 1 && r.body.links.length <= 3 && !r.body.cached, 'connections returned');
    ok(r.body.links.every(l => ['supports', 'contradicts', 'similar', 'testable'].includes(l.relation) && l.reason && l.post && l.post.id !== claim.id), 'links are validated and not self-links');
    const callsBefore = mock.calls.length;
    r = await B('POST', `/api/posts/${claim.id}/connections`); ok(r.status === 200 && r.body.cached === true && mock.calls.length === callsBefore, 'second request served from DB cache (no Groq call)');
    const lastReq = mock.calls[mock.calls.length - 1].body;
    ok(lastReq.messages[1].content.includes('untrusted') === false && /LIB_DATA_/.test(lastReq.messages[1].content) && /untrusted data/.test(lastReq.messages[0].content), 'post data fenced in the prompt, flagged untrusted');
    // junk answers are filtered; bad JSON -> 502
    const junkPost = (await post(A, { text: 'MOCK_CONN_JUNK claim', kind: 'claim' })).body.post;
    r = await A('POST', `/api/posts/${junkPost.id}/connections`);
    ok(r.status === 200 && r.body.links.length === 3 && r.body.links.some(l => l.relation === 'similar' && l.reason === 'Valid one') && r.body.links.some(l => l.relation === 'testable' && !l.post), 'invalid ids / relations / empty reasons dropped, testable kept without a post');
    const badPost = (await post(A, { text: 'MOCK_CONN_BAD claim', kind: 'claim' })).body.post;
    r = await A('POST', `/api/posts/${badPost.id}/connections`); ok(r.status === 502, 'unreadable model answer -> 502, not cached');
    r = await A('POST', `/api/posts/${q.id}/connections`); // 5th uncached call in window? calls so far: claim, junk, bad, q = 4
    ok(r.status === 200, 'question gets connections (got ' + r.status + ' ' + JSON.stringify(r.body).slice(0, 120) + ')');
    r = await A('POST', `/api/posts/${preds[2].id}/connections`); ok(r.status === 200, 'prediction gets connections (5th uncached call)');
    r = await A('POST', `/api/posts/${preds[3].id}/connections`); ok(r.status === 429 && r.body.retry_after > 0, 'rate-limited after the limit');
    // off server
    r = await O('POST', '/api/posts', { text: 'c', kind: 'claim' }); const oc = r.body.post;
    r = await O('POST', `/api/posts/${oc.id}/connections`); ok(r.status === 503 && r.body.off === true, 'librarian gracefully off without Groq');
    r = await O('GET', '/api/config'); ok(r.body.ai === false, 'config.ai false when off');
    // delete cascades
    r = await A('DELETE', '/api/posts/' + claim.id); ok(r.status === 200, 'delete probe post');
    for (const [c, u] of [[A, ua], [B, ub], [O, uo]]) created.push(u);
  } catch (e) { fail++; console.log('  ✗ crashed', e); }
  finally { on.child.kill(); off.child.kill(); mock.srv.close(); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
