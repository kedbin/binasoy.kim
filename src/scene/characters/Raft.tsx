import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, type Group, type Mesh, type MeshBasicMaterial, type PointLight } from 'three';
import { ANCHORS } from '../layout';
import { useScene } from '../../state/store';
import { People } from './People';

/** Drift loop: period (s) and half-extents (m). */
const DRIFT = { period: 90, rx: 6, rz: 4 };
const RINGS = 3;

export function RaftScene() {
  const drift = useRef<Group>(null);
  const bob = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const ringRefs = useRef<(Mesh | null)[]>([]);
  const quality = useScene((s) => s.quality);
  const night = useScene((s) => s.timeOfDay) === 'night';
  const [ax, ay, az] = ANCHORS.raft.pos;
  const ringMats = useMemo(() => Array.from({ length: RINGS }, () => null as MeshBasicMaterial | null), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const a = (t / DRIFT.period) * Math.PI * 2;
    const x = Math.sin(a) * DRIFT.rx, z = Math.sin(a * 2) * DRIFT.rz;
    const dx = Math.cos(a) * DRIFT.rx, dz = Math.cos(a * 2) * DRIFT.rz * 2;
    if (drift.current) {
      drift.current.position.set(ax + x, ay, az + z);
      drift.current.rotation.y = Math.atan2(dx, dz) * 0.3 + 0.6 + Math.sin(t * 0.2) * 0.1;
    }
    if (bob.current) {
      bob.current.position.y = 0.12 + Math.sin(t * 1.1) * 0.04;
      bob.current.rotation.x = Math.sin(t * 0.9) * 0.025;
      bob.current.rotation.z = Math.sin(t * 0.7 + 1) * 0.03;
    }
    for (let i = 0; i < RINGS; i++) {
      const m = ringRefs.current[i];
      if (!m) continue;
      const p = ((t * 0.18 + i / RINGS) % 1);
      const s = 2.2 + p * 3.2;
      m.scale.set(s * 1.3, s, 1);
      (m.material as MeshBasicMaterial).opacity = (1 - p) * 0.35 * Math.min(1, p * 6);
    }
    if (light.current) light.current.intensity = 1.6 + Math.sin(t * 7) * 0.08 + Math.sin(t * 3.1) * 0.1;
  });

  return (
    <group ref={drift} position={[ax, ay, az]} name="raft">
      {Array.from({ length: RINGS }, (_, i) => (
        <mesh key={i} ref={(m) => { ringRefs.current[i] = m; }} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.92, 1, 48]} />
          <meshBasicMaterial ref={(m) => { ringMats[i] = m; }} color="#ffffff" transparent opacity={0.2} depthWrite={false} side={DoubleSide} />
        </mesh>
      ))}
      <group ref={bob} scale={1.2}>
        <Raft />
        <group position={[0, 0.12, 0]}><People /></group>
        {night && (
          <group position={[0, 0.5, 0.9]}>
            <mesh><sphereGeometry args={[0.06, 10, 8]} /><meshBasicMaterial color="#ffd58a" toneMapped={false} /></mesh>
            <pointLight ref={light} color="#ffb85a" intensity={1.6} distance={cutoff(quality)} decay={2} />
          </group>
        )}
      </group>
    </group>
  );
}
const cutoff = (q: string) => (q === 'low' ? 6 : 12);

function Raft() {
  const R = 1;
  return (
    <group>
      <group scale={[1.15, 1, 1.55]} rotation={[0, 0, 0]}>
        {/* tube: grey front half, white back half */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.2, 0]} castShadow>
          <torusGeometry args={[R, 0.22, 12, 32, Math.PI]} />
          <meshStandardMaterial color="#8d9299" roughness={0.85} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, Math.PI]} position={[0, 0.2, 0]} castShadow>
          <torusGeometry args={[R, 0.22, 12, 32, Math.PI]} />
          <meshStandardMaterial color="#ECECE8" roughness={0.85} />
        </mesh>
        {/* floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <circleGeometry args={[R, 32]} />
          <meshStandardMaterial color="#4a4f57" roughness={1} />
        </mesh>
      </group>
      {/* rope loops */}
      {[-1, 1].map((s) => [-0.6, 0.6].map((z) => (
        <mesh key={s + '_' + z} position={[s * 1.18 * 0.93, 0.32, z]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.07, 0.012, 6, 12]} />
          <meshStandardMaterial color="#d8c9a6" roughness={1} />
        </mesh>
      )))}
    </group>
  );
}
