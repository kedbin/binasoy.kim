import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useScene, type View } from '../../state/store';

type V3 = readonly [number, number, number];

interface Props {
  id: string;
  label: string;
  view: View;
  position: V3;
  rotY?: number;
  labelPos?: V3;
  lift?: number;
  scale?: number;
  children: ReactNode;
}

/** Wraps a prop: hover lift + pointer cursor + floating label; click → goTo(view). */
export function Hotspot({ id, label, view, position, rotY = 0, labelPos = [0, 0.22, 0], lift = 0.05, scale = 1, children }: Props) {
  const inner = useRef<THREE.Group>(null);
  const current = useScene((s) => s.view);
  const hovered = useScene((s) => s.hovered === id);
  const active = current !== view;
  const h = useRef(0);

  useFrame((_, dt) => {
    const g = inner.current; if (!g) return;
    const on = useScene.getState().hovered === id && useScene.getState().view !== view ? 1 : 0;
    h.current = THREE.MathUtils.damp(h.current, on, 10, dt);
    const s = 1 + lift * h.current;
    g.scale.setScalar(s);
  });

  const out = () => { useScene.getState().setHovered(null); document.body.style.cursor = ''; };
  return (
    <group position={position as unknown as THREE.Vector3Tuple} rotation={[0, rotY, 0]} scale={scale}>
      <group
        ref={inner}
        onPointerOver={(e) => { e.stopPropagation(); if (!active) return; useScene.getState().setHovered(id); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { if (useScene.getState().hovered === id) out(); }}
        onClick={(e) => { if (!active) return; e.stopPropagation(); out(); useScene.getState().goTo(view); }}
      >
        {children}
      </group>
      {hovered && active && (
        <Html position={labelPos as unknown as THREE.Vector3Tuple} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <div className="hotspot-label">{label}</div>
        </Html>
      )}
    </group>
  );
}
