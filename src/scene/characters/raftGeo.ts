// Inflatable dinghy geometry (O3): one continuous rounded tube swept along a closed oval spline with a slight
// bow kick, white stripe, valve caps, rope loops on a grab line, oarlocks, oars and a floor. Local space:
// +Z = bow, raft sits on y = 0 (waterline at ~0.1). Painted AO in vertex colours.
import * as THREE from 'three';
import { G, loft, soft, paint, mergeAll, place, tubeAlong, smooth01, lerp } from '../nature/util';

export const RAFT = { L: 2.5, W: 1.3, tubeR: 0.21, floorY: 0.06 };

/** Point on the closed outline (u ∈ [0,1)), bow pinched slightly + lifted. */
export function outline(u: number, out = new THREE.Vector3()) {
  const a = u * Math.PI * 2;
  const hx = RAFT.W / 2 - RAFT.tubeR, hz = RAFT.L / 2 - RAFT.tubeR;
  const c = Math.cos(a), s = Math.sin(a);
  // superellipse → rounded-rectangle oval; bow (s>0) narrower
  const e = 2.6;
  const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / e) * hx * (1 - 0.18 * Math.max(0, s));
  const z = Math.sign(s) * Math.pow(Math.abs(s), 2 / e) * hz;
  const y = RAFT.tubeR + 0.07 * Math.pow(Math.max(0, s), 4); // bow kick
  return out.set(x, y, z);
}

export function raftGeometry() {
  const R = RAFT.tubeR;
  const rings = 96, seg = 24;
  const P = new THREE.Vector3(), Pn = new THREE.Vector3(), T = new THREE.Vector3(), Nh = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const tube = loft(rings, seg, (t, a, out) => {
    outline(t % 1, P); outline((t + 0.002) % 1, Pn);
    T.subVectors(Pn, P).normalize();
    Nh.crossVectors(T, up).normalize(); // horizontal outward/inward
    // centre outward
    if (Nh.x * P.x + Nh.z * P.z < 0) Nh.multiplyScalar(-1);
    // slight seam bulge every quarter (inflation chambers)
    const bulge = 1 + 0.035 * Math.cos(t * Math.PI * 8);
    const r = R * bulge;
    out.set(P.x + Nh.x * Math.cos(a) * r, P.y + Math.sin(a) * r, P.z + Nh.z * Math.cos(a) * r);
  }, [false, false], true);
  const tg = soft(tube);
  // paint: grey tube, white stripe band on the outside, darker underside (painted AO), seams
  const grey = new THREE.Color('#6C727A'), white = new THREE.Color('#F4F2EC');
  paint(tg, (p, n, outC) => {
    const centre = outline(0); void centre;
    const sideOut = n.x * p.x + n.z * p.z > 0 ? 1 : 0;
    const band = sideOut && n.y > -0.22 && n.y < 0.24 ? 1 : 0;
    outC.copy(band ? white : grey);
    const under = smooth01(n.y, -0.9, 0.2);
    outC.multiplyScalar(0.62 + 0.38 * under);
    // thin dark pinstripes either side of the white band
    
  });
  // floor: flattened rounded slab inside the tube
  const floor = loft(1, 48, (t, a, out) => {
    outline(a / (Math.PI * 2), P);
    const k = t === 0 ? 0.98 : 0.94;
    out.set(P.x * k, RAFT.floorY + (t === 0 ? 0 : 0.045), P.z * k);
  }, [true, true]);
  const fg = paint(soft(floor), (p, _n, o) => { o.set('#3F454D').multiplyScalar(0.7 + 0.3 * smooth01(Math.hypot(p.x / 0.5, p.z / 1.0), 1.1, 0.2)); });
  // floor boards / slats
  const slats: G[] = [];
  for (let i = -2; i <= 2; i++) {
    const b = new THREE.BoxGeometry(0.7, 0.02, 0.16);
    place(b, 0, RAFT.floorY + 0.06, i * 0.35);
    slats.push(paint(soft(b), (_p, _n, o) => { o.set('#565C64'); }));
  }
  // thwart seat (inflatable cylinder across the middle)
  const thwart = new THREE.CapsuleGeometry(0.1, RAFT.W - 2 * R - 0.12, 4, 10).rotateZ(Math.PI / 2).translate(0, 0.2, -0.15);
  const thw = paint(soft(thwart), (p, n, o) => { o.copy(grey).multiplyScalar(0.7 + 0.35 * smooth01(n.y, -0.5, 1)); void p; });
  return mergeAll([tg, fg, ...slats, thw]);
}

