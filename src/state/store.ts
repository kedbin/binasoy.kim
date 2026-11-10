import { create } from 'zustand';

/** Camera / UI state machine. All interactive objects call goTo(view). */
export type View = 'intro' | 'seat' | 'laptop' | 'outside' | 'van' | 'wall' | 'stickers' | 'clipboard';
export type Quality = 'low' | 'mid' | 'high';
export type { TimeOfDay, Season } from '../scene/env/presets';
import type { TimeOfDay, Season } from '../scene/env/presets';

/** Screen space taken by a DOM sheet; CameraRig lens-shifts so the subject stays centred in the free area. */
export interface SheetInset { side: 'right' | 'bottom'; size: number }

let arriveTimer: ReturnType<typeof setTimeout> | undefined;
const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

interface SceneState {
  view: View;
  prevView: View;
  /** Last view the camera actually reached. Panels wait for arrived === view. */
  arrived: View | null;
  /** True while the camera is flying between views. Hotspot clicks are ignored meanwhile. */
  transitioning: boolean;
  /** Loader finished its reveal; the HUD may show and the intro dolly may start. */
  revealed: boolean;
  /** Progressive mount stage (1..5) so heavy 3D subsystems yield to the loader UI between frames. */
  loadStage: number;
  setLoadStage: (n: number) => void;
  /** Scene compiled + warm frames rendered (WarmUp) — loader can reveal. */
  sceneReady: boolean;
  reducedMotion: boolean;
  quality: Quality;
  timeOfDay: TimeOfDay;
  season: Season;
  setSeason: (s: Season) => void;
  setTimeOfDay: (t: TimeOfDay) => void;
  sound: boolean;
  loaded: boolean;
  hovered: string | null;
  sheet: SheetInset | null;
  goTo: (v: View) => void;
  back: () => void;
  arrive: (v: View) => void;
  setQuality: (q: Quality) => void;
  toggleTime: () => void;
  toggleSound: () => void;
  setLoaded: (b: boolean) => void;
  setRevealed: (b: boolean) => void;
  setSceneReady: (b: boolean) => void;
  setHovered: (id: string | null) => void;
  setSheet: (s: SheetInset | null) => void;
}

export const useScene = create<SceneState>((set, get) => ({
  view: 'intro',
  prevView: 'intro',
  arrived: null,
  transitioning: false,
  revealed: false,
  loadStage: 1,
  setLoadStage: (loadStage) => set({ loadStage }),
  sceneReady: false,
  reducedMotion: reduced,
  quality: 'high',
  timeOfDay: 'golden',
  season: 'fall',
  setSeason: (season) => set({ season }),
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  sound: false,
  loaded: false,
  hovered: null,
  sheet: null,
  goTo: (v) => {
    const s = get();
    if (s.view === v) return;
    set({ prevView: s.view, view: v, transitioning: true, hovered: null });
    // Safety: flights last ≤2.1s; if frames are starved (shader compile, hidden tab) still land the UI.
    clearTimeout(arriveTimer);
    arriveTimer = setTimeout(() => get().arrive(v), s.reducedMotion ? 50 : 2600);
  },
  // Every place is one step from the seat, so "back" is always "back to the van".
  back: () => { if (get().view !== 'seat') get().goTo('seat'); },
  arrive: (v) => { if (get().view === v) set({ arrived: v, transitioning: false }); },
  setQuality: (quality) => set({ quality }),
  toggleTime: () => set({ timeOfDay: get().timeOfDay === 'golden' ? 'night' : 'golden' }),
  toggleSound: () => set({ sound: !get().sound }),
  setLoaded: (loaded) => set({ loaded }),
  setRevealed: (revealed) => set({ revealed }),
  setSceneReady: (sceneReady) => set({ sceneReady }),
  setHovered: (hovered) => set({ hovered }),
  setSheet: (sheet) => {
    const c = get().sheet;
    if (c?.side === sheet?.side && c?.size === sheet?.size) return;
    set({ sheet });
  },
}));

// Dev/test hook: window.__scene.getState().goTo('seat')
if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) (window as unknown as { __scene: typeof useScene }).__scene = useScene;
