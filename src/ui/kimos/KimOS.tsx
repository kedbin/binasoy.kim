import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, KeyboardEvent, PointerEvent as RPointerEvent, ReactNode } from 'react';
import { content } from '../../content';
import { classify, EMAIL_RE, FAIL_COPY, LIMITS, NEEDS_FALLBACK, postContact } from './contact';
import type { ContactPayload, FailReason, TemplateId } from './contact';
import { useTurnstile } from './turnstile';
import './kimos.css';

export interface KimOSProps { mode?: 'screen' | 'modal'; onExit?: () => void }

// ---------------------------------------------------------------------------------------------
// Desktop: one browser app (Trailhead) carries all portfolio pages; CampMail is the contact app;
// Photos + Terminal are the flavour items; "Back to the van" leaves the laptop (onExit).
// ---------------------------------------------------------------------------------------------
type AppId = 'trailhead' | 'mail' | 'photos' | 'terminal';
interface AppDef { id: AppId; label: string; title: string; glyph: string; color: string; w: number; h: number }
const APPS: AppDef[] = [
  { id: 'trailhead', label: 'Trailhead', title: 'Trailhead', glyph: '🧭', color: '#8fb078', w: 860, h: 640 },
  { id: 'mail', label: 'CampMail', title: 'CampMail — New note', glyph: '✉️', color: '#FFD58A', w: 660, h: 560 },
  { id: 'photos', label: 'Photos', title: 'Photos — van life', glyph: '📷', color: '#EDE8E0', w: 660, h: 520 },
  { id: 'terminal', label: 'Terminal', title: 'Terminal', glyph: '>_', color: '#1E1F22', w: 620, h: 400 },
];
const APP_POS: Record<AppId, { x: number; y: number }> = {
  trailhead: { x: 150, y: 22 }, mail: { x: 380, y: 60 }, photos: { x: 300, y: 90 }, terminal: { x: 460, y: 300 },
};

type PageId = 'about' | 'experience' | 'projects' | 'certs' | 'resume';
const PAGES: { id: PageId; label: string; glyph: string; path: string }[] = [
  { id: 'about', label: 'About', glyph: '🏕', path: 'about' },
  { id: 'experience', label: 'Experience', glyph: '🥾', path: 'experience' },
  { id: 'projects', label: 'Projects', glyph: '🛠️', path: 'projects' },
  { id: 'certs', label: 'Certs & Skills', glyph: '🏅', path: 'certs-and-skills' },
  { id: 'resume', label: 'Résumé', glyph: '📎', path: 'resume' },
];
const pageOf = (id: PageId) => PAGES.find((p) => p.id === id)!;

const VENDOR: Record<string, string> = { gcp: '#4285F4', azure: '#0078D4', aws: '#FF9900', 'google-ai': '#8E64D9', other: '#8FA3B8' };
const thumb = (s: string) => s.replace(/\.webp$/, '-thumb.webp');
const toAddr = (content.profile.links.find((l) => l.kind === 'email')?.href.replace(/^mailto:/, '') || '').trim();

interface Win { id: AppId; x: number; y: number; z: number; nav?: { page: PageId; n: number } }

function useReducedMotion() {
  const [r, setR] = useState(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const m = matchMedia('(prefers-reduced-motion: reduce)');
    const f = () => setR(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return r;
}

function useClock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 15000); return () => clearInterval(i); }, []);
  return t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function Wallpaper() {
  return (
    <div className="kos-wall" aria-hidden="true">
      <svg viewBox="0 0 1280 800" preserveAspectRatio="xMidYMax slice">
        <circle cx="900" cy="330" r="70" fill="#FFD58A" opacity=".85" />
        <path d="M0 480 Q160 380 330 470 T640 450 T980 460 T1280 420 V520 H0Z" fill="#6e5a7a" opacity=".55" />
        <path d="M0 520 Q200 440 380 510 T760 500 T1280 480 V560 H0Z" fill="#2f4a3a" opacity=".6" />
        <path d="M0 570 Q260 510 520 565 T1280 545 V800 H0Z" fill="#8FA3B8" />
        <path d="M600 600 h200 M540 640 h320 M650 680 h160" stroke="#FFD58A" strokeWidth="4" strokeLinecap="round" opacity=".5" />
      </svg>
    </div>
  );
}

