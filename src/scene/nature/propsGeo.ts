// Ground props (O3): split-rail fence, grass tufts, ferns, pebbles, driftwood.
import * as THREE from 'three';
import { WORLD } from '../layout';
import { G, mulberry32, tubeAlong, soft, flat, paint, paintFaces, mergeAll, place, displace, noise3, fbm3, smooth01, lerp } from './util';
import { groundHeight } from './terrain';
import { SUN } from './treeGeo';

const WOOD = new THREE.Color('#7A6450'), WOOD_D = new THREE.Color('#4A3A2C'), WOOD_L = new THREE.Color('#A08A70');

function roughWood(g: G, seed: number, ground = true) {
  return paint(g, (p, n, out) => {
    const grain = fbm3(p.x * 9 + seed, p.y * 1.2 + p.z * 1.2, p.z * 9, 3);
    out.copy(WOOD).lerp(WOOD_L, smooth01(grain, 0.5, 0.8) * 0.8).lerp(WOOD_D, smooth01(grain, 0.42, 0.2));
    if (ground) out.multiplyScalar(0.5 + 0.5 * smooth01(p.y - groundHeight(p.x, p.z), 0, 0.5));
    out.multiplyScalar(0.85 + 0.2 * Math.max(0, n.dot(SUN)));
    return smooth01(Math.max(0, n.y), 0.6, 1) * 0.5; // weathered silvery tops
  });
}

/** Box timber with chamfered edges and noisy hewn faces. */
function timber(w: number, h: number, d: number, seed: number, segH = 6) {
  const g = new THREE.BoxGeometry(w, h, d, 2, segH, 2);
  const hw = w / 2, hd = d / 2;
  displace(g, (p) => {
    // chamfer the vertical edges
    const ex = Math.abs(p.x) / hw, ez = Math.abs(p.z) / hd;
    if (ex > 0.99 && ez > 0.99) { p.x *= 0.82; p.z *= 0.82; }
    const n = noise3(p.x * 8 + seed, p.y * 3, p.z * 8) - 0.5;
    p.x += n * 0.018; p.z += n * 0.018;
  });
  return g;
}

export function fenceGeometry() {
  const rand = mulberry32(42);
  const parts: G[] = [];
  const x0 = -10.5, x1 = 8.5, posts = 7;
  const zAt = (x: number) => WORLD.fenceZ + Math.sin(x * 0.21 + 0.4) * 0.22;
  const tops: { x: number; z: number; y: number; h: number }[] = [];
  for (let i = 0; i <= posts; i++) {
    const x = x0 + ((x1 - x0) * i) / posts + (rand() - 0.5) * 0.3, z = zAt(x);
    const gy = groundHeight(x, z);
    const h = 1.02 + (rand() - 0.5) * 0.12;
    const post = timber(0.13, h + 0.25, 0.12, i, 8);
    // weathered bevel on top
    displace(post, (p) => { if (p.y > (h + 0.25) / 2 - 0.01) p.y -= (p.x + 0.065) * 0.25; });
    place(post, x, gy + (h + 0.25) / 2 - 0.25, z, (rand() - 0.5) * 0.06, (rand() - 0.5) * 0.3, (rand() - 0.5) * 0.06);
    parts.push(roughWood(soft(post), i));
    tops.push({ x, z, y: gy, h });
  }
  // two split rails per bay, resting in notches; ends overrun the posts slightly
  for (let i = 0; i < posts; i++) {
    const a = tops[i], b = tops[i + 1];
    for (const [k, hh] of [[0, 0.42], [1, 0.82]] as const) {
      const ya = a.y + hh * a.h + (rand() - 0.5) * 0.04, yb = b.y + hh * b.h + (rand() - 0.5) * 0.04;
      const sag = -0.03 - rand() * 0.03;
      const pA = new THREE.Vector3(a.x - 0.08, ya, a.z + 0.075), pB = new THREE.Vector3(b.x + 0.08, yb, b.z + 0.075);
      const mid = pA.clone().lerp(pB, 0.5); mid.y += sag;
      const r = 0.05 + rand() * 0.01, seed = i * 2 + k;
      // split rail: half-round with a flat sawn face toward the lake
      const rail = tubeAlong([pA, mid, pB], (t, ang) => {
        const rr = r * (0.9 + 0.2 * noise3(t * 6 + seed, ang, 0));
        const flatFace = Math.cos(ang) > 0.35 ? 0.62 / Math.max(0.35, Math.cos(ang)) * 0.6 : 1;
        return rr * Math.min(1, flatFace);
      }, 7, 10, [true, true]);
      parts.push(roughWood(soft(rail), seed, false));
    }
  }
  // notch blocks: tiny darker wedges under each rail end (reads as a notched seat)
  tops.forEach((t, i) => {
    for (const hh of [0.42, 0.82]) {
      const g = new THREE.BoxGeometry(0.15, 0.03, 0.16);
      place(g, t.x, t.y + hh * t.h - 0.055, t.z + 0.04);
      parts.push(paint(flat(g), (_p, _n, o) => { o.copy(WOOD_D).multiplyScalar(0.8); }));
      void i;
    }
  });
  return mergeAll(parts);
}

