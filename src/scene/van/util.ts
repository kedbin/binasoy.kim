// Geometry helpers for the van + props: rounded primitives, safe merging, painted AO / vertex colours, noise.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type G = THREE.BufferGeometry;
export type AO = (x: number, y: number, z: number) => number;

/** Rounded box centred at (x,y,z). */
export function rbox(w: number, h: number, d: number, x = 0, y = 0, z = 0, r = 0.02, seg = 3): G {
  const rr = Math.max(0.0005, Math.min(r, Math.min(w, h, d) / 2 - 0.0005));
  const g = new RoundedBoxGeometry(w, h, d, seg, rr);
  g.translate(x, y, z);
  return g;
}
/** Rounded box from ranges. */
export const rb = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, r = 0.015, seg = 2) =>
  rbox(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, r, seg);

/** Bevelled extrusion of a shape (shape XY plane, extruded along +Z from 0..depth, bevel grows outward). */
export function extrude(shape: THREE.Shape, depth: number, bevel = 0.01, seg = 3, curve = 12): G {
  return new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel,
    bevelSegments: seg, curveSegments: curve,
  });
}

/** Rounded rectangle path (adds to a Shape or Path). */
export function roundRect<T extends THREE.Path>(p: T, x0: number, y0: number, x1: number, y1: number, r: number): T {
  const rr = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2);
  p.moveTo(x0 + rr, y0);
  p.lineTo(x1 - rr, y0); p.quadraticCurveTo(x1, y0, x1, y0 + rr);
  p.lineTo(x1, y1 - rr); p.quadraticCurveTo(x1, y1, x1 - rr, y1);
  p.lineTo(x0 + rr, y1); p.quadraticCurveTo(x0, y1, x0, y1 - rr);
  p.lineTo(x0, y0 + rr); p.quadraticCurveTo(x0, y0, x0 + rr, y0);
  return p;
}
export const rrShape = (x0: number, y0: number, x1: number, y1: number, r: number) => roundRect(new THREE.Shape(), x0, y0, x1, y1, r);
export const rrHole = (x0: number, y0: number, x1: number, y1: number, r: number) => {
  // holes must wind opposite to the outer contour
  const p = new THREE.Path();
  const rr = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2);
  p.moveTo(x0 + rr, y0);
  p.quadraticCurveTo(x0, y0, x0, y0 + rr); p.lineTo(x0, y1 - rr);
  p.quadraticCurveTo(x0, y1, x0 + rr, y1); p.lineTo(x1 - rr, y1);
  p.quadraticCurveTo(x1, y1, x1, y1 - rr); p.lineTo(x1, y0 + rr);
  p.quadraticCurveTo(x1, y0, x1 - rr, y0); p.lineTo(x0 + rr, y0);
  return p;
};

/** Polygon with rounded corners (points CCW recommended). Works for Shape (outer) and Path (holes). */
export function roundPoly<T extends THREE.Path>(p: T, pts: [number, number][], r: number | number[]): T {
  const n = pts.length;
  const rad = (i: number) => (Array.isArray(r) ? r[i] : r);
  const cut = (i: number) => {
    const [px, py] = pts[i];
    const [ax, ay] = pts[(i - 1 + n) % n];
    const [bx, by] = pts[(i + 1) % n];
    const la = Math.hypot(ax - px, ay - py), lb = Math.hypot(bx - px, by - py);
    const rr = Math.min(rad(i), la / 2, lb / 2);
    return { a: [px + ((ax - px) / la) * rr, py + ((ay - py) / la) * rr], b: [px + ((bx - px) / lb) * rr, py + ((by - py) / lb) * rr], p: [px, py] };
  };
  const c0 = cut(0);
  p.moveTo(c0.b[0], c0.b[1]);
  for (let k = 1; k <= n; k++) {
    const c = cut(k % n);
    p.lineTo(c.a[0], c.a[1]);
    p.quadraticCurveTo(c.p[0], c.p[1], c.b[0], c.b[1]);
  }
  return p;
}
/** Offset a convex CCW polygon outward by d (miter). */
export function offsetPoly(pts: [number, number][], d: number): [number, number][] {
  const n = pts.length;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const e1 = [p[0] - a[0], p[1] - a[1]], e2 = [b[0] - p[0], b[1] - p[1]];
    const l1 = Math.hypot(e1[0], e1[1]), l2 = Math.hypot(e2[0], e2[1]);
    const n1 = [e1[1] / l1, -e1[0] / l1], n2 = [e2[1] / l2, -e2[0] / l2];
    const m = [n1[0] + n2[0], n1[1] + n2[1]];
    const ml = Math.hypot(m[0], m[1]) || 1;
    const cos = (m[0] / ml) * n1[0] + (m[1] / ml) * n1[1];
    const k = d / Math.max(0.3, cos);
    return [p[0] + (m[0] / ml) * k, p[1] + (m[1] / ml) * k];
  });
}

