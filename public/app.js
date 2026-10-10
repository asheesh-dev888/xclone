/* ZuZu SPA — vanilla JS, no build step. */
(() => {
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MAX = 280;

// ---------- icons ----------
const P = {
  z: 'M3 2.5h18v3.4L8.9 18.1H21v3.4H3v-3.4L15.1 5.9H3z',
  home: 'M21.591 7.146L12.52 1.157c-.316-.21-.724-.21-1.04 0l-9.071 5.99c-.26.173-.409.456-.409.757v13.183c0 .502.418.913.929.913H9.14c.51 0 .929-.41.929-.913v-7.075h3.909v7.075c0 .502.417.913.928.913h6.165c.511 0 .929-.41.929-.913V7.904c0-.301-.158-.584-.408-.758zM20 20l-4.5.01.011-7.097c0-.502-.418-.913-.928-.913H9.44c-.511 0-.929.41-.929.913L8.5 20H4V8.773l8.011-5.342L20 8.764z',
  homeFill: 'M21.591 7.146L12.52 1.157c-.316-.21-.724-.21-1.04 0l-9.071 5.99c-.26.173-.409.456-.409.757v13.183c0 .502.418.913.929.913h6.638c.511 0 .929-.41.929-.913v-7.075h3.008v7.075c0 .502.418.913.929.913h6.639c.51 0 .928-.41.928-.913V7.904c0-.301-.158-.584-.408-.758z',
  search: 'M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z',
  bell: 'M19.993 9.042C19.48 5.017 16.054 2 11.996 2s-7.49 3.021-7.999 7.051L2.866 18H7.1c.463 2.282 2.481 4 4.9 4s4.437-1.718 4.9-4h4.236l-1.143-8.958zM12 20c-1.306 0-2.417-.835-2.829-2h5.658c-.412 1.165-1.523 2-2.829 2zm-6.866-4l.847-6.698C6.364 6.272 8.941 4 11.996 4s5.627 2.268 6.013 5.295L18.864 16H5.134z',
  user: 'M5.651 19h12.698c-.337-1.8-1.023-3.21-1.945-4.19C15.318 13.65 13.838 13 12 13s-3.317.65-4.404 1.81c-.922.98-1.608 2.39-1.945 4.19zm.486-5.56C7.627 11.85 9.648 11 12 11s4.373.85 5.863 2.44c1.477 1.58 2.366 3.8 2.632 6.46l.11 1.1H3.395l.11-1.1c.266-2.66 1.155-4.88 2.632-6.46zM12 4c-1.105 0-2 .9-2 2s.895 2 2 2 2-.9 2-2-.895-2-2-2zM8 6c0-2.21 1.791-4 4-4s4 1.79 4 4-1.791 4-4 4-4-1.79-4-4z',
  reply: 'M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z',
  rt: 'M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z',
  heart: 'M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z',
  heartFill: 'M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z',
  share: 'M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z',
  dots: 'M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z',
  back: 'M7.414 13l5.043 5.04-1.414 1.42L3.586 12l7.457-7.46 1.414 1.42L7.414 11H21v2H7.414z',
  image: 'M3 5.5C3 4.119 4.119 3 5.5 3h13C19.881 3 21 4.119 21 5.5v13c0 1.381-1.119 2.5-2.5 2.5h-13C4.119 21 3 19.881 3 18.5v-13zM5.5 5c-.276 0-.5.224-.5.5v9.086l3-3 3 3 5-5 3 3V5.5c0-.276-.224-.5-.5-.5h-13zM19 15.414l-3-3-5 5-3-3-3 3V18.5c0 .276.224.5.5.5h13c.276 0 .5-.224.5-.5v-3.086zM9.75 7C8.784 7 8 7.784 8 8.75s.784 1.75 1.75 1.75 1.75-.784 1.75-1.75S10.716 7 9.75 7z',
  close: 'M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z',
  feather: 'M23 3c-6.62-.1-10.38 2.421-13.05 6.03C7.29 12.61 6 17.331 6 22h2c0-1.007.07-2.012.19-3H12c4.1 0 7.48-3.082 7.94-7.054C22.79 10.147 23.17 6.359 23 3zm-7 8h-1.5v2H16c.63-.016 1.2-.08 1.72-.188C16.95 15.24 14.68 17 12 17H8.55c.57-2.512 1.57-4.851 3-6.78 2.16-2.912 5.29-4.911 9.45-5.187C20.95 8.079 19.9 11 16 11zM4 9V6H1V4h3V1h2v3h3v2H6v3H4z',
  trash: 'M16 6V4.5C16 3.12 14.88 2 13.5 2h-3C9.11 2 8 3.12 8 4.5V6H3v2h1.06l.81 11.21C4.98 20.78 6.28 22 7.86 22h8.27c1.58 0 2.88-1.22 3-2.79L19.93 8H21V6h-5zm-6-1.5c0-.28.22-.5.5-.5h3c.27 0 .5.22.5.5V6h-4V4.5zm7.13 14.57c-.04.52-.47.93-1 .93H7.86c-.53 0-.96-.41-1-.93L6.07 8h11.85l-.79 11.07zM9 17v-6h2v6H9zm4 0v-6h2v6h-2z',
  link: 'M18.36 5.64c-1.95-1.96-5.11-1.96-7.07 0L9.88 7.05 8.46 5.64l1.42-1.42c2.73-2.73 7.16-2.73 9.9 0 2.73 2.74 2.73 7.17 0 9.9l-1.42 1.42-1.41-1.42 1.41-1.41c1.96-1.96 1.96-5.12 0-7.07zm-2.12 3.53l-7.07 7.07-1.41-1.41 7.07-7.07 1.41 1.41zm-12.02.71l1.42-1.42 1.41 1.42-1.41 1.41c-1.96 1.96-1.96 5.12 0 7.07 1.95 1.96 5.11 1.96 7.07 0l1.41-1.41 1.42 1.41-1.42 1.42c-2.73 2.73-7.16 2.73-9.9 0-2.73-2.74-2.73-7.17 0-9.9z',
  cal: 'M7 4V3h2v1h6V3h2v1h1.5C19.89 4 21 5.12 21 6.5v12c0 1.38-1.11 2.5-2.5 2.5h-13C4.12 21 3 19.88 3 18.5v-12C3 5.12 4.12 4 5.5 4H7zm0 2H5.5c-.27 0-.5.22-.5.5v12c0 .28.23.5.5.5h13c.28 0 .5-.22.5-.5v-12c0-.28-.22-.5-.5-.5H17v1h-2V6H9v1H7V6zm0 6h2v-2H7v2zm0 4h2v-2H7v2zm4-4h2v-2h-2v2zm0 4h2v-2h-2v2zm4-4h2v-2h-2v2z',
  pin: 'M12 7c-1.93 0-3.5 1.57-3.5 3.5S10.07 14 12 14s3.5-1.57 3.5-3.5S13.93 7 12 7zm0 5c-.827 0-1.5-.673-1.5-1.5S11.173 9 12 9s1.5.673 1.5 1.5S12.827 12 12 12zm0-10c-4.687 0-8.5 3.813-8.5 8.5 0 5.967 7.621 11.116 7.945 11.332l.555.37.555-.37c.324-.216 7.945-5.365 7.945-11.332C20.5 5.813 16.687 2 12 2zm0 17.77c-1.665-1.241-6.5-5.196-6.5-9.27C5.5 6.916 8.416 4 12 4s6.5 2.916 6.5 6.5c0 4.073-4.835 8.028-6.5 9.27z',
  camera: 'M9.697 3H11v2h-.697l-3 2H5c-.276 0-.5.224-.5.5v11c0 .276.224.5.5.5h14c.276 0 .5-.224.5-.5V10h2v8.5c0 1.381-1.119 2.5-2.5 2.5H5c-1.381 0-2.5-1.119-2.5-2.5v-11C2.5 6.119 3.619 5 5 5h1.697l3-2zM12 10.5c-1.105 0-2 .895-2 2s.895 2 2 2 2-.895 2-2-.895-2-2-2zm-4 2c0-2.209 1.791-4 4-4s4 1.791 4 4-1.791 4-4 4-4-1.791-4-4zM17 2c0 1.657-1.343 3-3 3v1c1.657 0 3 1.343 3 3h1c0-1.657 1.343-3 3-3V5c-1.657 0-3-1.343-3-3h-1z',
  userFill: 'M17.863 13.44c1.477 1.58 2.366 3.8 2.632 6.46l.11 1.1H3.395l.11-1.1c.266-2.66 1.155-4.88 2.632-6.46C7.627 11.85 9.648 11 12 11s4.373.85 5.863 2.44zM12 2C9.791 2 8 3.79 8 6s1.791 4 4 4 4-1.79 4-4-1.791-4-4-4z',
  android: 'M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 0 0-.83.22l-1.88 3.24a11.463 11.463 0 0 0-8.94 0L5.65 5.67a.643.643 0 0 0-.87-.2c-.28.18-.37.54-.22.83L6.4 9.48A10.78 10.78 0 0 0 1 18h22a10.78 10.78 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z',
  mail: 'M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 3.638 8-3.636V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-8 3.636-8-3.638V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z',
  mailFill: 'M1.998 4.499c0-.828.671-1.499 1.5-1.499h17c.828 0 1.5.671 1.5 1.499v2.858l-10 4.545-10-4.547V4.499zm0 5.053V19.5c0 .828.671 1.5 1.5 1.5h17c.828 0 1.5-.672 1.5-1.5V9.554l-10 4.545-10-4.547z',
  send: 'M2.504 21.866l.526-2.108C3.04 19.719 4 15.823 4 12s-.96-7.719-.97-7.757l-.527-2.109L22.236 12 2.504 21.866zM5.981 13c-.072 1.962-.34 3.833-.583 5.183L17.764 12 5.398 5.818c.242 1.349.51 3.221.583 5.183H10v2H5.981z',
  logout: 'M16 13v-2H7V8l-5 4 5 4v-3h9zM20 3h-9c-1.103 0-2 .897-2 2v4h2V5h9v14h-9v-4H9v4c0 1.103.897 2 2 2h9c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2z',
  sparkle: 'M10 2.5l1.95 5.55L17.5 10l-5.55 1.95L10 17.5l-1.95-5.55L2.5 10l5.55-1.95L10 2.5zm0 4.6l-.85 2.05L7.1 10l2.05.85L10 12.9l.85-2.05L12.9 10l-2.05-.85L10 7.1zM18.5 14l.95 2.55L22 17.5l-2.55.95L18.5 21l-.95-2.55L15 17.5l2.55-.95L18.5 14z',
};
const ic = (name, cls = 'icon') => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true"><path d="${P[name]}"/></svg>`;

// ---------- Android app download ----------
// The link is hidden inside the ZuZu Android app (TWA / installed PWA) and on iOS.
const APK_URL = '/download/ZuZu.apk';
const APP_NOTE = 'Requires Chrome. Allow install from unknown sources.';
const BANNER_KEY = 'zuzu.appBannerDismissed';
const store = (s, k, v) => { try { return v === undefined ? window[s].getItem(k) : window[s].setItem(k, v); } catch { return null; } };
if (new URLSearchParams(location.search).get('source') === 'twa') store('sessionStorage', 'zuzu.twa', '1');
if (document.referrer.startsWith('android-app://com.zuzu.app')) store('sessionStorage', 'zuzu.twa', '1');
function inAndroidApp() {
  return (window.matchMedia && matchMedia('(display-mode: standalone)').matches)
    || document.referrer.startsWith('android-app://com.zuzu.app')
    || store('sessionStorage', 'zuzu.twa') === '1';
}
function isIOS() {
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1); // iPadOS reports as a Mac
}
// Show on Android and desktop browsers only (not iOS or other mobile platforms, not inside the app).
function showAppLink() {
  if (inAndroidApp() || isIOS()) return false;
  const ua = navigator.userAgent || '';
  return /Android/i.test(ua) || !/Mobi|Tablet|Silk|Kindle|BlackBerry|Opera Mini|IEMobile/i.test(ua);
}
const appLinkAttrs = `href="${APK_URL}" download="ZuZu.apk" data-get-app`;
function authAppLink() {
  if (!showAppLink()) return '';
  return `<div class="get-app-auth"><a class="btn btn-outline btn-android" ${appLinkAttrs}>${ic('android')}<span>Get the Android app</span></a><div class="app-note">${APP_NOTE}</div></div>`;
}
function navAppLink() {
  if (!showAppLink()) return '';
  return `<a class="nav-item nav-app" ${appLinkAttrs} title="Get the Android app. ${APP_NOTE}">${ic('android')}<span class="lbl">Get the Android app<small class="app-note">${APP_NOTE}</small></span></a>`;
}
function sideAppCard() {
  if (!showAppLink()) return '';
  return `<div class="card app-card" id="app-card"><h2>${ic('android')}Get the Android app</h2><p>Take ZuZu with you. Install the app on your Android phone.</p><a class="btn btn-light btn-android" ${appLinkAttrs}>${ic('android')}Download ZuZu.apk</a><div class="app-note">${APP_NOTE}</div></div>`;
}
function appBanner() {
  if (!showAppLink() || store('localStorage', BANNER_KEY) === '1') return '';
  return `<div class="app-banner" id="app-banner" role="region" aria-label="Get the Android app"><a class="app-link" ${appLinkAttrs}><span class="app-ic">${ic('android')}</span><span class="txt"><span class="t">Get the Android app</span><span class="app-note">${APP_NOTE}</span></span></a><button class="x" data-action="dismiss-app-banner" aria-label="Dismiss">${ic('close')}</button></div>`;
}

// ---------- state & api ----------
const state = { me: null, unread: 0, dmUnread: 0, chat: null, convs: [], homeTab: localStorage.getItem('homeTab') || 'following', config: { google: false, ai: false } };
async function api(method, url, body) {
  const opts = { method, headers: {}, credentials: 'same-origin' };
  if (body instanceof FormData) opts.body = body;
  else if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const r = await fetch(url, opts);
  let data = {};
  try { data = await r.json(); } catch {}
  if (!r.ok) { const e = new Error(data.error || ('Request failed (' + r.status + ')')); e.status = r.status; throw e; }
  return data;
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 2500);
}