/** One tuft of curved, tapered blades. Shade: dark root → bright tip (tint = tip colour). */
export function grassTuft(seed: number, blades = 9, height = 0.42) {
  const rand = mulberry32(seed);
  const parts: G[] = [];
  for (let b = 0; b < blades; b++) {
    const a = rand() * 6.28, lean = 0.2 + rand() * 0.45, h = height * (0.6 + rand() * 0.6), w = 0.028 + rand() * 0.018;
    const ox = (rand() - 0.5) * 0.12, oz = (rand() - 0.5) * 0.12;
    const segs = 3, pos: number[] = [];
    const pt = (t: number, side: number) => {
      const bend = lean * t * t;
      const ww = w * (1 - t) * side;
      return [ox + Math.cos(a) * bend * h + Math.sin(a) * ww, t * h, oz + Math.sin(a) * bend * h - Math.cos(a) * ww];
    };
    for (let s = 0; s < segs; s++) {
      const t0 = s / segs, t1 = (s + 1) / segs;
      const A = pt(t0, -1), B = pt(t0, 1), C = pt(t1, -1), D = pt(t1, 1);
      if (s === segs - 1) pos.push(...A, ...B, ...C);
      else pos.push(...A, ...B, ...C, ...B, ...D, ...C);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    // bias normals upward so double-sided blades light like the ground (no black backfaces)
    const n = g.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < n.count; i++) { const v = new THREE.Vector3(n.getX(i) * 0.35, 1, n.getZ(i) * 0.35).normalize(); n.setXYZ(i, v.x, v.y, v.z); }
    parts.push(g);
  }
  const g = mergeAll(parts);
  paint(g, (p, _n, out) => { const t = smooth01(p.y, 0, height); out.setScalar(0.45 + 0.6 * t); return t * t * 0.7; });
  return g;
}

/** Fern: arched fronds radiating from a crown, made from leaflet strips. */
export function fern(seed: number, size = 0.7) {
  const rand = mulberry32(seed);
  const parts: G[] = [];
  const fronds = 7;
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * 6.28 + rand() * 0.4, len = size * (0.75 + rand() * 0.4), arch = 0.55 + rand() * 0.25;
    const pos: number[] = [];
    const P = (t: number) => new THREE.Vector3(Math.cos(a) * t * len, Math.sin(t * Math.PI * arch) * len * 0.55 - t * t * len * 0.2, Math.sin(a) * t * len);
    const N = 9;
    for (let i = 0; i < N; i++) {
      const t0 = i / N, t1 = (i + 1) / N;
      const p0 = P(t0), p1 = P(t1), mid = p0.clone().lerp(p1, 0.5);
      const w = Math.sin(Math.min(1, (t0 + 0.08)) * Math.PI) * len * 0.16;
      const side = new THREE.Vector3(-Math.sin(a), 0.15, Math.cos(a)).normalize().multiplyScalar(w);
      // two leaflets per segment (a diamond each side of the rachis)
      for (const s of [1, -1]) {
        const tip = mid.clone().addScaledVector(side, s).add(new THREE.Vector3(Math.cos(a), -0.3, Math.sin(a)).multiplyScalar(w * 0.5));
        pos.push(p0.x, p0.y, p0.z, tip.x, tip.y, tip.z, p1.x, p1.y, p1.z);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    const n = g.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < n.count; i++) { const v = new THREE.Vector3(n.getX(i) * 0.4, Math.abs(n.getY(i)) + 0.6, n.getZ(i) * 0.4).normalize(); n.setXYZ(i, v.x, v.y, v.z); }
    parts.push(g);
  }
  const g = mergeAll(parts);
  paint(g, (p, _n, out) => { const t = smooth01(Math.hypot(p.x, p.z), 0, size); out.setScalar(0.5 + 0.55 * t); return t * 0.4; });
  return g;
}

export function pebble(seed: number) {
  const rand = mulberry32(seed);
  const g = new THREE.IcosahedronGeometry(1, 0);
  displace(g, (p) => { p.multiplyScalar(0.85 + rand() * 0.3); p.y *= 0.5; });
  const f = flat(g);
  paintFaces(f, (c, n, out) => { out.setScalar(0.7 + 0.3 * Math.max(0, n.y)); void c; });
  return f;
}

/** Bleached driftwood log with a forked branch stub and a root knot. */
export function driftwood(seed: number, len = 2.4) {
  const rand = mulberry32(seed);
  const pts = [0, 0.25, 0.5, 0.75, 1].map((t) => new THREE.Vector3((t - 0.5) * len, 0.08 + Math.sin(t * 3 + seed) * 0.04, Math.sin(t * 2.3 + seed) * 0.15));
  const main = soft(tubeAlong(pts, (t, a) => lerp(0.11, 0.05, t) * (1 + 0.6 * Math.pow(1 - smooth01(t, 0, 0.12), 2)) * (0.85 + 0.25 * noise3(t * 9, a * 2, seed)), 8, 14, [true, true]));
  const s0 = pts[2].clone();
  const stub = soft(tubeAlong([s0, s0.clone().add(new THREE.Vector3(0.25, 0.28, 0.2)), s0.clone().add(new THREE.Vector3(0.5, 0.42, 0.5))], (t) => lerp(0.04, 0.015, t), 6, 5));
  const g = mergeAll([main, stub]);
  paint(g, (p, n, out) => {
    const grain = fbm3(p.x * 2 + seed, p.y * 14, p.z * 14, 2);
    out.set('#B7AE9E').lerp(new THREE.Color('#E1D9C8'), smooth01(grain, 0.5, 0.75)).lerp(new THREE.Color('#6E655A'), smooth01(grain, 0.38, 0.2));
    out.multiplyScalar(0.6 + 0.4 * smooth01(p.y, 0, 0.18));
    void n; void rand;
  });
  return g;
}

export { place, mergeAll };
