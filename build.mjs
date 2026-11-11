// Static build: node build.mjs  ->  dist/
import { mkdirSync, writeFileSync, cpSync, rmSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, ROUTES, T, PAGES } from './src/content.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'dist');
const V = Date.now().toString(36);                       // cache-bust css/js
const today = new Date().toISOString().slice(0, 10);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const abs = p => SITE.origin + encodeURI(p);
// BASE=/Brighthouse builds a preview that lives under a sub-path (GitHub Pages project site).
// The preview is marked noindex; canonical URLs keep pointing at the real domain.
const BASE = (process.env.BASE || '').replace(/\/$/, '');
const rebase = s => !BASE ? s : s.replace(/\b(href|src)="\/(?!\/)/g, `$1="${BASE}/`).replace(/(srcset="|, |url\()\/assets\//g, `$1${BASE}/assets/`);
const ARTICLES = JSON.parse(readFileSync(join(here, 'src', 'articles.json'), 'utf8'));
let POSTIMG = {}; try { POSTIMG = JSON.parse(readFileSync(join(here, 'src', 'post-images.json'), 'utf8')); } catch {}
const postImg = a => (a.image && POSTIMG[a.image]) || null;
for (const a of ARTICLES) ROUTES['a' + a.id] = { [a.lang]: a.path, [a.lang === 'en' ? 'ar' : 'en']: a.alt || ROUTES.blog[a.lang === 'en' ? 'ar' : 'en'] };
const I = {
  arrow: '<svg class="arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10h12M11 5l5 5-5 5"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Z"/><path d="M9 8.6c-.3 3.4 2.9 6.6 6.4 6.4l1-1.5-2-1-1 .9c-1-.5-1.8-1.3-2.3-2.3l.9-1-1-2Z"/></svg>',
};
const waLink = `https://wa.me/${SITE.wa}`;

/* The logo's line tower, rebuilt so scroll can draw it. --f is the floor. */
function tower(alt, last = false) {
  const W = 360, base = 600, fh = 104, widths = [284, 284, 284, 224, 152];
  let y = base, g = '';
  widths.forEach((w, i) => {
    const x0 = (W - w) / 2, x1 = x0 + w, yt = y - fh;
    let s = `<path class="ln" pathLength="1" d="M${x0} ${y}V${yt}H${x1}V${y}"/>`;
    for (let k = 0; k < 4; k++) { const dx = 7 + k * 6; s += `<path class="ht" d="M${x0 + dx} ${yt + 8}V${y - 6}M${x1 - dx} ${yt + 8}V${y - 6}"/>`; }
    const n = i < 3 ? 4 : i === 3 ? 3 : 2, ww = 30, wh = 52, inner = w - 84, gap = n > 1 ? (inner - ww) / (n - 1) : 0;
    let wins = '', glow = '';
    for (let k = 0; k < n; k++) {
      const x = x0 + 42 + k * gap, door = i === 0 && (k === 1 || k === 2);
      if (door && k === 2) continue;
      const cls = last && i === 4 && k === n - 1 ? ' last' : '';
      const d = door
        ? `M${W / 2 - 24} ${y}V${yt + 40}a24 24 0 0 1 48 0V${y}Z`
        : `M${x} ${yt + 26 + wh}V${yt + 26 + 15}a15 15 0 0 1 ${ww} 0V${yt + 26 + wh}Z`;
      glow += `<path class="gl${cls}" d="${d}"/>`; wins += `<path class="wn${cls}" d="${d}"/>`;
    }
    if (i === 4) s += `<path class="ht" d="M${W / 2 - 18} ${yt}V${yt - 34}M${W / 2 - 6} ${yt}V${yt - 54}M${W / 2 + 6} ${yt}V${yt - 54}M${W / 2 + 18} ${yt}V${yt - 34}"/>`;
    g += `<g style="--f:${i}">${glow}${wins}${s}</g>`;
    y = yt;
  });
  return `<svg class="tower" viewBox="0 0 ${W} 620" role="img" aria-label="${esc(alt)}"><path class="gd" d="M6 ${base}H${W - 6}"/>${g}</svg>`;
}

function ld(lang, key, page, crumbs, faq, extra = []) {
  const t = T[lang], url = abs(ROUTES[key][lang]);
  const org = {
    '@type': 'RealEstateAgent', '@id': SITE.origin + '/#org', name: 'Bright House Real Estate', alternateName: 'برايت هاوس العقارية',
    url: SITE.origin + '/', logo: abs('/assets/img/logo-lockup.png'), image: abs('/assets/img/og.jpg'), telephone: SITE.phone,
    address: { '@type': 'PostalAddress', addressLocality: 'Jeddah', addressRegion: 'Makkah Province', addressCountry: 'SA' },
    areaServed: { '@type': 'City', name: 'Jeddah' }, knowsLanguage: ['ar', 'en'],
    openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'], opens: '10:00', closes: '22:00' }],
    contactPoint: { '@type': 'ContactPoint', telephone: SITE.phone, contactType: 'customer service', availableLanguage: ['Arabic', 'English'] },
    hasOfferCatalog: { '@type': 'OfferCatalog', name: lang === 'ar' ? 'خدمات إدارة العقارات' : 'Property services', itemListElement: ['pm', 'lm', 'mo', 'oa'].map(k => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: t.svc[k][0], url: abs(ROUTES[k][lang]) } })) },
  };
  const graph = [org,
    { '@type': 'WebSite', '@id': SITE.origin + '/#site', url: SITE.origin + '/', name: t.legal, inLanguage: ['ar', 'en'], publisher: { '@id': org['@id'] } },
    { '@type': page.schema || 'WebPage', '@id': url + '#page', url, name: page.title, description: page.desc, inLanguage: lang, isPartOf: { '@id': SITE.origin + '/#site' }, about: { '@id': org['@id'] }, dateModified: today },
  ];
  if (crumbs.length > 1) graph.push({ '@type': 'BreadcrumbList', itemListElement: crumbs.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: abs(u) })) });
  if (page.service) graph.push({ '@type': 'Service', name: t.svc[page.service][0], description: page.desc, url, serviceType: T.en.svc[page.service][0], provider: { '@id': org['@id'] }, areaServed: { '@type': 'City', name: 'Jeddah' } });
  if (faq && faq.length) graph.push({ '@type': 'FAQPage', '@id': url + '#faq', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/‎/g, '') } })) });
  graph.push(...extra);
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>`;
}

function head(lang, key, page, o = {}) {
  const t = T[lang], r = ROUTES[key];
  const fonts = lang === 'ar' ? ['readex-arabic'] : ['fraunces-latin', 'readex-latin'];
  return `<!doctype html>