// ---------- helpers ----------
const COLORS = ['#1d9bf0', '#f91880', '#00ba7c', '#7856ff', '#ff7a00', '#e0245e', '#17bf63', '#794bc4'];
function avatar(u, cls = '') {
  // Avatars are /media/:id uploads or external https URLs (Google profile photos need no-referrer).
  if (u.avatar) return `<img class="avatar ${cls}" src="${esc(u.avatar)}" alt="" referrerpolicy="no-referrer">`;
  const name = u.name || u.username || '?';
  const color = COLORS[[...(u.username || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  return `<div class="avatar ${cls}" style="background:${color}">${esc([...name][0].toUpperCase())}</div>`;
}
function ago(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return Math.max(1, Math.floor(s)) + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  const d = new Date(ts), n = new Date();
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(d.getFullYear() !== n.getFullYear() ? { year: 'numeric' } : {}) });
}
const fullDate = (ts) => new Date(ts).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' }) + ' · ' + new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmt = (n) => n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K' : n ? String(n) : '';
function richText(t) {
  return esc(t).replace(/(https?:\/\/[^\s<]+)|(^|[^\w&])@(\w(?:[\w.]{0,18}\w)?)|(^|[^\w&])#([\p{L}\p{N}_]+)/gu, (m, url, p1, user, p2, tag) => {
    if (url) return `<a class="link" href="${url}" target="_blank" rel="noopener noreferrer" data-ext>${url.length > 40 ? url.slice(0, 40) + '…' : url}</a>`;
    if (user) return `${p1}<a class="link" href="/u/${user}" data-link>@${user}</a>`;
    return `${p2}<a class="link" href="/search?q=${encodeURIComponent('#' + tag)}" data-link>#${tag}</a>`;
  });
}
const loader = () => `<div class="loading"><div class="spinner"></div></div>`;

// ---------- router ----------
const routes = [
  [/^\/$/, () => go(state.me ? '/home' : '/login', true)],
  [/^\/login$/, () => viewAuth('login')],
  [/^\/signup$/, () => viewAuth('signup')],
  [/^\/home$/, () => viewHome()],
  [/^\/explore$/, () => viewExplore()],
  [/^\/notifications$/, () => viewNotifications()],
  [/^\/messages(?:\/(\d+))?$/, (m) => viewMessages(m[1] ? +m[1] : null)],
  [/^\/search$/, () => viewSearch()],
  [/^\/post\/(\d+)$/, (m) => viewPost(m[1])],
  [/^\/u\/([\w.]+)\/(followers|following)$/, (m) => viewFollowList(m[1], m[2])],
  [/^\/u\/([\w.]+)(?:\/(replies|media|likes))?$/, (m) => viewProfile(m[1], m[2] || 'posts')],
];
const PUBLIC = ['/login', '/signup'];
function go(url, replace) {
  if (replace) history.replaceState({}, '', url); else history.pushState({}, '', url);
  render();
}
async function render() {
  closeMenus(); closeAi();
  const p = location.pathname;
  if (!state.me && !PUBLIC.includes(p)) return go('/login', true);
  if (state.me && PUBLIC.includes(p)) return go('/home', true);
  for (const [re, fn] of routes) { const m = p.match(re); if (m) { window.scrollTo(0, 0); return fn(m); } }
  shell(`<div class="header"><div class="header-row"><h1>Not found</h1></div></div><div class="empty"><h3>Hmm…this page doesn’t exist.</h3><p>Try searching for something else.</p><a class="btn btn-primary" href="/home" data-link>Go home</a></div>`);
}
window.addEventListener('popstate', render);
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]');
  if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey && a.getAttribute('href')) {
    e.preventDefault(); e.stopImmediatePropagation(); go(a.getAttribute('href'));
  }
  if (!e.target.closest('.dropdown,.more,.menu,.me-chip')) closeMenus();
});
function closeMenus() { $$('.dropdown,.menu').forEach(d => d.remove()); }

// ---------- shell (3-column layout) ----------
function shell(center, { active = '', layout = '' } = {}) {
  const me = state.me;
  if (layout !== 'dm') state.chat = null;
  document.body.classList.toggle('dm-page', layout === 'dm');
  document.body.classList.remove('dm-chat-open');
  const badge = (key) => key === 'notifications' && state.unread ? `<span class="badge">${state.unread > 99 ? '99+' : state.unread}</span>` : key === 'messages' ? dmBadge() : '';
  const navItem = (href, key, icon, iconOn, label) => `<a class="nav-item ${active === key ? 'active' : ''}" href="${href}" data-link>${ic(active === key && iconOn ? iconOn : icon)}${badge(key)}<span class="lbl">${label}</span></a>`;
  $('#app').innerHTML = `
  <div class="layout">
    <header class="nav">
      <a class="logo" href="/home" data-link aria-label="ZuZu home">${ic('z')}<span class="wordmark">ZuZu</span></a>
      ${navItem('/home', 'home', 'home', 'homeFill', 'Home')}
      ${navItem('/explore', 'explore', 'search', null, 'Explore')}
      ${navItem('/notifications', 'notifications', 'bell', null, 'Notifications')}
      ${navItem('/messages', 'messages', 'mail', 'mailFill', 'Messages')}
      ${navItem('/u/' + me.username, 'profile', 'user', 'userFill', 'Profile')}
      ${navAppLink()}
      <button class="btn btn-primary btn-big" data-action="compose">${ic('feather')}<span class="lbl">Post</span></button>
      <div class="me-chip" data-action="me-menu">${avatar(me)}<div class="who"><div style="font-weight:700">${esc(me.name)}</div><div style="color:var(--muted)">@${esc(me.username)}</div></div><span class="dots">${ic('dots')}</span></div>
    </header>
    <main class="main ${layout === 'dm' ? 'dm-main' : ''}">
      <div class="mobile-top">
        <a href="/u/${esc(me.username)}" data-link>${avatar(me, 'sm')}</a>
        <a class="logo" href="/home" data-link aria-label="ZuZu home">${ic('z')}</a>
        <button class="spacer" data-action="logout" aria-label="Log out" title="Log out">${ic('logout')}</button>
      </div>
      <div id="center">${center}</div>
    </main>
    ${layout === 'dm' ? '' : `<aside class="side">
      <div class="searchbox"><form class="search" data-form="search">${ic('search')}<input name="q" placeholder="Search" autocomplete="off" value="${esc(new URLSearchParams(location.search).get('q') || '')}"></form></div>
      ${sideAppCard()}
      <div class="card" id="trends"><h2>What’s happening</h2>${loader()}</div>
      <div class="card" id="wtf"><h2>Who to follow</h2>${loader()}</div>
      <div class="footer-note">ZuZu · a demo social app</div>
    </aside>`}
  </div>
  <button class="fab" data-action="compose" aria-label="Post">${ic('feather')}</button>
  <nav class="bottom-nav">
    <a href="/home" data-link>${ic(active === 'home' ? 'homeFill' : 'home')}</a>
    <a href="/explore" data-link>${ic('search')}</a>
    <a href="/notifications" data-link aria-label="Notifications">${ic('bell')}${state.unread ? `<span class="badge">${state.unread}</span>` : ''}</a>
    <a href="/messages" data-link aria-label="Messages">${ic(active === 'messages' ? 'mailFill' : 'mail')}${dmBadge()}</a>
    <a href="/u/${esc(me.username)}" data-link>${ic(active === 'profile' ? 'userFill' : 'user')}</a>
  </nav>`;
  loadSidebar();
}
async function loadSidebar() {
  if (!$('#trends')) return;
  try {
    const [{ trends }, { users }] = await Promise.all([api('GET', '/api/trends'), api('GET', '/api/suggestions')]);
    const tEl = $('#trends'); if (!tEl) return;
    tEl.innerHTML = `<h2>What’s happening</h2>` + (trends.length ? trends.map((t, i) => `<a class="row trend" href="/search?q=${encodeURIComponent(t.tag)}" data-link><div><div class="k">${i + 1} · Trending</div><div class="t">${esc(t.tag)}</div><div class="k">${t.n} post${t.n === 1 ? '' : 's'}</div></div></a>`).join('') : `<div class="row" style="color:var(--muted)">Nothing trending yet. Use a #hashtag!</div>`);
    const w = $('#wtf'); if (!w) return;
    w.innerHTML = `<h2>Who to follow</h2>` + (users.length ? users.map(u => userRow(u, false)).join('') : `<div class="row" style="color:var(--muted)">You follow everyone 🎉</div>`);
  } catch {}
}
function followBtn(u) {
  if (!state.me || u.username === state.me.username) return '';
  return u.is_following
    ? `<button class="btn btn-outline following-btn" data-action="unfollow" data-user="${esc(u.username)}"><span class="l1">Following</span><span class="l2">Unfollow</span></button>`
    : `<button class="btn btn-light" data-action="follow" data-user="${esc(u.username)}">Follow</button>`;
}
function userRow(u, withBio = true) {
  return `<div class="user-row" data-href="/u/${esc(u.username)}">${avatar(u)}<div class="who"><div class="n">${esc(u.name)}</div><div class="h">@${esc(u.username)}${u.follows_you ? '<span class="follows-you">Follows you</span>' : ''}</div>${withBio && u.bio ? `<div class="b">${richText(u.bio)}</div>` : ''}</div>${followBtn(u)}</div>`;
}

