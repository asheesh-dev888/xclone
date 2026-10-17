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
  chart: 'M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z',
  check: 'M9 20c-.264 0-.52-.104-.707-.293l-4.785-4.785 1.414-1.414L9 17.586 19.072 7.5l1.414 1.414L9.707 19.707A1 1 0 0 1 9 20z',
  video: 'M3 6.5C3 5.12 4.12 4 5.5 4h9C15.88 4 17 5.12 17 6.5v1.38l3.55-2.13A1 1 0 0 1 22 6.6v10.8a1 1 0 0 1-1.45.85L17 16.12v1.38c0 1.38-1.12 2.5-2.5 2.5h-9C4.12 20 3 18.88 3 17.5v-11zM5.5 6c-.28 0-.5.22-.5.5v11c0 .28.22.5.5.5h9c.28 0 .5-.22.5-.5v-11c0-.28-.22-.5-.5-.5h-9zM17 10.2v3.6l3 1.8V8.4l-3 1.8z',
  mic: 'M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z',
  poll: 'M4 4h2v16H4zm5 6h2v10H9zm5-4h2v14h-2zm5 8h2v6h-2z',
  record: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z',
  games: 'M6.5 8h11A4.5 4.5 0 0 1 22 12.5v1A4.5 4.5 0 0 1 17.5 18c-1.4 0-2.3-.5-3.2-1.4L13 15.3h-2l-1.3 1.3C8.8 17.5 7.9 18 6.5 18A4.5 4.5 0 0 1 2 13.5v-1A4.5 4.5 0 0 1 6.5 8zM7 10.5v1.25H5.75v1.5H7.01v1.25h1.5v-1.25h1.25v-1.5H8.5V10.5H7zm9.25.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm2.5 1.75a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  reels: 'M5.5 3h13C19.88 3 21 4.12 21 5.5v13c0 1.38-1.12 2.5-2.5 2.5h-13C4.12 21 3 19.88 3 18.5v-13C3 4.12 4.12 3 5.5 3zM5 9v9.5c0 .28.22.5.5.5h13c.28 0 .5-.22.5-.5V9H5zm0-2h2.6l2-2H5.5c-.28 0-.5.22-.5.5V7zm5.4 0h3.2l2-2h-3.2l-2 2zm6 0H19V5.5c0-.28-.22-.5-.5-.5h-.1l-2 2zM10 10.8l5.2 3.2-5.2 3.2v-6.4z',
  reelsFill: 'M5.5 3h1.9l-4 4H3V5.5C3 4.12 4.12 3 5.5 3zm4.7 0h3.2l-4 4H6.2l4-4zm6 0h2.3C19.88 3 21 4.12 21 5.5V7h-8.8l4-4zM3 9h18v9.5c0 1.38-1.12 2.5-2.5 2.5h-13C4.12 21 3 19.88 3 18.5V9zm7 1.8v6.4l5.2-3.2-5.2-3.2z',
  volOn: 'M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zM16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM3 9v6h4l5 5V4L7 9H3z',
  volOff: 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z',
  play: 'M8 5.14v13.72a1 1 0 0 0 1.52.85l10.6-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z',
  sparkle: 'M10 2.5l1.95 5.55L17.5 10l-5.55 1.95L10 17.5l-1.95-5.55L2.5 10l5.55-1.95L10 2.5zm0 4.6l-.85 2.05L7.1 10l2.05.85L10 12.9l.85-2.05L12.9 10l-2.05-.85L10 7.1zM18.5 14l.95 2.55L22 17.5l-2.55.95L18.5 21l-.95-2.55L15 17.5l2.55-.95L18.5 14z',
};
P.gear = 'M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zm0 5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm8.4-1.06l1.73-1.35-1.99-3.45-2.04.82a7.3 7.3 0 00-1.83-1.06L16 3.25h-4l-.3 2.15c-.66.26-1.27.62-1.83 1.06l-2.04-.82-1.99 3.45 1.73 1.35a7.4 7.4 0 000 2.12l-1.73 1.35 1.99 3.45 2.04-.82c.56.44 1.17.8 1.83 1.06l.3 2.15h4l.3-2.15c.66-.26 1.27-.62 1.83-1.06l2.04.82 1.99-3.45-1.73-1.35a7.4 7.4 0 000-2.12zm-2.2 1.77l-.13.87 1.16.9-.85 1.48-1.37-.55-.69.53c-.41.32-.86.58-1.35.77l-.81.32-.2 1.47h-1.72l-.2-1.47-.81-.32a5.3 5.3 0 01-1.35-.77l-.69-.53-1.37.55-.85-1.48 1.16-.9-.13-.87a5.4 5.4 0 010-1.54l.13-.87-1.16-.9.85-1.48 1.37.55.69-.53c.41-.32.86-.58 1.35-.77l.81-.32.2-1.47h1.72l.2 1.47.81.32c.49.19.94.45 1.35.77l.69.53 1.37-.55.85 1.48-1.16.9.13.87a5.4 5.4 0 010 1.54z';
P.flag = 'M5 2v20h2v-7h11.5l-2-4.5 2-4.5H7V2H5zm2 4h8.42l-1.1 2.5 1.1 2.5H7V6z';
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
const state = { me: null, unread: 0, dmUnread: 0, chat: null, convs: [], homeTab: localStorage.getItem('homeTab') || 'following', config: { google: false, ai: false, video: false } };
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
  [/^\/forgot$/, () => viewForgot()],
  [/^\/reset$/, () => viewReset()],
  [/^\/home$/, () => viewHome()],
  [/^\/explore$/, () => viewExplore()],
  [/^\/notifications$/, () => viewNotifications()],
  [/^\/messages(?:\/(\d+))?$/, (m) => viewMessages(m[1] ? +m[1] : null)],
  [/^\/search$/, () => viewSearch()],
  [/^\/admin\/?$/, () => viewAdmin()],
  [/^\/reels(?:\/(\d+))?\/?$/, (m) => viewReels(m[1] ? +m[1] : null)],
  [/^\/post\/(\d+)$/, (m) => viewPost(m[1])],
  [/^\/u\/([\w.]+)\/(followers|following)$/, (m) => viewFollowList(m[1], m[2])],
  [/^\/u\/([\w.]+)(?:\/(replies|media|reels|likes))?$/, (m) => viewProfile(m[1], m[2] || 'posts')],
];
const PUBLIC = ['/login', '/signup', '/forgot', '/reset'];
function go(url, replace) {
  if (replace) history.replaceState({}, '', url); else history.pushState({}, '', url);
  render();
}
async function render() {
  closeMenus(); closeAi(); reelsTeardown(); if (window.__gameTeardown) { try { window.__gameTeardown(); } catch {} window.__gameTeardown = null; }
  $$('#app form[data-form="compose"]').forEach(f => { clearComposerVideo(f); clearVoice(f); }); // leaving the page drops an unposted upload
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
  document.body.classList.toggle('admin-page', layout === 'admin');
  document.body.classList.toggle('reels-page', layout === 'reels');
  document.body.classList.remove('dm-chat-open');
  const badge = (key) => key === 'notifications' && state.unread ? `<span class="badge">${state.unread > 99 ? '99+' : state.unread}</span>` : key === 'messages' ? dmBadge() : '';
  const navItem = (href, key, icon, iconOn, label) => `<a class="nav-item ${active === key ? 'active' : ''}" href="${href}" data-link>${ic(active === key && iconOn ? iconOn : icon)}${badge(key)}<span class="lbl">${label}</span></a>`;
  $('#app').innerHTML = `
  <div class="layout">
    <header class="nav">
      <a class="logo" href="/home" data-link aria-label="ZuZu home">${ic('z')}<span class="wordmark">ZuZu</span></a>
      ${navItem('/home', 'home', 'home', 'homeFill', 'Home')}
      ${navItem('/explore', 'explore', 'search', null, 'Explore')}
      ${state.config.video ? navItem('/reels', 'reels', 'reels', 'reelsFill', 'Reels') : ''}
      ${navItem('/games', 'games', 'games', null, 'Games')}
      ${navItem('/notifications', 'notifications', 'bell', null, 'Notifications')}
      ${navItem('/messages', 'messages', 'mail', 'mailFill', 'Messages')}
      ${navItem('/u/' + me.username, 'profile', 'user', 'userFill', 'Profile')}
      ${state.admin ? navItem('/admin', 'admin', 'chart', null, 'Admin') : ''}
      ${navAppLink()}
      ${momoToggleHTML(false)}
      <button class="btn btn-primary btn-big" data-action="compose">${ic('feather')}<span class="lbl">Post</span></button>
      <div class="me-chip" data-action="me-menu">${avatar(me)}<div class="who"><div style="font-weight:700">${esc(me.name)}</div><div style="color:var(--muted)">@${esc(me.username)}</div></div><span class="dots">${ic('dots')}</span></div>
    </header>
    <main class="main ${layout === 'dm' ? 'dm-main' : layout === 'admin' ? 'admin-main' : layout === 'reels' ? 'reels-main' : ''}">
      <div class="mobile-top">
        <a href="/u/${esc(me.username)}" data-link>${avatar(me, 'sm')}</a>
        <a class="logo" href="/home" data-link aria-label="ZuZu home">${ic('z')}</a>
        ${state.admin ? `<a class="mobile-admin" href="/admin" data-link aria-label="Admin" title="Admin">${ic('chart')}</a>` : ''}
        <div class="mt-right">${momoToggleHTML(true)}<a class="spacer" href="/settings" data-link aria-label="Settings" title="Settings">${ic('gear')}</a><button class="spacer" data-action="logout" aria-label="Log out" title="Log out">${ic('logout')}</button></div>
      </div>
      <div id="center">${center}</div>
    </main>
    ${layout === 'dm' || layout === 'admin' || layout === 'reels' ? '' : `<aside class="side">
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
    ${state.config.video ? `<a href="/reels" data-link aria-label="Reels" class="bn-reels">${ic(active === 'reels' ? 'reelsFill' : 'reels')}</a>` : ''}
    <a href="/games" data-link aria-label="Games" class="bn-games">${ic('games')}</a>
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
      <div class="meta"><a class="name" href="/u/${esc(p.username)}" data-link>${esc(p.name)}</a>${idealDot(p.ideal)}<span class="handle">@${esc(p.username)}</span><span>·</span><a href="/post/${p.id}" data-link title="${esc(fullDate(p.created_at))}">${ago(p.created_at)}</a>
        ${aiBtn(p)}<button class="more" data-action="post-menu" data-id="${p.id}" data-mine="${mine ? 1 : 0}" aria-label="More">${ic('dots', 'icon')}</button></div>
      ${p.reply_to ? `<div class="replying">Replying to <a href="/u/${esc(p.reply_to)}" data-link>@${esc(p.reply_to)}</a></div>` : ''}
      ${challengeChip(p)}
      ${probeChip(p)}
      ${p.text ? `<div class="text">${richText(p.text)}</div>` : ''}
      ${probeHTML(p)}
      ${p.image ? `<div class="media"><img src="${esc(p.image)}" loading="lazy" alt=""></div>` : ''}
      ${p.video ? videoHTML(p) : ''}
      ${p.audio ? audioHTML(p) : ''}
      ${p.poll ? pollHTML(p) : ''}
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
  $$(`[data-reel-side="${p.id}"]`).forEach(el => { el.outerHTML = reelSideHTML(postCache.get(p.id)); });
  $$(`[data-actions="${p.id}"]`).forEach(el => {
    const wasFocus = el.closest('.focus');
    el.outerHTML = actionsHTML(p);
    if (wasFocus) { const st = $('.focus .stats'); if (st) st.outerHTML = statsHTML(p); }
  });
}
const statsHTML = (p) => `<div class="stats"><span><b>${p.repost_count}</b> Reposts</span><span><b>${p.like_count}</b> Likes</span><span><b>${p.reply_count}</b> Replies</span></div>`;

// ---------- composer ----------
function composerHTML({ id, placeholder = 'What is happening?!', parentId = '', buttonLabel = 'Post', autofocus = false, challenge = false }) {
  return `<form class="composer" data-form="compose" id="${id}" data-parent="${parentId}"${challenge ? ' data-challenge="1"' : ''}>
    ${avatar(state.me)}
    <div class="body">
      <textarea name="text" rows="1" placeholder="${esc(placeholder)}" ${autofocus ? 'autofocus' : ''}></textarea>
      <div class="preview" hidden><img alt=""><button type="button" class="x" data-action="clear-image" aria-label="Remove image">${ic('close', 'icon')}</button></div>
      ${state.config.video ? videoPreviewHTML(!parentId) : ''}
      <div class="voice-box" hidden data-state=""><button type="button" class="vb-stop" data-action="voice-stop" aria-label="Stop recording"><span></span></button><span class="vb-dot"></span><span class="vb-time">0:00</span><audio controls preload="metadata" hidden></audio><span class="vb-status"></span><button type="button" class="x" data-action="voice-clear" aria-label="Remove voice note">${ic('close', 'icon')}</button></div>
      ${parentId ? '' : `<div class="poll-edit" hidden>
        <div class="pe-opts">${[1, 2].map(i => `<input class="pe-opt" maxlength="25" placeholder="Choice ${i}" autocomplete="off">`).join('')}</div>
        <button type="button" class="pe-add" data-action="poll-add">+ Add a choice</button>
        <div class="pe-row"><label>Poll length <select class="pe-len">${[[60, '1 hour'], [360, '6 hours'], [720, '12 hours'], [1440, '1 day'], [4320, '3 days'], [10080, '7 days']].map(([m, l]) => `<option value="${m}"${m === 1440 ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <button type="button" class="pe-remove" data-action="poll-toggle">Remove poll</button></div></div>`}
      ${parentId || challenge ? '' : probeMoreHTML()}
      <div class="tools">
        <div class="tool-row"><label class="tool" title="Add photo">${ic('image')}<input type="file" name="image" accept="image/png,image/jpeg,image/gif,image/webp" hidden></label>
        ${state.config.video ? `<label class="tool tool-video" title="Add video" aria-label="Add video">${ic('video')}<input type="file" name="video" accept="video/*,.mkv,.3gp,.mov" hidden></label>
        <label class="tool tool-record" title="Record a video" aria-label="Record a video">${ic('record')}<input type="file" name="video_capture" accept="video/*" capture="environment" hidden></label>` : ''}
        ${state.config.video && window.MediaRecorder ? `<button type="button" class="tool tool-voice" data-action="voice-rec" title="Record a voice note (up to 30 s)" aria-label="Record a voice note">${ic('mic')}</button>` : ''}
        ${parentId ? '' : `<button type="button" class="tool tool-poll" data-action="poll-toggle" title="Poll" aria-label="Add a poll">${ic('poll')}</button>`}
        ${parentId || challenge ? '' : probeSelHTML()}</div>
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
  const vs = composerVideo.get(form);
  const vidReady = !!(vs && vs.result), vidBusy = !!(vs && !vs.result);
  ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px';
  const cnt = $('.counter', form);
  const left = MAX - len;
  cnt.className = 'counter' + (left < 0 ? ' over' : left <= 20 ? ' warn' : '');
  cnt.innerHTML = len ? `${left <= 20 ? `<span>${left}</span>` : ''}${ring(len)}` : '';
  const vo = composerVoice.get(form), voReady = !!(vo && vo.result), voBusy = !!(vo && !vo.result);
  const pe = $('.poll-edit', form), pollOn = pe && !pe.hidden;
  const pollOk = !pollOn || ($$('.pe-opt', pe).filter(i => i.value.trim()).length >= 2 && !!ta.value.trim());
  $('button[type=submit]', form).disabled = (!ta.value.trim() && !hasImg && !vidReady && !voReady) || len > MAX || vidBusy || voBusy || !pollOk;
}
document.addEventListener('input', (e) => { const f = e.target.closest('form[data-form="compose"]'); if (f) updateComposer(f); });
document.addEventListener('change', (e) => {
  const f = e.target.closest('form[data-form="compose"]');
  if (f && e.target.name === 'image') {
    const file = e.target.files[0], pv = $('.preview', f);
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast('Image must be under 5 MB'); e.target.value = ''; }
      else { clearComposerVideo(f); $('img', pv).src = URL.createObjectURL(file); pv.hidden = false; }
    }
    updateComposer(f);
  }
  if (f && (e.target.name === 'video' || e.target.name === 'video_capture')) {
    const file = e.target.files[0]; e.target.value = '';
    if (file) pickComposerVideo(f, file);
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
    if (f.dataset.challenge) fd.append('challenge', '1');
    const vs = composerVideo.get(f);
    if (vs && vs.result) {
      const r = vs.result;
      fd.append('video', JSON.stringify({ public_id: r.public_id, version: r.version, duration: r.duration || vs.meta.duration, width: r.width, height: r.height, bytes: r.bytes, cloud_name: vs.cloudName }));
      if (!f.dataset.parent && f.is_reel && f.is_reel.checked) fd.append('is_reel', '1');
    }
    const vo = composerVoice.get(f);
    if (vo && vo.result) fd.append('voice', JSON.stringify({ public_id: vo.result.public_id, version: vo.result.version, duration: vo.result.duration || vo.seconds, bytes: vo.result.bytes, cloud_name: vo.cloudName }));
    probeAppend(f, fd);
    const pe = $('.poll-edit', f);
    if (pe && !pe.hidden) { fd.append('poll_options', JSON.stringify($$('.pe-opt', pe).map(i => i.value.trim()).filter(Boolean))); fd.append('poll_minutes', $('.pe-len', pe).value); }
    try {
      const { post } = await api('POST', '/api/posts', fd);
      remember([post]);
      f.reset(); $('.preview', f).hidden = true; clearComposerVideo(f, { posted: true }); clearVoice(f, { posted: true }); pollReset(f); probeReset(f); updateComposer(f);
      const inModal = f.closest('.modal');
      if (inModal) closeModal();
      if (f.dataset.challenge) { dailyLoad(); if (location.pathname === '/challenge') return viewChallenge(); }
      toast(f.dataset.challenge ? 'Your thought was shared.' : f.dataset.parent ? 'Your reply was sent.' : post.video && post.video.is_reel ? 'Your reel was posted.' : 'Your post was sent.');
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
      if (mode === 'signup') {
        body.name = f.name.value.trim();
        const r = readIdeal($('#signup-ideal', f));
        if (r.error) { idealError($('#signup-ideal', f), r.error); btn.disabled = false; return; }
        if (r.ideal) body.ideal = r.ideal;
        if (f.email.value.trim()) body.email = f.email.value.trim();
      }
      const { user, recovery_code } = await api('POST', '/api/' + mode, body);
      state.me = user; state.unread = 0;
      await refreshMe();
      if (recovery_code) return showRecoveryCode(recovery_code, () => go('/home', true), { title: 'Save your recovery code' });
      go('/home', true);
    } catch (ex) { err.textContent = ex.message; btn.disabled = false; }
    return;
  }
  if (f.dataset.form === 'edit-profile') {
    e.preventDefault();
    const btn = $('[data-action="save-profile"]');
    const picker = $('#edit-ideal', f), ir = readIdeal(picker);
    if (ir.error) return idealError(picker, ir.error);
    if (btn) btn.disabled = true;
    try {
      const fd = new FormData(f);
      if (!f.avatar.files[0]) fd.delete('avatar');
      if (!f.banner.files[0]) fd.delete('banner');
      let { user } = await api('PUT', '/api/me', fd);
      if (picker) ({ user } = await api('PUT', '/api/me/ideal', { ideal: ir.ideal }));
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
    } else if (a === 'probe-resolve') await probeResolve(id, el.dataset.outcome);
    else if (a === 'probe-connections') await probeConnections(id, el);
    else if (a === 'probe-toggle') {
      const f = el.closest('form'), pe = $('.probe-edit', f);
      if (pe.hidden) { pe.hidden = false; el.setAttribute('aria-expanded', 'true'); $('.pk-sel', f).focus(); } else probeReset(f);
    }
    else if (a === 'post-menu') {
      closeMenus();
      const mine = el.dataset.mine === '1';
      el.insertAdjacentHTML('beforeend', `<div class="dropdown">${mine ? `<button class="danger" data-action="delete" data-id="${id}">${ic('trash')}Delete</button>` : ''}<button data-action="copy-link" data-id="${id}">${ic('link')}Copy link</button>${mine ? '' : `<button data-action="report" data-type="post" data-id="${id}">${ic('flag')}Report post</button>`}</div>`);
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
      el.insertAdjacentHTML('beforeend', `<div class="menu"><a href="/u/${esc(state.me.username)}" data-link>View profile</a><a href="/settings" data-link>Settings</a><button data-action="logout">Log out @${esc(state.me.username)}</button></div>`);
    } else if (a === 'logout') {
      await api('POST', '/api/logout'); state.me = null; go('/login', true);
    } else if (a === 'clear-video' || a === 'cancel-video') {
      const f = el.closest('form'); clearComposerVideo(f); updateComposer(f);
      if (a === 'cancel-video') toast('Upload cancelled');
    } else if (a === 'clear-image') {
      const f = el.closest('form'); f.image.value = ''; $('.preview', f).hidden = true; updateComposer(f);
    } else if (a === 'close-modal') closeModal();
    else if (a === 'edit-profile') openEditProfile();
    else if (a === 'save-profile') $('#edit-form').requestSubmit();
    else if (a === 'back') history.length > 1 ? history.back() : go('/home');
    else if (a === 'home-tab') { state.homeTab = el.dataset.tab; localStorage.setItem('homeTab', state.homeTab); viewHome(); }
    else if (a === 'go') go(el.dataset.href);
    else if (a === 'open-ideal') openIdealModal();
    else if (a === 'dismiss-ideal-prompt') { store('localStorage', idealPromptKey(), '1'); $('#ideal-prompt')?.remove(); }
    else if (a === 'save-ideal') {
      el.disabled = true;
      const user = await saveIdealFrom($('#ideal-modal-picker'));
      el.disabled = false;
      if (!user) return;
      closeModal(); $('#ideal-prompt')?.remove();
      toast(user.ideal ? 'Your ideal: ' + user.ideal.name : 'Ideal removed');
      if (location.pathname.toLowerCase() === '/u/' + state.me.username.toLowerCase()) viewProfile(state.me.username, 'posts');
    }
    else if (a === 'momo-toggle') momoToggle();
    else if (a === 'momo-sound') momoSoundToggle();
    else if (a === 'dismiss-app-banner') { store('localStorage', BANNER_KEY, '1'); $('#app-banner')?.remove(); }
  } catch (err) {
    el.classList.remove('pop');
    toast(err.message);
  }
});

