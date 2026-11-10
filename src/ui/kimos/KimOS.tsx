import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, KeyboardEvent, PointerEvent as RPointerEvent, ReactNode } from 'react';
import { content } from '../../content';
import { classify, EMAIL_RE, FAIL_COPY, LIMITS, NEEDS_FALLBACK, postContact } from './contact';
import type { ContactPayload, FailReason, TemplateId } from './contact';
import { useTurnstile } from './turnstile';
import { Trailhead } from './Trailhead';
import type { TrailNav } from './Trailhead';
import { Terminal } from './Terminal';
import type { PageId } from './pages';
import './kimos.css';

export interface KimOSProps { mode?: 'screen' | 'modal'; onExit?: () => void }

// ---------------------------------------------------------------------------------------------
// Desktop: one browser app (Trailhead) carries all portfolio pages; CampMail is the contact app;
// Photos + Terminal are the flavour items; "Back to the van" leaves the laptop (onExit).
// ---------------------------------------------------------------------------------------------
type AppId = 'trailhead' | 'mail' | 'photos' | 'terminal';
interface AppDef { id: AppId; label: string; title: string; glyph: string; color: string; w: number; h: number }
const APPS: AppDef[] = [
  { id: 'trailhead', label: 'Trailhead', title: 'Trailhead', glyph: '🧭', color: '#8fb078', w: 900, h: 680 },
  { id: 'mail', label: 'CampMail', title: 'CampMail — New note', glyph: '✉️', color: '#FFD58A', w: 660, h: 560 },
  { id: 'photos', label: 'Photos', title: 'Photos — van life', glyph: '📷', color: '#EDE8E0', w: 660, h: 520 },
  { id: 'terminal', label: 'Terminal', title: 'Terminal', glyph: '>_', color: '#1E1F22', w: 660, h: 460 },
];
const APP_POS: Record<AppId, { x: number; y: number }> = {
  trailhead: { x: 150, y: 22 }, mail: { x: 380, y: 60 }, photos: { x: 300, y: 90 }, terminal: { x: 420, y: 180 },
};

const thumb = (s: string) => s.replace(/\.webp$/, '-thumb.webp');
const toAddr = (content.profile.links.find((l) => l.kind === 'email')?.href.replace(/^mailto:/, '') || '').trim();

interface Win { id: AppId; x: number; y: number; z: number; nav?: TrailNav }

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
      case 'trailhead': return <Trailhead nav={w.nav} reduced={reduced} onMail={() => open('mail')} />;
      case 'mail': return <CampMail reduced={reduced} onDone={() => close('mail')} />;
      case 'photos': return <Photos />;
      case 'terminal': return <Terminal onClose={() => close('terminal')} openPage={(p) => open('trailhead', p)} openMail={() => open('mail')} />;
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
