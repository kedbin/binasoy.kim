// Procedural geometry toolkit for the stylised low-poly nature + props (O3).
// Every geometry built here is normalised to the same attribute set { position, normal, color, aTint }
// so it can be merged freely. `color` = painted shade / AO (multiplies the material/instance colour),
// `aTint` = 0..1 blend toward the material's highlight colour (sun-kissed gold, moss, white stripe…).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32, fbm2, noise2, fbm1 } from '../lake/noise';

export { mulberry32, fbm2, noise2, fbm1 };
export type G = THREE.BufferGeometry;

const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _c = new THREE.Color();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();

export const smooth01 = (x: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---- 3D value noise (CPU) ----
function h3(x: number, y: number, z: number) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
const sm = (t: number) => t * t * (3 - 2 * t);
export function noise3(x: number, y: number, z: number) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = sm(x - ix), fy = sm(y - iy), fz = sm(z - iz);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c00 = l(h3(ix, iy, iz), h3(ix + 1, iy, iz), fx), c10 = l(h3(ix, iy + 1, iz), h3(ix + 1, iy + 1, iz), fx);
  const c01 = l(h3(ix, iy, iz + 1), h3(ix + 1, iy, iz + 1), fx), c11 = l(h3(ix, iy + 1, iz + 1), h3(ix + 1, iy + 1, iz + 1), fx);
  return l(l(c00, c10, fy), l(c01, c11, fy), fz);
}
export function fbm3(x: number, y: number, z: number, oct = 3) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += a * noise3(x * f, y * f, z * f); f *= 2.07; a *= 0.5; }
  return v / (1 - Math.pow(0.5, oct));
}

// ---- attribute normalisation ----
export function attrs(g: G) {
  const n = g.attributes.position.count;
  if (!g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  if (!g.attributes.aTint) g.setAttribute('aTint', new THREE.BufferAttribute(new Float32Array(n), 1));
  return g;
}
const KEEP = ['position', 'normal', 'color', 'aTint'];
export function clean(g: G) {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (!KEEP.includes(k)) n.deleteAttribute(k);
  n.morphAttributes = {};
  n.clearGroups();
  if (!n.attributes.normal) n.computeVertexNormals();
  return attrs(n);
}
/** Non-indexed + per-face normals → crisp facets. */
export function flat(g: G) { const n = clean(g); n.computeVertexNormals(); return n; }
/** Smooth normals (works on indexed geometry), then normalise. */
export function soft(g: G) { g.computeVertexNormals(); return clean(g); }

export function displace(g: G, fn: (p: THREE.Vector3, i: number) => void) {
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { _v.fromBufferAttribute(p, i); fn(_v, i); p.setXYZ(i, _v.x, _v.y, _v.z); }
  p.needsUpdate = true;
  return g;
}

/** Per-vertex paint. Callback writes the shade colour into `out` and may return a tint (0..1). */
export function paint(g: G, fn: (p: THREE.Vector3, n: THREE.Vector3, out: THREE.Color, i: number) => number | void) {
  attrs(g);
  const p = g.attributes.position as THREE.BufferAttribute, nn = g.attributes.normal as THREE.BufferAttribute;
  const col = g.attributes.color as THREE.BufferAttribute, tint = g.attributes.aTint as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    _v.fromBufferAttribute(p, i); _n.fromBufferAttribute(nn, i); _c.setRGB(1, 1, 1);
    const t = fn(_v, _n, _c, i);
    col.setXYZ(i, _c.r, _c.g, _c.b);
    if (typeof t === 'number') tint.setX(i, t);
  }
  col.needsUpdate = true; tint.needsUpdate = true;
  return g;
}
/** Per-triangle paint (geometry must be non-indexed). Callback gets centroid + face normal. */
export function paintFaces(g: G, fn: (c: THREE.Vector3, n: THREE.Vector3, out: THREE.Color, f: number) => number | void) {
  attrs(g);
  const p = g.attributes.position as THREE.BufferAttribute;
  const col = g.attributes.color as THREE.BufferAttribute, tint = g.attributes.aTint as THREE.BufferAttribute;
  for (let f = 0; f < p.count / 3; f++) {
    _a.fromBufferAttribute(p, f * 3); _b.fromBufferAttribute(p, f * 3 + 1); _d.fromBufferAttribute(p, f * 3 + 2);
    _v.copy(_a).add(_b).add(_d).multiplyScalar(1 / 3);
    _n.subVectors(_d, _b).cross(_b.clone().sub(_a).multiplyScalar(-1)).normalize();
    _n.subVectors(_b, _a).cross(_d.clone().sub(_a)).normalize();
    _c.setRGB(1, 1, 1);
    const t = fn(_v, _n, _c, f);
    for (let k = 0; k < 3; k++) { col.setXYZ(f * 3 + k, _c.r, _c.g, _c.b); if (typeof t === 'number') tint.setX(f * 3 + k, t); }
  }
  col.needsUpdate = true; tint.needsUpdate = true;
  return g;
}

