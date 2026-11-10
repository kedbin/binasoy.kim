import { useEffect, useState } from 'react';
import { useScene } from '../state/store';

const KEY = 'kb:coach';

/** First-visit hint in the seat view. Dismissed by any interaction; remembered in localStorage. */
export function CoachMark() {
  const ready = useScene((s) => s.arrived === 'seat' && s.view === 'seat');
  const [seen, setSeen] = useState(() => { try { return localStorage.getItem(KEY) === '1'; } catch { return true; } });
  useEffect(() => {
    if (seen || !ready) return;
    const dismiss = () => { try { localStorage.setItem(KEY, '1'); } catch { /* private mode */ } setSeen(true); };
    // give it a moment on screen before any interaction counts
    const t = setTimeout(() => {
      window.addEventListener('pointerdown', dismiss, { once: true });
      window.addEventListener('keydown', dismiss, { once: true });
      window.addEventListener('wheel', dismiss, { once: true });
    }, 600);
    const unsub = useScene.subscribe((s) => { if (s.view !== 'seat') dismiss(); });
    return () => {
      clearTimeout(t); unsub();
      window.removeEventListener('pointerdown', dismiss); window.removeEventListener('keydown', dismiss); window.removeEventListener('wheel', dismiss);
    };
  }, [seen, ready]);
  if (seen || !ready) return null;
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  return (
    <div className="coach" role="note">
      <span className="coach__dot" aria-hidden="true" />
      <p>
        <strong>{touch ? 'Tap' : 'Click'} the glowing dots to explore</strong>
        <span>{touch ? 'Drag to look around' : 'Drag to look around · keys 1–5 jump to places'}</span>
      </p>
    </div>
  );
}
