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
  logout: 'M16 13v-2H7V8l-5 4 5 4v-3h9zM20 3h-9c-1.103 0-2 .897-2 2v4h2V5h9v14h-9v-4H9v4c0 1.103.897 2 2 2h9c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2z',
};
const ic = (name, cls = 'icon') => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true"><path d="${P[name]}"/></svg>`;

// ---------- state & api ----------
const state = { me: null, unread: 0, homeTab: localStorage.getItem('homeTab') || 'following' };
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
  if (u.avatar) return `<img class="avatar ${cls}" src="${esc(u.avatar)}" alt="">`;
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
  return esc(t).replace(/(https?:\/\/[^\s<]+)|(^|[^\w&])@(\w{1,15})|(^|[^\w&])#([\p{L}\p{N}_]+)/gu, (m, url, p1, user, p2, tag) => {
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
  [/^\/search$/, () => viewSearch()],
  [/^\/post\/(\d+)$/, (m) => viewPost(m[1])],
  [/^\/u\/(\w+)\/(followers|following)$/, (m) => viewFollowList(m[1], m[2])],
  [/^\/u\/(\w+)(?:\/(replies|media|likes))?$/, (m) => viewProfile(m[1], m[2] || 'posts')],
];
const PUBLIC = ['/login', '/signup'];
function go(url, replace) {
  if (replace) history.replaceState({}, '', url); else history.pushState({}, '', url);
  render();
}
async function render() {
  closeMenus();
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
function shell(center, { active = '' } = {}) {
  const me = state.me;
  const navItem = (href, key, icon, iconOn, label) => `<a class="nav-item ${active === key ? 'active' : ''}" href="${href}" data-link>${ic(active === key && iconOn ? iconOn : icon)}${key === 'notifications' && state.unread ? `<span class="badge">${state.unread > 99 ? '99+' : state.unread}</span>` : ''}<span class="lbl">${label}</span></a>`;
  $('#app').innerHTML = `
  <div class="layout">
    <header class="nav">
      <a class="logo" href="/home" data-link aria-label="ZuZu home">${ic('z')}<span class="wordmark">ZuZu</span></a>
      ${navItem('/home', 'home', 'home', 'homeFill', 'Home')}
      ${navItem('/explore', 'explore', 'search', null, 'Explore')}
      ${navItem('/notifications', 'notifications', 'bell', null, 'Notifications')}
      ${navItem('/u/' + me.username, 'profile', 'user', 'userFill', 'Profile')}
      <button class="btn btn-primary btn-big" data-action="compose">${ic('feather')}<span class="lbl">Post</span></button>
      <div class="me-chip" data-action="me-menu">${avatar(me)}<div class="who"><div style="font-weight:700">${esc(me.name)}</div><div style="color:var(--muted)">@${esc(me.username)}</div></div><span class="dots">${ic('dots')}</span></div>
    </header>
    <main class="main">
      <div class="mobile-top">
        <a href="/u/${esc(me.username)}" data-link>${avatar(me, 'sm')}</a>
        <a class="logo" href="/home" data-link aria-label="ZuZu home">${ic('z')}</a>
        <button class="spacer" data-action="logout" aria-label="Log out" title="Log out">${ic('logout')}</button>
      </div>
      <div id="center">${center}</div>
    </main>
    <aside class="side">
      <div class="searchbox"><form class="search" data-form="search">${ic('search')}<input name="q" placeholder="Search" autocomplete="off" value="${esc(new URLSearchParams(location.search).get('q') || '')}"></form></div>
      <div class="card" id="trends"><h2>What’s happening</h2>${loader()}</div>
      <div class="card" id="wtf"><h2>Who to follow</h2>${loader()}</div>
      <div class="footer-note">ZuZu · a demo social app</div>
    </aside>
  </div>
  <button class="fab" data-action="compose" aria-label="Post">${ic('feather')}</button>
  <nav class="bottom-nav">
    <a href="/home" data-link>${ic(active === 'home' ? 'homeFill' : 'home')}</a>
    <a href="/explore" data-link>${ic('search')}</a>
    <a href="/notifications" data-link>${ic('bell')}${state.unread ? `<span class="badge">${state.unread}</span>` : ''}</a>
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
        <button class="more" data-action="post-menu" data-id="${p.id}" data-mine="${mine ? 1 : 0}" aria-label="More">${ic('dots', 'icon')}</button></div>
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
function viewAuth(mode) {
  const signup = mode === 'signup';
  $('#app').innerHTML = `<div class="auth">
    <div class="bigx"><div class="brand">${ic('z', '')}<span class="wordmark">ZuZu</span></div></div>
    <div class="panel">
      <h1>Happening now</h1>
      <p class="tagline">Join ZuZu today.</p>
      <h2>${signup ? 'Create your account' : 'Sign in'}</h2>
      <form data-form="auth" data-mode="${mode}" autocomplete="on">
        ${signup ? `<div class="field"><label>Name</label><input name="name" maxlength="50" autocomplete="name"></div>` : ''}
        <div class="field"><label>Username</label><input name="username" required autocapitalize="none" autocomplete="username" ${signup ? 'pattern="[A-Za-z0-9_]{3,15}" title="3–15 letters, numbers or _"' : ''}></div>
        <div class="field"><label>Password</label><input name="password" type="password" required ${signup ? 'minlength="6" autocomplete="new-password"' : 'autocomplete="current-password"'}></div>
        <button class="btn btn-light" type="submit">${signup ? 'Create account' : 'Log in'}</button>
        <div class="err"></div>
      </form>
      <div class="alt">${signup ? 'Already have an account? <a href="/login" data-link>Sign in</a>' : 'Don’t have an account? <a href="/signup" data-link>Sign up</a>'}</div>
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
          <button class="more" style="position:relative;width:34px;height:34px;border-radius:50%;color:var(--muted)" data-action="post-menu" data-id="${p.id}" data-mine="${mine ? 1 : 0}">${ic('dots')}</button></div>
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
      <div class="top">${avatar(u, 'lg')}${isMe ? `<button class="btn btn-outline" data-action="edit-profile">Edit profile</button>` : followBtn(u)}</div>
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

// ---------- boot ----------
async function refreshMe() {
  try { const r = await api('GET', '/api/me'); state.me = r.user; state.unread = r.unread || 0; } catch { state.me = null; }
}
setInterval(async () => {
  if (!state.me || document.hidden) return;
  const before = state.unread; await refreshMe();
  if (state.unread !== before) $$('.nav-item .badge, .bottom-nav .badge').forEach(b => b.textContent = state.unread);
  if (state.unread && !before && location.pathname !== '/notifications') {
    $$('a[href="/notifications"]').forEach(a => { if (!$('.badge', a)) a.insertAdjacentHTML('beforeend', `<span class="badge">${state.unread}</span>`); });
  }
}, 30000);
refreshMe().then(render);
})();
