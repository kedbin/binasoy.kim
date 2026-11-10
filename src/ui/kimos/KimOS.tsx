import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent as RPointerEvent, ReactNode } from 'react';
import { content } from '../../content';
import './kimos.css';

export interface KimOSProps { mode?: 'screen' | 'modal'; onExit?: () => void }

type AppId = 'about' | 'experience' | 'projects' | 'certs' | 'skills' | 'resume' | 'photos' | 'contact' | 'terminal';
const APPS: { id: AppId; label: string; glyph: string; color: string; w: number; h: number }[] = [
  { id: 'about', label: 'About.txt', glyph: '📄', color: '#F4C7A1', w: 560, h: 480 },
  { id: 'experience', label: 'Experience', glyph: '🧭', color: '#B9A7C9', w: 640, h: 520 },
  { id: 'projects', label: 'Projects', glyph: '🛠️', color: '#E3A63B', w: 700, h: 500 },
  { id: 'certs', label: 'Certs', glyph: '🏅', color: '#8FA3B8', w: 680, h: 480 },
  { id: 'skills', label: 'Skills', glyph: '🌲', color: '#8fb078', w: 560, h: 460 },
  { id: 'resume', label: 'Résumé.pdf', glyph: '📎', color: '#D9682B', w: 420, h: 260 },
  { id: 'photos', label: 'Photos', glyph: '📷', color: '#EDE8E0', w: 640, h: 500 },
  { id: 'contact', label: 'CampMail', glyph: '✉️', color: '#FFD58A', w: 620, h: 480 },
  { id: 'terminal', label: 'Terminal', glyph: '>_', color: '#1E1F22', w: 640, h: 420 },
];
const VENDOR: Record<string, string> = { gcp: '#4285F4', azure: '#0078D4', aws: '#FF9900', 'google-ai': '#8E64D9', other: '#8FA3B8' };
const thumb = (s: string) => s.replace(/\.webp$/, '-thumb.webp');

interface Win { id: AppId; x: number; y: number; z: number }

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

