// Chunky stylised character pieces (O3): hoodie torso with hood + pocket, rounded head, hair meshes.
// Local space per person: origin = hip/seat point, +Z = facing direction, Y up. ~0.95 m seated height.
import * as THREE from 'three';
import { G, soft, paint, mergeAll, place, tubeAlong, softBlob, smooth01, lerp, fbm3 } from '../nature/util';

export const BODY = {
  shoulderY: 0.43, shoulderX: 0.165, neckY: 0.5, headY: 0.66, headR: 0.135,
  upper: 0.24, fore: 0.23, thigh: 0.36, shin: 0.36,
};

/** Hoodie torso: lathe body (slightly flattened front-back), soft shoulders, kangaroo pocket, hood bunched at the nape. */
export function hoodieGeometry() {
  const prof: [number, number][] = [
    [0.0, -0.02], [0.15, -0.02], [0.175, 0.06], [0.185, 0.2], [0.19, 0.3], [0.175, 0.38], [0.14, 0.445], [0.08, 0.49], [0.055, 0.52], [0.0, 0.52],
  ];
  const lathe = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 18);
  lathe.scale(1, 1, 0.78);
  const body = soft(lathe);
  // ribbed hem + cuffs read as a darker band: AO at hem, lighter chest
  paint(body, (p, n, o) => { o.setScalar(0.72 + 0.3 * smooth01(p.y, -0.02, 0.35) - (p.y < 0.03 ? 0.12 : 0)); void n; });
  // hood: a fat folded collar at the back of the neck
  const hood = softBlob(0.13, 2, [1.25, 0.62, 0.8], 0.08, 6, 4);
  place(hood, 0, 0.5, -0.07, -0.35, 0, 0);
  paint(hood, (p, n, o) => { o.setScalar(0.78 + 0.25 * Math.max(0, n.y)); void p; });
  // hood opening rim (darker inner)
  const rim = new THREE.TorusGeometry(0.085, 0.028, 8, 18);
  rim.scale(1, 0.75, 1); rim.rotateX(Math.PI / 2 - 0.5); rim.translate(0, 0.52, -0.02);
  const rg = paint(soft(rim), (_p, _n, o) => { o.setScalar(0.62); });
  // kangaroo pocket
  const pocket = soft(new THREE.CapsuleGeometry(0.05, 0.13, 3, 8).rotateZ(Math.PI / 2).scale(1, 1, 0.35).translate(0, 0.13, 0.145));
  paint(pocket, (_p, n, o) => { o.setScalar(0.82 + 0.15 * n.y); });
  // drawstrings
  const ds: G[] = [-0.035, 0.035].map((x) => paint(soft(new THREE.CylinderGeometry(0.007, 0.007, 0.12, 5).translate(x, 0.43, 0.125).rotateX(0.08)), (_p, _n, o) => { o.setScalar(1.25); }, ));
  return mergeAll([body, hood, rg, pocket, ...ds]);
}

/** Head with nose, ears; skin only. */
export function headGeometry() {
  const R = BODY.headR;
  const head = soft(new THREE.SphereGeometry(R, 22, 16).scale(1, 1.04, 0.98));
  paint(head, (p, n, o) => { o.setScalar(0.86 + 0.16 * smooth01(n.y, -0.8, 0.6)); void p; });
  const nose = soft(new THREE.SphereGeometry(0.022, 8, 6).scale(1, 0.9, 0.8).translate(0, -0.015, R * 0.97));
  const ears = [-1, 1].map((s) => soft(new THREE.SphereGeometry(0.032, 8, 6).scale(0.5, 1, 0.8).translate(s * R * 0.98, -0.005, -0.005)));
  const cheeks = [-1, 1].map((s) => paint(soft(new THREE.SphereGeometry(0.024, 8, 6).scale(1, 0.6, 0.3).translate(s * 0.065, -0.04, R * 0.9)), (_p, _n, o) => { o.setRGB(1.12, 0.78, 0.74); }));
  return mergeAll([head, nose, ...ears, ...cheeks]);
}

export function eyesGeometry() {
  const R = BODY.headR;
  return mergeAll([-1, 1].map((s) => soft(new THREE.SphereGeometry(0.014, 8, 6).scale(1, 1.3, 0.5).translate(s * 0.05, 0.012, R * 0.955))));
}

/** Kim: short dark tousled hair — a snug cap plus chunky tufts swept forward/right. */
export function shortHair(seed = 3) {
  const R = BODY.headR;
  const cap = soft(new THREE.SphereGeometry(R * 1.07, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.56));
  // pull the cap down at the back/sides, keep the forehead clear
  const p = cap.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const back = smooth01(-z / R, -0.2, 0.8);
    if (y < R * 0.35) p.setY(i, y - back * 0.06);
  }
  cap.computeVertexNormals();
  const tufts: G[] = [];
  const pts: [number, number, number, number][] = [
    [0, 1.02, 0.35, 0.07], [0.45, 0.95, 0.4, 0.06], [-0.4, 0.95, 0.45, 0.065], [0.2, 0.85, 0.75, 0.06], [-0.2, 0.82, 0.78, 0.058],
    [0.6, 0.72, 0.1, 0.055], [-0.65, 0.72, 0.05, 0.055], [0.05, 0.98, -0.35, 0.07], [0.35, 0.8, -0.6, 0.06], [-0.35, 0.8, -0.6, 0.06],
  ];
  pts.forEach(([x, y, z, r], i) => {
    const b = softBlob(r, 1, [1, 0.7, 1.35], 0.2, 14, seed + i);
    const dir = new THREE.Vector3(x, y * 0.6, z).normalize();
    b.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(dir.x + 0.3, 0.2, dir.z + 0.8).normalize()));
    place(b, x * R * 0.9, y * R * 0.95, z * R * 0.9);
    tufts.push(b);
  });
  const g = mergeAll([cap, ...tufts]);
  paint(g, (q, n, o) => { o.setScalar(0.7 + 0.45 * Math.max(0, n.y) + 0.2 * fbm3(q.x * 40, q.y * 40, q.z * 40, 2)); return smooth01(n.y, 0.6, 1) * 0.5; });
  return g;
}

