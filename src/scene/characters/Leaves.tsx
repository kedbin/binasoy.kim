// OWNER: O3. Season-driven falling particles. Type comes from SEASONS[season].particle and colours from .leafFall:
//   leaves   → real 7-lobe maple silhouettes with a centre fold, tumbling + fluttering (implemented)
//   blossoms → 5-petal discs, slow drift (geometry stub ready)
//   snow     → small soft flakes, straight fall (geometry stub ready)
// Motion is CPU-instanced (n ≤ 120) with all scratch objects preallocated; nothing allocates per frame.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene } from '../../state/store';
import { SEASONS, type SeasonPalette } from '../env/presets';
import { mapleLeafGeometry } from '../nature/leafShape';
import { natureMaterial } from '../nature/materials';
import { attrs } from '../nature/util';

const COUNT = { low: 20, mid: 48, high: 120 } as const;

type Kind = SeasonPalette['particle'];
interface Motion { fall: [number, number]; sway: number; spin: number; flutter: number; size: number }
const MOTION: Record<Exclude<Kind, 'none'>, Motion> = {
  leaves: { fall: [0.28, 0.6], sway: 0.9, spin: 1.2, flutter: 1, size: 1 },
  blossoms: { fall: [0.15, 0.3], sway: 0.6, spin: 0.6, flutter: 0.5, size: 0.6 },
  snow: { fall: [0.35, 0.6], sway: 0.25, spin: 0.2, flutter: 0, size: 0.35 },
};

function particleGeometry(kind: Kind) {
  if (kind === 'blossoms') {
    const s = new THREE.Shape();
    for (let i = 0; i <= 60; i++) { const a = (i / 60) * Math.PI * 2, r = 0.5 + 0.5 * Math.abs(Math.cos(a * 2.5)); const p = [Math.cos(a) * r * 0.06, Math.sin(a) * r * 0.06] as const; if (i) s.lineTo(...p); else s.moveTo(...p); }
    return attrs(new THREE.ShapeGeometry(s));
  }
  if (kind === 'snow') return attrs(new THREE.IcosahedronGeometry(0.03, 0));
  return mapleLeafGeometry(0.1, 0.3);
}

interface L { x: number; y: number; z: number; vy: number; ph: number; sp: number; rx: number; ry: number; sw: number; top: number; flip: number }

export function Leaves() {
  const quality = useScene((s) => s.quality);
  const season = useScene((s) => s.season);
  const pal = SEASONS[season];
  const kind = pal.particle;
  const n = kind === 'none' ? 0 : COUNT[quality];
  const mo = MOTION[kind === 'none' ? 'leaves' : kind];
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => particleGeometry(kind), [kind]);
  const mat = useMemo(() => natureMaterial({ roughness: 0.8, side: THREE.DoubleSide, translucency: 0, fill: 0.25 }), []);
  useEffect(() => () => { geo.dispose(); }, [geo]);
  useEffect(() => () => mat.dispose(), [mat]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo<L[]>(() => {
    const arr: L[] = [];
    for (let i = 0; i < n; i++) {
      const hatch = i % 7 === 0;
      const top = hatch ? 2.4 : 6 + Math.random() * (quality === 'high' ? 9 : 5);
      arr.push({
        x: hatch ? (Math.random() - 0.5) * 1.4 : (Math.random() - 0.5) * 16,
        z: hatch ? 1.3 + Math.random() * 2 : 1 + Math.random() * 13,
        y: Math.random() * top, top,
        vy: mo.fall[0] + Math.random() * (mo.fall[1] - mo.fall[0]), ph: Math.random() * 6.28, sp: 0.6 + Math.random() * 1.0,
        rx: Math.random() * 6.28, ry: Math.random() * 6.28, sw: (0.35 + Math.random() * 0.7) * mo.sway, flip: Math.random() < 0.3 ? 1 : 0,
      });
    }
    return arr;
  }, [n, quality, mo]);

  useLayoutEffect(() => {
    const m = ref.current; if (!m || !n) return;
    const cols = pal.leafFall.length ? pal.leafFall : ['#ffffff'];
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) m.setColorAt(i, c.set(cols[i % cols.length]).offsetHSL(0, 0, (Math.random() - 0.5) * 0.08));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [n, pal]);

  useFrame(({ clock, camera }, dt) => {
    const m = ref.current; if (!m) return;
    const cp = camera.position;
    const night = useScene.getState().timeOfDay === 'night';
    m.count = night ? Math.floor(n * 0.35) : n;
    const t = clock.elapsedTime;
    const d = Math.min(dt, 0.05);
    for (let i = 0; i < m.count; i++) {
      const l = data[i];
      // falling-leaf physics feel: descent speeds up when the leaf is edge-on, slows when it "catches" air (flat)
      const wob = Math.sin(t * l.sp + l.ph);
      const flatness = Math.abs(Math.cos(t * l.sp * 1.3 + l.ph));
      l.y -= l.vy * d * (0.55 + 0.9 * (1 - flatness * mo.flutter));
      if (l.y < 0.03) { l.y = l.top; l.x = THREE.MathUtils.clamp(l.x + (Math.random() - 0.5) * 2, -9, 9); }
      // pendulum glide: side-to-side arc with a slight lift at the ends
      dummy.position.set(l.x + wob * l.sw + 0, l.y + Math.abs(wob) * 0.08 * mo.flutter, l.z + Math.cos(t * l.sp * 0.7 + l.ph) * l.sw * 0.6);
      // rocking (pendulum) + occasional full tumble for a subset
      const rock = wob * 0.9 * mo.flutter;
      dummy.rotation.set(l.rx + rock + l.flip * t * l.sp * 2.2 * mo.spin, l.ry + t * 0.4 * mo.spin, rock * 0.6);
      // never let a leaf brush the lens: shrink to nothing inside ~1.2 m of the camera
      const dc = dummy.position.distanceTo(cp);
      dummy.scale.setScalar(mo.size * THREE.MathUtils.smoothstep(dc, 0.7, 1.4));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  if (!n) return null;
  return <instancedMesh key={n + kind} ref={ref} args={[geo, mat, n]} frustumCulled={false} />;
}
