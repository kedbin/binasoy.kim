import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, type InstancedMesh } from 'three';
import { useScene } from '../../state/store';

const COUNT = { low: 12, mid: 28, high: 45 } as const;

export function Fireflies() {
  const quality = useScene((s) => s.quality);
  const night = useScene((s) => s.timeOfDay) === 'night';
  const n = COUNT[quality];
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const seeds = useMemo(() => Array.from({ length: n }, () => ({
    x: (Math.random() - 0.5) * 16, y: 0.3 + Math.random() * 1.8, z: 3 + Math.random() * 6.5, p: Math.random() * 100, s: 0.3 + Math.random() * 0.5,
  })), [n]);
  useFrame(({ clock }) => {
    const m = ref.current; if (!m || !night) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < n; i++) {
      const f = seeds[i];
      dummy.position.set(f.x + Math.sin(t * f.s + f.p) * 0.8, f.y + Math.sin(t * f.s * 1.3 + f.p) * 0.3, f.z + Math.cos(t * f.s * 0.8 + f.p) * 0.8);
      const blink = Math.max(0, Math.sin(t * 1.5 + f.p * 3)) ** 2;
      dummy.scale.setScalar(0.3 + blink * 0.9);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  if (!night) return null;
  return (
    <instancedMesh key={n} ref={ref} args={[undefined, undefined, n]} frustumCulled={false}>
      <sphereGeometry args={[0.035, 6, 6]} />
      <meshBasicMaterial color="#d8ff7a" toneMapped={false} />
    </instancedMesh>
  );
}
