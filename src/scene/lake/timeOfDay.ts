// Smoothly animated 0 (golden hour) → 1 (night) value shared by all lake materials.
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene } from '../../state/store';

export const nightUniform = { value: 0 };
export const timeUniform = { value: 0 };

export function useTimeOfDayDriver() {
  useFrame((state, dt) => {
    const target = useScene.getState().timeOfDay === 'night' ? 1 : 0;
    nightUniform.value = THREE.MathUtils.damp(nightUniform.value, target, 1.6, dt);
    timeUniform.value = state.clock.elapsedTime;
  });
}