<html lang="${lang}" dir="${t.dir}"${o.night ? ' data-night="always" class="night"' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.desc)}">
<link rel="canonical" href="${abs(r[lang])}">${BASE ? '\n<meta name="robots" content="noindex">' : ''}
${o.solo ? `<link rel="alternate" hreflang="${lang}" href="${abs(r[lang])}">` : `<link rel="alternate" hreflang="ar" href="${abs(r.ar)}">
<link rel="alternate" hreflang="en" href="${abs(r.en)}">
<link rel="alternate" hreflang="x-default" href="${abs(r.ar)}">`}
<meta property="og:type" content="${o.article ? 'article' : 'website'}">
<meta property="og:site_name" content="${esc(t.legal)}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.desc)}">
<meta property="og:url" content="${abs(r[lang])}">
<meta property="og:image" content="${abs(o.image || '/assets/img/og.jpg')}">
<meta property="og:locale" content="${t.locale}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="${o.ground || '#F7E8DD'}">
<meta name="geo.region" content="SA-02"><meta name="geo.placename" content="Jeddah">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<script>document.documentElement.classList.add("js")</script>
${fonts.map(f => `<link rel="preload" href="/assets/fonts/${f}.woff2" as="font" type="font/woff2" crossorigin>`).join('\n')}
${o.preload || ''}
<link rel="stylesheet" href="/assets/scrollcraft.css?v=${V}">
<link rel="stylesheet" href="/assets/site.css?v=${V}">
${ld(lang, key, page, o.crumbs || [], o.faq, o.ld)}
</head>
<body${o.ground ? ` style="--sc-canvas:${o.ground}"` : ''}>
<a class="skip" href="#main">${t.skip}</a>`;
}

function bar(lang, key, cta, navKey = key) {
  const t = T[lang], links = ['services', 'about', 'blog', 'contact'].map(k => `<a href="${ROUTES[k][lang]}"${k === navKey ? ' aria-current="page"' : ''}>${t.nav[k]}</a>`).join('');
  const other = `<a class="lang" href="${ROUTES[key][t.otherLang]}" lang="${t.otherLang}" hreflang="${t.otherLang}">${t.other}</a>`;
  return `<header class="bar">
  <a class="brand" href="${ROUTES.home[lang]}" aria-label="${esc(t.legal)}"><span class="brand__mark"></span><span class="brand__name">${t.brand}</span></a>
  <nav class="nav" aria-label="${t.menu}">${links}</nav>
  ${other}
  <a class="btn" href="${cta}">${t.cta}${I.arrow}</a>
  <button class="burger" aria-label="${t.menu}" aria-expanded="false" aria-controls="sheet"><span></span><span></span></button>
