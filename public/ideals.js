/* ZuZu "Choose your ideal": the quality colour palette and the preset ideals.
 * One file for both sides: the browser loads it as /ideals.js (window.ZUZU_IDEALS) and the
 * server require()s it (ideals.js at the repo root validates against it; GET /api/ideals serves it).
 * To edit: change a description, add/remove a preset (ids must stay stable once users have chosen them),
 * or tweak a colour. Every preset needs a `primary` quality key; `secondary` holds 0-2 more.
 */
(function (root) {
  'use strict';
  // One colour per core quality, all readable on the dark (#000) UI.
  const QUALITIES = [
    { key: 'wisdom',     label: 'Wisdom',      long: 'Wisdom & knowledge',     color: '#3B82F6' }, // deep blue
    { key: 'courage',    label: 'Courage',     long: 'Courage',                color: '#EF4444' }, // red
    { key: 'peace',      label: 'Peace',       long: 'Peace & non-violence',   color: '#E5E7EB' }, // soft white
    { key: 'compassion', label: 'Compassion',  long: 'Compassion & kindness',  color: '#EC4899' }, // pink
    { key: 'discipline', label: 'Discipline',  long: 'Discipline & hard work', color: '#F59E0B' }, // amber
    { key: 'creativity', label: 'Creativity',  long: 'Creativity',             color: '#A855F7' }, // purple
    { key: 'leadership', label: 'Leadership',  long: 'Leadership',             color: '#FACC15' }, // gold
    { key: 'devotion',   label: 'Devotion',    long: 'Devotion & spirituality', color: '#F97316' }, // saffron
    { key: 'justice',    label: 'Justice',     long: 'Justice & equality',     color: '#22C55E' }, // green
    { key: 'innovation', label: 'Innovation',  long: 'Innovation & science',   color: '#06B6D4' }, // cyan
  ];

  const PRESETS = [
    { id: 'kalam',        name: 'APJ Abdul Kalam',            desc: 'The Missile Man and People’s President who taught India to dream big.', primary: 'innovation', secondary: ['wisdom', 'discipline'] },
    { id: 'gandhi',       name: 'Mahatma Gandhi',             desc: 'Led India’s freedom struggle with truth and non-violence.',             primary: 'peace',      secondary: ['justice'] },
    { id: 'vivekananda',  name: 'Swami Vivekananda',          desc: 'Monk and thinker who carried Vedanta and self-belief to the world.',    primary: 'wisdom',     secondary: ['devotion'] },
    { id: 'bhagat_singh', name: 'Bhagat Singh',               desc: 'Fearless young revolutionary who gave his life for a free India.',      primary: 'courage',    secondary: ['justice'] },
    { id: 'ambedkar',     name: 'Dr B.R. Ambedkar',           desc: 'Architect of the Constitution and champion of equal rights.',            primary: 'justice',    secondary: ['wisdom'] },
    { id: 'lakshmibai',   name: 'Rani Lakshmibai',            desc: 'The warrior queen of Jhansi who led from the front in 1857.',            primary: 'courage',    secondary: ['leadership'] },
    { id: 'shivaji',      name: 'Chhatrapati Shivaji Maharaj', desc: 'Visionary king and strategist who founded the Maratha empire.',        primary: 'leadership', secondary: ['courage'] },
    { id: 'mother_teresa', name: 'Mother Teresa',             desc: 'Devoted her life to serving the poorest of the poor in Kolkata.',       primary: 'compassion', secondary: ['devotion'] },
    { id: 'ratan_tata',   name: 'Ratan Tata',                 desc: 'Industrialist known for ethical leadership and generous philanthropy.', primary: 'leadership', secondary: ['compassion'] },
    { id: 'sachin',       name: 'Sachin Tendulkar',           desc: 'The Master Blaster: 24 years of practice, focus and humility.',          primary: 'discipline', secondary: [] },
    { id: 'kalpana_chawla', name: 'Kalpana Chawla',           desc: 'First Indian-born woman in space; proof that dreams can reach orbit.',  primary: 'innovation', secondary: ['courage'] },
    { id: 'tagore',       name: 'Rabindranath Tagore',        desc: 'Nobel-winning poet, composer and painter; wrote Jana Gana Mana.',        primary: 'creativity', secondary: ['wisdom'] },
    { id: 'einstein',     name: 'Albert Einstein',            desc: 'Physicist whose curiosity and imagination reshaped our universe.',       primary: 'innovation', secondary: ['creativity'] },
  ];

  const CUSTOM_NAME_MAX = 40;
  const CUSTOM_QUALITIES_MAX = 3;
  const data = { QUALITIES, PRESETS, CUSTOM_NAME_MAX, CUSTOM_QUALITIES_MAX };
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.ZUZU_IDEALS = data;
})(typeof window !== 'undefined' ? window : globalThis);
