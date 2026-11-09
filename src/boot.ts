// Decides between the static reader and the 3D van. The reader is always in the DOM (SEO, a11y, print).
import './styles/global.css';

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

const params = new URLSearchParams(location.search);
const forceReader = params.has('reader') || localStorage.getItem('kb:mode') === 'reader';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

async function start() {
  if (forceReader || !hasWebGL() || (reducedMotion && !params.has('3d'))) {
    document.documentElement.classList.add('mode-reader');
    return;
  }
  document.documentElement.classList.add('mode-3d');
  const { mountExperience } = await import('./app/mount');
  await mountExperience(document.getElementById('app')!);
}

start().catch((err) => {
  console.error('[boot] 3D failed, falling back to reader', err);
  document.documentElement.classList.remove('mode-3d');
  document.documentElement.classList.add('mode-reader');
});
