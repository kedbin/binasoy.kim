// OWNER: O3. Sleek yellow sit-on-top kayak resting on the sand at a slight tilt, nose toward the water.
// Hull is lofted from cross-sections (rounded-V keel → flared chines → domed deck), with a moulded cockpit
// well + rim, seat back, bungee lines on the bow, carry handles and a two-bladed paddle leaning across it.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ANCHORS } from '../layout';
import { useScene } from '../../state/store';
import { natureMaterial } from '../nature/materials';
import { G, loft, soft, paint, mergeAll, place, tubeAlong, smooth01, lerp } from '../nature/util';
import { groundHeight } from '../nature/terrain';

const LEN = 3.2, BEAM = 0.76, DEPTH = 0.34;

/** half-beam and depth profile along the hull (t ∈ [0,1], 0 = stern, 1 = bow). */
function plan(t: number) {
  const s = Math.sin(Math.PI * Math.pow(t, 0.92));
  const w = BEAM / 2 * Math.pow(Math.max(0, s), 0.62);
  const sheer = 0.05 * Math.pow(Math.abs(t - 0.5) * 2, 2.5); // ends kick up
  return { w, sheer };
}

function hull() {
  const ring = (t: number, a: number, out: THREE.Vector3) => {
    const { w, sheer } = plan(t);
    const z = (t - 0.5) * LEN;
    // cross-section: a ∈ [0,2π). lower half = hull (rounded V), upper half = domed deck
    const c = Math.cos(a), s = Math.sin(a);
    const ww = Math.max(w, 0.004);
    if (s < 0) {
      const keel = Math.pow(Math.abs(s), 1.4);
      out.set(c * ww * (1 - 0.15 * keel), -keel * DEPTH * 0.62 * smooth01(ww, 0, BEAM * 0.3) - 0.01, z);
    } else {
      out.set(c * ww, Math.pow(s, 1.6) * DEPTH * 0.38 * smooth01(ww, 0, BEAM * 0.25), z);
    }
    out.y += sheer;
  };
  const g = soft(loft(40, 28, (t, a, out) => ring(t, a, out), [true, true]));
  return paint(g, (p, n, o) => {
    // bright yellow deck, slightly deeper yellow hull underside, painted AO along the waterline seam
    o.setScalar(0.72 + 0.32 * smooth01(n.y, -0.8, 0.8));
    if (Math.abs(p.y - 0.0) < 0.012) o.multiplyScalar(0.7); // parting line
    return 0;
  });
}

function details() {
  const parts: G[] = [];
  // cockpit well: dark sunken oval + raised rim
  const well = loft(1, 32, (t, a, out) => {
    const k = t === 0 ? 1 : 0.92;
    out.set(Math.cos(a) * 0.24 * k, DEPTH * 0.3 - t * 0.09, -0.15 + Math.sin(a) * 0.62 * k);
  }, [false, true]);
  parts.push(paint(soft(well), (_p, _n, o) => { o.setScalar(0.32); }));
  const rim = new THREE.TorusGeometry(1, 0.022, 6, 40).rotateX(Math.PI / 2).scale(0.25, 1, 0.63).translate(0, DEPTH * 0.31, -0.15);
  parts.push(paint(soft(rim), (_p, n, o) => { o.setScalar(0.85 + 0.15 * n.y); }));
  // moulded seat back
  const back = new THREE.CapsuleGeometry(0.05, 0.3, 4, 10).rotateZ(Math.PI / 2).translate(0, DEPTH * 0.32, -0.62);
  parts.push(paint(soft(back), (_p, _n, o) => { o.setScalar(0.3); }));
  // bow hatch
  const hatch = new THREE.CylinderGeometry(0.11, 0.12, 0.03, 20).translate(0, DEPTH * 0.36, 0.78);
  parts.push(paint(soft(hatch), (_p, n, o) => { o.setScalar(0.25 + 0.1 * n.y); }));
  // bungee criss-cross on the bow deck (dark cord) and carry handles at the tips
  const cord = (a: THREE.Vector3, b: THREE.Vector3) => paint(soft(tubeAlong([a, a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 0.012, 0)), b], () => 0.007, 4, 4, [false, false])), (_p, _n, o) => { o.setScalar(0.2); });
  const deckY = (z: number, x: number) => {
    const t = z / LEN + 0.5; const { w, sheer } = plan(t);
    const s = Math.sqrt(Math.max(0, 1 - (x / Math.max(w, 0.01)) ** 2));
    return Math.pow(s, 1.6) * DEPTH * 0.38 * smooth01(w, 0, BEAM * 0.25) + sheer + 0.006;
  };
  const P = (x: number, z: number) => new THREE.Vector3(x, deckY(z, x), z);
  parts.push(cord(P(-0.17, 0.5), P(0.13, 1.05)), cord(P(0.17, 0.5), P(-0.13, 1.05)), cord(P(-0.17, 0.5), P(0.17, 0.5)), cord(P(-0.13, 1.05), P(0.13, 1.05)));
  for (const z of [LEN / 2 - 0.08, -LEN / 2 + 0.08]) {
    const hnd = new THREE.TorusGeometry(0.045, 0.012, 6, 12, Math.PI).rotateY(Math.PI / 2).translate(0, plan(z / LEN + 0.5).sheer + 0.03, z);
    parts.push(paint(soft(hnd), (_p, _n, o) => { o.setScalar(0.22); }));
  }
  return mergeAll(parts);
}

