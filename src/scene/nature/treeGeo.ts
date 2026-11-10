// Crafted stylised low-poly trees (O3). Each builder returns { wood, leaf } geometries in tree-local space
// (base at origin, Y up, ~unit scale where a mature maple is ~5 m tall). Colours are SHADE only (painted AO,
// sun/underside gradient) — the actual foliage hue comes from instance colours / material tint (SEASONS).
import * as THREE from 'three';
import { WORLD } from '../layout';
import { G, mulberry32, tubeAlong, softBlob, blob, loft, soft, flat, paint, paintFaces, mergeAll, place, fbm3, noise3, smooth01, lerp } from './util';

export const SUN = new THREE.Vector3(...WORLD.sunDir).normalize();
const BARK_DARK = new THREE.Color('#3E2E24'), BARK = new THREE.Color('#6A5040'), BARK_LIGHT = new THREE.Color('#8C735C');

export interface TreeGeo { wood: G; leaf: G }

/** Tapered trunk with a lobed root flare. */
function trunk(h: number, r0: number, lean: [number, number], seed: number, flare = 1.6) {
  const rand = mulberry32(seed);
  const pts: THREE.Vector3[] = [];
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(new THREE.Vector3(lean[0] * t * t * h + (rand() - 0.5) * 0.06 * t, t * h, lean[1] * t * t * h + (rand() - 0.5) * 0.06 * t));
  }
  pts[0].y = -0.15;
  const g = tubeAlong(pts, (t, a) => {
    const taper = lerp(r0, r0 * 0.38, Math.pow(t, 0.8));
    const root = 1 + flare * Math.pow(1 - smooth01(t, 0, 0.16), 2) * (0.55 + 0.45 * Math.max(0, Math.cos(a * 5 + seed)));
    return taper * root * (0.94 + 0.12 * noise3(Math.cos(a) * 2 + seed, t * 6, Math.sin(a) * 2));
  }, 9, 18, [false, true]);
  return { g, pts };
}

/** Limb from p0 toward p1 with a gentle upward arc. */
function limb(p0: THREE.Vector3, p1: THREE.Vector3, r0: number, r1: number) {
  const mid = p0.clone().lerp(p1, 0.5); mid.y += p0.distanceTo(p1) * 0.12;
  return tubeAlong([p0, mid, p1], (t) => lerp(r0, r1, t), 6, 6, [false, true]);
}

function paintBark(g: G, h: number, seed: number) {
  return paint(g, (p, n, out) => {
    const streak = fbm3(Math.atan2(p.z, p.x) * 2.5 + seed, p.y * 0.6, 0, 2);
    out.copy(BARK).lerp(BARK_LIGHT, smooth01(streak, 0.45, 0.8)).lerp(BARK_DARK, smooth01(streak, 0.4, 0.15));
    // ground AO + sun side warmth
    const ao = 0.45 + 0.55 * smooth01(p.y, -0.1, 0.9);
    const sun = 0.85 + 0.25 * Math.max(0, n.dot(SUN));
    out.multiplyScalar(ao * sun);
    void h;
  });
}

/** Foliage shade: underside + interior darker, sun-facing top lighter; tint = gold highlights on sun side. */
export function paintCanopy(g: G, centre: THREE.Vector3, radius: number, bottom: number, top: number, seed: number, gold = 0.5) {
  const tmp = new THREE.Vector3();
  return paint(g, (p, n, out) => {
    const hy = smooth01(p.y, bottom, top);
    const radial = Math.min(1, tmp.copy(p).sub(centre).setY(0).length() / radius);
    const up = n.y * 0.5 + 0.5;
    const sun = Math.max(0, n.dot(SUN));
    let s = 0.42 + 0.33 * hy + 0.22 * up + 0.12 * radial;
    const v = noise3(p.x * 1.7 + seed, p.y * 1.7, p.z * 1.7);
    s *= 0.9 + 0.2 * v;
    out.setScalar(Math.min(1.12, s));
    // slight hue drift: shadowed foliage goes cooler/redder, giving depth
    out.r *= 1.0; out.g *= 0.94 + 0.06 * hy; out.b *= 0.9 + 0.12 * (1 - hy);
    const hl = smooth01(sun * 0.6 + up * 0.5 + (v - 0.5) * 0.9, 0.62, 0.95);
    return hl * gold;
  });
}

