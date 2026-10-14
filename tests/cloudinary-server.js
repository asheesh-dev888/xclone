// Test helpers for video posts: a local mock Cloudinary (upload incl. chunked uploads, Admin API resource lookup,
// signed destroy, and delivery of the uploaded file / a JPG poster) plus tiny test videos made with ffmpeg.
// Never talks to the real Cloudinary. The app is pointed here with CLOUDINARY_API_BASE + CLOUDINARY_DELIVERY_BASE.
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const express = require(path.join(ROOT, 'node_modules', 'express'));
const multer = require(path.join(ROOT, 'node_modules', 'multer'));

const CLOUD = 'zuzu-test-cloud', KEY = '123456789012345', SECRET = 'test-cloudinary-secret';
const OTHER = 'someone-elses-cloud', OTHER_KEY = '999', OTHER_SECRET = 'other-secret';
const cloudinaryUrl = () => `cloudinary://${KEY}:${SECRET}@${CLOUD}`;

// Same algorithm as Cloudinary: sorted k=v pairs (minus file/cloud_name/resource_type/api_key/signature) + secret, SHA-1.
function sign(params, secret) {
  const skip = new Set(['file', 'cloud_name', 'resource_type', 'api_key', 'signature']);
  const str = Object.keys(params).filter(k => !skip.has(k) && params[k] !== '' && params[k] != null).sort().map(k => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(str + secret).digest('hex');
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'zuzu-mockcld-'));
// A short test clip: colour bars + moving box + a tone. Returns the file path (cached).
function makeVideo({ w = 360, h = 640, seconds = 2, ext = 'mp4', name } = {}) {
  const file = path.join(TMP, name || `clip-${w}x${h}-${seconds}s.${ext}`);
  if (fs.existsSync(file)) return file;
  const v = ['-f', 'lavfi', '-i', `testsrc2=size=${w}x${h}:rate=24:duration=${seconds}`, '-f', 'lavfi', '-i', `sine=frequency=440:duration=${seconds}`];
  const codec = ext === 'webm' ? ['-c:v', 'libvpx', '-b:v', '200k', '-c:a', 'libvorbis'] : ['-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-profile:v', 'baseline', '-c:a', 'aac', '-b:a', '48k', '-movflags', '+faststart'];
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...v, ...codec, '-shortest', file]);
  return file;
}
function probe(file) {
  const out = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]).toString());
  const vs = (out.streams || []).find(s => s.codec_type === 'video');
  const as = (out.streams || []).find(s => s.codec_type === 'audio');
  if (!vs && as) return { width: null, height: null, duration: Number(out.format.duration), formatName: out.format.format_name, codec: as.codec_name, audio: true };
  if (!vs) return null;
  return { width: vs.width, height: vs.height, duration: Number(out.format.duration), formatName: out.format.format_name, codec: vs.codec_name };
}
function formatOf(p, filename) {
  const ext = path.extname(filename || '').slice(1).toLowerCase();
  if (p.audio) return /matroska|webm/.test(p.formatName) ? 'webm' : /ogg/.test(p.formatName) ? 'ogg' : /mp3/.test(p.formatName) ? 'mp3' : /mov|mp4/.test(p.formatName) ? (ext === 'm4a' ? 'm4a' : 'mp4') : (ext || p.formatName.split(',')[0]);
  if (/matroska/.test(p.formatName)) return ext === 'mkv' ? 'mkv' : (/vp8|vp9|av1/.test(p.codec) ? 'webm' : 'mkv');
  if (/mov|mp4/.test(p.formatName)) return ['mov', '3gp', 'mp4'].includes(ext) ? ext : 'mp4';
  return ext || p.formatName.split(',')[0];
}

