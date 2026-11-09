import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

const SKIN = '#EBBE9B';
const mat = (c: string) => <meshStandardMaterial color={c} roughness={0.9} />;

interface P { hood: string; hair: string; pants: string; long?: boolean; glasses?: boolean; }

function Person({ hood, hair, pants, long, glasses, headRef, armRef }: P & { headRef: React.RefObject<Group | null>; armRef?: React.RefObject<Group | null> }) {
  return (
    <group>
      {/* legs stretched forward */}
      {[-0.1, 0.1].map((x) => (
        <mesh key={x} position={[x, 0.12, 0.3]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.08, 0.35, 4, 8]} />{mat(pants)}
        </mesh>
      ))}
      <mesh position={[0, 0.4, 0]} castShadow><capsuleGeometry args={[0.2, 0.25, 6, 12]} />{mat(hood)}</mesh>
      <group ref={headRef} position={[0, 0.82, 0]}>
        <mesh castShadow><sphereGeometry args={[0.18, 16, 12]} />{mat(SKIN)}</mesh>
        <mesh position={[0, 0.03, -0.025]} scale={[1.08, long ? 1.0 : 0.95, 1.08]}>
          <sphereGeometry args={[0.18, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58]} />{mat(hair)}
        </mesh>
        {long && (
          <mesh position={[0, -0.12, -0.08]} scale={[1, 1.1, 0.6]}><capsuleGeometry args={[0.17, 0.12, 4, 10]} />{mat(hair)}</mesh>
        )}
        {glasses && (
          <group position={[0, 0.01, 0.165]}>
            {[-0.065, 0.065].map((x) => (
              <mesh key={x} position={[x, 0, 0]}><torusGeometry args={[0.04, 0.008, 6, 14]} /><meshStandardMaterial color="#111" /></mesh>
            ))}
          </group>
        )}
      </group>
      {/* arms */}
      <group position={[-0.23, 0.55, 0]} rotation={[0.5, 0, 0.25]}>
        <mesh position={[0, -0.12, 0]}><capsuleGeometry args={[0.065, 0.2, 4, 8]} />{mat(hood)}</mesh>
      </group>
      <group ref={armRef} position={[0.23, 0.55, 0]} rotation={[0.5, 0, -0.25]}>
        <mesh position={[0, -0.12, 0]}><capsuleGeometry args={[0.065, 0.2, 4, 8]} />{mat(hood)}</mesh>
      </group>
    </group>
  );
}

export function People() {
  const kHead = useRef<Group>(null), wHead = useRef<Group>(null), wArm = useRef<Group>(null), kArm = useRef<Group>(null), paddle = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (kHead.current) kHead.current.rotation.y = Math.sin(t * 0.35) * 0.5;
    if (wHead.current) wHead.current.rotation.y = Math.sin(t * 0.27 + 2) * 0.55;
    // paddle strokes: active for ~4s out of every 12s
    const ph = t % 12;
    const k = ph < 4 ? Math.sin((ph / 4) * Math.PI) : 0;
    const stroke = Math.sin(t * 2.2) * k;
    if (paddle.current) { paddle.current.rotation.x = -0.6 + stroke * 0.5; paddle.current.rotation.z = 0.4 + stroke * 0.2; }
    if (kArm.current) kArm.current.rotation.x = 0.5 - 0.7 * Math.abs(k) - stroke * 0.3;
    // Wingwing points & leans
    const pp = (t + 5) % 16, pk = pp < 5 ? Math.sin((pp / 5) * Math.PI) : 0;
    if (wArm.current) { wArm.current.rotation.x = 0.5 - pk * 1.7; wArm.current.rotation.z = -0.25 - pk * 0.5; }
    if (wHead.current) wHead.current.rotation.y += pk * 0.6;
  });
  return (
    <group>
      <group position={[-0.45, 0.2, -0.1]} rotation={[0, 0.35, 0]} scale={1.2}>
        <Person hood="#2B2E36" hair="#1d1815" pants="#3b4256" glasses headRef={kHead} armRef={kArm} />
        <group ref={paddle} position={[0.45, 0.5, 0.25]} rotation={[-0.6, 0, 0.4]}>
          <mesh><cylinderGeometry args={[0.025, 0.025, 2.0, 6]} />{mat('#b89a6a')}</mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0, s * 0.95, 0]}><boxGeometry args={[0.22, 0.4, 0.04]} />{mat('#e8e4da')}</mesh>
          ))}
        </group>
      </group>
      <group position={[0.5, 0.2, 0.0]} rotation={[0, -0.4, 0]} scale={1.2}>
        <Person hood="#CDB08A" hair="#6b4630" pants="#5a5a4a" long headRef={wHead} armRef={wArm} />
      </group>
    </group>
  );
}