/** Set a per-vertex colour = base * ao(x,y,z). */
export function paint(g: G, color: THREE.ColorRepresentation, ao?: AO): G {
  const c = new THREE.Color(color);
  const p = g.attributes.position as THREE.BufferAttribute;
  const arr = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const k = ao ? ao(p.getX(i), p.getY(i), p.getZ(i)) : 1;
    arr[i * 3] = c.r * k; arr[i * 3 + 1] = c.g * k; arr[i * 3 + 2] = c.b * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}
/** Multiply an existing colour attribute by ao (paints white first if missing). */
export function shade(g: G, ao: AO): G {
  if (!g.attributes.color) paint(g, '#ffffff');
  const p = g.attributes.position as THREE.BufferAttribute;
  const c = g.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const k = ao(p.getX(i), p.getY(i), p.getZ(i));
    c.setXYZ(i, c.getX(i) * k, c.getY(i) * k, c.getZ(i) * k);
  }
  return g;
}

/**
 * Merge geometries into one, normalising attributes (position, normal, uv, color).
 * Missing uvs become 0, missing colours become white, so mixed sources merge safely.
 */
export function merge(gs: G[], keepUv = true): G {
  const prepared = gs.map((g0) => {
    const g = g0.index ? g0.toNonIndexed() : g0;
    if (!g.attributes.normal) g.computeVertexNormals();
    const n = g.attributes.position.count;
    if (!g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    if (keepUv && !g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color', ...(keepUv ? ['uv'] : [])].includes(k)) g.deleteAttribute(k);
    g.morphAttributes = {};
    return g;
  });
  const out = mergeGeometries(prepared, false);
  if (!out) throw new Error('merge failed');
  out.computeBoundingSphere();
  return out;
}

/* ---------- noise ---------- */
function hash(x: number, y: number, z: number) {
  let h = x * 374761393 + y * 668265263 + z * 1274126177;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const fade = (t: number) => t * t * (3 - 2 * t);
/** Smooth value noise in [-1,1]. */
export function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const v = (i: number, j: number, k: number) => hash(xi + i, yi + j, zi + k);
  return l(
    l(l(v(0, 0, 0), v(1, 0, 0), xf), l(v(0, 1, 0), v(1, 1, 0), xf), yf),
    l(l(v(0, 0, 1), v(1, 0, 1), xf), l(v(0, 1, 1), v(1, 1, 1), xf), yf), zf) * 2 - 1;
}
export function fbm(x: number, y: number, z: number, oct = 3) {
  let a = 0.5, f = 1, s = 0;
  for (let i = 0; i < oct; i++) { s += a * noise3(x * f, y * f, z * f); a *= 0.5; f *= 2.03; }
  return s;
}
export const smooth = (e0: number, e1: number, x: number) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Deterministic PRNG. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** Grid surface from a function f(u,v) -> point; indexed, smooth normals. */
export function gridSurface(nu: number, nv: number, f: (u: number, v: number, out: THREE.Vector3) => void, uvScale: [number, number] = [1, 1]): G {
  const pos = new Float32Array((nu + 1) * (nv + 1) * 3);
  const uv = new Float32Array((nu + 1) * (nv + 1) * 2);
  const v3 = new THREE.Vector3();
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const k = j * (nu + 1) + i;
    f(i / nu, j / nv, v3);
    pos[k * 3] = v3.x; pos[k * 3 + 1] = v3.y; pos[k * 3 + 2] = v3.z;
    uv[k * 2] = (i / nu) * uvScale[0]; uv[k * 2 + 1] = (j / nv) * uvScale[1];
  }
  const idx: number[] = [];
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Tube along points with a radius function. */
export function tube(points: THREE.Vector3[], radius: number, seg = 24, radial = 6, closed = false): G {
  const c = new THREE.CatmullRomCurve3(points, closed, 'catmullrom', 0.5);
  return new THREE.TubeGeometry(c, seg, radius, radial, closed);
}
export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