function Link({ href, children }: { href: string; children: ReactNode }) {
  const ext = /^https?:/.test(href);
  return <a className="kos-link" href={href} {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{children}</a>;
}

function About() {
  const p = content.profile;
  return (<div>
    <h2>{p.name}</h2>
    <div>{p.roles.map((r) => <span className="kos-tag" key={r}>{r}</span>)}</div>
    <div className="kos-tagline">{p.tagline}</div>
    {p.bio.map((b, i) => <p key={i}>{b}</p>)}
    <div className="kos-stats">{p.stats.map((s) => <div className="kos-stat" key={s.label}><b>{s.value}</b><span className="kos-muted">{s.label}</span></div>)}</div>
    <p className="kos-muted">📍 {p.location} · 🟢 {p.status}</p>
  </div>);
}
function Experience() {
  return (<div className="kos-tl">{content.experience.map((j) => (
    <div className="kos-job" key={j.id}>
      <h3>{j.role} · {j.company}</h3>
      <div className="kos-muted">{j.start} – {j.end}{j.location ? ' · ' + j.location : ''}</div>
      {j.summary && <p>{j.summary}</p>}
      <ul>{j.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
    </div>))}</div>);
}
function Projects() {
  return (<div className="kos-grid">{content.projects.map((p) => (
    <div className="kos-card" key={p.id}>
      <h3>{p.name}</h3><div className="kos-muted">{p.tagline}</div>
      <p>{p.description}</p>
      {p.metric && <div className="kos-metric">★ {p.metric}</div>}
      <div>{p.tags.map((t) => <span className="kos-tag" key={t}>{t}</span>)}</div>
      {p.href && <Link href={p.href}>Open ↗</Link>}
    </div>))}</div>);
}
function Certs() {
  const [feat, rest] = useMemo(() => [content.certs.filter((c) => c.featured), content.certs.filter((c) => !c.featured)], []);
  const card = (c: typeof content.certs[number]) => (
    <div className="kos-card" key={c.id} style={{ '--c': VENDOR[c.vendor] } as CSSProperties}>
      <div className="kos-muted">{c.issuer}</div><h3>{c.name}</h3><p>{c.blurb}</p>
    </div>);
  return (<div><div className="kos-grid">{feat.map(card)}</div>
    {rest.length > 0 && <><h3 style={{ margin: '16px 0 8px' }}>Also certified</h3><div className="kos-grid">{rest.map(card)}</div></>}</div>);
}
function Skills() {
  return (<div>{content.skills.map((g) => (<div key={g.title}><h3>{g.title}</h3>
    <div className="kos-chips">{g.items.map((i) => <span className="kos-chip" key={i}>{i}</span>)}</div></div>))}</div>);
}
function Photos() {
  const [open, setOpen] = useState<number | null>(null);
  if (open !== null) { const ph = content.photos[open]; return (<div>
    <button className="kos-link" onClick={() => setOpen(null)}>← Back</button>
    <img className="kos-big" src={ph.src} alt={ph.alt} style={{ marginTop: 8 }} /><p className="kos-muted">{ph.caption}</p></div>); }
  return (<div className="kos-photos">{content.photos.map((ph, i) => (
    <button className="kos-ph" key={ph.id} onClick={() => setOpen(i)} aria-label={'Open photo: ' + ph.caption}>
      <img src={thumb(ph.src)} alt={ph.alt} loading="lazy" /></button>))}</div>);
}
function Resume() {
  return (<div><h2>Résumé</h2><p className="kos-muted">{content.profile.name} — PDF</p>
    <a className="kos-link" href={content.profile.resumePdf} target="_blank" rel="noopener noreferrer">Open ↗</a>{' '}
    <a className="kos-link" href={content.profile.resumePdf} download>Download ⬇</a></div>);
}
const MAIL_PRESETS = [
  {
    id: 'work',
    label: '💼 Working together',
    subject: 'Working together',
    body: `What you're building:\n\nWhere you think I'd fit:\n\nRough timing / team:\n`,
  },
  {
    id: 'cloud',
    label: '☁️ Cloud / QA / AI',
    subject: 'Quick chat — Cloud / QA / AI',
    body: `Hey Kim,\n\nI was exploring your van portfolio and wanted to ask about:\n\n`,
  },
  {
    id: 'van',
    label: '🚐 Van build',
    subject: 'Your Pacifica camper build!',
    body: `Hey Kim & Wing,\n\nLoved the minivan camper setup! Quick question:\n\n`,
  },
  {
    id: 'feedback',
    label: '🐞 Feedback',
    subject: 'Feedback on binasoy.kim',
    body: `What worked well:\n\nWhat felt off or broken:\n`,
  },
  {
    id: 'other',
    label: '✏️ Blank',
    subject: '',
    body: '',
  },
] as const;

type MailPresetId = typeof MAIL_PRESETS[number]['id'];
const MAX_MSG = 2000;

function Contact() {
  const emailLink = content.profile.links.find((l) => l.kind === 'email');
  const toAddr = (emailLink?.href.replace(/^mailto:/, '') || 'hello@binasoy.kim');
  const socials = content.profile.links.filter((l) => l.kind !== 'email' && l.kind !== 'resume');

  const [preset, setPreset] = useState<MailPresetId | null>('work');
  const [from, setFrom] = useState('');
  const [subject, setSubject] = useState<string>(MAIL_PRESETS[0].subject);
  const [message, setMessage] = useState<string>(MAIL_PRESETS[0].body);
  const [subjectTouched, setSubjectTouched] = useState(false);
  const [messageTouched, setMessageTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'editing' | 'sending' | 'sent'>('editing');
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);

  const choosePreset = (id: MailPresetId) => {
    const p = MAIL_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPreset(id);
    if (!subjectTouched || subject.trim() === '' || MAIL_PRESETS.some((m) => m.subject === subject)) {
      setSubject(p.subject);
      setSubjectTouched(false);
    }
    if (!messageTouched || message.trim() === '' || MAIL_PRESETS.some((m) => m.body === message)) {
      setMessage(p.body);
      setMessageTouched(false);
      setError(null);
    }
  };

  const fullBody = useMemo(() => {
    const replyLine = from.trim() ? `Reply-To: ${from.trim()}\n\n` : '';
    return replyLine + message.trim();
  }, [from, message]);

  const mailtoHref = useMemo(() => {
    const params = new URLSearchParams();
    if (subject.trim()) params.set('subject', subject.trim());
    if (fullBody.trim()) params.set('body', fullBody);
    const q = params.toString().replace(/\+/g, '%20');
    return `mailto:${toAddr}${q ? '?' + q : ''}`;
  }, [toAddr, subject, fullBody]);

  const gmailHref = useMemo(() => {
    const params = new URLSearchParams({ view: 'cm', fs: '1', to: toAddr });
    if (subject.trim()) params.set('su', subject.trim());
    if (fullBody.trim()) params.set('body', fullBody);
    return `https://mail.google.com/mail/?${params.toString()}`;
  }, [toAddr, subject, fullBody]);

  const outlookHref = useMemo(() => {
    const params = new URLSearchParams({ to: toAddr });
    if (subject.trim()) params.set('subject', subject.trim());
    if (fullBody.trim()) params.set('body', fullBody);
    return `https://outlook.office.com/mail/deeplink/compose?${params.toString()}`;
  }, [toAddr, subject, fullBody]);

  const copyAddr = async () => {
    try { await navigator.clipboard.writeText(toAddr); setCopiedAddr(true); setTimeout(() => setCopiedAddr(false), 2000); } catch { /* ignore */ }
  };

  const copyFull = async () => {
    const formatted = `To: ${toAddr}\n${subject.trim() ? 'Subject: ' + subject.trim() + '\n' : ''}\n${fullBody}`;
    try { await navigator.clipboard.writeText(formatted); setCopiedFull(true); setTimeout(() => setCopiedFull(false), 2000); } catch { /* ignore */ }
  };

  const handleSend = () => {
    if (!message.trim()) {
      setError('Add a note first — anything at all.');
      return;
    }
    setError(null);
    setPhase('sending');
    setTimeout(() => {
      setPhase('sent');
      try {
        const a = document.createElement('a');
        a.href = mailtoHref;
        a.click();
      } catch { /* fallback buttons in 'sent' view cover this */ }
    }, 350);
  };

  return (
    <div className="kos-mail">
      <div className="kos-mail__headers">
        <div className="kos-mail__row">
          <span className="kos-mail__lbl">To</span>
          <span className="kos-mail__to">{content.profile.shortName} Binasoy &lt;{toAddr}&gt;</span>
          <button type="button" className="kos-mail__copy" onClick={copyAddr} aria-label="Copy email address">
            {copiedAddr ? '✓ Copied!' : '📋 Copy address'}
          </button>
        </div>
        <label className="kos-mail__row">
          <span className="kos-mail__lbl">From</span>
          <input
            type="email"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="your@email.com (optional, so I can reply)"
            autoComplete="email"
          />
        </label>
        <label className="kos-mail__row">
          <span className="kos-mail__lbl">Subject</span>
          <input
            type="text"
            value={subject}
            maxLength={160}
            onChange={(e) => { setSubjectTouched(true); setSubject(e.target.value); }}
            placeholder="Subject"
          />
        </label>
      </div>

      <div className="kos-mail__bar">
        <span className="kos-mail__bar-lbl">Template</span>
        <div className="kos-mail__presets" role="group" aria-label="Email templates">
          {MAIL_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={preset === p.id}
              className={'kos-mail__pill' + (preset === p.id ? ' is-on' : '')}
              onClick={() => choosePreset(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button type="button" className="kos-mail__send" onClick={handleSend} disabled={phase === 'sending'}>
          {phase === 'sending' ? 'Opening…' : 'Send ✉️'}
        </button>
      </div>

      {phase === 'sent' ? (
        <div className="kos-mail__sent" role="status">
          <h3>📨 Ready to send to {toAddr}</h3>
          <p className="kos-muted">
            Your default mail app was opened with your note pre-filled. No mail app configured on this device? Send directly or copy with one click:
          </p>
          <div className="kos-mail__actions">
            <a className="kos-link" href={gmailHref} target="_blank" rel="noopener noreferrer">Open in Gmail ↗</a>
            <a className="kos-link" href={outlookHref} target="_blank" rel="noopener noreferrer">Open in Outlook ↗</a>
            <a className="kos-link" href={mailtoHref}>Default mail app ↗</a>
            <button type="button" className="kos-mail__copy" onClick={copyFull}>
              {copiedFull ? '✓ Copied full email!' : '📋 Copy full email'}
            </button>
            <button type="button" className="kos-mail__copy" onClick={() => setPhase('editing')}>← Edit note</button>
          </div>
        </div>
      ) : (
        <div className="kos-mail__compose">
          <textarea
            aria-label="Message"
            value={message}
            maxLength={MAX_MSG}
            placeholder="Write anything at all…"
            aria-invalid={error ? true : undefined}
            onChange={(e) => { setMessageTouched(true); setMessage(e.target.value); if (error) setError(null); }}
          />
          {error && <p className="kos-mail__err" role="alert">{error}</p>}
        </div>
      )}

      <div className="kos-mail__status">
        <span>{phase === 'editing' ? 'Draft' : phase === 'sending' ? 'Opening mail client…' : 'Ready'} · {message.length} / {MAX_MSG}</span>
        <span className="kos-mail__socials">
          {socials.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>
          ))}
        </span>
      </div>
    </div>
  );
}

function Terminal({ onExit }: { onExit: () => void }) {
  const [lines, setLines] = useState<string[]>(['KimOS terminal — type "help"']);
  const [val, setVal] = useState('');
  const [typing, setTyping] = useState<string | null>(null);
  const [shown, setShown] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    if (typing === null) return;
    if (shown >= typing.length) { setLines((l) => [...l, typing]); setTyping(null); return; }
    const t = setTimeout(() => setShown((s) => Math.min(typing.length, s + 6)), 12);
    return () => clearTimeout(t);
  }, [typing, shown]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [lines, shown]);

  const run = (raw: string): string | null => {
    const c = raw.trim().toLowerCase();
    const p = content.profile;
    switch (c) {
      case '': return '';
      case 'help': return 'commands: help, whoami, ls, cat about.txt, projects, certs, wingwing, clear, exit';
      case 'whoami': return p.name + ' — ' + p.roles.join(' · ');
      case 'ls': return 'about.txt  experience/  projects/  certs/  skills/  photos/  resume.pdf';
      case 'cat about.txt': return p.tagline + '\n\n' + p.bio.join('\n\n');
      case 'projects': return content.projects.map((x) => '• ' + x.name + ' — ' + x.tagline).join('\n');
      case 'certs': return content.certs.map((x) => '• ' + x.issuer + ': ' + x.name).join('\n');
      case 'wingwing': return '🐾 ' + p.partner + ' is the best co-pilot, and the reason every campsite feels like home. 💛';
      case 'exit': onExit(); return '';
      default: return c + ': command not found. try "help"';
    }
  };
  const submit = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || typing !== null) return;
    const cmd = val; setVal('');
    if (cmd.trim().toLowerCase() === 'clear') { setLines([]); return; }
    const out = run(cmd);
    setLines((l) => [...l, '$ ' + cmd]);
    if (out) { setShown(0); setTyping(out); }
  };
  return (<div className="kos-term" onClick={() => inputRef.current?.focus()}>
    {lines.map((l, i) => <div key={i}>{l}</div>)}
    {typing !== null && <div>{typing.slice(0, shown)}</div>}
    <div>$ <input ref={inputRef} value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={submit} aria-label="Terminal input" spellCheck={false} autoCapitalize="off" autoComplete="off" /></div>
    <div ref={endRef} /></div>);
}

