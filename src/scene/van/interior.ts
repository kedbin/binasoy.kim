// Interior shell: charcoal fabric walls + headliner (with twin sunroof openings), bevelled plastic trim (sills,
// pillars, sunroof bezels), grab handles, front partition, floor + scuff plate, sunroof glass + leaf decals.
import * as THREE from 'three';
import { VAN, PALETTE } from '../layout';
import { extrude, merge, paint, rb, rbox, roundPoly, rng, tube, V, type G } from './util';
import { BELT, CAB, OUT, W, WIN_QUARTER, WIN_SLIDE, Z_BACK, applyLean, roofSlab, slab, sym } from './body';

const HL = VAN.roofY; // headliner underside 1.72
const SR = VAN.sunroof;
const PANES: [number, number][] = [[SR.z0, -0.28], [-0.22, SR.z1]];

/** Soft AO for interior: darker near the floor, corners and front. */
const ao = (x: number, y: number, z: number) => {
  const nearRoof = Math.max(0, y - 1.55) / 0.17;
  const front = Math.max(0, -z - 1.0) / 0.4;
  return 1 - 0.18 * Math.min(1, front) - 0.08 * Math.min(1, nearRoof) * (Math.abs(x) > 0.6 ? 1 : 0) - 0.12 * Math.max(0, 0.7 - y) / 0.15;
};

function innerUpperProfile() {
  // greenhouse inner trim (z,y) with window holes slightly larger (reveal)
  const s = new THREE.Shape();
  s.moveTo(VAN.frontZ, BELT + 0.02);
  s.lineTo(Z_BACK - 0.1, BELT + 0.02);
  s.lineTo(Z_BACK - 0.1, HL);
  s.lineTo(VAN.frontZ, HL);
  for (const w of [WIN_SLIDE, WIN_QUARTER]) s.holes.push(roundPoly(new THREE.Path(), [...w].reverse(), 0.07));
  return s;
}

