// OWNER: Sonnet task S3. Pure function: Content -> semantic HTML string (no React, no DOM APIs).
import type { Content, Photo } from '../content/types';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const SITE = 'https://binasoy.kim';

// Intrinsic sizes of the generated webp files (full 1400w / thumb 480w).
const PHOTO_SIZES: Record<string, { w: number; h: number; tw: number; th: number }> = {
  'van-01': { w: 1400, h: 732, tw: 480, th: 251 },
  'van-02': { w: 1400, h: 977, tw: 480, th: 335 },
  'van-03': { w: 1400, h: 686, tw: 480, th: 235 },
  'van-04': { w: 1400, h: 959, tw: 480, th: 329 },
  'van-05': { w: 1400, h: 964, tw: 480, th: 331 },
  'van-06': { w: 1400, h: 953, tw: 480, th: 327 },
};

const isExternal = (h: string) => /^https?:/i.test(h);
const link = (href: string, label: string, cls = '') =>
  '<a' + (cls ? ' class="' + cls + '"' : '') + ' href="' + esc(href) + '"' +
  (isExternal(href) ? ' rel="noopener" target="_blank"' : '') + '>' + esc(label) + '</a>';

function figure(p: Photo): string {
  const s = PHOTO_SIZES[p.id];
  const thumb = p.src.replace(/\.webp$/, '-thumb.webp');
  const dims = s ? ' width="' + s.tw + '" height="' + s.th + '"' : '';
  return '<figure class="r-photo"><a href="' + esc(p.src) + '" target="_blank" rel="noopener">' +
    '<img src="' + esc(thumb) + '"' + dims + ' alt="' + esc(p.alt) + '" loading="lazy" decoding="async"></a>' +
    '<figcaption>' + esc(p.caption) + '</figcaption></figure>';
}

export function renderReader(c: Content): string {
  const p = c.profile;
  const featured = c.certs.filter((x) => x.featured);
  const others = c.certs.filter((x) => !x.featured);
  const resume = p.links.find((l) => l.kind === 'resume');
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

  return [
    '<div class="reader-prose">',
    '<a class="r-skip" href="#r-about">Skip to content</a>',
    '<header class="r-header">',
    '<p class="r-status"><span class="r-dot" aria-hidden="true"></span>' + esc(p.status) + ' · ' + esc(p.location) + '</p>',
    '<h1>' + esc(p.name) + '</h1>',
    '<p class="r-roles">' + p.roles.map((r) => '<span>' + esc(r) + '</span>').join('') + '</p>',
    '<p class="r-tagline">' + esc(p.tagline) + '</p>',
    '<nav class="r-links" aria-label="Links">' +
      p.links.map((l) => link(l.href, l.label, l.kind === 'resume' ? 'r-btn r-btn--primary' : 'r-btn')).join('') + '</nav>',
    '<p class="r-enter js-only"><a class="r-enter__link" href="/?3d" onclick="try{localStorage.removeItem(\'kb:mode\')}catch(e){}">Enter the van (3D) <span aria-hidden="true">→</span></a></p>',
    '</header>',

    '<section id="r-about" aria-labelledby="h-about"><h2 id="h-about">About</h2>',
    p.bio.map((b) => '<p>' + esc(b) + '</p>').join(''),
    '<dl class="r-stats">' + p.stats.map((s) => '<div><dt>' + esc(s.value) + '</dt><dd>' + esc(s.label) + '</dd></div>').join('') + '</dl>',
    '</section>',

    '<section aria-labelledby="h-exp"><h2 id="h-exp">Experience</h2><ol class="r-timeline">',
    c.experience.map((j) =>
      '<li><div class="r-when">' + esc(j.start) + ' – ' + esc(j.end) + '</div>' +
      '<h3>' + esc(j.role) + ' <span class="r-at">· ' + esc(j.company) + '</span></h3>' +
      (j.location ? '<p class="r-meta">' + esc(j.location) + '</p>' : '') +
      (j.summary ? '<p>' + esc(j.summary) + '</p>' : '') +
      (j.bullets.length ? '<ul>' + j.bullets.map((b) => '<li>' + esc(b) + '</li>').join('') + '</ul>' : '') + '</li>').join(''),
    '</ol></section>',

    '<section aria-labelledby="h-proj"><h2 id="h-proj">Projects</h2><div class="r-cards">',
    c.projects.map((x) =>
      '<article class="r-card"><h3>' + (x.href ? link(x.href, x.name) : esc(x.name)) + '</h3>' +
      (x.metric ? '<p class="r-metric">' + esc(x.metric) + '</p>' : '') +
      '<p class="r-card__tag">' + esc(x.tagline) + '</p><p>' + esc(x.description) + '</p>' +
      '<ul class="r-tags">' + x.tags.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul></article>').join(''),
    '</div></section>',

    '<section aria-labelledby="h-cert"><h2 id="h-cert">Certifications</h2><div class="r-cards">',
    featured.map((x) =>
      '<article class="r-card r-card--cert r-vendor-' + esc(x.vendor) + '"><p class="r-meta">' + esc(x.issuer) + '</p><h3>' + esc(x.name) + '</h3><p>' + esc(x.blurb) + '</p></article>').join(''),
    '</div>',
    others.length ? '<h3 class="r-sub">Also certified</h3><ul class="r-also">' +
      others.map((x) => '<li><strong>' + esc(x.name) + '</strong> <span>' + esc(x.issuer) + '</span></li>').join('') + '</ul>' : '',
    '</section>',

    '<section aria-labelledby="h-skills"><h2 id="h-skills">Skills</h2><div class="r-skills">',
    c.skills.map((g) => '<div><h3>' + esc(g.title) + '</h3><ul class="r-tags">' + g.items.map((i) => '<li>' + esc(i) + '</li>').join('') + '</ul></div>').join(''),
    '</div></section>',

    '<section aria-labelledby="h-van"><h2 id="h-van">The van</h2>',
    '<p>Away from the keyboard, ' + esc(p.shortName) + ' and ' + esc(p.partner) + ' spent their free time turning an ordinary minivan into a tiny, warm camper: a bed that folds out for a cosy night in, fairy lights, a laptop nook, and just enough room for a lake view at golden hour. It is the little home this site is set in.</p>',
    '<div class="r-gallery">' + c.photos.map(figure).join('') + '</div>',
    '</section>',

    '<footer class="r-footer" aria-labelledby="h-contact"><h2 id="h-contact">Say hello</h2>',
    '<p>' + esc(p.name) + ' · ' + esc(p.location) + ' · ' + esc(p.status) + '</p>',
    '<nav class="r-links" aria-label="Contact">' + p.links.map((l) => link(l.href, l.label, 'r-btn')).join('') + '</nav>',
    resume ? '' : '<p>' + link(p.resumePdf, 'Résumé (PDF)') + '</p>',
    '</footer>',
    '<script type="application/ld+json">' + ldJson + '</script>',
    '</div>',
  ].join('\n');
}
