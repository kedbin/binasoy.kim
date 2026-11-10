import { useEffect, useState } from 'react';
import { useScene } from '../state/store';

const KEY = 'kb:coach';

/** Subtle one-line hint in the seat view. Auto-fades after 4.5s or on any interaction. */
export function CoachMark() {
  const ready = useScene((s) => s.arrived === 'seat' && s.view === 'seat');
  const [seen, setSeen] = useState(() => { try { return localStorage.getItem(KEY) === '1'; } catch { return true; } });
  useEffect(() => {
    if (seen || !ready) return;
    const dismiss = () => { try { localStorage.setItem(KEY, '1'); } catch { /* private mode */ } setSeen(true); };
    const auto = setTimeout(dismiss, 4500);
    const arm = setTimeout(() => {
      window.addEventListener('pointerdown', dismiss, { once: true });
      window.addEventListener('keydown', dismiss, { once: true });
      window.addEventListener('wheel', dismiss, { once: true });
    }, 500);
    const unsub = useScene.subscribe((s) => { if (s.view !== 'seat') dismiss(); });
    return () => {
      clearTimeout(auto); clearTimeout(arm); unsub();
      window.removeEventListener('pointerdown', dismiss); window.removeEventListener('keydown', dismiss); window.removeEventListener('wheel', dismiss);
    };
  }, [seen, ready]);
  if (seen || !ready) return null;
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  return (
    <div className="coach" role="note">
      {touch ? 'Tap items in the van to explore · drag to look around' : 'Hover & click items in the van to explore · drag to look around'}
    </div>
  );
}