// ---------- modals ----------
function openModal(html) { $('#modal-root').innerHTML = `<div class="modal-bg" data-bg>${html}</div>`; document.body.style.overflow = 'hidden'; }
function closeModal() { $$('#modal-root form[data-form="compose"]').forEach(f => { clearComposerVideo(f); clearVoice(f); }); $('#modal-root').innerHTML = ''; document.body.style.overflow = ''; }
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
    ${idealPicker('edit-ideal', u.ideal, { skipLabel: 'No ideal' })}
  </form></div>`);
  revealIdeal($('#edit-ideal'));
}

// ---------- Choose your ideal (role model) ----------
// Palette + presets come from /ideals.js (shared with the server). Colours are only ever taken from the
// palette by quality key, never from user input; ideal names are always escaped.
const IDEALS = window.ZUZU_IDEALS || { QUALITIES: [], PRESETS: [], CUSTOM_NAME_MAX: 40, CUSTOM_QUALITIES_MAX: 3 };
const QMAP = new Map(IDEALS.QUALITIES.map(q => [q.key, q]));
const qColor = (k) => (QMAP.get(k) || {}).color || '#71767b';
const presetQs = (p) => [p.primary, ...(p.secondary || [])].filter(k => QMAP.has(k)).slice(0, 3);
const IDEAL_PROMPT_KEY = 'zuzu.idealPromptDismissed';
const idealPromptKey = () => IDEAL_PROMPT_KEY + '.' + (state.me ? state.me.id : '');
const qChips = (keys) => keys.filter(k => QMAP.has(k)).map((k, i) => `<span class="q-chip${i ? '' : ' primary'}" style="--c:${qColor(k)}" data-q="${k}">${esc(QMAP.get(k).label)}</span>`).join('');
function idealCard(key, name, desc, qs, selected) {
  const c = qs.length ? qColor(qs[0]) : '';
  return `<button type="button" class="ideal-card${key === 'custom' ? ' custom' : ''}${qs.length ? '' : ' empty'}" role="radio" aria-checked="${selected}" data-ideal-card="${key}" ${c ? `style="--c:${c}"` : ''}>
    <span class="ic-check" aria-hidden="true">${ic('check')}</span>
    <span class="ic-name">${esc(name)}</span><span class="ic-desc">${esc(desc)}</span>
    <span class="ic-chips">${qChips(qs)}</span></button>`;
}
// The picker (sign-up, Edit profile, the "Choose your ideal" modal). `current` is a user's ideal or null.
function idealPicker(id, current, { skipLabel = 'Skip for now' } = {}) {
  const custom = current && current.custom;
  const sel = !current ? 'skip' : custom ? 'custom' : current.preset_id;
  const cqs = custom ? current.qualities.filter(k => QMAP.has(k)) : [];
  const cname = custom ? current.name : '';
  return `<section class="ideal-picker" id="${id}" data-sel="${esc(sel)}" data-qs="${cqs.join(',')}">
    <div class="ideal-head"><h3>Choose your ideal</h3>
      <button type="button" class="ideal-skip" role="radio" aria-checked="${sel === 'skip'}" data-ideal-card="skip">${ic('check')}<span>${esc(skipLabel)}</span></button></div>
    <p class="ideal-sub">Who inspires you? Pick a role model. Each colour stands for the quality they’re known for.</p>
    <div class="ideal-grid" role="radiogroup" aria-label="Choose your ideal">
      ${IDEALS.PRESETS.map(p => idealCard(p.id, p.name, p.desc, presetQs(p), sel === p.id)).join('')}
      ${idealCard('custom', cname || 'Make your own', cname ? 'Your own ideal' : 'A parent, teacher, friend… anyone who inspires you.', cqs, sel === 'custom')}
    </div>
    <div class="ideal-custom" ${sel === 'custom' ? '' : 'hidden'}>
      <div class="field"><label>Your ideal’s name</label><input class="ideal-name" maxlength="${IDEALS.CUSTOM_NAME_MAX}" value="${esc(cname)}" placeholder="e.g. My grandmother" autocomplete="off" aria-label="Your ideal’s name"><span class="cnt">${[...cname].length}/${IDEALS.CUSTOM_NAME_MAX}</span></div>
      <div class="q-label">Pick 1–${IDEALS.CUSTOM_QUALITIES_MAX} qualities. The first one sets the colour.</div>
      <div class="q-pick">${IDEALS.QUALITIES.map(q => `<button type="button" class="q-opt" data-ideal-q="${q.key}" style="--c:${q.color}" aria-pressed="${cqs.includes(q.key)}" title="${esc(q.long)}"><span class="dot"></span>${esc(q.label)}<span class="ord">${cqs.includes(q.key) ? cqs.indexOf(q.key) + 1 : ''}</span></button>`).join('')}</div>
    </div>
    <div class="ideal-err" role="alert"></div>
  </section>`;
}
function syncCustomCard(root) {
  const qs = (root.dataset.qs || '').split(',').filter(k => QMAP.has(k));
  const card = $('[data-ideal-card="custom"]', root), name = $('.ideal-name', root).value.replace(/\s+/g, ' ').trim();
  if (qs.length) card.style.setProperty('--c', qColor(qs[0])); else card.style.removeProperty('--c');
  card.classList.toggle('empty', !qs.length);
  $('.ic-name', card).textContent = name || 'Make your own';
  $('.ic-desc', card).textContent = name ? 'Your own ideal' : 'A parent, teacher, friend… anyone who inspires you.';
  $('.ic-chips', card).innerHTML = qChips(qs);
  $$('.q-opt', root).forEach(b => { const i = qs.indexOf(b.dataset.idealQ); b.setAttribute('aria-pressed', i >= 0); $('.ord', b).textContent = i >= 0 ? i + 1 : ''; });
  $('.cnt', root).textContent = `${[...$('.ideal-name', root).value].length}/${IDEALS.CUSTOM_NAME_MAX}`;
}
// Scroll the selected card into view inside the grid (without moving the page).
function revealIdeal(root) {
  const g = root && $('.ideal-grid', root), c = g && $('[data-ideal-card][aria-checked="true"]', g);
  if (!c) return;
  if (c.offsetTop < g.scrollTop || c.offsetTop + c.offsetHeight > g.scrollTop + g.clientHeight) g.scrollTop = c.offsetTop - 8;
  if (c.offsetLeft < g.scrollLeft || c.offsetLeft + c.offsetWidth > g.scrollLeft + g.clientWidth) g.scrollLeft = c.offsetLeft - 8;
}
function selectIdeal(root, key) {
  root.dataset.sel = key;
  $$('[data-ideal-card]', root).forEach(c => c.setAttribute('aria-checked', c.dataset.idealCard === key));
  $('.ideal-custom', root).hidden = key !== 'custom';
  $('.ideal-err', root).textContent = '';
  revealIdeal(root);
  if (key === 'custom' && !$('.ideal-name', root).value) $('.ideal-name', root).focus({ preventScroll: true });
}
// -> { ideal: null | {presetId} | {custom:{name, qualities}} } or { error }
function readIdeal(root) {
  if (!root) return { ideal: undefined };
  const sel = root.dataset.sel;
  if (!sel || sel === 'skip') return { ideal: null };
  if (sel !== 'custom') return { ideal: { presetId: sel } };
  const name = $('.ideal-name', root).value.replace(/\s+/g, ' ').trim();
  const qualities = (root.dataset.qs || '').split(',').filter(k => QMAP.has(k));
  if (!name) return { error: 'Give your ideal a name' };
  if ([...name].length > IDEALS.CUSTOM_NAME_MAX) return { error: `Ideal name can be at most ${IDEALS.CUSTOM_NAME_MAX} characters` };
  if (/[<>]/.test(name)) return { error: 'Ideal name can’t contain < or >' };
  if (!qualities.length) return { error: 'Pick at least one quality for your ideal' };
  return { ideal: { custom: { name, qualities } } };
}
function idealError(root, msg) {
  const el = root && $('.ideal-err', root); if (el) el.textContent = msg;
  if (root) root.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
document.addEventListener('click', (e) => {
  const root = e.target.closest('.ideal-picker'); if (!root) return;
  const card = e.target.closest('[data-ideal-card]'), q = e.target.closest('[data-ideal-q]');
  if (card) { e.preventDefault(); selectIdeal(root, card.dataset.idealCard); }
  else if (q) {
    e.preventDefault();
    let qs = (root.dataset.qs || '').split(',').filter(k => QMAP.has(k));
    const k = q.dataset.idealQ;
    if (qs.includes(k)) qs = qs.filter(x => x !== k);
    else if (qs.length >= IDEALS.CUSTOM_QUALITIES_MAX) { $('.ideal-err', root).textContent = `You can pick up to ${IDEALS.CUSTOM_QUALITIES_MAX} qualities`; return; }
    else qs.push(k);
    root.dataset.qs = qs.join(',');
    $('.ideal-err', root).textContent = '';
    syncCustomCard(root);
  }
});
document.addEventListener('input', (e) => { if (e.target.matches('.ideal-picker .ideal-name')) syncCustomCard(e.target.closest('.ideal-picker')); });
// Profile badge: "Ideal: <name>" in the primary colour, with quality chips.
function idealBadge(i) {
  if (!i || !i.name) return '';
  const tag = i.preset_id ? 'a' : 'div';
  return `<${tag} class="ideal-badge${i.preset_id ? ' to-circle' : ''}" style="--c:${qColor(i.primary)}" data-primary="${esc(i.primary || '')}" ${i.preset_id ? `href="/circle/${esc(i.preset_id)}" data-link` : ''} ${i.description ? `title="${esc(i.description)}"` : ''}><span class="dot"></span><span class="lbl">Ideal: <b>${esc(i.name)}</b></span><span class="chips">${qChips(i.qualities || [])}</span>${i.preset_id ? `<span class="circle-go">Circle ›</span>` : ''}</${tag}>`;
}
const idealDot = (i) => i && i.name ? `<span class="ideal-dot" style="--c:${qColor(i.primary)}" title="Ideal: ${esc(i.name)}" aria-label="Ideal: ${esc(i.name)}"></span>` : '';
function idealPrompt() {
  if (!state.me || state.me.ideal || store('localStorage', idealPromptKey()) === '1') return '';
  const dots = IDEALS.QUALITIES.map(q => `<span style="background:${q.color}"></span>`).join('');
  return `<div class="ideal-prompt" id="ideal-prompt" role="region" aria-label="Choose your ideal"><div class="ip-dots" aria-hidden="true">${dots}</div>
    <div class="ip-body"><div class="t">Choose your ideal</div><div class="s">Who inspires you? Add a role model to your profile, coloured by the quality you admire.</div>
    <button class="btn btn-light" data-action="open-ideal">Choose your ideal</button></div>
    <button class="x" data-action="dismiss-ideal-prompt" aria-label="Dismiss">${ic('close')}</button></div>`;
}
function openIdealModal({ welcome = false } = {}) {
  openModal(`<div class="modal ideal-modal"><div class="modal-head"><button class="back" data-action="close-modal" aria-label="Close">${ic('close')}</button><h2>${welcome ? 'Welcome to ZuZu!' : 'Your ideal'}</h2><button class="btn btn-light" data-action="save-ideal">Save</button></div>
    ${idealPicker('ideal-modal-picker', state.me && state.me.ideal, { skipLabel: state.me && state.me.ideal ? 'No ideal' : 'Skip for now' })}</div>`);
  revealIdeal($('#ideal-modal-picker'));
}
async function saveIdealFrom(root) {
  const r = readIdeal(root);
  if (r.error) { idealError(root, r.error); return null; }
  const { user } = await api('PUT', '/api/me/ideal', { ideal: r.ideal });
  state.me = { ...state.me, ideal: user.ideal };
  return user;
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
        <div class="field"><label>Username</label><input name="username" required autocapitalize="none" autocomplete="username" ${signup ? 'placeholder="your_handle" autocorrect="off" spellcheck="false"' : ''}></div>
        <div class="field"><label>Password</label><input name="password" type="password" required ${signup ? 'minlength="6" autocomplete="new-password"' : 'autocomplete="current-password"'}></div>
        ${signup ? `<div class="field"><label>Email <span class="muted">(optional, for password reset)</span></label><input name="email" type="email" maxlength="254" autocomplete="email" placeholder="you@example.com"></div>` : ''}
        ${signup ? idealPicker('signup-ideal', null) : ''}
        <button class="btn btn-light" type="submit">${signup ? 'Create account' : 'Log in'}</button>
        <div class="err" role="alert">${googleError ? 'Couldn’t sign in with Google. Please try again, or use your username and password.' : ''}</div>
      </form>
      ${signup ? '' : `<div class="alt"><a href="/forgot" data-link>Forgot password?</a></div>`}
      <div class="alt">${signup ? 'Already have an account? <a href="/login" data-link>Sign in</a>' : 'Don’t have an account? <a href="/signup" data-link>Sign up</a>'}</div>
      ${authAppLink()}
      ${signup ? '' : `<div class="demo">Demo login: <b>demo</b> / <b>demo1234</b></div>`}
    </div></div>`;
}

