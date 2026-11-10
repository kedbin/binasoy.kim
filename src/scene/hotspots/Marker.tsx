// Persistent hotspot marker: a pulsing dot + short label, shown from the seat (and while the intro settles).
// DOM via drei <Html> so it stays crisp and is a big tap target. aria-hidden: the dock is the accessible equivalent.
import { Html } from '@react-three/drei';
import type * as THREE from 'three';
import { useScene, type View } from '../../state/store';
import { look } from '../look';
import { useState, useEffect } from 'react';

type V3 = readonly [number, number, number];
const SHOW_IN = new Set<View>(['seat']);

export function Marker({ id, label, view, position }: { id: string; label: string; view: View; position: V3 }) {
  const visible = useScene((s) => s.revealed && SHOW_IN.has(s.view) && s.arrived === s.view && !s.transitioning);
  const hovered = useScene((s) => s.hovered === id);
  // keep mounted briefly after hiding so the CSS fade-out can run
  const [mounted, setMounted] = useState(visible);
  useEffect(() => {
    if (visible) { setMounted(true); return; }
    const t = setTimeout(() => setMounted(false), 300);
    return () => clearTimeout(t);
  }, [visible]);
  if (!mounted) return null;
  return (
    <Html position={position as unknown as THREE.Vector3Tuple} center zIndexRange={[6, 1]} style={{ pointerEvents: 'none' }}>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className={'marker' + (visible ? ' is-on' : '') + (hovered ? ' is-hot' : '')}
        onPointerEnter={() => useScene.getState().setHovered(id)}
        onPointerLeave={() => { if (useScene.getState().hovered === id) useScene.getState().setHovered(null); }}
        onClick={() => { if (look.moved < 8) useScene.getState().goTo(view); }}
      >
        <span className="marker__dot" />
        <span className="marker__label">{label}</span>
      </button>
    </Html>
  );
}
