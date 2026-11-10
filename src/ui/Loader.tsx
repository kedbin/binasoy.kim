import { useProgress } from '@react-three/drei';
import { useEffect, useState } from 'react';
import { useScene } from '../state/store';
import { VanArt } from './VanArt';

const STEPS = [
  { stage: 2, label: 'Algonquin lake & 8,000 autumn trees' },
  { stage: 3, label: 'Pacifica camper bed & fairy lights' },
  { stage: 4, label: 'Inflating Kim & Wingwing’s raft' },
  { stage: 5, label: 'Booting KimOS & lake reflections' },
] as const;

const HONKS = [
  '🎺 Beep beep! Wingwing has the camp snacks ready…',
  '🎺 Honk! Next stop: Algonquin golden hour…',
  '🎺 Beep! Don’t forget to check CampMail on the laptop!',
];

/** Hard cap so the loader never stalls even if WebGL shader compilation is slow. */
const MAX_WAIT_MS = 4500;
const HOLD_MS = 160;

function markReady() {
  document.documentElement.dataset.ready = '1';
  (window as unknown as { __ready?: boolean }).__ready = true;
}

const STAGE_TARGET: Record<number, number> = { 1: 30, 2: 54, 3: 76, 4: 91, 5: 98 };

export function Loader() {
  const { progress } = useProgress();
  const loadStage = useScene((s) => s.loadStage);
  const sceneReady = useScene((s) => s.sceneReady);
  const reduced = useScene((s) => s.reducedMotion);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'reveal' | 'gone'>('loading');
  const [timedOut, setTimedOut] = useState(false);
  const [displayPct, setDisplayPct] = useState(22);
  const [honkIdx, setHonkIdx] = useState<number | null>(null);
  const [honkAnim, setHonkAnim] = useState(false);

  useEffect(() => {
    const b = document.getElementById('boot-loader');
    if (b) { b.classList.add('is-handoff'); setTimeout(() => b.remove(), 220); }
    const t = setTimeout(() => setTimedOut(true), MAX_WAIT_MS);
    return () => clearTimeout(t);
  }, []);

  const done = sceneReady || timedOut;

  // Target percentage from real mount stage + drei asset progress
  const stageGoal = STAGE_TARGET[loadStage] ?? 95;
  const assetBonus = Math.min(6, Math.round(progress * 0.06));
  const targetPct = phase !== 'loading' || done ? 100 : Math.min(99, Math.max(stageGoal, 22 + assetBonus));

  // Smoothly tick displayPct upward every 45ms so the number and bar are ALWAYS visibly moving
  useEffect(() => {
    if (displayPct >= targetPct) return;
    const step = targetPct === 100 ? Math.max(3, Math.ceil((100 - displayPct) * 0.35)) : Math.max(1, Math.ceil((targetPct - displayPct) * 0.18));
    const t = setTimeout(() => setDisplayPct((p) => Math.min(targetPct, p + step)), 45);
    return () => clearTimeout(t);
  }, [displayPct, targetPct]);

  useEffect(() => {
    if (phase === 'loading' && done) {
      setDisplayPct(100);
      useScene.getState().setLoaded(true);
      setPhase('ready');
    }
  }, [phase, done]);

  useEffect(() => {
    if (phase !== 'ready') return;
    const t = setTimeout(() => { setPhase('reveal'); useScene.getState().setRevealed(true); markReady(); }, reduced ? 0 : HOLD_MS);
    return () => clearTimeout(t);
  }, [phase, reduced]);

  useEffect(() => {
    if (phase !== 'reveal') return;
    const t = setTimeout(() => setPhase('gone'), reduced ? 120 : 450);
    return () => clearTimeout(t);
  }, [phase, reduced]);

  const triggerHonk = () => {
    setHonkIdx((i) => (i === null ? 0 : (i + 1) % HONKS.length));
    setHonkAnim(true);
    setTimeout(() => setHonkAnim(false), 380);
  };

  if (phase === 'gone') return null;
  const activeStep = STEPS.find((s) => loadStage < s.stage) ?? STEPS[STEPS.length - 1];

  return (
    <div className={'loader' + (phase === 'reveal' ? ' is-reveal' : '')} role="status" aria-live="polite" aria-busy={phase === 'loading'}>
      <div className="loader__card">
        <VanArt onClick={triggerHonk} honked={honkAnim} />
        <div className="loader__head">
          <p className="loader__title">Driving to the campsite…</p>
          <span className="loader__pct" aria-hidden="true">{displayPct}%</span>
        </div>
        <div className="loader__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={displayPct} aria-label="Loading the van">
          <span style={{ transform: `scaleX(${displayPct / 100})` }} />
        </div>
        <ul className="loader__steps" aria-hidden="true">
          {STEPS.map((s) => {
            const isDone = done || loadStage > s.stage;
            const isCurr = !isDone && activeStep.stage === s.stage;
            return (
              <li key={s.stage} className={isDone ? 'is-done' : isCurr ? 'is-curr' : ''}>
                <i className="loader__step-ic">{isDone ? '✓' : isCurr ? '◉' : '○'}</i>
                <span>{s.label}</span>
              </li>
            );
          })}
        </ul>
        <p className="loader__line" aria-hidden="true">
          {phase !== 'loading'
            ? 'Camp is ready — climbing into the back…'
            : honkIdx !== null
              ? HONKS[honkIdx]
              : 'Tip: tap the minivan to honk while we park by the lake'}
        </p>
      </div>
    </div>
  );
}