// ---------- post rendering ----------
function postHTML(p, { thread = false } = {}) {
  const mine = state.me && p.user_id === state.me.id;
  const inner = `
  <article class="post ${thread ? 'thread-line ancestor' : ''}" data-post="${p.id}" data-href="/post/${p.id}">
    <div class="${thread ? 'avatar-col' : ''}"><a href="/u/${esc(p.username)}" data-link>${avatar(p)}</a></div>
    <div class="body">
      <div class="meta"><a class="name" href="/u/${esc(p.username)}" data-link>${esc(p.name)}</a><span class="handle">@${esc(p.username)}</span><span>·</span><a href="/post/${p.id}" data-link title="${esc(fullDate(p.created_at))}">${ago(p.created_at)}</a>
        ${aiBtn(p)}<button class="more" data-action="post-menu" data-id="${p.id}" data-mine="${mine ? 1 : 0}" aria-label="More">${ic('dots', 'icon')}</button></div>
      ${p.reply_to ? `<div class="replying">Replying to <a href="/u/${esc(p.reply_to)}" data-link>@${esc(p.reply_to)}</a></div>` : ''}
      ${p.text ? `<div class="text">${richText(p.text)}</div>` : ''}
      ${p.image ? `<div class="media"><img src="${esc(p.image)}" loading="lazy" alt=""></div>` : ''}
      ${actionsHTML(p)}
    </div>
  </article>`;
  if (p.reposted_by) {
    const who = state.me && p.reposted_by.username === state.me.username ? 'You' : esc(p.reposted_by.name);
    return `<div class="repost-wrap" data-wrap="${p.id}"><div class="social">${ic('rt', 'icon')}<a href="/u/${esc(p.reposted_by.username)}" data-link>${who} reposted</a></div>${inner}</div>`;
  }
  return inner;
}
function actionsHTML(p) {
  return `<div class="actions" data-actions="${p.id}">
    <button class="act reply" data-action="reply" data-id="${p.id}" aria-label="Reply"><span class="ic">${ic('reply')}</span><span>${fmt(p.reply_count)}</span></button>
    <button class="act rt ${p.reposted ? 'on' : ''}" data-action="repost" data-id="${p.id}" aria-label="Repost"><span class="ic">${ic('rt')}</span><span>${fmt(p.repost_count)}</span></button>
    <button class="act like ${p.liked ? 'on' : ''}" data-action="like" data-id="${p.id}" aria-label="Like"><span class="ic">${ic(p.liked ? 'heartFill' : 'heart')}</span><span>${fmt(p.like_count)}</span></button>
    <button class="act share" data-action="share" data-id="${p.id}" aria-label="Share"><span class="ic">${ic('share')}</span></button>
  </div>`;
}
const postCache = new Map();
function remember(list) { list.forEach(p => postCache.set(p.id, p)); return list; }
function updatePostEverywhere(p) {
  const old = postCache.get(p.id) || {};
  postCache.set(p.id, { ...old, ...p });
  $$(`[data-actions="${p.id}"]`).forEach(el => {
    const wasFocus = el.closest('.focus');
    el.outerHTML = actionsHTML(p);
    if (wasFocus) { const st = $('.focus .stats'); if (st) st.outerHTML = statsHTML(p); }
  });
}
const statsHTML = (p) => `<div class="stats"><span><b>${p.repost_count}</b> Reposts</span><span><b>${p.like_count}</b> Likes</span><span><b>${p.reply_count}</b> Replies</span></div>`;

// ---------- composer ----------
function composerHTML({ id, placeholder = 'What is happening?!', parentId = '', buttonLabel = 'Post', autofocus = false }) {
  return `<form class="composer" data-form="compose" id="${id}" data-parent="${parentId}">
    ${avatar(state.me)}
    <div class="body">
      <textarea name="text" rows="1" placeholder="${esc(placeholder)}" ${autofocus ? 'autofocus' : ''}></textarea>
      <div class="preview" hidden><img alt=""><button type="button" class="x" data-action="clear-image" aria-label="Remove image">${ic('close', 'icon')}</button></div>
      <div class="tools">
        <label class="tool" title="Add photo">${ic('image')}<input type="file" name="image" accept="image/png,image/jpeg,image/gif,image/webp" hidden></label>
        <div class="right"><span class="counter"></span><button class="btn btn-primary" type="submit" disabled>${buttonLabel}</button></div>
      </div>
    </div>
  </form>`;
}
function ring(len) {
  const r = 9, c = 2 * Math.PI * r, frac = Math.min(len / MAX, 1);
  const color = len > MAX ? '#f4212e' : len >= MAX - 20 ? '#ffd400' : '#1d9bf0';
  return `<svg class="ring" viewBox="0 0 22 22"><circle cx="11" cy="11" r="${r}" fill="none" stroke="#2f3336" stroke-width="2"/><circle cx="11" cy="11" r="${r}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - frac)}" transform="rotate(-90 11 11)" stroke-linecap="round"/></svg>`;
}
function updateComposer(form) {
  const ta = form.text, len = [...ta.value].length;
  const hasImg = form.image.files.length > 0;
  ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px';
  const cnt = $('.counter', form);
  const left = MAX - len;
  cnt.className = 'counter' + (left < 0 ? ' over' : left <= 20 ? ' warn' : '');
  cnt.innerHTML = len ? `${left <= 20 ? `<span>${left}</span>` : ''}${ring(len)}` : '';
  $('button[type=submit]', form).disabled = (!ta.value.trim() && !hasImg) || len > MAX;
}
document.addEventListener('input', (e) => { const f = e.target.closest('form[data-form="compose"]'); if (f) updateComposer(f); });
document.addEventListener('change', (e) => {
  const f = e.target.closest('form[data-form="compose"]');
  if (f && e.target.name === 'image') {
    const file = e.target.files[0], pv = $('.preview', f);
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast('Image must be under 5 MB'); e.target.value = ''; }
      else { $('img', pv).src = URL.createObjectURL(file); pv.hidden = false; }
    }
    updateComposer(f);
  }
  if (e.target.matches('[data-preview]')) {
    const file = e.target.files[0]; if (!file) return;
    const target = $(e.target.dataset.preview);
    const url = URL.createObjectURL(file);
    if (target.tagName === 'IMG') target.src = url;
    else if (target.classList.contains('banner')) target.style.backgroundImage = `url(${url})`;
    else target.outerHTML = `<img class="avatar lg" id="${target.id}" src="${url}" alt="">`;
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { const f = e.target.closest('form[data-form="compose"]'); if (f) f.requestSubmit(); }
  if (e.key === 'Escape') closeModal();
});

document.addEventListener('submit', async (e) => {
  const f = e.target;
  if (f.dataset.form === 'search') {
    e.preventDefault(); const q = f.q.value.trim(); if (q) go('/search?q=' + encodeURIComponent(q)); return;
  }
  if (f.dataset.form === 'compose') {
    e.preventDefault();
    const btn = $('button[type=submit]', f); btn.disabled = true;
    const fd = new FormData();
    fd.append('text', f.text.value);
    if (f.image.files[0]) fd.append('image', f.image.files[0]);
    if (f.dataset.parent) fd.append('parent_id', f.dataset.parent);
    try {
      const { post } = await api('POST', '/api/posts', fd);
      remember([post]);
      f.reset(); $('.preview', f).hidden = true; updateComposer(f);
      const inModal = f.closest('.modal');
      if (inModal) closeModal();
      toast(f.dataset.parent ? 'Your reply was sent.' : 'Your post was sent.');
      if (f.dataset.parent) {
        if (location.pathname === '/post/' + f.dataset.parent) { const list = $('#replies'); if (list) list.insertAdjacentHTML('beforeend', postHTML(post)); }
        const parent = postCache.get(+f.dataset.parent);
        if (parent) updatePostEverywhere({ ...parent, reply_count: parent.reply_count + 1 });
      } else {
        const feed = $('#feed');
        if (feed && (location.pathname === '/home' || location.pathname === '/u/' + state.me.username)) {
          $('.empty', feed)?.remove();
          feed.insertAdjacentHTML('afterbegin', postHTML({ ...post, key: 'p' + post.id }));
        }
      }
    } catch (err) { toast(err.message); btn.disabled = false; }
    return;
  }
  if (f.dataset.form === 'auth') {
    e.preventDefault();
    const mode = f.dataset.mode, err = $('.err', f), btn = $('button[type=submit]', f);
    err.textContent = ''; btn.disabled = true;
    try {
      const body = { username: f.username.value.trim(), password: f.password.value };
      if (mode === 'signup') body.name = f.name.value.trim();
      const { user } = await api('POST', '/api/' + mode, body);
      state.me = user; state.unread = 0;
      await refreshMe();
      go('/home', true);
    } catch (ex) { err.textContent = ex.message; btn.disabled = false; }
    return;
  }
  if (f.dataset.form === 'edit-profile') {
    e.preventDefault();
    const btn = $('[data-action="save-profile"]'); if (btn) btn.disabled = true;
    try {
      const fd = new FormData(f);
      if (!f.avatar.files[0]) fd.delete('avatar');
      if (!f.banner.files[0]) fd.delete('banner');
      const { user } = await api('PUT', '/api/me', fd);
      state.me = { ...state.me, ...user };
      closeModal(); toast('Profile updated'); go('/u/' + user.username, true);
    } catch (ex) { toast(ex.message); if (btn) btn.disabled = false; }
  }
});

