import { create } from 'zustand';

/** Photo lightbox state (index into content.photos) shared by 3D polaroids and the DOM lightbox. */
interface WallState { open: number | null; setOpen: (i: number | null) => void }
export const useWall = create<WallState>((set) => ({ open: null, setOpen: (open) => set({ open }) }));
