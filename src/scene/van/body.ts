// Exterior body of the Pacifica-style minivan: bevelled side-profile extrusions, sculpted arches, greenhouse with
// window cut-outs + tumblehome, roof with twin sunroof openings, rear D-pillars/bumper. Pure geometry builders.
import * as THREE from 'three';
import { VAN } from '../layout';
import { extrude, merge, paint, rb, rbox, roundPoly, rrHole, tube, V, type G } from './util';

export const W = VAN.innerWidth / 2; // 0.775 interior half-width
export const OUT = 0.95; // body half-width at the beltline
export const Z_BACK = VAN.backZ + 0.05; // rear face of the body
export const Z_NOSE = -3.66;
export const CAB = VAN.frontZ - 0.06; // cargo/cabin split
export const BELT = 1.05; // beltline height
export const ROOF = 1.8; // outer roof height
export const WHEEL = { r: 0.34, y: 0.34, zs: [-2.72, 0.32] as number[], arch: 0.43 };
/** Greenhouse windows (z,y) polygons, CCW. */
export const WIN_SLIDE: [number, number][] = [[-1.28, BELT + 0.06], [0.24, BELT + 0.06], [0.24, 1.66], [-1.28, 1.66]];
export const WIN_QUARTER: [number, number][] = [[0.36, BELT + 0.06], [0.98, BELT + 0.06], [0.84, 1.66], [0.36, 1.66]];
export const WIN_FRONT: [number, number][] = [[-2.62, BELT + 0.06], [-1.42, BELT + 0.06], [-1.42, 1.66], [-2.1, 1.66]];

/** Inward lean of the greenhouse above the beltline (tumblehome). */
export const lean = (y: number) => 1 - Math.max(0, y - BELT) * 0.09;
export function applyLean(g: G) {
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * lean(p.getY(i)));
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** Extrude a (z,y) profile shape across x, occupying [xMin, xMax]. */
export function slab(shape: THREE.Shape, xMin: number, xMax: number, bev = 0.02, curve = 16): G {
  const depth = Math.max(0.001, xMax - xMin - 2 * bev);
  const g = extrude(shape, depth, bev, 3, curve);
  g.rotateY(-Math.PI / 2); // shape x -> world z, extrude z -> world -x
  g.translate(xMax - bev, 0, 0);
  return g;
}
const both = (f: (s: number) => G[]) => [...f(1), ...f(-1)];
const mirrorX = (g: G) => { const m = g.clone(); m.scale(-1, 1, 1); flipWinding(m); return m; };
function flipWinding(g: G) {
  if (g.index) { const a = g.index.array as Uint16Array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; } }
  else {
    for (const k of Object.keys(g.attributes)) {
      const at = g.attributes[k] as THREE.BufferAttribute, s = at.itemSize, arr = at.array as Float32Array;
      for (let i = 0; i < at.count; i += 3) for (let c = 0; c < s; c++) { const t = arr[(i + 1) * s + c]; arr[(i + 1) * s + c] = arr[(i + 2) * s + c]; arr[(i + 2) * s + c] = t; }
    }
  }
  g.computeVertexNormals();
}
/** Mirror a right-side (+x) geometry builder to both sides. */
export const sym = (g: G) => [g, mirrorX(g)];

