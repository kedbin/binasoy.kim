import type { Quality } from '../state/store';

/** Synchronous, zero-network GPU check. Defaults to 'high' on real GPUs (desktop + phone); 'low' only on software rasterizers. */
export function pickQuality(): Quality {
  const q = new URLSearchParams(location.search).get('q');
  if (q === 'low' || q === 'mid' || q === 'high') return q;
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
    const r = (dbg && gl ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '').toLowerCase();
    if (/swiftshader|llvmpipe|software|basic render/i.test(r)) return 'low';
    return 'high';
  } catch {
    return 'high';
  }
}
