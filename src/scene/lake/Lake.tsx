// OWNER: Opus core (water shader, sky, hills) + Sonnet task S5b (dressing). Stub.
import { WORLD, PALETTE } from '../layout';

export function Lake() {
  return (
    <group name="lake">
      <color attach="background" args={[PALETTE.peach]} />
      <mesh rotation-x={-Math.PI / 2} position={[0, WORLD.groundY, 4]} receiveShadow>
        <planeGeometry args={[40, 18]} />
        <meshStandardMaterial color={PALETTE.grass} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, WORLD.waterY, 140]}>
        <planeGeometry args={[600, 260]} />
        <meshStandardMaterial color={PALETTE.lake} />
      </mesh>
    </group>
  );
}