export function mergeAll(list: G[]) {
  const ok = list.filter((g) => g && g.attributes.position.count > 0).map(clean);
  return mergeGeometries(ok, false)!;
}

/**
 * Generic loft: rings × seg grid. `fn(t, a, out)` returns the vertex for ring t∈[0,1] and angle a∈[0,2π).
 * Winding is auto-corrected to face outward. Optional fan caps at both ends.
 */
export function loft(rings: number, seg: number, fn: (t: number, a: number, out: THREE.Vector3, i: number, j: number) => void, caps: [boolean, boolean] = [false, false]) {
  const pos: number[] = [], idx: number[] = [];
  const v = new THREE.Vector3();
  for (let i = 0; i <= rings; i++) for (let j = 0; j < seg; j++) { fn(i / rings, (j / seg) * Math.PI * 2, v, i, j); pos.push(v.x, v.y, v.z); }
  const at = (i: number, j: number) => i * seg + (j % seg);
  // orientation test on a middle ring
  const mi = Math.max(1, Math.floor(rings / 2)) - (rings === 1 ? 1 : 0);
  const ringC = (i: number) => { const c = new THREE.Vector3(); for (let j = 0; j < seg; j++) c.add(new THREE.Vector3().fromArray(pos, at(i, j) * 3)); return c.divideScalar(seg); };
  const A = new THREE.Vector3().fromArray(pos, at(mi, 0) * 3), B = new THREE.Vector3().fromArray(pos, at(mi, 1) * 3), Cc = new THREE.Vector3().fromArray(pos, at(mi + 1, 0) * 3);
  const nrm = Cc.clone().sub(A).cross(B.clone().sub(A));
  const out = A.clone().sub(ringC(mi));
  const flip = nrm.dot(out) < 0;
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
    const a = at(i, j), b = at(i, j + 1), c = at(i + 1, j), d = at(i + 1, j + 1);
    if (!flip) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  const addCap = (i: number, end: boolean) => {
    const c = ringC(i), ci = pos.length / 3;
    pos.push(c.x, c.y, c.z);
    for (let j = 0; j < seg; j++) {
      const a = at(i, j), b = at(i, j + 1);
      // start cap faces -axis, end cap +axis; follow the side winding convention
      if (end !== flip) idx.push(ci, a, b); else idx.push(ci, b, a);
    }
  };
  if (caps[0]) addCap(0, false);
  if (caps[1]) addCap(rings, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

/** Tube along a list of points with a radius function — trunks, limbs, ropes, driftwood. */
export function tubeAlong(pts: THREE.Vector3[], radius: (t: number, a: number) => number, seg = 7, rings = pts.length * 2, caps: [boolean, boolean] = [false, true]) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const frames = curve.computeFrenetFrames(rings, false);
  const tmp = new THREE.Vector3();
  return loft(rings, seg, (t, a, out, i) => {
    const P = curve.getPointAt(t, tmp);
    const r = radius(t, a);
    const N = frames.normals[i], Bn = frames.binormals[i];
    out.set(P.x + (N.x * Math.cos(a) + Bn.x * Math.sin(a)) * r, P.y + (N.y * Math.cos(a) + Bn.y * Math.sin(a)) * r, P.z + (N.z * Math.cos(a) + Bn.z * Math.sin(a)) * r);
  }, caps);
}

/** Lumpy, flattened, noise-displaced icosphere — canopy clumps, bushes, rocks. */
export function blob(r: number, detail: number, squash: [number, number, number], amp: number, freq: number, seed: number) {
  const g = new THREE.IcosahedronGeometry(r, detail);
  return displace(g, (p) => {
    const n = fbm3(p.x * freq + seed * 7.1, p.y * freq + seed * 3.3, p.z * freq - seed * 1.7, 3) - 0.5;
    const len = p.length();
    p.multiplyScalar((len + n * amp * 2 * r) / len);
    p.set(p.x * squash[0], p.y * squash[1], p.z * squash[2]);
  });
}

/** Translate/rotate helper returning the same geometry. */
export function place(g: G, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s: number | [number, number, number] = 1) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    Array.isArray(s) ? new THREE.Vector3(...s) : new THREE.Vector3(s, s, s),
  );
  g.applyMatrix4(m);
  return g;
}

/** Relative luminance of a hex/Color (sRGB-ish), used to pick palette highlights. */
export function lum(c: THREE.Color) { return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; }
export function brightest(hexes: string[], fallback = '#E8B44A') {
  if (!hexes.length) return new THREE.Color(fallback);
  return hexes.map((h) => new THREE.Color(h)).sort((a, b) => lum(b) - lum(a))[0];
}
export function darkest(hexes: string[], fallback = '#3B5A3F') {
  if (!hexes.length) return new THREE.Color(fallback);
  return hexes.map((h) => new THREE.Color(h)).sort((a, b) => lum(a) - lum(b))[0];
}