function Link({ href, children, className = 'kos-link' }: { href: string; children: ReactNode; className?: string }) {
  const ext = /^https?:/.test(href);
  return <a className={className} href={href} {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{children}</a>;
}

// ---------------------------------------------------------------- Trailhead pages
type Go = (p: PageId) => void;
function NextTrail({ go, to }: { go: Go; to: PageId }) {
  const p = pageOf(to);
  return <button type="button" className="kos-next" onClick={() => go(to)}>Next stop: {p.glyph} {p.label} →</button>;
}

function AboutPage({ go }: { go: Go }) {
  const p = content.profile;
  const links = p.links.filter((l) => l.kind !== 'resume');
  return (<article>
    <h2>{p.name}</h2>
    <div>{p.roles.map((r) => <span className="kos-tag" key={r}>{r}</span>)}</div>
    <div className="kos-tagline">{p.tagline}</div>
    {p.bio.map((b, i) => <p key={i}>{b}</p>)}
    <div className="kos-stats">{p.stats.map((s) => <div className="kos-stat" key={s.label}><b>{s.value}</b><span className="kos-muted">{s.label}</span></div>)}</div>
    <p className="kos-muted">📍 {p.location} · 🟢 {p.status}</p>
    <h3>Elsewhere</h3>
    <div className="kos-chips">{links.map((l) => <Link key={l.href} href={l.href} className="kos-chip kos-chip--link">{l.label}{/^https?:/.test(l.href) ? ' ↗' : ''}</Link>)}</div>
    <NextTrail go={go} to="experience" />
  </article>);
}
function ExperiencePage({ go }: { go: Go }) {
  return (<article><h2>Experience</h2>
    <div className="kos-tl">{content.experience.map((j) => (
      <section className="kos-job" key={j.id}>
        <h3>{j.role} · {j.company}</h3>
        <div className="kos-muted">{j.start} – {j.end}{j.location ? ' · ' + j.location : ''}</div>
        {j.summary && <p>{j.summary}</p>}
        <ul>{j.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
      </section>))}</div>
    <NextTrail go={go} to="projects" />
  </article>);
}
function ProjectsPage({ go }: { go: Go }) {
  return (<article><h2>Projects</h2>
    <div className="kos-grid">{content.projects.map((p) => (
      <section className="kos-card" key={p.id}>
        <h3>{p.name}</h3><div className="kos-muted">{p.tagline}</div>
        <p>{p.description}</p>
        {p.metric && <div className="kos-metric">★ {p.metric}</div>}
        <div>{p.tags.map((t) => <span className="kos-tag" key={t}>{t}</span>)}</div>
        {p.href && <Link href={p.href}>Visit {p.name} ↗</Link>}
      </section>))}</div>
    <NextTrail go={go} to="certs" />
  </article>);
}
function CertsPage({ go }: { go: Go }) {
  const [feat, rest] = useMemo(() => [content.certs.filter((c) => c.featured), content.certs.filter((c) => !c.featured)], []);
  const card = (c: typeof content.certs[number]) => (
    <section className="kos-card" key={c.id} style={{ '--c': VENDOR[c.vendor] } as CSSProperties}>
      <div className="kos-muted">{c.issuer}</div><h3>{c.name}</h3>{c.blurb && <p>{c.blurb}</p>}
    </section>);
  return (<article><h2>Certifications</h2>
    <div className="kos-grid">{feat.map(card)}</div>
    {rest.length > 0 && <><h3 className="kos-h3gap">Also certified</h3><div className="kos-grid">{rest.map(card)}</div></>}
    <h2 className="kos-h2gap">Skills</h2>
    {content.skills.map((g) => (<section key={g.title}><h3>{g.title}</h3>
      <div className="kos-chips">{g.items.map((i) => <span className="kos-chip" key={i}>{i}</span>)}</div></section>))}
    <NextTrail go={go} to="resume" />
  </article>);
}
function ResumePage({ go }: { go: Go }) {
  const p = content.profile;
  const latest = content.experience[0];
  return (<article className="kos-resume">
    <div className="kos-doc" aria-hidden="true"><span>PDF</span></div>
    <h2>Résumé</h2>
    <p className="kos-muted">{p.name} · {p.roles.join(' · ')} · {p.location}</p>
    <div className="kos-actions">
      <a className="kos-link" href={p.resumePdf} download>Download PDF ⬇</a>
      <a className="kos-link kos-link--ghost" href={p.resumePdf} target="_blank" rel="noopener noreferrer">Open in a new tab ↗</a>
    </div>
    <h3 className="kos-h3gap">At a glance</h3>
    <ul>
      {latest && <li>Now: {latest.role} · {latest.company} ({latest.start} – {latest.end})</li>}
      <li>{content.certs.length} certifications · {content.projects.length} projects · {content.experience.length} roles</li>
      {p.stats.map((s) => <li key={s.label}>{s.value} {s.label}</li>)}
    </ul>
    <p className="kos-muted">Want to talk? <button type="button" className="kos-inline" onClick={() => go('about')}>Back to the start</button> or drop a note in CampMail.</p>
  </article>);
}

function Trailhead({ nav, reduced }: { nav?: Win['nav']; reduced: boolean }) {
  const [hist, setHist] = useState<{ stack: PageId[]; i: number }>({ stack: [nav?.page ?? 'about'], i: 0 });
  const [reloadN, setReloadN] = useState(0);
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const page = hist.stack[hist.i];

  const go = useCallback((p: PageId) => setHist((h) => (h.stack[h.i] === p ? h : { stack: [...h.stack.slice(0, h.i + 1), p], i: h.i + 1 })), []);
  const back = () => setHist((h) => (h.i > 0 ? { ...h, i: h.i - 1 } : h));
  const fwd = () => setHist((h) => (h.i < h.stack.length - 1 ? { ...h, i: h.i + 1 } : h));
  const reload = () => { setReloadN((n) => n + 1); if (!reduced) setLoading(true); };

  // External navigation requests (desktop / terminal "open projects").
  const lastNav = useRef(nav?.n);
  useEffect(() => { if (nav && nav.n !== lastNav.current) { lastNav.current = nav.n; go(nav.page); } }, [nav, go]);
  useEffect(() => { bodyRef.current?.scrollTo?.(0, 0); }, [page, reloadN]);
  useEffect(() => { if (!loading) return; const t = setTimeout(() => setLoading(false), 450); return () => clearTimeout(t); }, [loading, reloadN]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!e.altKey) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); back(); } else if (e.key === 'ArrowRight') { e.preventDefault(); fwd(); }
  };
  const cur = pageOf(page);
  return (
    <div className="kos-br" onKeyDown={onKey}>
      <div className="kos-br__bar">
        <button type="button" className="kos-br__btn" onClick={back} disabled={hist.i === 0} aria-label="Back" title="Back (Alt+←)">←</button>
        <button type="button" className="kos-br__btn" onClick={fwd} disabled={hist.i >= hist.stack.length - 1} aria-label="Forward" title="Forward (Alt+→)">→</button>
        <button type="button" className="kos-br__btn" onClick={reload} aria-label="Reload" title="Reload">↻</button>
        <button type="button" className="kos-br__btn" onClick={() => go('about')} aria-label="Home" title="Home">⌂</button>
        <div className="kos-br__url" aria-label="Address">
          <span aria-hidden="true">🔒</span> <span className="kos-muted">trail://kim/</span>{cur.path}
        </div>
      </div>
      <nav className="kos-br__marks" aria-label="Bookmarks">
        {PAGES.map((p) => (
          <button type="button" key={p.id} className={'kos-br__mark' + (p.id === page ? ' is-on' : '')} aria-current={p.id === page ? 'page' : undefined} onClick={() => go(p.id)}>
            <span aria-hidden="true">{p.glyph}</span> {p.label}
          </button>))}
      </nav>
      {loading && <div className="kos-br__progress" aria-hidden="true" />}
      <div className="kos-br__page" ref={bodyRef} key={page + ':' + reloadN} aria-busy={loading || undefined}>
        {page === 'about' && <AboutPage go={go} />}
        {page === 'experience' && <ExperiencePage go={go} />}
        {page === 'projects' && <ProjectsPage go={go} />}
        {page === 'certs' && <CertsPage go={go} />}
        {page === 'resume' && <ResumePage go={go} />}
      </div>
    </div>);
}