</header>
<div class="sheet" id="sheet">${links}${other}<a class="btn" href="${cta}">${t.cta}${I.arrow}</a></div>`;
}

function closeSection(lang, o = {}) {
  const t = T[lang], f = t.form;
  const data = { endpoint: SITE.endpoint, wa: SITE.wa, 'sent-title': f.sentTitle, 'sent-text': f.sentText, 'wa-title': f.waTitle, 'wa-text': f.waText, 'wa-hello': f.waHello, 'l-type': f.type, 'l-units': f.units, 'l-area': f.area, 'l-name': f.name };
  return `<section class="close" id="proposal"${o.ground ? ` data-ground="#0A2226"` : ''}>
  <div class="sc-wrap close__grid">
    <div class="close__bld">${tower(f.alt, true)}</div>
    <div>
      <h2 class="sc-display" data-sc-in>${f.h}</h2>
      <p class="close__lede" data-sc-in>${f.lede}</p>
      <form class="form" method="post" action="${esc(SITE.endpoint || '#proposal')}" ${Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')}>
        <fieldset><legend>${f.type}</legend><div class="chips">${f.types.map((x, i) => `<label class="chip"><input type="radio" name="type" value="${esc(x)}"${i === 0 ? ' checked' : ''}><span>${x}</span></label>`).join('')}</div></fieldset>
        <div class="row2">
          <label class="field"><span>${f.units}</span><select name="units"><option value="">${f.choose}</option>${f.unitOpts.map(x => `<option>${x}</option>`).join('')}</select></label>
          <label class="field"><span>${f.area}</span><input name="area" type="text" autocomplete="address-level3" placeholder="${esc(f.areaPh)}"></label>
        </div>
        <div class="row2">
          <label class="field"><span>${f.name}</span><input name="name" type="text" autocomplete="name" required><small class="err">${f.errName}</small></label>
          <label class="field"><span>${f.phone}</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" placeholder="05X XXX XXXX" required><small class="err">${f.errPhone}</small></label>
        </div>
        <label class="hp" aria-hidden="true">Company<input name="company" tabindex="-1" autocomplete="off"></label>
        <div class="form__send"><button class="btn" type="submit">${t.cta}${I.arrow}</button><a class="more" href="${waLink}" target="_blank" rel="noopener">${f.or}</a></div>
        <p class="form__note">${f.note.replace('{privacy}', ROUTES.privacy[lang])}</p>
        <noscript><p class="form__note">${f.noscript} <a href="${waLink}">WhatsApp</a> · <a href="tel:${SITE.phone}"><span class="ltr">${SITE.phoneShow}</span></a></p></noscript>
        <div class="form__done" role="status" tabindex="-1"><b></b><p></p></div>
      </form>
    </div>
  </div>
</section>`;
}

function footer(lang) {
  const t = T[lang], f = t.foot;
  return `<footer class="foot">
  <div class="sc-wrap">
    <div class="foot__grid">
      <div><div class="foot__logo" role="img" aria-label="${esc(t.legal)}"></div><p>${f.tag}</p></div>
      <div><h2>${f.services}</h2><ul>${['pm', 'lm', 'mo', 'oa'].map(k => `<li><a href="${ROUTES[k][lang]}">${t.svc[k][0]}</a></li>`).join('')}</ul></div>
      <div><h2>${f.company}</h2><ul><li><a href="${ROUTES.services[lang]}">${t.nav.services}</a></li><li><a href="${ROUTES.about[lang]}">${t.nav.about}</a></li><li><a href="${ROUTES.blog[lang]}">${t.nav.blog}</a></li><li><a href="${ROUTES.contact[lang]}">${t.nav.contact}</a></li><li><a href="${ROUTES.privacy[lang]}">${f.privacy}</a></li></ul></div>
      <div><h2>${f.contact}</h2><ul><li><a href="tel:${SITE.phone}"><span class="ltr">${SITE.phoneShow}</span></a></li><li><a href="${waLink}" target="_blank" rel="noopener">WhatsApp</a></li><li>${f.city}</li><li>${f.hours}</li></ul></div>
    </div>
    <div class="foot__base"><span>© ${new Date().getFullYear()} ${t.legal}. ${f.rights}</span><a class="foot__by" href="https://www.hnhmena.com" target="_blank" rel="noopener"><span>${lang === 'ar' ? 'الحضور الرقمي من هندسة وإدارة' : 'Digital presence engineered and managed by'}</span><img src="/assets/img/hh-technology-white.png" alt="H&amp;H Technology" width="500" height="178" loading="lazy" decoding="async"></a><a href="${ROUTES.home[t.otherLang]}" lang="${t.otherLang}">${t.other}</a></div>
  </div>
</footer>`;
}

const tail = (lang, cta) => `<div class="dock"><a class="btn" href="${cta}">${T[lang].cta}${I.arrow}</a><a class="btn btn--wa" href="${waLink}" target="_blank" rel="noopener" aria-label="WhatsApp">${I.wa}</a></div>
<script src="/assets/scrollcraft.js?v=${V}" defer></script>
<script src="/assets/site.js?v=${V}" defer></script>
</body>
</html>`;

const img = (name, w, alt, o = '') => `<img src="/assets/img/${name}-${w}.webp" alt="${esc(alt)}" loading="lazy" decoding="async" ${o}>`;
const faqBlock = faq => faq.map(([q, a]) => `<details class="qa"><summary><span>${q}</span><i aria-hidden="true"></i></summary><div class="qa__a"><p>${a}</p></div></details>`).join('\n');

function home(lang) {
  const t = T[lang], h = t.home, R = k => ROUTES[k][lang];
  const pre = `<link rel="preload" as="image" href="/assets/img/sky-2000.webp" imagesrcset="/assets/img/sky-1000.webp 1000w, /assets/img/sky-2000.webp 2000w" imagesizes="100vw" fetchpriority="high"><link rel="preload" as="image" href="/assets/img/roshan-d-2200.webp" imagesrcset="/assets/img/roshan-d-1300.webp 1300w, /assets/img/roshan-d-2200.webp 2200w" imagesizes="115vw" media="(min-width: 901px)"><link rel="preload" as="image" href="/assets/img/roshan-m-1000.webp" media="(max-width: 900px)">`;
  const cues = ['0.16 0.34 0.05 0.04', '0.31 0.48 0.04 0.04', '0.45 0.62 0.04 0.04', '0.59 0.76 0.04 0.04', '0.73 0.88 0.04 0.04'];
  return head(lang, 'home', h, { preload: pre, faq: h.faq, crumbs: [] }) + bar(lang, 'home', '#proposal') + `
<nav class="rail" aria-label="${t.railLabel}"><ol>${['dawn', 'morning', 'noon', 'afternoon', 'dusk', 'proposal'].map((id, i) => `<li><a href="#${id}"><span>${t.rail[i]}</span></a></li>`).join('')}</ol><i class="rail__sun" aria-hidden="true"></i></nav>
<main id="main">

<section class="hero" id="dawn" data-ground="#F7E8DD">
  <div class="hero__stage">
    <div class="hero__sky"><img src="/assets/img/sky-2000.webp" srcset="/assets/img/sky-1000.webp 1000w, /assets/img/sky-2000.webp 2000w" sizes="100vw" alt="" width="2000" height="1131" fetchpriority="high" decoding="async"></div>
    <div class="hero__glow"></div>
    <div class="hero__copy hero__load">
      <h1 class="sc-display">${h.h1}</h1>
      <p>${h.lede}</p>
      <div class="hero__cta"><a class="btn" href="#proposal">${t.cta}${I.arrow}</a><a class="more" href="${waLink}" target="_blank" rel="noopener">${t.wa}</a></div>
    </div>
    <div class="hero__bld">
      <img src="/assets/img/building-1100.webp" srcset="/assets/img/building-620.webp 620w, /assets/img/building-1100.webp 1100w" sizes="(max-width: 900px) 80vw, 40vw" alt="${lang === 'ar' ? 'مبنى سكني من الحجر الأبيض برواشين خشبية في جدة' : 'A white stone residential building with carved wooden roshan windows in Jeddah'}" width="1100" height="1307" decoding="async">
      ${h.calls.map((c, i) => `<span class="call call--${i + 1}" aria-hidden="true">${c}</span>`).join('')}
    </div>
    <div class="hero__haze"></div>
    <picture class="hero__roshan"><source media="(max-width: 900px)" srcset="/assets/img/roshan-m-1000.webp"><img src="/assets/img/roshan-d-2200.webp" srcset="/assets/img/roshan-d-1300.webp 1300w, /assets/img/roshan-d-2200.webp 2200w" sizes="115vw" alt="" decoding="async"></picture>
    <div class="hero__dim"></div>
    <div class="hero__floor"></div>
  </div>
</section>

<section class="morning day" id="morning" data-sc-act="pin" data-sc-span="2.5" data-ground="#F4EFE7">
  <div data-sc-stage>
    ${h.morning.map(([time, line], i) => `<div class="morning__line" data-sc-cue="${['0 0.30 0', '0.24 0.54', '0.48 0.78'][i]}"><span class="morning__t">${time}</span><p${i === 0 ? ' data-sc-kinetic="lines"' : ''}>${line}</p></div>`).join('\n    ')}
    <div class="morning__line morning__line--turn" data-sc-cue="0.72 1 0.3 0"><span class="morning__t"></span><p>${h.turn}</p></div>
  </div>
</section>

<section class="sc-section day" id="noon" data-sc-act="flow" data-ground="#FBF9F5">
  <div class="sc-wrap noon__grid">
    <div>
      <div class="sc-stack" data-sc-in data-sc-stagger="70"><h2 class="sc-display sc-display--lg">${h.noonH}</h2><p class="sc-lede">${h.noonP}</p></div>
      <ul class="svc" data-sc-stagger="60" data-sc-in>
        ${['pm', 'lm', 'mo', 'oa'].map(k => `<li><a href="${R(k)}"><h3>${t.svc[k][0]}</h3><p>${t.svc[k][1]}</p><span class="svc__go">${I.arrow}</span></a></li>`).join('\n        ')}
      </ul>
    </div>
    <div><figure class="noon__fig" data-sc-reveal="up" data-sc-reveal-at="0.08 0.42">${img('terrace', 720, h.noonAlt, 'width="720" height="1280" data-drift')}</figure><p class="cap">${h.noonCap}</p></div>
  </div>
</section>

<section class="walk day" id="afternoon" data-sc-act="pan" data-sc-span="3.4" data-ground="#F5EAD9">
  <div data-sc-stage>
    <div class="walk__rail" data-sc-pan="0.02">
      <div class="walk__lead"><h2 class="sc-display sc-display--lg">${h.walkH}</h2><p class="sc-body">${h.walkP}</p></div>
      ${h.walk.map(([f, name, line, alt]) => `<article class="walk__item"><div class="walk__ph">${img(f, f === 'tower' ? 640 : 720, alt, 'width="720" height="960"')}</div><h3>${name}</h3><p>${line}</p></article>`).join('\n      ')}
      <div class="walk__end"><p>${h.walkEnd}</p><a class="btn" href="#proposal">${t.cta}${I.arrow}</a></div>
    </div>
  </div>
</section>

<section class="sc-section day" data-ground="#F0DDC3">
  <div class="sc-wrap">
    <h2 class="sc-display sc-display--lg" data-sc-in>${h.stepsH}</h2>
    <ol class="steps" data-sc-in data-sc-stagger="80">${h.steps.map(([a, b]) => `<li><h3>${a}</h3><p>${b}</p></li>`).join('')}</ol>
    <div class="inbox">
      <div><figure class="inbox__fig">${img('albalad', 1200, h.inboxAlt, 'srcset="/assets/img/albalad-640.webp 640w, /assets/img/albalad-1200.webp 1200w" sizes="(max-width: 900px) 90vw, 38vw" width="1200" height="1798" data-drift')}</figure><p class="cap">${h.inboxCap}</p></div>
      <div><h2 class="sc-display sc-display--md" data-sc-in>${h.inboxH}</h2><ul class="ticks" data-sc-in data-sc-stagger="70">${h.inbox.map(([a, b]) => `<li><div><b>${a}</b><span>${b}</span></div></li>`).join('')}</ul></div>
    </div>
    <div class="faq" id="faq">
      <div class="faq__head" data-sc-in><h2 class="sc-display sc-display--md">${h.faqH}</h2><p class="sc-body">${h.faqP}</p></div>
      <div>${faqBlock(h.faq)}</div>
    </div>
  </div>
</section>

<section class="dusk" id="dusk" data-sc-act="pin" data-sc-span="4.6" data-ground="#F0DDC3">
  <div data-sc-stage>
    <div class="dusk__sky" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="dusk__stars" aria-hidden="true"></div>
    <div class="dusk__sun" aria-hidden="true"></div>
    <div class="dusk__grid">
      <div class="dusk__copy">
        <div class="dusk__line" data-sc-cue="0 0.09 0 0.05"><h2>${h.duskH}</h2></div>
        ${h.dusk.map(([a, b], i) => `<div class="dusk__line" data-sc-cue="${cues[i]}"><p class="big">${a}</p><p class="sm">${b}</p></div>`).join('\n        ')}
        <div class="dusk__line" data-sc-cue="0.85 1 0.05 0"><p class="big">${h.duskEnd}</p></div>
      </div>
      <div class="dusk__bld">${tower(t.form.alt)}</div>
    </div>
  </div>
</section>

${closeSection(lang, { ground: true })}
</main>
${footer(lang)}
${tail(lang, '#proposal')}`;
}

function inner(lang, key) {
  const t = T[lang], P = PAGES[key], p = P[lang], R = k => ROUTES[k][lang];
  const isSvc = !!P.service, crumbs = [[t.crumbHome, R('home')]];
  if (isSvc) crumbs.push([t.nav.services, R('services')]);
  crumbs.push([isSvc ? t.svc[key][0] : (t.nav[key] || t.foot.privacy), R(key)]);
  const cta = P.noForm ? R('contact') + '#proposal' : '#proposal';
  const sections = p.s.map(([hd, paras, list]) => `<section class="prose"><h2 class="sc-display" data-sc-in>${hd}</h2><div class="prose__body" data-sc-in>${paras.map(x => `<p>${x}</p>`).join('')}${list ? `<ul>${list.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}</div></section>`).join('\n');
  let extra = '';
  if (key === 'services') extra = `<ul class="svc" data-sc-in data-sc-stagger="60">${['pm', 'lm', 'mo', 'oa'].map(k => `<li><a href="${R(k)}"><h3>${t.svc[k][0]}</h3><p>${t.svc[k][1]}</p><span class="svc__go">${I.arrow}</span></a></li>`).join('')}</ul>`;
  if (isSvc) extra = `<section class="prose"><h2 class="sc-display">${t.related}</h2><ul class="svc" style="margin-top:0">${['pm', 'lm', 'mo', 'oa'].filter(k => k !== key).map(k => `<li><a href="${R(k)}"><h3>${t.svc[k][0]}</h3><p>${t.svc[k][1]}</p><span class="svc__go">${I.arrow}</span></a></li>`).join('')}</ul></section>`;
  if (key === 'contact') extra = `<dl class="contact-list" data-sc-in data-sc-stagger="60">
    <div><dt>${p.labels[0]}</dt><dd><a href="tel:${SITE.phone}"><span class="ltr">${SITE.phoneShow}</span></a></dd></div>
    <div><dt>${p.labels[1]}</dt><dd><a href="${waLink}" target="_blank" rel="noopener">${p.waText}</a></dd></div>
    <div><dt>${p.labels[2]}</dt><dd>${p.city}</dd></div>
    <div><dt>${p.labels[3]}</dt><dd>${p.hours}</dd></div></dl>`;
  const big = P.img === 'albalad' || P.img === 'corniche';
  return head(lang, key, { ...p, schema: P.schema, service: P.service }, { ground: P.ground, night: P.night, faq: p.faq, crumbs }) + bar(lang, key, cta, isSvc ? 'services' : key) + `
<main id="main"${P.night ? '' : ' class="day"'}>
  <div class="sc-wrap">
    <header class="page-hero">
      <nav aria-label="Breadcrumb"><ol class="crumbs">${crumbs.map(([n, u], i) => `<li>${i < crumbs.length - 1 ? `<a href="${u}">${n}</a>` : `<span aria-current="page">${n}</span>`}</li>`).join('')}</ol></nav>
      <div class="hero__load"><h1 class="sc-display">${p.h1}</h1><p class="sc-lede">${p.lede}</p>${P.noForm ? '' : `<div class="hero__cta"><a class="btn" href="${cta}">${t.cta}${I.arrow}</a><a class="more" href="${waLink}" target="_blank" rel="noopener">${t.wa}</a></div>`}</div>
    </header>
    ${P.img ? `<figure class="band" data-sc-in>${img(P.img, big ? 1200 : 720, p.alt, 'data-drift loading="eager"')}</figure>` : ''}
    ${key === 'services' || key === 'contact' ? extra : ''}
    <div style="padding-block: var(--sc-7)">${sections}${isSvc ? extra : ''}</div>
    ${p.faq.length ? `<div class="faq" style="margin-top:0;padding-bottom:var(--sc-section)"><div class="faq__head"><h2 class="sc-display sc-display--md">${t.faqTitle}</h2></div><div>${faqBlock(p.faq)}</div></div>` : ''}
  </div>
</main>
${P.noForm ? '' : closeSection(lang)}
${footer(lang)}
${tail(lang, cta)}`;
}

