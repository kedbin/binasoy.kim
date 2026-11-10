// Keeps the main thread free while the scene's shader programs build.
//
// Why this exists: three links a program lazily and then *blocks* on it the first time it is drawn. Drawing the
// scene as it mounted meant ~200 programs were linked synchronously (many of them variants that were thrown away
// again when lights or the post-processing target appeared), freezing the page for many seconds.
//
// Instead the scene stays hidden while it mounts, so nothing is drawn. Once everything is in place we ask three
// to create every program up front (they link on driver threads via KHR_parallel_shader_compile), poll until
// they are ready, and only then draw the first frame. The loader bar follows the real program count.
import { useThree } from '@react-three/fiber';
import { useProgress } from '@react-three/drei';
import { useEffect, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useScene } from '../state/store';
import { useLoad, setLoad, MOUNT_SHARE } from '../app/loadState';
import { flagShadows } from './env/EnvLighting';

/** Give up waiting on the GPU after this long without a single new program becoming ready. */
const STALL_MS = 8000;
const COMPILE_CAP_MS = 30000;
const ASSET_WAIT_MS = 3000;
/** Real frames drawn under the loader before reveal (shadow maps, lake mirror, contact-shadow bake, uploads). */
const WARM_FRAMES = 6;
/** Delay after reveal before the other time-of-day's shader variants are queued (intro dolly has finished). */
const NIGHT_PRECOMPILE_MS = 6000;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
/** Next painted frame; falls back to a timer so a backgrounded tab cannot stall the load. */
const frame = () => new Promise<void>((r) => {
  let done = false;
  const fin = () => { if (!done) { done = true; r(); } };
  requestAnimationFrame(fin);
  setTimeout(fin, 250);
});

type Program = { isReady(): boolean };

/** Without KHR_parallel_shader_compile there is nothing to poll, so wait for the GPU to drain its queue instead. */
async function waitForGpu(ctx: WebGLRenderingContext | WebGL2RenderingContext, capMs: number) {
  const g = ctx as WebGL2RenderingContext;
  if (typeof g.fenceSync !== 'function') return;
  const sync = g.fenceSync(g.SYNC_GPU_COMMANDS_COMPLETE, 0);
  if (!sync) return;
  g.flush();
  const t0 = performance.now();
  while (performance.now() - t0 < capMs && g.getSyncParameter(sync, g.SYNC_STATUS) !== g.SIGNALED) await sleep(30);
  g.deleteSync(sync);
}

export function WarmUp({ armed }: { armed: boolean }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const quality = useScene((s) => s.quality);
  const sceneReady = useScene((s) => s.sceneReady);

  // Dev/test hook (same convention as window.__scene): lets scripts count triangles and draw calls per group.
  useEffect(() => {
    if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) (window as unknown as { __three: unknown }).__three = { gl, scene, camera };
  }, [gl, scene, camera]);

  // Hidden from the very first frame: an invisible root draws nothing, so no program is linked on demand.
  useLayoutEffect(() => {
    if (!useScene.getState().sceneReady) scene.visible = false;
    return () => { scene.visible = true; };
  }, [scene]);
  // Whoever declares the scene ready (us, or the loader's last-resort timer) also makes it visible.
  useEffect(() => { if (sceneReady) scene.visible = true; }, [sceneReady, scene]);

  useEffect(() => {
    if (!armed || useScene.getState().sceneReady) return;
    let dead = false;
    (async () => {
      // Photo textures and the post-processing chunk add materials; wait for them so they are compiled too.
      const t0 = performance.now();
      const pending = () => useProgress.getState().active || (quality !== 'low' && !useLoad.getState().effects);
      while (!dead && pending() && performance.now() - t0 < ASSET_WAIT_MS) await sleep(30);
      // Two frames of useFrame so lights have settled on their real visibility (it is part of the program key).
      await frame(); await frame();
      if (dead) return;
      flagShadows(scene, quality);

      setLoad({ phase: 'compile' });
      // With post-processing (and in the lake mirror) the scene is drawn into a render target: no tone mapping,
      // linear output. Without it, straight to the canvas. Compile the variant that will actually be used.
      const rt = quality !== 'low' ? new THREE.WebGLRenderTarget(1, 1) : null;
      const before = gl.getRenderTarget();
      const programs = () => (gl.info.programs ?? []) as unknown as Program[];
      let wanted: Program[] = [];
      scene.visible = true; // lights are gathered with traverseVisible
      try {
        gl.setRenderTarget(rt);
        gl.compile(scene, camera);
        wanted = programs().slice();
      } catch (e) {
        console.warn('[warmup] compile failed, shaders will build on first draw', e);
      } finally {
        gl.setRenderTarget(before);
        scene.visible = false;
        rt?.dispose();
      }
      if (!wanted.length) wanted = programs().slice();

      const start = performance.now();
      let last = start, seen = -1;
      for (;;) {
        const all = wanted;
        const ready = all.reduce((n, p) => n + (p.isReady() ? 1 : 0), 0);
        const now = performance.now();
        if (ready !== seen) { seen = ready; last = now; }
        setLoad({ progress: MOUNT_SHARE + (0.95 - MOUNT_SHARE) * (all.length ? ready / all.length : 1) });
        if (dead || ready >= all.length || now - last > STALL_MS || now - start > COMPILE_CAP_MS) break;
        await sleep(50);
      }
      if (dead) return;
      if (!gl.extensions.has('KHR_parallel_shader_compile')) await waitForGpu(gl.getContext(), 4000);
      if (dead) return;

      setLoad({ phase: 'warm', progress: 0.96 });
      scene.visible = true;
      for (let i = 0; i < WARM_FRAMES && !dead; i++) await frame();
      if (dead) return;
      setLoad({ phase: 'ready', progress: 1 });
      useScene.getState().setSceneReady(true);

      // The other time of day switches on more lights (hidden until then), and every distinct light set-up
      // needs its own programs. Build them in the background once the visitor has settled in, so the
      // day/night toggle does not freeze on first use. Not part of the load: nothing waits for it.
      await sleep(NIGHT_PRECOMPILE_MS);
      if (dead) return;
      const off: THREE.Object3D[] = [];
      scene.traverse((o) => { if ((o as THREE.Light).isLight && !o.visible) off.push(o); });
      if (!off.length) return;
      const rt2 = quality !== 'low' ? new THREE.WebGLRenderTarget(1, 1) : null;
      const prev = gl.getRenderTarget();
      off.forEach((o) => { o.visible = true; });
      try { gl.setRenderTarget(rt2); gl.compile(scene, camera); } catch { /* built on first use instead */ } finally {
        off.forEach((o) => { o.visible = false; });
        gl.setRenderTarget(prev);
        rt2?.dispose();
      }
    })();
    return () => { dead = true; };
  }, [armed, gl, scene, camera, quality]);
  return null;
}
