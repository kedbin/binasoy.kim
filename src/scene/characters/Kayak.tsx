import { ANCHORS } from '../layout';

export function Kayak() {
  const [x, y, z] = ANCHORS.kayak.pos;
  return (
    <group position={[x, y - 0.1, z]} rotation={[0.05, 0.5, 0.06]} name="kayak">
      <mesh position={[0, 0.17, 0]} scale={[0.36, 0.17, 1.7]} castShadow>
        <sphereGeometry args={[1, 20, 12]} />
        <meshStandardMaterial color="#F2C230" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.3, 0]} scale={[0.2, 0.05, 0.5]}>
        <sphereGeometry args={[1, 16, 8]} />
        <meshStandardMaterial color="#2a2a2e" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.2, 0.05]} scale={[0.37, 0.02, 1.71]}>
        <sphereGeometry args={[1, 20, 6]} />
        <meshStandardMaterial color="#c9561f" roughness={0.7} />
      </mesh>
      <group position={[0, 0.36, 0.1]} rotation={[0, 0, Math.PI / 2]}>
        <mesh><cylinderGeometry args={[0.02, 0.02, 2, 6]} /><meshStandardMaterial color="#d8d2c4" roughness={0.8} /></mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, s, 0]} scale={[1, 1, 0.3]}>
            <boxGeometry args={[0.2, 0.4, 0.1]} /><meshStandardMaterial color="#F2C230" roughness={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