/* ---------------------------------------------------------------- insights -- */
const fmtDate = (iso, lang) => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Riyadh' }).format(new Date(iso));
const mins = a => Math.max(1, Math.round(a.words / (a.lang === 'ar' ? 180 : 200)));
const crumbNav = crumbs => `<nav aria-label="Breadcrumb"><ol class="crumbs">${crumbs.map(([n, u], i) => `<li>${i < crumbs.length - 1 ? `<a href="${u}">${n}</a>` : `<span aria-current="page">${n}</span>`}</li>`).join('')}</ol></nav>`;
const postRow = (a, lang) => `<li><a href="${a.path}"><time datetime="${a.published.slice(0, 10)}">${fmtDate(a.published, lang)}</time><h3>${esc(a.title)}</h3><p>${esc(a.desc)}</p><span class="svc__go">${I.arrow}</span></a></li>`;

function blogIndex(lang) {
  const t = T[lang], b = t.blog, list = ARTICLES.filter(a => a.lang === lang);
  const crumbs = [[t.crumbHome, ROUTES.home[lang]], [t.nav.blog, ROUTES.blog[lang]]];
  const extra = [{ '@type': 'ItemList', itemListElement: list.slice(0, 30).map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(a.path), name: a.title })) }];
  return head(lang, 'blog', { title: b.title, desc: b.desc, schema: 'CollectionPage' }, { ground: '#FBF9F5', crumbs, ld: extra }) + bar(lang, 'blog', '#proposal') + `
<main id="main" class="day">
  <div class="sc-wrap">
    <header class="page-hero">${crumbNav(crumbs)}
      <div class="hero__load"><h1 class="sc-display">${b.h1}</h1><p class="sc-lede">${b.lede}</p></div>
    </header>
    <div class="posts" data-posts data-step="24">
      <div class="posts__tools"><label class="field posts__search"><span class="vh">${b.search}</span><input type="search" placeholder="${esc(b.search)}" autocomplete="off"></label><p class="posts__count"><span data-count>${list.length}</span> ${b.count}</p></div>
      <ul class="svc posts__list">${list.map(a => postRow(a, lang)).join('\n')}</ul>
      <p class="posts__none" hidden>${b.none}</p>
      <p class="posts__more"><button class="btn btn--ghost" type="button">${b.more}</button></p>
    </div>
  </div>
</main>
${closeSection(lang)}
${footer(lang)}
${tail(lang, '#proposal')}`;
}

