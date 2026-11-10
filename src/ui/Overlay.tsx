// OWNER: O5. HUD = name chip (top-left) · settings menu (top-right) · "Back to the van" (when away from the seat)
// · one dock of places (bottom-centre) · coach mark · aria-live announcer · DOM panels.
// Keyboard: 1–5 jump to places, Esc = back, arrows = look (look.ts). Intro auto-advances into the van.
import '../styles/hud.css';
import { useEffect, useState } from 'react';
import { useScene, type View } from '../state/store';
import { Panels } from './panels/Panels';
import { Dock } from './Dock';
import { Settings } from './Settings';
import { CoachMark } from './CoachMark';
import { PLACES, placeOf } from './places';

const AUTO_ENTER_MS = 2600;
/** Auto-advance only once per page load; ?still disables it (screenshots). */
let autoDone = new URLSearchParams(location.search).has('still');

function announce(v: View) {
  if (v === 'seat') return 'Back in the van, lying on the bed facing the lake. Choose a place from the dock, or press 1 to 5.';
  if (v === 'intro') return '';
  return placeOf(v)?.announce ?? '';
}

function isTyping(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(el.tagName) || !!el.closest?.('.kos-root'));
}

/** Intro: the reveal dollies in, then we climb in automatically (or sooner on any click / scroll / key). */
function useIntroAutoEnter() {
  const revealed = useScene((s) => s.revealed);
  const view = useScene((s) => s.view);
  useEffect(() => {
    if (!revealed || view !== 'intro' || autoDone) return;
    const go = () => { autoDone = true; if (useScene.getState().view === 'intro') useScene.getState().goTo('seat'); };
    const t = setTimeout(go, useScene.getState().reducedMotion ? 1200 : AUTO_ENTER_MS);
    const opts = { once: true } as const;
    // ignore the first ~400ms so the click that might have been on the loader doesn't skip the reveal
    const arm = setTimeout(() => {
      window.addEventListener('pointerdown', go, opts);
      window.addEventListener('wheel', go, opts);
      window.addEventListener('keydown', go, opts);
    }, 400);
    return () => {
      clearTimeout(t); clearTimeout(arm);
      window.removeEventListener('pointerdown', go); window.removeEventListener('wheel', go); window.removeEventListener('keydown', go);
    };
  }, [revealed, view]);
}

function useKeys() {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useScene.getState();
      if (!s.revealed) return;
      if (e.key === 'Escape') { if (s.view !== 'seat' && s.view !== 'intro') { s.back(); } return; }
      if (isTyping(e.target)) return;
      const p = PLACES.find((x) => x.key === e.key);
      if (p) { e.preventDefault(); s.goTo(p.view); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
}

export function Overlay() {
  const view = useScene((s) => s.view);
  const revealed = useScene((s) => s.revealed);
  const moving = useScene((s) => s.transitioning && !s.reducedMotion);
  const back = useScene((s) => s.back);
  const [msg, setMsg] = useState('');
  useIntroAutoEnter();
  useKeys();
  useEffect(() => { const m = announce(view); if (m) setMsg(m); }, [view]);

  const away = view !== 'seat' && view !== 'intro';
  return (
    <div className={'hud' + (revealed ? ' is-revealed' : '') + (moving ? ' is-moving' : '')} data-view={view}>
      <div className="hud__pulse" aria-hidden="true" />
      <header className="hud__name">
        <strong>Kim &amp; Wing's</strong> <span>MiniVan</span>
      </header>
      <Settings />
      {away && (
        <button type="button" className="hud__back" onClick={back} aria-keyshortcuts="Escape">
          <span aria-hidden="true">←</span> Back to the van <kbd aria-hidden="true">Esc</kbd>
        </button>
      )}
      {view === 'intro' && revealed && (
        <button type="button" className="hud__enter" onClick={() => useScene.getState().goTo('seat')}>Climb in</button>
      )}
      <CoachMark />
      <Panels />
      {view !== 'intro' && <Dock />}
      <p className="sr-only" aria-live="polite" aria-atomic="true">{msg}</p>
    </div>
  );
}
