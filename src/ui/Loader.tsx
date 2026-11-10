// Stage (b) loader. Takes over from the static pre-JS loader in index.html (#boot-loader), shows real progress
// (drei useProgress for assets + WarmUp for shader compile), then iris-reveals into the intro shot.
import { useProgress } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import { useScene } from '../state/store';
import { VanArt } from './VanArt';

const LINES = [
  'Inflating the raft…',
  'Hanging the fairy lights…',
  'Fluffing the pillows…',
  'Waiting for golden hour…',
  'Shooing the leaves off the sunroof…',
  'Warming up the laptop…',
];

/** Seconds without any progress before we assume WebGL is stuck and fall back to the reader.
 *  Generous: software GL (SwiftShader) can spend ~30s compiling shaders synchronously. */
const STALL_S = 90;

export function Loader() {
  const { active, progress } = useProgress();
  const ready = useScene((s) => s.sceneReady);
  const setLoaded = useScene((s) => s.setLoaded);
  const setRevealed = useScene((s) => s.setRevealed);
  const reduced = useScene((s) => s.reducedMotion);
  const [line, setLine] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'reveal' | 'gone'>('loading');
  const shown = useRef(0);
  const [, force] = useState(0);

  // Hand-off: remove the static loader once React is painting ours (same visuals, so no flash).
  useEffect(() => {
    const b = document.getElementById('boot-loader');
    if (b) { b.classList.add('is-handoff'); setTimeout(() => b.remove(), 400); }
  }, []);

  useEffect(() => {
    if (phase !== 'loading') return;
    const t = setInterval(() => setLine((l) => (l + 1) % LINES.length), 1900);
    return () => clearInterval(t);
  }, [phase]);

  // Assets count for 85%, compile/warm-up for the rest. Displayed value eases and never goes backwards.
  const assetsDone = !active && (progress >= 100 || progress === 0);
  const goal = ready ? 100 : Math.min(85, progress * 0.85) + (assetsDone ? 10 : 0);
  useEffect(() => {
    if (phase !== 'loading') return;
    let raf = 0;
    const tick = () => {
      shown.current += (goal - shown.current) * 0.12;
      if (goal - shown.current < 0.4) shown.current = goal;
      force((n) => n + 1);
      if (shown.current < goal) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [goal, phase]);

  useEffect(() => {
    if (!ready || phase !== 'loading') return;
    setLoaded(true);
    const t = setTimeout(() => { setPhase('reveal'); setRevealed(true); }, reduced ? 0 : 450);
    return () => clearTimeout(t);
  }, [ready, phase, reduced, setLoaded, setRevealed]);

  useEffect(() => {
    if (phase !== 'reveal') return;
    const t = setTimeout(() => setPhase('gone'), reduced ? 250 : 1300);
    return () => clearTimeout(t);
  }, [phase, reduced]);

  // Stall guard: if nothing finishes, hand over to the reader rather than spin forever.
  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => {
      if (useScene.getState().sceneReady) return;
      console.warn('[loader] scene did not become ready; showing the reader');
      document.documentElement.classList.remove('mode-3d');
      document.documentElement.classList.add('mode-reader');
    }, STALL_S * 1000);
    return () => clearTimeout(t);
  }, [ready, progress]);

  if (phase === 'gone') return null;
  const pct = Math.round(shown.current);
  return (
    <div className={'loader' + (phase === 'reveal' ? ' is-reveal' : '')} role="status" aria-live="polite" aria-busy={phase === 'loading'}>
      <div className="loader__card">
        <VanArt />
        <p className="loader__title">Setting up camp…</p>
        <div className="loader__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Loading the van">
          <span style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
        <p className="loader__line" key={line} aria-hidden="true">{ready ? 'Ready. Climbing in…' : LINES[line]}</p>
      </div>
    </div>
  );
}
