// OWNER: Sonnet task S8 (props) · O5 (interaction layer: hatch hit area + markers).
import { Suspense } from 'react';
import { VAN } from '../layout';
import { useScene } from '../../state/store';
import { Laptop } from './Laptop';
import { LaptopScreen } from './LaptopScreen';
import { PhotoWall } from './PhotoWall';
import { Stickers } from './Stickers';
import { Clipboard } from './Clipboard';
import { Marker } from './Marker';
import { canActivate } from './Hotspot';
import { placeOf } from '../../ui/places';

export { useLaptopStore } from './laptopStore';

/** Invisible hit area over the tailgate opening → 'outside'. Only active from the seat view. */
function Hatch() {
  const active = useScene((s) => s.view === 'seat');
  const out = () => { if (useScene.getState().hovered === 'hatch') useScene.getState().setHovered(null); document.body.style.cursor = ''; };
  return (
    <group>
      <mesh
        position={[0, 1.15, VAN.backZ - 0.05]}
        raycast={active ? undefined : () => null}
        onPointerOver={(e) => { e.stopPropagation(); if (!canActivate('outside')) return; useScene.getState().setHovered('hatch'); document.body.style.cursor = 'pointer'; }}
        onPointerOut={out}
        onClick={(e) => { if (!canActivate('outside')) return; e.stopPropagation(); out(); useScene.getState().goTo('outside'); }}
      >
        <planeGeometry args={[1.5, 1.1]} />
        <meshBasicMaterial side={2} transparent opacity={0} depthWrite={false} />
      </mesh>
      <Marker id="hatch" label={placeOf('outside')!.marker} view="outside" position={[0.42, 1.48, VAN.backZ + 0.1]} />
    </group>
  );
}

export function Hotspots() {
  return (
    <group name="hotspots">
      <Laptop />
      <LaptopScreen />
      <Clipboard />
      <Stickers />
      <Suspense fallback={null}><PhotoWall /></Suspense>
      <Hatch />
    </group>
  );
}
