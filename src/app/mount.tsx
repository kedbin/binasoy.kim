import { createRoot } from 'react-dom/client';
import { App } from './App';
import { pickQuality } from './quality';
import { useScene } from '../state/store';

export async function mountExperience(el: HTMLElement) {
  const quality = pickQuality();
  useScene.getState().setQuality(quality);
  el.removeAttribute('aria-hidden');
  createRoot(el).render(<App initialQuality={quality} />);
}