async function loadFeed(url, emptyHTML, renderList = (items) => items.map(p => postHTML(p)).join('')) {
  const feed = $('#feed');
  try {
    const { items } = await api('GET', url);
    remember(items);
    if (!$('#feed') || $('#feed') !== feed) return;
    feed.innerHTML = items.length ? renderList(items) : emptyHTML;
  } catch (err) { feed.innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
}

function viewHome() {
  const t = state.homeTab;
  shell(`<div class="header"><div class="tabs">
      <button class="tab ${t === 'foryou' ? 'active' : ''}" data-action="home-tab" data-tab="foryou">For you</button>
      <button class="tab ${t === 'following' ? 'active' : ''}" data-action="home-tab" data-tab="following">Following</button>
    </div></div>
    ${appBanner()}
    ${state.me.account && !state.me.account.has_recovery_code && !sessionStorage.getItem('zuzu.noRecBanner') ? `<div class="rec-banner"><span>🔑 Set up a recovery code so you can get back in if you forget your password.</span><a class="btn btn-outline" href="/settings#set-recovery" data-link>Set up</a><button class="x" data-action="rec-dismiss" aria-label="Dismiss">${ic('close', 'icon')}</button></div>` : ''}
    <div id="stories-bar" class="stories-bar"></div>
    <div id="daily-banner"></div>
    ${idealPrompt()}
    ${composerHTML({ id: 'home-composer' })}
    <div id="feed">${loader()}</div>`, { active: 'home' });
  // First Google sign-in lands on /home?ideal=1: offer the picker once.
  if (new URLSearchParams(location.search).get('ideal') === '1') {
    history.replaceState({}, '', '/home');
    if (!state.me.ideal) openIdealModal({ welcome: true });
  }
  storiesLoad(); dailyLoad();
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
    const kinds = { like: ['heartFill', 'liked your post'], reply: ['reply', 'replied to you'], follow: ['userFill', 'followed you'], repost: ['rt', 'reposted your post'], mention: ['reply', 'mentioned you'] };
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
        <div class="head"><a href="/u/${esc(p.username)}" data-link>${avatar(p)}</a><div class="who"><a href="/u/${esc(p.username)}" data-link><b>${esc(p.name)}</b></a>${idealDot(p.ideal)}<div style="color:var(--muted)">@${esc(p.username)}</div></div>
          ${aiBtn(p)}<button class="more" style="position:relative;width:34px;height:34px;border-radius:50%;color:var(--muted)" data-action="post-menu" data-id="${p.id}" data-mine="${mine ? 1 : 0}">${ic('dots')}</button></div>
        ${p.reply_to ? `<div class="replying" style="margin-top:8px">Replying to <a href="/u/${esc(p.reply_to)}" data-link>@${esc(p.reply_to)}</a></div>` : ''}
        ${challengeChip(p)}
        ${p.text ? `<div class="text">${richText(p.text)}</div>` : ''}
        ${p.image ? `<div class="media"><img src="${esc(p.image)}" alt=""></div>` : ''}
        ${p.video ? videoHTML(p, { focus: true }) : ''}
        ${p.audio ? audioHTML(p) : ''}
        ${p.poll ? pollHTML(p) : ''}
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
      <div class="top">${avatar(u, 'lg')}${isMe ? `<button class="btn btn-outline" data-action="edit-profile">Edit profile</button>` : `<div class="pf-actions"><button class="btn btn-outline btn-icon" data-action="report" data-type="user" data-username="${esc(u.username)}" aria-label="Report @${esc(u.username)}" title="Report">${ic('flag')}</button><button class="btn btn-outline btn-icon" data-action="dm-user" data-username="${esc(u.username)}" aria-label="Message" title="Message">${ic('mail')}</button>${followBtn(u)}</div>`}</div>
      <div class="name">${esc(u.name)}</div>
      <div class="handle">@${esc(u.username)}${u.follows_you ? '<span class="follows-you">Follows you</span>' : ''}</div>
      ${u.ideal ? idealBadge(u.ideal) : isMe ? `<button class="ideal-add" data-action="open-ideal">${ic('sparkle')}Choose your ideal</button>` : ''}
      ${u.bio ? `<div class="bio">${richText(u.bio)}</div>` : '<div style="height:12px"></div>'}
      <div class="facts">${u.location ? `<span>${ic('pin')}${esc(u.location)}</span>` : ''}<span>${ic('cal')}Joined ${new Date(u.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span></div>
      <div class="counts"><a href="/u/${esc(u.username)}/following" data-link><b>${u.following}</b> Following</a><a href="/u/${esc(u.username)}/followers" data-link><b id="followers-count">${u.followers}</b> Followers</a>${calibrationHTML(u.calibration)}</div>
    </div>
    <div class="tabs" style="border-bottom:1px solid var(--border)">${tabLink('posts', 'Posts')}${tabLink('replies', 'Replies')}${tabLink('media', 'Media')}${state.config.video || tab === 'reels' ? tabLink('reels', 'Reels') : ''}${tabLink('likes', 'Likes')}</div>
    <div id="feed">${loader()}</div>`;
  loadFeed(`/api/users/${encodeURIComponent(u.username)}/posts?tab=${tab}`, `<div class="empty"><h3>${isMe ? 'You haven’t' : '@' + esc(u.username) + ' hasn’t'} ${tab === 'likes' ? 'liked any posts' : tab === 'media' ? 'posted media' : tab === 'reels' ? 'posted any reels' : tab === 'replies' ? 'replied to anything' : 'posted'} yet</h3><p>When ${isMe ? 'you do' : 'they do'}, it’ll show up here.</p></div>`,
    tab === 'reels' ? reelGridHTML : undefined);
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
    <div class="row">${mine ? `<button class="msg-del" data-action="dm-delete" data-id="${m.id}" aria-label="Delete message" title="Delete">${ic('trash')}</button>` : ''}${mine ? '' : `<button class="msg-report" data-action="report" data-type="message" data-id="${m.id}" aria-label="Report message" title="Report">${ic('flag')}</button>`}
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

// ---------- Video posts + Reels (Cloudinary direct uploads) ----------
// The browser uploads straight to Cloudinary with params signed by POST /api/video/sign (XHR progress; chunked over
// ~20 MB), then POST /api/posts carries {video: {public_id, ...}}; the server re-checks everything with Cloudinary.
const V_FORMATS = ['mp4', 'mov', 'webm', '3gp', 'mkv'];
const V_MIME = /^video\/(mp4|quicktime|webm|3gpp2?|x-matroska|matroska|x-m4v)$/;
const V_MAX_BYTES = 100 * 1024 * 1024, V_MAX_SECONDS = 180, V_MAX_REEL_SECONDS = 90;
const fmtDur = (s) => { s = Math.max(0, Math.round(Number(s) || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const composerVideo = new WeakMap(); // form -> { file, meta, ctl, result, cloudName, url }

function videoPreviewHTML(allowReel) {
  return `<div class="vpreview" hidden data-state="">
    <div class="vbox"><video muted playsinline preload="metadata"></video><span class="vdur"></span>
      <button type="button" class="x" data-action="clear-video" aria-label="Remove video">${ic('close', 'icon')}</button></div>
    <div class="vprog" role="progressbar" aria-label="Upload progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
      <div class="vprog-track"><div class="vprog-bar"></div></div>
      <span class="vprog-txt">Preparing…</span>
      <button type="button" class="vcancel" data-action="cancel-video">Cancel</button>
    </div>
    ${allowReel ? `<label class="reel-toggle"><input type="checkbox" name="is_reel"><span class="sw" aria-hidden="true"></span>${ic('reels')}<span>Post as Reel</span><small class="reel-hint"></small></label>` : ''}
  </div>`;
}
function videoExt(file) { return ((file.name || '').match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase() || ''; }
// Duration + size from the file itself (before uploading anything). Unknown (null) when the browser can't decode it.
function readVideoMeta(file) {
  return new Promise((resolve) => {
    const v = document.createElement('video'), url = URL.createObjectURL(file);
    let done = false;
    const fin = (m) => { if (done) return; done = true; v.removeAttribute('src'); v.load(); URL.revokeObjectURL(url); resolve(m); };
    v.preload = 'metadata'; v.muted = true;
    v.onloadedmetadata = () => fin({ duration: isFinite(v.duration) ? v.duration : null, width: v.videoWidth || null, height: v.videoHeight || null });
    v.onerror = () => fin({ duration: null, width: null, height: null });
    setTimeout(() => fin({ duration: null, width: null, height: null }), 8000);
    v.src = url;
  });
}
function setVProgress(f, pct, txt) {
  const box = $('.vpreview', f); if (!box) return;
  $('.vprog-bar', box).style.width = Math.round(pct) + '%';
  $('.vprog', box).setAttribute('aria-valuenow', String(Math.round(pct)));
  if (txt) $('.vprog-txt', box).textContent = txt;
}
async function pickComposerVideo(f, file) {
  const ext = videoExt(file);
  if (!(V_FORMATS.includes(ext) || V_MIME.test(file.type || ''))) return toast('Use an MP4, MOV, WebM, 3GP or MKV video');
  if (file.size > V_MAX_BYTES) return toast('Video must be 100 MB or smaller');
  if (!file.size) return toast('That video is empty');
  const meta = await readVideoMeta(file);
  if (meta.duration && meta.duration > V_MAX_SECONDS + 0.5) return toast(`Videos can be up to 3 minutes (this one is ${fmtDur(meta.duration)})`);
  clearComposerVideo(f);
  if (f.image.files.length) { f.image.value = ''; $('.preview', f).hidden = true; }
  const box = $('.vpreview', f); if (!box) return;
  const vs = { file, meta, ctl: { aborted: false, xhr: null }, result: null, url: URL.createObjectURL(file) };
  composerVideo.set(f, vs);
  const vid = $('video', box); vid.src = vs.url;
  $('.vdur', box).textContent = meta.duration ? fmtDur(meta.duration) : '';
  box.hidden = false; box.dataset.state = 'uploading';
  box.classList.toggle('vertical', !!(meta.height && meta.width && meta.height > meta.width));
  const reel = f.is_reel, hint = $('.reel-hint', box);
  if (reel) {
    const tooLong = meta.duration && meta.duration > V_MAX_REEL_SECONDS + 0.5;
    const suggest = !tooLong && meta.duration && meta.height > meta.width;
    reel.checked = !!suggest; reel.disabled = !!tooLong;
    hint.textContent = tooLong ? 'Reels can be up to 90 seconds' : suggest ? 'Vertical and under 90 s: great as a Reel' : '';
  }
  setVProgress(f, 0, 'Preparing…');
  updateComposer(f);
  try {
    const sig = await api('POST', '/api/video/sign');
    if (composerVideo.get(f) !== vs || vs.ctl.aborted) return;
    vs.cloudName = sig.cloudName;
    const res = await uploadVideo(file, sig, (loaded, total) => {
      const pct = total ? loaded / total * 100 : 0;
      setVProgress(f, pct, pct >= 100 ? 'Processing…' : `Uploading… ${Math.round(pct)}%`);
    }, vs.ctl);
    if (composerVideo.get(f) !== vs) return;
    vs.result = res;
    if (!vs.meta.duration && res.duration) $('.vdur', box).textContent = fmtDur(res.duration);
    if (reel && res.duration > V_MAX_REEL_SECONDS + 0.5) { reel.checked = false; reel.disabled = true; hint.textContent = 'Reels can be up to 90 seconds'; }
    setVProgress(f, 100, 'Uploaded');
    box.dataset.state = 'done';
  } catch (e) {
    if (composerVideo.get(f) !== vs || vs.ctl.aborted) return;
    toast(e.message || 'Video upload failed');
    clearComposerVideo(f);
  }
  updateComposer(f);
}
// Stop an upload in progress, or drop a finished one that was never posted (removed from Cloudinary too).
function clearComposerVideo(f, { posted = false } = {}) {
  if (!f) return;
  const vs = composerVideo.get(f);
  composerVideo.delete(f);
  if (vs) {
    vs.ctl.aborted = true;
    if (vs.ctl.xhr) try { vs.ctl.xhr.abort(); } catch {}
    if (vs.url) URL.revokeObjectURL(vs.url);
    if (vs.result && !posted) api('POST', '/api/video/discard', { public_id: vs.result.public_id }).catch(() => {});
  }
  const box = $('.vpreview', f); if (!box) return;
  box.hidden = true; box.dataset.state = '';
  const v = $('video', box); v.removeAttribute('src'); v.load();
  if (f.is_reel) { f.is_reel.checked = false; f.is_reel.disabled = false; }
}
// Upload to Cloudinary with XHR progress. Files over chunkThreshold go up in chunkSize pieces
// (Content-Range + X-Unique-Upload-Id, all with the same signed params); the last response describes the asset.
function uploadVideo(file, sig, onProgress, ctl) {
  const send = (blob, headers, base) => new Promise((resolve, reject) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(sig.params)) fd.append(k, String(v));
    fd.append('file', blob, file.name || 'video.mp4');
    const x = ctl.xhr = new XMLHttpRequest();
    x.open('POST', sig.uploadUrl);
    for (const [k, v] of Object.entries(headers)) x.setRequestHeader(k, v);
    x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(base + Math.min(blob.size, e.loaded / e.total * blob.size), file.size); };
    x.onload = () => {
      let j = null; try { j = JSON.parse(x.responseText); } catch {}
      if (x.status >= 200 && x.status < 300 && j) resolve(j);
      else reject(new Error((j && j.error && j.error.message) ? 'Upload failed: ' + j.error.message : 'Video upload failed (' + x.status + ')'));
    };
    x.onerror = () => reject(new Error('Video upload failed. Check your connection.'));
    x.onabort = () => reject(Object.assign(new Error('Upload cancelled'), { aborted: true }));
    x.send(fd);
  });
  return (async () => {
    if (file.size <= sig.chunkThreshold) { const r = await send(file, {}, 0); onProgress(file.size, file.size); return r; }
    const id = 'zuzu-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    let res = null;
    for (let start = 0; start < file.size; start += sig.chunkSize) {
      if (ctl.aborted) throw new Error('Upload cancelled');
      const end = Math.min(start + sig.chunkSize, file.size);
      res = await send(file.slice(start, end), { 'X-Unique-Upload-Id': id, 'Content-Range': `bytes ${start}-${end - 1}/${file.size}` }, start);
    }
    onProgress(file.size, file.size);
    if (!res || !res.public_id) throw new Error('Video upload failed');
    return res;
  })();
}

// Inline player: muted, autoplays when ≥60% visible (one at a time), poster, playsinline, preload=metadata.
function videoSources(v) { return v.sources.map(s => `<source src="${esc(s.src)}"${s.type ? ` type="${esc(s.type)}"` : ''}>`).join(''); }
function videoHTML(p, { focus = false } = {}) {
  const v = p.video, w = v.width || 16, h = v.height || 9;
  const maxH = focus ? 640 : 510, maxW = h > w ? Math.round(maxH * w / h) : null;
  return `<div class="media vmedia${h > w ? ' vertical' : ''}" data-video="${p.id}" style="aspect-ratio:${w}/${h};${maxW ? `max-width:${maxW}px;` : ''}">
    <video class="vplayer" playsinline muted ${v.duration <= 60 ? 'loop' : ''} preload="metadata" poster="${esc(v.poster)}" data-dur="${v.duration}">${videoSources(v)}</video>
    <span class="vdur-badge">${fmtDur(v.duration)}</span>
    <button class="vmute" data-action="vmute" aria-label="${vfeed.muted ? 'Unmute' : 'Mute'}">${ic(vfeed.muted ? 'volOff' : 'volOn')}</button>
    ${v.is_reel ? `<a class="vreel" href="/reels/${p.id}" data-link aria-label="Open in Reels">${ic('reels')}<span>Reels</span></a>` : ''}
    <span class="vpaused" aria-hidden="true">${ic('play')}</span>
  </div>`;
}
const vfeed = { muted: true, io: null, ratios: new Map(), current: null, manual: new WeakSet() };
function vplay(v) {
  if (vfeed.current && vfeed.current !== v) vfeed.current.pause();
  vfeed.current = v;
  v.muted = vfeed.muted;
  const pr = v.play();
  if (pr) pr.catch((e) => { if (e.name === 'NotAllowedError' && !v.muted) { v.muted = vfeed.muted = true; syncMuteIcons(); v.play().catch(() => {}); } });
}
function vpickFeed() {
  let best = null, bestR = 0;
  for (const [v, r] of vfeed.ratios) {
    if (!v.isConnected) { vfeed.ratios.delete(v); continue; }
    if (r >= 0.6 && r > bestR && !vfeed.manual.has(v)) { best = v; bestR = r; }
  }
  for (const v of vfeed.ratios.keys()) if (v !== best && !v.paused) v.pause();
  if (best && best.paused && !document.hidden) vplay(best);
  if (!best) vfeed.current = null;
}
function vobserve() {
  if (!('IntersectionObserver' in window)) return;
  if (!vfeed.io) vfeed.io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      vfeed.ratios.set(e.target, e.isIntersecting ? e.intersectionRatio : 0);
      if (e.intersectionRatio < 0.6) vfeed.manual.delete(e.target); // a manual pause lasts until it leaves the screen
    }
    vpickFeed();
  }, { threshold: [0, 0.25, 0.6, 0.8, 1] });
  $$('#center video.vplayer').forEach(v => { if (!v.dataset.vobs) { v.dataset.vobs = '1'; vfeed.io.observe(v); } });
  for (const v of [...vfeed.ratios.keys()]) if (!v.isConnected) { vfeed.ratios.delete(v); vfeed.io.unobserve(v); }
}
function syncMuteIcons() {
  $$('.vmute').forEach(b => { b.innerHTML = ic(vfeed.muted ? 'volOff' : 'volOn'); b.setAttribute('aria-label', vfeed.muted ? 'Unmute' : 'Mute'); });
}
let vobsRaf = 0;
new MutationObserver(() => { if (!vobsRaf) vobsRaf = requestAnimationFrame(() => { vobsRaf = 0; vobserve(); }); }).observe(document.getElementById('app'), { childList: true, subtree: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { $$('video').forEach(v => v.pause()); } else if (reels.active) reelsPlayActive(); else vpickFeed();
});
// Tap the mute icon: sound on/off for all feed videos. Tap the picture: pause/resume.
document.addEventListener('click', (e) => {
  const mute = e.target.closest('[data-action="vmute"]');
  if (mute) {
    e.preventDefault(); e.stopImmediatePropagation();
    vfeed.muted = !vfeed.muted; syncMuteIcons();
    const v = $('video', mute.closest('.vmedia'));
    if (!vfeed.muted && v.paused) { vfeed.manual.delete(v); vplay(v); } else { v.muted = vfeed.muted; if (vfeed.current) vfeed.current.muted = vfeed.muted; }
    return;
  }
  const v = e.target.closest('.vmedia video');
  if (v) {
    e.preventDefault(); e.stopImmediatePropagation();
    if (v.paused) { vfeed.manual.delete(v); vplay(v); } else { v.pause(); vfeed.manual.add(v); }
  }
}, true);
document.addEventListener('play', (e) => { const m = e.target.closest && e.target.closest('.vmedia'); if (m) m.classList.remove('paused'); }, true);
document.addEventListener('pause', (e) => { const m = e.target.closest && e.target.closest('.vmedia'); if (m) m.classList.add('paused'); }, true);

// ---------- Reels: /reels and /reels/:id (full-screen vertical swipe feed, CSS scroll-snap) ----------
const reels = { active: null, items: [], ids: new Set(), cursor: null, more: true, loading: false, io: null, muted: null, userMuted: false, el: null, gen: 0 };
function reelSideHTML(p) {
  if (!p) return '';
  return `<div class="reel-side" data-reel-side="${p.id}">
    <button class="reel-act like ${p.liked ? 'on' : ''}" data-action="like" data-id="${p.id}" aria-label="Like"><span class="ic">${ic(p.liked ? 'heartFill' : 'heart')}</span><span class="n">${fmt(p.like_count) || ''}</span></button>
    <button class="reel-act comment" data-action="go" data-href="/post/${p.id}" aria-label="Comments"><span class="ic">${ic('reply')}</span><span class="n">${fmt(p.reply_count) || ''}</span></button>
    <button class="reel-act share" data-action="share-reel" data-id="${p.id}" aria-label="Share"><span class="ic">${ic('share')}</span></button>
    ${state.config.ai ? `<button class="reel-act ai" data-action="ai-open" data-id="${p.id}" aria-label="Ask ZuZu AI" title="Ask ZuZu AI"><span class="ic">${ic('sparkle')}</span></button>` : ''}
    <button class="reel-act mute" data-action="reel-mute" aria-label="${reelsMuted() ? 'Unmute' : 'Mute'}"><span class="ic">${ic(reelsMuted() ? 'volOff' : 'volOn')}</span></button>
  </div>`;
}
function reelHTML(p) {
  const v = p.video;
  return `<section class="reel" data-reel="${p.id}" data-post="${p.id}">
    <video class="reel-video" playsinline loop preload="none" poster="${esc(v.poster)}" ${reelsMuted() ? 'muted' : ''}>${videoSources(v)}</video>
    <div class="reel-tap" data-reel-tap aria-hidden="true"></div>
    <span class="reel-paused" aria-hidden="true">${ic('play')}</span>
    <div class="reel-shade" aria-hidden="true"></div>
    ${reelSideHTML(p)}
    <div class="reel-info">
      <a class="reel-user" href="/u/${esc(p.username)}" data-link>${avatar(p, 'sm')}<span class="h">@${esc(p.username)}</span>${idealDot(p.ideal)}</a>
      ${p.text ? `<div class="reel-cap">${richText(p.text)}</div>` : ''}
    </div>
    <div class="reel-bar" aria-hidden="true"><span></span></div>
  </section>`;
}
const reelsMuted = () => reels.muted !== null ? reels.muted : !(navigator.userActivation && navigator.userActivation.hasBeenActive);
function reelGridHTML(items) {
  return `<div class="reel-grid">${items.filter(p => p.video).map(p => `<a class="reel-tile" href="/reels/${p.id}" data-link data-reel-tile="${p.id}" aria-label="Reel by @${esc(p.username)}">
    <img src="${esc(p.video.poster)}" alt="" loading="lazy"><span class="rt-dur">${ic('play')}${fmtDur(p.video.duration)}</span>${p.text ? `<span class="rt-cap">${esc(p.text)}</span>` : ''}</a>`).join('')}</div>`;
}
async function viewReels(startId) {
  if (!state.config.video && !startId) return go('/home', true);
  const gen = ++reels.gen;
  Object.assign(reels, { active: null, items: [], ids: new Set(), cursor: null, more: true, loading: false });
  shell(`<div class="reels-wrap"><div class="reels-head"><button class="back" data-action="back" aria-label="Back">${ic('back')}</button><h1>Reels</h1></div>
    <div class="reels" id="reels" tabindex="-1">${loader()}</div></div>`, { active: 'reels', layout: 'reels' });
  reels.el = $('#reels');
  try {
    const first = [];
    if (startId) {
      try { const { post } = await api('GET', '/api/posts/' + startId); if (post.video) first.push(post); } catch {}
    }
    const page = await api('GET', '/api/reels?limit=6' + (startId && first.length ? '&cursor=' + startId : ''));
    if (gen !== reels.gen) return;
    reels.el.innerHTML = '';
    reelsAppend([...first, ...page.items]);
    reels.cursor = page.next_cursor; reels.more = !!page.next_cursor;
    if (!reels.items.length) {
      reels.el.innerHTML = `<div class="empty reels-empty"><h3>No reels yet</h3><p>Post a vertical video under 90 seconds as a Reel and it’ll show up here.</p><button class="btn btn-primary" data-action="compose">Post a Reel</button></div>`;
      return;
    }
    reelsObserve();
    reels.el.focus({ preventScroll: true });
  } catch (err) { if (gen === reels.gen) reels.el.innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
}
function reelsAppend(list) {
  const fresh = list.filter(p => p && p.video && !reels.ids.has(p.id));
  fresh.forEach(p => reels.ids.add(p.id));
  remember(fresh);
  reels.items.push(...fresh);
  reels.el.insertAdjacentHTML('beforeend', fresh.map(reelHTML).join(''));
  if (reels.io) $$('.reel', reels.el).forEach(r => { if (!r.dataset.robs) { r.dataset.robs = '1'; reels.io.observe(r); } });
}
async function reelsLoadMore() {
  if (reels.loading || !reels.more || !reels.cursor) return;
  reels.loading = true;
  const gen = reels.gen;
  try {
    const page = await api('GET', '/api/reels?limit=6&cursor=' + reels.cursor);
    if (gen !== reels.gen) return;
    reels.cursor = page.next_cursor; reels.more = !!page.next_cursor;
    reelsAppend(page.items);
  } catch {} finally { reels.loading = false; }
}
function reelsObserve() {
  reels.io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting && e.intersectionRatio >= 0.6) reelsActivate(e.target);
  }, { root: reels.el, threshold: [0.6] });
  $$('.reel', reels.el).forEach(r => { r.dataset.robs = '1'; reels.io.observe(r); });
}
function reelsActivate(sec) {
  if (reels.active === sec) return;
  if (reels.active) { const ov = $('video', reels.active); ov.pause(); reels.active.classList.remove('active', 'paused'); }
  reels.active = sec; sec.classList.add('active');
  const id = +sec.dataset.reel;
  if (location.pathname !== '/reels/' + id) history.replaceState({}, '', '/reels/' + id); // shareable link to what you're watching
  reelsPlayActive();
  // Preload the next one (and lazily load posters around).
  const next = sec.nextElementSibling;
  if (next && next.matches('.reel')) { const nv = $('video', next); if (nv.preload !== 'auto') { nv.preload = 'auto'; nv.load(); } }
  const idx = reels.items.findIndex(p => p.id === id);
  if (idx >= reels.items.length - 3) reelsLoadMore();
}
function reelsPlayActive() {
  const sec = reels.active; if (!sec || document.hidden) return;
  const v = $('video', sec);
  v.muted = reelsMuted();
  if (v.preload !== 'auto') v.preload = 'auto';
  const pr = v.play();
  if (pr) pr.catch((e) => { if (e.name === 'NotAllowedError' && !v.muted) { reels.muted = true; v.muted = true; reelsSyncMute(); v.play().catch(() => {}); } });
  sec.classList.remove('paused');
  if (!v.dataset.bar) {
    v.dataset.bar = '1';
    v.addEventListener('timeupdate', () => { const b = $('.reel-bar span', sec); if (b && v.duration) b.style.width = (v.currentTime / v.duration * 100) + '%'; });
  }
}
function reelsSyncMute() {
  const m = reelsMuted();
  $$('.reel-act.mute').forEach(b => { $('.ic', b).innerHTML = ic(m ? 'volOff' : 'volOn'); b.setAttribute('aria-label', m ? 'Unmute' : 'Mute'); });
  $$('.reel video').forEach(v => { v.muted = m; });
}
function reelsTeardown() {
  if (reels.io) { reels.io.disconnect(); reels.io = null; }
  if (reels.el) $$('video', reels.el).forEach(v => { v.pause(); v.removeAttribute('src'); });
  reels.active = null; reels.el = null; reels.gen++;
}
function reelsScroll(dir) {
  if (!reels.el || !reels.active) return;
  const target = dir > 0 ? reels.active.nextElementSibling : reels.active.previousElementSibling;
  if (target && target.matches('.reel')) reels.el.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
}
document.addEventListener('click', async (e) => {
  if (!reels.el) return;
  const tap = e.target.closest('[data-reel-tap]');
  const act = e.target.closest('[data-action="reel-mute"],[data-action="share-reel"]');
  if (!tap && !act) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (tap) {
    const sec = tap.closest('.reel'); if (sec !== reels.active) reelsActivate(sec);
    const v = $('video', sec);
    if (reels.skipTap) { reels.skipTap = false; if (v.paused) reelsPlayActive(); return; }
    if (v.paused) { reelsPlayActive(); } else { v.pause(); sec.classList.add('paused'); }
    return;
  }
  if (act.dataset.action === 'reel-mute') {
    reels.muted = !reelsMuted(); reels.userMuted = reels.muted; reelsSyncMute();
    if (reels.active) { const v = $('video', reels.active); if (v.paused && !reels.active.classList.contains('paused')) reelsPlayActive(); }
  } else {
    const url = location.origin + '/reels/' + act.dataset.id;
    try { if (navigator.share) await navigator.share({ url }); else { await navigator.clipboard.writeText(url); toast('Link copied'); } }
    catch (err) { if (err && err.name !== 'AbortError') toast(url); }
  }
}, true);
// Sound comes on with the first user gesture on the Reels page (unless the user muted it).
['pointerdown', 'keydown'].forEach(t => document.addEventListener(t, (e) => {
  if (!reels.el || reels.userMuted || !reelsMuted()) return;
  if (e.target.closest && e.target.closest('[data-action="reel-mute"]')) return; // that button decides itself
  reels.muted = false; reelsSyncMute();
  if (e.target.closest && e.target.closest('[data-reel-tap]')) reels.skipTap = true; // this first tap only turns the sound on
}, { capture: true }));
document.addEventListener('keydown', (e) => {
  if (!reels.el || e.target.closest('input,textarea,[contenteditable]') || $('#ai-root') || $('#modal-root').childElementCount) return;
  if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); reelsScroll(1); }
  else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); reelsScroll(-1); }
  else if (e.key === ' ' && reels.active) { e.preventDefault(); $('[data-reel-tap]', reels.active).click(); }
  else if (e.key === 'm') { $('.reel-act.mute', reels.active)?.click(); }
});

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
        ${p.text ? `<div class="t">${richText(p.text)}</div>` : ''}${p.image ? `<div class="ai-img">${ic('image')}Image (ZuZu AI only reads the text)</div>` : ''}${p.video ? `<div class="ai-img ai-vid">${ic(p.video.is_reel ? 'reels' : 'video')}${p.video.is_reel ? 'Reel' : 'Video'} · ${fmtDur(p.video.duration)} (ZuZu AI reads the caption, not the video)</div>` : ''}</div></div>
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

// ---------- admin dashboard (/admin; only for ADMIN_USERNAMES, the server 404s everyone else) ----------
const IST = 'Asia/Kolkata';
const istTime = (ts) => new Date(ts).toLocaleString('en-IN', { timeZone: IST, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST';
const istDay = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short' });
const num = (n) => Number(n || 0).toLocaleString('en-IN');
function adminCard(label, value, sub, key) {
  return `<div class="stat-card" data-stat="${key}"><div class="stat-label">${esc(label)}</div><div class="stat-value">${esc(value)}</div>${sub ? `<div class="stat-sub">${esc(sub)}</div>` : ''}</div>`;
}
function adminChart(series) {
  const max = Math.max(1, ...series.map(d => d.count));
  const total = series.reduce((a, d) => a + d.count, 0);
  const bars = series.map((d, i) => {
    const h = d.count ? Math.max(4, Math.round(d.count / max * 100)) : 0;
    const label = `${istDay(d.date)}: ${d.count} sign-up${d.count === 1 ? '' : 's'}`;
    return `<div class="bar-col${i === series.length - 1 ? ' today' : ''}" title="${esc(label)}" role="img" aria-label="${esc(label)}" data-date="${d.date}" data-count="${d.count}">
      <span class="bar-n">${d.count || ''}</span><div class="bar" style="height:${h}%"></div></div>`;
  }).join('');
  const ticks = series.map((d, i) => `<span>${i % 5 === 4 || i === series.length - 1 ? esc(istDay(d.date)) : ''}</span>`).join('');
  return `<div class="chart-card"><div class="chart-head"><h2>Daily sign-ups</h2><span class="stat-sub">Last 30 days (IST) · ${num(total)} total · peak ${num(max === 1 && !total ? 0 : max)}</span></div>
    <div class="bar-chart" id="signup-chart">${bars}</div><div class="bar-ticks">${ticks}</div></div>`;
}
function adminTable(list) {
  if (!list.length) return `<div class="empty"><p>No real sign-ups yet.</p></div>`;
  return `<div class="table-wrap"><table class="admin-table"><thead><tr><th>User</th><th>Joined (IST)</th><th>Via</th></tr></thead><tbody>${list.map(u => `
    <tr><td><a href="/u/${esc(u.username)}" data-link class="adm-user"><span class="n">${esc(u.name)}</span><span class="h">@${esc(u.username)}</span></a></td>
    <td class="t">${esc(istTime(u.created_at))}</td><td>${u.google ? '<span class="pill pill-g">Google</span>' : '<span class="pill">Password</span>'}</td></tr>`).join('')}</tbody></table></div>`;
}
function adminIdeals(d) {
  const maxQ = Math.max(1, ...d.by_quality.map(q => q.count));
  const qs = d.by_quality.map(q => `<div class="iq-row" data-quality="${esc(q.quality)}" data-count="${q.count}"><span class="iq-l"><span class="dot" style="background:${qColor(q.quality)}"></span>${esc(q.label)}</span>
    <span class="iq-bar"><span style="width:${q.count ? Math.max(3, Math.round(q.count / maxQ * 100)) : 0}%;background:${qColor(q.quality)}"></span></span><span class="iq-n">${num(q.count)}</span></div>`).join('');
  const top = d.by_ideal.length ? d.by_ideal.slice(0, 15).map(i => `<div class="ii-row" data-count="${i.count}"><span class="dot" style="background:${qColor(i.primary)}"></span><span class="n">${esc(i.name)}</span>${i.custom ? '<span class="pill">custom</span>' : ''}<span class="iq-n">${num(i.count)}</span></div>`).join('')
    : '<div class="stat-sub">No ideals chosen yet.</div>';
  return `<div class="chart-card ideal-breakdown" id="ideal-breakdown"><div class="chart-head"><h2>Ideals chosen</h2><span class="stat-sub">${num(d.users_with_ideal)} real user${d.users_with_ideal === 1 ? '' : 's'} chose an ideal · ${num(d.users_without_ideal)} skipped · ${num(d.custom)} made their own</span></div>
    <div class="ib-cols"><div><div class="ib-t">By primary quality</div>${qs}</div><div><div class="ib-t">Top ideals</div>${top}</div></div></div>`;
}
function renderAdmin(s) {
  const el = $('#admin-body'); if (!el) return;
  const su = s.signups;
  el.innerHTML = `
    <div class="stat-grid">
      ${adminCard('Total users', num(s.users.total), `${num(s.users.real)} real · ${num(s.users.demo)} demo`, 'total')}
      ${adminCard('New today', num(su.today), 'since 00:00 IST', 'today')}
      ${adminCard('Yesterday', num(su.yesterday), 'new sign-ups', 'yesterday')}
      ${adminCard('Last 7 days', num(su.last_7_days), 'new sign-ups', 'last7')}
      ${adminCard('Last 30 days', num(su.last_30_days), 'new sign-ups', 'last30')}
      ${adminCard('Active today', num(s.active_users_today), 'posted, replied, liked or DMed', 'active')}
      ${adminCard('Posts', num(s.posts.total), `${num(s.posts.today)} today`, 'posts')}
      ${adminCard('DMs', num(s.dms.total), `${num(s.dms.today)} today`, 'dms')}
      ${s.videos ? adminCard('Videos', num(s.videos.total), `${num(s.videos.today)} today`, 'videos') : ''}
      ${s.videos ? adminCard('Reels', num(s.videos.reels), `${num(s.videos.reels_today)} today`, 'reels') : ''}
    </div>
    ${adminChart(s.daily_signups)}
    ${s.ideals ? adminIdeals(s.ideals) : ''}
    <div id="admin-reports" class="chart-card"><div class="chart-head"><h2>Reports</h2><span class="stat-sub">Loading…</span></div></div>
    <div class="section-title">Latest sign-ups</div>
    ${adminTable(s.latest_signups)}
    <div class="footer-note">Demo/seeded accounts are excluded from sign-ups. ${num(s.users.google)} real user${s.users.google === 1 ? '' : 's'} joined with Google. Today is ${esc(s.today)} (IST).</div>`;
  loadReports();
  const up = $('#admin-updated'); if (up) up.textContent = 'Updated ' + new Date(s.generated_at).toLocaleTimeString('en-IN', { timeZone: IST, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST';
}
async function loadAdmin() {
  const btn = $('[data-action="admin-refresh"]'); if (btn) { btn.disabled = true; btn.classList.add('spinning'); }
  try { renderAdmin(await api('GET', '/api/admin/stats')); }
  catch (e) { const el = $('#admin-body'); if (el) el.innerHTML = `<div class="empty"><h3>Couldn’t load stats</h3><p>${esc(e.message)}</p></div>`; }
  finally { const b = $('[data-action="admin-refresh"]'); if (b) { b.disabled = false; b.classList.remove('spinning'); } }
}
function viewAdmin() {
  if (!state.admin) return shell(`<div class="header"><div class="header-row"><h1>Not found</h1></div></div><div class="empty"><h3>Hmm…this page doesn’t exist.</h3><p>Try searching for something else.</p><a class="btn btn-primary" href="/home" data-link>Go home</a></div>`);
  shell(`<div class="header"><div class="header-row"><div style="flex:1"><h1>Admin</h1><div class="sub" id="admin-updated">Loading…</div></div>
      <button class="btn btn-outline" data-action="admin-refresh" aria-label="Refresh stats">↻ Refresh</button></div></div>
    <div id="admin-body">${loader()}</div>`, { active: 'admin', layout: 'admin' });
  loadAdmin();
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-action="admin-refresh"]')) loadAdmin(); });

// ---------- Momo the monkey 🐒 (a playful companion that hops onto posts and shares a thought) ----------
// Fixed to the viewport; when scrolling stops (~600 ms) it jumps in an arc onto the post nearest the centre of the
// screen, sits on its top-right edge and shows a short thought (GET /api/monkey/thought/:id, cached per post).
// Positions are driven by requestAnimationFrame + CSS transforms (one rect read, then one transform write, per frame).
const MOMO_KEY = 'zuzu.momo';
const MOMO_ROUTES = /^\/(home|explore|post\/\d+|u\/[\w.]+(?:\/(?:replies|media|likes))?)$/;
const MOMO_POSTS = '#center article.post[data-post], #center .focus[data-post]';
const MOMO_BLOCKERS = '#center .composer, #center .actions .act, #center .app-banner, #center .ideal-prompt'; // never covered, legs included
const MOMO_BLOCKERS_BODY = '#center .more, #center .ai-btn'; // never covered by his body (legs are click-through)
const MOMO_SETTLE_MS = 600, MOMO_BUBBLE_MS = 6000;
const MOMO_IDLE_MS = () => +store('localStorage', 'zuzu.momoIdleMs') || 120000; // ~2 min (overridable for tests)
const MOMO_LOCAL = ['Hmm, this one made me pause 🍌', 'Sending good vibes to this post', 'Swinging by to say: nice one! 🐒', 'Perched here, pondering this one', 'Monkey see, monkey smile 😊'];
const MOMO_TAP = ['Ooh, that tickles! 🐒', 'Got any bananas? 🍌', 'I’m just a little monkey with big thoughts', 'Hi there! Keep scrolling, I’ll keep hopping', 'Wheee! Posts are my jungle gym', 'Tap the bubble to ask ZuZu AI about this post'];
const momoOn = () => store('localStorage', MOMO_KEY) !== '0';
const momo = {
  el: null, bubble: null, textEl: null, built: false, active: false,
  x: 0, y: 0, rot: 0, W: 60, H: 72, placed: false,
  post: null, postId: 0, st: 'hidden', flight: null, raf: 0,
  scrolling: false, lastHop: 0, lastActivity: Date.now(), band: null,
  thoughts: new Map(), moods: new Map(), loading: new Map(), shownAt: new Map(), bubbleKind: '', timers: {}, io: null, visible: new Set(), idleIv: 0,
};
try { const saved = JSON.parse(sessionStorage.getItem('zuzu.momoThoughts') || '[]'); saved.forEach(([k, v]) => momo.thoughts.set(k, v)); JSON.parse(sessionStorage.getItem('zuzu.momoMoods') || '[]').forEach(([k, v]) => momo.moods.set(k, v)); } catch {}
const momoReduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const momoSoundOn = () => store('localStorage', 'zuzu.momoSound') !== '0';
const momoToggleHTML = (mobile) => mobile
  ? `<button class="momo-mtoggle" data-action="momo-toggle" aria-pressed="${momoOn()}" aria-label="Show Momo 🐒" title="Show Momo 🐒">🐒</button><button class="momo-stoggle" data-action="momo-sound" aria-pressed="${momoSoundOn()}" aria-label="Momo sounds" title="Momo sounds">${momoSoundOn() ? '🔊' : '🔇'}</button>`
  : `<button class="nav-item nav-momo" data-action="momo-toggle" aria-pressed="${momoOn()}" title="Show Momo 🐒"><span class="momo-switch" aria-hidden="true"><span></span></span><span class="lbl">Show Momo 🐒</span></button><button class="nav-item nav-momo-snd" data-action="momo-sound" aria-pressed="${momoSoundOn()}" title="Momo sounds"><span class="momo-switch" aria-hidden="true"><span></span></span><span class="lbl">Momo sounds <span class="snd-ic">${momoSoundOn() ? '🔊' : '🔇'}</span></span></button>`;

const MOMO_SVG = `<svg class="momo-svg" viewBox="0 0 100 120" aria-hidden="true">
  <ellipse class="m-shadow" cx="50" cy="117" rx="22" ry="3"/>
  <g class="m-tail"><path d="M64 94C86 98 99 80 91 65C86 56 76 59 80 67" fill="none" stroke="#7b4a26" stroke-width="5" stroke-linecap="round"/></g>
  <g class="m-legs">
    <g class="m-leg m-leg-l"><path d="M42 92L40 107" stroke="#8b5a2b" stroke-width="7.5" stroke-linecap="round"/><ellipse cx="38.5" cy="110.5" rx="5.8" ry="3.8" fill="#e9c49a"/></g>
    <g class="m-leg m-leg-r"><path d="M58 92L60 107" stroke="#8b5a2b" stroke-width="7.5" stroke-linecap="round"/><ellipse cx="61.5" cy="110.5" rx="5.8" ry="3.8" fill="#e9c49a"/></g>
  </g>
  <g class="m-torso">
    <ellipse cx="50" cy="79" rx="21" ry="18.5" fill="#8b5a2b"/>
    <ellipse cx="50" cy="83" rx="13" ry="12.5" fill="#e9c49a"/>
    <g class="m-outfit m-kurta"><path d="M30 76Q30 61 50 60.5Q70 61 70 76L68 95Q50 99 32 95Z" fill="#ff9933"/><path d="M45 61L50 72L55 61" fill="none" stroke="#fff3e0" stroke-width="2"/><path d="M50 72V92" stroke="#e07b10" stroke-width="1.4"/><circle cx="50" cy="77" r="1.3" fill="#fff3e0"/><circle cx="50" cy="83" r="1.3" fill="#fff3e0"/><path d="M32 93Q50 97 68 93" stroke="#138808" stroke-width="2.2" fill="none"/></g>
    <g class="m-arm-l"><path d="M32 71Q25 84 34 93" fill="none" stroke="#8b5a2b" stroke-width="6.5" stroke-linecap="round"/><circle cx="35" cy="94" r="4.2" fill="#e9c49a"/><g class="m-pom"><circle cx="35" cy="97" r="8" fill="#ff4d8d"/><circle cx="31" cy="101" r="4" fill="#ff86b3"/><circle cx="40" cy="102" r="4" fill="#ff86b3"/></g></g>
    <g class="m-arm-r"><path d="M68 71Q75 84 66 93" fill="none" stroke="#8b5a2b" stroke-width="6.5" stroke-linecap="round"/><circle cx="65" cy="94" r="4.2" fill="#e9c49a"/><g class="m-pom"><circle cx="65" cy="97" r="8" fill="#ffd400"/><circle cx="61" cy="101" r="4" fill="#ffe766"/><circle cx="70" cy="102" r="4" fill="#ffe766"/></g></g>
  </g>
  <g class="m-head">
    <circle cx="25" cy="40" r="9.5" fill="#8b5a2b"/><circle cx="25" cy="40" r="5.2" fill="#e9c49a"/>
    <circle cx="75" cy="40" r="9.5" fill="#8b5a2b"/><circle cx="75" cy="40" r="5.2" fill="#e9c49a"/>
    <circle cx="50" cy="38" r="24" fill="#8b5a2b"/>
    <path d="M45 15.5q4-7 9-1" stroke="#8b5a2b" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M50 30C41 22 30 29 34 40C30 50 38 58.5 50 58.5C62 58.5 70 50 66 40C70 29 59 22 50 30Z" fill="#e9c49a"/>
    <g class="m-eyes"><ellipse cx="43" cy="38.5" rx="3.3" ry="4.3" fill="#2b1a0e"/><ellipse cx="57" cy="38.5" rx="3.3" ry="4.3" fill="#2b1a0e"/><circle cx="44.3" cy="36.8" r="1.25" fill="#fff"/><circle cx="58.3" cy="36.8" r="1.25" fill="#fff"/></g>
    <g class="m-eyes-closed"><path d="M39.5 39q3.5 3.2 7 0M53.5 39q3.5 3.2 7 0" stroke="#2b1a0e" stroke-width="1.9" fill="none" stroke-linecap="round"/></g>
    <circle cx="36.5" cy="47" r="3.6" fill="#ff8fa3" opacity=".5"/><circle cx="63.5" cy="47" r="3.6" fill="#ff8fa3" opacity=".5"/>
    <ellipse cx="48" cy="46" rx="1.1" ry="1.4" fill="#5a3415"/><ellipse cx="52" cy="46" rx="1.1" ry="1.4" fill="#5a3415"/>
    <path class="m-mouth" d="M44 50.5Q50 55.8 56 50.5" stroke="#5a3415" stroke-width="1.9" fill="none" stroke-linecap="round"/>
    <path class="m-laugh" d="M43 50Q50 59 57 50Z" fill="#5a3415"/>
    <path class="m-brows" d="M37.5 31.5L46.5 34.5M62.5 31.5L53.5 34.5" stroke="#2b1a0e" stroke-width="2.2" stroke-linecap="round"/>
    <ellipse class="m-tear" cx="59.5" cy="45" rx="1.9" ry="2.7" fill="#7cc7ff"/><ellipse class="m-tear m-tear2" cx="40.5" cy="45" rx="1.9" ry="2.7" fill="#7cc7ff"/>
    <g class="m-hearts-eyes"><path d="M43 43C37 39 39 35 43 37.5C47 35 49 39 43 43Z" fill="#ff3b6b"/><path d="M57 43C51 39 53 35 57 37.5C61 35 63 39 57 43Z" fill="#ff3b6b"/></g>
    <g class="m-hands-cover"><ellipse cx="42" cy="39" rx="8.5" ry="6.5" fill="#e9c49a" stroke="#8b5a2b" stroke-width="1.6"/><ellipse cx="58" cy="39" rx="8.5" ry="6.5" fill="#e9c49a" stroke="#8b5a2b" stroke-width="1.6"/></g>
    <g class="m-outfit m-shades"><rect x="35.5" y="33" width="13" height="10" rx="4" fill="#111"/><rect x="51.5" y="33" width="13" height="10" rx="4" fill="#111"/><path d="M48.5 36.5h3M35.5 36L27 35M64.5 36L73 35" stroke="#111" stroke-width="1.8"/><path d="M38 35.5l4 0" stroke="#fff" stroke-width="1.2" opacity=".6" stroke-linecap="round"/></g>
    <g class="m-outfit m-cap"><path d="M26.5 30Q27 11 50 11Q73 11 73.5 30Q50 24 26.5 30Z" fill="#1d9bf0"/><path d="M50 26.5Q66 24 82 29Q80 33 70 31.5Q60 29.5 50 30Z" fill="#0f6fb3"/><circle cx="50" cy="11.5" r="2.4" fill="#0f6fb3"/></g>
    <g class="m-outfit m-crown"><path d="M33 20L35 5L43 13L50 2L57 13L65 5L67 20Z" fill="#ffd400" stroke="#d4a500" stroke-width="1.2" stroke-linejoin="round"/><circle cx="50" cy="13" r="2.2" fill="#f91880"/><circle cx="40" cy="16" r="1.5" fill="#1d9bf0"/><circle cx="60" cy="16" r="1.5" fill="#00ba7c"/></g>
  </g>
  <g class="m-arm-think"><path d="M68 73Q80 62 61 57.5" fill="none" stroke="#8b5a2b" stroke-width="6.5" stroke-linecap="round"/><circle cx="58.5" cy="57.5" r="4.6" fill="#e9c49a"/></g>
</svg>`;

const MOMO_MOODS = ['happy', 'sad', 'funny', 'angry', 'thoughtful', 'mindblown', 'love', 'sleepy', 'cheering', 'scared'];
// Floating effects per mood (cheap: a few absolutely-positioned spans that remove themselves).
const MOMO_FX = {
  funny: ['hahaha 😂', 'HAHA 😂', 'hehe 🤣', 'hahaha 😂'], love: ['❤️', '💕', '❤️', '💖', '❤️'], mindblown: ['💥', '✨', '🤯', '✨'],
  sleepy: ['z', 'Z', 'z', 'Z'], cheering: ['🎉', '⭐', '🎊', '⭐'], scared: ['😱', '💦', '😨'],
};
const MOMO_TRICKS = ['backflip', 'banana', 'dance'];
const momoDay = () => new Date().toLocaleDateString('en-CA');
function momoLaughs() { try { const o = JSON.parse(localStorage.getItem('zuzu.momoLaughs') || 'null'); return o && o.d === momoDay() ? o.n : 0; } catch { return 0; } }
function momoLaughed() { const n = momoLaughs() + 1; try { localStorage.setItem('zuzu.momoLaughs', JSON.stringify({ d: momoDay(), n })); } catch {} return n; }
function momoFx(list, opts = {}) {
  if (!momo.el || momoReduced()) return;
  const live = $$('.momo-fx', momo.el); if (live.length > 8) return;
  list.slice(0, 5).forEach((txt, i) => {
    const e = document.createElement('span');
    e.className = 'momo-fx' + (opts.cls ? ' ' + opts.cls : ''); e.textContent = txt; e.setAttribute('aria-hidden', 'true');
    e.style.setProperty('--fx-x', ((i - (list.length - 1) / 2) * 22 + (Math.random() * 10 - 5)).toFixed(0) + 'px');
    e.style.setProperty('--fx-d', (i * 280) + 'ms');
    e.addEventListener('animationend', () => e.remove());
    momo.el.appendChild(e);
  });
}
function momoTrick(name) {
  const el = momo.el; if (!el) return;
  name = name || MOMO_TRICKS[Math.floor(Math.random() * MOMO_TRICKS.length)];
  window.__momoTricks && window.__momoTricks.push(name);
  clearTimeout(momo.timers.trick);
  el.dataset.trick = name;
  const say = { backflip: 'Ta-da! Backflip! 🐒', banana: 'Nom nom nom 🍌', dance: 'Dance break! 💃🐒' }[name];
  momoShowBubble(say, 'tap');
  momoSfx(name === 'banana' ? 'splat' : 'boing', { user: true });
  if (name === 'banana') momoFx(['🍌']);
  momo.timers.trick = setTimeout(() => { delete el.dataset.trick; }, name === 'dance' ? 2400 : 1300);
}
// Double-tap easter egg: a banana flies from Momo to the post he is sitting on.
function momoBanana() {
  if (!momo.el || !momo.post || !momo.post.isConnected) return momoShowBubble('Throw bananas at a post! 🍌', 'tap');
  window.__momoBananas = (window.__momoBananas || 0) + 1;
  momoSfx('swoosh', { user: true });
  const b = document.createElement('div'); b.className = 'momo-banana'; b.textContent = '🍌'; b.setAttribute('aria-hidden', 'true');
  const from = { x: momo.x + momo.W / 2, y: momo.y + momo.H * 0.4 };
  const r = momo.post.getBoundingClientRect(), to = { x: r.left + Math.min(r.width * 0.45, 260), y: r.top + Math.min(r.height * 0.5, 80) };
  b.style.left = from.x + 'px'; b.style.top = from.y + 'px';
  document.body.appendChild(b);
  const done = () => { momoSfx('splat', { user: true }); b.remove(); const splat = document.createElement('div'); splat.className = 'momo-banana splat'; splat.textContent = '💥'; splat.style.left = to.x + 'px'; splat.style.top = to.y + 'px'; document.body.appendChild(splat); setTimeout(() => splat.remove(), 700); momo.post.classList.add('momo-hit'); setTimeout(() => momo.post && momo.post.classList.remove('momo-hit'), 600); };
  if (momoReduced() || !b.animate) { setTimeout(done, 200); return momoShowBubble('Banana for you! 🍌', 'tap'); }
  const dx = to.x - from.x, dy = to.y - from.y;
  b.animate([{ transform: 'translate(0,0) rotate(0)' }, { transform: `translate(${dx * 0.5}px,${dy * 0.5 - 60}px) rotate(360deg)` }, { transform: `translate(${dx}px,${dy}px) rotate(720deg)` }], { duration: 650, easing: 'ease-in' }).onfinish = done;
  momoShowBubble('Banana incoming! 🍌', 'tap');
}
// Outfit unlocked by milestones (Settings → Momo's outfit); shown on the web Momo via #momo[data-outfit].
function momoOutfit(key) { if (momo.el) { if (key) momo.el.dataset.outfit = key; else delete momo.el.dataset.outfit; } }
function momoBuild() {
  if (momo.built) return;
  momo.built = true;
  const el = momo.el = document.createElement('div');
  el.id = 'momo'; el.className = 'momo st-idle'; el.hidden = true;
  el.innerHTML = `<div class="momo-bubble" hidden><div class="mb-cloud" data-momo="bubble"><i class="pf p1"></i><i class="pf p2"></i><i class="pf p3"></i><i class="pf p4"></i><i class="pf p5"></i><span class="mb-ic" aria-hidden="true">💬</span><span class="mb-text" aria-live="polite"></span></div><button type="button" class="mb-speak" data-momo="speak" aria-label="Read aloud" title="Read aloud">🔊</button><i class="mb-dot d1"></i><i class="mb-dot d2"></i><i class="mb-dot d3"></i></div>
    <div class="momo-fig" data-momo="monkey" role="button" tabindex="0" aria-label="Momo the monkey. Tap for a thought">${MOMO_SVG}</div>`;
  document.body.appendChild(el);
  momoOutfit(state.prefs && state.prefs.momo_outfit);
  momo.bubble = $('.momo-bubble', el); momo.textEl = $('.mb-text', el);
  el.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-momo="monkey"]')) e.preventDefault(); });
  el.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('[data-momo="monkey"]')) return;
    clearTimeout(momo.timers.press); momo.lp = false;
    momo.timers.press = setTimeout(() => { if (momoSpeak(false)) { momo.lp = true; momoSetState(momo.st); } }, 600);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => el.addEventListener(t, () => clearTimeout(momo.timers.press)));
  el.addEventListener('click', (e) => {
    if (momo.lp) { momo.lp = false; e.preventDefault(); e.stopPropagation(); return; } // the long-press already read the thought aloud
    const t = e.target.closest('[data-momo]'); if (!t) return;
    e.preventDefault(); e.stopPropagation();
    if (t.dataset.momo === 'speak') { if (momo.speaking) momoStopSpeech(); else momoSpeak(false); return; }
    if (t.dataset.momo === 'bubble') momoBubbleTap(); else momoTap();
  });
  el.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-momo]')) { e.preventDefault(); e.target.closest('[data-momo]').click(); }
  });
  momo.io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) momo.visible.add(en.target); else momo.visible.delete(en.target);
      // Its post left the view: hop to the next one (right away if the page is still, else while/after scrolling).
      if (en.target === momo.post && !en.isIntersecting && momo.active && !momo.flight && !momo.scrolling) momoSettle();
    }
  }, { rootMargin: '-40px 0px -40px 0px' });
}
function momoSetState(s) {
  if (momo.st === s) return;
  momo.el.classList.remove('st-' + momo.st);
  momo.st = s;
  momo.el.classList.add('st-' + s);
  momo.el.dataset.state = s;
}
function momoPlace(x, y, rot = 0) {
  momo.x = x; momo.y = y; momo.rot = rot; momo.placed = true;
  momo.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)${rot ? ` rotate(${rot.toFixed(1)}deg)` : ''}`;
}
function momoMeasure() {
  const svg = $('.momo-svg', momo.el), r = svg.getBoundingClientRect();
  if (r.height) { momo.W = r.width; momo.H = r.height; }
  const head = $('#center .header'), hb = head ? head.getBoundingClientRect().bottom : 0;
  const mobile = innerWidth <= 700;
  momo.band = { head: Math.max(0, hb), top: Math.max(0, hb) + momo.H * 0.8 + 4, bottom: innerHeight - (mobile ? 56 + 16 : 16) - momo.H * 0.25, mobile };
}
const momoSeat = () => momo.H * 96 / 120; // where the seat line is inside the 100x120 drawing
// Sit on the top-right corner: the dangling legs end at the post's right edge (clear of the ⋯ / AI buttons);
// on narrow screens he stays fully on screen (the legs are click-through there).
// If the corner would cover a button (e.g. the previous post's Share on mobile), he shifts left a little (momoShift).
const momoShift = new WeakMap();
const momoRect = (el) => (el.closest('.repost-wrap') || el).getBoundingClientRect(); // reposts: sit on the "X reposted" card's top edge
function momoAnchor(r, el) { return { x: Math.min(r.right - momo.W * 0.62, innerWidth - momo.W - 2) - ((el && momoShift.get(el)) || 0), y: r.top - momoSeat() }; }
function momoHomeSpot() {
  const main = $('.main'), right = main ? Math.min(main.getBoundingClientRect().right, innerWidth) : innerWidth;
  return momo.band.mobile
    ? { x: innerWidth - momo.W - 22, y: innerHeight - 132 - 10 - momo.H } // above the floating Post button
    : { x: Math.min(right - momo.W * 0.45, innerWidth - momo.W - 8), y: innerHeight - momo.H - 16 }; // on the main column's right border
}
// The post nearest the viewport centre whose top edge is in view and where Momo covers no buttons / composer.
function momoPick(exclude) {
  const vh = innerHeight, mid = vh / 2, band = momo.band;
  const pool = momo.visible.size ? [...momo.visible] : $$(MOMO_POSTS);
  const rects = (sel) => $$(sel).map(b => b.getBoundingClientRect()).filter(r => r.width && r.bottom > 0 && r.top < vh);
  const blockers = rects(band.mobile ? MOMO_BLOCKERS.replace('.actions .act', '.actions .act .ic') : MOMO_BLOCKERS), // mobile: the bigger Momo fits between the tap circles, not the counts
    bodyBlockers = rects(MOMO_BLOCKERS_BODY);
  const hit = (b, box) => b.right > box.l + 1 && b.left < box.r - 1 && b.bottom > box.t + 1 && b.top < box.b - 1;
  let best = null, bestD = Infinity;
  for (const el of pool) {
    if (!el.isConnected || el === exclude) continue;
    const r = momoRect(el);
    if (r.top < band.top || r.top > band.bottom || r.height < 40) continue;
    const a = momoAnchor(r);
    let shift = -1;
    for (let dx = 0; dx <= (band.mobile ? 320 : 160); dx += 4) {
      const x = a.x - dx, box = { l: x + momo.W * 0.12, r: x + momo.W * 0.96, t: a.y, b: a.y + momo.H }, body = { ...box, b: a.y + momoSeat() };
      if (x < r.left + (band.mobile ? 4 : 60)) break;
      if (!blockers.some(b => hit(b, box)) && !bodyBlockers.some(b => hit(b, body))) { shift = dx; break; }
    }
    if (shift < 0) continue;
    const d = Math.abs(r.top + Math.min(r.height, vh) / 2 - mid);
    if (d < bestD) { bestD = d; best = el; momoShift.set(el, shift); }
  }
  return best;
}
function momoLoop() { if (!momo.raf && momo.active) momo.raf = requestAnimationFrame(momoTick); }
function momoTick(now) {
  momo.raf = 0;
  if (!momo.active) return;
  let more = false;
  if (momo.flight) more = momoFlightStep(now);
  else if (momo.post) {
    if (!momo.post.isConnected) { momo.post = null; momo.postId = 0; momoSettleSoon(); }
    else {
      const r = momoRect(momo.post), a = momoAnchor(r, momo.post), band = momo.band;
      const lost = r.top < band.top - 2 || r.top > band.bottom + 2;
      // Ride along with the post; if it scrolls out of view, cling to the screen edge and hop to the next one.
      const y = Math.min(Math.max(a.y, band.head + 2), band.bottom - momoSeat());
      momoPlace(a.x, y);
      if (lost && momo.scrolling && now - momo.lastHop > 700) {
        const next = momoPick(momo.post);
        if (next) momoJump(next);
      }
      more = momo.scrolling || !!momo.flight;
    }
  }
  if (more) momoLoop();
}
function momoJump(el) {
  momo.lastHop = performance.now();
  momoHideBubble(true);
  momo.post = el; momo.postId = +el.dataset.post;
  momo.el.dataset.post = String(momo.postId);
  clearTimeout(momo.timers.land); clearTimeout(momo.timers.think);
  if (momoReduced()) {
    // Reduced motion: fade out, move, fade in (no arc, no squash).
    momo.flight = null;
    momoSetState('fade');
    momo.el.classList.add('fading');
    clearTimeout(momo.timers.fade);
    momo.timers.fade = setTimeout(() => {
      if (!momo.active || momo.post !== el || !el.isConnected) return;
      const a = momoAnchor(momoRect(el), el);
      momoPlace(a.x, a.y);
      momo.el.classList.remove('fading');
      momoLanded();
    }, 240);
    return;
  }
  momoSetState('crouch');
  momo.flight = { el, t0: performance.now() + 150, fx: momo.x, fy: momo.y, dur: 0 };
  momoLoop();
}
function momoFlightStep(now) {
  const f = momo.flight;
  if (!f.el.isConnected) { momo.flight = null; momo.post = null; momo.postId = 0; momoSetState('idle'); momoSettleSoon(); return false; }
  if (now < f.t0) return true; // crouching before the jump
  const a = momoAnchor(momoRect(f.el), f.el); // live target: follows the post if the page scrolls mid-jump
  if (!f.dur) {
    const dx = a.x - f.fx, dy = a.y - f.fy, dist = Math.hypot(dx, dy);
    f.dur = Math.min(820, Math.max(430, 360 + dist * 0.6));
    f.peak = Math.min(150, 46 + dist * 0.22) + Math.max(0, -dy) * 0.12;
    f.dir = dx < 0 ? -1 : 1;
    momoSetState('jump');
  }
  const p = Math.min(1, (now - f.t0) / f.dur);
  const ex = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const x = f.fx + (a.x - f.fx) * ex;
  const y = f.fy + (a.y - f.fy) * p - f.peak * 4 * p * (1 - p);
  if (p >= 1) { momo.flight = null; momoPlace(a.x, a.y); momoLanded(); return momo.scrolling; }
  momoPlace(x, Math.max(-momo.H * 0.5, y), f.dir * 14 * (1 - 2 * p));
  return true;
}
function momoLanded() {
  momoSetState(momoReduced() ? 'sit' : 'land');
  clearTimeout(momo.timers.land);
  momo.timers.land = setTimeout(() => {
    if (!momo.active || momo.flight) return;
    momoSetState('sit');
    const id = momo.postId, last = momo.shownAt.get(id) || 0;
    if (id && Date.now() - last > 60000) momoThink(id); // don't repeat the same thought while it just sits there
  }, momoReduced() ? 0 : 240);
}
async function momoThought(id) {
  if (momo.thoughts.has(id)) return momo.thoughts.get(id);
  if (!momo.loading.has(id)) {
    momo.loading.set(id, (async () => {
      try {
        const r = await fetch('/api/monkey/thought/' + id, { credentials: 'same-origin' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const { thought, mood } = await r.json();
        if (typeof thought !== 'string' || !thought) throw new Error('empty');
        if (MOMO_MOODS.includes(mood)) momo.moods.set(id, mood);
        momo.thoughts.set(id, thought);
        try { sessionStorage.setItem('zuzu.momoThoughts', JSON.stringify([...momo.thoughts].slice(-200))); sessionStorage.setItem('zuzu.momoMoods', JSON.stringify([...momo.moods].slice(-200))); } catch {}
        return thought;
      } catch { return MOMO_LOCAL[id % MOMO_LOCAL.length]; } finally { momo.loading.delete(id); }
    })());
  }
  return momo.loading.get(id);
}
async function momoThink(id) {
  momoSetState('think');
  const t0 = Date.now();
  const text = await momoThought(id);
  const wait = Math.max(0, 650 - (Date.now() - t0)); // a little "hmm…" with the hand on its chin
  clearTimeout(momo.timers.think);
  momo.timers.think = setTimeout(() => {
    if (!momo.active || momo.postId !== id || momo.flight || momo.st === 'sleep') return;
    momo.shownAt.set(id, Date.now());
    momoShowBubble(text, 'thought');
    const mood = momo.moods.get(id);
    if (mood) { momo.el.dataset.mood = mood; window.__momoMoods && window.__momoMoods.push(mood); momoReact(mood, id); }
    momoAutoTalk();
  }, wait);
}
// ---------- Momo sounds: tiny WebAudio synths (no audio files), unlocked by a user gesture, one sound per 4 s ----------
const snd = { ctx: null, master: null, unlocked: false, last: -1e9, busyUntil: 0, userAt: -1e9, talkAt: -1e9, cur: null, noise: null };
const SND_VOL = 0.16; // default "low volume"
function momoAudioUnlock() {
  if (snd.unlocked || !momoSoundOn()) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    if (!snd.ctx) { snd.ctx = new AC(); snd.master = snd.ctx.createGain(); snd.master.gain.value = SND_VOL; snd.master.connect(snd.ctx.destination); }
    snd.ctx.resume && snd.ctx.resume();
    snd.unlocked = true;
  } catch {}
}
['pointerdown', 'touchend', 'keydown', 'click'].forEach(t => addEventListener(t, momoAudioUnlock, { passive: true, capture: true }));
function sndNoise() {
  if (snd.noise) return snd.noise;
  const c = snd.ctx, b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return (snd.noise = b);
}
// One voice: oscillator with a pitch path [[t, hz], …] (seconds from start), optional filter and vibrato, shaped by an attack/decay envelope.
function sndTone(bus, t0, o) {
  const c = snd.ctx, osc = c.createOscillator(), g = c.createGain(); let node = osc;
  osc.type = o.type || 'sine';
  const path = o.path; osc.frequency.setValueAtTime(path[0][1], t0);
  for (let i = 1; i < path.length; i++) osc.frequency.exponentialRampToValueAtTime(Math.max(20, path[i][1]), t0 + path[i][0]);
  if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t0); l.stop(t0 + o.dur + 0.05); }
  if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; node.connect(f); node = f; }
  node.connect(g);
  const a = o.attack || 0.006, v = (o.vol || 0.5);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  g.connect(bus); osc.start(t0); osc.stop(t0 + o.dur + 0.05);
}
function sndNoiseBurst(bus, t0, o) {
  const c = snd.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  src.buffer = sndNoise(); f.type = o.type || 'bandpass'; f.Q.value = o.q || 1;
  f.frequency.setValueAtTime(o.f[0][1], t0); o.f.slice(1).forEach(([t, hz]) => f.frequency.exponentialRampToValueAtTime(hz, t0 + t));
  src.connect(f); f.connect(g);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.vol || 0.5, t0 + (o.attack || 0.02)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  g.connect(bus); src.start(t0); src.stop(t0 + o.dur + 0.05);
}
const SND = {
  giggle: (b, t) => { for (let i = 0; i < 5; i++) sndTone(b, t + i * 0.115, { type: 'square', path: [[0, 640 + 70 * (i % 2)], [0.09, 440 + 40 * (i % 2)]], dur: 0.09, vol: 0.32 - i * 0.02, lp: 1700 }); },
  whoa: (b, t) => sndTone(b, t, { type: 'sawtooth', path: [[0, 200], [0.28, 520], [0.75, 300]], dur: 0.75, vol: 0.4, lp: 900, vib: [6, 10], attack: 0.04 }),
  aww: (b, t) => { sndTone(b, t, { path: [[0, 784], [0.5, 780]], dur: 0.55, vol: 0.4 }); sndTone(b, t, { path: [[0, 1568], [0.4, 1560]], dur: 0.4, vol: 0.08 }); sndTone(b, t + 0.2, { path: [[0, 659], [0.6, 655]], dur: 0.65, vol: 0.4 }); },
  yawn: (b, t) => { sndTone(b, t, { type: 'triangle', path: [[0, 330], [0.45, 300], [1.1, 150]], dur: 1.15, vol: 0.28, lp: 700, attack: 0.3, vib: [4, 5] }); sndNoiseBurst(b, t, { f: [[0, 600], [1.1, 240]], q: 0.8, dur: 1.1, vol: 0.12, attack: 0.35 }); },
  cheer: (b, t) => { [523, 659, 784, 1047].forEach((f, i) => sndTone(b, t + i * 0.09, { type: 'triangle', path: [[0, f], [0.2, f]], dur: 0.22, vol: 0.35 })); [523, 659, 784, 1047].forEach(f => sndTone(b, t + 0.4, { type: 'square', path: [[0, f], [0.4, f]], dur: 0.45, vol: 0.07, lp: 2400 })); },
  squeak: (b, t) => { sndTone(b, t, { type: 'triangle', path: [[0, 1500], [0.06, 2700], [0.14, 1900]], dur: 0.15, vol: 0.28, vib: [40, 60] }); sndTone(b, t + 0.2, { type: 'triangle', path: [[0, 1700], [0.06, 3000], [0.12, 2100]], dur: 0.13, vol: 0.22, vib: [40, 60] }); },
  boing: (b, t) => sndTone(b, t, { path: [[0, 700], [0.08, 260], [0.2, 520], [0.38, 140]], dur: 0.4, vol: 0.45, vib: [22, 40] }),
  swoosh: (b, t) => sndNoiseBurst(b, t, { f: [[0, 500], [0.22, 3200], [0.45, 700]], q: 1.4, dur: 0.46, vol: 0.4, attack: 0.15 }),
  splat: (b, t) => { sndNoiseBurst(b, t, { type: 'lowpass', f: [[0, 2200], [0.18, 300]], q: 0.7, dur: 0.2, vol: 0.5, attack: 0.004 }); sndTone(b, t, { path: [[0, 160], [0.14, 50]], dur: 0.16, vol: 0.5 }); },
  blip: (b, t) => sndTone(b, t, { path: [[0, 880], [0.06, 1320]], dur: 0.08, vol: 0.3 }),
};
// Gate: sound is on, Momo is visible (and not hidden / muted), the tab is active and a gesture unlocked audio.
// Reactions (not user-triggered) also need Momo's post in view and obey one sound per 4 s, never overlapping.
function momoSfx(name, opts = {}) {
  if (!SND[name] || !momoSoundOn() || !snd.unlocked || !snd.ctx || document.hidden || !momo.active || !momo.el || momo.el.hidden) return false;
  const now = performance.now();
  if (opts.user) { if (now - snd.userAt < 300) return false; snd.userAt = now; }
  else {
    if (now - snd.last < 4000 || now < snd.busyUntil) return false;
    if (momo.post) { const r = momo.post.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return false; }
    if (!opts.free) snd.last = now; // the pop-up blip doesn't use up the reaction budget
  }
  try {
    if (snd.ctx.state === 'suspended') snd.ctx.resume();
    if (snd.cur) { try { snd.cur.gain.cancelScheduledValues(snd.ctx.currentTime); snd.cur.gain.setTargetAtTime(0, snd.ctx.currentTime, 0.02); } catch {} } // never overlap
    const bus = snd.ctx.createGain(); bus.gain.value = 1; bus.connect(snd.master); snd.cur = bus;
    SND[name](bus, snd.ctx.currentTime + 0.01);
    snd.busyUntil = now + ({ yawn: 1200, whoa: 800, giggle: 700, cheer: 850 }[name] || 500);
    window.__momoSounds && window.__momoSounds.push(name);
    return true;
  } catch { return false; }
}
// Game sounds share Momo's sound toggle, audio context and master volume (low by default).
const GSND = {
  tick: (b, t) => sndTone(b, t, { type: 'triangle', path: [[0, 900], [0.04, 900]], dur: 0.05, vol: 0.2 }),
  right: (b, t) => { sndTone(b, t, { path: [[0, 660], [0.1, 660]], dur: 0.12, vol: 0.35 }); sndTone(b, t + 0.1, { path: [[0, 990], [0.2, 990]], dur: 0.22, vol: 0.35 }); },
  wrong: (b, t) => sndTone(b, t, { type: 'sawtooth', path: [[0, 300], [0.25, 130]], dur: 0.28, vol: 0.28, lp: 900 }),
  shoot: (b, t) => sndTone(b, t, { type: 'square', path: [[0, 900], [0.09, 280]], dur: 0.1, vol: 0.16, lp: 2200 }),
  hit: (b, t) => { sndNoiseBurst(b, t, { type: 'lowpass', f: [[0, 1800], [0.1, 300]], q: 0.7, dur: 0.12, vol: 0.4, attack: 0.004 }); },
  pickup: (b, t) => { sndTone(b, t, { path: [[0, 784], [0.07, 784]], dur: 0.08, vol: 0.3 }); sndTone(b, t + 0.07, { path: [[0, 1175], [0.1, 1175]], dur: 0.12, vol: 0.3 }); },
  zone: (b, t) => sndTone(b, t, { type: 'sawtooth', path: [[0, 180], [0.5, 120]], dur: 0.55, vol: 0.2, lp: 500 }),
  win: (b, t) => [523, 659, 784, 1047, 1319].forEach((f, i) => sndTone(b, t + i * 0.11, { type: 'triangle', path: [[0, f], [0.25, f]], dur: 0.3, vol: 0.35 })),
  lose: (b, t) => [440, 392, 330, 262].forEach((f, i) => sndTone(b, t + i * 0.16, { type: 'triangle', path: [[0, f], [0.25, f]], dur: 0.3, vol: 0.3 })),
};
const gsndLast = {};
function gameSfx(name) {
  if (!GSND[name] || !momoSoundOn() || !snd.unlocked || !snd.ctx || document.hidden) return false;
  const now = performance.now(); if (now - (gsndLast[name] || -1e9) < 60) return false; gsndLast[name] = now;
  try {
    if (snd.ctx.state === 'suspended') snd.ctx.resume();
    const bus = snd.ctx.createGain(); bus.gain.value = 1; bus.connect(snd.master); GSND[name](bus, snd.ctx.currentTime + 0.005);
    window.__gameSounds && window.__gameSounds.push(name); return true;
  } catch { return false; }
}
window.__zg = { api, shell, esc, toast, go, state, avatar, loader, sfx: gameSfx, soundOn: () => momoSoundOn(), get meName() { return state.me && state.me.username; } };
const MOMO_MOOD_SFX = { funny: 'giggle', mindblown: 'whoa', love: 'aww', sleepy: 'yawn', cheering: 'cheer', scared: 'squeak' };
function momoSoundToggle() {
  const on = !momoSoundOn();
  store('localStorage', 'zuzu.momoSound', on ? '1' : '0');
  $$('[data-action="momo-sound"]').forEach(b => { b.setAttribute('aria-pressed', String(on)); const i = $('.snd-ic', b); if (i) i.textContent = on ? '🔊' : '🔇'; else if (b.classList.contains('momo-stoggle')) b.textContent = on ? '🔊' : '🔇'; });
  if (on) { momoAudioUnlock(); momoSfx('blip', { user: true }); } else { if (snd.cur) { try { snd.cur.gain.setTargetAtTime(0, snd.ctx.currentTime, 0.02); } catch {} } momoStopSpeech(); }
  toast(on ? 'Momo sounds on 🔊' : 'Momo sounds off 🔇');
}
// Bonus: long-press Momo to hear his thought read aloud (browser speechSynthesis; hi-IN for Hindi / Hinglish).
const MOMO_HINGLISH = /\b(hai|hain|kya|nahi|nahin|yaar|bhai|accha|achha|bahut|mein|hum|tum|aap|kuch|karo|chalo|kaise|kyun|yeh|woh|toh|bhi|sab|apna|mera|meri|tera|kal|aaj|abhi|bilkul|ekdum|matlab|ab|se|ka|ki|ko|ne|pe|aur|dil|pyaar|maa)\b/gi;
const momoLangFor = (t) => /[\u0900-\u097F]/.test(t) || (String(t).match(MOMO_HINGLISH) || []).length >= 2 ? 'hi-IN' : 'en-IN';
const momoTalksOn = () => store('localStorage', 'zuzu.momoTalks') === '1'; // opt-in, default off
function momoStopSpeech() {
  clearTimeout(momo.timers.talk);
  if (momo.speaking) { momo.speaking = false; try { speechSynthesis.cancel(); } catch {} }
  $$('.mb-speak', momo.el || document).forEach(b => b.classList.remove('on'));
}
// explicit = the speaker button / long-press (always allowed); auto = "Momo talks" (needs sound on, a gesture, Momo visible, post in view).
function momoSpeak(auto) {
  if (!('speechSynthesis' in window) || !momo.active || !momo.el || momo.el.hidden || document.hidden) return false;
  if (auto && (!momoTalksOn() || !momoSoundOn() || !snd.unlocked)) return false;
  const text = String((momo.bubbleKind === 'thought' && momo.textEl && momo.textEl.textContent) || momo.thoughts.get(momo.postId) || '').replace(/\p{Extended_Pictographic}\uFE0F?/gu, '').replace(/\s+/g, ' ').trim();
  if (!text) return false;
  if (auto) {
    const now = performance.now(); if (now - snd.talkAt < 6000) return false;
    if (momo.post) { const r = momo.post.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return false; }
    snd.talkAt = now;
  }
  const lang = momoLangFor(text);
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.volume = 0.8; u.rate = 1; u.pitch = 1.3; // a bit higher = playful
    const voices = speechSynthesis.getVoices() || [];
    const v = voices.find(x => x.lang === lang) || voices.find(x => x.lang.slice(0, 2) === lang.slice(0, 2));
    if (v) u.voice = v;
    momo.speaking = true; $$('.mb-speak', momo.el).forEach(b => b.classList.add('on'));
    u.onend = u.onerror = () => { momo.speaking = false; $$('.mb-speak', momo.el).forEach(b => b.classList.remove('on')); };
    speechSynthesis.speak(u);
    window.__momoSpoken && window.__momoSpoken.push({ text, lang, auto: !!auto });
    return true;
  } catch { return false; }
}
// "Momo talks": after the mood sound, read the thought aloud (post must still be in view)
function momoAutoTalk() {
  if (!momoTalksOn() || !momoSoundOn() || !snd.unlocked) return;
  clearTimeout(momo.timers.talk);
  const wait = Math.max(150, snd.busyUntil - performance.now() + 150);
  momo.timers.talk = setTimeout(() => momoSpeak(true), wait);
}
function momoTalksToggle(on) { store('localStorage', 'zuzu.momoTalks', on ? '1' : '0'); if (!on) momoStopSpeech(); else momoAudioUnlock(); }
window.__momoApi = { get m() { return momo; }, react: (...a) => momoReact(...a), sfx: (...a) => momoSfx(...a), speak: (a) => momoSpeak(a), stop: () => momoStopSpeech(), get snd() { return snd; }, lang: (t) => momoLangFor(t), trick: (...a) => momoTrick(...a), tap: () => momoTap(), bubble: (...a) => momoShowBubble(...a) };
function momoReact(mood, id) {
  if (MOMO_MOOD_SFX[mood]) momoSfx(MOMO_MOOD_SFX[mood]);
  const fx = MOMO_FX[mood]; if (fx) momoFx(fx, { cls: 'fx-' + mood });
  const cloud = $('.mb-cloud', momo.bubble); const old = $('.mb-streak', cloud); if (old) old.remove();
  if (mood === 'funny') {
    const n = momoLaughed();
    const e = document.createElement('small'); e.className = 'mb-streak'; e.textContent = `😂 Momo has laughed ${n} time${n === 1 ? '' : 's'} today`;
    cloud.appendChild(e);
  }
}
function momoShowBubble(text, kind) {
  const b = momo.bubble;
  clearTimeout(momo.timers.bubble); clearTimeout(momo.timers.bubbleOut);
  momo.bubbleKind = kind;
  b.classList.remove('out', 'side');
  const sk = $('.mb-streak', b); if (sk) sk.remove();
  b.classList.toggle('zzz', kind === 'sleep');
  b.classList.toggle('can-ask', kind === 'thought' && !!state.config.ai);
  b.classList.toggle('can-speak', kind === 'thought' && 'speechSynthesis' in window);
  momo.textEl.textContent = text;
  const cloud = $('.mb-cloud', b);
  if (kind === 'thought' && state.config.ai) { cloud.setAttribute('role', 'button'); cloud.tabIndex = 0; cloud.setAttribute('aria-label', text + '. Ask ZuZu AI about this post'); }
  else { cloud.removeAttribute('role'); cloud.removeAttribute('tabindex'); cloud.removeAttribute('aria-label'); }
  b.hidden = false;
  // Not enough room above Momo (under the header)? Put the bubble beside it instead.
  if (momo.y - (momo.band ? momo.band.head : 0) < b.offsetHeight + 24) b.classList.add('side');
  if (kind !== 'sleep') momo.timers.bubble = setTimeout(() => momoHideBubble(), MOMO_BUBBLE_MS);
}
function momoHideBubble(now) {
  const b = momo.bubble; if (!b || b.hidden) return;
  if (momo.speaking && !now && momo.bubbleKind === 'thought') { clearTimeout(momo.timers.bubble); momo.timers.bubble = setTimeout(() => momoHideBubble(), 1500); return; } // let him finish the sentence
  momoStopSpeech();
  clearTimeout(momo.timers.bubble); clearTimeout(momo.timers.bubbleOut);
  const done = () => { b.hidden = true; b.classList.remove('out'); momo.bubbleKind = ''; delete momo.el.dataset.mood; if (momo.st === 'think') momoSetState('sit'); };
  if (now) return done();
  b.classList.add('out');
  momo.timers.bubbleOut = setTimeout(done, 400);
}
function momoTap() {
  momoActivity(true);
  if (!momo.active) return;
  const now = Date.now(), dbl = now - (momo.lastTap || 0) < 380; momo.lastTap = now;
  if (dbl && momo.st !== 'sleep') { momo.lastTap = 0; return momoBanana(); }
  if (momo.st === 'sleep') return momoWake();
  if (!momo.post || momo.flight) return momoShowBubble(momo.post ? 'Wheee! 🐒' : 'Scroll and I’ll hop onto a post! 🐒', 'tap');
  const id = momo.postId;
  if (momo.bubbleKind === 'thought') { // thought already showing: a random trick (or a playful line)
    const cur = momo.textEl.textContent;
    const pick = MOMO_TAP.filter(t => t !== cur && (state.config.ai || !/ZuZu AI/.test(t)));
    if (Math.random() < 0.7) return momoTrick();
    momoShowBubble(pick[Math.floor(Math.random() * pick.length)], 'tap');
  } else { momo.shownAt.delete(id); momoThink(id); } // show the thought again
}
function momoBubbleTap() {
  if (momo.bubbleKind === 'thought' && state.config.ai && momo.postId && postCache.has(momo.postId)) {
    const id = momo.postId;
    momoHideBubble(true);
    openAi(id, $('.momo-fig', momo.el));
  } else momoHideBubble();
}
function momoSleep() {
  if (!momo.active || momo.st === 'sleep' || momo.flight) return;
  momoHideBubble(true);
  momoSetState('sleep');
  momoShowBubble('z z z', 'sleep');
}
function momoWake() {
  if (momo.st !== 'sleep') return;
  momoHideBubble(true);
  momoSetState(momo.post ? 'sit' : 'idle');
}
function momoActivity(wake) {
  momo.lastActivity = Date.now();
  if (wake) momoWake();
}
const momoSettleSoon = (ms = MOMO_SETTLE_MS) => { clearTimeout(momo.timers.settle); momo.timers.settle = setTimeout(momoSettle, ms); };
function momoSettle() {
  momo.scrolling = false;
  if (!momo.active || momo.flight || momo.st === 'sleep') return;
  momoMeasure();
  const best = momoPick();
  if (best && best !== momo.post) return momoJump(best);
  if (!best && momo.post) {
    const r = momo.post.isConnected && momoRect(momo.post);
    if (r && r.top >= momo.band.top - 2 && r.top <= momo.band.bottom + 2) return; // still a fine perch
    // Nowhere to sit: hop back to the corner.
    momo.post = null; momo.postId = 0; momo.el.dataset.post = '';
    momoHideBubble(true);
    const h = momoHomeSpot(); momoPlace(h.x, h.y); momoSetState('idle');
  }
}
function momoOnScroll() {
  if (!momo.active) return;
  if (momo.speaking && momo.post) { const r = momo.post.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) momoStopSpeech(); }
  momoActivity(true);
  momo.scrolling = true;
  momoLoop();
  momoSettleSoon();
}
function momoAllowed() {
  return momoOn() && !!state.me && MOMO_ROUTES.test(location.pathname) && !document.body.classList.contains('reels-page') && !document.hidden
    && !document.body.classList.contains('ai-open') && !$('#modal-root').childElementCount;
}
function momoActivate() {
  const wasActive = momo.active;
  momoBuild();
  momo.active = true;
  momo.el.hidden = false;
  momo.el.classList.remove('paused');
  momoMeasure();
  momo.lastActivity = Date.now();
  if (momo.post && momo.post.isConnected) { const a = momoAnchor(momoRect(momo.post), momo.post); momoPlace(a.x, a.y); momoSetState('sit'); }
  else { momo.post = null; momo.postId = 0; momo.el.dataset.post = ''; const h = momoHomeSpot(); momoPlace(h.x, h.y); momoSetState('idle'); }
  momoObserve();
  if (!wasActive) setTimeout(() => momoSfx('blip', { free: true }), 120);
  momoSettleSoon(700);
  clearInterval(momo.idleIv);
  momo.idleIv = setInterval(() => { if (momo.active && Date.now() - momo.lastActivity > MOMO_IDLE_MS()) momoSleep(); }, Math.min(5000, MOMO_IDLE_MS() / 3));
}
function momoDeactivate() {
  momo.active = false;
  if (momo.raf) cancelAnimationFrame(momo.raf);
  momo.raf = 0; momo.flight = null; momo.scrolling = false;
  Object.values(momo.timers).forEach(clearTimeout);
  clearInterval(momo.idleIv);
  if (!momo.el) return;
  momoHideBubble(true);
  momo.el.classList.remove('fading');
  momo.el.hidden = true;
  momo.el.classList.add('paused');
  momoSetState('hidden');
}
function momoObserve() {
  if (!momo.io) return;
  for (const el of [...momo.visible]) if (!el.isConnected) { momo.visible.delete(el); momo.io.unobserve(el); }
  $$(MOMO_POSTS).forEach(el => { if (!el.dataset.momoObs) { el.dataset.momoObs = '1'; momo.io.observe(el); } });
}
let momoSyncRaf = 0;
function momoSync() {
  if (momoSyncRaf) return;
  momoSyncRaf = requestAnimationFrame(() => {
    momoSyncRaf = 0;
    const ok = momoAllowed();
    if (ok && !momo.active) momoActivate();
    else if (!ok && momo.active) momoDeactivate();
    else if (ok) {
      momoObserve();
      if (momo.post && !momo.post.isConnected) { momo.post = null; momo.postId = 0; momo.el.dataset.post = ''; momoHideBubble(true); if (!momo.flight) momoSetState('idle'); }
      if (!momo.post && !momo.flight && momo.st !== 'sleep') momoSettleSoon();
    }
  });
}
function momoToggle() {
  const on = !momoOn();
  store('localStorage', MOMO_KEY, on ? '1' : '0');
  $$('[data-action="momo-toggle"]').forEach(b => b.setAttribute('aria-pressed', String(on)));
  if (!on) momoStopSpeech();
  momoSync();
  toast(on ? 'Momo is back! 🐒' : 'Momo is taking a break. Turn him back on anytime.');
}
addEventListener('scroll', momoOnScroll, { passive: true });
addEventListener('resize', () => { if (momo.active) { momoMeasure(); momoSettleSoon(200); } }, { passive: true });
['pointerdown', 'keydown'].forEach(t => addEventListener(t, () => momoActivity(false), { passive: true, capture: true }));
document.addEventListener('visibilitychange', momoSync); // no work at all while the tab is hidden
new MutationObserver(momoSync).observe(document.getElementById('app'), { childList: true, subtree: true });
new MutationObserver(momoSync).observe(document.getElementById('modal-root'), { childList: true });
new MutationObserver(momoSync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
addEventListener('popstate', momoSync);

// ---------- boot ----------
async function refreshMe() {
  try { const r = await api('GET', '/api/me'); state.me = r.user; if (state.me) state.me.account = r.account || null; state.admin = !!r.admin; state.unread = r.unread || 0; state.dmUnread = r.dm_unread || 0; state.prefs = r.prefs || null; if (state.prefs && window.ZUZU_I18N && state.prefs.ui_lang !== ZUZU_I18N.get()) ZUZU_I18N.set(state.prefs.ui_lang); } catch { state.me = null; }
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

// ---------- Settings (/settings): account deletion; reports (posts, profiles, DM messages); admin report queue ----------
routes.push([/^\/settings\/?$/, () => viewSettings()]);
// Games (lazy-loaded /games.js): lobby, Prediction Arena, ZuZu Royale
let gamesLoad = null;
function loadGames() {
  if (window.ZuzuGames) return Promise.resolve(window.ZuzuGames);
  return gamesLoad || (gamesLoad = new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/games.js?v=18'; s.onload = () => res(window.ZuzuGames); s.onerror = () => { gamesLoad = null; rej(new Error('Couldn’t load games')); }; document.head.appendChild(s); }));
}
async function viewGame(which) {
  shell(`<div class="header"><div class="header-row"><h1>Games</h1></div></div><div id="games-root">${loader()}</div>`, { active: 'games' });
  try { const G = await loadGames(); if (location.pathname.startsWith('/games')) G[which](); } catch (e) { const r = $('#games-root'); if (r) r.innerHTML = `<div class="empty"><h3>${esc(e.message)}</h3></div>`; }
}
routes.push([/^\/games\/?$/, () => viewGame('lobby')], [/^\/games\/arena\/?$/, () => viewGame('arena')], [/^\/games\/royale\/?$/, () => viewGame('royale')]);
// ---------- Polls (2–4 choices, 1 hour – 7 days, one vote each; results after voting or when it ends) ----------
function pollLeft(ms) {
  const m = Math.max(0, Math.round((ms - Date.now()) / 60000));
  return m >= 1440 ? `${Math.floor(m / 1440)}d left` : m >= 60 ? `${Math.floor(m / 60)}h left` : `${Math.max(m, 1)}m left`;
}
function pollHTML(p) {
  const pl = p.poll, show = !!pl.votes, total = pl.total || 0;
  const max = show ? Math.max(...pl.votes) : 0;
  const opts = pl.options.map((o, i) => {
    if (!show) return `<button class="poll-opt" data-action="poll-vote" data-id="${p.id}" data-opt="${i}">${esc(o)}</button>`;
    const pct = total ? Math.round(pl.votes[i] / total * 100) : 0;
    return `<div class="poll-res${pl.votes[i] === max && total ? ' win' : ''}${pl.my_vote === i ? ' mine' : ''}"><span class="pr-bar" style="width:${pct}%"></span><span class="pr-l">${esc(o)}${pl.my_vote === i ? ' ✓' : ''}</span><span class="pr-p">${pct}%</span></div>`;
  }).join('');
  return `<div class="poll" data-poll="${p.id}">${opts}<div class="poll-meta">${total} vote${total === 1 ? '' : 's'} · ${pl.ended ? 'Final results' : pollLeft(pl.ends_at)}</div></div>`;
}
document.addEventListener('click', async (e) => {
  const v = e.target.closest('[data-action="poll-vote"]');
  if (v) {
    e.preventDefault(); e.stopImmediatePropagation();
    $$(`[data-poll="${v.dataset.id}"] .poll-opt`).forEach(b => b.disabled = true);
    try { const { post } = await api('POST', `/api/posts/${v.dataset.id}/vote`, { option: +v.dataset.opt }); pollRefresh(post); }
    catch (err) { toast(err.message); const r = await api('GET', `/api/posts/${v.dataset.id}`).catch(() => null); if (r && r.post) pollRefresh(r.post); }
    return;
  }
  const t = e.target.closest('[data-action="poll-toggle"],[data-action="poll-add"],[data-action="voice-rec"],[data-action="voice-stop"],[data-action="voice-clear"]');
  if (!t) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const f = t.closest('form[data-form="compose"]'); if (!f) return;
  const a = t.dataset.action;
  if (a === 'poll-toggle') {
    const pe = $('.poll-edit', f); if (!pe) return;
    if (pe.hidden && (f.image.files.length || composerVideo.get(f) || composerVoice.get(f))) return toast('A poll can’t have media');
    if (pe.hidden) { pe.hidden = false; $('.pe-opt', pe).focus(); } else pollReset(f);
  } else if (a === 'poll-add') {
    const box = $('.pe-opts', f), n = $$('.pe-opt', box).length;
    if (n < 4) box.insertAdjacentHTML('beforeend', `<input class="pe-opt" maxlength="25" placeholder="Choice ${n + 1}" autocomplete="off">`);
    if (n + 1 >= 4) t.hidden = true;
  } else if (a === 'voice-rec') startVoice(f);
  else if (a === 'voice-stop') { const vo = composerVoice.get(f); if (vo && vo.rec && vo.rec.state === 'recording') vo.rec.stop(); }
  else if (a === 'voice-clear') clearVoice(f);
  updateComposer(f);
}, true);
function pollRefresh(post) {
  if (!post) return;
  postCache.set(post.id, { ...(postCache.get(post.id) || {}), ...post });
  $$(`[data-poll="${post.id}"]`).forEach(el => { el.outerHTML = pollHTML(post); });
}
function pollReset(f) {
  const pe = $('.poll-edit', f); if (!pe) return;
  pe.hidden = true;
  $('.pe-opts', pe).innerHTML = [1, 2].map(i => `<input class="pe-opt" maxlength="25" placeholder="Choice ${i}" autocomplete="off">`).join('');
  $('.pe-add', pe).hidden = false; $('.pe-len', pe).value = '1440';
}

// ---------- Voice posts: record up to 30 s in the browser, upload through the signed Cloudinary path ----------
const VOICE_MAX_S = 30;
const composerVoice = new WeakMap(); // form -> { rec, stream, chunks, timer, seconds, result, cloudName, ctl, url }
function audioHTML(p) {
  return `<div class="voice" data-voice="${p.id}"><button class="vo-play" data-action="voice-play" aria-label="Play voice note">${ic('mic')}</button><audio preload="none" src="${esc(p.audio.src)}"></audio><div class="vo-track"><div class="vo-bar"></div></div><span class="vo-time">${fmtDur(p.audio.duration)}</span></div>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-action="voice-play"]'); if (!b) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const box = b.closest('.voice'), au = $('audio', box);
  $$('.voice audio').forEach(x => { if (x !== au && !x.paused) x.pause(); });
  if (au.paused) au.play().catch(err => toast('Couldn’t play this voice note')); else au.pause();
}, true);
document.addEventListener('timeupdate', (e) => {
  const au = e.target; if (!au.closest || !au.closest('.voice')) return;
  const box = au.closest('.voice'), d = au.duration || 0;
  $('.vo-bar', box).style.width = (d ? au.currentTime / d * 100 : 0) + '%';
  $('.vo-time', box).textContent = fmtDur(au.paused && !au.currentTime ? d : au.currentTime);
}, true);
['play', 'pause', 'ended'].forEach(ev => document.addEventListener(ev, (e) => { const box = e.target.closest && e.target.closest('.voice'); if (box) box.classList.toggle('playing', !e.target.paused && !e.target.ended); }, true));
async function startVoice(f) {
  if (composerVoice.get(f)) return;
  if ($('.poll-edit', f) && !$('.poll-edit', f).hidden) return toast('A poll can’t have media');
  if (f.image.files.length || composerVideo.get(f)) return toast('A post can have one photo, video or voice note');
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { return toast('Allow microphone access to record a voice note'); }
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(m => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const vo = { rec, stream, chunks: [], seconds: 0, ctl: { aborted: false }, started: Date.now() };
  composerVoice.set(f, vo);
  const box = $('.voice-box', f); box.hidden = false; box.dataset.state = 'recording';
  $('audio', box).hidden = true; $('.vb-status', box).textContent = 'Recording…';
  rec.ondataavailable = (ev) => { if (ev.data && ev.data.size) vo.chunks.push(ev.data); };
  vo.timer = setInterval(() => {
    vo.seconds = (Date.now() - vo.started) / 1000;
    $('.vb-time', box).textContent = fmtDur(vo.seconds) + ' / 0:30';
    if (vo.seconds >= VOICE_MAX_S && rec.state === 'recording') rec.stop();
  }, 200);
  rec.onstop = async () => {
    clearInterval(vo.timer); stream.getTracks().forEach(t => t.stop());
    if (composerVoice.get(f) !== vo || vo.ctl.aborted) return;
    vo.seconds = Math.min(VOICE_MAX_S, (Date.now() - vo.started) / 1000);
    const type = (rec.mimeType || mime || 'audio/webm').split(';')[0];
    const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
    const file = new File(vo.chunks, 'voice.' + ext, { type });
    if (vo.seconds < 0.8 || !file.size) { toast('That recording was too short'); return clearVoice(f); }
    vo.url = URL.createObjectURL(file);
    const au = $('audio', box); au.src = vo.url; au.hidden = false;
    box.dataset.state = 'uploading'; $('.vb-time', box).textContent = fmtDur(vo.seconds); $('.vb-status', box).textContent = 'Uploading…';
    updateComposer(f);
    try {
      const sig = await api('POST', '/api/video/sign', { kind: 'voice' });
      if (composerVoice.get(f) !== vo) return;
      vo.cloudName = sig.cloudName;
      const res = await uploadVideo(file, sig, (l, t) => { $('.vb-status', box).textContent = `Uploading… ${t ? Math.round(l / t * 100) : 0}%`; }, vo.ctl);
      if (composerVoice.get(f) !== vo) return;
      vo.result = res; box.dataset.state = 'done'; $('.vb-status', box).textContent = 'Ready';
    } catch (err) { if (composerVoice.get(f) === vo && !vo.ctl.aborted) { toast(err.message || 'Upload failed'); clearVoice(f); } }
    updateComposer(f);
  };
  rec.start(250);
  updateComposer(f);
}
function clearVoice(f, { posted = false } = {}) {
  if (!f) return;
  const vo = composerVoice.get(f); composerVoice.delete(f);
  if (vo) {
    vo.ctl.aborted = true; clearInterval(vo.timer);
    if (vo.rec && vo.rec.state === 'recording') try { vo.rec.stop(); } catch {}
    if (vo.stream) vo.stream.getTracks().forEach(t => t.stop());
    if (vo.ctl.xhr) try { vo.ctl.xhr.abort(); } catch {}
    if (vo.url) URL.revokeObjectURL(vo.url);
    if (vo.result && !posted) api('POST', '/api/video/discard', { public_id: vo.result.public_id }).catch(() => {});
  }
  const box = $('.voice-box', f); if (!box) return;
  box.hidden = true; box.dataset.state = ''; const au = $('audio', box); au.removeAttribute('src'); au.hidden = true;
  $('.vb-time', box).textContent = '0:00';
}

function viewSettings() {
  const u = state.me;
  shell(`<div class="header"><div class="header-row"><button class="back" data-action="back" aria-label="Back">${ic('back')}</button><h1>Settings</h1></div></div>
    <div class="settings" id="settings">
      <section class="set-sec" id="set-account"><h2>Account</h2><p class="muted">Signed in as <b>@${esc(u.username)}</b></p>
        <button class="btn btn-outline" data-action="logout">${ic('logout')} Log out</button></section>
      <section class="set-sec" id="set-password"><h2>Change password</h2>
        <form data-form="change-password" autocomplete="off"><div class="field"><label>Current password</label><input name="current" type="password" autocomplete="current-password" required></div>
        <div class="field"><label>New password</label><input name="new_password" type="password" minlength="6" autocomplete="new-password" required></div>
        <p class="muted small">Other devices will be signed out.</p><button class="btn btn-outline" type="submit">Change password</button></form></section>
      <section class="set-sec" id="set-recovery"><h2>Recovery code</h2>
        <p class="muted" id="rec-status">${state.me.account && state.me.account.has_recovery_code ? 'You have a recovery code. Generating a new one replaces it.' : 'You don’t have a recovery code yet. Make one and keep it somewhere safe.'}</p>
        <form data-form="regen-code" autocomplete="off"><div class="field"><label>Your password</label><input name="password" type="password" autocomplete="current-password" required></div>
        <button class="btn btn-outline" type="submit">${state.me.account && state.me.account.has_recovery_code ? 'Generate a new code' : 'Generate my code'}</button></form></section>
      <section class="set-sec" id="set-email"><h2>Email</h2>
        <p class="muted" id="email-status">${emailStatus(state.me.account)}</p>
        <form data-form="set-email" autocomplete="off"><div class="field"><label>Email address</label><input name="email" type="email" maxlength="254" value="${esc((state.me.account && state.me.account.email) || '')}" placeholder="you@example.com"></div>
        <button class="btn btn-outline" type="submit">Save email</button></form></section>
      <section class="set-sec" id="set-lang"><h2>Language</h2>
        <div class="field"><label for="set-ui-lang">App language</label><select id="set-ui-lang" data-pref="ui_lang">${[['en', 'English'], ['hi', 'हिंदी'], ['hinglish', 'Hinglish']].map(([k, l]) => `<option value="${k}"${(state.prefs?.ui_lang || ZUZU_I18N.get()) === k ? ' selected' : ''} data-noi18n>${l}</option>`).join('')}</select></div>
        <div class="field"><label for="set-ai-lang">AI language</label><p class="muted small">ZuZu AI answers and Momo’s thoughts</p><select id="set-ai-lang" data-pref="ai_lang">${[['auto', 'Same as the post'], ['en', 'English'], ['hi', 'हिंदी'], ['hinglish', 'Hinglish']].map(([k, l]) => `<option value="${k}"${(state.prefs?.ai_lang || 'auto') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></div></section>
      <section class="set-sec" id="set-outfit"><h2>Momo’s outfit</h2><p class="muted">Unlock outfits for Momo 🐒 by reaching milestones.</p><div class="outfits" id="outfits">${loader()}</div></section>
      <section class="set-sec" id="set-momo-voice"><h2>Momo’s voice</h2>
        <label class="chk"><input type="checkbox" id="snd-on" data-momo-pref="sound" ${momoSoundOn() ? 'checked' : ''}> Momo sound effects <span class="muted small">(low volume)</span></label>
        <label class="chk"><input type="checkbox" id="snd-talks" data-momo-pref="talks" ${momoTalksOn() ? 'checked' : ''}> Momo talks <span class="muted small">reads his thought aloud (hi-IN for Hindi / Hinglish)</span></label></section>
      <section class="set-sec" id="set-about"><h2>About ZuZu</h2>
        <p class="about-line">Optimize for connection, not engagement.</p>
        <p class="muted small">ZuZu weighs ideas by consequence, not popularity. Probes (claims, predictions, questions) build a track record: your calibration is how often your predictions came true. <a class="link" href="https://zuzu-site.onrender.com/constitution" target="_blank" rel="noopener">Read the ZuZu Constitution</a></p></section>
      <section class="set-sec" id="set-push"><h2>Push notifications</h2><p class="muted" id="push-status">Get notified about likes, replies, follows, mentions and messages.</p>
        <button class="btn btn-outline" data-action="push-toggle" id="push-btn" hidden></button></section>
      <section class="set-sec danger-zone" id="set-delete"><h2>Delete account</h2>
        <p class="muted">This permanently deletes your profile, posts, replies, likes, follows, photos, videos and messages. It can’t be undone. <a class="link" href="/delete-account" target="_blank" rel="noopener">What gets deleted</a></p>
        <form data-form="delete-account" autocomplete="off"><div class="field"><label for="del-confirm">Type <b>${esc(u.username)}</b> (or your password) to confirm</label>
          <input id="del-confirm" name="confirm" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="${esc(u.username)}"></div>
          <button class="btn btn-danger" type="submit" disabled>Delete my account</button></form></section>
    </div>`, { active: '' });
  pushStatus(); loadOutfits();
  if (location.hash === '#set-recovery') $('#set-recovery')?.scrollIntoView();
}
async function loadOutfits() {
  const el = $('#outfits'); if (!el) return;
  try {
    const r = await api('GET', '/api/momo/outfits');
    const card = (key, label, o) => `<button class="outfit-card${r.selected === key ? ' on' : ''}${o && !o.unlocked ? ' locked' : ''}" data-action="outfit" data-outfit-key="${key || ''}" ${o && !o.unlocked ? 'aria-disabled="true"' : ''} aria-pressed="${r.selected === key}">
      <span class="oc-fig" data-outfit="${key || ''}">${MOMO_SVG}</span><b>${esc(label)}</b>
      <small>${o ? (o.unlocked ? 'Unlocked' : `🔒 ${esc(o.how)} (${o.progress[0]}/${o.progress[1]})`) : 'Just Momo'}</small></button>`;
    el.innerHTML = card(null, 'None') + r.outfits.map(o => card(o.key, o.label, o)).join('');
  } catch (err) { el.innerHTML = `<p class="muted">${esc(err.message)}</p>`; }
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-action="outfit"]'); if (!b) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (b.classList.contains('locked')) return toast('Still locked: ' + $('small', b).textContent.replace('🔒 ', ''));
  try {
    const { selected } = await api('PUT', '/api/momo/outfit', { outfit: b.dataset.outfitKey || null });
    state.prefs = { ...(state.prefs || {}), momo_outfit: selected }; momoOutfit(selected);
    $$('.outfit-card').forEach(c => { const on = (c.dataset.outfitKey || null) === selected; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
    toast(selected ? 'Momo is wearing the ' + selected + ' 🐒' : 'Momo’s outfit removed');
  } catch (err) { toast(err.message); }
}, true);
// ---- Language preferences (saved on the account; the UI language also in localStorage) ----
document.addEventListener('change', (e) => {
  const k = e.target.dataset && e.target.dataset.momoPref; if (!k) return;
  if (k === 'sound') { if (e.target.checked !== momoSoundOn()) momoSoundToggle(); }
  else if (k === 'talks') momoTalksToggle(e.target.checked);
});
document.addEventListener('change', async (e) => {
  const sel = e.target.closest('select[data-pref]'); if (!sel) return;
  const key = sel.dataset.pref;
  try {
    state.prefs = await api('PUT', '/api/me/prefs', { [key]: sel.value });
    if (key === 'ui_lang') ZUZU_I18N.set(sel.value);
    if (key === 'ai_lang') { momo.thoughts.clear(); momo.moods.clear(); try { sessionStorage.removeItem('zuzu.momoThoughts'); sessionStorage.removeItem('zuzu.momoMoods'); } catch {} }
    toast(ZUZU_I18N.t('Saved'));
  } catch (err) { toast(err.message); }
});
// ---- Web Push opt-in ----
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const b64u = (s) => { const p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };
async function pushSub() { const reg = await navigator.serviceWorker.getRegistration('/'); return reg ? reg.pushManager.getSubscription() : null; }
async function pushStatus() {
  const st = $('#push-status'), btn = $('#push-btn'); if (!st) return;
  if (!pushSupported()) { st.textContent = 'This browser doesn’t support push notifications.'; return; }
  const cfg = await api('GET', '/api/push/key').catch(() => ({}));
  if (!cfg.enabled) { st.textContent = 'Push notifications aren’t set up on this server yet.'; return; }
  const sub = await pushSub().catch(() => null);
  if (Notification.permission === 'denied') { st.textContent = 'Notifications are blocked for ZuZu in your browser settings.'; btn.hidden = true; return; }
  btn.hidden = false; btn.dataset.on = sub ? '1' : '';
  btn.textContent = ZUZU_I18N.t(sub ? 'Turn off notifications' : 'Turn on notifications');
  st.textContent = sub ? 'On for this browser: likes, replies, follows, mentions and messages.' : 'Get notified about likes, replies, follows, mentions and messages.';
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-action="push-toggle"]'); if (!b) return;
  e.stopImmediatePropagation(); b.disabled = true;
  try {
    if (b.dataset.on) {
      const sub = await pushSub();
      if (sub) { await api('POST', '/api/push/unsubscribe', { endpoint: sub.endpoint }); await sub.unsubscribe(); }
    } else {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error('Notifications were not allowed');
      const { key } = await api('GET', '/api/push/key');
      const reg = await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(key) });
      await api('POST', '/api/push/subscribe', { subscription: sub.toJSON() });
      toast('Notifications are on');
    }
  } catch (err) { toast(err.message); }
  b.disabled = false; pushStatus();
}, true);
document.addEventListener('input', (e) => {
  const f = e.target.closest('form[data-form="delete-account"]'); if (!f) return;
  $('button[type="submit"]', f).disabled = !f.confirm.value.trim();
});
document.addEventListener('submit', async (e) => {
  const f = e.target.closest('form[data-form="delete-account"],form[data-form="report"]'); if (!f) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const btn = $('button[type="submit"]', f); btn.disabled = true;
  try {
    if (f.dataset.form === 'delete-account') {
      if (!confirm('Delete your ZuZu account permanently? This can’t be undone.')) { btn.disabled = false; return; }
      await api('DELETE', '/api/me', { confirm: f.confirm.value });
      state.me = null; toast('Your account was deleted'); go('/login', true);
    } else {
      const reason = (f.querySelector('input[name="reason"]:checked') || {}).value;
      if (!reason) { btn.disabled = false; return toast('Pick a reason'); }
      const r = await api('POST', '/api/reports', { type: f.dataset.type, id: f.dataset.id ? +f.dataset.id : undefined, username: f.dataset.username || undefined, reason, note: f.note.value });
      closeModal(); toast(r.duplicate ? 'You already reported this. Thanks!' : 'Thanks — our team will review your report');
    }
  } catch (err) { btn.disabled = false; toast(err.message); }
}, true);
const REPORT_REASONS = [['spam', 'Spam'], ['abuse', 'Abuse or harassment'], ['nudity', 'Nudity or sexual content'], ['hate', 'Hate speech'], ['violence', 'Violence or threats'], ['misinformation', 'Misinformation'], ['other', 'Something else']];
function openReport(type, { id, username } = {}) {
  closeMenus();
  const what = type === 'post' ? 'post' : type === 'user' ? `@${username}` : 'message';
  openModal(`<div class="modal report-modal"><div class="modal-head"><button class="back" data-action="close-modal" aria-label="Close">${ic('close')}</button><h2>Report ${esc(what)}</h2></div>
    <form data-form="report" data-type="${type}" ${id ? `data-id="${esc(id)}"` : ''} ${username ? `data-username="${esc(username)}"` : ''}>
      <p class="muted" style="margin:4px 0 10px">Why are you reporting this ${type === 'user' ? 'account' : type}?</p>
      <div class="report-reasons" role="radiogroup">${REPORT_REASONS.map(([k, l]) => `<label class="rr"><input type="radio" name="reason" value="${k}"><span>${esc(l)}</span></label>`).join('')}</div>
      <div class="field"><label>Add details (optional)</label><textarea name="note" rows="3" maxlength="500"></textarea></div>
      <button class="btn btn-primary" type="submit" style="width:100%">Submit report</button></form></div>`);
}
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action="report"],[data-action="resolve-report"],[data-action="reports-filter"]'); if (!el) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (el.dataset.action === 'report') return openReport(el.dataset.type, { id: el.dataset.id, username: el.dataset.username });
  if (el.dataset.action === 'reports-filter') { reportsFilter = el.dataset.status; return loadReports(); }
  el.disabled = true;
  api('POST', `/api/admin/reports/${el.dataset.id}/resolve`).then(() => { toast('Marked resolved'); loadReports(); }).catch(err => { el.disabled = false; toast(err.message); });
}, true);
let reportsFilter = 'open';
async function loadReports() {
  const box = $('#admin-reports'); if (!box) return;
  try {
    const d = await api('GET', '/api/admin/reports?status=' + reportsFilter);
    const link = (r) => r.type === 'post' ? `<a class="link" href="/post/${r.target_id}" data-link>Post #${r.target_id}</a>`
      : r.type === 'user' ? `<a class="link" href="/u/${esc(r.target_username || '')}" data-link>@${esc(r.target_username || 'deleted')}</a>` : `Message #${r.target_id}`;
    box.innerHTML = `<div class="chart-head"><h2>Reports</h2><span class="stat-sub" data-open-reports="${d.open}">${num(d.open)} open</span>
      <span class="rep-tabs">${['open', 'resolved', 'all'].map(s => `<button class="pill${s === reportsFilter ? ' on' : ''}" data-action="reports-filter" data-status="${s}">${s}</button>`).join('')}</span></div>
      ${d.reports.length ? `<div class="table-wrap"><table class="admin-table reports-table"><thead><tr><th>Target</th><th>Reason</th><th>From</th><th>When (IST)</th><th></th></tr></thead><tbody>${d.reports.map(r => `
        <tr data-report="${r.id}"><td>${link(r)}${r.type !== 'user' && r.target_username ? ` <span class="h">by @${esc(r.target_username)}</span>` : ''}${r.snapshot ? `<div class="rep-snap">${esc(r.snapshot.slice(0, 140))}</div>` : ''}${r.total_for_target > 1 ? `<span class="pill">${r.total_for_target} reports</span>` : ''}</td>
        <td><b>${esc(r.reason_label)}</b>${r.note ? `<div class="rep-snap">${esc(r.note)}</div>` : ''}</td><td>@${esc(r.reporter)}</td><td class="t">${esc(istTime(r.created_at))}</td>
        <td>${r.status === 'open' ? `<button class="btn btn-outline" data-action="resolve-report" data-id="${r.id}">Resolve</button>` : '<span class="pill">resolved</span>'}</td></tr>`).join('')}</tbody></table></div>`
        : `<div class="stat-sub" style="padding:8px 0">No ${reportsFilter === 'all' ? '' : reportsFilter + ' '}reports.</div>`}`;
  } catch (e) { box.innerHTML = `<div class="stat-sub">Couldn’t load reports: ${esc(e.message)}</div>`; }
}

