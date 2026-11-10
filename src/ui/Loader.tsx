// Stage (b) loader. Takes over from the static pre-JS loader in index.html (#boot-loader), shows real progress
// (drei useProgress for assets + WarmUp for shader compile), then iris-reveals into the intro shot.
// It can never stall on a working page: a hard cap (MAX_WAIT_MS after mount) reveals even if useProgress never
// reports or WarmUp never fires. On reveal it sets <html data-ready="1"> and window.__ready for scripts/tests.
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

/** Reveal no later than this after the loader mounts, whatever useProgress / WarmUp say. */
const MAX_WAIT_MS = 8000;
/** Pause on "Ready" (bar at 100%) before the iris opens. */
const HOLD_MS = 450;

function markReady() {
  document.documentElement.dataset.ready = '1';
  (window as unknown as { __ready?: boolean }).__ready = true;
}

export function Loader() {
  const { active, progress } = useProgress();
  const sceneReady = useScene((s) => s.sceneReady);
  const reduced = useScene((s) => s.reducedMotion);
  const [line, setLine] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'reveal' | 'gone'>('loading');
  const [timedOut, setTimedOut] = useState(false);
  const best = useRef(4);

  // Hand-off: remove the static loader once React is painting ours (same visuals, so no flash).
  useEffect(() => {
    const b = document.getElementById('boot-loader');
    if (b) { b.classList.add('is-handoff'); setTimeout(() => b.remove(), 400); }
    const t = setTimeout(() => setTimedOut(true), MAX_WAIT_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== 'loading') return;
    const t = setInterval(() => setLine((l) => (l + 1) % LINES.length), 1900);
    return () => clearInterval(t);
  }, [phase]);

  const done = sceneReady || timedOut;

  // loading → ready (bar 100%, "Ready") → reveal (iris) → gone. Each step is a timer owned by its phase, so
  // later state changes (timeOfDay, goTo, re-renders) can't cancel the chain.
  useEffect(() => {
    if (phase === 'loading' && done) {
      if (timedOut && !sceneReady) console.warn('[loader] warm-up still running after', MAX_WAIT_MS, 'ms; revealing anyway');
      useScene.getState().setLoaded(true);
      setPhase('ready');
    }
  }, [phase, done, timedOut, sceneReady]);
  useEffect(() => {
    if (phase !== 'ready') return;
    const t = setTimeout(() => { setPhase('reveal'); useScene.getState().setRevealed(true); markReady(); }, reduced ? 0 : HOLD_MS);
    return () => clearTimeout(t);
  }, [phase, reduced]);
  useEffect(() => {
    if (phase !== 'reveal') return;
    const t = setTimeout(() => setPhase('gone'), reduced ? 250 : 1300);
    return () => clearTimeout(t);
  }, [phase, reduced]);

  // Progress: assets 0–85%, assets settled +10%, warm-up done = 100%. Never goes backwards; the bar's
  // easing is a CSS transition (no rAF loop that compile-heavy frames could starve).
  const assetsDone = !active && (progress >= 100 || progress === 0);
  const raw = phase !== 'loading' ? 100 : Math.min(85, progress * 0.85) + (assetsDone ? 10 : 0);
  best.current = Math.max(best.current, raw);
  const pct = Math.round(best.current);

  if (phase === 'gone') return null;
  return (
    <div className={'loader' + (phase === 'reveal' ? ' is-reveal' : '')} role="status" aria-live="polite" aria-busy={phase === 'loading'}>
      <div className="loader__card">
        <VanArt />
        <p className="loader__title">Setting up camp…</p>
        <div className="loader__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Loading the van">
          <span style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
        <p className="loader__line" key={phase === 'loading' ? line : 'ready'} aria-hidden="true">{phase === 'loading' ? LINES[line] : 'Ready. Climbing in…'}</p>
      </div>
    </div>
  );
}