// ---------------------------------------------------------------- Photos
function Photos() {
  const [open, setOpen] = useState<number | null>(null);
  if (!content.photos.length) return <p className="kos-muted">No photos yet.</p>;
  if (open !== null) {
    const ph = content.photos[open];
    const n = content.photos.length;
    return (<div>
      <div className="kos-actions">
        <button type="button" className="kos-link" onClick={() => setOpen(null)}>← All photos</button>
        <span className="kos-sp" />
        <button type="button" className="kos-link kos-link--ghost" onClick={() => setOpen((open + n - 1) % n)} aria-label="Previous photo">‹</button>
        <button type="button" className="kos-link kos-link--ghost" onClick={() => setOpen((open + 1) % n)} aria-label="Next photo">›</button>
      </div>
      <img className="kos-big" src={ph.src} alt={ph.alt} style={{ marginTop: 8 }} /><p className="kos-muted">{ph.caption}</p></div>);
  }
  return (<div className="kos-photos" role="list">{content.photos.map((ph, i) => (
    <button type="button" role="listitem" className="kos-ph" key={ph.id} onClick={() => setOpen(i)} aria-label={'Open photo: ' + ph.caption}>
      <img src={thumb(ph.src)} alt="" loading="lazy" /></button>))}</div>);
}

// ---------------------------------------------------------------- CampMail
const MAIL_PRESETS: { id: TemplateId; label: string; subject: string; body: string }[] = [
  { id: 'work', label: '💼 Working together', subject: 'Working together', body: `What you're building:\n\nWhere you think I'd fit:\n\nRough timing / team:\n` },
  { id: 'cloud', label: '☁️ Cloud / QA / AI', subject: 'Quick chat — Cloud / QA / AI', body: `Hey ${content.profile.shortName},\n\nI was exploring your van portfolio and wanted to ask about:\n\n` },
  { id: 'van', label: '🚐 Van build', subject: 'Your camper van build!', body: `Hey ${content.profile.shortName} & ${content.profile.partner},\n\nLoved the minivan camper setup! Quick question:\n\n` },
  { id: 'feedback', label: '🐞 Feedback', subject: 'Feedback on the site', body: `What worked well:\n\nWhat felt off or broken:\n` },
  { id: 'other', label: '✏️ Blank', subject: '', body: '' },
];
const SEND_MIN_MS = 1600;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
type Phase = 'editing' | 'sending' | 'sent' | 'failed';

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000); } catch { /* clipboard blocked */ }
  };
  return { copied, copy };
}

