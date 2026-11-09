import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect } from 'react';
import { AdaptiveDpr, Preload } from '@react-three/drei';
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
        gl={{ antialias: quality !== 'low', powerPreference: 'high-performance' }}
        camera={{ fov: 45, near: 0.05, far: 900, position: [0.6, 1.9, 9.5] }}
      >
        <Suspense fallback={null}>
          <Lighting />
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
    </>
  );
}
