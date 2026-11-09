// OWNER: Opus. Eases the camera between CAMERA presets; adds limited look-around in 'seat'/'outside'.
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { easing } from 'maath';
import { CAMERA } from './layout';
import { useScene } from '../state/store';

const LOOK_VIEWS = new Set(['seat', 'outside', 'intro']);

export function CameraRig() {
  const view = useScene((s) => s.view);
  const back = useScene((s) => s.back);
  const { camera, pointer } = useThree();
  const target = useRef(new THREE.Vector3(...CAMERA.intro.target));
  const look = useRef(new THREE.Vector3());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [back]);

  useFrame((_, dt) => {
    const preset = CAMERA[view] ?? CAMERA.seat;
    const cam = camera as THREE.PerspectiveCamera;
    const smooth = view === 'intro' ? 0.9 : 0.55;
    easing.damp3(cam.position, preset.pos, smooth, dt);
    // Look-around: offset the target by the pointer (yaw/pitch feel) in relaxed views.
    const k = LOOK_VIEWS.has(view) ? 1 : 0;
    const dist = new THREE.Vector3(...preset.target).distanceTo(new THREE.Vector3(...preset.pos));
    look.current.set(
      preset.target[0] - pointer.x * dist * 0.35 * k,
      preset.target[1] + pointer.y * dist * 0.18 * k,
      preset.target[2],
    );
    easing.damp3(target.current, look.current, smooth * 0.8, dt);
    cam.lookAt(target.current);
    if (Math.abs(cam.fov - preset.fov) > 0.01) {
      cam.fov = THREE.MathUtils.damp(cam.fov, preset.fov, 4, dt);
      cam.updateProjectionMatrix();
    }
  });
  return null;
}
