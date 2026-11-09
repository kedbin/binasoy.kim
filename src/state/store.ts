import { create } from 'zustand';

/** Camera / UI state machine. All interactive objects call goTo(view). */
export type View = 'intro' | 'seat' | 'laptop' | 'outside' | 'wall' | 'stickers' | 'clipboard';
export type Quality = 'low' | 'mid' | 'high';
export type TimeOfDay = 'golden' | 'night';

interface SceneState {
  view: View;
  prevView: View;
  quality: Quality;
  timeOfDay: TimeOfDay;
  sound: boolean;
  loaded: boolean;
  hovered: string | null;
  goTo: (v: View) => void;
  back: () => void;
  setQuality: (q: Quality) => void;
  toggleTime: () => void;
  toggleSound: () => void;
  setLoaded: (b: boolean) => void;
  setHovered: (id: string | null) => void;
}

export const useScene = create<SceneState>((set, get) => ({
  view: 'intro',
  prevView: 'intro',
  quality: 'mid',
  timeOfDay: 'golden',
  sound: false,
  loaded: false,
  hovered: null,
  goTo: (v) => set({ prevView: get().view, view: v }),
  back: () => set({ prevView: get().view, view: get().view === 'seat' ? 'seat' : 'seat' }),
  setQuality: (quality) => set({ quality }),
  toggleTime: () => set({ timeOfDay: get().timeOfDay === 'golden' ? 'night' : 'golden' }),
  toggleSound: () => set({ sound: !get().sound }),
  setLoaded: (loaded) => set({ loaded }),
  setHovered: (hovered) => set({ hovered }),
}));
