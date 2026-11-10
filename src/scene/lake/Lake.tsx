// OWNER: Opus. Golden-hour Algonquin lake environment (sky, hills + mirror, water, shore, trees, fog).
// Colours/fog distances come from env/presets.ts via the damped live env (EnvDriver updates scene.fog).
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { Sky } from './Sky';
import { Hills } from './Hills';
import { FarForest } from './FarForest';
import { Water } from './Water';
import { Shore } from './Shore';
import { Trees } from './Trees';
import { live } from '../env/live';

function Atmosphere() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.fog = new THREE.Fog(live.c.fog.clone(), live.n.fogNear, live.n.fogFar);
    return () => { scene.fog = null; };
  }, [scene]);
  return null;
}

export function Lake() {
  return (
    <group name="lake">
      <Atmosphere />
      <Sky />
      <Hills />
      <FarForest />
      <Water />
      <Shore />
      <Trees />
    </group>
  );
}