/** Glasses: two rounded rims, bridge, temples. */
export function glassesGeometry() {
  const R = BODY.headR;
  const parts: G[] = [];
  for (const s of [-1, 1]) {
    const rim = new THREE.TorusGeometry(0.036, 0.0065, 6, 18).scale(1.15, 0.92, 1).translate(s * 0.052, 0.012, R * 1.02);
    parts.push(soft(rim));
    const temple = new THREE.CylinderGeometry(0.005, 0.005, R * 1.0, 5).rotateX(Math.PI / 2).translate(s * R * 0.97, 0.016, R * 0.5);
    parts.push(soft(temple));
  }
  parts.push(soft(new THREE.CylinderGeometry(0.005, 0.005, 0.03, 5).rotateZ(Math.PI / 2).translate(0, 0.02, R * 1.03)));
  return mergeAll(parts);
}

/** Wingwing: long brown hair — crown cap, side curtains framing the face, and a thick flowing sheet down the back. */
export function longHair(seed = 7) {
  const R = BODY.headR;
  const cap = soft(new THREE.SphereGeometry(R * 1.08, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.6));
  // centre parting: tiny groove along the top
  const p = cap.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y > R * 0.85 && Math.abs(x) < 0.012 && z > -R * 0.2) p.setY(i, y - 0.006);
  }
  cap.computeVertexNormals();
  // back sheet: from crown/back of head flowing down to mid-back, widening, slightly wavy
  const back = soft(tubeAlong([
    new THREE.Vector3(0, R * 0.55, -R * 0.55), new THREE.Vector3(0, -R * 0.2, -R * 1.0), new THREE.Vector3(0, -R * 1.4, -R * 1.25),
    new THREE.Vector3(0, -R * 2.6, -R * 1.25), new THREE.Vector3(0, -R * 3.5, -R * 1.05),
  ], (t, a) => {
    const w = lerp(0.12, 0.15, smooth01(t, 0, 0.4)) * (t > 0.82 ? lerp(1, 0.55, (t - 0.82) / 0.18) : 1);
    const flatK = 0.42 + 0.58 * Math.abs(Math.cos(a));
    const wave = 1 + 0.08 * Math.sin(a * 6 + t * 9 + seed);
    return w * flatK * wave;
  }, 14, 18, [false, true]));
  // flatten into a sheet: the tube's radial "cos" axis lies in X for this vertical curve
  // side curtains: two strands in front of the ears down to the collarbone
  const sides = [-1, 1].map((s) => soft(tubeAlong([
    new THREE.Vector3(s * R * 0.85, R * 0.4, R * 0.15), new THREE.Vector3(s * R * 1.02, -R * 0.4, R * 0.1),
    new THREE.Vector3(s * R * 0.95, -R * 1.25, R * 0.0), new THREE.Vector3(s * R * 0.9, -R * 1.9, -R * 0.12),
  ], (t, a) => lerp(0.045, 0.03, t) * (0.7 + 0.3 * Math.abs(Math.sin(a))), 9, 10)));
  // fringe sweep across the forehead
  const fringe = softBlob(0.07, 1, [1.6, 0.55, 0.9], 0.15, 12, seed);
  place(fringe, 0.02, R * 0.72, R * 0.62, 0.3, 0, -0.15);
  const g = mergeAll([cap, back, ...sides, fringe]);
  paint(g, (q, n, o) => {
    const strand = fbm3(q.x * 55, q.y * 6, q.z * 55, 2);
    o.setScalar(0.62 + 0.38 * Math.max(0, n.y * 0.6 + 0.4) + 0.22 * (strand - 0.5));
    return smooth01(n.y + strand * 0.5, 0.75, 1.2) * 0.6; // warm sheen highlights
  });
  return g;
}

/** Rounded mitten hand with a thumb; points along +Y. */
export function handGeometry() {
  const palm = soft(new THREE.CapsuleGeometry(0.03, 0.035, 4, 8).scale(1.05, 1, 0.7).translate(0, 0.035, 0));
  const thumb = soft(new THREE.CapsuleGeometry(0.013, 0.025, 3, 6).rotateZ(-0.7).translate(0.03, 0.03, 0.01));
  return mergeAll([palm, thumb]);
}

/** Chunky sneaker: rounded toe, white sole. Points along +Z. */
export function shoeGeometry() {
  const upper = soft(new THREE.CapsuleGeometry(0.048, 0.09, 4, 10).rotateX(Math.PI / 2).scale(1, 0.85, 1).translate(0, 0.045, 0.03));
  paint(upper, (_p, n, o) => { o.setScalar(0.8 + 0.25 * Math.max(0, n.y)); });
  const sole = soft(new THREE.CapsuleGeometry(0.05, 0.1, 3, 10).rotateX(Math.PI / 2).scale(1.02, 0.35, 1.02).translate(0, 0.012, 0.03));
  paint(sole, () => 1); // tint = 1 → material uTint (white) for the sole
  return mergeAll([upper, sole]);
}

export { mergeAll };
