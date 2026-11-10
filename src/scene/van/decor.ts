// Small soft/hard props: pink tumbler (lid + straw), folded-open book, potted plant, hanging hoodie + jacket.
import * as THREE from 'three';
import { fbm, gridSurface, merge, paint, rbox, rng, tube, V, type G } from './util';

/** Stanley-style tumbler: tapered lathe body with handle, lid, straw. Origin at base centre. */
export function makeTumbler() {
  const body = new THREE.LatheGeometry([
    [0.0, 0], [0.026, 0], [0.03, 0.004], [0.031, 0.05], [0.04, 0.07], [0.042, 0.16], [0.041, 0.17],
  ].map(([x, y]) => new THREE.Vector2(x, y)), 28);
  const handle = tube([V(0.04, 0.155, 0), V(0.07, 0.15, 0), V(0.075, 0.1, 0), V(0.07, 0.07, 0), V(0.035, 0.065, 0)], 0.008, 20, 8);
  const lid = new THREE.LatheGeometry([[0, 0.185], [0.03, 0.185], [0.043, 0.18], [0.045, 0.172], [0.043, 0.168]].map(([x, y]) => new THREE.Vector2(x, y)), 28);
  const straw = new THREE.CylinderGeometry(0.0045, 0.0045, 0.13, 10);
  straw.translate(0, 0.065, 0); straw.rotateZ(-0.12); straw.translate(0.008, 0.17, 0.005);
  return { pink: merge([body, handle], false), lid: merge([lid], false), straw };
}

/** Open paperback lying face-up: two curved page blocks + cover. Origin at spine. */
export function makeBook() {
  const pageW = 0.1, len = 0.15;
  const pages = gridSurface(24, 2, (u, v, o) => {
    const s = (u * 2 - 1); // -1..1 across spine
    const x = s * pageW;
    const y = 0.012 * Math.pow(Math.abs(s), 0.5) * (1 - Math.abs(s) * 0.3) + 0.004 - (Math.abs(s) < 0.06 ? 0.006 * (1 - Math.abs(s) / 0.06) : 0);
    o.set(x, y, (v - 0.5) * len);
  });
  const block = rbox(pageW * 2, 0.008, len, 0, 0.004, 0, 0.003, 1);
  const cover = rbox(pageW * 2 + 0.012, 0.003, len + 0.01, 0, 0.0015, 0, 0.0015, 1);
  return { pages: merge([pages, block], false), cover };
}

/** Small succulent in a terracotta pot. */
export function makePlant() {
  const pot = new THREE.LatheGeometry([[0, 0], [0.028, 0], [0.034, 0.05], [0.038, 0.05], [0.038, 0.062], [0.032, 0.062], [0.03, 0.055], [0, 0.055]].map(([x, y]) => new THREE.Vector2(x, y)), 20);
  const leaves: G[] = [];
  const r = rng(9);
  for (let i = 0; i < 9; i++) {
    const l = new THREE.SphereGeometry(1, 8, 6);
    l.scale(0.008, 0.028 + r() * 0.012, 0.014);
    l.translate(0, 0.022, 0);
    l.rotateX(0.35 + r() * 0.5);
    l.rotateY((i / 9) * Math.PI * 2 + r() * 0.4);
    l.translate(0, 0.056, 0);
    leaves.push(paint(l, i % 2 ? '#6E8F55' : '#83A565'));
  }
  return { pot: paint(pot, '#C0673C'), leaves: merge(leaves, false) };
}

/**
 * Hanging garment: a soft hood + body sculpted from a deformed grid (cloth hanging from a hook, gravity folds),
 * plus two lathe sleeves that fall at the sides. Local origin at the hook; hangs along -Y, flat-ish in X (toward wall).
 */
export function makeGarment(opts: { len: number; width: number; hood: boolean; seed: number }) {
  const { len, width, hood, seed } = opts;
  // body: a "tube" of cloth flattened against the wall, wider at the hem, with vertical folds
  const body = gridSurface(28, 20, (u, v, o) => {
    const a = u * Math.PI * 2;
    const t = v; // 0 = shoulders, 1 = hem
    const shoulder = 0.35 + 0.65 * Math.min(1, t * 6); // narrow at the hanger, quickly widens
    const half = width * 0.5 * shoulder * (1 + 0.08 * t);
    const folds = 1 + 0.08 * Math.sin(a * 5 + seed) * t + 0.05 * fbm(a, t * 3, seed, 2);
    const z = Math.cos(a) * half * folds;
    const x = Math.sin(a) * 0.045 * (0.6 + 0.4 * t) * folds;
    const y = -0.04 - t * len - (Math.cos(a) * 0.015 * t);
    o.set(x, y, z);
  });
  const parts: G[] = [body];
  // close the hem with a soft cap is unnecessary (seen from the side); sleeves
  for (const s of [1, -1]) {
    const sl = new THREE.LatheGeometry([0.03, 0.034, 0.036, 0.034, 0.03, 0.026].map((r, i) => new THREE.Vector2(r, -i * (len * 0.16))), 10);
    sl.scale(0.7, 1, 1);
    sl.rotateX(s * 0.12);
    sl.translate(0, -0.08, s * width * 0.44);
    parts.push(sl);
  }
  if (hood) {
    const h = new THREE.SphereGeometry(1, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
    h.scale(0.05, 0.075, 0.075);
    h.rotateZ(Math.PI); // dome hanging down the back
    h.translate(0.03, -0.06, 0);
    parts.push(h);
    // drawstrings
    for (const s of [1, -1]) parts.push(tube([V(-0.045, -0.08, s * 0.03), V(-0.05, -0.16, s * 0.034), V(-0.048, -0.24, s * 0.03)], 0.003, 10, 5));
  } else {
    // collar
    const c = new THREE.TorusGeometry(0.04, 0.012, 6, 16);
    c.rotateY(Math.PI / 2); c.scale(0.6, 0.5, 1); c.translate(0, -0.05, 0);
    parts.push(c);
  }
  return merge(parts, false);
}

/** Wall hook. */
export function makeHook() {
  return merge([rbox(0.012, 0.04, 0.03, 0, 0, 0, 0.005, 1), tube([V(0, 0, 0), V(-0.025, -0.005, 0), V(-0.03, 0.02, 0)], 0.004, 8, 5)], false);
}
