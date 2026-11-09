// OWNER: Opus (task 5 core). Golden-hour key light + sky fill. Placeholder until lake/sky lands.
import { useScene } from '../state/store';
import { WORLD } from './layout';

export function Lighting() {
  const night = useScene((s) => s.timeOfDay === 'night');
  const quality = useScene((s) => s.quality);
  const [x, y, z] = WORLD.sunDir;
  return (
    <>
      <hemisphereLight args={[night ? '#3a4466' : '#f7d2b0', night ? '#0d0f14' : '#8a7a5a', night ? 0.25 : 1.15]} />
      <directionalLight
        position={[x * 80, y * 80 + 6, z * 80]}
        intensity={night ? 0.15 : 1.8}
        color={night ? '#8fa0d0' : '#ffb27a'}
        castShadow={quality !== 'low'}
        shadow-mapSize={[quality === 'high' ? 2048 : 1024, quality === 'high' ? 2048 : 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0004}
      />
    </>
  );
}
