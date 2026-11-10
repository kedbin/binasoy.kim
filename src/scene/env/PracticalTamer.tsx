// OWNER: Opus O1. STOPGAP until O2's Van.tsx reads LIGHTS[timeOfDay].practicalGain/practicalDistance itself.
// Van.tsx animates its fairy-light point lights every frame (up to ~6.7 intensity at night), which blows the
// white duvet out. This component is mounted AFTER <Van/> so its useFrame runs after the van's, and rescales
// those lights into warm pools with darker edges (photo #3). Remove once Van.tsx applies the preset directly.
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { live } from './live';

export function PracticalTamer() {
  const scene = useThree((s) => s.scene);
  const lights = useRef<THREE.PointLight[] | null>(null);
  const tick = useRef(0);
  useFrame(() => {
    // rescan often until the van has mounted, then occasionally (O2 may swap meshes/lights)
    const every = lights.current && lights.current.length ? 240 : 10;
    if (!lights.current || ++tick.current % every === 0) {
      const van = scene.getObjectByName('van');
      const found: THREE.PointLight[] = [];
      van?.traverse((o) => { if ((o as THREE.PointLight).isPointLight) found.push(o as THREE.PointLight); });
      lights.current = found;
    }
    const g = live.n.practicalGain, d = live.n.practicalDistance;
    for (const p of lights.current) { p.intensity *= g; p.distance = d; p.decay = 2; }
  });
  return null;
}