/** Lower body / cabin side profile (z,y) with wheel-arch notches. */
function cabinProfile() {
  const s = new THREE.Shape();
  const [zf, zr] = WHEEL.zs, a = WHEEL.arch, cy = WHEEL.y + 0.03;
  s.moveTo(-3.52, 0.28);
  s.lineTo(zf - a, 0.28);
  s.absarc(zf, cy, a, Math.PI + 0.12, -0.12, true);
  s.lineTo(CAB + 0.02, 0.28);
  s.lineTo(CAB + 0.02, ROOF - 0.04);
  s.lineTo(-2.0, ROOF - 0.04);
  s.quadraticCurveTo(-2.12, ROOF - 0.04, -2.2, 1.7); // roof -> windshield
  s.lineTo(-2.86, 1.12);
  s.quadraticCurveTo(-2.94, 1.06, -3.06, 1.04); // cowl
  s.quadraticCurveTo(-3.5, 0.98, -3.62, 0.86); // hood -> nose
  s.quadraticCurveTo(Z_NOSE - 0.02, 0.7, -3.64, 0.48);
  s.quadraticCurveTo(-3.62, 0.3, -3.52, 0.28);
  void zr;
  return s;
}
/** Cargo lower side (z,y): beltline down to rocker, rear arch. */
function cargoLowerProfile() {
  const s = new THREE.Shape();
  const zr = WHEEL.zs[1], a = WHEEL.arch, cy = WHEEL.y + 0.03;
  s.moveTo(CAB - 0.3, 0.28);
  s.lineTo(zr - a, 0.28);
  s.absarc(zr, cy, a, Math.PI + 0.12, -0.12, true);
  s.lineTo(Z_BACK - 0.08, 0.28);
  s.quadraticCurveTo(Z_BACK, 0.28, Z_BACK, 0.36);
  s.lineTo(Z_BACK, BELT + 0.02);
  s.lineTo(CAB - 0.3, BELT + 0.02);
  return s;
}
/** Greenhouse side (z,y) from beltline to roof with window holes. */
function upperProfile(inset = 0) {
  const s = new THREE.Shape();
  s.moveTo(CAB - 0.3, BELT - 0.02);
  s.lineTo(Z_BACK, BELT - 0.02);
  s.lineTo(Z_BACK - 0.03, ROOF - 0.08);
  s.quadraticCurveTo(Z_BACK - 0.05, ROOF - 0.02, Z_BACK - 0.14, ROOF - 0.02);
  s.lineTo(CAB - 0.3, ROOF - 0.02);
  for (const w of [WIN_SLIDE, WIN_QUARTER]) {
    const pts = w.map(([z, y]) => [z, y] as [number, number]);
    if (inset) pts.forEach((p) => { p[0] += 0; p[1] += 0; });
    s.holes.push(roundPoly(new THREE.Path(), [...pts].reverse(), 0.06));
  }
  return s;
}

/** Roof slab (x,z) with two sunroof openings; returns geometry spanning y [y0, y1]. */
export function roofSlab(halfW: number, z0: number, z1: number, y0: number, y1: number, holeMargin = 0, bev = 0.02) {
  const s = new THREE.Shape();
  // shape (x, -z) because rotateX(-PI/2) maps shape y -> world -z
  s.moveTo(-halfW, -z1); s.lineTo(halfW, -z1); s.lineTo(halfW, -z0); s.lineTo(-halfW, -z0); s.closePath();
  const hw = VAN.sunroof.halfWidth + holeMargin;
  for (const [a, b] of [[VAN.sunroof.z0, -0.28], [-0.22, VAN.sunroof.z1]]) {
    s.holes.push(rrHole(-hw, -(b + holeMargin), hw, -(a - holeMargin), 0.05));
  }
  const g = extrude(s, Math.max(0.001, y1 - y0 - 2 * bev), bev, 2, 8);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0 + bev, 0);
  return g;
}