function Window({ win, app, modal, onClose, onFocus, onMove, children }: {
  win: Win; app: typeof APPS[number]; modal: boolean; onClose: () => void; onFocus: () => void;
  onMove: (x: number, y: number) => void; children: ReactNode;
}) {
  const drag = useRef<{ dx: number; dy: number; k: number } | null>(null);
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
  return (
    <div className="kos-win" role="dialog" aria-label={app.label} style={{ left: win.x, top: win.y, width: app.w, height: app.h, zIndex: win.z, maxWidth: '100%', maxHeight: '100%' }}
      onPointerDown={onFocus}>
      <div className="kos-title" onPointerDown={down} onPointerMove={move} onPointerUp={() => { drag.current = null; }}>
        <span aria-hidden="true">{app.glyph}</span><span className="kos-t">{app.label}</span>
        <button className="kos-x" onClick={onClose} aria-label={'Close ' + app.label}>✕</button>
      </div>
      <div className="kos-body" style={app.id === 'terminal' || app.id === 'contact' ? { padding: 0 } : undefined}>{children}</div>
    </div>);
}

export function KimOS({ mode = 'screen', onExit }: KimOSProps) {
  const modal = mode === 'modal';
  const [wins, setWins] = useState<Win[]>([]);
  const zRef = useRef(10);
  const clock = useClock();
  const rootRef = useRef<HTMLDivElement>(null);

  const open = useCallback((id: AppId) => {
    setWins((ws) => {
      const z = ++zRef.current;
      if (modal) return [{ id, x: 0, y: 0, z }];
      if (ws.some((w) => w.id === id)) return ws.map((w) => (w.id === id ? { ...w, z } : w));
      const n = ws.length;
      return [...ws, { id, x: 330 + n * 30, y: 50 + n * 28, z }];
    });
  }, [modal]);
  const close = useCallback((id: AppId) => setWins((ws) => ws.filter((w) => w.id !== id)), []);
  const focus = (id: AppId) => setWins((ws) => { const z = ++zRef.current; return ws.map((w) => (w.id === id ? { ...w, z } : w)); });

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape' || !wins.length) return;
    e.stopPropagation();
    const top = wins.reduce((a, b) => (a.z > b.z ? a : b));
    close(top.id);
  };

  const body = (id: AppId) => {
    switch (id) {
      case 'about': return <About />; case 'experience': return <Experience />; case 'projects': return <Projects />;
      case 'certs': return <Certs />; case 'skills': return <Skills />; case 'resume': return <Resume />;
      case 'photos': return <Photos />; case 'contact': return <Contact />;
      case 'terminal': return <Terminal onExit={() => close('terminal')} />;
    }
  };

  return (
    <div ref={rootRef} className={'kos-root ' + (modal ? 'kos-modal' : 'kos-screen')} onKeyDown={onKey}>
      <Wallpaper />
      <div className="kos-bar" role="menubar">
        <span className="kos-brand">🏕 KimOS</span>
        <span className="kos-sp" />
        <span aria-label="Wi-Fi: lake-wifi">📶 lake-wifi</span>
        <span aria-label="Battery 100 percent">🔋 100%</span>
        <span>{clock}</span>
        {onExit && <button onClick={onExit} aria-label="Close lid">⏻ Close lid</button>}
      </div>
      <div className="kos-desk">
        <div className="kos-icons" role="list">
          {APPS.map((a) => (
            <button key={a.id} role="listitem" className="kos-icon" onClick={() => open(a.id)} aria-label={'Open ' + a.label}>
              <i style={{ '--c': a.color, color: a.id === 'terminal' ? '#9be59b' : undefined, fontSize: a.id === 'terminal' ? 20 : undefined, fontFamily: a.id === 'terminal' ? 'monospace' : undefined } as CSSProperties} aria-hidden="true">{a.glyph}</i>
              {a.label}
            </button>))}
        </div>
        {wins.map((w) => {
          const app = APPS.find((a) => a.id === w.id)!;
          return (<Window key={w.id} win={w} app={app} modal={modal} onClose={() => close(w.id)} onFocus={() => focus(w.id)}
            onMove={(x, y) => setWins((ws) => ws.map((q) => (q.id === w.id ? { ...q, x, y } : q)))}>{body(w.id)}</Window>);
        })}
      </div>
    </div>);
}

export default KimOS;
