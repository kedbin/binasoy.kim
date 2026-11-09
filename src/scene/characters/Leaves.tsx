import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, DoubleSide, Object3D, Shape, ShapeGeometry, type InstancedMesh } from 'three';
import { useScene } from '../../state/store';

const COUNT = { low: 20, mid: 60, high: 120 } as const;

function leafGeometry() {
  // simple stylised maple leaf: 5-pointed
  const s = new Shape();
  const pts = 10;
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 === 0 ? 1 : 0.5;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  const g = new ShapeGeometry(s);
  g.scale(0.065, 0.065, 0.065);
  return g;
}

interface L { x: number; y: number; z: number; vy: number; ph: number; sp: number; rx: number; rz: number; sw: number; top: number }

export function Leaves() {
  const quality = useScene((s) => s.quality);
  const n = COUNT[quality];
  const ref = useRef<InstancedMesh>(null);
  const geo = useMemo(leafGeometry, []);
  const dummy = useMemo(() => new Object3D(), []);
  const data = useMemo<L[]>(() => {
    const arr: L[] = [];
    for (let i = 0; i < n; i++) {
      const hatch = i % 7 === 0;
      const top = hatch ? 2.4 : 6 + Math.random() * (quality === 'high' ? 9 : 5);
      arr.push({
        x: hatch ? (Math.random() - 0.5) * 1.4 : (Math.random() - 0.5) * 14,
        z: hatch ? 1.3 + Math.random() * 2 : 1 + Math.random() * 13,
        y: Math.random() * top, top,
        vy: 0.25 + Math.random() * 0.35, ph: Math.random() * 6.28, sp: 0.6 + Math.random() * 1.2,
        rx: Math.random() * 6.28, rz: Math.random() * 6.28, sw: 0.4 + Math.random() * 0.8,
      });
    }
    return arr;
  }, [n, quality]);

  useLayoutEffect(() => {
    const m = ref.current; if (!m) return;
    const cols = ['#D9682B', '#C4401F', '#E3A63B', '#B8321E', '#E88A2C'];
    const c = new Color();
    for (let i = 0; i < n; i++) m.setColorAt(i, c.set(cols[i % cols.length]));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [n]);

  useFrame(({ clock }, dt) => {
    const m = ref.current; if (!m) return;
    const night = useScene.getState().timeOfDay === 'night';
    m.count = night ? Math.floor(n * 0.35) : n;
    const t = clock.elapsedTime;
    const d = Math.min(dt, 0.05);
    for (let i = 0; i < m.count; i++) {
      const l = data[i];
      l.y -= l.vy * d;
      if (l.y < 0.03) { l.y = l.top; l.x += (Math.random() - 0.5) * 2; }
      const wob = Math.sin(t * l.sp + l.ph);
      dummy.position.set(l.x + wob * l.sw + t * 0.0, l.y, l.z + Math.cos(t * l.sp * 0.7 + l.ph) * l.sw);
      dummy.rotation.set(l.rx + t * l.sp, wob * 1.0, l.rz + t * l.sp * 0.6);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh key={n} ref={ref} args={[geo, undefined, n]} frustumCulled={false}>
      <meshStandardMaterial roughness={0.9} side={DoubleSide} emissive="#7a3a12" emissiveIntensity={0.7} />
    </instancedMesh>
  );
}
