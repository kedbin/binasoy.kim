// Hover tooltip for 3D hotspots: no blinking orbs or permanent floating labels.
// Appears cleanly only when the user hovers/focuses the 3D item.
import { Html } from '@react-three/drei';
import type * as THREE from 'three';
import { useScene, type View } from '../../state/store';

type V3 = readonly [number, number, number];
const SHOW_IN = new Set<View>(['seat']);

export function Marker({ id, label, view, position }: { id: string; label: string; view: View; position: V3 }) {
  const active = useScene((s) => s.revealed && SHOW_IN.has(s.view) && !s.transitioning && s.view !== view && s.hovered === id);
  if (!active) return null;
  return (
    <Html position={position as unknown as THREE.Vector3Tuple} center zIndexRange={[6, 1]} style={{ pointerEvents: 'none' }}>
      <div role="tooltip" className="marker-tip">
        {label}
      </div>
    </Html>
  );
}
