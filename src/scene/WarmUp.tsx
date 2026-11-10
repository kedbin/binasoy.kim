// Mounted at the end of the main <Suspense>: runs once everything above it has resolved.
// Pre-compiles all programs (gl.compileAsync, KHR_parallel_shader_compile where available) and renders a few
// warm frames so the loader reveals onto a scene that doesn't hitch on its first frames.
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { useScene } from '../state/store';

export function WarmUp() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    let dead = false;
    const done = () => { if (!dead) useScene.getState().setSceneReady(true); };
    const frames = (n: number) => {
      if (dead) return;
      if (n <= 0) { done(); return; }
      requestAnimationFrame(() => frames(n - 1));
    };
    // safety: never hold the loader more than 6s on compile
    const t = setTimeout(done, 6000);
    Promise.resolve(gl.compileAsync?.(scene, camera)).catch(() => undefined).then(() => frames(4));
    return () => { dead = true; clearTimeout(t); };
  }, [gl, scene, camera]);
  return null;
}
