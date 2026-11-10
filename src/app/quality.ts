import type { Quality } from '../state/store';

export async function pickQuality(): Promise<Quality> {
  const q = new URLSearchParams(location.search).get('q');
  if (q === 'low' || q === 'mid' || q === 'high') return q;
  try {
    const { getGPUTier } = await import('detect-gpu');
    const t = await getGPUTier();
    if (t.isMobile) return t.tier >= 3 ? 'mid' : 'low';
    return t.tier >= 3 ? 'high' : t.tier === 2 ? 'mid' : 'low';
  } catch {
    return 'mid';
  }
}
