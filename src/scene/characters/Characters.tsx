import { useScene } from '../../state/store';
import { CAMERA } from '../layout';
import { RaftScene } from './Raft';
import { Kayak } from './Kayak';
import { Leaves } from './Leaves';
import { Birds } from './Birds';
import { Fireflies } from './Fireflies';

// Dev-only: lets screenshot scripts frame close-ups (window.__CAMERA.outside = {...}).
if (import.meta.env.DEV) (window as unknown as { __CAMERA: typeof CAMERA }).__CAMERA = CAMERA;

export function Characters() {
  const quality = useScene((s) => s.quality);
  return (
    <group name="characters">
      <RaftScene />
      <Kayak />
      <Leaves />
      {quality === 'high' && <Birds />}
      <Fireflies />
    </group>
  );
}