function CampMail({ reduced, onDone }: { reduced: boolean; onDone: () => void }) {
  const socials = content.profile.links.filter((l) => l.kind !== 'email' && l.kind !== 'resume');
  const mountedAt = useRef(Date.now());
  const ts = useTurnstile();
  const { copied, copy } = useCopy();

  const [preset, setPreset] = useState<TemplateId>('work');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(MAIL_PRESETS[0].subject);
  const [message, setMessage] = useState(MAIL_PRESETS[0].body);
  const [subjectTouched, setSubjectTouched] = useState(false);
  const [messageTouched, setMessageTouched] = useState(false);
  const [trap, setTrap] = useState('');
  const [error, setError] = useState<{ field: 'message' | 'email'; text: string } | null>(null);
  const [phase, setPhase] = useState<Phase>('editing');
  const [failure, setFailure] = useState<FailReason | null>(null);
  const sentRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLTextAreaElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Templates prefill subject/body, but never overwrite what the visitor has typed themselves.
  const untouchedOrTemplate = (v: string, touched: boolean, key: 'subject' | 'body') =>
    !touched || v.trim() === '' || MAIL_PRESETS.some((m) => m[key] === v);
  const choosePreset = (id: TemplateId) => {
    const p = MAIL_PRESETS.find((x) => x.id === id)!;
    setPreset(id);
    if (untouchedOrTemplate(subject, subjectTouched, 'subject')) { setSubject(p.subject); setSubjectTouched(false); }
    if (untouchedOrTemplate(message, messageTouched, 'body')) { setMessage(p.body); setMessageTouched(false); if (error?.field === 'message') setError(null); }
  };

  const fallbackBody = (email.trim() ? `Reply-To: ${email.trim()}\n\n` : '') + message.trim();
  const mailtoHref = useMemo(() => {
    const q = new URLSearchParams();
    if (subject.trim()) q.set('subject', subject.trim());
    if (fallbackBody.trim()) q.set('body', fallbackBody);
    const s = q.toString().replace(/\+/g, '%20');
    return `mailto:${toAddr}${s ? '?' + s : ''}`;
  }, [subject, fallbackBody]);
  const fullEmailText = `To: ${toAddr}\n${subject.trim() ? 'Subject: ' + subject.trim() + '\n' : ''}\n${fallbackBody}`;

  useEffect(() => { if (phase === 'sent' || phase === 'failed') sentRef.current?.focus(); }, [phase]);

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    if (phase === 'sending') return;
    if (!message.trim()) { setError({ field: 'message', text: 'Add a note first — anything at all.' }); msgRef.current?.focus(); return; }
    if (email.trim() && !EMAIL_RE.test(email.trim())) { setError({ field: 'email', text: "That reply address doesn't look quite right. Fix it, or leave it blank." }); emailRef.current?.focus(); return; }
    setError(null);
    setFailure(null);
    setPhase('sending');
    const started = Date.now();
    const minWait = reduced ? Promise.resolve() : sleep(SEND_MIN_MS);
    const token = await ts.getToken(); // '' if no key / check failed: the server decides ('captcha')
    let reason: FailReason | null = null;
    {
      const payload: ContactPayload = {
        message: message.trim().slice(0, LIMITS.message),
        trap,
        mountedAt: mountedAt.current,
        turnstileToken: token,
        template: preset,
        ...(subject.trim() ? { subject: subject.trim().slice(0, LIMITS.subject) } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(name.trim() ? { name: name.trim().slice(0, LIMITS.name) } : {}),
      };
      const res = await postContact(payload);
      if (!res.ok) reason = classify(res.reason, started - mountedAt.current);
    }
    await minWait;
    ts.reset(); // tokens are single-use: always reset after an attempt
    if (reason) { setFailure(reason); setPhase('failed'); } else { setPhase('sent'); }
  };

  const writeAnother = () => {
    const p = MAIL_PRESETS.find((x) => x.id === preset)!;
    setSubject(p.subject); setMessage(p.body); setSubjectTouched(false); setMessageTouched(false); setPhase('editing');
  };

  const fallback = (
    <div className="kos-mail__fallback">
      <div className="kos-mail__fallback-lbl">Send it yourself instead (opens your mail app):</div>
      <div className="kos-actions">
        <a className="kos-link" href={mailtoHref}>✉️ Open in my mail app</a>
        <button type="button" className="kos-mail__copy" onClick={() => copy('full', fullEmailText)}>{copied === 'full' ? '✓ Copied the whole note' : '📋 Copy the whole note'}</button>
        <button type="button" className="kos-mail__copy" onClick={() => copy('addr', toAddr)}>{copied === 'addr' ? '✓ Copied!' : `📋 Copy ${toAddr}`}</button>
      </div>
    </div>);

  const remaining = LIMITS.message - message.length;
  return (
    <form className="kos-mail" onSubmit={send} noValidate aria-busy={phase === 'sending' || undefined}>
      <div className="kos-mail__headers">
        <div className="kos-mail__row">
          <span className="kos-mail__lbl" id="kos-mail-to">To</span>
          <span className="kos-mail__to" aria-labelledby="kos-mail-to">{content.profile.name} &lt;{toAddr}&gt;</span>
          <span className="kos-mail__lock" title="The recipient is fixed">🔒</span>
        </div>
        <label className="kos-mail__row">
          <span className="kos-mail__lbl">Name</span>
          <input type="text" value={name} maxLength={LIMITS.name} onChange={(e) => setName(e.target.value)} placeholder="optional" autoComplete="name" disabled={phase === 'sending'} />
        </label>
        <label className="kos-mail__row">
          <span className="kos-mail__lbl">From</span>
          <input ref={emailRef} type="email" value={email} maxLength={LIMITS.email} onChange={(e) => { setEmail(e.target.value); if (error?.field === 'email') setError(null); }}
            placeholder="your@email.com (optional, so I can reply)" autoComplete="email" inputMode="email" aria-invalid={error?.field === 'email' || undefined} disabled={phase === 'sending'} />
        </label>
        <label className="kos-mail__row">
          <span className="kos-mail__lbl">Subject</span>
          <input type="text" value={subject} maxLength={LIMITS.subject} onChange={(e) => { setSubjectTouched(true); setSubject(e.target.value); }} placeholder="Subject" disabled={phase === 'sending'} />
        </label>
        {/* Honeypot: humans never see or tab to this; bots that fill every field get refused server-side. */}
        <div className="kos-mail__trap" aria-hidden="true">
          <label>Leave this empty<input type="text" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} name="website" /></label>
        </div>
      </div>

      <div className="kos-mail__bar">
        <span className="kos-mail__bar-lbl">Template</span>
        <div className="kos-mail__presets" role="group" aria-label="Note templates">
          {MAIL_PRESETS.map((p) => (
            <button key={p.id} type="button" aria-pressed={preset === p.id} className={'kos-mail__pill' + (preset === p.id ? ' is-on' : '')}
              onClick={() => choosePreset(p.id)} disabled={phase !== 'editing'}>{p.label}</button>))}
        </div>
        <button type="submit" className="kos-mail__send" disabled={phase !== 'editing'}>{phase === 'sending' ? 'Sending…' : 'Send ✉️'}</button>
      </div>

      <div className="kos-mail__stage">
        {phase === 'editing' && (
          <div className="kos-mail__compose">
            <textarea ref={msgRef} aria-label="Message" value={message} maxLength={LIMITS.message} placeholder="Write anything at all…"
              aria-invalid={error?.field === 'message' || undefined}
              onChange={(e) => { setMessageTouched(true); setMessage(e.target.value); if (error?.field === 'message') setError(null); }} />
            {error && <p className="kos-mail__err" role="alert">{error.text}</p>}
          </div>)}
        {phase === 'sending' && (
          <div className="kos-mail__sending" role="status">
            <div className={'kos-mail__trail' + (reduced ? ' is-still' : '')} aria-hidden="true"><span>✉️</span></div>
            <p>Carrying your note down the trail… 1 of 1</p>
          </div>)}
        {phase === 'sent' && (
          <div className="kos-mail__result" role="status" tabIndex={-1} ref={sentRef}>
            <div className="kos-mail__big" aria-hidden="true">📬</div>
            <h3>Note delivered to camp!</h3>
            <p className="kos-muted">{email.trim() ? "Thanks — I'll usually reply within a few days." : 'Thanks for the note — I should see it within a few days.'}</p>
            <div className="kos-actions">
              <button type="button" className="kos-link" onClick={onDone}>OK</button>
              <button type="button" className="kos-link kos-link--ghost" onClick={writeAnother}>Write another</button>
            </div>
          </div>)}
        {phase === 'failed' && failure && (
          <div className="kos-mail__result is-failed" role="alert" tabIndex={-1} ref={sentRef}>
            <div className="kos-mail__big" aria-hidden="true">{failure === 'unavailable' ? '📭' : failure === 'offline' ? '📡' : '🪵'}</div>
            <h3>Not sent — {FAIL_COPY[failure].title.toLowerCase()}</h3>
            <p className="kos-muted">{FAIL_COPY[failure].body}</p>
            {NEEDS_FALLBACK.includes(failure) && fallback}
            <div className="kos-actions">
              {failure !== 'unavailable' && (failure !== 'captcha' || ts.enabled) && <button type="button" className="kos-link" onClick={() => send()}>Try again</button>}
              <button type="button" className="kos-link kos-link--ghost" onClick={() => setPhase('editing')}>← Edit note</button>
            </div>
          </div>)}
      </div>

      {/* Turnstile lives inside the compose window; 'interaction-only' keeps it invisible unless a check is needed. */}
      <div className="kos-mail__captcha" ref={ts.ref} hidden={!ts.enabled} />

      <div className="kos-mail__status">
        <span>
          {phase === 'editing' ? 'Draft' : phase === 'sending' ? 'Sending…' : phase === 'sent' ? 'Sent' : 'Not sent'}
          {' · '}<span className={remaining < 200 ? 'kos-warn' : undefined}>{message.length} / {LIMITS.message}</span>
        </span>
        <span className="kos-mail__privacy">Emailed to {content.profile.shortName} and stored nowhere else.{ts.enabled ? ' Protected by Cloudflare Turnstile.' : ''}</span>
        <span className="kos-mail__socials">{socials.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>)}</span>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- Terminal
