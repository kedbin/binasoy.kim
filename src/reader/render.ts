// OWNER: render agent (READER task). Pure function: Content -> semantic HTML string (no React, no DOM APIs).
// The "Quick view": a one-page, JS-free portfolio styled as a golden-hour camp journal (see styles/reader.css).
import type { Content, Photo, Cert } from '../content/types';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const SITE = 'https://binasoy.kim';

// Intrinsic sizes of the generated webp files (full 1400w / thumb 480w).
export const PHOTO_SIZES: Record<string, { w: number; h: number; tw: number; th: number }> = {
  'van-01': { w: 1400, h: 732, tw: 480, th: 251 },
  'van-02': { w: 1400, h: 977, tw: 480, th: 335 },
  'van-03': { w: 1400, h: 686, tw: 480, th: 235 },
  'van-04': { w: 1400, h: 959, tw: 480, th: 329 },
  'van-05': { w: 1400, h: 964, tw: 480, th: 331 },
  'van-06': { w: 1400, h: 953, tw: 480, th: 327 },
};

/** Section ids + nav labels, in page order. */
const SECTIONS = [
  { id: 'r-about', label: 'About' },
  { id: 'r-experience', label: 'Experience' },
  { id: 'r-projects', label: 'Projects' },
  { id: 'r-skills', label: 'Certs & Skills' },
  { id: 'r-photos', label: 'Photos' },
  { id: 'r-contact', label: 'Contact' },
] as const;

const VENDOR_LABEL: Record<Cert['vendor'], string> = { gcp: 'GCP', azure: 'Azure', aws: 'AWS', 'google-ai': 'AI', other: 'Cert' };

const isExternal = (h: string) => /^https?:/i.test(h);
const ext = (href: string) => (isExternal(href) ? ' rel="noopener" target="_blank"' : '');
const link = (href: string, label: string, cls = '', extra = '') =>
  '<a' + (cls ? ' class="' + cls + '"' : '') + ' href="' + esc(href) + '"' + ext(href) + '>' + esc(label) + extra + '</a>';
const newTab = '<span class="r-sr"> (opens in a new tab)</span>';
const extLink = (href: string, label: string, cls = '') => link(href, label, cls, isExternal(href) ? newTab : '');

const ICONS: Record<string, string> = {
  github: '<path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.5-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.3 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2Z"/>',
  linkedin: '<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3V9.75Zm6.5 0h3.8v1.6h.05c.53-1 1.84-2.05 3.8-2.05 4.05 0 4.8 2.65 4.8 6.1V21h-4v-4.9c0-1.17-.02-2.68-1.63-2.68-1.64 0-1.9 1.28-1.9 2.6V21h-4V9.75Z"/>',
  email: '<path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 2.2V17h16V7.2l-8 5.3-8-5.3ZM5.4 7l6.6 4.4L18.6 7H5.4Z"/>',
  site: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 6h-2.9a15.6 15.6 0 0 0-1.3-3.6A8 8 0 0 1 18.9 8ZM12 4c.8 1.1 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.9 1.9-4ZM4.3 14a8.2 8.2 0 0 1 0-4h3.3a16.5 16.5 0 0 0 0 4H4.3Zm.8 2h2.9c.3 1.3.8 2.5 1.3 3.6A8 8 0 0 1 5.1 16ZM8 8H5.1a8 8 0 0 1 4.2-3.6C8.8 5.5 8.3 6.7 8 8Zm4 12c-.8-1.1-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.9-1.9 4Zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4Zm.4 5.6c.5-1.1 1-2.3 1.3-3.6h2.9a8 8 0 0 1-4.2 3.6Zm1.7-5.6a16.5 16.5 0 0 0 0-4h3.3a8.2 8.2 0 0 1 0 4h-3.3Z"/>',
  resume: '<path d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.5V9h5.5L13 3.5ZM8 13v2h8v-2H8Zm0 4v2h5v-2H8Z"/>',
};
const icon = (kind: string) => ICONS[kind] ? '<svg class="r-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICONS[kind] + '</svg>' : '';
const btn = (l: { href: string; label: string; kind: string }, cls: string) =>
  '<a class="' + cls + '" href="' + esc(l.href) + '"' + ext(l.href) + '>' + icon(l.kind) + '<span>' + esc(l.label) + '</span>' + (isExternal(l.href) ? newTab : '') + '</a>';

