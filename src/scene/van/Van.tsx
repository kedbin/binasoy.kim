// OWNER: Sonnet task S4 (van interior). Stub.
import { VAN, PALETTE } from '../layout';

export function Van() {
  return (
    <group name="van">
      <mesh position={[0, VAN.floorY, (VAN.backZ + VAN.frontZ) / 2]} receiveShadow>
        <boxGeometry args={[VAN.innerWidth, 0.05, VAN.backZ - VAN.frontZ]} />
        <meshStandardMaterial color={PALETTE.charcoal} />
      </mesh>
    </group>
  );
}
