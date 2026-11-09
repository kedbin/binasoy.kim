// OWNER: Sonnet task S8 (laptop hotspot shell, photo wall, stickers, clipboard) + S7 (KimOS screen content).
import { Suspense } from 'react';
import { ANCHORS, VAN } from '../layout';
import { useScene } from '../../state/store';
import { Laptop } from './Laptop';
import { PhotoWall } from './PhotoWall';
import { Stickers } from './Stickers';
import { Clipboard } from './Clipboard';

export { useLaptopStore } from './laptopStore';

/** Invisible hit area over the tailgate opening → 'outside'. Only active from the seat view. */
function Hatch() {
  const active = useScene((s) => s.view === 'seat');
  return (
    <mesh
      position={[0, 1.15, VAN.backZ - 0.05]}
      raycast={active ? undefined : () => null}
      onPointerOver={(e) => { e.stopPropagation(); useScene.getState().setHovered('hatch'); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { useScene.getState().setHovered(null); document.body.style.cursor = ''; }}
      onClick={(e) => { e.stopPropagation(); document.body.style.cursor = ''; useScene.getState().goTo('outside'); }}
    >
      <planeGeometry args={[1.5, 1.1]} />
      <meshBasicMaterial side={2} transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export function Hotspots() {
  void ANCHORS;
  return (
    <group name="hotspots">
      <Laptop />
      <Clipboard />
      <Stickers />
      <Suspense fallback={null}><PhotoWall /></Suspense>
      <Hatch />
    </group>
  );
}
