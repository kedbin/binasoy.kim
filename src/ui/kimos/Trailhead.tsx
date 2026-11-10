// Trailhead: KimOS's camp-themed browser. Tabs, history (Alt+←/→), an editable address bar, bookmarks,
// a new-tab page with a "Where to?" search over pages / projects / roles / certs / skills, and one page per
// portfolio section. Every fact comes from content.json.
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { content } from '../../content';
import { PAGES, pageOf, resolvePage } from './pages';
import type { PageId } from './pages';

const P = content.profile;
const VENDOR: Record<string, string> = { gcp: '#4285F4', azure: '#0078D4', aws: '#FF9900', 'google-ai': '#8E64D9', other: '#8FA3B8' };
const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const thumb = (s: string) => s.replace(/\.webp$/, '-thumb.webp');
const isExt = (h: string) => /^https?:/.test(h);
const MAX_TABS = 5;
const LOAD_MS = 260;

export interface TrailNav { page: PageId; n: number; anchor?: string }
interface Loc { page: PageId; anchor?: string; q?: string }
interface Tab { key: number; stack: Loc[]; i: number }
type Go = (page: PageId, anchor?: string, q?: string) => void;

function Ext({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return <a className={className} href={href} {...(isExt(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{children}</a>;
}
/** Page heading: receives focus after navigation so screen readers land on the new page. */
function H({ children }: { children: ReactNode }) { return <h2 data-heading tabIndex={-1}>{children}</h2>; }

// ------------------------------------------------------------------ search index
interface Hit { key: string; glyph: string; title: string; sub: string; hay: string; page?: PageId; anchor?: string; href?: string }
const INDEX: Hit[] = (() => {
  const out: Hit[] = [];
  const add = (h: Omit<Hit, 'hay'>, extra = '') => out.push({ ...h, hay: (h.title + ' ' + h.sub + ' ' + extra).toLowerCase() });
  for (const pg of PAGES) add({ key: 'page-' + pg.id, glyph: pg.glyph, title: pg.label, sub: 'Page · trail://kim/' + pg.path, page: pg.id }, pg.path);
  for (const pr of content.projects) add({ key: 'proj-' + pr.id, glyph: '🛠️', title: pr.name, sub: 'Project · ' + pr.tagline, page: 'projects', anchor: 'proj-' + pr.id }, pr.tags.join(' ') + ' ' + pr.description);
  for (const j of content.experience) add({ key: 'job-' + j.id, glyph: '🥾', title: j.role, sub: j.company + ' · ' + j.start + ' – ' + j.end, page: 'experience', anchor: 'job-' + j.id }, j.bullets.join(' '));
  for (const c of content.certs) add({ key: 'cert-' + c.id, glyph: '🏅', title: c.name, sub: 'Certification · ' + c.issuer, page: 'certs', anchor: 'cert-' + c.id }, c.blurb);
  for (const g of content.skills) for (const it of g.items) add({ key: 'skill-' + slug(g.title) + '-' + slug(it), glyph: '🧰', title: it, sub: 'Skill · ' + g.title, page: 'certs', anchor: 'skills-' + slug(g.title) });
  for (const l of P.links) if (isExt(l.href)) add({ key: 'link-' + l.href, glyph: '↗', title: l.label, sub: 'Link · ' + l.href.replace(/^https?:\/\//, ''), href: l.href });
  return out;
})();
function search(q: string): Hit[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const seen = new Set<string>();
  return INDEX.filter((h) => words.every((w) => h.hay.includes(w)))
    .sort((a, b) => Number(!a.title.toLowerCase().startsWith(words[0])) - Number(!b.title.toLowerCase().startsWith(words[0])))
    .filter((h) => { const k = h.title.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 7);
}

function WhereTo({ go, initial = '' }: { go: Go; initial?: string }) {
  const [q, setQ] = useState(initial);
  const [act, setAct] = useState(0);
  const id = useId();
  const hits = useMemo(() => search(q), [q]);
  useEffect(() => setAct(0), [q]);
  const choose = (h: Hit) => {
    if (h.href) { window.open(h.href, '_blank', 'noopener,noreferrer'); return; }
    if (h.page) go(h.page, h.anchor);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && hits.length) { e.preventDefault(); setAct((a) => (a + 1) % hits.length); }
    else if (e.key === 'ArrowUp' && hits.length) { e.preventDefault(); setAct((a) => (a - 1 + hits.length) % hits.length); }
    else if (e.key === 'Enter') { e.preventDefault(); const h = hits[act]; if (h) choose(h); else { const pg = resolvePage(q); if (pg) go(pg); } }
    else if (e.key === 'Escape' && q) { e.stopPropagation(); setQ(''); }
  };
  const open = q.trim() !== '';
  const hint = [content.skills[0]?.items[0], content.projects[0]?.name].filter(Boolean);
  return (
    <div className="kos-where">
      <label className="kos-where__box">
        <span aria-hidden="true" className="kos-where__ico">🔎</span>
        <span className="kos-sr">Where to? Search pages, projects, roles, certifications and skills</span>
        <input type="search" role="combobox" value={q} placeholder="Where to? Try a project, a skill, a cert…" autoComplete="off" spellCheck={false}
          aria-expanded={open && hits.length > 0} aria-controls={id + '-list'} aria-autocomplete="list"
          aria-activedescendant={open && hits.length ? `${id}-o${act}` : undefined}
          onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} />
      </label>
      {open && (
        <ul className="kos-where__list" role="listbox" id={id + '-list'} aria-label="Search results">
          {hits.map((h, i) => (
            <li key={h.key} id={`${id}-o${i}`} role="option" aria-selected={i === act} className={i === act ? 'is-on' : undefined}
              onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setAct(i)} onClick={() => choose(h)}>
              <span className="kos-where__g" aria-hidden="true">{h.glyph}</span>
              <span className="kos-where__t"><b>{h.title}</b><small>{h.sub}</small></span>
              <span className="kos-where__go" aria-hidden="true">{h.href ? '↗' : '↵'}</span>
            </li>))}
          {!hits.length && <li className="kos-where__none" role="option" aria-selected={false} aria-disabled>No trail matches “{q.trim()}”.{hint.length ? ` Try “${hint.join('” or “')}”.` : ''}</li>}
        </ul>)}
    </div>);
}

// ------------------------------------------------------------------ pages
function greeting(h: number) {
  if (h < 5) return { text: 'Still up? The stars are out', glyph: '🌌' };
  if (h < 12) return { text: 'Good morning, camper', glyph: '🌅' };
  if (h < 17) return { text: 'Good afternoon, camper', glyph: '☀️' };
  if (h < 21) return { text: 'Good evening, camper', glyph: '🌇' };
  return { text: 'Good night, camper', glyph: '🌙' };
}
const TILE_SUB: Record<Exclude<PageId, 'home'>, string> = {
  about: `${P.status} · ${P.location}`,
  experience: `${content.experience.length} stops on the trail`,
  projects: `${content.projects.length} projects`,
  certs: `${content.certs.length} badges · ${content.skills.length} skill packs`,
  resume: 'PDF · download',
};

function HomePage({ go, q }: { go: Go; q?: string }) {
  const g = greeting(new Date().getHours());
  return (<article className="kos-home">
    <div className="kos-home__hero">
      <div className="kos-home__sky" aria-hidden="true"><span>{g.glyph}</span></div>
      <H>{g.text}</H>
      <p className="kos-muted">Welcome to {P.shortName}’s trail guide. Where to?</p>
      <WhereTo go={go} initial={q} />
    </div>
    <h3 className="kos-home__lbl">Quick trails</h3>
    <div className="kos-tiles">
      {PAGES.map((pg) => (
        <button type="button" key={pg.id} className="kos-tile" onClick={() => go(pg.id)}>
          <span className="kos-tile__g" aria-hidden="true">{pg.glyph}</span>
          <b>{pg.label}</b><small>{TILE_SUB[pg.id as Exclude<PageId, 'home'>]}</small>
        </button>))}
    </div>
    <h3 className="kos-home__lbl">Elsewhere</h3>
    <div className="kos-chips">{P.links.filter((l) => l.kind !== 'resume').map((l) => <Ext key={l.href} href={l.href} className="kos-chip kos-chip--link">{l.label}{isExt(l.href) ? ' ↗' : ''}</Ext>)}</div>
  </article>);
}

function AboutPage() {
  const photo = content.photos.find((ph) => /work/i.test(ph.caption)) ?? content.photos[0];
  return (<article className="kos-about">
    <div className="kos-about__head">
      {photo && (<figure className="kos-polaroid">
        <img src={thumb(photo.src)} alt={photo.alt} loading="lazy" />
        <figcaption>{photo.caption}</figcaption>
      </figure>)}
      <div>
        <div className="kos-kicker">🏕 {P.status} · 📍 {P.location}</div>
        <H>{P.name}</H>
        <div>{P.roles.map((r) => <span className="kos-tag" key={r}>{r}</span>)}</div>
        <p className="kos-tagline">{P.tagline}</p>
        {P.bio.map((b, i) => <p key={i}>{b}</p>)}
      </div>
    </div>
    <div className="kos-stats">{P.stats.map((s) => <div className="kos-stat" key={s.label}><b>{s.value}</b><span className="kos-muted">{s.label}</span></div>)}</div>
    <h3>Find me around the campfire</h3>
    <div className="kos-chips">{P.links.filter((l) => l.kind !== 'resume').map((l) => <Ext key={l.href} href={l.href} className="kos-chip kos-chip--link">{l.label}{isExt(l.href) ? ' ↗' : ''}</Ext>)}</div>
  </article>);
}

function ExperiencePage() {
  const jobs = content.experience;
  const companies = [...new Set(jobs.map((j) => j.company))].join(', ');
  const first = jobs[jobs.length - 1];
  return (<article>
    <H>Experience</H>
    <p className="kos-muted">{jobs.length} stops on the trail{companies ? ' · ' + companies : ''}{first ? ' · since ' + first.start : ''}</p>
    <ol className="kos-trail">
      {jobs.map((j, i) => (
        <li className="kos-stop" key={j.id} data-anchor={'job-' + j.id}>
          <span className="kos-stop__pin" aria-hidden="true">{i === 0 ? '📍' : '⛺'}</span>
          <div className="kos-stop__card">
            <div className="kos-stop__when">{j.start} – {j.end}{i === 0 && /present/i.test(j.end) && <span className="kos-here">You are here</span>}</div>
            <h3>{j.role}</h3>
            <div className="kos-muted">{j.company}{j.location ? ' · ' + j.location : ''}</div>
            {j.summary && <p>{j.summary}</p>}
            <ul>{j.bullets.map((b, k) => <li key={k}>{b}</li>)}</ul>
          </div>
        </li>))}
      <li className="kos-stop kos-stop--start"><span className="kos-stop__pin" aria-hidden="true">🚩</span><span className="kos-muted">Trailhead</span></li>
    </ol>
  </article>);
}

function ProjectsPage({ onMail }: { onMail?: () => void }) {
  return (<article>
    <H>Projects</H>
    <p className="kos-muted">Things built around the campfire.</p>
    <div className="kos-pgrid">{content.projects.map((pr, i) => (
      <section className={'kos-pcard' + (i === 0 ? ' is-feat' : '')} key={pr.id} data-anchor={'proj-' + pr.id}>
        <div className="kos-pcard__top">
          <span className="kos-pcard__mono" aria-hidden="true">{pr.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase()}</span>
          <div><h3>{pr.name}</h3><div className="kos-muted">{pr.tagline}</div></div>
          {pr.metric && <span className="kos-pcard__metric">★ {pr.metric}</span>}
        </div>
        <p>{pr.description}</p>
        <div>{pr.tags.map((t) => <span className="kos-tag" key={t}>{t}</span>)}</div>
        <div className="kos-actions">
          {pr.href ? <Ext href={pr.href} className="kos-link">Visit {pr.name} ↗</Ext>
            : onMail && <button type="button" className="kos-link kos-link--ghost" onClick={onMail}>Ask me about it ✉️</button>}
        </div>
      </section>))}</div>
  </article>);
}

function CertsPage() {
  const groups = useMemo(() => {
    const m = new Map<string, typeof content.certs>();
    for (const c of content.certs) m.set(c.issuer, [...(m.get(c.issuer) ?? []), c]);
    return [...m.entries()];
  }, []);
  // Patch label: an exam code if the name has one (AZ-204), else the distinctive word(s) (DevOps → DEV).
  const STOP = /^(professional|cloud|engineer|associate|the|of|and)$/i;
  const code = (n: string) => {
    const exam = n.match(/\b[A-Z]{2,}-?\d+\b/)?.[0];
    if (exam) return exam;
    const w = n.replace(/\(.*?\)/g, '').split(/[\s·]+/).filter((x) => /^[A-Za-z]/.test(x) && !STOP.test(x));
    return (w.length >= 2 ? w.slice(0, 2).map((x) => x[0]).join('') : (w[0] ?? n).slice(0, 3)).toUpperCase();
  };
  return (<article>
    <H>Certs &amp; Skills</H>
    <p className="kos-muted">{content.certs.length} badges sewn onto the pack · {content.skills.length} skill packs</p>
    {groups.map(([issuer, certs]) => (
      <section className="kos-issuer" key={issuer} style={{ '--c': VENDOR[certs[0].vendor] ?? VENDOR.other } as CSSProperties}>
        <h3><span className="kos-issuer__dot" aria-hidden="true" />{issuer} <span className="kos-muted">· {certs.length}</span></h3>
        <div className="kos-badges">{certs.map((c) => (
          <div className={'kos-badge' + (c.featured ? '' : ' is-also')} key={c.id} data-anchor={'cert-' + c.id}>
            <span className="kos-badge__patch" aria-hidden="true">{code(c.name)}</span>
            <div><b>{c.name}</b>{c.blurb ? <small>{c.blurb}</small> : !c.featured && <small>Also certified</small>}</div>
          </div>))}</div>
      </section>))}
    <h2 className="kos-h2gap">Skill packs</h2>
    <div className="kos-packs">{content.skills.map((g) => (
      <section className="kos-pack" key={g.title} data-anchor={'skills-' + slug(g.title)}>
        <h3>🎒 {g.title}</h3>
        <div className="kos-chips">{g.items.map((it) => <span className="kos-chip" key={it}>{it}</span>)}</div>
      </section>))}</div>
  </article>);
}

function ResumePage() {
  const featured = content.certs.filter((c) => c.featured);
  return (<article className="kos-resume">
    <H>Résumé</H>
    <div className="kos-actions">
      <a className="kos-link" href={P.resumePdf} download>Download PDF ⬇</a>
      <a className="kos-link kos-link--ghost" href={P.resumePdf} target="_blank" rel="noopener noreferrer">Open in a new tab ↗</a>
    </div>
    <div className="kos-paper" aria-label="Résumé preview">
      <div className="kos-paper__head"><b>{P.name}</b><span>{P.roles.join(' · ')} · {P.location}</span></div>
      <p className="kos-paper__tag">{P.tagline}</p>
      <h4>Experience</h4>
      <ul>{content.experience.map((j) => <li key={j.id}><b>{j.role}</b> · {j.company} <span>{j.start} – {j.end}</span></li>)}</ul>
      <h4>Certifications</h4>
      <ul className="kos-paper__cols">{featured.map((c) => <li key={c.id}>{c.issuer} — {c.name}</li>)}</ul>
      <h4>Skills</h4>
      <p>{content.skills.map((g) => g.title).join(' · ')}</p>
      <span className="kos-paper__pdf" aria-hidden="true">PDF</span>
    </div>
  </article>);
}

function TrailFooter({ page, go }: { page: PageId; go: Go }) {
  const i = PAGES.findIndex((x) => x.id === page);
  if (i < 0) return null;
  const prev = PAGES[i - 1], next = PAGES[i + 1];
  return (<nav className="kos-foot" aria-label="Trail">
    {prev ? <button type="button" className="kos-foot__b" onClick={() => go(prev.id)}><small>← Previous stop</small><b>{prev.glyph} {prev.label}</b></button>
      : <button type="button" className="kos-foot__b" onClick={() => go('home')}><small>← Back to</small><b>🧭 Trailhead</b></button>}
    {next ? <button type="button" className="kos-foot__b is-next" onClick={() => go(next.id)}><small>Next stop →</small><b>{next.glyph} {next.label}</b></button>
      : <button type="button" className="kos-foot__b is-next" onClick={() => go('home')}><small>End of the trail →</small><b>🏕 Back to camp</b></button>}
  </nav>);
}

function Shimmer() {
  return (<div className="kos-shim" aria-hidden="true">
    <i style={{ width: '42%', height: 26 }} /><i style={{ width: '70%' }} /><i style={{ width: '64%' }} />
    <div className="kos-shim__row"><i /><i /><i /></div><i style={{ width: '80%' }} /><i style={{ width: '55%' }} />
  </div>);
}

// ------------------------------------------------------------------ browser chrome
export function Trailhead({ nav, reduced, onMail }: { nav?: TrailNav; reduced: boolean; onMail?: () => void }) {
  const uid = useId();
  const keyN = useRef(1);
  const [tabs, setTabs] = useState<Tab[]>(() => [{ key: 1, stack: [{ page: nav?.page ?? 'home', anchor: nav?.anchor }], i: 0 }]);
  const [active, setActive] = useState(1);
  const [reloadN, setReloadN] = useState(0);
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const [addr, setAddr] = useState<string | null>(null); // null = not editing
  const userNav = useRef(true); // focus the new page (or the search box) on first open too
  const pageRef = useRef<HTMLDivElement>(null);
  const brRef = useRef<HTMLDivElement>(null);
  const tab = tabs.find((t) => t.key === active) ?? tabs[0];
  const loc = tab.stack[tab.i];
  const cur = pageOf(loc.page);
  // Loading is derived synchronously from the navigation key, so the page never renders for one frame and
  // then flips to the shimmer (which would unmount the element we just focused).
  const navKey = `${active}:${tab.i}:${loc.page}:${loc.anchor ?? ''}:${reloadN}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = !reduced && loadedKey !== navKey;

  const update = useCallback((fn: (t: Tab) => Tab) => setTabs((ts) => ts.map((t) => (t.key === active ? fn(t) : t))), [active]);
  const go = useCallback<Go>((page, anchor, q) => {
    userNav.current = true; setDir('fwd'); setAddr(null);
    update((t) => {
      const c = t.stack[t.i];
      if (c.page === page && c.anchor === anchor && c.q === q) return t;
      return { ...t, stack: [...t.stack.slice(0, t.i + 1), { page, anchor, q }], i: t.i + 1 };
    });
  }, [update]);
  const back = () => { if (tab.i > 0) { userNav.current = true; setDir('back'); update((t) => ({ ...t, i: Math.max(0, t.i - 1) })); } };
  const fwd = () => { if (tab.i < tab.stack.length - 1) { userNav.current = true; setDir('fwd'); update((t) => ({ ...t, i: Math.min(t.stack.length - 1, t.i + 1) })); } };
  const reload = () => { setReloadN((n) => n + 1); };
  const newTab = () => {
    if (tabs.length >= MAX_TABS) return;
    const key = ++keyN.current;
    userNav.current = true; setDir('fwd');
    setTabs((ts) => [...ts, { key, stack: [{ page: 'home' }], i: 0 }]);
    setActive(key);
  };
  const closeTab = (key: number) => {
    if (tabs.length < 2) return;
    const idx = tabs.findIndex((t) => t.key === key);
    const rest = tabs.filter((t) => t.key !== key);
    setTabs(rest);
    if (key === active) { userNav.current = true; setActive(rest[Math.min(idx, rest.length - 1)].key); }
  };

  // Keep keyboard focus inside the browser while the shimmer replaces the page (the focused element unmounts),
  // so Alt+←/→ keep working mid-load instead of focus falling back to <body>.
  useLayoutEffect(() => {
    const a = document.activeElement;
    if (brRef.current && (!a || a === document.body)) brRef.current.focus({ preventScroll: true });
  }, [navKey, loading]);

  // External navigation requests (terminal "open projects", desktop).
  const lastNav = useRef(nav?.n);
  useEffect(() => { if (nav && nav.n !== lastNav.current) { lastNav.current = nav.n; go(nav.page, nav.anchor); } }, [nav, go]);

  // Short shimmer between pages (skipped with reduced motion).
  useEffect(() => {
    if (reduced) return;
    const t = setTimeout(() => setLoadedKey(navKey), LOAD_MS);
    return () => clearTimeout(t);
  }, [navKey, reduced]);

  // After a page lands: scroll to the anchor (manually, so ancestors of the 3D screen never scroll) and move focus.
  useEffect(() => {
    if (loading) return;
    const el = pageRef.current; if (!el) return;
    el.scrollTop = 0;
    let target: HTMLElement | null = null;
    if (loc.anchor) {
      target = el.querySelector<HTMLElement>(`[data-anchor="${loc.anchor.replace(/"/g, '')}"]`);
      if (target) {
        let y = 0; let n: HTMLElement | null = target;
        while (n && n !== el) { y += n.offsetTop; n = n.offsetParent as HTMLElement | null; }
        el.scrollTop = Math.max(0, y - 16);
        target.classList.add('kos-flash');
        const t = target; setTimeout(() => t.classList.remove('kos-flash'), 1600);
      }
    }
    if (userNav.current) {
      userNav.current = false;
      const f = loc.page === 'home' ? el.querySelector<HTMLElement>('.kos-where input') : el.querySelector<HTMLElement>('[data-heading]');
      f?.focus({ preventScroll: true });
    }
  }, [loading, navKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!e.altKey) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); back(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); fwd(); }
    else if (e.key === 'Home') { e.preventDefault(); go('home'); }
  };
  const onTabsKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const i = tabs.findIndex((t) => t.key === active);
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    setActive(n.key);
    (e.currentTarget.querySelector(`#${CSS.escape(uid + 'tab' + n.key)}`) as HTMLElement | null)?.focus();
  };
  const submitAddr = () => {
    const v = (addr ?? '').trim();
    const pg = resolvePage(v);
    if (pg) go(pg); else go('home', undefined, v.replace(/^trail:\/\/kim\/?/i, ''));
  };

  const url = 'trail://kim/' + cur.path;
  return (
    <div className="kos-br" onKeyDown={onKey} ref={brRef} tabIndex={-1}>
      <div className="kos-br__tabs">
        <div role="tablist" aria-label="Open tabs" className="kos-br__tablist" onKeyDown={onTabsKey}>
          {tabs.map((t) => {
            const pg = pageOf(t.stack[t.i].page); const on = t.key === active;
            return (<div key={t.key} className={'kos-tab' + (on ? ' is-on' : '')}>
              <button type="button" role="tab" id={uid + 'tab' + t.key} aria-selected={on} aria-controls={uid + 'panel'} tabIndex={on ? 0 : -1}
                onClick={() => { if (!on) { userNav.current = true; setActive(t.key); } }}>
                <span className="kos-fav" aria-hidden="true">{pg.glyph}</span><span className="kos-tab__t">{pg.label}</span>
              </button>
              {tabs.length > 1 && <button type="button" className="kos-tab__x" aria-label={'Close tab: ' + pg.label} onClick={() => closeTab(t.key)}>×</button>}
            </div>);
          })}
        </div>
        <button type="button" className="kos-tab__new" onClick={newTab} disabled={tabs.length >= MAX_TABS} aria-label="New tab" title="New tab">+</button>
      </div>
      <div className="kos-br__bar">
        <button type="button" className="kos-br__btn" onClick={back} disabled={tab.i === 0} aria-label="Back" title="Back (Alt+←)">←</button>
        <button type="button" className="kos-br__btn" onClick={fwd} disabled={tab.i >= tab.stack.length - 1} aria-label="Forward" title="Forward (Alt+→)">→</button>
        <button type="button" className="kos-br__btn" onClick={reload} aria-label="Reload" title="Reload">↻</button>
        <button type="button" className="kos-br__btn" onClick={() => go('home')} aria-label="Home" title="Home (Alt+Home)">⌂</button>
        <form className="kos-br__url" onSubmit={(e) => { e.preventDefault(); submitAddr(); }} role="search">
          <span className="kos-fav" aria-hidden="true">{cur.glyph}</span>
          <input aria-label="Address" value={addr ?? url} spellCheck={false} autoComplete="off"
            onFocus={(e) => { setAddr(url); const t = e.currentTarget; requestAnimationFrame(() => t.select()); }}
            onBlur={() => setAddr(null)} onChange={(e) => setAddr(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape' && addr !== null) { e.stopPropagation(); setAddr(null); e.currentTarget.blur(); } }} />
          <span className="kos-br__lock" aria-hidden="true" title="Secure trail">🔒</span>
        </form>
      </div>
      <nav className="kos-br__marks" aria-label="Bookmarks">
        {PAGES.map((pg) => (
          <button type="button" key={pg.id} className={'kos-br__mark' + (pg.id === loc.page ? ' is-on' : '')} aria-current={pg.id === loc.page ? 'page' : undefined} onClick={() => go(pg.id)}>
            <span aria-hidden="true">{pg.glyph}</span> {pg.label}
          </button>))}
      </nav>
      {loading && <div className="kos-br__progress" aria-hidden="true" />}
      <div className={'kos-br__page' + (reduced ? '' : ' is-anim')} data-dir={dir} ref={pageRef} key={active + ':' + tab.i + ':' + reloadN}
        role="tabpanel" id={uid + 'panel'} aria-labelledby={uid + 'tab' + active} aria-busy={loading || undefined} data-page={loc.page}>
        {loading ? <Shimmer /> : (<>
          {loc.page === 'home' && <HomePage go={go} q={loc.q} />}
          {loc.page === 'about' && <AboutPage />}
          {loc.page === 'experience' && <ExperiencePage />}
          {loc.page === 'projects' && <ProjectsPage onMail={onMail} />}
          {loc.page === 'certs' && <CertsPage />}
          {loc.page === 'resume' && <ResumePage />}
          <TrailFooter page={loc.page} go={go} />
        </>)}
      </div>
      <div className="kos-sr" aria-live="polite">{loading ? '' : cur.label + ' loaded'}</div>
    </div>);
}