function article(a) {
  const lang = a.lang, t = T[lang], b = t.blog, key = 'a' + a.id;
  const crumbs = [[t.crumbHome, ROUTES.home[lang]], [t.nav.blog, ROUTES.blog[lang]], [a.title, a.path]];
  let n = 0; const toc = [];
  let body = a.body.replace(/<h2>(.*?)<\/h2>/g, (m, x) => { n++; toc.push([n, x.replace(/<[^>]+>/g, '')]); return `<h2 id="s${n}">${x}</h2>`; });
  body = body.replace(/<table>/g, '<div class="tablewrap"><table>').replace(/<\/table>/g, '</table></div>');
  const same = ARTICLES.filter(x => x.lang === lang), i = same.indexOf(a);
  const related = [same[i + 1], same[i + 2], same[i - 1], same[i + 3], same[i - 2]].filter(Boolean).slice(0, 3);
  const pic = postImg(a), picUrl = pic ? `/assets/img/posts/${pic.key}-1200.webp` : null;
  const post = { '@type': 'BlogPosting', '@id': abs(a.path) + '#article', headline: a.title.slice(0, 110), description: a.desc, datePublished: a.published, dateModified: a.modified, inLanguage: lang, wordCount: a.words,
    mainEntityOfPage: { '@id': abs(a.path) + '#page' }, author: { '@id': SITE.origin + '/#org' }, publisher: { '@id': SITE.origin + '/#org' }, image: abs(picUrl || '/assets/img/og.jpg'), ...(a.keywords.length ? { keywords: a.keywords.join(', ') } : {}) };
  const title = a.title.length > 48 ? a.title : `${a.title} | ${t.brand}`;
  const shortCrumbs = crumbs.slice(0, 2).concat([[a.title.length > 60 ? a.title.slice(0, 58) + '…' : a.title, a.path]]);
  return head(lang, key, { title, desc: a.desc }, { ground: '#F4EFE7', crumbs, ld: [post], solo: !a.alt, article: true, image: picUrl }) + bar(lang, key, '#proposal', 'blog') + `
<main id="main" class="day">
  <article class="sc-wrap post">
    <header class="page-hero post__hero">${crumbNav(shortCrumbs)}
      <div class="hero__load"><h1 class="sc-display">${esc(a.title)}</h1>
      <p class="post__meta"><time datetime="${a.published.slice(0, 10)}">${fmtDate(a.published, lang)}</time><span>${mins(a)} ${b.read}</span>${a.modified.slice(0, 10) !== a.published.slice(0, 10) ? `<span>${b.updated} <time datetime="${a.modified.slice(0, 10)}">${fmtDate(a.modified, lang)}</time></span>` : ''}</p></div>
    </header>
    ${pic ? `<figure class="band post__band"><img src="${picUrl}" srcset="/assets/img/posts/${pic.key}-480.webp 480w, ${picUrl} 1200w" sizes="(max-width: 900px) 92vw, 1200px" width="${pic.w}" height="${pic.h}" alt="${esc(a.title)}" decoding="async" data-drift></figure>` : ''}
    <div class="post__grid">
      <aside class="post__side">${toc.length > 2 ? `<nav aria-label="${esc(b.toc)}"><h2>${b.toc}</h2><ol>${toc.map(([k, x]) => `<li><a href="#s${k}">${x}</a></li>`).join('')}</ol></nav>` : ''}<p class="post__cta">${b.svcLine}<br><a class="more" href="#proposal">${t.cta}${I.arrow}</a></p></aside>
      <div class="post__body">${body}<p class="post__note">${b.note}</p></div>
    </div>
    <section class="post__more"><h2 class="sc-display sc-display--md">${b.related}</h2><ul class="svc posts__list">${related.map(x => postRow(x, lang)).join('')}</ul><p><a class="more" href="${ROUTES.blog[lang]}">${b.all}${I.arrow}</a></p></section>
  </article>
</main>
${closeSection(lang)}
${footer(lang)}
${tail(lang, '#proposal')}`;
}