/** Decorative golden-hour lake: sky glow, sun, hills, pines, the van at the shore, water with a sun path. */
const HERO_ART = `<svg class="r-hero__art" viewBox="0 0 1440 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
<defs>
<radialGradient id="r-glow" cx="50%" cy="50%" r="50%"><stop offset="0" class="r-glow-a"/><stop offset="1" class="r-glow-b"/></radialGradient>
<linearGradient id="r-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="r-water-a"/><stop offset="1" class="r-water-b"/></linearGradient>
</defs>
<circle class="r-art-glow" cx="1060" cy="214" r="190" fill="url(#r-glow)"/>
<circle class="r-art-sun" cx="1060" cy="214" r="46"/>
<g class="r-art-stars"><circle cx="180" cy="60" r="1.6"/><circle cx="320" cy="120" r="1.2"/><circle cx="520" cy="44" r="1.8"/><circle cx="700" cy="96" r="1.2"/><circle cx="880" cy="40" r="1.5"/><circle cx="1240" cy="70" r="1.7"/><circle cx="1360" cy="130" r="1.2"/><circle cx="90" cy="150" r="1.3"/></g>
<path class="r-art-far" d="M0 250 Q120 200 260 228 T540 214 T820 236 T1100 206 T1440 232 V300 H0Z"/>
<path class="r-art-mid" d="M0 268 Q160 236 330 258 T660 250 T990 262 T1300 244 T1440 256 V300 H0Z"/>
<g class="r-art-pines">
<path d="M40 280 l14 -46 l14 46Z M86 282 l11 -36 l11 36Z M140 280 l16 -54 l16 54Z M210 282 l10 -32 l10 32Z M262 281 l13 -42 l13 42Z"/>
<path d="M1180 281 l12 -40 l12 40Z M1226 282 l15 -52 l15 52Z M1290 281 l11 -34 l11 34Z M1336 280 l16 -56 l16 56Z M1394 282 l12 -38 l12 38Z"/>
</g>
<g class="r-art-maples"><circle cx="118" cy="266" r="16"/><circle cx="236" cy="268" r="14"/><circle cx="1262" cy="266" r="15"/><circle cx="1372" cy="268" r="13"/></g>
<rect class="r-art-lake" x="0" y="282" width="1440" height="80" fill="url(#r-water)"/>
<g class="r-art-path"><rect x="1010" y="292" width="100" height="3" rx="1.5"/><rect x="1024" y="304" width="72" height="3" rx="1.5"/><rect x="1036" y="316" width="48" height="2.5" rx="1.25"/><rect x="1046" y="328" width="28" height="2" rx="1"/></g>
<path class="r-art-shore" d="M0 352 Q240 338 520 346 T1060 344 T1440 350 V420 H0Z"/>
<g class="r-art-van" transform="translate(300 297)">
<path class="r-art-gate" d="M6 6 L-26 -6 L-24 -10 L8 2Z"/>
<path class="r-art-vanbody" d="M0 46 V18 Q0 6 12 4 L42 0 H112 Q124 0 128 12 L134 32 V46Z"/>
<path class="r-art-vanglass" d="M46 6 H76 V20 H40Z M82 6 H108 Q116 6 119 14 L121 20 H82Z"/>
<rect class="r-art-vanin" x="2" y="10" width="32" height="28" rx="3"/>
<g class="r-art-bulbs"><circle cx="8" cy="15" r="1.6"/><circle cx="16" cy="13" r="1.6"/><circle cx="24" cy="14" r="1.6"/><circle cx="31" cy="13" r="1.6"/></g>
<circle class="r-art-tyre" cx="28" cy="46" r="8"/><circle class="r-art-tyre" cx="108" cy="46" r="8"/>
</g>
</svg>`;

function figure(p: Photo, i: number): string {
  const s = PHOTO_SIZES[p.id];
  const thumb = p.src.replace(/\.webp$/, '-thumb.webp');
  const dims = s ? ' width="' + s.tw + '" height="' + s.th + '"' : '';
  const srcset = s ? ' srcset="' + esc(thumb) + ' ' + s.tw + 'w, ' + esc(p.src) + ' ' + s.w + 'w" sizes="(min-width: 1120px) 340px, (min-width: 700px) 45vw, 92vw"' : '';
  return '<figure class="r-photo r-photo--' + ((i % 3) + 1) + '">' +
    '<img src="' + esc(thumb) + '"' + srcset + dims + ' alt="' + esc(p.alt) + '" loading="lazy" decoding="async">' +
    '<figcaption>' + esc(p.caption) + '</figcaption></figure>';
}