// ---------------- MAPLE / BROADLEAF ----------------
export function maple(seed: number, opts: { height?: number; spread?: number; clumps?: number; detail?: number } = {}): TreeGeo {
  const rand = mulberry32(seed);
  const H = opts.height ?? 4.6, spread = opts.spread ?? 1.0, detail = opts.detail ?? 2;
  const trunkH = H * 0.52;
  const lean: [number, number] = [(rand() - 0.5) * 0.12, (rand() - 0.5) * 0.12];
  const { g: tr, pts } = trunk(trunkH, 0.15, lean, seed);
  const top = pts[pts.length - 1];
  const wood: G[] = [paintBark(soft(tr), trunkH, seed)];
  const leaf: G[] = [];
  const clumps = opts.clumps ?? 3 + Math.floor(rand() * 2);
  const ends: THREE.Vector3[] = [];
  // fork: 2–4 limbs from the crotch, one leader
  for (let i = 0; i < clumps; i++) {
    const a = (i / clumps) * Math.PI * 2 + rand() * 0.8;
    const out = (0.7 + rand() * 0.5) * spread;
    const up = H * (0.18 + rand() * 0.16);
    const from = top.clone().add(new THREE.Vector3(0, -0.15 - rand() * 0.35, 0));
    const e = new THREE.Vector3(top.x + Math.cos(a) * out, top.y + up, top.z + Math.sin(a) * out);
    wood.push(paintBark(soft(limb(from, e, 0.075, 0.03)), trunkH, seed + i));
    // sub-twig
    const mid = from.clone().lerp(e, 0.55);
    const e2 = mid.clone().add(new THREE.Vector3(Math.cos(a + 1.1) * 0.45 * spread, 0.45, Math.sin(a + 1.1) * 0.45 * spread));
    wood.push(paintBark(soft(limb(mid, e2, 0.035, 0.015)), trunkH, seed + i + 9));
    ends.push(e, e2);
  }
  ends.push(top.clone().add(new THREE.Vector3(0, H * 0.32, 0)));
  // canopy clumps: big ones on the limb ends, a crown on top, small fillers
  const cc = new THREE.Vector3(top.x, top.y + H * 0.25, top.z);
  ends.forEach((e, i) => {
    const big = i % 2 === 0 || i === ends.length - 1;
    const r = (big ? 0.95 : 0.65) * (0.85 + rand() * 0.3) * spread;
    const b = softBlob(r, detail, [1.05, 0.72 + rand() * 0.12, 1.05], 0.16, 1.4 / r, seed * 13 + i);
    place(b, e.x, e.y + r * 0.15, e.z, 0, rand() * 6.28, 0);
    leaf.push(b);
  });
  for (let i = 0; i < 2; i++) {
    const a = rand() * 6.28;
    const r = 0.55 * spread;
    const b = softBlob(r, Math.max(1, detail - 1), [1, 0.8, 1], 0.18, 1.6 / r, seed * 31 + i);
    place(b, cc.x + Math.cos(a) * 0.9 * spread, cc.y - 0.55, cc.z + Math.sin(a) * 0.9 * spread);
    leaf.push(b);
  }
  const L = mergeAll(leaf);
  L.computeBoundingBox();
  const bb = L.boundingBox!;
  paintCanopy(L, cc, 1.6 * spread, bb.min.y, bb.max.y, seed);
  return { wood: mergeAll(wood), leaf: L };
}