// A short voice note (sine tone, audio only).
function makeAudio({ seconds = 3, ext = 'webm' } = {}) {
  fs.mkdirSync(TMP, { recursive: true });
  const file = path.join(TMP, `voice-${seconds}s.${ext}`);
  if (fs.existsSync(file)) return file;
  const codec = ext === 'webm' ? ['-c:a', 'libopus', '-b:a', '32k'] : ext === 'm4a' ? ['-c:a', 'aac', '-b:a', '48k'] : ['-c:a', 'libmp3lame'];
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `sine=frequency=330:duration=${seconds}`, ...codec, file]);
  return file;
}
function startMockCloudinary({ uploadDelayMs = 0 } = {}) {
  const clouds = { [CLOUD]: { key: KEY, secret: SECRET }, [OTHER]: { key: OTHER_KEY, secret: OTHER_SECRET } };
  const resources = new Map(); // `${cloud}/${resource_type}/${public_id}` -> resource
  const calls = { upload: [], chunks: [], resource: [], destroy: [], delivery: [] };
  const partial = new Map(); // X-Unique-Upload-Id -> { parts: [], total }
  const poster = path.join(TMP, 'poster-default.jpg');
  const app = express();
  app.use((req, res, next) => {
    res.set({ 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Range, X-Unique-Upload-Id, X-Requested-With, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' });
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  });
  const err = (res, code, message) => res.status(code).json({ error: { message } });
  const up = multer({ storage: multer.memoryStorage(), limits: { fileSize: 120 * 1024 * 1024 } });

  const delay = (req, res, next) => (uploadDelayMs ? setTimeout(next, uploadDelayMs) : next());
  app.post('/v1_1/:cloud/video/upload', delay, up.single('file'), (req, res) => {
    const c = clouds[req.params.cloud]; if (!c) return err(res, 404, 'Unknown cloud');
    const b = { ...req.body };
    if (b.api_key !== c.key) return err(res, 401, 'Unknown API key');
    if (!b.signature || b.signature !== sign(b, c.secret)) return err(res, 401, `Invalid Signature ${b.signature}`);
    if (Math.abs(Date.now() / 1000 - Number(b.timestamp)) > 3600) return err(res, 400, 'Stale request');
    if (!req.file) return err(res, 400, 'Missing required parameter - file');
    let buf = req.file.buffer;
    const range = req.headers['content-range'];
    if (range) {
      const m = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(range);
      const id = req.headers['x-unique-upload-id'];
      if (!m || !id) return err(res, 400, 'Bad chunk');
      const p = partial.get(id) || { parts: [], total: +m[3] };
      p.parts.push({ start: +m[1], buf });
      partial.set(id, p);
      calls.chunks.push({ id, range, size: buf.length });
      if (+m[2] + 1 < +m[3]) return res.json({ done: false });
      partial.delete(id);
      buf = Buffer.concat(p.parts.sort((a, z) => a.start - z.start).map(x => x.buf));
      if (buf.length !== p.total) return err(res, 400, 'Chunks missing');
    }
    const id = crypto.randomBytes(8).toString('hex');
    fs.mkdirSync(TMP, { recursive: true }); // cleanup() of an earlier run may have removed it
    const file = path.join(TMP, id + path.extname(req.file.originalname || '.mp4'));
    fs.writeFileSync(file, buf);
    let p = null; try { p = probe(file); } catch {}
    if (!p) return err(res, 400, 'Invalid video file');
    const format = formatOf(p, req.file.originalname);
    if (b.allowed_formats && !b.allowed_formats.split(',').includes(format)) return err(res, 400, `Video file format ${format} not allowed`);
    const public_id = (b.folder ? b.folder + '/' : '') + id;
    const ctx = Object.fromEntries(String(b.context || '').split('|').filter(Boolean).map(kv => kv.split('=')));
    const version = Math.floor(Date.now() / 1000);
    const r = {
      asset_id: crypto.randomBytes(16).toString('hex'), public_id, version, format, resource_type: 'video', type: 'upload',
      bytes: buf.length, width: p.width || undefined, height: p.height || undefined, is_audio: p.audio ? true : undefined, duration: p.duration, folder: b.folder || '', asset_folder: b.folder || '',
      tags: b.tags ? b.tags.split(',') : [], context: Object.keys(ctx).length ? { custom: ctx } : undefined, created_at: new Date().toISOString(),
      secure_url: `${base}/${req.params.cloud}/video/upload/v${version}/${public_id}.${format}`, _file: file, _cloud: req.params.cloud,
    };
    if (!p.audio) try { execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', '0.5', '-i', file, '-frames:v', '1', file + '.jpg']); r._poster = file + '.jpg'; } catch {}
    resources.set(`${req.params.cloud}/video/${public_id}`, r);
    calls.upload.push({ cloud: req.params.cloud, params: b, chunked: !!range, bytes: buf.length, public_id });
    const { _file, _cloud, _poster, ...out } = r;
    res.json({ ...out, eager: b.eager ? [] : undefined, original_filename: path.parse(req.file.originalname || 'video').name, api_key: c.key });
  });

  const authOk = (req, c) => req.headers.authorization === 'Basic ' + Buffer.from(`${c.key}:${c.secret}`).toString('base64');
  app.get(/^\/v1_1\/([^/]+)\/resources\/(image|video|raw)\/upload\/(.+)$/, (req, res) => {
    const [cloud, rtype, pidEnc] = [req.params[0], req.params[1], req.params[2]];
    const c = clouds[cloud]; if (!c) return err(res, 404, 'Unknown cloud');
    if (!authOk(req, c)) return err(res, 401, 'Invalid credentials');
    const pid = pidEnc.split('/').map(decodeURIComponent).join('/');
    calls.resource.push({ cloud, rtype, public_id: pid, query: req.query });
    const r = resources.get(`${cloud}/${rtype}/${pid}`);
    if (!r) return err(res, 404, `Resource not found - ${pid}`);
    const { _file, _cloud, _poster, ...out } = r;
    res.json(out);
  });

  app.post('/v1_1/:cloud/:rtype/destroy', express.urlencoded({ extended: false }), (req, res) => {
    const c = clouds[req.params.cloud]; if (!c) return err(res, 404, 'Unknown cloud');
    const b = { ...req.body };
    if (b.api_key !== c.key || b.signature !== sign(b, c.secret)) return err(res, 401, 'Invalid Signature');
    const k = `${req.params.cloud}/${req.params.rtype}/${b.public_id}`;
    const existed = resources.delete(k);
    calls.destroy.push({ cloud: req.params.cloud, rtype: req.params.rtype, public_id: b.public_id, invalidate: b.invalidate });
    res.json({ result: existed ? 'ok' : 'not found' });
  });

  // Delivery: /<cloud>/video/upload/<transforms>/v<version>/<public_id>[.ext]
  app.get(/^\/([^/]+)\/video\/upload\/(.+)$/, (req, res) => {
    const segs = req.params[1].split('/');
    const vi = segs.findIndex(s => /^v\d+$/.test(s));
    let rest = segs.slice(vi + 1).join('/');
    const ext = (rest.match(/\.(\w+)$/) || [])[1] || '';
    if (ext) rest = rest.slice(0, -ext.length - 1);
    calls.delivery.push({ path: req.path, ext, transform: segs.slice(0, Math.max(vi, 0)).join('/') });
    const r = resources.get(`${req.params[0]}/video/${decodeURIComponent(rest)}`);
    if (!r) return res.status(404).end();
    res.set('Cache-Control', 'public, max-age=60');
    if (ext === 'jpg') return res.type('image/jpeg').sendFile(r._poster || poster);
    if (!r._file) return res.status(404).end();
    res.type('video/mp4').sendFile(r._file);
  });

  // Test-only: register an asset as if someone uploaded it (other clouds, wrong types, over-limit metadata...).
  function seed(cloud, rtype, r) {
    const full = { resource_type: rtype, type: 'upload', version: 1700000000, format: 'mp4', bytes: 1000, width: 720, height: 1280, duration: 10, folder: 'zuzu', asset_folder: 'zuzu', ...r, _cloud: cloud };
    resources.set(`${cloud}/${rtype}/${full.public_id}`, full);
    return full;
  }

  let base = '';
  const srv = app.listen(0, '127.0.0.1');
  return new Promise((resolve) => srv.on('listening', () => {
    base = `http://127.0.0.1:${srv.address().port}`;
    resolve({
      srv, calls, resources, seed, url: base,
      env: { CLOUDINARY_URL: cloudinaryUrl(), CLOUDINARY_API_BASE: base + '/v1_1', CLOUDINARY_DELIVERY_BASE: base },
      close: () => new Promise(r => srv.close(r)),
    });
  }));
}

const cleanup = () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {} };
module.exports = { makeAudio, cleanup, startMockCloudinary, makeVideo, probe, sign, CLOUD, KEY, SECRET, OTHER, cloudinaryUrl, TMP };