const sectionHead = (n: number, id: string, title: string) =>
  '<h2 id="' + id + '"><span class="r-num" aria-hidden="true">' + String(n).padStart(2, '0') + '</span>' + esc(title) + '</h2>';

export function renderReader(c: Content): string {
  const p = c.profile;
  const featured = c.certs.filter((x) => x.featured);
  const others = c.certs.filter((x) => !x.featured);
  const hasResume = p.links.some((l) => l.kind === 'resume');
  const heroLinks = hasResume ? p.links : [...p.links, { label: 'Résumé', href: p.resumePdf, kind: 'resume' as const }];
  const email = p.links.find((l) => l.kind === 'email');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.name,
    url: SITE,
    jobTitle: p.roles[0],
    description: p.tagline,
    address: { '@type': 'PostalAddress', addressLocality: p.location },
    sameAs: p.links.filter((l) => isExternal(l.href)).map((l) => l.href),
    hasCredential: c.certs.map((x) => ({ '@type': 'EducationalOccupationalCredential', name: x.name, recognizedBy: { '@type': 'Organization', name: x.issuer } })),
  };
  const ldJson = JSON.stringify(jsonLd).replace(/</g, '\\u003c');
  const enter3d = (cls: string, label: string) =>
    '<a class="' + cls + '" href="/?3d" onclick="try{localStorage.removeItem(\'kb:mode\')}catch(e){}">' + label + '</a>';

  return [
    '<div class="reader-prose">',
    '<a class="r-skip" href="#r-about">Skip to content</a>',

    // sticky mini nav
    '<nav class="r-nav" aria-label="Sections"><div class="r-wrap r-nav__in">',
    '<a class="r-brand" href="#r-top"><span class="r-brand__mark" aria-hidden="true">KB</span><span class="r-brand__name">' + esc(p.shortName) + '’s van camp</span><span class="r-sr">, back to top</span></a>',
    '<ul class="r-nav__list">' + SECTIONS.map((s) => '<li><a href="#' + s.id + '">' + esc(s.label) + '</a></li>').join('') + '</ul>',
    '<p class="r-nav__3d">' + enter3d('r-nav__3dlink', '3D <span aria-hidden="true">↗</span><span class="r-sr"> Enter the van in 3D</span>') + '</p>',
    '</div></nav>',

    // hero
    '<header class="r-hero" id="r-top">',
    HERO_ART,
    '<div class="r-wrap r-hero__in">',
    '<p class="r-status"><span class="r-dot" aria-hidden="true"></span>' + esc(p.status) + ' · ' + esc(p.location) + '</p>',
    '<h1>' + esc(p.name) + '</h1>',
    '<p class="r-roles">' + p.roles.map((r) => '<span>' + esc(r) + '</span>').join('') + '</p>',
    '<p class="r-tagline">' + esc(p.tagline) + '</p>',
    '<nav class="r-links" aria-label="Profile links">' +
      heroLinks.map((l) => btn(l, l.kind === 'resume' ? 'r-btn r-btn--primary' : 'r-btn')).join('') + '</nav>',
    '<p class="r-enter">' + enter3d('r-enter__link', 'Enter the van (3D) <span aria-hidden="true">→</span>') + '</p>',
    '</div>',
    '</header>',

    '<div class="r-wrap r-body">',

    '<section class="r-sec" aria-labelledby="r-about">' + sectionHead(1, 'r-about', 'About'),
    '<div class="r-about">',
    '<div class="r-about__text">' + p.bio.map((b) => '<p class="r-lede">' + esc(b) + '</p>').join('') + '</div>',
    '<dl class="r-stats">' + p.stats.map((s) => '<div><dt>' + esc(s.value) + '</dt><dd>' + esc(s.label) + '</dd></div>').join('') + '</dl>',
    '</div></section>',

    '<section class="r-sec" aria-labelledby="r-experience">' + sectionHead(2, 'r-experience', 'Experience') + '<ol class="r-timeline">',
    c.experience.map((j) =>
      '<li><p class="r-when"><span>' + esc(j.start) + '</span> – <span>' + esc(j.end) + '</span></p><div class="r-job">' +
      '<h3>' + esc(j.role) + ' <span class="r-at">· ' + esc(j.company) + '</span></h3>' +
      (j.location ? '<p class="r-meta">' + esc(j.location) + '</p>' : '') +
      (j.summary ? '<p>' + esc(j.summary) + '</p>' : '') +
      (j.bullets.length ? '<ul>' + j.bullets.map((b) => '<li>' + esc(b) + '</li>').join('') + '</ul>' : '') + '</div></li>').join(''),
    '</ol></section>',

    '<section class="r-sec" aria-labelledby="r-projects">' + sectionHead(3, 'r-projects', 'Projects') + '<div class="r-cards">',
    c.projects.map((x) =>
      '<article class="r-card"><h3>' + (x.href ? extLink(x.href, x.name) : esc(x.name)) + '</h3>' +
      (x.metric ? '<p class="r-metric">' + esc(x.metric) + '</p>' : '') +
      '<p class="r-card__tag">' + esc(x.tagline) + '</p><p>' + esc(x.description) + '</p>' +
      '<ul class="r-tags" aria-label="Tags">' + x.tags.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul></article>').join(''),
    '</div></section>',

    '<section class="r-sec" aria-labelledby="r-skills">' + sectionHead(4, 'r-skills', 'Certs & Skills'),
    '<ul class="r-badges" aria-label="Featured certifications">',
    featured.map((x) =>
      '<li class="r-badge r-vendor-' + esc(x.vendor) + '"><span class="r-badge__seal" aria-hidden="true">' + esc(VENDOR_LABEL[x.vendor]) + '</span>' +
      '<div><p class="r-badge__issuer">' + esc(x.issuer) + '</p><h3>' + esc(x.name) + '</h3><p class="r-badge__blurb">' + esc(x.blurb) + '</p></div></li>').join(''),
    '</ul>',
    others.length ? '<h3 class="r-sub">Also certified</h3><ul class="r-also">' +
      others.map((x) => '<li><strong>' + esc(x.name) + '</strong> <span>' + esc(x.issuer) + '</span></li>').join('') + '</ul>' : '',
    '<div class="r-skills">',
    c.skills.map((g) => '<div class="r-skill"><h3>' + esc(g.title) + '</h3><ul class="r-tags">' + g.items.map((i) => '<li>' + esc(i) + '</li>').join('') + '</ul></div>').join(''),
    '</div></section>',

    '<section class="r-sec" aria-labelledby="r-photos">' + sectionHead(5, 'r-photos', 'Photos from the van'),
    '<p class="r-lede">Away from the keyboard, ' + esc(p.shortName) + ' and ' + esc(p.partner) + ' spent their free time turning an ordinary minivan into a tiny, warm camper: a bed that folds out for a cosy night in, fairy lights, a laptop nook, and just enough room for a lake view at golden hour. It is the little home this site is set in.</p>',
    '<div class="r-gallery">' + c.photos.map(figure).join('') + '</div>',
    '</section>',

    '<section class="r-sec r-contact" aria-labelledby="r-contact">' + sectionHead(6, 'r-contact', 'Contact'),
    '<div class="r-contact__card">',
    '<p class="r-contact__lead">Say hello. ' + esc(p.shortName) + ' is ' + esc(p.status.toLowerCase()) + ' and based in ' + esc(p.location) + '.</p>',
    email ? '<p class="r-contact__mail">' + link(email.href, email.label, 'r-mail') + '</p>' : '',
    '<ul class="r-contact__links">' + heroLinks.filter((l) => l.kind !== 'email').map((l) => '<li>' + btn(l, 'r-btn') + '</li>').join('') + '</ul>',
    '</div></section>',

    '</div>',

    '<footer class="r-footer"><div class="r-wrap r-footer__in">',
    '<p>' + esc(p.name) + ' · ' + esc(p.location) + '</p>',
    '<p><a href="#r-top">Back to top <span aria-hidden="true">↑</span></a></p>',
    '</div></footer>',
    '<script type="application/ld+json">' + ldJson + '</script>',
    '</div>',
  ].join('\n');
}
