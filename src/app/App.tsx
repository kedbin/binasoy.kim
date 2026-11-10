import { Canvas } from '@react-three/fiber';
import { Suspense, lazy, useEffect } from 'react';
import { AdaptiveDpr, Preload } from '@react-three/drei';
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
const Effects = lazy(() => import('../scene/Effects').then((m) => ({ default: m.Effects })));
import { Overlay } from '../ui/Overlay';
import { Loader } from '../ui/Loader';
import { AudioManager } from '../audio';

const DPR: Record<Quality, [number, number]> = { low: [0.75, 1], mid: [1, 1.25], high: [1, 1.5] };

/** Advances loadStage 1 -> 2 -> 3 -> 4 -> 5 across painted frames so the loader bar never freezes. */
function StageStepper() {
  const stage = useScene((s) => s.loadStage);
  const setStage = useScene((s) => s.setLoadStage);
  useEffect(() => {
    if (stage >= 5) return;
    let cancelled = false;
    // Wait for the browser to paint the current stage on the loader before mounting the next heavy 3D group
    const raf = requestAnimationFrame(() => {
      setTimeout(() => {
        if (!cancelled) setStage(stage + 1);
      }, 35);
    });
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [stage, setStage]);
  return null;
}

export function App({ initialQuality }: { initialQuality: Quality }) {
  const quality = useScene((s) => s.quality);
  const stage = useScene((s) => s.loadStage);
  const setQuality = useScene((s) => s.setQuality);
  useEffect(() => setQuality(initialQuality), [initialQuality, setQuality]);

  return (
    <>
      <StageStepper />
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
      >
        <Suspense fallback={null}>
          <EnvDriver />
          <EnvMap />
          <Lighting />
          <SunShafts />
          {stage >= 2 && <Lake />}
          {stage >= 3 && (
            <>
              <Van />
              <PracticalTamer />
              <GroundContact />
            </>
          )}
          {stage >= 4 && (
            <>
              <Characters />
              <Hotspots />
              <ShadowFlags />
            </>
          )}
          {stage >= 5 && (
            <>
              {quality !== 'low' && <Suspense fallback={null}><Effects /></Suspense>}
              <Preload all />
              <WarmUp />
            </>
          )}
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