// ---------- Daily thought challenge (/challenge), ideal circles (/circle/:id), stories (home rings + viewer) ----------
routes.push([/^\/challenge\/?$/, () => viewChallenge()]);
routes.push([/^\/circle\/([\w-]+)(?:\/(members))?\/?$/, (m) => viewCircle(m[1], m[2] || 'posts')]);

// ---------- probes: post kinds, evidence, predictions, calibration, AI librarian ----------
const PROBE_KINDS = { claim: ['📌', 'Claim'], prediction: ['🔮', 'Prediction'], question: ['❓', 'Question'], thought_experiment: ['🧪', 'Thought experiment'], challenge: ['⚔️', 'Challenge'] };
const CONN_REL = { supports: ['✅', 'Supports'], contradicts: ['⚡', 'Contradicts'], similar: ['🔗', 'Similar to'], testable: ['🧭', 'Testable because'] };
function probeSelHTML() {
  return `<button type="button" class="tool tool-probe" data-action="probe-toggle" title="Post kind: claim, prediction, question…" aria-label="Choose a post kind" aria-expanded="false">🧩</button>`;
}
function probeMoreHTML() {
  return `<div class="probe-edit" hidden>
    <label class="pk-lab">Kind <select name="kind" class="pk-sel" aria-label="Post kind"><option value="normal">Normal post</option>${Object.entries(PROBE_KINDS).map(([k, [i, l]]) => `<option value="${k}">${i} ${l}</option>`).join('')}</select></label>
    <div class="pk-more" hidden>
      <div class="pk-evs">${[1, 2, 3].map(n => `<input class="pk-ev" type="url" inputmode="url" maxlength="300" placeholder="Evidence link ${n} (optional)" autocomplete="off"${n > 1 ? ' hidden' : ''}>`).join('')}</div>
      <label class="pk-by" hidden>Resolve by <input type="date" class="pk-date"></label>
    </div></div>`;
}
function probeAppend(f, fd) {
  const k = f.kind && f.kind.value; if (!k || k === 'normal') return;
  fd.append('kind', k);
  const ev = $$('.pk-ev', f).map(i => i.value.trim()).filter(Boolean);
  if (ev.length) fd.append('evidence', JSON.stringify(ev));
  const d = $('.pk-date', f);
  if (k === 'prediction' && d && d.value) fd.append('resolve_by', String(new Date(d.value + 'T23:59:59').getTime()));
}
function probeReset(f) {
  const sel = f.kind; if (!sel || !sel.classList || !sel.classList.contains('pk-sel')) return;
  sel.value = 'normal'; $('.probe-edit', f).hidden = true; const tb = $('.tool-probe', f); if (tb) tb.setAttribute('aria-expanded', 'false'); $$('.pk-ev', f).forEach((i, n) => { i.value = ''; i.hidden = n > 0; }); const d = $('.pk-date', f); if (d) d.value = '';
  probeSync(f);
}
function probeSync(f) {
  const sel = $('.pk-sel', f); if (!sel) return;
  const k = sel.value, more = $('.pk-more', f); if (!more) return;
  more.hidden = k === 'normal'; $('.pk-by', f).hidden = k !== 'prediction';
  const evs = $$('.pk-ev', f); evs.forEach((i, n) => { if (n > 0 && !evs[n - 1].value.trim() && !i.value.trim()) i.hidden = true; else i.hidden = false; });
}
document.addEventListener('input', (e) => { const f = e.target.closest && e.target.closest('form[data-form="compose"]'); if (f && e.target.closest('.probe-edit')) probeSync(f); });
document.addEventListener('change', (e) => { const f = e.target.closest && e.target.closest('form[data-form="compose"]'); if (f && e.target.closest('.probe-edit')) probeSync(f); });
function probeChip(p) {
  const k = PROBE_KINDS[p.kind]; if (!k) return '';
  return `<span class="probe-chip pk-${esc(p.kind)}" data-kind="${esc(p.kind)}">${k[0]} ${k[1]}</span>`;
}
const safeHref = (u) => /^https?:\/\//i.test(u) ? u : '#';
function probeHTML(p) {
  if (!PROBE_KINDS[p.kind]) return '';
  const ev = (p.evidence || []).map(u => { let host = u; try { host = new URL(u).hostname.replace(/^www\./, ''); } catch {} return `<a class="pk-link" href="${esc(safeHref(u))}" target="_blank" rel="noopener noreferrer nofollow ugc" title="${esc(u)}">🔗 ${esc(host)}</a>`; }).join('');
  let status = '';
  if (p.kind === 'prediction') {
    const mine = state.me && p.user_id === state.me.id;
    if (p.outcome) status = `<span class="pk-out ${p.outcome === 'true' ? 'yes' : 'no'}">${p.outcome === 'true' ? '✅ Came true' : '❌ Didn’t come true'}</span>`;
    else {
      const due = p.resolve_by ? Date.now() >= p.resolve_by : false;
      status = `<span class="pk-by-chip${due ? ' due' : ''}">${p.resolve_by ? (due ? '⏰ Due ' : '⏳ Resolve by ') + new Date(p.resolve_by).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '⏳ Open'}</span>`;
      if (mine) status += `<button class="pk-btn yes" data-action="probe-resolve" data-id="${p.id}" data-outcome="true">Came true</button><button class="pk-btn no" data-action="probe-resolve" data-id="${p.id}" data-outcome="false">Didn’t</button>`;
    }
  }
  const conn = state.config.ai && ['claim', 'prediction', 'question'].includes(p.kind) ? `<button class="pk-btn conn" data-action="probe-connections" data-id="${p.id}">🕸️ Connections</button>` : '';
  if (!ev && !status && !conn) return '';
  return `<div class="probe" data-probe="${p.id}">${ev}${status}${conn}</div><div class="conn-box" data-conn="${p.id}" hidden></div>`;
}
function probeRefresh(post) {
  if (!post) return;
  postCache.set(post.id, { ...(postCache.get(post.id) || {}), ...post });
  const merged = postCache.get(post.id);
  $$(`[data-probe="${post.id}"]`).forEach(el => { el.outerHTML = probeHTML(merged).replace(/<div class="conn-box"[\s\S]*$/, ''); });
}
function connHTML(r) {
  if (!r.links.length) return `<div class="conn-empty">No strong connections yet. As more people post, the librarian will find them.</div>`;
  return `<div class="conn-title">🕸️ Connections</div>` + r.links.map(l => { const [i, lab] = CONN_REL[l.relation] || ['🔗', l.relation];
    return `<div class="conn-item"><span class="conn-rel ${esc(l.relation)}">${i} ${lab}</span> ${l.post ? `<a href="/post/${l.post.id}" data-link>@${esc(l.post.username)}: “${esc(l.post.text)}”</a>` : ''}<div class="conn-why">${esc(l.reason)}</div></div>`; }).join('') + `<div class="conn-note">Suggested by AI. Check it yourself.</div>`;
}
async function probeConnections(id, btn) {
  const box = $(`[data-conn="${id}"]`); if (!box) return;
  if (!box.hidden && box.dataset.loaded) { box.hidden = true; return; }
  box.hidden = false; box.innerHTML = '<div class="conn-empty">The librarian is looking…</div>'; btn.disabled = true;
  try { const r = await api('POST', `/api/posts/${id}/connections`); box.innerHTML = connHTML(r); box.dataset.loaded = '1'; }
  catch (err) { box.innerHTML = `<div class="conn-empty">${esc(err.message)}</div>`; }
  finally { btn.disabled = false; }
}
async function probeResolve(id, outcome) {
  if (!confirm(outcome === 'true' ? 'Mark this prediction as having come true? This is final.' : 'Mark this prediction as NOT having come true? This is final.')) return;
  const r = await api('POST', `/api/posts/${id}/resolve`, { outcome });
  probeRefresh(r.post); toast(outcome === 'true' ? 'Marked as came true' : 'Marked as didn’t come true');
}
function calibrationHTML(c) {
  if (!c) return '';
  const tip = 'Calibration: the share of this person’s resolved predictions that came true';
  if (!c.resolved) return `<span class="calib new" title="${tip}"><b>New</b> Calibration · 0 resolved</span>`;
  return `<span class="calib${c.is_new ? ' new' : ''}" title="${tip}"><b>${c.score}%</b> Calibration · ${c.resolved} resolved${c.is_new ? ' <i class="calib-new">new</i>' : ''}</span>`;
}
function challengeChip(p) {
  if (!p.challenge) return '';
  return `<a class="challenge-chip" href="/challenge?day=${esc(p.challenge.day)}" data-link title="${esc(p.challenge.prompt)}">💭 Daily thought</a>`;
}
async function dailyLoad() {
  const el = $('#daily-banner'); if (!el) return;
  try {
    const d = await api('GET', '/api/challenge/today');
    if (!$('#daily-banner')) return;
    $('#daily-banner').innerHTML = `<div class="daily-banner" data-day="${esc(d.day)}"><div class="db-ic">💭</div><div class="db-body"><div class="db-k">Today’s thought</div><div class="db-q">${esc(d.prompt)}</div>
      <div class="db-meta">${d.count} answer${d.count === 1 ? '' : 's'} so far</div></div><div class="db-acts">${d.answered ? `<a class="btn btn-outline" href="/challenge" data-link>See answers</a>` : `<button class="btn btn-primary" data-action="daily-answer">Answer</button><a class="db-link" href="/challenge" data-link>See answers</a>`}</div></div>`;
  } catch { el.innerHTML = ''; }
}
function openDailyAnswer(prompt) {
  openModal(`<div class="modal"><div class="modal-head"><button class="back" data-action="close-modal" aria-label="Close">${ic('close')}</button><h2>Daily thought</h2></div>
    <div class="daily-q">💭 ${esc(prompt)}</div>
    ${composerHTML({ id: 'modal-composer', placeholder: 'Share your thought…', buttonLabel: 'Share', autofocus: true, challenge: true })}</div>`);
  $('#modal-composer textarea').focus();
}
async function viewChallenge() {
  const day = new URLSearchParams(location.search).get('day') || '';
  shell(`<div class="header"><div class="header-row"><button class="back" data-action="back" aria-label="Back">${ic('back')}</button><div><h1>Daily thought</h1><div class="sub" id="ch-day"></div></div></div></div><div id="challenge">${loader()}</div>`);
  try {
    const d = await api('GET', '/api/challenge' + (day ? '?day=' + encodeURIComponent(day) : ''));
    remember(d.items);
    const el = $('#challenge'); if (!el) return;
    $('#ch-day').textContent = new Date(d.day + 'T00:00:00Z').toLocaleDateString('en-IN', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
    const mine = d.items.some(x => x.user_id === state.me.id);
    const top = d.items.filter(x => x.featured), rest = d.items.filter(x => !x.featured);
    const medal = ['🥇', '🥈', '🥉'];
    el.innerHTML = `<div class="ch-prompt"><div class="db-k">${d.today ? 'Today’s prompt' : 'Prompt'}</div><div class="ch-q">${esc(d.prompt)}</div>
      ${d.today && !mine ? `<button class="btn btn-primary" data-action="daily-answer">Answer</button>` : ''}</div>
      ${top.length ? `<div class="section-title">Featured</div><div class="ch-featured">${top.map((p, i) => `<div class="ch-feat" data-rank="${i + 1}"><span class="ch-medal">${medal[i]}</span>${postHTML(p)}</div>`).join('')}</div>` : ''}
      ${rest.length ? `<div class="section-title">All answers</div>${rest.map(p => postHTML(p)).join('')}` : ''}
      ${d.items.length ? '' : `<div class="empty"><h3>No answers yet</h3><p>Be the first to share a thought.</p></div>`}`;
  } catch (err) { $('#challenge').innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
}
async function viewCircle(id, tab) {
  shell(`<div class="header"><div class="header-row"><button class="back" data-action="back" aria-label="Back">${ic('back')}</button><div><h1 id="cc-name">Circle</h1><div class="sub" id="cc-sub"></div></div></div></div><div id="circle">${loader()}</div>`);
  let d;
  try { d = await api('GET', '/api/circles/' + encodeURIComponent(id)); }
  catch (err) { $('#circle').innerHTML = `<div class="empty"><h3>Circle not found</h3><p>${esc(err.message)}</p></div>`; return; }
  const c = d.circle, el = $('#circle'); if (!el) return;
  $('#cc-name').textContent = c.name + ' circle';
  $('#cc-sub').textContent = `${c.member_count} member${c.member_count === 1 ? '' : 's'}`;
  const tabLink = (k, l) => `<a class="tab ${tab === k ? 'active' : ''}" href="/circle/${esc(c.id)}${k === 'posts' ? '' : '/' + k}" data-link>${l}</a>`;
  el.innerHTML = `<div class="circle-head" style="--c:${esc(c.color || '#1d9bf0')}"><div class="cc-dot"></div><div class="cc-body"><div class="cc-title">${esc(c.name)}</div>
      ${c.description ? `<div class="cc-desc">${esc(c.description)}</div>` : ''}<div class="chips">${qChips(c.qualities)}</div>
      <div class="cc-count" data-count="${c.member_count}">${c.member_count} member${c.member_count === 1 ? '' : 's'}</div></div>
      <button class="btn ${c.joined ? 'btn-outline' : 'btn-primary'}" data-action="circle-join" data-circle="${esc(c.id)}" data-joined="${c.joined ? 1 : 0}">${c.joined ? 'Leave' : 'Join'}</button></div>
    <div class="tabs" style="border-bottom:1px solid var(--border)">${tabLink('posts', 'Posts')}${tabLink('members', 'Members')}</div>
    <div id="feed">${tab === 'members' ? (d.members.length ? d.members.map(u => userRow(u)).join('') : `<div class="empty"><h3>No members yet</h3><p>Join to be the first.</p></div>`) : loader()}</div>`;
  if (tab !== 'members') loadFeed(`/api/circles/${encodeURIComponent(c.id)}/feed`, `<div class="empty"><h3>Nothing here yet</h3><p>Posts from circle members show up here.</p></div>`);
}

// Stories
const STICKERS = ['happy', 'funny', 'thoughtful', 'sad', 'angry'];
const sticker = (m, cls = '') => `<div class="momo story-sticker ${cls}" data-mood="${esc(m)}">${MOMO_SVG}</div>`;
const stories = { rings: [], viewer: null };
async function storiesLoad() {
  const bar = $('#stories-bar'); if (!bar) return;
  try { stories.rings = (await api('GET', '/api/stories')).rings; } catch { stories.rings = []; }
  if (!$('#stories-bar')) return;
  const mine = stories.rings.find(r => r.mine);
  const ringHTML = (r, i) => `<button class="story-ring${r.all_seen ? ' seen' : ''}" data-action="story-open" data-ring="${i}" aria-label="${esc(r.mine ? 'Your story' : r.user.name + '’s story')}"><span class="sr-av">${avatar(r.user)}</span><span class="sr-n">${r.mine ? 'Your story' : esc(r.user.username)}</span></button>`;
  $('#stories-bar').innerHTML = `${mine ? '' : `<button class="story-ring add" data-action="story-new" aria-label="Add to your story"><span class="sr-av">${avatar(state.me)}<span class="sr-plus">+</span></span><span class="sr-n">Your story</span></button>`}
    ${stories.rings.map(ringHTML).join('')}${mine ? `<button class="story-ring add small" data-action="story-new" aria-label="Add to your story"><span class="sr-av"><span class="sr-plus big">+</span></span><span class="sr-n">Add</span></button>` : ''}`;
}
function openStoryCreator() {
  openModal(`<div class="modal story-new"><div class="modal-head"><button class="back" data-action="close-modal" aria-label="Close">${ic('close')}</button><h2>New story</h2></div>
    <form data-form="story" class="sn-form">
      <div class="sn-stage" data-empty="1"><div class="sn-media"></div><div class="sn-caption" hidden></div><div class="sn-sticker"></div>
        <label class="sn-pick">${ic('image')}<span>Choose a photo${state.config.video ? ' or video' : ''}</span><input type="file" name="media" accept="image/png,image/jpeg,image/gif,image/webp${state.config.video ? ',video/*' : ''}" hidden></label></div>
      <div class="sn-status" aria-live="polite"></div>
      <div class="field"><label>Text on your story</label><input name="caption" maxlength="120" placeholder="Say something…" autocomplete="off"></div>
      <div class="sn-row"><label>Text position <input type="range" name="pos" min="0.1" max="0.9" step="0.05" value="0.5"></label></div>
      <div class="sn-stickers" role="radiogroup" aria-label="Momo sticker"><button type="button" class="sn-stk on" data-action="story-sticker" data-mood="">None</button>${STICKERS.map(m => `<button type="button" class="sn-stk" data-action="story-sticker" data-mood="${m}" title="${m}">${sticker(m, 'mini')}</button>`).join('')}</div>
      <button class="btn btn-primary" type="submit" style="width:100%" disabled>Share to story</button></form></div>`);
}
const storyDraft = new WeakMap();
function storyPreviewSync(f) {
  const st = $('.sn-stage', f), cap = f.caption.value.trim(), d = storyDraft.get(f) || {};
  const c = $('.sn-caption', st); c.hidden = !cap; c.textContent = cap; c.style.top = (f.pos.value * 100) + '%';
  $('.sn-sticker', st).innerHTML = d.sticker ? sticker(d.sticker) : '';
  $('button[type=submit]', f).disabled = !(d.file && (!d.isVideo || d.result)) || !!d.busy;
}
document.addEventListener('input', (e) => { const f = e.target.closest('form[data-form="story"]'); if (f && e.target.name !== 'media') storyPreviewSync(f); });
document.addEventListener('change', async (e) => {
  if (e.target.name !== 'media') return;
  const f = e.target.closest('form[data-form="story"]'); if (!f) return;
  const file = e.target.files[0]; if (!file) return;
  const d = storyDraft.get(f) || {}; storyDraft.set(f, d);
  const isVideo = /^video\//.test(file.type) || /\.(mp4|mov|webm|3gp|mkv)$/i.test(file.name);
  Object.assign(d, { file, isVideo, result: null, busy: false });
  const url = URL.createObjectURL(file);
  $('.sn-media', f).innerHTML = isVideo ? `<video src="${url}" muted autoplay loop playsinline></video>` : `<img src="${url}" alt="">`;
  $('.sn-stage', f).dataset.empty = '0';
  const status = $('.sn-status', f); status.textContent = '';
  if (isVideo) {
    d.busy = true; storyPreviewSync(f);
    try {
      const meta = await readVideoMeta(file).catch(() => ({}));
      if (meta.duration > 90.5) throw new Error('Story videos can be up to 90 seconds');
      const sig = await api('POST', '/api/video/sign');
      const ctl = {}; d.ctl = ctl;
      d.result = await uploadVideo(file, sig, (done, total) => { status.textContent = `Uploading… ${Math.round(done / total * 100)}%`; }, ctl);
      d.cloudName = sig.cloudName; status.textContent = 'Video ready';
    } catch (err) { status.textContent = err.message; d.file = null; }
    d.busy = false;
  }
  storyPreviewSync(f);
});
document.addEventListener('submit', async (e) => {
  const f = e.target; if (f.dataset.form !== 'story') return;
  e.preventDefault(); e.stopImmediatePropagation();
  const d = storyDraft.get(f) || {}; if (!d.file) return;
  const btn = $('button[type=submit]', f); btn.disabled = true;
  const fd = new FormData();
  if (d.isVideo) fd.append('video', JSON.stringify({ public_id: d.result.public_id, version: d.result.version, cloud_name: d.cloudName, duration: d.result.duration }));
  else fd.append('image', d.file);
  if (d.sticker) fd.append('sticker', d.sticker);
  fd.append('caption', f.caption.value.trim()); fd.append('caption_pos', f.pos.value);
  try { await api('POST', '/api/stories', fd); closeModal(); toast('Added to your story'); storiesLoad(); }
  catch (err) { toast(err.message); btn.disabled = false; }
}, true);

function storyOpen(ringIdx, storyIdx = null) {
  const r = stories.rings[ringIdx]; if (!r) return;
  if (storyIdx == null) { storyIdx = r.mine ? 0 : Math.max(0, r.stories.findIndex(s => !s.seen)); }
  storyClose(true);
  const el = document.createElement('div');
  el.className = 'story-viewer'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Story');
  document.body.appendChild(el); document.body.style.overflow = 'hidden';
  stories.viewer = { el, ring: ringIdx, idx: storyIdx, timer: null, start: 0, dur: 5000, paused: false };
  storyShow();
}
function storyShow() {
  const v = stories.viewer; if (!v) return;
  const r = stories.rings[v.ring], s = r.stories[v.idx];
  clearTimeout(v.timer); cancelAnimationFrame(v.raf);
  v.el.innerHTML = `<div class="sv-frame" data-story="${s.id}">
    <div class="sv-bars">${r.stories.map((x, i) => `<span class="sv-bar"><i style="width:${i < v.idx ? 100 : 0}%"></i></span>`).join('')}</div>
    <div class="sv-top">${avatar(r.user, 'sm')}<b>${esc(r.mine ? 'Your story' : r.user.name)}</b><span class="sv-ago">${ago(s.created_at)}</span>
      ${r.mine ? `<button class="sv-del" data-action="story-delete" aria-label="Delete story">${ic('trash') || '🗑'}</button>` : ''}<button class="sv-x" data-action="story-close" aria-label="Close">${ic('close')}</button></div>
    <div class="sv-media">${s.kind === 'video' ? `<video playsinline autoplay ${s.poster ? `poster="${esc(s.poster)}"` : ''}>${s.sources.map(x => `<source src="${esc(x.src)}"${x.type ? ` type="${x.type}"` : ''}>`).join('')}</video>` : `<img src="${esc(s.src)}" alt="">`}</div>
    ${s.caption ? `<div class="sv-caption" style="top:${(s.caption_pos ?? 0.5) * 100}%">${esc(s.caption)}</div>` : ''}
    ${s.sticker ? sticker(s.sticker, 'sv-sticker') : ''}
    <button class="sv-tap prev" data-action="story-prev" aria-label="Previous"></button><button class="sv-tap next" data-action="story-next" aria-label="Next"></button>
    ${r.mine ? `<button class="sv-views" data-action="story-viewers" data-id="${s.id}">👁 ${s.view_count || 0} view${s.view_count === 1 ? '' : 's'}</button>` : ''}
    <div class="sv-list" hidden></div></div>`;
  if (!r.mine && !s.seen) { s.seen = true; api('POST', `/api/stories/${s.id}/view`).catch(() => {}); if (r.stories.every(x => x.seen)) r.all_seen = true; }
  const vid = $('video', v.el);
  v.dur = 5000; v.start = performance.now(); v.elapsed = 0;
  if (vid) { vid.muted = false; vid.play().catch(() => { vid.muted = true; vid.play().catch(() => {}); }); vid.addEventListener('loadedmetadata', () => { if (vid.duration && isFinite(vid.duration)) v.dur = vid.duration * 1000; }); vid.addEventListener('ended', storyNext); }
  const bar = $$('.sv-bar i', v.el)[v.idx];
  const tick = () => {
    if (!stories.viewer || stories.viewer !== v) return;
    if (!v.paused) v.elapsed = vid ? vid.currentTime * 1000 : performance.now() - v.start;
    if (bar) bar.style.width = Math.min(100, v.elapsed / v.dur * 100) + '%';
    if (!vid && v.elapsed >= v.dur) return storyNext();
    v.raf = requestAnimationFrame(tick);
  };
  v.raf = requestAnimationFrame(tick);
}
function storyNext() {
  const v = stories.viewer; if (!v) return;
  const r = stories.rings[v.ring];
  if (v.idx < r.stories.length - 1) { v.idx++; return storyShow(); }
  if (v.ring < stories.rings.length - 1) { v.ring++; v.idx = stories.rings[v.ring].mine ? 0 : Math.max(0, stories.rings[v.ring].stories.findIndex(s => !s.seen)); return storyShow(); }
  storyClose();
}
function storyPrev() {
  const v = stories.viewer; if (!v) return;
  if (v.idx > 0) { v.idx--; return storyShow(); }
  if (v.ring > 0) { v.ring--; v.idx = stories.rings[v.ring].stories.length - 1; return storyShow(); }
  storyShow();
}
function storyClose(silent) {
  const v = stories.viewer; if (!v) return;
  cancelAnimationFrame(v.raf); v.el.remove(); stories.viewer = null; document.body.style.overflow = '';
  if (!silent) storiesLoad();
}
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action^="story-"],[data-action="daily-answer"],[data-action="circle-join"]'); if (!el) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const a = el.dataset.action;
  if (a === 'daily-answer') { try { const d = await api('GET', '/api/challenge/today'); if (d.answered) return toast('You already answered today’s thought'); openDailyAnswer(d.prompt); } catch (err) { toast(err.message); } }
  else if (a === 'circle-join') {
    el.disabled = true;
    try {
      const { circle: c } = await api(el.dataset.joined === '1' ? 'DELETE' : 'POST', `/api/circles/${el.dataset.circle}/join`);
      el.dataset.joined = c.joined ? '1' : '0'; el.textContent = c.joined ? 'Leave' : 'Join'; el.className = 'btn ' + (c.joined ? 'btn-outline' : 'btn-primary');
      const n = `${c.member_count} member${c.member_count === 1 ? '' : 's'}`; const cc = $('.cc-count'); if (cc) { cc.textContent = n; cc.dataset.count = c.member_count; } const sub = $('#cc-sub'); if (sub) sub.textContent = n;
      toast(c.joined ? `You joined the ${c.name} circle` : `You left the ${c.name} circle`);
      if (location.pathname.endsWith('/members') || $('#feed')) viewCircle(c.id, location.pathname.endsWith('/members') ? 'members' : 'posts');
    } catch (err) { toast(err.message); } finally { el.disabled = false; }
  }
  else if (a === 'story-new') openStoryCreator();
  else if (a === 'story-open') storyOpen(+el.dataset.ring);
  else if (a === 'story-next') storyNext();
  else if (a === 'story-prev') storyPrev();
  else if (a === 'story-close') storyClose();
  else if (a === 'story-sticker') {
    const f = el.closest('form'); const d = storyDraft.get(f) || {}; storyDraft.set(f, d);
    d.sticker = el.dataset.mood || null; $$('.sn-stk', f).forEach(b => b.classList.toggle('on', b === el)); storyPreviewSync(f);
  } else if (a === 'story-viewers') {
    const v = stories.viewer; if (!v) return;
    const list = $('.sv-list', v.el);
    if (!list.hidden) { list.hidden = true; v.paused = false; v.start = performance.now() - v.elapsed; return; }
    v.paused = true; $('video', v.el)?.pause();
    list.hidden = false; list.innerHTML = loader();
    try { const d = await api('GET', `/api/stories/${el.dataset.id}/viewers`); list.innerHTML = `<div class="sv-lh">Viewed by ${d.count}</div>` + (d.viewers.map(u => `<a class="sv-vu" href="/u/${esc(u.username)}" data-link>${avatar(u, 'sm')}<span>${esc(u.name)} <span class="h">@${esc(u.username)}</span></span></a>`).join('') || '<div class="h" style="padding:8px">No views yet</div>'); }
    catch (err) { list.textContent = err.message; }
  } else if (a === 'story-delete') {
    const v = stories.viewer; if (!v) return;
    const s = stories.rings[v.ring].stories[v.idx];
    if (!confirm('Delete this story?')) return;
    try { await api('DELETE', '/api/stories/' + s.id); toast('Story deleted'); storyClose(); } catch (err) { toast(err.message); }
  }
}, true);
document.addEventListener('keydown', (e) => {
  if (!stories.viewer) return;
  if (e.key === 'Escape') storyClose(); else if (e.key === 'ArrowRight') storyNext(); else if (e.key === 'ArrowLeft') storyPrev();
});
document.addEventListener('click', (e) => { if (stories.viewer && e.target.closest('.sv-vu')) storyClose(true); }, true);
addEventListener('popstate', () => storyClose(true));