/** Rope grab-line with drooping loops between eyelets + eyelet patches. */
export function ropeGeometry() {
  const parts: G[] = [];
  const P = new THREE.Vector3();
  const R = RAFT.tubeR;
  const eyelets: THREE.Vector3[] = [];
  const N = 10;
  for (let i = 0; i < N; i++) {
    const u = (i + 0.5) / N;
    outline(u, P);
    const rad = Math.hypot(P.x, P.z);
    const k = (rad + R * 0.92) / rad;
    eyelets.push(new THREE.Vector3(P.x * k, P.y + R * 0.15, P.z * k));
  }
  for (let i = 0; i < N; i++) {
    const a = eyelets[i], b = eyelets[(i + 1) % N];
    const mid = a.clone().lerp(b, 0.5);
    const out = new THREE.Vector3(mid.x, 0, mid.z).normalize().multiplyScalar(0.05);
    mid.add(out); mid.y -= 0.14;
    parts.push(soft(tubeAlong([a, a.clone().lerp(mid, 0.5).add(new THREE.Vector3(0, -0.04, 0)).add(out.clone().multiplyScalar(0.5)), mid, b.clone().lerp(mid, 0.5).add(new THREE.Vector3(0, -0.04, 0)).add(out.clone().multiplyScalar(0.5)), b], () => 0.016, 5, 12, [false, false])));
    // eyelet patch (small flat disc)
    const patch = new THREE.CylinderGeometry(0.035, 0.035, 0.012, 10);
    const n = new THREE.Vector3(a.x, 0, a.z).normalize();
    patch.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n));
    patch.translate(a.x - n.x * 0.006, a.y, a.z - n.z * 0.006);
    parts.push(paint(soft(patch), (_p, _n, o) => { o.set('#4C5158'); }));
  }
  const g = mergeAll(parts);
  // paint the rope colour where not already painted dark (patches)
  return g;
}

/** Valve caps + oarlocks (on tube top at mid-length). Returns geometry + oarlock world points. */
export function fittingsGeometry() {
  const parts: G[] = [];
  const P = new THREE.Vector3();
  const R = RAFT.tubeR;
  // valves: 2 on tube top near stern quarter
  for (const u of [0.62, 0.88]) {
    outline(u, P);
    const base = new THREE.CylinderGeometry(0.04, 0.045, 0.03, 12).translate(P.x, P.y + R + 0.012, P.z);
    const cap = new THREE.CylinderGeometry(0.028, 0.03, 0.035, 12).translate(P.x, P.y + R + 0.04, P.z);
    parts.push(paint(soft(base), (_p, _n, o) => { o.set('#2E3237'); }), paint(soft(cap), (_p, n, o) => { o.set('#D8D6CF').multiplyScalar(0.8 + 0.2 * n.y); }));
  }
  const locks: THREE.Vector3[] = [];
  for (const u of [0.0, 0.5]) {
    outline(u, P);
    const top = new THREE.Vector3(P.x, P.y + R, P.z);
    locks.push(top.clone().add(new THREE.Vector3(0, 0.07, 0)));
    const pad = new THREE.BoxGeometry(0.08, 0.025, 0.16).translate(top.x, top.y + 0.005, top.z);
    const ring = new THREE.TorusGeometry(0.035, 0.009, 6, 14).rotateY(Math.PI / 2).translate(top.x, top.y + 0.07, top.z);
    const stem = new THREE.CylinderGeometry(0.009, 0.009, 0.05).translate(top.x, top.y + 0.03, top.z);
    parts.push(paint(soft(pad), (_p, _n, o) => { o.set('#3A3F45'); }), paint(soft(ring), (_p, _n, o) => { o.set('#2A2D31'); }), paint(soft(stem), (_p, _n, o) => { o.set('#2A2D31'); }));
  }
  return { geo: mergeAll(parts), locks };
}

/** Single oar: shaft along +Y from the grip (y=0) to blade tip (y=len). */
export function oarGeometry(len = 1.55) {
  const shaft = soft(new THREE.CylinderGeometry(0.018, 0.018, len * 0.72, 8).translate(0, len * 0.36, 0));
  paint(shaft, (_p, _n, o) => { o.set('#9AA0A6'); });
  const grip = paint(soft(new THREE.CapsuleGeometry(0.024, 0.12, 3, 8).translate(0, 0.06, 0)), (_p, _n, o) => { o.set('#2D2F33'); });
  // spoon blade lofted: rings along y, cross-section = flattened ellipse widening then rounding off
  const blade = loft(8, 12, (t, a, out) => {
    const w = 0.075 * Math.sin(lerp(0.15, 1, t) * Math.PI * 0.62) * (t > 0.85 ? Math.sqrt(Math.max(0, 1 - (t - 0.85) / 0.15)) * 0.9 + 0.1 : 1);
    out.set(Math.cos(a) * w, len * 0.68 + t * len * 0.32, Math.sin(a) * w * 0.14 + Math.cos(a) * Math.cos(a) * 0.012);
  }, [false, true]);
  const bg = paint(soft(blade), (_p, _n, o) => { o.set('#E9E7E0'); });
  return mergeAll([shaft, grip, bg]);
}

export { place };
