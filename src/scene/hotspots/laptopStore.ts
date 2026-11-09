import { create } from 'zustand';
import type { Object3D } from 'three';

/**
 * Exposes the laptop screen mesh ("laptop-screen") so the coordinator / S7 can mount
 * drei <Html transform> on it:  const screen = useLaptopStore(s => s.screen)
 * and  <Html transform occlude position={...} />  as a child of that object (createPortal(..., screen)).
 * The screen mesh is a 0.30 x 0.19 m plane facing local +Z (see SCREEN_SIZE). A child group named
 * "kimos-mount" is also created at the screen centre; use laptopStore.mount for it.
 */
export const SCREEN_SIZE = { w: 0.3, h: 0.19 } as const;

interface LaptopState {
  screen: Object3D | null;
  mount: Object3D | null;
  setScreen: (o: Object3D | null) => void;
  setMount: (o: Object3D | null) => void;
}
export const useLaptopStore = create<LaptopState>((set) => ({
  screen: null,
  mount: null,
  setScreen: (screen) => set({ screen }),
  setMount: (mount) => set({ mount }),
}));
