// OWNER: O5 (interaction layer). Wraps a prop: enlarged invisible hit area, warm emissive glow on hover,
// persistent marker (dot + label), click → goTo(view). Clicks are ignored mid-flight and after a drag-to-look.
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene, type View } from '../../state/store';
import { look } from '../look';
import { placeOf } from '../../ui/places';
import { Marker } from './Marker';

type V3 = readonly [number, number, number];

interface Props {
  id: string;
  label: string;
  view: View;
  position: V3;
  rotY?: number;
  /** marker position, local to the hotspot (before scale) */
  labelPos?: V3;
  lift?: number;
  scale?: number;
  /** invisible hit box [w,h,d] (local, before scale), centred at hitPos. Enlarged on touch/compact screens. */
  hit?: V3;
  hitPos?: V3;
  children: ReactNode;
}

const GLOW = new THREE.Color('#FFD58A');
type Mat = THREE.MeshStandardMaterial;

/** Can this hotspot be activated right now? */
export function canActivate(view: View) {
  const s = useScene.getState();
  // Mid-flight clicks are ignored: retargeting mid-air read as a second "open" (e.g. a click while the camera
  // was still backing away from the laptop re-opened it). From the intro a click goes straight to the prop;
  // the intro auto-enter listens to 'click' (not pointerdown) so it no longer races the hotspot.
  return s.revealed && !s.transitioning && s.view !== view && s.view !== 'laptop' && look.moved < look.slop;
}

export function Hotspot({ id, label, view, position, rotY = 0, labelPos = [0, 0.22, 0], lift = 0.05, scale = 1, hit, hitPos = [0, 0, 0], children }: Props) {
  const inner = useRef<THREE.Group>(null);
  const mats = useRef<{ m: Mat; base: THREE.Color }[]>([]);
  const h = useRef(0);
  const coarse = useThree((s) => s.size.width < 820);

  // collect glow-able materials once (skip emissive-mapped screens/photos: they already glow)
  useLayoutEffect(() => {
    const g = inner.current; if (!g) return;
    const out: { m: Mat; base: THREE.Color }[] = [];
    const seen = new Set<THREE.Material>();
    g.traverse((o) => {
      const m = (o as THREE.Mesh).material as Mat | undefined;
      if (!m || Array.isArray(m) || seen.has(m) || !('emissive' in m) || m.emissiveMap) return;
      seen.add(m); out.push({ m, base: m.emissive.clone() });
    });
    mats.current = out;
  });

  useFrame((_, dt) => {
    const g = inner.current; if (!g) return;
    const s = useScene.getState();
    const on = s.hovered === id && s.view !== view && !s.transitioning ? 1 : 0;
    const prev = h.current;
    h.current = THREE.MathUtils.damp(h.current, on, 10, dt);
    if (Math.abs(prev - h.current) < 1e-4 && h.current < 1e-3) return;
    g.scale.setScalar(1 + lift * h.current);
    for (const { m, base } of mats.current) m.emissive.copy(base).lerp(GLOW, 0.22 * h.current);
  });

  const out = () => { if (useScene.getState().hovered === id) useScene.getState().setHovered(null); document.body.style.cursor = ''; };
  const marker = placeOf(view)?.marker ?? label;
  const k = coarse ? 1.5 : 1;
  return (
    <group position={position as unknown as THREE.Vector3Tuple} rotation={[0, rotY, 0]} scale={scale}>
      <group
        ref={inner}
        onPointerOver={(e) => { e.stopPropagation(); if (!canActivate(view) || look.dragging) return; useScene.getState().setHovered(id); document.body.style.cursor = 'pointer'; }}
        onPointerOut={out}
        onClick={(e) => { if (!canActivate(view)) return; e.stopPropagation(); out(); useScene.getState().goTo(view); }}
      >
        {children}
        {hit && (
          <mesh position={hitPos as unknown as THREE.Vector3Tuple} scale={[hit[0] * k, hit[1] * k, hit[2] * k]} visible={false}>
            <boxGeometry />
          </mesh>
        )}
      </group>
      <Marker id={id} label={marker} view={view} position={labelPos} />
    </group>
  );
}
