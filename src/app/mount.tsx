import { createRoot } from 'react-dom/client';
import { App } from './App';
import { pickQuality } from './quality';

export async function mountExperience(el: HTMLElement) {
  const quality = await pickQuality();
  el.removeAttribute('aria-hidden');
  createRoot(el).render(<App initialQuality={quality} />);
}