// ---------- global click actions ----------
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) {
    const card = e.target.closest('[data-href]');
    if (card && !e.target.closest('a,button,input,label,textarea,.media')) go(card.dataset.href);
    else if (e.target.closest('.media img')) window.open(e.target.src, '_blank');
    return;
  }
  e.preventDefault(); e.stopPropagation();
  const a = el.dataset.action, id = +el.dataset.id;
  try {
    if (a === 'compose') openCompose();
    else if (a === 'reply') openCompose(postCache.get(id));
    else if (a === 'like') {
      const p = postCache.get(id); const on = el.classList.contains('on');
      if (!on) el.classList.add('pop');
      const { post } = await api(on ? 'DELETE' : 'POST', `/api/posts/${id}/like`);
      updatePostEverywhere(post);
    } else if (a === 'repost') {
      const on = el.classList.contains('on');
      const { post } = await api(on ? 'DELETE' : 'POST', `/api/posts/${id}/repost`);
      updatePostEverywhere(post); toast(on ? 'Repost removed' : 'Reposted');
      if (on && location.pathname === '/home') $$(`.repost-wrap[data-wrap="${id}"]`).forEach(w => { if ($('.social a', w)?.textContent.startsWith('You')) w.remove(); });
    } else if (a === 'share') {
      const url = location.origin + '/post/' + id;
      try { if (navigator.share) await navigator.share({ url }); else { await navigator.clipboard.writeText(url); toast('Copied to clipboard'); } }
      catch { toast(url); }
    } else if (a === 'post-menu') {
      closeMenus();
      const mine = el.dataset.mine === '1';
      el.insertAdjacentHTML('beforeend', `<div class="dropdown">${mine ? `<button class="danger" data-action="delete" data-id="${id}">${ic('trash')}Delete</button>` : ''}<button data-action="copy-link" data-id="${id}">${ic('link')}Copy link</button></div>`);
    } else if (a === 'copy-link') {
      closeMenus(); const url = location.origin + '/post/' + id;
      try { await navigator.clipboard.writeText(url); toast('Copied to clipboard'); } catch { toast(url); }
    } else if (a === 'delete') {
      closeMenus();
      if (!confirm('Delete post? This can’t be undone.')) return;
      await api('DELETE', '/api/posts/' + id);
      toast('Your post was deleted');
      $$(`[data-post="${id}"]`).forEach(n => (n.closest('.repost-wrap') || n).remove());
      if (location.pathname === '/post/' + id) history.length > 1 ? history.back() : go('/home', true);
    } else if (a === 'follow' || a === 'unfollow') {
      const name = el.dataset.user;
      const { user } = await api(a === 'follow' ? 'POST' : 'DELETE', `/api/users/${name}/follow`);
      $$(`[data-action][data-user="${name}"]`).forEach(b => b.outerHTML = followBtn(user));
      if (location.pathname === '/u/' + name) { const fc = $('#followers-count'); if (fc) fc.textContent = user.followers; }
    } else if (a === 'me-menu') {
      if ($('.menu')) return closeMenus();
      el.insertAdjacentHTML('beforeend', `<div class="menu"><a href="/u/${esc(state.me.username)}" data-link>View profile</a><button data-action="logout">Log out @${esc(state.me.username)}</button></div>`);
    } else if (a === 'logout') {
      await api('POST', '/api/logout'); state.me = null; go('/login', true);
    } else if (a === 'clear-image') {
      const f = el.closest('form'); f.image.value = ''; $('.preview', f).hidden = true; updateComposer(f);
    } else if (a === 'close-modal') closeModal();
    else if (a === 'edit-profile') openEditProfile();
    else if (a === 'save-profile') $('#edit-form').requestSubmit();
    else if (a === 'back') history.length > 1 ? history.back() : go('/home');
    else if (a === 'home-tab') { state.homeTab = el.dataset.tab; localStorage.setItem('homeTab', state.homeTab); viewHome(); }
    else if (a === 'go') go(el.dataset.href);
    else if (a === 'dismiss-app-banner') { store('localStorage', BANNER_KEY, '1'); $('#app-banner')?.remove(); }
  } catch (err) {
    el.classList.remove('pop');
    toast(err.message);
  }
});

// ---------- modals ----------
function openModal(html) { $('#modal-root').innerHTML = `<div class="modal-bg" data-bg>${html}</div>`; document.body.style.overflow = 'hidden'; }
function closeModal() { $('#modal-root').innerHTML = ''; document.body.style.overflow = ''; }
document.addEventListener('mousedown', (e) => { if (e.target.matches('[data-bg]')) closeModal(); });
function openCompose(parent) {
  openModal(`<div class="modal"><div class="modal-head"><button class="back" data-action="close-modal" aria-label="Close">${ic('close')}</button><h2></h2></div>
    ${parent ? `<div class="quoted"><div style="display:flex;flex-direction:column;align-items:center">${avatar(parent)}<div class="line"></div></div><div style="flex:1;min-width:0;padding-bottom:12px"><div class="meta" style="color:var(--muted)"><b style="color:var(--text)">${esc(parent.name)}</b> @${esc(parent.username)} · ${ago(parent.created_at)}</div><div class="text" style="white-space:pre-wrap;overflow-wrap:anywhere">${richText(parent.text)}</div><div style="color:var(--muted);margin-top:12px">Replying to <span style="color:var(--blue)">@${esc(parent.username)}</span></div></div></div>` : ''}
    ${composerHTML({ id: 'modal-composer', parentId: parent ? parent.id : '', placeholder: parent ? 'Post your reply' : 'What is happening?!', buttonLabel: parent ? 'Reply' : 'Post', autofocus: true })}
  </div>`);
  $('#modal-composer textarea').focus();
}
function openEditProfile() {
  const u = state.me;
  openModal(`<div class="modal"><div class="modal-head"><button class="back" data-action="close-modal" aria-label="Close">${ic('close')}</button><h2>Edit profile</h2><button class="btn btn-light" data-action="save-profile">Save</button></div>
  <form id="edit-form" data-form="edit-profile">
    <label class="edit-media" style="display:block;cursor:pointer"><div class="banner" id="banner-prev" style="${u.banner ? `background-image:url(${esc(u.banner)})` : ''}"></div><div class="cam"><span>${ic('camera')}</span></div><input type="file" name="banner" accept="image/*" hidden data-preview="#banner-prev"></label>
    <label class="edit-avatar edit-media" style="display:block;cursor:pointer">${avatar(u, 'lg').replace('class="avatar lg"', 'id="avatar-prev" class="avatar lg"')}<div class="cam"><span>${ic('camera')}</span></div><input type="file" name="avatar" accept="image/*" hidden data-preview="#avatar-prev"></label>
    <div class="field"><label>Name</label><input name="name" maxlength="50" value="${esc(u.name)}"></div>
    <div class="field"><label>Bio</label><textarea name="bio" rows="3" maxlength="160">${esc(u.bio || '')}</textarea></div>
    <div class="field"><label>Location</label><input name="location" maxlength="30" value="${esc(u.location || '')}"></div>
  </form></div>`);
}

