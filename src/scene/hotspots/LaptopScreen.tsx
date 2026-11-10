// OWNER: Opus. Mounts KimOS (DOM) onto the 3D laptop screen with drei <Html transform>.
// Desktop: live on-screen UI when the camera is in 'laptop' view (pointer events enabled only then).
// Mobile / narrow viewports: the 3D screen just shows the wallpaper; KimOS opens as a full-screen modal (Panels).
import { Html } from '@react-three/drei';
import { createPortal, useThree } from '@react-three/fiber';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useLaptopStore, SCREEN_SIZE } from './laptopStore';
import { useScene } from '../../state/store';

const KimOS = lazy(() => import('../../ui/kimos').then((m) => ({ default: m.KimOS })));

const DESIGN_W = 1280; // KimOS fixed design canvas
const DESIGN_H = 800;

export function useIsCompact() {
  const size = useThree((s) => s.size);
  return size.width < 820 || size.height < 520;
}

export function LaptopScreen() {
  const mount = useLaptopStore((s) => s.mount);
  const view = useScene((s) => s.view);
  const back = useScene((s) => s.back);
  const compact = useIsCompact();
  const [warm, setWarm] = useState(false);
  // Mount KimOS once the user gets near the laptop (or on idle) so the first dolly-in is instant.
  useEffect(() => {
    if (view === 'laptop' || view === 'seat') setWarm(true);
  }, [view]);
  if (!mount || compact || !warm) return null;
  const active = view === 'laptop';
  // drei Html transform: 1 CSS px = 1/40 world units at distanceFactor 1 (scale = factor / 400 * 10).
  // We want DESIGN_W css px to span SCREEN_SIZE.w metres.
  const scale = SCREEN_SIZE.w / DESIGN_W;
  return createPortal(
    <Html
      transform
      scale={scale * 40}
      position={[0, 0, 0.0005]}
      zIndexRange={[5, 0]}
      wrapperClass={'kimos-3d' + (active ? ' is-active' : '')}
      style={{ width: DESIGN_W, height: DESIGN_H, pointerEvents: active ? 'auto' : 'none' }}
      occlude={active ? undefined : 'blending'}
    >
      <Suspense fallback={null}>
        <div className="kimos-3d__frame" style={{ width: DESIGN_W, height: DESIGN_H }} aria-hidden={!active} inert={!active ? true : undefined}>
          <KimOS mode="screen" onExit={back} />
        </div>
      </Suspense>
    </Html>,
    mount,
  );
}