// ---------------- SPRUCE / PINE ----------------
export function spruce(seed: number, opts: { height?: number; width?: number; tiers?: number } = {}): TreeGeo {
  const rand = mulberry32(seed);
  const H = opts.height ?? 6.5, W = opts.width ?? 1.5, tiers = opts.tiers ?? 6;
  const tr = tubeAlong([new THREE.Vector3(0, -0.1, 0), new THREE.Vector3(0.02, H * 0.4, 0), new THREE.Vector3(0, H * 0.85, 0.02)],
    (t, a) => lerp(0.14, 0.04, t) * (1 + 0.7 * Math.pow(1 - smooth01(t, 0, 0.1), 2) * Math.max(0.3, Math.cos(a * 4 + seed))), 7, 8);
  const wood = [paintBark(soft(tr), H, seed)];
  const leaf: G[] = [];
  const base = H * 0.14;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const y0 = lerp(base, H * 0.78, Math.pow(t, 0.9)) + (rand() - 0.5) * 0.15;
    const R = W * lerp(1, 0.28, t) * (0.88 + rand() * 0.24);
    const h = lerp(1.25, 0.85, t) * (H / 6.5) * 1.15;
    const lobes = 7 + Math.floor(rand() * 3), ph = rand() * 6.28, droop = 0.22 + rand() * 0.12;
    const ox = (rand() - 0.5) * 0.12, oz = (rand() - 0.5) * 0.12;
    // profile rings: apex → shoulder → skirt edge (droops at lobe tips) → tucked underside
    const prof: [number, number][] = [[0.04, h], [0.42, h * 0.55], [0.82, h * 0.18], [1.0, 0], [0.55, h * 0.12], [0.12, h * 0.2]];
    const g = loft(prof.length - 1, lobes * 2, (u, a, out, ri) => {
      const [pr, py] = prof[ri];
      const scal = 0.78 + 0.22 * Math.pow(Math.abs(Math.cos(((a + ph) * lobes) / 2)), 0.6);
      const edge = ri >= 2 && ri <= 3 ? 1 : 0;
      const jag = 1 + (fbm3(Math.cos(a) * 1.3 + seed, Math.sin(a) * 1.3, i, 2) - 0.5) * 0.35;
      const rr = R * pr * (edge ? scal * jag : 1);
      const dy = edge ? -droop * h * (ri === 3 ? scal : scal * 0.5) : 0;
      out.set(ox + Math.cos(a) * rr, y0 + py + dy, oz + Math.sin(a) * rr);
    }, [true, true]);
    leaf.push(flat(g));
  }
  // irregular leader tip
  const tip = flat(new THREE.ConeGeometry(0.16, 0.7, 5).translate(0, H * 0.78 + 1.0, 0));
  leaf.push(tip);
  const L = mergeAll(leaf);
  paintFaces(L, (c, n, out) => {
    const hy = smooth01(c.y, 0, H);
    const r = Math.hypot(c.x, c.z) / W;
    const under = n.y < -0.05 ? 0.55 : 1;
    const sun = Math.max(0, n.dot(SUN));
    out.setScalar((0.5 + 0.3 * hy + 0.25 * Math.min(1, r)) * under * (0.9 + 0.2 * noise3(c.x * 2, c.y * 2, c.z * 2 + seed)));
    return smooth01(sun + n.y * 0.4 + r * 0.3, 0.75, 1.2) * 0.55;
  });
  return { wood: mergeAll(wood), leaf: L };
}

