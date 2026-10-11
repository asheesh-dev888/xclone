// "Choose your ideal": server-side validation + output. Data lives in public/ideals.js (shared with the SPA).
const { QUALITIES, PRESETS, CUSTOM_NAME_MAX, CUSTOM_QUALITIES_MAX } = require('./public/ideals.js');

const QUALITY = new Map(QUALITIES.map(q => [q.key, q]));
const PRESET = new Map(PRESETS.map(p => [p.id, p]));
const presetQualities = (p) => [p.primary, ...(p.secondary || [])].filter(k => QUALITY.has(k)).slice(0, 3);

class IdealError extends Error { constructor(m) { super(m); this.status = 400; } }

// Validate a request's `ideal` value. Returns null (no ideal / clear it) or
// { name, preset_id, qualities } ready to store. Throws IdealError (400) on bad input.
//   undefined | null | '' | {skip:true}       -> null
//   { presetId: 'kalam' }                      -> that preset
//   { custom: { name, qualities: [..1-3] } }   -> custom ideal; first quality is the primary
function parseIdeal(v) {
  if (v === undefined || v === null || v === '' || v === false) return null;
  if (typeof v !== 'object' || Array.isArray(v)) throw new IdealError('Invalid ideal');
  if (v.skip === true) return null;
  const presetId = v.presetId ?? v.preset_id;
  if (presetId !== undefined && presetId !== null) {
    const p = PRESET.get(String(presetId));
    if (!p) throw new IdealError('Unknown ideal');
    return { name: p.name, preset_id: p.id, qualities: presetQualities(p) };
  }
  const c = v.custom;
  if (!c || typeof c !== 'object' || Array.isArray(c)) throw new IdealError('Choose an ideal or make your own');
  if (typeof c.name !== 'string') throw new IdealError('Give your ideal a name');
  const name = c.name.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!name) throw new IdealError('Give your ideal a name');
  if ([...name].length > CUSTOM_NAME_MAX) throw new IdealError(`Ideal name can be at most ${CUSTOM_NAME_MAX} characters`);
  if (/[<>]/.test(name)) throw new IdealError('Ideal name can’t contain < or >');
  if (/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/.test(name)) throw new IdealError('Ideal name contains invalid characters');
  if (!Array.isArray(c.qualities)) throw new IdealError('Pick 1 to 3 qualities');
  const qs = [];
  for (const q of c.qualities) {
    if (typeof q !== 'string' || !QUALITY.has(q)) throw new IdealError('Unknown quality: ' + String(q).slice(0, 30));
    if (!qs.includes(q)) qs.push(q);
  }
  if (qs.length < 1 || qs.length > CUSTOM_QUALITIES_MAX) throw new IdealError(`Pick 1 to ${CUSTOM_QUALITIES_MAX} qualities`);
  return { name, preset_id: null, qualities: qs };
}

// The ideal as exposed in publicUser. Presets follow the current data file (so edits there show everywhere).
function idealOut(u) {
  if (!u || !u.ideal_name) return null;
  const p = u.ideal_preset_id ? PRESET.get(u.ideal_preset_id) : null;
  const qualities = p ? presetQualities(p) : (u.ideal_qualities || []).filter(k => QUALITY.has(k));
  const primary = qualities[0] || null;
  return {
    name: p ? p.name : u.ideal_name,
    preset_id: p ? p.id : null,
    custom: !p,
    description: p ? p.desc : null,
    qualities,
    primary,
    color: primary ? QUALITY.get(primary).color : null,
  };
}

module.exports = { parseIdeal, idealOut, IdealError, QUALITIES, PRESETS, QUALITY, PRESET, CUSTOM_NAME_MAX, CUSTOM_QUALITIES_MAX };
