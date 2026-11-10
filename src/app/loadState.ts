// Load pipeline state shared by the staged mount (App), the shader warm-up (WarmUp) and the loader bar.
// Kept out of state/store.ts on purpose: nothing outside the load path needs it.
import { create } from 'zustand';

/**
 * mount   – scene groups are being constructed, one per frame; nothing is drawn yet
 * compile – every shader program is linking off the main thread (KHR_parallel_shader_compile)
 * warm    – programs are ready; the first real frames (buffers, shadow maps, mirror) render under the loader
 * ready   – the loader may reveal
 */
export type LoadPhase = 'mount' | 'compile' | 'warm' | 'ready';

interface LoadState {
  phase: LoadPhase;
  /** Mount steps completed (see MOUNT_STEPS in App.tsx). */
  step: number;
  /** 0..1, monotonic. Drives the loader bar. */
  progress: number;
  /** The lazy post-processing chunk has mounted its composer. */
  effects: boolean;
}

export const useLoad = create<LoadState>(() => ({ phase: 'mount', step: 0, progress: 0, effects: false }));

export function setLoad(p: Partial<LoadState>) {
  const cur = useLoad.getState();
  if (p.progress !== undefined) p.progress = Math.max(cur.progress, Math.min(1, p.progress));
  useLoad.setState(p);
}

// Dev/test hook, same convention as window.__scene.
if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) (window as unknown as { __load: typeof useLoad }).__load = useLoad;

/** Scene groups mounted one per frame by App's MountStepper. */
export const MOUNT_STEPS = 8;
/** Share of the bar given to mounting; the rest is shader compilation. */
export const MOUNT_SHARE = 0.3;
