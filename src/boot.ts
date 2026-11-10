// Decides between the static reader and the 3D van. The reader is always in the DOM (SEO, a11y, print).
// index.html shows a static pre-JS loader (#boot-loader) in 3D mode; the React Loader takes over from it.
import './styles/global.css';
import './styles/reader.css';

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
const html = document.documentElement;

function toReader() {
  html.classList.remove('mode-3d', 'boot-3d');
  html.classList.add('mode-reader');
  document.getElementById('boot-loader')?.remove();
}

async function start() {
  if (forceReader || !hasWebGL() || (reducedMotion && !params.has('3d'))) {
    toReader();
    return;
  }
  html.classList.add('mode-3d');
  const { mountExperience } = await import('./app/mount');
  await mountExperience(document.getElementById('app')!);
}

start().catch((err) => {
  console.error('[boot] 3D failed, falling back to reader', err);
  toReader();
});

// A lost WebGL context mid-load also falls back.
addEventListener('webglcontextlost', () => { if (!document.querySelector('.hud')) toReader(); }, true);