/* ------------------------------------------------------------------ emit -- */
rmSync(out, { recursive: true, force: true });
const write = (route, html) => { const f = join(out, route, route.endsWith('/') ? 'index.html' : ''); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, rebase(html)); };
const urls = [];
for (const lang of ['ar', 'en']) {
  write(ROUTES.home[lang], home(lang)); urls.push('home');
  for (const key of Object.keys(PAGES)) write(ROUTES[key][lang], inner(lang, key));
  write(ROUTES.blog[lang], blogIndex(lang));
}
for (const a of ARTICLES) write(a.path, article(a));
const keys = ['home', ...Object.keys(PAGES), 'blog'];

cpSync(join(here, 'assets'), join(out, 'assets'), { recursive: true });
for (const f of ['site.css', 'site.js']) writeFileSync(join(out, 'assets', f), rebase(readFileSync(join(here, 'src', f), 'utf8')));
writeFileSync(join(out, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#0E2A2E"/><path d="M9 25V13M12.5 25V9M16 25V6M19.5 25V9M23 25V13" stroke="#F7E8DD" stroke-width="1.6" stroke-linecap="round"/><path d="M6 25.5h20" stroke="#7BD3BC" stroke-width="1.6" stroke-linecap="round"/></svg>`);

writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${keys.flatMap(k => ['ar', 'en'].map(l => `<url><loc>${abs(ROUTES[k][l])}</loc><lastmod>${today}</lastmod><xhtml:link rel="alternate" hreflang="ar" href="${abs(ROUTES[k].ar)}"/><xhtml:link rel="alternate" hreflang="en" href="${abs(ROUTES[k].en)}"/><xhtml:link rel="alternate" hreflang="x-default" href="${abs(ROUTES[k].ar)}"/></url>`)).join('\n')}
${ARTICLES.map(a => `<url><loc>${abs(a.path)}</loc><lastmod>${a.modified.slice(0, 10)}</lastmod>${a.alt ? `<xhtml:link rel="alternate" hreflang="${a.lang}" href="${abs(a.path)}"/><xhtml:link rel="alternate" hreflang="${a.lang === 'en' ? 'ar' : 'en'}" href="${abs(a.alt)}"/>` : ''}</url>`).join('\n')}
</urlset>
`);
writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE.origin}/sitemap.xml\n`);

const E = T.en, eh = E.home;
writeFileSync(join(out, 'llms.txt'), `# Bright House Real Estate (برايت هاوس العقارية)

> Bright House Real Estate is a property management company in Jeddah, Saudi Arabia. It manages residential and commercial property on behalf of owners: lease contracts, rent collection, tenant relations, maintenance, leasing and marketing, and owners' association management.

- Location: Jeddah, Saudi Arabia
- Phone and WhatsApp: ${SITE.phoneShow}
- Hours: 10:00 to 22:00, Saturday to Thursday. Closed Friday.
- Languages: Arabic, English
- Fees: quoted in a written proposal after a visit to the property. No published price list.

## Services
${['pm', 'lm', 'mo', 'oa'].map(k => `- [${E.svc[k][0]}](${abs(ROUTES[k].en)}): ${E.svc[k][1]}`).join('\n')}

## Pages
- [Home, English](${abs(ROUTES.home.en)})
- [Home, Arabic](${abs(ROUTES.home.ar)})
- [Services](${abs(ROUTES.services.en)})
- [About](${abs(ROUTES.about.en)})
- [Contact](${abs(ROUTES.contact.en)})
- [Insights, English](${abs(ROUTES.blog.en)}): ${ARTICLES.filter(a => a.lang === 'en').length} articles
- [Insights, Arabic](${abs(ROUTES.blog.ar)}): ${ARTICLES.filter(a => a.lang === 'ar').length} articles

## Recent articles
${ARTICLES.filter(a => a.lang === 'en').slice(0, 20).map(a => `- [${a.title}](${abs(a.path)}): ${a.desc}`).join('\n')}

## Questions and answers
${eh.faq.map(([q, a]) => `### ${q}\n${a}`).join('\n\n')}
`);
const AB = ROUTES.blog.ar, EB = ROUTES.blog.en;
writeFileSync(join(out, '_redirects'), [
  ['/en/tag/*', EB], ['/tag/*', AB], ['/en/category/*', EB], ['/category/*', AB], ['/en/author/*', EB], ['/author/*', AB],
  ['/en/blog/page/*', EB], [AB + 'page/*', AB], ['/en/home/', '/en/'], ['/reviews/', '/'], ['/shop/', '/'], ['/cart/', '/'], ['/my-account/', '/'],
  ['/checkout/*', '/'], ['/checkout-3/*', '/'], ['/about__trashed/', ROUTES.about.ar], ['/contact__trashed/', ROUTES.contact.ar], ['/products__trashed/', '/'],
].map(([a, b]) => `${encodeURI(a)} ${encodeURI(b)} 301`).join('\n') + '\n');
writeFileSync(join(out, '_headers'), `/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`);
writeFileSync(join(out, '404.html'), rebase(head('en', 'home', { title: 'Page not found | Bright House', desc: 'Page not found.' }, { ground: '#F4EFE7' }).replace('<link rel="canonical"', '<meta name="robots" content="noindex">\n<link rel="canonical"') + bar('en', 'home', ROUTES.contact.en, 'none') + `<main id="main" class="e404 day"><h1 class="sc-display sc-display--lg">${E.nf[0]}</h1><p class="sc-body" style="margin-inline:auto">${E.nf[1]}</p><p><a class="btn" href="/en/">${E.nf[2]}${I.arrow}</a> &nbsp; <a class="btn btn--ghost" href="/" lang="ar">الرئيسية</a></p></main>` + tail('en', ROUTES.contact.en)));
console.log('built', keys.length * 2 + ARTICLES.length, 'pages ->', out);