// ---------- views ----------
const GOOGLE_G = `<svg class="g-logo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;
function viewAuth(mode) {
  const signup = mode === 'signup';
  const googleError = new URLSearchParams(location.search).get('error') === 'google';
  if (googleError) history.replaceState({}, '', location.pathname);
  $('#app').innerHTML = `<div class="auth">
    <div class="bigx"><div class="brand">${ic('z', '')}<span class="wordmark">ZuZu</span></div></div>
    <div class="panel">
      <h1>Happening now</h1>
      <p class="tagline">Join ZuZu today.</p>
      <h2>${signup ? 'Create your account' : 'Sign in'}</h2>
      ${state.config.google ? `<a class="btn btn-google" href="/auth/google" data-google>${GOOGLE_G}<span>${signup ? 'Sign up with Google' : 'Continue with Google'}</span></a>
      <div class="or"><span>or</span></div>` : ''}
      <form data-form="auth" data-mode="${mode}" autocomplete="on">
        ${signup ? `<div class="field"><label>Name</label><input name="name" maxlength="50" autocomplete="name"></div>` : ''}
        <div class="field"><label>Username</label><input name="username" required autocapitalize="none" autocomplete="username" ${signup ? 'placeholder="e.g. akhil_rajan" autocorrect="off" spellcheck="false"' : ''}></div>
        <div class="field"><label>Password</label><input name="password" type="password" required ${signup ? 'minlength="6" autocomplete="new-password"' : 'autocomplete="current-password"'}></div>
        <button class="btn btn-light" type="submit">${signup ? 'Create account' : 'Log in'}</button>
        <div class="err" role="alert">${googleError ? 'Couldn’t sign in with Google. Please try again, or use your username and password.' : ''}</div>
      </form>
      <div class="alt">${signup ? 'Already have an account? <a href="/login" data-link>Sign in</a>' : 'Don’t have an account? <a href="/signup" data-link>Sign up</a>'}</div>
      ${authAppLink()}
      ${signup ? '' : `<div class="demo">Demo login: <b>demo</b> / <b>demo1234</b></div>`}
    </div></div>`;
}

async function loadFeed(url, emptyHTML) {
  const feed = $('#feed');
  try {
    const { items } = await api('GET', url);
    remember(items);
    if (!$('#feed') || $('#feed') !== feed) return;
    feed.innerHTML = items.length ? items.map(p => postHTML(p)).join('') : emptyHTML;
  } catch (err) { feed.innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
}

function viewHome() {
  const t = state.homeTab;
  shell(`<div class="header"><div class="tabs">
      <button class="tab ${t === 'foryou' ? 'active' : ''}" data-action="home-tab" data-tab="foryou">For you</button>
      <button class="tab ${t === 'following' ? 'active' : ''}" data-action="home-tab" data-tab="following">Following</button>
    </div></div>
    ${appBanner()}
    ${composerHTML({ id: 'home-composer' })}
    <div id="feed">${loader()}</div>`, { active: 'home' });
  loadFeed(t === 'following' ? '/api/feed/home' : '/api/feed/explore',
    `<div class="empty"><h3>Welcome to ZuZu!</h3><p>Follow some people to fill your timeline, or check the For you tab.</p><a class="btn btn-primary" href="/explore" data-link>Explore</a></div>`);
}

function viewExplore() {
  shell(`<div class="header"><div class="header-row" style="padding:6px 16px"><form class="search" data-form="search" style="flex:1">${ic('search')}<input name="q" placeholder="Search people and posts" autocomplete="off"></form></div></div>
    <div class="section-title">Latest posts</div><div id="feed">${loader()}</div>`, { active: 'explore' });
  loadFeed('/api/feed/explore', `<div class="empty"><h3>Nothing here yet</h3></div>`);
}

async function viewSearch() {
  const q = new URLSearchParams(location.search).get('q') || '';
  const tab = new URLSearchParams(location.search).get('f') || 'top';
  const tabLink = (k, l) => `<a class="tab ${tab === k ? 'active' : ''}" href="/search?q=${encodeURIComponent(q)}&f=${k}" data-link>${l}</a>`;
  shell(`<div class="header"><div class="header-row" style="padding:6px 16px;gap:12px"><button class="back" data-action="back">${ic('back')}</button><form class="search" data-form="search" style="flex:1">${ic('search')}<input name="q" value="${esc(q)}" placeholder="Search" autocomplete="off"></form></div>
    <div class="tabs">${tabLink('top', 'Top')}${tabLink('people', 'People')}${tabLink('posts', 'Posts')}</div></div><div id="results">${loader()}</div>`, { active: 'explore' });
  try {
    const { users, posts } = await api('GET', '/api/search?q=' + encodeURIComponent(q));
    remember(posts);
    const el = $('#results'); if (!el) return;
    const people = users.length ? users.map(u => userRow(u)).join('') : '';
    const ps = posts.map(p => postHTML(p)).join('');
    const none = `<div class="empty"><h3>No results for “${esc(q)}”</h3><p>Try searching for something else.</p></div>`;
    if (tab === 'people') el.innerHTML = people || none;
    else if (tab === 'posts') el.innerHTML = ps || none;
    else el.innerHTML = (people ? `<div class="section-title">People</div>${users.slice(0, 3).map(u => userRow(u)).join('')}${users.length > 3 ? `<a class="user-row" style="color:var(--blue)" href="/search?q=${encodeURIComponent(q)}&f=people" data-link>View all</a>` : ''}<div style="border-bottom:1px solid var(--border)"></div>` : '') + (ps ? `<div class="section-title">Posts</div>${ps}` : '') || none;
  } catch (err) { $('#results').innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
}

async function viewNotifications() {
  state.unread = 0;
  shell(`<div class="header"><div class="header-row"><h1>Notifications</h1></div></div><div id="notifs">${loader()}</div>`, { active: 'notifications' });
  try {
    const { items } = await api('GET', '/api/notifications');
    const el = $('#notifs'); if (!el) return;
    const kinds = { like: ['heartFill', 'liked your post'], reply: ['reply', 'replied to you'], follow: ['userFill', 'followed you'], repost: ['rt', 'reposted your post'] };
    el.innerHTML = items.length ? items.map(n => {
      const [icon, verb] = kinds[n.type] || ['bell', n.type];
      const href = n.type === 'follow' ? '/u/' + n.username : '/post/' + n.post_id;
      return `<div class="notif" data-href="${esc(href)}"><div class="kind ${n.type}">${ic(icon)}</div><div class="body">
        <a href="/u/${esc(n.username)}" data-link>${avatar(n, 'sm')}</a>
        <div style="margin-top:8px"><a href="/u/${esc(n.username)}" data-link><b>${esc(n.name)}</b></a> ${verb} <span style="color:var(--muted)">· ${ago(n.created_at)}</span></div>
        ${n.post_text ? `<div class="snippet">${esc(n.post_text)}</div>` : ''}</div></div>`;
    }).join('') : `<div class="empty"><h3>Nothing to see here — yet</h3><p>Likes, replies and new followers will show up here.</p></div>`;
  } catch (err) { $('#notifs').innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
}

async function viewPost(id) {
  shell(`<div class="header"><div class="header-row"><button class="back" data-action="back" aria-label="Back">${ic('back')}</button><h1>Post</h1></div></div><div id="thread">${loader()}</div>`);
  try {
    const { post: p, ancestors, replies } = await api('GET', '/api/posts/' + id);
    remember([p, ...ancestors, ...replies]);
    const el = $('#thread'); if (!el) return;
    const mine = p.user_id === state.me.id;
    el.innerHTML = `${ancestors.map(a => postHTML(a, { thread: true })).join('')}
      <div class="focus" data-post="${p.id}">
        <div class="head"><a href="/u/${esc(p.username)}" data-link>${avatar(p)}</a><div class="who"><a href="/u/${esc(p.username)}" data-link><b>${esc(p.name)}</b></a><div style="color:var(--muted)">@${esc(p.username)}</div></div>
          ${aiBtn(p)}<button class="more" style="position:relative;width:34px;height:34px;border-radius:50%;color:var(--muted)" data-action="post-menu" data-id="${p.id}" data-mine="${mine ? 1 : 0}">${ic('dots')}</button></div>
        ${p.reply_to ? `<div class="replying" style="margin-top:8px">Replying to <a href="/u/${esc(p.reply_to)}" data-link>@${esc(p.reply_to)}</a></div>` : ''}
        ${p.text ? `<div class="text">${richText(p.text)}</div>` : ''}
        ${p.image ? `<div class="media"><img src="${esc(p.image)}" alt=""></div>` : ''}
        <div class="when">${fullDate(p.created_at)}</div>
        ${statsHTML(p)}
        ${actionsHTML(p)}
      </div>
      ${composerHTML({ id: 'reply-composer', parentId: p.id, placeholder: 'Post your reply', buttonLabel: 'Reply' })}
      <div id="replies">${replies.map(r => postHTML(r)).join('')}</div>`;
    $('.focus')?.scrollIntoView({ block: 'start' }); window.scrollBy(0, -60);
  } catch (err) {
    $('#thread').innerHTML = `<div class="empty"><h3>Hmm…this page doesn’t exist.</h3><p>${esc(err.message)}</p></div>`;
  }
}

async function viewProfile(username, tab) {
  shell(`<div class="header"><div class="header-row"><button class="back" data-action="back">${ic('back')}</button><div><h1>@${esc(username)}</h1></div></div></div><div id="profile">${loader()}</div>`, { active: state.me.username.toLowerCase() === username.toLowerCase() ? 'profile' : '' });
  let u;
  try { ({ user: u } = await api('GET', '/api/users/' + username)); }
  catch (err) { $('#profile').innerHTML = `<div class="banner" style="background:#333639"></div><div class="empty"><h3>This account doesn’t exist</h3><p>Try searching for another.</p></div>`; return; }
  const isMe = u.id === state.me.id;
  if (isMe) state.me = { ...state.me, ...u };
  $('.header-row', $('.header')).innerHTML = `<button class="back" data-action="back">${ic('back')}</button><div><h1>${esc(u.name)}</h1><div class="sub">${u.posts} post${u.posts === 1 ? '' : 's'}</div></div>`;
  const tabLink = (k, l) => `<a class="tab ${tab === k ? 'active' : ''}" href="/u/${esc(u.username)}${k === 'posts' ? '' : '/' + k}" data-link>${l}</a>`;
  $('#profile').innerHTML = `
    <div class="banner" style="${u.banner ? `background-image:url(${esc(u.banner)})` : ''}"></div>
    <div class="pf">
      <div class="top">${avatar(u, 'lg')}${isMe ? `<button class="btn btn-outline" data-action="edit-profile">Edit profile</button>` : `<div class="pf-actions"><button class="btn btn-outline btn-icon" data-action="dm-user" data-username="${esc(u.username)}" aria-label="Message" title="Message">${ic('mail')}</button>${followBtn(u)}</div>`}</div>
      <div class="name">${esc(u.name)}</div>
      <div class="handle">@${esc(u.username)}${u.follows_you ? '<span class="follows-you">Follows you</span>' : ''}</div>
      ${u.bio ? `<div class="bio">${richText(u.bio)}</div>` : '<div style="height:12px"></div>'}
      <div class="facts">${u.location ? `<span>${ic('pin')}${esc(u.location)}</span>` : ''}<span>${ic('cal')}Joined ${new Date(u.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span></div>
      <div class="counts"><a href="/u/${esc(u.username)}/following" data-link><b>${u.following}</b> Following</a><a href="/u/${esc(u.username)}/followers" data-link><b id="followers-count">${u.followers}</b> Followers</a></div>
    </div>
    <div class="tabs" style="border-bottom:1px solid var(--border)">${tabLink('posts', 'Posts')}${tabLink('replies', 'Replies')}${tabLink('media', 'Media')}${tabLink('likes', 'Likes')}</div>
    <div id="feed">${loader()}</div>`;
  loadFeed(`/api/users/${encodeURIComponent(u.username)}/posts?tab=${tab}`, `<div class="empty"><h3>${isMe ? 'You haven’t' : '@' + esc(u.username) + ' hasn’t'} ${tab === 'likes' ? 'liked any posts' : tab === 'media' ? 'posted media' : tab === 'replies' ? 'replied to anything' : 'posted'} yet</h3><p>When ${isMe ? 'you do' : 'they do'}, it’ll show up here.</p></div>`);
}

async function viewFollowList(username, which) {
  const tabLink = (k, l) => `<a class="tab ${which === k ? 'active' : ''}" href="/u/${esc(username)}/${k}" data-link>${l}</a>`;
  shell(`<div class="header"><div class="header-row"><button class="back" data-action="back">${ic('back')}</button><div><h1>@${esc(username)}</h1></div></div><div class="tabs">${tabLink('followers', 'Followers')}${tabLink('following', 'Following')}</div></div><div id="list">${loader()}</div>`);
  try {
    const { users } = await api('GET', `/api/users/${encodeURIComponent(username)}/${which}`);
    $('#list').innerHTML = users.length ? users.map(u => userRow(u)).join('') : `<div class="empty"><h3>${which === 'followers' ? 'No followers yet' : 'Not following anyone yet'}</h3></div>`;
  } catch (err) { $('#list').innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
}

// ---------- direct messages ----------
const DM_MAX = 1000;
const DM_POLL_CHAT = 3000, DM_POLL_BADGE = 15000;
// Escape everything, then turn http(s) URLs into links (href is the escaped, protocol-checked URL).
function linkify(t) {
  const re = /\bhttps?:\/\/[^\s<>"']+/gi;
  let out = '', last = 0, m;
  while ((m = re.exec(t))) {
    let url = m[0];
    const trail = url.match(/[.,!?;:)\]}]+$/);
    if (trail) url = url.slice(0, -trail[0].length);
    re.lastIndex = m.index + url.length;
    let okUrl = false;
    try { okUrl = /^https?:$/.test(new URL(url).protocol); } catch {}
    out += esc(t.slice(last, m.index)) + (okUrl
      ? `<a class="link" href="${esc(url)}" target="_blank" rel="noopener noreferrer nofollow ugc">${esc(url.length > 60 ? url.slice(0, 60) + '…' : url)}</a>`
      : esc(url));
    last = m.index + url.length;
  }
  return out + esc(t.slice(last));
}
const dmBadge = () => state.dmUnread ? `<span class="badge" data-dm-badge>${state.dmUnread > 99 ? '99+' : state.dmUnread}</span>` : '';
function setDmUnread(n) {
  state.dmUnread = n || 0;
  $$('.nav a[href="/messages"], .bottom-nav a[href="/messages"]').forEach(a => {
    $('[data-dm-badge]', a)?.remove();
    if (state.dmUnread) $('svg', a).insertAdjacentHTML('afterend', dmBadge());
  });
}
const msgTime = (ts) => new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
function dayLabel(ts) {
  const d = new Date(ts), n = new Date(), y = new Date(Date.now() - 864e5);
  if (d.toDateString() === n.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', ...(d.getFullYear() !== n.getFullYear() ? { year: 'numeric' } : {}) });
}

async function viewMessages(id) {
  if (!$('#dm')) {
    shell(`<div class="dm" id="dm">
      <section class="dm-list">
        <div class="header"><div class="header-row"><h1>Messages</h1></div>
          <div class="dm-new"><form class="search" data-form="dm-new" autocomplete="off">${ic('search')}<input name="q" placeholder="Search people to message" aria-label="Search people to message" autocapitalize="none" spellcheck="false"></form>
          <div class="dm-results" id="dm-results" hidden></div></div></div>
        <div id="dm-convs">${loader()}</div>
      </section>
      <section class="dm-chat" id="dm-chat"></section>
    </div>`, { active: 'messages', layout: 'dm' });
    loadConversations();
  }
  $('#dm').classList.toggle('has-chat', !!id);
  document.body.classList.toggle('dm-chat-open', !!id);
  $$('.dm-conv').forEach(r => r.classList.toggle('active', +r.dataset.conv === id));
  if (id) openChat(id);
  else {
    state.chat = null;
    $('#dm-chat').innerHTML = `<div class="dm-pick"><h2>Select a message</h2><p>Choose from your existing conversations, or start a new one.</p><button class="btn btn-primary" data-action="dm-focus-new">New message</button></div>`;
  }
}

function convRow(c) {
  const lm = c.last_message, mine = lm && lm.sender_id === state.me.id;
  const preview = !lm ? 'No messages yet' : (mine ? 'You: ' : '') + (lm.text || (lm.has_image ? '📷 Photo' : ''));
  const active = state.chat && state.chat.id === c.id;
  return `<a class="dm-conv ${c.unread ? 'unread' : ''} ${active ? 'active' : ''}" href="/messages/${c.id}" data-link data-conv="${c.id}">
    ${avatar(c.user)}<div class="who"><div class="top"><span class="n">${esc(c.user.name)}</span><span class="h">@${esc(c.user.username)}</span><span class="t">· ${ago(c.updated_at)}</span></div>
    <div class="pv">${esc(preview)}</div></div>${c.unread ? `<span class="dm-dot" title="${c.unread} unread">${c.unread > 99 ? '99+' : c.unread}</span>` : ''}</a>`;
}
async function loadConversations() {
  const el = $('#dm-convs'); if (!el) return;
  try {
    const { conversations } = await api('GET', '/api/dm/conversations');
    if ($('#dm-convs') !== el) return;
    state.convs = conversations;
    el.innerHTML = conversations.length ? conversations.map(convRow).join('')
      : `<div class="empty"><h3>Welcome to your inbox!</h3><p>Drop a line, share posts and more with private conversations between you and others on ZuZu.</p></div>`;
    if (state.chat && !state.chat.other) {
      const c = conversations.find(x => x.id === state.chat.id); if (c) chatHeader(c.user);
    }
  } catch (err) { el.innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
}

// "New message" search: matching users appear under the box; picking one opens (or creates) the chat.
let dmSearchT;
async function dmSearch(q) {
  const box = $('#dm-results'); if (!box) return;
  q = q.trim().replace(/^@/, '');
  if (!q) { box.hidden = true; box.innerHTML = ''; return; }
  try {
    const { users } = await api('GET', '/api/search?q=' + encodeURIComponent(q));
    const list = users.filter(u => u.id !== state.me.id).slice(0, 8);
    if ($('form[data-form="dm-new"] input')?.value.trim().replace(/^@/, '') !== q) return;
    box.innerHTML = list.length
      ? list.map(u => `<button type="button" class="dm-result" data-action="dm-user" data-username="${esc(u.username)}">${avatar(u)}<div class="who"><div class="n">${esc(u.name)}</div><div class="h">@${esc(u.username)}</div></div></button>`).join('')
      : `<div class="dm-none">No people found for “${esc(q)}”</div>`;
    box.hidden = false;
  } catch {}
}
async function startDm(username) {
  const { conversation } = await api('POST', '/api/dm/conversations', { username });
  go('/messages/' + conversation.id);
}

function chatHeader(u) {
  const head = $('#dm-chat .dm-chat-head'); if (!head || !state.chat) return;
  state.chat.other = u;
  head.innerHTML = `<button class="back dm-back" data-action="dm-back" aria-label="Back to messages">${ic('back')}</button>
    <a class="dm-peer" href="/u/${esc(u.username)}" data-link>${avatar(u, 'sm')}<div class="who"><div class="n">${esc(u.name)}</div><div class="h">@${esc(u.username)}</div></div></a>`;
}
async function openChat(id) {
  if (state.chat && state.chat.id === id && $('#dm-msgs')) return;
  const c = state.chat = { id, other: null, msgs: new Map(), lastId: 0, hasMore: false, otherRead: 0, stick: true, loaded: false };
  $('#dm-chat').innerHTML = `<div class="dm-chat-head"><button class="back dm-back" data-action="dm-back" aria-label="Back to messages">${ic('back')}</button></div>
    <div class="dm-msgs" id="dm-msgs">${loader()}</div>
    <form class="dm-compose" data-form="dm-send" id="dm-compose">
      <div class="dm-preview" hidden><img alt=""><button type="button" class="x" data-action="dm-clear-image" aria-label="Remove image">${ic('close')}</button></div>
      <div class="dm-bar">
        <label class="tool" title="Add photo" aria-label="Add photo">${ic('image')}<input type="file" name="image" accept="image/png,image/jpeg,image/gif,image/webp" hidden></label>
        <textarea name="text" rows="1" placeholder="Start a new message" aria-label="Message" enterkeyhint="send"></textarea>
        <span class="dm-count"></span>
        <button class="send" type="submit" aria-label="Send" title="Send (Enter)" disabled>${ic('send')}</button>
      </div>
    </form>`;
  const cached = (state.convs || []).find(x => x.id === id);
  if (cached) chatHeader(cached.user);
  const el = $('#dm-msgs');
  el.addEventListener('scroll', () => {
    c.stick = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 80 && c.hasMore) loadOlder(c);
  });
  try {
    const [conv, page] = await Promise.all([
      cached ? null : api('GET', '/api/dm/conversations/' + id),
      api('GET', `/api/dm/conversations/${id}/messages?limit=30`),
    ]);
    if (state.chat !== c) return;
    if (conv) chatHeader(conv.conversation.user);
    addMsgs(c, page.messages); c.hasMore = page.has_more; c.otherRead = page.other_last_read_at; c.loaded = true;
    renderChat(c, { toBottom: true });
    if (!matchMedia('(hover:none)').matches) $('#dm-compose textarea')?.focus();
    markRead(c);
  } catch (err) {
    if (state.chat !== c) return;
    state.chat = null;
    $('#dm-chat').innerHTML = `<div class="dm-chat-head"><button class="back dm-back" data-action="dm-back" aria-label="Back to messages">${ic('back')}</button></div>
      <div class="empty"><h3>Conversation not found</h3><p>${esc(err.message)}</p></div>`;
  }
}
function addMsgs(c, list) {
  let added = false;
  for (const m of list) { if (!c.msgs.has(m.id)) { c.msgs.set(m.id, m); added = true; } if (m.id > c.lastId) c.lastId = m.id; }
  return added;
}
function msgHTML(c, m, prev, next, lastMineId) {
  const mine = m.sender_id === state.me.id;
  const end = !next || next.sender_id !== m.sender_id || next.created_at - m.created_at > 5 * 60e3 || dayLabel(next.created_at) !== dayLabel(m.created_at);
  const seen = mine && m.id === lastMineId && c.otherRead >= m.created_at;
  const day = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at) ? `<div class="dm-day">${esc(dayLabel(m.created_at))}</div>` : '';
  return `${day}<div class="msg ${mine ? 'mine' : 'theirs'} ${end ? 'end' : ''}" data-msg="${m.id}">
    <div class="row">${mine ? `<button class="msg-del" data-action="dm-delete" data-id="${m.id}" aria-label="Delete message" title="Delete">${ic('trash')}</button>` : ''}
      <div class="content" title="${esc(fullDate(m.created_at))}">${m.image ? `<a class="dm-media" href="${esc(m.image)}" target="_blank" rel="noopener"><img class="dm-img" src="${esc(m.image)}" alt="Image"></a>` : ''}${m.text ? `<div class="bubble">${linkify(m.text)}</div>` : ''}</div></div>
    ${end || seen ? `<div class="meta">${end ? `<time>${esc(msgTime(m.created_at))}</time>` : ''}${seen ? `${end ? ' · ' : ''}<span class="seen">Seen</span>` : ''}</div>` : ''}
  </div>`;
}
function renderChat(c, { toBottom = false, keepFromBottom = null } = {}) {
  const el = $('#dm-msgs'); if (!el || state.chat !== c) return;
  const list = [...c.msgs.values()].sort((a, b) => a.id - b.id);
  const lastMine = list.filter(m => m.sender_id === state.me.id).pop();
  const u = c.other;
  el.innerHTML = (c.hasMore ? `<div class="dm-older"><button class="btn btn-outline" data-action="dm-older">${c.loadingOlder ? 'Loading…' : 'Load older messages'}</button></div>` : '')
    + (list.length ? list.map((m, i) => msgHTML(c, m, list[i - 1], list[i + 1], lastMine && lastMine.id)).join('')
      : `<div class="dm-hello">${u ? avatar(u, 'lg') + `<div class="n">${esc(u.name)}</div><div class="h">@${esc(u.username)}</div>` : ''}<p>Say hi 👋</p></div>`);
  if (keepFromBottom != null) el.scrollTop = el.scrollHeight - keepFromBottom;
  else if (toBottom) { el.scrollTop = el.scrollHeight; c.stick = true; }
}
async function loadOlder(c) {
  if (c.loadingOlder || !c.hasMore) return;
  c.loadingOlder = true;
  const el = $('#dm-msgs'); const b = $('.dm-older button', el); if (b) b.textContent = 'Loading…';
  try {
    const first = Math.min(...c.msgs.keys());
    const page = await api('GET', `/api/dm/conversations/${c.id}/messages?before=${first}&limit=30`);
    if (state.chat !== c) return;
    const fromBottom = el.scrollHeight - el.scrollTop;
    addMsgs(c, page.messages); c.hasMore = page.has_more;
    c.loadingOlder = false;
    renderChat(c, { keepFromBottom: fromBottom });
  } catch (err) { toast(err.message); } finally { c.loadingOlder = false; }
}
async function markRead(c) {
  if (document.hidden || state.chat !== c || !c.lastId) return;
  try {
    const { unread } = await api('POST', `/api/dm/conversations/${c.id}/read`, { up_to: c.lastId });
    setDmUnread(unread);
    const row = $(`.dm-conv[data-conv="${c.id}"]`);
    if (row) { row.classList.remove('unread'); $('.dm-dot', row)?.remove(); }
  } catch {}
}
async function pollChat() {
  const c = state.chat;
  if (!c || !c.loaded || c.polling || document.hidden || !$('#dm-msgs') || location.pathname !== '/messages/' + c.id) return;
  c.polling = true;
  try {
    const r = await api('GET', `/api/dm/conversations/${c.id}/messages?after=${c.lastId}&limit=100`);
    if (state.chat !== c) return;
    const added = addMsgs(c, r.messages);
    const seenChanged = r.other_last_read_at !== c.otherRead;
    c.otherRead = r.other_last_read_at;
    if (added || seenChanged) {
      const el = $('#dm-msgs');
      renderChat(c, c.stick ? { toBottom: true } : { keepFromBottom: el.scrollHeight - el.scrollTop });
    }
    if (r.messages.some(m => m.sender_id !== state.me.id)) { markRead(c); loadConversations(); }
  } catch {} finally { c.polling = false; }
}
async function pollDmUnread() {
  if (!state.me || document.hidden) return;
  try { const { unread } = await api('GET', '/api/dm/unread'); setDmUnread(unread); } catch {}
  if ($('#dm-convs')) loadConversations();
}
setInterval(pollChat, DM_POLL_CHAT);
setInterval(pollDmUnread, DM_POLL_BADGE);
document.addEventListener('visibilitychange', () => { if (!document.hidden && state.me) { pollChat(); pollDmUnread(); } });
// Keep the chat pinned to the bottom while images load.
document.addEventListener('load', (e) => {
  if (e.target.tagName === 'IMG' && e.target.closest('#dm-msgs') && state.chat && state.chat.stick) { const el = $('#dm-msgs'); el.scrollTop = el.scrollHeight; }
}, true);

function updateDmComposer(f) {
  const ta = f.text, len = [...ta.value].length;
  ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
  const cnt = $('.dm-count', f);
  cnt.textContent = len > DM_MAX - 100 ? `${DM_MAX - len}` : '';
  cnt.classList.toggle('over', len > DM_MAX);
  $('.send', f).disabled = (!ta.value.trim() && !f.image.files.length) || len > DM_MAX || f.dataset.busy === '1';
}
function clearDmImage(f) { f.image.value = ''; $('.dm-preview', f).hidden = true; updateDmComposer(f); }
async function sendDm(f) {
  const c = state.chat; if (!c || f.dataset.busy === '1') return;
  const text = f.text.value, file = f.image.files[0];
  if ((!text.trim() && !file) || [...text].length > DM_MAX) return;
  f.dataset.busy = '1'; updateDmComposer(f);
  const fd = new FormData(); fd.append('text', text); if (file) fd.append('image', file);
  try {
    const { message } = await api('POST', `/api/dm/conversations/${c.id}/messages`, fd);
    f.text.value = ''; clearDmImage(f);
    if (state.chat === c) { addMsgs(c, [message]); renderChat(c, { toBottom: true }); }
    loadConversations();
  } catch (err) { toast(err.message); }
  finally { f.dataset.busy = ''; updateDmComposer(f); if (!matchMedia('(hover:none)').matches) f.text.focus(); }
}
document.addEventListener('input', (e) => {
  const f = e.target.closest('form[data-form="dm-send"]'); if (f) return updateDmComposer(f);
  if (e.target.closest('form[data-form="dm-new"]')) { clearTimeout(dmSearchT); const v = e.target.value; dmSearchT = setTimeout(() => dmSearch(v), 200); }
});
document.addEventListener('change', (e) => {
  const f = e.target.closest('form[data-form="dm-send"]');
  if (!f || e.target.name !== 'image') return;
  const file = e.target.files[0];
  if (file && file.size > 5 * 1024 * 1024) { toast('Image must be under 5 MB'); clearDmImage(f); return; }
  if (file && !/^image\/(png|jpe?g|gif|webp)$/.test(file.type)) { toast('Only images can be sent'); clearDmImage(f); return; }
  if (file) { $('.dm-preview img', f).src = URL.createObjectURL(file); $('.dm-preview', f).hidden = false; }
  updateDmComposer(f);
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
  const f = e.target.closest('form[data-form="dm-send"]');
  if (f && e.target.name === 'text') { e.preventDefault(); sendDm(f); }
});
document.addEventListener('submit', async (e) => {
  const f = e.target;
  if (f.dataset.form === 'dm-send') { e.preventDefault(); sendDm(f); }
  else if (f.dataset.form === 'dm-new') {
    e.preventDefault();
    const q = f.q.value.trim().replace(/^@/, ''); if (!q) return;
    const first = $('#dm-results .dm-result');
    try { await startDm(first ? first.dataset.username : q); } catch (err) { toast(err.message); }
  }
});
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action^="dm-"]'); if (!el) return;
  e.preventDefault(); e.stopPropagation();
  const a = el.dataset.action;
  try {
    if (a === 'dm-user') { el.disabled = true; await startDm(el.dataset.username); }
    else if (a === 'dm-back') go('/messages');
    else if (a === 'dm-focus-new') $('form[data-form="dm-new"] input')?.focus();
    else if (a === 'dm-older') { if (state.chat) loadOlder(state.chat); }
    else if (a === 'dm-clear-image') clearDmImage(el.closest('form'));
    else if (a === 'dm-delete') {
      const c = state.chat, id = +el.dataset.id; if (!c) return;
      if (!confirm('Delete message? It will be removed for both of you.')) return;
      await api('DELETE', '/api/dm/messages/' + id);
      c.msgs.delete(id); renderChat(c); toast('Message deleted'); loadConversations();
    }
  } catch (err) { el.disabled = false; toast(err.message); }
}, true);

// ---------- ZuZu AI: "Ask ZuZu AI" about a post (side panel on desktop, bottom sheet on mobile) ----------
const AI_Q_MAX = 500;
const ai = { post: null, history: [], busy: false, ctrl: null, opener: null };
function aiBtn(p) {
  if (!state.config.ai) return '';
  return `<button class="ai-btn" data-action="ai-open" data-id="${p.id}" aria-label="Ask ZuZu AI" title="Ask ZuZu AI">${ic('sparkle')}</button>`;
}
// Offer "Translate to English" for Hindi / other non-Latin posts, otherwise "Translate to Hindi".
function aiTranslateChip(p) {
  const t = p.text || '';
  if (/[\u0900-\u097F]/.test(t)) return ['translate_en', 'Translate to English'];
  const letters = t.replace(/[\s\d\p{P}\p{S}]/gu, '');
  const latin = (letters.match(/[A-Za-z\u00C0-\u024F]/g) || []).length;
  return letters && latin / [...letters].length < 0.5 ? ['translate_en', 'Translate to English'] : ['translate_hi', 'Translate to Hindi'];
}
function aiChips(p) {
  const chips = [['explain', 'Explain this post'], ['context', 'Give context'], ['summarize_replies', 'Summarize the replies'], ['fact_check', 'Fact-check']];
  if (p && p.text) chips.push(aiTranslateChip(p));
  return chips;
}

// Safe markdown: everything is escaped; only **bold**, *italic*, `code`, lists, headings and http(s) links are rendered.
function aiLink(url, inner) {
  try { const u = new URL(url); if (u.protocol === 'http:' || u.protocol === 'https:') return `<a class="link" href="${esc(u.href)}" target="_blank" rel="noopener noreferrer nofollow ugc">${inner}</a>`; } catch {}
  return inner;
}
function mdInline(s) {
  const re = /`([^`\n]+)`|\[([^\]\n]{1,300})\]\(\s*(https?:\/\/[^\s)]+)\s*\)|(https?:\/\/[^\s<>"'()]+)|\*\*([^*\n]+?)\*\*|__([^_\n]+?)__|(^|[^*\w])\*([^*\s][^*\n]*?)\*(?!\w)|(^|[^_\w])_([^_\s][^_\n]*?)_(?!\w)/g;
  let out = '', last = 0, m;
  while ((m = re.exec(s))) {
    out += esc(s.slice(last, m.index));
    if (m[1] != null) out += `<code>${esc(m[1])}</code>`;
    else if (m[2] != null) out += aiLink(m[3], mdInline(m[2]));
    else if (m[4] != null) {
      let u = m[4]; const trail = u.match(/[.,!?;:]+$/); if (trail) u = u.slice(0, -trail[0].length);
      out += aiLink(u, esc(u)); re.lastIndex = m.index + u.length;
    } else if (m[5] != null || m[6] != null) out += `<strong>${mdInline(m[5] ?? m[6])}</strong>`;
    else if (m[8] != null) out += esc(m[7]) + `<em>${mdInline(m[8])}</em>`;
    else if (m[10] != null) out += esc(m[9]) + `<em>${mdInline(m[10])}</em>`;
    last = re.lastIndex;
  }
  return out + esc(s.slice(last));
}
function mdRender(src) {
  let html = '', list = null, para = [];
  const flushP = () => { if (para.length) { html += `<p>${para.map(mdInline).join('<br>')}</p>`; para = []; } };
  const closeL = () => { if (list) { html += `</${list}>`; list = null; } };
  for (const line of String(src).replace(/\r/g, '').split('\n')) {
    const ul = line.match(/^\s*[-*•]\s+(.*)$/), ol = line.match(/^\s*\d{1,3}[.)]\s+(.*)$/), h = line.match(/^\s*#{1,6}\s+(.*)$/);
    if (ul || ol) {
      flushP(); const t = ul ? 'ul' : 'ol';
      if (list !== t) { closeL(); html += `<${t}>`; list = t; }
      html += `<li>${mdInline((ul || ol)[1])}</li>`;
    } else if (h) { flushP(); closeL(); html += `<p class="ai-h">${mdInline(h[1])}</p>`; }
    else if (!line.trim()) { flushP(); closeL(); }
    else { closeL(); para.push(line); }
  }
  flushP(); closeL();
  return html;
}

function openAi(id, opener) {
  const p = postCache.get(id); if (!p) return;
  closeAi();
  Object.assign(ai, { post: p, history: [], busy: false, ctrl: null, opener });
  const root = document.createElement('div');
  root.id = 'ai-root';
  root.innerHTML = `<div class="ai-overlay" data-ai-bg></div>
  <section class="ai-panel" role="dialog" aria-modal="true" aria-labelledby="ai-title">
    <div class="ai-grab" aria-hidden="true"><span></span></div>
    <header class="ai-head"><h2 id="ai-title">${ic('sparkle')}<span>ZuZu AI</span></h2><button class="ai-x" data-action="ai-close" aria-label="Close">${ic('close')}</button></header>
    <div class="ai-scroll" id="ai-scroll">
      <div class="ai-post">${avatar(p, 'sm')}<div class="b"><div class="m"><b>${esc(p.name)}</b><span>@${esc(p.username)} · ${ago(p.created_at)}</span></div>
        ${p.text ? `<div class="t">${richText(p.text)}</div>` : ''}${p.image ? `<div class="ai-img">${ic('image')}Image (ZuZu AI only reads the text)</div>` : ''}</div></div>
      <div class="ai-chips">${aiChips(p).map(([k, l]) => `<button class="ai-chip" data-action="ai-chip" data-key="${k}">${ic('sparkle')}${esc(l)}</button>`).join('')}</div>
      <div class="ai-msgs" id="ai-msgs" aria-live="polite"></div>
    </div>
    <form class="ai-ask" data-form="ai-ask" autocomplete="off">
      <textarea name="q" rows="1" maxlength="${AI_Q_MAX}" placeholder="Ask anything about this post" aria-label="Ask ZuZu AI about this post" enterkeyhint="send"></textarea>
      <span class="ai-count"></span>
      <button class="ai-send" type="submit" aria-label="Ask" title="Ask (Enter)" disabled>${ic('send')}</button>
    </form>
    <div class="ai-note">ZuZu AI can make mistakes and can’t browse the web.</div>
  </section>`;
  document.body.appendChild(root);
  document.body.classList.add('ai-open');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('in')));
  if (!matchMedia('(hover:none)').matches) $('.ai-ask textarea', root).focus();
  aiSwipe(root);
}
function closeAi() {
  const root = $('#ai-root'); if (!root) return;
  if (ai.ctrl) ai.ctrl.abort();
  const opener = ai.opener;
  Object.assign(ai, { post: null, history: [], busy: false, ctrl: null, opener: null });
  root.remove();
  document.body.classList.remove('ai-open');
  if (opener && document.body.contains(opener)) opener.focus({ preventScroll: true });
}
// Mobile bottom sheet: drag the handle/header down to close.
function aiSwipe(root) {
  const panel = $('.ai-panel', root); let y0 = null, dy = 0;
  const start = (e) => { if (!matchMedia('(max-width:700px)').matches) return; y0 = e.touches[0].clientY; dy = 0; panel.style.transition = 'none'; };
  const move = (e) => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); panel.style.transform = `translateY(${dy}px)`; };
  const end = () => { if (y0 == null) return; y0 = null; panel.style.transition = ''; panel.style.transform = ''; if (dy > 90) closeAi(); };
  [$('.ai-grab', root), $('.ai-head', root)].forEach(el => { el.addEventListener('touchstart', start, { passive: true }); el.addEventListener('touchmove', move, { passive: true }); el.addEventListener('touchend', end); });
}
function aiScroll(force) {
  const el = $('#ai-scroll'); if (!el) return;
  if (force || el.scrollHeight - el.scrollTop - el.clientHeight < 120) el.scrollTop = el.scrollHeight;
}
function aiSetBusy(b) {
  const root = $('#ai-root'); if (!root) return;
  root.classList.toggle('busy', b);
  $$('.ai-chip', root).forEach(c => c.disabled = b);
  updateAiAsk($('.ai-ask', root));
}
function updateAiAsk(f) {
  if (!f) return;
  const ta = f.q, len = [...ta.value].length;
  ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  const cnt = $('.ai-count', f);
  cnt.textContent = len > AI_Q_MAX - 50 ? String(AI_Q_MAX - len) : '';
  cnt.classList.toggle('over', len > AI_Q_MAX);
  $('.ai-send', f).disabled = ai.busy || !ta.value.trim() || len > AI_Q_MAX;
}

