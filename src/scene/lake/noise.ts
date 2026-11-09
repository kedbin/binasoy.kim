// Tiny deterministic value-noise helpers for procedural geometry (CPU side).
export function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(n: number) { const s = Math.sin(n * 127.1) * 43758.5453123; return s - Math.floor(s); }
function hash2(x: number, y: number) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123; return s - Math.floor(s); }
const sm = (t: number) => t * t * (3 - 2 * t);
export function noise1(x: number) { const i = Math.floor(x), f = x - i; return hash(i) * (1 - sm(f)) + hash(i + 1) * sm(f); }
export function noise2(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = sm(x - ix), fy = sm(y - iy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
export function fbm1(x: number, oct = 4) { let v = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { v += a * noise1(x * f); f *= 2.03; a *= 0.5; } return v; }
export function fbm2(x: number, y: number, oct = 4) { let v = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { v += a * noise2(x * f, y * f); f *= 2.03; a *= 0.5; } return v; }
