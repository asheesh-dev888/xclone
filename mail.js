// Transactional email over an HTTPS API (Render's free tier blocks SMTP).
//   RESEND_API_KEY  -> https://api.resend.com/emails
//   BREVO_API_KEY   -> https://api.brevo.com/v3/smtp/email
//   MAIL_FROM       -> sender, e.g. "ZuZu <no-reply@yourdomain.com>" (must be a verified sender/domain at the provider)
// Email features are on only when a key AND MAIL_FROM are set (/api/config email:true).
// Test-only: MAIL_API_BASE overrides the provider host (a local mock).
function provider() {
  if (!String(process.env.MAIL_FROM || '').trim()) return null;
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.BREVO_API_KEY) return 'brevo';
  return null;
}
const enabled = () => !!provider();

function parseFrom(s) {
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(s);
  return m ? { name: m[1].replace(/^"|"$/g, '') || 'ZuZu', email: m[2] } : { name: 'ZuZu', email: s.trim() };
}

async function send({ to, subject, text, html }) {
  const p = provider();
  if (!p) throw new Error('Email is not configured');
  const from = String(process.env.MAIL_FROM).trim();
  let url, headers, body;
  if (p === 'resend') {
    url = (process.env.MAIL_API_BASE || 'https://api.resend.com') + '/emails';
    headers = { Authorization: 'Bearer ' + process.env.RESEND_API_KEY };
    body = { from, to: [to], subject, text, html };
  } else {
    url = (process.env.MAIL_API_BASE || 'https://api.brevo.com') + '/v3/smtp/email';
    headers = { 'api-key': process.env.BREVO_API_KEY };
    body = { sender: parseFrom(from), to: [{ email: to }], subject, textContent: text, htmlContent: html };
  }
  const r = await fetch(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`${p} HTTP ${r.status}`);
  return true;
}

module.exports = { enabled, provider, send };