export function makeInterior() {
  const fabric: G[] = [];
  const trim: G[] = [];
  const black: G[] = [];

  // floor + front partition + lower side walls (fabric)
  fabric.push(rb(-W, W, VAN.floorY - 0.05, VAN.floorY, VAN.frontZ, VAN.backZ, 0.01, 1));
  fabric.push(rb(-W, W, VAN.floorY, HL, VAN.frontZ - 0.06, VAN.frontZ, 0.02, 2));
  fabric.push(...sym(rb(W, W + 0.02, VAN.floorY, BELT + 0.03, VAN.frontZ, Z_BACK - 0.1, 0.01, 2)));
  // greenhouse inner trim (leaned to follow the body) + window reveals
  fabric.push(...sym(applyLean(slab(innerUpperProfile(), 0.86, 0.885, 0.008, 12))));
  // headliner with twin sunroof openings
  fabric.push(roofSlab(0.9, VAN.frontZ, Z_BACK - 0.1, HL, HL + 0.03, 0.02, 0.01));

  // beltline sill (bevelled plastic) + rear pillar trims + tailgate sill scuff plate
  trim.push(...sym(rb(W - 0.01, 0.9, BELT - 0.01, BELT + 0.04, VAN.frontZ, Z_BACK - 0.1, 0.018, 2)));
  trim.push(...sym(applyLean(rb(W, 0.9, BELT, HL, Z_BACK - 0.16, Z_BACK - 0.08, 0.02, 2))));
  trim.push(...sym(applyLean(rb(0.82, 0.89, BELT + 0.02, HL, 0.25, 0.37, 0.02, 2)))); // C-pillar between windows
  trim.push(...sym(applyLean(rb(0.82, 0.89, BELT + 0.02, HL, VAN.frontZ, VAN.frontZ + 0.07, 0.02, 2)))); // B-pillar
  trim.push(rb(-W - 0.02, W + 0.02, VAN.floorY - 0.04, VAN.floorY + 0.015, VAN.backZ - 0.06, Z_BACK + 0.02, 0.012, 2));
  trim.push(rb(-W, W, HL - 0.05, HL + 0.01, Z_BACK - 0.16, Z_BACK - 0.06, 0.02, 2)); // rear header
  black.push(rb(-W + 0.02, W - 0.02, VAN.floorY + 0.012, VAN.floorY + 0.02, VAN.backZ - 0.04, Z_BACK, 0.003, 1));
  // sill ribs on the scuff plate
  for (let i = 0; i < 6; i++) black.push(rb(-W + 0.08, W - 0.08, VAN.floorY + 0.016, VAN.floorY + 0.024, VAN.backZ - 0.04 + i * 0.012, VAN.backZ - 0.036 + i * 0.012, 0.002, 1));

  // sunroof bezels (bevelled rings) around each opening, and the centre divider
  for (const [a, b] of PANES) {
    const hw = SR.halfWidth + 0.02;
    const ring = new THREE.Shape();
    roundPoly(ring, [[-hw - 0.05, a - 0.05], [hw + 0.05, a - 0.05], [hw + 0.05, b + 0.05], [-hw - 0.05, b + 0.05]], 0.08);
    ring.holes.push(roundPoly(new THREE.Path(), [[-hw, a], [-hw, b], [hw, b], [hw, a]], 0.05));
    const g = extrude(ring, 0.012, 0.008, 2, 8);
    g.rotateX(Math.PI / 2); // shape (x,y) -> (x, z) ; extrude +z -> world -y
    g.translate(0, HL - 0.002, 0);
    trim.push(g);
  }
  // grab handles: arched tubes + base blocks above each side window
  for (const s of [1, -1]) for (const z of [-0.78, 0.55]) {
    const x = s * 0.8;
    trim.push(tube([V(x, HL - 0.005, z - 0.11), V(x - s * 0.03, HL - 0.05, z - 0.09), V(x - s * 0.04, HL - 0.065, z), V(x - s * 0.03, HL - 0.05, z + 0.09), V(x, HL - 0.005, z + 0.11)], 0.012, 20, 8));
    for (const dz of [-0.11, 0.11]) trim.push(rbox(0.04, 0.025, 0.04, x, HL - 0.01, z + dz, 0.01, 2));
  }
  // dome/map light pod (lens is a separate emissive mesh)
  trim.push(rbox(0.22, 0.03, 0.12, 0, HL - 0.012, VAN.frontZ + 0.18, 0.012, 2));
  // sliding door inner handle + speaker grilles on lower walls
  for (const s of [1, -1]) {
    trim.push(rbox(0.02, 0.04, 0.16, s * (W - 0.005), 0.98, -1.15, 0.012, 2));
    const sp = new THREE.CylinderGeometry(0.06, 0.065, 0.015, 24);
    sp.rotateZ(Math.PI / 2); sp.translate(s * (W - 0.004), 0.9, 0.75);
    black.push(sp);
  }

  // sunroof glass panes (tinted) on top of the roof skin
  const glass: G[] = [];
  for (const [a, b] of PANES) {
    const g = new THREE.PlaneGeometry(SR.halfWidth * 2 + 0.06, b - a + 0.06);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 1.77, (a + b) / 2);
    glass.push(g);
  }
  // window glass inside the van is shared with body (makeGlass)

  return {
    fabric: merge(fabric.map((g) => paint(g, '#ffffff', ao))),
    trim: merge(trim.map((g) => paint(g, '#ffffff', ao))),
    black: merge(black),
    glass: merge(glass, false),
  };
}

/** Maple-leaf decals stuck on the sunroof glass (vertex coloured, faces down). */
export function makeLeafDecals() {
  const leaf = new THREE.Shape();
  const lobes = [[0, 1], [0.28, 0.62], [0.62, 0.72], [0.5, 0.36], [0.88, 0.2], [0.42, 0.02], [0.38, -0.28], [0.06, -0.12], [0.03, -0.55]];
  // mirrored maple outline
  const pts: [number, number][] = [...lobes.map(([x, y]) => [x, y] as [number, number]), ...lobes.slice(0, -1).reverse().map(([x, y]) => [-x, y] as [number, number])];
  pts.splice(lobes.length, 0, [-0.03, -0.55]);
  leaf.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    leaf.quadraticCurveTo((x0 + x1) / 2 + (y1 - y0) * 0.12, (y0 + y1) / 2 - (x1 - x0) * 0.12, x1, y1);
  }
  const cols = [PALETTE.maple, PALETTE.gold, '#C4501F', '#E88A2E', '#B8402A'];
  const r = rng(21);
  const gs: G[] = [];
  for (const [a, b] of PANES) {
    const n = 5;
    for (let i = 0; i < n; i++) {
      const g = new THREE.ShapeGeometry(leaf, 4);
      const sc = 0.06 + r() * 0.04;
      g.scale(sc, sc, sc);
      g.rotateZ(r() * Math.PI * 2);
      g.rotateX(Math.PI / 2);
      const x = (r() - 0.5) * SR.halfWidth * 1.6;
      const z = a + 0.08 + r() * (b - a - 0.16);
      g.translate(x, 1.765, z);
      gs.push(paint(g, cols[(i + Math.floor(a * 10)) % cols.length], () => 0.85 + r() * 0.3));
    }
  }
  return merge(gs, false);
}
void OUT; void CAB; void Z_BACK;