// ---------- Password change, recovery code, email reset ----------
function emailStatus(a) {
  if (!a || !a.email) return 'Add an email so you can reset your password by email.';
  if (a.email_verified) return `${a.email} ✓ confirmed`;
  return `${a.email} — ${state.config.email ? 'check your inbox for the confirmation link.' : 'verification coming soon.'}`;
}
function showRecoveryCode(code, done, { title = 'Your new recovery code' } = {}) {
  const el = document.createElement('div'); el.className = 'modal-bg rec-modal'; el.setAttribute('role', 'dialog');
  el.innerHTML = `<div class="modal"><div class="modal-head"><h2>${esc(title)}</h2></div><div class="rec-body">
    <p>This code lets you reset your password if you forget it. <b>It’s shown only once</b>, so save it somewhere safe. Each code works one time.</p>
    <div class="rec-code" data-noi18n>${esc(code)}</div>
    <div class="rec-acts"><button class="btn btn-outline" data-rec="copy">Copy</button><button class="btn btn-outline" data-rec="download">Download</button></div>
    <label class="rec-ok"><input type="checkbox" data-rec="ok"> I’ve saved my recovery code</label>
    <button class="btn btn-primary" data-rec="done" disabled style="width:100%">Continue</button></div></div>`;
  document.body.appendChild(el); document.body.style.overflow = 'hidden';
  el.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-rec]'); if (!t) return;
    const k = t.dataset.rec;
    if (k === 'copy') { try { await navigator.clipboard.writeText(code); toast('Copied'); } catch { toast('Couldn’t copy. Select the code and copy it.'); } }
    else if (k === 'download') {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([`ZuZu recovery code${state.me ? ' for @' + state.me.username : ''}\n${code}\nKeep this safe. It works once.\n`], { type: 'text/plain' }));
      a.download = 'zuzu-recovery-code.txt'; document.body.appendChild(a); a.click(); a.remove();
    } else if (k === 'done') { el.remove(); document.body.style.overflow = ''; done && done(); }
  });
  el.addEventListener('change', (e) => { if (e.target.dataset.rec === 'ok') $('[data-rec="done"]', el).disabled = !e.target.checked; });
}
function viewForgot() {
  const em = state.config.email;
  $('#app').innerHTML = `<div class="auth"><div class="bigx"><div class="brand">${ic('z', '')}<span class="wordmark">ZuZu</span></div></div><div class="panel">
    <h1>Forgot password?</h1>
    <div class="tabs fp-tabs"><button class="tab active" data-fp="code">Recovery code</button>${em ? `<button class="tab" data-fp="email">Email link</button>` : ''}</div>
    <form data-form="forgot-code" autocomplete="off">
      <div class="field"><label>Username</label><input name="username" required autocapitalize="none" autocomplete="username"></div>
      <div class="field"><label>Recovery code</label><input name="code" required autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX" autocomplete="off"></div>
      <div class="field"><label>New password</label><input name="new_password" type="password" minlength="6" required autocomplete="new-password"></div>
      <button class="btn btn-light" type="submit">Reset password</button><div class="err" role="alert"></div></form>
    ${em ? `<form data-form="forgot-email" autocomplete="off" hidden>
      <div class="field"><label>Username or email</label><input name="login" required autocapitalize="none" autocomplete="username"></div>
      <button class="btn btn-light" type="submit">Send reset link to my email</button><div class="err" role="alert"></div></form>` : ''}
    <div class="alt"><a href="/login" data-link>Back to sign in</a></div></div></div>`;
}
function viewReset() {
  const token = new URLSearchParams(location.search).get('token') || '';
  $('#app').innerHTML = `<div class="auth"><div class="bigx"><div class="brand">${ic('z', '')}<span class="wordmark">ZuZu</span></div></div><div class="panel">
    <h1>Choose a new password</h1>
    <form data-form="reset-pw" data-token="${esc(token)}" autocomplete="off">
      <div class="field"><label>New password</label><input name="new_password" type="password" minlength="6" required autocomplete="new-password"></div>
      <button class="btn btn-light" type="submit">Set new password</button><div class="err" role="alert">${token ? '' : 'This reset link is missing its token.'}</div></form>
    <div class="alt"><a href="/forgot" data-link>Request a new link</a></div></div></div>`;
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-fp]'); if (t) {
    e.preventDefault(); $$('[data-fp]').forEach(b => b.classList.toggle('active', b === t));
    $('form[data-form="forgot-code"]').hidden = t.dataset.fp !== 'code'; const fe = $('form[data-form="forgot-email"]'); if (fe) fe.hidden = t.dataset.fp !== 'email';
    return;
  }
  if (e.target.closest('[data-action="rec-dismiss"]')) { e.preventDefault(); e.stopImmediatePropagation(); try { sessionStorage.setItem('zuzu.noRecBanner', '1'); } catch {} $('.rec-banner')?.remove(); }
}, true);
document.addEventListener('submit', async (e) => {
  const f = e.target, k = f.dataset && f.dataset.form;
  if (!['forgot-code', 'forgot-email', 'reset-pw', 'change-password', 'regen-code', 'set-email'].includes(k)) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const btn = $('button[type=submit]', f), err = $('.err', f); if (err) err.textContent = '';
  btn.disabled = true;
  const fail = (m) => { if (err) err.textContent = m; else toast(m); };
  try {
    if (k === 'forgot-code') {
      const r = await api('POST', '/api/password/recover', { username: f.username.value.trim(), code: f.code.value.trim(), new_password: f.new_password.value });
      state.me = r.user; await refreshMe();
      showRecoveryCode(r.recovery_code, () => { toast('Password updated'); go('/home', true); }, { title: 'Password reset. Here’s your new recovery code' });
    } else if (k === 'forgot-email') {
      const r = await api('POST', '/api/password/email', { login: f.login.value.trim() });
      f.innerHTML = `<p class="rec-sent">${esc(r.message)}</p>`;
    } else if (k === 'reset-pw') {
      const r = await api('POST', '/api/password/reset', { token: f.dataset.token, new_password: f.new_password.value });
      toast('Password updated. Please sign in.'); go('/login', true);
    } else if (k === 'change-password') {
      await api('POST', '/api/me/password', { current: f.current.value, new_password: f.new_password.value });
      f.reset(); toast('Password changed. Other devices were signed out.');
    } else if (k === 'regen-code') {
      const r = await api('POST', '/api/me/recovery-code', { password: f.password.value });
      f.reset(); await refreshMe();
      showRecoveryCode(r.recovery_code, () => viewSettings());
    } else if (k === 'set-email') {
      const r = await api('PUT', '/api/me/email', { email: f.email.value.trim() });
      state.me.account = r.account; $('#email-status').textContent = emailStatus(r.account);
      toast(f.email.value.trim() ? (r.sent ? 'Confirmation email sent' : 'Email saved') : 'Email removed');
    }
  } catch (ex) { fail(ex.message); }
  btn.disabled = false;
}, true);

async function loadConfig() {
  try { state.config = await api('GET', '/api/config'); } catch {}
}
Promise.all([refreshMe(), loadConfig()]).then(render);
})();