async function aiSend(body, label) {
  const post = ai.post;
  if (!post || ai.busy) return;
  ai.busy = true; aiSetBusy(true);
  const msgs = $('#ai-msgs');
  msgs.insertAdjacentHTML('beforeend', `<div class="ai-q">${esc(label)}</div><div class="ai-a streaming"><div class="ai-md"></div><div class="ai-typing" aria-label="ZuZu AI is typing"><span></span><span></span><span></span></div></div>`);
  const bubble = msgs.lastElementChild, md = $('.ai-md', bubble);
  aiScroll(true);
  const ctrl = ai.ctrl = new AbortController();
  let text = '', done = null, raf = 0;
  const paint = () => { raf = 0; md.innerHTML = mdRender(text); aiScroll(); };
  try {
    const r = await fetch(`/api/ai/post/${post.id}`, {
      method: 'POST', credentials: 'same-origin', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ ...body, history: ai.history, lang: navigator.language || 'en' }),
    });
    if (!r.ok || !(r.headers.get('content-type') || '').startsWith('text/event-stream')) {
      let d = {}; try { d = await r.json(); } catch {}
      throw new Error(d.error || 'ZuZu AI couldn’t answer right now. Please try again.');
    }
    const reader = r.body.getReader(), dec = new TextDecoder();
    let buf = '', err = null;
    for (;;) {
      const { value, done: end } = await reader.read(); if (end) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const ev = buf.slice(0, i); buf = buf.slice(i + 2);
        const name = (ev.match(/^event: (.*)$/m) || [])[1];
        let data = null; try { data = JSON.parse((ev.match(/^data: (.*)$/m) || [])[1]); } catch {}
        if (!data) continue;
        if (!name && typeof data.t === 'string') { text += data.t; if (!raf) raf = requestAnimationFrame(paint); }
        else if (name === 'done') done = data;
        else if (name === 'error') err = data.error;
      }
    }
    if (raf) cancelAnimationFrame(raf);
    paint();
    if (err) throw new Error(err);
    if (!done) throw new Error('The answer was interrupted. Please try again.');
    if (done.truncated) md.insertAdjacentHTML('beforeend', '<p class="ai-cut">(Answer shortened.)</p>');
    ai.history.push({ role: 'user', content: label }, { role: 'assistant', content: text });
    ai.history = ai.history.slice(-12);
  } catch (e) {
    if (ctrl.signal.aborted) return;
    if (raf) cancelAnimationFrame(raf);
    bubble.classList.add('err');
    md.innerHTML = (text ? mdRender(text) : '') + `<div class="ai-err" role="alert">${esc(e.message === 'Failed to fetch' ? 'Couldn’t reach ZuZu. Check your connection and try again.' : e.message)}</div>`;
  } finally {
    bubble.classList.remove('streaming');
    if (ai.ctrl === ctrl) {
      ai.busy = false; ai.ctrl = null; aiSetBusy(false); aiScroll();
      if (!matchMedia('(hover:none)').matches) $('.ai-ask textarea')?.focus();
    }
  }
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action^="ai-"]');
  if (!el) { if (e.target.matches('[data-ai-bg]')) closeAi(); return; }
  e.preventDefault(); e.stopPropagation();
  const a = el.dataset.action;
  if (a === 'ai-open') openAi(+el.dataset.id, el);
  else if (a === 'ai-close') closeAi();
  else if (a === 'ai-chip') { const c = aiChips(ai.post).find(x => x[0] === el.dataset.key); if (c) aiSend({ action: c[0] }, c[1]); }
}, true);
document.addEventListener('input', (e) => { const f = e.target.closest('form[data-form="ai-ask"]'); if (f) updateAiAsk(f); });
document.addEventListener('submit', (e) => {
  const f = e.target; if (f.dataset.form !== 'ai-ask') return;
  e.preventDefault();
  const q = f.q.value.trim();
  if (!q || ai.busy) return;
  if ([...q].length > AI_Q_MAX) return toast(`Questions can be up to ${AI_Q_MAX} characters`);
  f.q.value = ''; updateAiAsk(f);
  aiSend({ question: q }, q);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('#ai-root')) { e.stopImmediatePropagation(); closeAi(); return; }
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.target.closest('form[data-form="ai-ask"]') && e.target.name === 'q') { e.preventDefault(); e.target.form.requestSubmit(); }
}, true);

// ---------- boot ----------
async function refreshMe() {
  try { const r = await api('GET', '/api/me'); state.me = r.user; state.unread = r.unread || 0; state.dmUnread = r.dm_unread || 0; } catch { state.me = null; }
}
setInterval(async () => {
  if (!state.me || document.hidden) return;
  const before = state.unread; await refreshMe();
  if (state.unread !== before) $$('a[href="/notifications"] .badge').forEach(b => b.textContent = state.unread);
  setDmUnread(state.dmUnread);
  if (state.unread && !before && location.pathname !== '/notifications') {
    $$('a[href="/notifications"]').forEach(a => { if (!$('.badge', a)) a.insertAdjacentHTML('beforeend', `<span class="badge">${state.unread}</span>`); });
  }
}, 30000);
async function loadConfig() {
  try { state.config = await api('GET', '/api/config'); } catch {}
}
Promise.all([refreshMe(), loadConfig()]).then(render);
})();