function Terminal({ onClose, openPage, openApp, onExit }: { onClose: () => void; openPage: (p: PageId) => void; openApp: (a: AppId) => void; onExit?: () => void }) {
  const [lines, setLines] = useState<string[]>(['KimOS terminal — type "help"']);
  const [val, setVal] = useState('');
  const [typing, setTyping] = useState<string | null>(null);
  const [shown, setShown] = useState(0);
  const [hist, setHist] = useState<string[]>([]);
  const [hi, setHi] = useState(-1);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    if (typing === null) return;
    if (shown >= typing.length) { setLines((l) => [...l, typing]); setTyping(null); return; }
    const t = setTimeout(() => setShown((s) => Math.min(typing.length, s + 6)), 12);
    return () => clearTimeout(t);
  }, [typing, shown]);
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: 'end' }); }, [lines, shown]);

  const pageAlias: Record<string, PageId> = { about: 'about', experience: 'experience', exp: 'experience', projects: 'projects', certs: 'certs', skills: 'certs', resume: 'resume', 'résumé': 'resume', cv: 'resume' };
  const run = (raw: string): string | null => {
    const c = raw.trim().toLowerCase().replace(/\s+/g, ' ');
    const p = content.profile;
    if (c.startsWith('open ') || c.startsWith('cd ')) {
      const arg = c.split(' ')[1].replace(/\/$/, '').replace(/\.(txt|pdf)$/, '');
      if (pageAlias[arg]) { openPage(pageAlias[arg]); return `opening trail://kim/${pageOf(pageAlias[arg]).path} in Trailhead…`; }
      if (arg === 'mail' || arg === 'campmail') { openApp('mail'); return 'opening CampMail…'; }
      if (arg === 'photos') { openApp('photos'); return 'opening Photos…'; }
      return `open: no such trail "${arg}". try "ls"`;
    }
    switch (c) {
      case '': return '';
      case 'help': return 'commands: help, whoami, ls, open <page>, cat about.txt, projects, certs, skills, mail, wingwing, weather, clear, exit, logout';
      case 'whoami': return p.name + ' — ' + p.roles.join(' · ');
      case 'ls': return PAGES.map((x) => x.path).join('  ') + '  photos/  mail';
      case 'pwd': return '/home/' + p.shortName.toLowerCase() + '/van';
      case 'cat about.txt': return p.tagline + '\n\n' + p.bio.join('\n\n');
      case 'projects': return content.projects.map((x) => '• ' + x.name + ' — ' + x.tagline).join('\n') + '\n(open projects for the full trail)';
      case 'certs': return content.certs.map((x) => '• ' + x.issuer + ': ' + x.name).join('\n');
      case 'skills': return content.skills.map((g) => g.title + ': ' + g.items.join(', ')).join('\n');
      case 'mail': openApp('mail'); return 'opening CampMail…';
      case 'wingwing': return '🐾 ' + p.partner + ' is the best co-pilot, and the reason every campsite feels like home. 💛';
      case 'weather': return 'golden hour · lake still · a few fireflies. perfect for shipping.';
      case 'sudo rm -rf /': case 'sudo rm -rf': return 'nice try. the van stays parked.';
      case 'exit': onClose(); return '';
      case 'logout': case 'shutdown': if (onExit) { onExit(); return ''; } return 'nowhere to go — enjoy the view.';
      default: return c + ': command not found. try "help"';
    }
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' && hist.length) { e.preventDefault(); const n = Math.min(hist.length - 1, hi + 1); setHi(n); setVal(hist[hist.length - 1 - n]); return; }
    if (e.key === 'ArrowDown' && hi >= 0) { e.preventDefault(); const n = hi - 1; setHi(n); setVal(n < 0 ? '' : hist[hist.length - 1 - n]); return; }
    if (e.key !== 'Enter' || typing !== null) return;
    const cmd = val; setVal(''); setHi(-1);
    if (cmd.trim()) setHist((h) => [...h, cmd]);
    if (cmd.trim().toLowerCase() === 'clear') { setLines([]); return; }
    setLines((l) => [...l, '$ ' + cmd]);
    const out = run(cmd);
    if (out) { setShown(0); setTyping(out); }
  };
  return (<div className="kos-term" onClick={() => inputRef.current?.focus()}>
    {lines.map((l, i) => <div key={i}>{l}</div>)}
    {typing !== null && <div>{typing.slice(0, shown)}</div>}
    <div>$ <input ref={inputRef} value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={onKey} aria-label="Terminal input" spellCheck={false} autoCapitalize="off" autoComplete="off" /></div>
    <div ref={endRef} /></div>);
}