// ---------------- BIRCH ----------------
const BIRCH_W = new THREE.Color('#EEE9DF'), BIRCH_D = new THREE.Color('#25221F'), BIRCH_G = new THREE.Color('#C9C2B4');
export function birch(seed: number, opts: { height?: number; lean?: number; leafy?: number } = {}): TreeGeo {
  const rand = mulberry32(seed);
  const H = opts.height ?? 7.5, leanA = opts.lean ?? 0.1, leafy = opts.leafy ?? 0.6;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 7; i++) {
    const t = i / 7;
    pts.push(new THREE.Vector3(Math.sin(leanA) * t * H + Math.sin(t * 5 + seed) * 0.08, t * H, Math.sin(t * 4 + seed) * 0.06));
  }
  pts[0].y = -0.1;
  const tr = soft(tubeAlong(pts, (t, a) => lerp(0.13, 0.035, Math.pow(t, 0.85)) * (1 + 0.6 * Math.pow(1 - smooth01(t, 0, 0.08), 2) * Math.max(0.2, Math.cos(a * 4))), 9, 44));
  const parts: G[] = [tr];
  const ends: THREE.Vector3[] = [];
  const curve = new THREE.CatmullRomCurve3(pts);
  const nb = 7 + Math.floor(rand() * 3);
  for (let b = 0; b < nb; b++) {
    const t = 0.38 + (b / nb) * 0.55;
    const p0 = curve.getPointAt(t);
    const a = rand() * 6.28, len = lerp(1.6, 0.7, t) * (0.8 + rand() * 0.4);
    const p1 = p0.clone().add(new THREE.Vector3(Math.cos(a) * len, len * (0.55 + rand() * 0.4), Math.sin(a) * len));
    const mid = p0.clone().lerp(p1, 0.5).add(new THREE.Vector3(0, -0.12, 0));
    parts.push(soft(tubeAlong([p0, mid, p1], (u) => lerp(0.04, 0.012, u), 5, 6)));
    // drooping twigs
    const p2 = p1.clone().add(new THREE.Vector3(Math.cos(a + 0.6) * 0.4, -0.35, Math.sin(a + 0.6) * 0.4));
    parts.push(soft(tubeAlong([p1, p1.clone().lerp(p2, 0.5).add(new THREE.Vector3(0, 0.06, 0)), p2], (u) => lerp(0.012, 0.005, u), 4, 4)));
    ends.push(p1, p1.clone().lerp(p2, 0.6));
  }
  const wood = mergeAll(parts);
  // black lenticel marks: crisp horizontal dashes on the white bark
  paintFaces(wood, (c, n, out) => {
    const ang = Math.atan2(c.z - 0, c.x - Math.sin(leanA) * c.y);
    const band = noise3(c.y * 7 + seed, Math.cos(ang) * 1.2, Math.sin(ang) * 1.2);
    const dash = noise3(c.y * 3, ang * 2.5 + seed, 1);
    const thin = Math.hypot(c.x - Math.sin(leanA) * c.y, c.z) < 0.03;
    out.copy(BIRCH_W).lerp(BIRCH_G, noise3(c.y * 2, ang, seed) * 0.6);
    if (band > 0.72 && dash > 0.35) out.copy(BIRCH_D);
    if (c.y < 0.5) out.lerp(BIRCH_D, smooth01(0.5 - c.y, 0, 0.5) * 0.85); // dark rough base
    if (thin) out.lerp(new THREE.Color('#5B4A3E'), 0.6);
    out.multiplyScalar(0.8 + 0.25 * Math.max(0, n.dot(SUN)));
  });
  const leaf: G[] = [];
  ends.forEach((e, i) => {
    if (rand() > leafy) return;
    const r = 0.38 + rand() * 0.3;
    leaf.push(place(softBlob(r, 1, [1.1, 0.75, 1.1], 0.22, 2.4 / r, seed * 7 + i), e.x, e.y, e.z));
  });
  const L = leaf.length ? mergeAll(leaf) : softBlob(0.01, 0, [1, 1, 1], 0, 1, 0);
  L.computeBoundingBox();
  paintCanopy(L, new THREE.Vector3(Math.sin(leanA) * H * 0.7, H * 0.75, 0), 1.6, L.boundingBox!.min.y, L.boundingBox!.max.y, seed, 0.7);
  return { wood, leaf: L };
}

// ---------------- BUSH ----------------
export function bush(seed: number, size = 1): G {
  const rand = mulberry32(seed);
  const parts: G[] = [];
  const n = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.28 + rand(), d = i === 0 ? 0 : 0.35 + rand() * 0.25;
    const r = (i === 0 ? 0.55 : 0.38 + rand() * 0.15) * size;
    parts.push(place(softBlob(r, 1, [1.1, 0.78, 1.1], 0.2, 1.5 / r, seed + i * 5), Math.cos(a) * d * size, r * 0.55, Math.sin(a) * d * size));
  }
  const g = mergeAll(parts);
  paintCanopy(g, new THREE.Vector3(0, 0.4 * size, 0), 0.8 * size, 0, 0.9 * size, seed, 0.45);
  return g;
}

// ---------------- ROCK ----------------
export function rock(seed: number, size = 1): G {
  const rand = mulberry32(seed);
  const g = blob(size, 1, [1 + rand() * 0.4, 0.55 + rand() * 0.25, 0.9 + rand() * 0.3], 0.22, 1.1 / size, seed);
  // chamfer: pull the very top/bottom flat so it reads as a bevelled boulder seated in the ground
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y < -size * 0.2 ? -size * 0.2 : Math.min(y, size * 0.48)); }
  const f = flat(g);
  paintFaces(f, (c, n, out) => {
    const v = noise3(c.x * 3 + seed, c.y * 3, c.z * 3);
    out.setRGB(0.6, 0.58, 0.55).multiplyScalar(0.75 + 0.35 * v);
    out.multiplyScalar(0.55 + 0.45 * smooth01(c.y, -size * 0.2, size * 0.25)); // contact AO
    return n.y > 0.55 ? smooth01(v, 0.45, 0.75) * 0.55 : 0; // moss/lichen on top faces
  });
  return f;
}

export { mergeAll, place };
