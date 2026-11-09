import { useScene } from '../../state/store';
import { RaftScene } from './Raft';
import { Kayak } from './Kayak';
import { Leaves } from './Leaves';
import { Birds } from './Birds';
import { Fireflies } from './Fireflies';

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
