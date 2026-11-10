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
// Post stack (N8AO/bloom/AgX) is lazy: keeps ~95 KB gzip of AO code off the critical path and out of 'low'.
const Effects = lazy(() => import('../scene/Effects').then((m) => ({ default: m.Effects })));
import { Overlay } from '../ui/Overlay';
import { Loader } from '../ui/Loader';
import { AudioManager } from '../audio';

const DPR: Record<Quality, [number, number]> = { low: [0.75, 1], mid: [1, 1.25], high: [1, 1.5] };

export function App({ initialQuality }: { initialQuality: Quality }) {
  const quality = useScene((s) => s.quality);
  const setQuality = useScene((s) => s.setQuality);
  useEffect(() => setQuality(initialQuality), [initialQuality, setQuality]);

  return (
    <>
      <Canvas
        className="scene-canvas"
        dpr={DPR[quality]}
        // native PCF (Vogel-disk) soft shadows; drei SoftShadows/PCSS breaks samplers on three 0.187
        shadows={quality !== 'low' ? 'percentage' : false}
        gl={{
          antialias: quality === 'low',
          powerPreference: 'high-performance',
          // low tier has no post stack, so the renderer tone-maps; otherwise AgX runs in the composer.
          toneMapping: THREE.AgXToneMapping,
          toneMappingExposure: 1,
        }}
        camera={{ fov: 45, near: 0.05, far: 900, position: [0.6, 1.9, 9.5] }}
      >
        <Suspense fallback={null}>
          <EnvDriver />
          <EnvMap />
          <Lighting />
          <ShadowFlags />
          <GroundContact />
          <SunShafts />
          <Lake />
          <Van />
          <PracticalTamer />
          <Characters />
          <Hotspots />
          {quality !== 'low' && <Suspense fallback={null}><Effects /></Suspense>}
          <Preload all />
          <WarmUp />
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