// ---------------------------------------------------------------- Window manager
function Window({ win, app, modal, onClose, onFocus, onMove, children }: {
  win: Win; app: AppDef; modal: boolean; onClose: () => void; onFocus: () => void;
  onMove: (x: number, y: number) => void; children: ReactNode;
}) {
  const drag = useRef<{ dx: number; dy: number; k: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Move focus into a freshly opened window (unless the app already focused something inside it).
    const el = ref.current;
    if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true });
  }, []);
  const down = (e: RPointerEvent<HTMLDivElement>) => {
    if (modal || (e.target as HTMLElement).closest('button')) return;
    const root = e.currentTarget.closest('.kos-root') as HTMLElement;
    const rect = root.getBoundingClientRect();
    const k = rect.width / root.offsetWidth || 1;
    drag.current = { dx: (e.clientX - rect.left) / k - win.x, dy: (e.clientY - rect.top) / k - win.y, k };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current; if (!d) return;
    const rect = (e.currentTarget.closest('.kos-root') as HTMLElement).getBoundingClientRect();
    onMove(Math.max(0, (e.clientX - rect.left) / d.k - d.dx), Math.max(0, (e.clientY - rect.top) / d.k - d.dy));
  };
  const flush = app.id !== 'photos';
  return (
    <div ref={ref} tabIndex={-1} className={'kos-win kos-win--' + app.id} role="dialog" aria-label={app.title} data-app={app.id}
      style={{ left: win.x, top: win.y, width: app.w, height: app.h, zIndex: win.z, maxWidth: '100%', maxHeight: '100%' }}
      onPointerDown={onFocus} onFocus={onFocus}>
      <div className="kos-title" onPointerDown={down} onPointerMove={move} onPointerUp={() => { drag.current = null; }}>
        <span aria-hidden="true">{app.id === 'terminal' ? '⌨️' : app.glyph}</span><span className="kos-t">{app.title}</span>
        <button type="button" className="kos-x" onClick={onClose} aria-label={'Close ' + app.label}>✕</button>
      </div>
      <div className="kos-body" style={flush ? { padding: 0 } : undefined}>{children}</div>
    </div>);
}

