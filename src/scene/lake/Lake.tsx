// OWNER: Opus. Golden-hour Algonquin lake environment (sky, hills + mirror, water, shore, trees, fog).
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { Sky } from './Sky';
import { Hills } from './Hills';
import { Water } from './Water';
import { Shore } from './Shore';
import { Trees } from './Trees';
import { nightUniform, useTimeOfDayDriver } from './timeOfDay';
import { useFrame } from '@react-three/fiber';

const FOG_GOLD = new THREE.Color('#E7C2B4');
const FOG_NIGHT = new THREE.Color('#0E1220');

function Atmosphere() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.fog = new THREE.Fog(FOG_GOLD.clone(), 180, 1100);
    return () => { scene.fog = null; };
  }, [scene]);
  useFrame(() => {
    const f = scene.fog as THREE.Fog | null;
    if (f) f.color.copy(FOG_GOLD).lerp(FOG_NIGHT, nightUniform.value);
  });
  return null;
}

export function Lake() {
  useTimeOfDayDriver();
  return (
    <group name="lake">
      <Atmosphere />
      <Sky />
      <Hills />
      <Water />
      <Shore />
      <Trees />
    </group>
  );
}
