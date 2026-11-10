import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { useScene } from '../state/store';

export function WarmUp() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    let dead = false;
    const done = () => { if (!dead) { dead = true; useScene.getState().setSceneReady(true); } };
    const t = setTimeout(done, 350);
    Promise.resolve(gl.compileAsync?.(scene, camera))
      .catch(() => undefined)
      .then(() => requestAnimationFrame(done));
    return () => { dead = true; clearTimeout(t); };
  }, [gl, scene, camera]);
  return null;
}
