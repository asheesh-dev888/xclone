// ZuZu UI language switch: English / हिंदी / Hinglish.
// Whole-string translation of UI chrome (text nodes, placeholders, titles, aria-labels) after each render.
// User content (posts, bios, names, messages, inputs) is never touched. The same table ships in the Android app.
(function () {
  const T = {
    hi: {
      'Daily thought': 'आज का विचार', 'Today’s thought': 'आज का विचार', 'Answer': 'जवाब दें', 'See answers': 'जवाब देखें', 'Featured': 'चुनिंदा', 'All answers': 'सभी जवाब', 'Share': 'शेयर करें',
      'Your story': 'आपकी स्टोरी', 'New story': 'नई स्टोरी', 'Share to story': 'स्टोरी में शेयर करें', 'Join': 'जुड़ें', 'Leave': 'छोड़ें', 'Members': 'सदस्य', 'Add': 'जोड़ें',
      'Home': 'होम', 'Explore': 'खोजें', 'Reels': 'रील्स', 'Notifications': 'सूचनाएँ', 'Messages': 'संदेश', 'Profile': 'प्रोफ़ाइल', 'Admin': 'एडमिन', 'Settings': 'सेटिंग्स',
      'Post': 'पोस्ट', 'Posts': 'पोस्ट', 'Replies': 'जवाब', 'Media': 'मीडिया', 'Likes': 'पसंद', 'Reposts': 'रीपोस्ट', 'Followers': 'फ़ॉलोअर्स', 'Following': 'फ़ॉलो कर रहे हैं',
      'Follow': 'फ़ॉलो करें', 'Unfollow': 'अनफ़ॉलो करें', 'Follows you': 'आपको फ़ॉलो करता है', 'For you': 'आपके लिए', 'Reply': 'जवाब दें', 'Repost': 'रीपोस्ट', 'Like': 'पसंद', 'Share': 'शेयर करें',
      'Delete': 'हटाएँ', 'Cancel': 'रद्द करें', 'Save': 'सहेजें', 'Saved': 'सहेजा गया', 'Send': 'भेजें', 'Close': 'बंद करें', 'Back': 'वापस', 'More': 'और', 'Search': 'खोजें', 'Log out': 'लॉग आउट', 'Sign in': 'साइन इन', 'Sign up': 'साइन अप',
      'Edit profile': 'प्रोफ़ाइल बदलें', 'Message': 'संदेश', 'New message': 'नया संदेश', 'Start a new message': 'नया संदेश शुरू करें', 'Who to follow': 'किसे फ़ॉलो करें', 'Show Momo 🐒': 'मोमो दिखाएँ 🐒',
      'What’s happening': 'क्या चल रहा है', 'What’s happening?': 'क्या चल रहा है?', 'Post your reply': 'अपना जवाब पोस्ट करें', 'Search people and posts': 'लोग और पोस्ट खोजें', 'Search ZuZu': 'ZuZu पर खोजें',
      'Ask ZuZu AI': 'ZuZu AI से पूछें', 'Report': 'रिपोर्ट करें', 'Report post': 'पोस्ट रिपोर्ट करें', 'Report message': 'संदेश रिपोर्ट करें', 'Submit report': 'रिपोर्ट भेजें', 'Delete account': 'अकाउंट हटाएँ',
      'Delete my account': 'मेरा अकाउंट हटाएँ', 'Delete forever': 'हमेशा के लिए हटाएँ', 'Account': 'अकाउंट', 'Signed in as': 'साइन इन:', 'Loading…': 'लोड हो रहा है…', 'Nothing here yet': 'अभी यहाँ कुछ नहीं है',
      'Change ideal': 'आदर्श बदलें', 'Choose your ideal': 'अपना आदर्श चुनें', 'Language': 'भाषा', 'App language': 'ऐप की भाषा', 'AI language': 'AI की भाषा', 'Push notifications': 'पुश सूचनाएँ',
      'Turn on notifications': 'सूचनाएँ चालू करें', 'Turn off notifications': 'सूचनाएँ बंद करें', 'Same as the post': 'पोस्ट जैसी', 'Trends': 'ट्रेंड्स', 'Try again': 'फिर कोशिश करें', 'Seen': 'देखा गया',
      'Add photo': 'फ़ोटो जोड़ें', 'Add video': 'वीडियो जोड़ें', 'Remove media': 'मीडिया हटाएँ', 'Why are you reporting it?': 'आप इसे क्यों रिपोर्ट कर रहे हैं?', 'Add details (optional)': 'विवरण जोड़ें (वैकल्पिक)',
      'liked your post': 'ने आपकी पोस्ट पसंद की', 'replied to you': 'ने आपको जवाब दिया', 'followed you': 'ने आपको फ़ॉलो किया', 'reposted your post': 'ने आपकी पोस्ट रीपोस्ट की', 'mentioned you': 'ने आपका ज़िक्र किया',
      'Welcome to your inbox!': 'आपके इनबॉक्स में स्वागत है!', 'Happening now': 'अभी चल रहा है', 'Join ZuZu today.': 'आज ही ZuZu से जुड़ें।', 'View profile': 'प्रोफ़ाइल देखें', 'Open in Reels': 'रील्स में खोलें',
    },
    hinglish: {
      'Daily thought': 'Aaj ka thought', 'Today’s thought': 'Aaj ka thought', 'Answer': 'Jawab do', 'See answers': 'Jawab dekho', 'All answers': 'Saare jawab',
      'Your story': 'Tumhari story', 'New story': 'Nayi story', 'Share to story': 'Story pe share karo', 'Join': 'Join karo', 'Leave': 'Chhodo',
      'Home': 'Home', 'Explore': 'Explore karo', 'Notifications': 'Notifications', 'Messages': 'Messages', 'Settings': 'Settings',
      'Posts': 'Posts', 'Replies': 'Jawab', 'Likes': 'Likes', 'Followers': 'Followers', 'Following': 'Following',
      'Follow': 'Follow karo', 'Unfollow': 'Unfollow karo', 'Follows you': 'Aapko follow karta hai', 'For you': 'Aapke liye', 'Reply': 'Jawab do', 'Share': 'Share karo',
      'Delete': 'Hatao', 'Cancel': 'Rehne do', 'Save': 'Save karo', 'Saved': 'Save ho gaya', 'Send': 'Bhejo', 'Close': 'Band karo', 'Back': 'Wapas', 'More': 'Aur', 'Search': 'Dhoondo', 'Log out': 'Log out', 'Sign in': 'Sign in', 'Sign up': 'Sign up',
      'Edit profile': 'Profile badlo', 'New message': 'Naya message', 'Start a new message': 'Naya message shuru karo', 'Who to follow': 'Kisko follow karein', 'Show Momo 🐒': 'Momo dikhao 🐒',
      'What’s happening': 'Kya chal raha hai', 'What’s happening?': 'Kya chal raha hai?', 'Post your reply': 'Apna jawab post karo', 'Search people and posts': 'Log aur posts dhoondo', 'Search ZuZu': 'ZuZu pe dhoondo',
      'Ask ZuZu AI': 'ZuZu AI se poocho', 'Report': 'Report karo', 'Report post': 'Post report karo', 'Report message': 'Message report karo', 'Submit report': 'Report bhejo', 'Delete account': 'Account hatao',
      'Delete my account': 'Mera account hatao', 'Delete forever': 'Hamesha ke liye hatao', 'Signed in as': 'Signed in:', 'Loading…': 'Load ho raha hai…', 'Nothing here yet': 'Abhi yahan kuch nahi hai',
      'Change ideal': 'Ideal badlo', 'Choose your ideal': 'Apna ideal chuno', 'Language': 'Bhasha', 'App language': 'App ki bhasha', 'AI language': 'AI ki bhasha', 'Push notifications': 'Push notifications',
      'Turn on notifications': 'Notifications chalu karo', 'Turn off notifications': 'Notifications band karo', 'Same as the post': 'Post jaisi', 'Try again': 'Phir try karo', 'Seen': 'Dekh liya',
      'Add photo': 'Photo daalo', 'Add video': 'Video daalo', 'Remove media': 'Media hatao', 'Why are you reporting it?': 'Aap ise kyun report kar rahe ho?', 'Add details (optional)': 'Details likho (optional)',
      'liked your post': 'ne aapki post like ki', 'replied to you': 'ne aapko jawab diya', 'followed you': 'ne aapko follow kiya', 'reposted your post': 'ne aapki post repost ki', 'mentioned you': 'ne aapko mention kiya',
      'Welcome to your inbox!': 'Aapke inbox mein swagat hai!', 'Happening now': 'Abhi chal raha hai', 'Join ZuZu today.': 'Aaj hi ZuZu join karo.', 'View profile': 'Profile dekho', 'Open in Reels': 'Reels mein kholo',
    },
  };
  const SKIP = '.text, .bio, .msg, .snippet, .bubble, .momo, .name, .handle, .who, [data-noi18n], input, textarea, script, style';
  const ATTRS = ['placeholder', 'title', 'aria-label'];
  let lang = 'en';
  try { lang = localStorage.getItem('zuzu-lang') || 'en'; } catch {}
  const orig = new WeakMap(); // text node -> original English
  const tr = (s) => { const d = T[lang]; if (!d) return null; const k = s.trim(); return d[k] ? s.replace(k, d[k]) : null; };
  function apply(root) {
    if (!root || lang === 'en' && !root.__zuzuTranslated) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const p = n.parentElement; if (!p || p.closest(SKIP)) continue;
      const en = orig.has(n) ? orig.get(n) : n.nodeValue;
      const out = lang === 'en' ? en : tr(en);
      if (out != null && out !== n.nodeValue) { orig.set(n, en); n.nodeValue = out; }
    }
    const els = root.querySelectorAll ? root.querySelectorAll('[placeholder],[title],[aria-label]') : [];
    for (const el of els) {
      if (el.closest('.momo, [data-noi18n]')) continue;
      for (const a of ATTRS) {
        if (!el.hasAttribute(a)) continue;
        const key = 'i18n' + a.replace(/-./, (m) => m[1].toUpperCase());
        const en = el.dataset[key] || el.getAttribute(a);
        const out = lang === 'en' ? en : tr(en);
        if (out != null && out !== el.getAttribute(a)) { el.dataset[key] = en; el.setAttribute(a, out); }
      }
    }
    root.__zuzuTranslated = lang !== 'en';
  }
  let pending = false;
  const mo = new MutationObserver(() => { if (lang === 'en' || pending) return; pending = true; queueMicrotask(() => { pending = false; mo.takeRecords(); apply(document.body); mo.takeRecords(); }); });
  function set(l) {
    lang = T[l] || l === 'en' ? l : 'en';
    try { localStorage.setItem('zuzu-lang', lang); } catch {}
    document.documentElement.lang = lang === 'hi' ? 'hi' : 'en';
    if (document.body) { document.body.__zuzuTranslated = true; apply(document.body); mo.takeRecords(); }
  }
  window.ZUZU_I18N = { table: T, set, get: () => lang, t: (s) => (lang !== 'en' && T[lang] && T[lang][s]) || s, apply: () => apply(document.body) };
  const start = () => { mo.observe(document.body, { childList: true, subtree: true, characterData: false }); if (lang !== 'en') set(lang); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