export function makeBody() {
  const white: G[] = [];
  const black: G[] = [];
  const chrome: G[] = [];
  const seam: G[] = [];

  // cabin + hood: full-width bevelled extrusion; flanks lean in slightly via a rounded bevel
  white.push(slab(cabinProfile(), -OUT + 0.01, OUT - 0.01, 0.07, 20));
  // cargo lower sides + greenhouse
  white.push(...both((s) => {
    const lo = slab(cargoLowerProfile(), W + 0.012, OUT, 0.035, 20);
    const up = applyLean(slab(upperProfile(), OUT - 0.045, OUT - 0.005, 0.012, 12));
    if (s < 0) { lo.scale(-1, 1, 1); flipWinding(lo); up.scale(-1, 1, 1); flipWinding(up); }
    return [lo, up];
  }));
  // roof skin: rounded shoulders via a wide rounded box under the slab edges
  white.push(roofSlab(OUT * lean(ROOF) - 0.02, CAB - 0.3, Z_BACK - 0.02, ROOF - 0.07, ROOF, 0, 0.025));
  white.push(...both((s) => [rbox(0.09, 0.08, Z_BACK - CAB + 0.26, s * (OUT * lean(ROOF) - 0.055), ROOF - 0.045, (CAB - 0.3 + Z_BACK - 0.02) / 2, 0.035, 3)]));
  // rear D-pillars (frame of the open liftgate) + roof header
  white.push(...both((s) => [applyLean(rb(s > 0 ? W : -OUT + 0.01, s > 0 ? OUT - 0.01 : -W, BELT - 0.05, ROOF - 0.04, Z_BACK - 0.1, Z_BACK, 0.03, 3))]));
  white.push(rb(-OUT * lean(ROOF), OUT * lean(ROOF), VAN.tailgateHingeY - 0.04, ROOF, Z_BACK - 0.1, Z_BACK, 0.025, 3));

  // rear bumper: rounded, with black lower valance + step pad
  white.push(rbox(OUT * 2 + 0.02, 0.27, 0.26, 0, 0.43, Z_BACK + 0.06, 0.1, 4));
  black.push(rbox(OUT * 2 - 0.1, 0.1, 0.2, 0, 0.3, Z_BACK + 0.08, 0.04, 2));
  black.push(rb(-0.55, 0.55, 0.555, 0.57, Z_BACK - 0.02, Z_BACK + 0.17, 0.006, 1));
  // front bumper + grille + headlights
  black.push(rbox(1.2, 0.22, 0.1, 0, 0.6, Z_NOSE + 0.04, 0.06, 3)); // grille
  chrome.push(rbox(1.1, 0.025, 0.03, 0, 0.73, Z_NOSE + 0.0, 0.01, 2)); // chrome brow
  chrome.push(rbox(0.28, 0.06, 0.02, 0, 0.62, Z_NOSE - 0.005, 0.02, 2)); // badge
  black.push(rbox(OUT * 2 - 0.2, 0.08, 0.12, 0, 0.32, Z_NOSE + 0.14, 0.03, 2)); // chin

  // underbody / sills
  black.push(rb(-OUT + 0.06, OUT - 0.06, 0.2, 0.3, Z_NOSE + 0.2, Z_BACK - 0.05, 0.02, 1));
  black.push(...both((s) => [rb(s > 0 ? OUT - 0.04 : -OUT - 0.005, s > 0 ? OUT + 0.005 : -OUT + 0.04, 0.27, 0.34, WHEEL.zs[0] + 0.45, WHEEL.zs[1] - 0.45, 0.02, 2)]));

  // sculpted arch flares (black cladding, half-ring with bevel)
  for (const z of WHEEL.zs) {
    const ring = new THREE.Shape();
    const a = WHEEL.arch, cy = WHEEL.y + 0.03;
    ring.absarc(0, 0, a + 0.055, -0.12, Math.PI + 0.12, false);
    ring.absarc(0, 0, a - 0.005, Math.PI + 0.12, -0.12, true);
    const g = extrude(ring, 0.03, 0.012, 2, 24);
    g.rotateY(-Math.PI / 2);
    g.translate(OUT + 0.035, cy, z);
    black.push(...sym(g));
  }

  // detail: chrome beltline strip + window surrounds, door seams, handles, mirrors, roof rails
  for (const s of [1, -1]) {
    const x = s * (OUT + 0.003);
    chrome.push(rb(x - 0.008, x + 0.008, BELT + 0.02, BELT + 0.045, -2.62, 0.98, 0.006, 1));
    chrome.push(applyLean(rb(s * (OUT - 0.008) - 0.008, s * (OUT - 0.008) + 0.008, 1.68, 1.70, -2.1, 0.84, 0.006, 1)));
    // sliding door seam (front + rear edge + track line) and front door seam
    for (const z of [-1.36, 0.3]) seam.push(rb(x - 0.004, x + 0.004, 0.36, BELT, z - 0.004, z + 0.004, 0.002, 1));
    seam.push(applyLean(rb(x - 0.004, x + 0.004, BELT, 1.7, 0.3 - 0.004, 0.3 + 0.004, 0.002, 1)));
    seam.push(rb(x - 0.004, x + 0.004, 0.62, 0.64, 0.3, 1.0, 0.002, 1)); // slider track
    seam.push(rb(x - 0.004, x + 0.004, 0.36, 1.08, -2.5, -2.49, 0.002, 1)); // front door front
    seam.push(rb(x - 0.004, x + 0.004, 0.86, 0.87, -3.0, -2.5, 0.002, 1)); // fender line
    // handles
    for (const z of [-1.25, 0.18]) chrome.push(rbox(0.02, 0.035, 0.15, s * (OUT + 0.012), 0.92, z, 0.012, 2));
    chrome.push(rbox(0.02, 0.035, 0.15, s * (OUT + 0.012), 0.92, -1.52, 0.012, 2));
    // fuel door (right side only)
    if (s > 0) seam.push(...[0.15, 0.31].map((y) => rb(x - 0.004, x + 0.004, 0.75 + y * 0.5 - 0.075, 0.75 + y * 0.5 - 0.07, 0.6, 0.74, 0.002, 1)));
    // mirrors: stalk + rounded cap + glass
    const mx = s * (OUT + 0.1);
    black.push(rbox(0.12, 0.04, 0.08, s * (OUT + 0.04), 1.13, -2.3, 0.015, 2));
    const cap = new THREE.SphereGeometry(1, 16, 10); cap.scale(0.075, 0.075, 0.12); cap.translate(mx, 1.18, -2.28);
    white.push(cap);
    black.push(rbox(0.12, 0.1, 0.01, mx, 1.18, -2.22, 0.03, 2));
    // roof rails with feet
    const rx = s * (OUT * lean(ROOF) - 0.1);
    black.push(tube([V(rx, ROOF + 0.005, -1.75), V(rx, ROOF + 0.045, -1.55), V(rx, ROOF + 0.05, 0.0), V(rx, ROOF + 0.045, 0.85), V(rx, ROOF + 0.005, 1.0)], 0.014, 40, 8));
    for (const z of [-1.7, 0.95]) black.push(rbox(0.04, 0.05, 0.12, rx, ROOF + 0.015, z, 0.015, 2));
    chrome.push(rbox(0.006, 0.02, 1.6, rx + s * 0.013, ROOF + 0.05, -0.35, 0.003, 1));
  }
  // hood seam + cowl/wiper well
  seam.push(rb(-0.82, 0.82, 1.045, 1.07, -2.9, -2.885, 0.004, 1));
  black.push(rb(-0.8, 0.8, 1.06, 1.1, -2.92, -2.86, 0.01, 1));

  const g = {
    white: merge(white.map((x) => paint(x, '#ffffff'))),
    black: merge(black),
    chrome: merge(chrome),
    seam: merge(seam),
  };
  return g;
}

/** Glass panes (smoked) for side windows + windshield, as flat shapes slightly proud/inset of the body skin. */
export function makeGlass() {
  const panes: G[] = [];
  for (const w of [WIN_SLIDE, WIN_QUARTER, WIN_FRONT]) {
    const sh = roundPoly(new THREE.Shape(), w, 0.06);
    const g = new THREE.ShapeGeometry(sh, 8);
    g.rotateY(-Math.PI / 2);
    g.translate(OUT - 0.022, 0, 0);
    applyLean(g);
    panes.push(...sym(g));
  }
  // windshield: shaped quad following the cabin profile rake
  const ws = new THREE.Shape();
  roundPoly(ws, [[-0.78, 0], [0.78, 0], [0.66, 0.84], [-0.66, 0.84]], 0.08);
  // local +y follows the rake from the cowl (-2.86,1.12) up to the roof (-2.2,1.7)
  const g2 = new THREE.ShapeGeometry(ws, 8);
  g2.rotateX(Math.atan2(0.66, 0.58));
  g2.translate(0, 1.125, -2.86);
  g2.translate(0, 0.66 * 0.006, -0.58 * 0.006); // proud of the skin along the outward normal
  panes.push(g2);
  return merge(panes, false);
}