export function KimOS({ mode = 'screen', onExit }: KimOSProps) {
  const modal = mode === 'modal';
  const [wins, setWins] = useState<Win[]>([]);
  const zRef = useRef(10);
  const navN = useRef(0);
  const clock = useClock();
  const reduced = useReducedMotion();

  const open = useCallback((id: AppId, page?: PageId) => {
    setWins((ws) => {
      const z = ++zRef.current;
      const nav = page ? { page, n: ++navN.current } : undefined;
      const existing = ws.find((w) => w.id === id);
      if (modal) return [existing ? { ...existing, z, ...(nav ? { nav } : {}) } : { id, x: 0, y: 0, z, nav }];
      if (existing) return ws.map((w) => (w.id === id ? { ...w, z, ...(nav ? { nav } : {}) } : w));
      const n = ws.length;
      return [...ws, { id, x: APP_POS[id].x + n * 18, y: APP_POS[id].y + n * 16, z, nav }];
    });
  }, [modal]);
  const close = useCallback((id: AppId) => setWins((ws) => ws.filter((w) => w.id !== id)), []);
  const focus = useCallback((id: AppId) => setWins((ws) => {
    const top = ws.reduce<Win | null>((a, b) => (!a || b.z > a.z ? b : a), null);
    if (top?.id === id) return ws; // already on top: avoid re-render churn
    const z = ++zRef.current;
    return ws.map((w) => (w.id === id ? { ...w, z } : w));
  }), []);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape' || !wins.length) return;
    e.stopPropagation();
    const top = wins.reduce((a, b) => (a.z > b.z ? a : b));
    close(top.id);
  };

  const body = (w: Win) => {
    switch (w.id) {
      case 'trailhead': return <Trailhead nav={w.nav} reduced={reduced} />;
      case 'mail': return <CampMail reduced={reduced} onDone={() => close('mail')} />;
      case 'photos': return <Photos />;
      case 'terminal': return <Terminal onClose={() => close('terminal')} openPage={(p) => open('trailhead', p)} openApp={(a) => open(a)} onExit={onExit} />;
    }
  };

  return (
    <div className={'kos-root ' + (modal ? 'kos-modal' : 'kos-screen')} onKeyDown={onKey}>
      <Wallpaper />
      <div className="kos-bar">
        <span className="kos-brand">🏕 KimOS</span>
        <span className="kos-sp" />
        <span aria-label="Wi-Fi: lake-wifi">📶 lake-wifi</span>
        <span aria-label="Battery 100 percent">🔋 100%</span>
        <span>{clock}</span>
        {onExit && <button type="button" onClick={onExit} aria-label="Close lid">⏻ Close lid</button>}
      </div>
      <div className="kos-desk">
        <div className="kos-icons" role="list" aria-label="Desktop">
          {APPS.map((a) => (
            <button type="button" key={a.id} role="listitem" className="kos-icon" onClick={() => open(a.id)} aria-label={'Open ' + a.label}>
              <i className={a.id === 'terminal' ? 'is-term' : undefined} style={{ '--c': a.color } as CSSProperties} aria-hidden="true">{a.glyph}</i>
              {a.label}
            </button>))}
          {onExit && (
            <button type="button" role="listitem" className="kos-icon" onClick={onExit} aria-label="Back to the van (close the laptop)">
              <i style={{ '--c': '#D9682B' } as CSSProperties} aria-hidden="true">🚐</i>
              Back to the van
            </button>)}
        </div>
        {wins.map((w) => {
          const app = APPS.find((a) => a.id === w.id)!;
          return (<Window key={w.id} win={w} app={app} modal={modal} onClose={() => close(w.id)} onFocus={() => focus(w.id)}
            onMove={(x, y) => setWins((ws) => ws.map((q) => (q.id === w.id ? { ...q, x, y } : q)))}>{body(w)}</Window>);
        })}
      </div>
    </div>);
}

export default KimOS;
