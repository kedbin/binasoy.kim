import { Canvas } from '@react-three/fiber';
import { Suspense, lazy, useEffect } from 'react';
import { AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import { EnvDriver, EnvMap, ShadowFlags, GroundContact } from '../scene/env/EnvLighting';
import { SunShafts } from '../scene/env/SunShafts';
import { PracticalTamer } from '../scene/env/PracticalTamer';
import { useScene, type Quality } from '../state/store';
import { CameraRig } from '../scene/CameraRig';
import { WarmUp } from '../scene/WarmUp';
import { Lighting } from '../scene/Lighting';
import { Van } from '../scene/van/Van';
import { Lake } from '../scene/lake/Lake';
import { Characters } from '../scene/characters/Characters';
import { Hotspots } from '../scene/hotspots/Hotspots';
import { Overlay } from '../ui/Overlay';
import { Loader } from '../ui/Loader';
import { AudioManager } from '../audio';
import { useLoad, setLoad, MOUNT_SHARE, MOUNT_STEPS } from './loadState';

// Fetched in parallel with the first mount steps (not when its turn comes) so it never holds the load up.
const effectsChunk = import('../scene/Effects');
const Effects = lazy(() => effectsChunk.then((m) => ({ default: m.Effects })));

const DPR: Record<Quality, [number, number]> = { low: [0.75, 1], mid: [1, 1.25], high: [1, 1.5] };

/**
 * Mounts one scene group per painted frame so building geometry never blocks the loader for long.
 * Nothing is drawn while this runs (WarmUp keeps the scene hidden), so each step costs only its own JS.
 * Lives inside <Canvas>: its effect must follow the commit of the 3D tree, not of the DOM tree around it,
 * otherwise several steps pile up into one long task.
 */
function MountStepper() {
  const step = useLoad((s) => s.step);
  useEffect(() => {
    if (step >= MOUNT_STEPS) return;
    let done = false;
    const next = () => {
      if (done) return;
      done = true;
      setLoad({ step: step + 1, progress: MOUNT_SHARE * ((step + 1) / MOUNT_STEPS) });
    };
    // after the browser has painted this step; the timer keeps a background tab loading
    const raf = requestAnimationFrame(() => setTimeout(next, 0));
    const t = setTimeout(next, 300);
    return () => { done = true; cancelAnimationFrame(raf); clearTimeout(t); };
  }, [step]);
  return null;
}

export function App({ initialQuality }: { initialQuality: Quality }) {
  const quality = useScene((s) => s.quality);
  const step = useLoad((s) => s.step);
  const setQuality = useScene((s) => s.setQuality);
  useEffect(() => setQuality(initialQuality), [initialQuality, setQuality]);

  return (
    <>
      <Canvas
        className="scene-canvas"
        dpr={DPR[quality]}
        shadows={quality !== 'low' ? 'percentage' : false}
        gl={{
          antialias: quality === 'low',
          powerPreference: 'high-performance',
          toneMapping: THREE.AgXToneMapping,
          toneMappingExposure: 1,
        }}
        camera={{ fov: 45, near: 0.05, far: 900, position: [0.6, 1.9, 9.5] }}
        onCreated={({ gl }) => {
          // three's per-program error check reads driver logs synchronously on first use; keep it for dev only
          gl.debug.checkShaderErrors = import.meta.env.DEV;
        }}
      >
        <Suspense fallback={null}>
          <MountStepper />
          <WarmUp armed={step >= MOUNT_STEPS} />
          <EnvDriver />
          <Lighting />
          <SunShafts />
          {step >= 1 && <EnvMap />}
          {step >= 2 && <Lake part="far" />}
          {step >= 3 && <Lake part="shore" />}
          {step >= 4 && <Lake part="trees" />}
          {step >= 5 && (
            <>
              <Van />
              <PracticalTamer />
              <GroundContact />
            </>
          )}
          {step >= 6 && <Characters />}
          {step >= 7 && (
            <>
              <Hotspots />
              <ShadowFlags />
            </>
          )}
          {step >= 8 && quality !== 'low' && <Suspense fallback={null}><Effects /></Suspense>}
        </Suspense>
        <CameraRig />
        <AdaptiveDpr pixelated={false} />
      </Canvas>
      <Overlay />
      <Loader />
      <AudioManager />
    </>
  );
}
