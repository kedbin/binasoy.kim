import { useEffect, useState } from 'react';
import { useScene } from '../state/store';
import { VanArt } from './VanArt';
import { useLoad, MOUNT_STEPS } from '../app/loadState';

/** Checklist rows; a row is done once the mount step passes `stage` (the last one once shaders are compiled). */
const STEPS = [
  { stage: 4, label: 'Algonquin lake & 8,000 autumn trees' },
  { stage: 5, label: 'Pacifica camper bed & fairy lights' },
  { stage: 6, label: 'Inflating Kim & Wingwing’s raft' },
  { stage: MOUNT_STEPS + 1, label: 'Booting KimOS & lake reflections' },
] as const;

const HONKS = [
  '🎺 Beep beep! Wingwing has the camp snacks ready…',
  '🎺 Honk! Next stop: Algonquin golden hour…',
  '🎺 Beep! Don’t forget to check CampMail on the laptop!',
];

/**
 * Last resort only. WarmUp reveals as soon as the shaders are built and has its own stall detection; revealing
 * earlier than that shows a scene that freezes while it compiles, which is worse than a moving loader.
 */
const MAX_WAIT_MS = 45000;
/** Bar range owned by the React loader (the static boot loader covers the JS download before it). */
const PCT_MIN = 22;
/** While real progress is between updates the bar creeps ahead by at most this much, so it never sits still. */
const CREEP = 5;
const HOLD_MS = 160;

function markReady() {
  document.documentElement.dataset.ready = '1';
  (window as unknown as { __ready?: boolean }).__ready = true;
}

export function Loader() {
  const progress = useLoad((s) => s.progress);
  const compiled = useLoad((s) => s.phase === 'warm' || s.phase === 'ready');
  const loadStage = useLoad((s) => (compiled ? MOUNT_STEPS + 1 : s.step));
  const sceneReady = useScene((s) => s.sceneReady);
  const reduced = useScene((s) => s.reducedMotion);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'reveal' | 'gone'>('loading');
  const [timedOut, setTimedOut] = useState(false);
  const [displayPct, setDisplayPct] = useState(PCT_MIN);
  const [honkIdx, setHonkIdx] = useState<number | null>(null);
  const [honkAnim, setHonkAnim] = useState(false);

  useEffect(() => {
    const b = document.getElementById('boot-loader');
    if (b) { b.classList.add('is-handoff'); setTimeout(() => b.remove(), 220); }
    const t = setTimeout(() => setTimedOut(true), MAX_WAIT_MS);
    return () => clearTimeout(t);
  }, []);

  const done = sceneReady || timedOut;

  // Real progress: mounted scene groups, then the share of shader programs the GPU has finished building.
  const realPct = Math.round(PCT_MIN + (99 - PCT_MIN) * progress);
  const targetPct = phase !== 'loading' || done ? 100 : Math.min(99, realPct);

  // Ease toward the target; once there, creep slowly (bounded) so the bar and number keep moving between updates.
  useEffect(() => {
    if (displayPct >= 100) return;
    const behind = displayPct < targetPct;
    if (!behind && displayPct >= Math.min(99, targetPct + CREEP)) return;
    const step = targetPct === 100 ? Math.max(3, Math.ceil((100 - displayPct) * 0.35)) : behind ? Math.max(1, Math.ceil((targetPct - displayPct) * 0.18)) : 1;
    const t = setTimeout(() => setDisplayPct((p) => Math.min(behind ? targetPct : Math.min(99, targetPct + CREEP), p + step)), behind ? 45 : 700);
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
