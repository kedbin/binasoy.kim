import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, DoubleSide, Float32BufferAttribute, type Group } from 'three';

const N = 4;

export function Birds() {
  const refs = useRef<(Group | null)[]>([]);
  const wing = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 3, 0.4, 0.3, 0, 0, -0.5, 0, 0, 0, 3, 0.4, 0.3, 3, 0.1, -0.6], 3));
    g.computeVertexNormals();
    return g;
  }, []);
  const seeds = useMemo(() => Array.from({ length: N }, (_, i) => ({
    y: 55 + i * 9 + Math.random() * 8, z: 190 + i * 6, x0: -140 + i * 25, sp: 3 + Math.random() * 1.5, ph: Math.random() * 6,
  })), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < N; i++) {
      const g = refs.current[i]; if (!g) continue;
      const s = seeds[i];
      g.position.set(((s.x0 + t * s.sp + 150) % 300) - 150, s.y + Math.sin(t * 0.3 + s.ph) * 2, s.z);
      const f = Math.sin(t * 2.2 + s.ph) * 0.4;
      g.children[0].rotation.z = f; g.children[1].rotation.z = -f;
    }
  });
  return (
    <group name="birds">
      {seeds.map((_, i) => (
        <group key={i} ref={(g) => { refs.current[i] = g; }} scale={1.4}>
          <mesh geometry={wing}><meshBasicMaterial color="#2a2530" side={DoubleSide} fog={false} /></mesh>
          <mesh geometry={wing} scale={[-1, 1, 1]}><meshBasicMaterial color="#2a2530" side={DoubleSide} fog={false} /></mesh>
        </group>
      ))}
    </group>
  );
}
