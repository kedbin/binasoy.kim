import { useEffect, useRef, useState } from 'react';
import { useScene, type Quality } from '../state/store';

const NEXT_Q: Record<Quality, Quality> = { high: 'mid', mid: 'low', low: 'high' };
const Q_LABEL: Record<Quality, string> = { high: 'High (Mirror + Bloom)', mid: 'Balanced', low: 'Battery Saver' };

export function Settings() {
  const [open, setOpen] = useState(false);
  const timeOfDay = useScene((s) => s.timeOfDay);
  const sound = useScene((s) => s.sound);
  const quality = useScene((s) => s.quality);
  const toggleTime = useScene((s) => s.toggleTime);
  const toggleSound = useScene((s) => s.toggleSound);
  const setQuality = useScene((s) => s.setQuality);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); btn.current?.focus(); } };
    window.addEventListener('pointerdown', away);
    window.addEventListener('keydown', key, true);
    root.current?.querySelector<HTMLButtonElement>('[role=menu] button')?.focus();
    return () => { window.removeEventListener('pointerdown', away); window.removeEventListener('keydown', key, true); };
  }, [open]);

  const quick = () => { localStorage.setItem('kb:mode', 'reader'); location.reload(); };
  const night = timeOfDay === 'night';
  return (
    <div className="settings" ref={root}>
      <button ref={btn} type="button" className="settings__toggle" aria-haspopup="menu" aria-expanded={open} aria-label="Settings" onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M4 7h10a2.5 2.5 0 0 0 5 0h1V5h-1a2.5 2.5 0 0 0-5 0H4zm0 12h3a2.5 2.5 0 0 0 5 0h8v-2h-8a2.5 2.5 0 0 0-5 0H4zm0-6h12a2.5 2.5 0 0 0 5 0v-2a2.5 2.5 0 0 0-5 0H4z" /></svg>
      </button>
      {open && (
        <div className="settings__menu" role="menu" aria-label="Scene settings">
          <button type="button" role="menuitemcheckbox" aria-checked={night} onClick={toggleTime}>
            <span aria-hidden="true">{night ? '☾' : '☀︎'}</span> {night ? 'Night' : 'Golden hour'}<small>Time of day</small>
          </button>
          <button type="button" role="menuitemcheckbox" aria-checked={sound} onClick={toggleSound}>
            <span aria-hidden="true">♪</span> {sound ? 'Sound on' : 'Sound off'}<small>Lake ambience</small>
          </button>
          <button type="button" role="menuitem" onClick={() => setQuality(NEXT_Q[quality])}>
            <span aria-hidden="true">✦</span> Graphics: {quality.toUpperCase()}<small>{Q_LABEL[quality]}</small>
          </button>
          <button type="button" role="menuitem" onClick={quick}>
            <span aria-hidden="true">≡</span> Quick view<small>Plain page, no 3D</small>
          </button>
        </div>
      )}
    </div>
  );
}
