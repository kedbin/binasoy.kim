import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect } from 'react';
import { AdaptiveDpr, Preload, SoftShadows } from '@react-three/drei';
import * as THREE from 'three';
import { EnvDriver, EnvMap, ShadowFlags, GroundContact } from '../scene/env/EnvLighting';
import { SunShafts } from '../scene/env/SunShafts';
import { useScene, type Quality } from '../state/store';
import { CameraRig } from '../scene/CameraRig';
import { Lighting } from '../scene/Lighting';
import { Van } from '../scene/van/Van';
import { Lake } from '../scene/lake/Lake';
import { Characters } from '../scene/characters/Characters';
import { Hotspots } from '../scene/hotspots/Hotspots';
import { Effects } from '../scene/Effects';
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
        shadows={quality !== 'low'}
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
          {quality === 'high' && <SoftShadows size={22} samples={12} focus={0.6} />}
          <EnvMap />
          <Lighting />
          <ShadowFlags />
          <GroundContact />
          <SunShafts />
          <Lake />
          <Van />
          <Characters />
          <Hotspots />
          <Effects />
          <Preload all />
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