function paddle() {
  const L = 2.2;
  const shaft = paint(soft(new THREE.CylinderGeometry(0.017, 0.017, L * 0.78, 8)), (_p, _n, o) => { o.setScalar(0.32); });
  const parts: G[] = [shaft];
  for (const s of [-1, 1]) {
    // asymmetric dihedral blade, lofted along the paddle axis
    const blade = loft(8, 12, (t, a, out) => {
      const w = 0.09 * Math.sin(lerp(0.2, 1, t) * Math.PI * 0.6) * (t > 0.8 ? Math.sqrt(Math.max(0, 1 - (t - 0.8) / 0.2)) * 0.85 + 0.15 : 1);
      const x = Math.cos(a) * w;
      out.set(x, s * (L * 0.36 + t * L * 0.16), Math.sin(a) * w * 0.12 + Math.abs(x) * 0.18);
    }, [false, true]);
    parts.push(paint(soft(blade), () => 1)); // tint → yellow blades
    const drip = new THREE.TorusGeometry(0.03, 0.008, 6, 14).rotateX(Math.PI / 2).translate(0, s * L * 0.3, 0);
    parts.push(paint(soft(drip), (_p, _n, o) => { o.setScalar(0.2); }));
  }
  return mergeAll(parts);
}

export function Kayak() {
  const quality = useScene((s) => s.quality);
  const [x, , z] = ANCHORS.kayak.pos;
  const geo = useMemo(() => ({ hull: hull(), details: details(), paddle: paddle() }), []);
  const mats = useMemo(() => ({
    hull: natureMaterial({ color: '#F2C230', roughness: 0.42 }),
    details: natureMaterial({ color: '#F2C230', roughness: 0.6 }),
    paddle: natureMaterial({ color: '#E8E4DA', tint: '#F2C230', roughness: 0.5 }),
  }), []);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  const y = groundHeight(x, z);
  const shadows = quality !== 'low';
  return (
    // nose toward the water (+z / slightly right), rolled onto its chine on the sloping sand
    <group position={[x, y + 0.13, z]} rotation={[0.07, 0.42, 0.1]} name="kayak">
      <mesh geometry={geo.hull} material={mats.hull} castShadow={shadows} receiveShadow={shadows} />
      <mesh geometry={geo.details} material={mats.details} castShadow={false} receiveShadow={shadows} />
      <mesh geometry={geo.paddle} material={mats.paddle} position={[0.05, DEPTH * 0.42, -0.2]} rotation={[0.08, 0.35, Math.PI / 2 - 0.06]} castShadow={shadows} />
    </group>
  );
}

export { place };
