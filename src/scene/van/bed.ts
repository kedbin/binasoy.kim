// Soft goods: plush mattress, draped duvet, squished pillows, gingham blanket over the tailgate edge.
import * as THREE from 'three';
import { VAN } from '../layout';
import { fbm, gridSurface, rbox, smooth, type G } from './util';

const TOP = VAN.bedTopY; // 0.78
export const MATTRESS = { x: 0.745, z0: -1.32, z1: 1.06, y0: VAN.floorY + 0.02, y1: TOP - 0.01 };

/** Plush mattress: very rounded box with a slight crown and a piped seam bulge. */
export function makeMattress(seg = 6) {
  const { x, z0, z1, y0, y1 } = MATTRESS;
  const g = rbox(x * 2, y1 - y0, z1 - z0, 0, (y0 + y1) / 2, (z0 + z1) / 2, 0.06, seg);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
    const u = px / x, w = (pz - (z0 + z1) / 2) / ((z1 - z0) / 2);
    if (py > (y0 + y1) / 2) p.setY(i, py + 0.012 * (1 - u * u) * (1 - w * w));
    // sides bulge out a touch
    const mid = 1 - Math.abs((py - (y0 + y1) / 2) / ((y1 - y0) / 2));
    p.setX(i, px * (1 + 0.006 * mid)); p.setZ(i, pz + Math.sign(pz - (z0 + z1) / 2) * 0.006 * mid);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Duvet: a cloth sheet laid over the mattress. Flat on top with fbm wrinkles + diagonal folds, then it rolls over the
 * side and foot edges and hangs down. The top end is folded back (a thicker turned-down band) near the pillows.
 */
export function makeDuvet(nu: number, nv: number) {
  const halfW = 0.94; // sheet half-width (hangs ~0.2 over each side)
  const zA = -0.95, zB = 1.02; // covered length on top
  const hang = 0.16; // how far it hangs over the foot edge
  const { x: mx } = MATTRESS;
  const R = 0.05; // edge roll radius
  const g = gridSurface(nu, nv, (u, v, o) => {
    // unfolded coordinates
    const sx = (u * 2 - 1) * halfW;
    const sz = zA + v * (zB - zA + hang + R * 1.57);
    // wrinkles
    const wr = fbm(sx * 3.2, sz * 2.4, 0.3, 3) * 0.014 + Math.sin(sx * 7 + sz * 4.5) * 0.004
      + Math.sin((sx - sz) * 5.0) * smooth(0.2, 0.9, Math.abs(sx)) * 0.006;
    // side drape: past the mattress edge the cloth rolls over a cylinder then falls
    let x = sx, y = TOP + 0.02 + wr;
    const ax = Math.abs(sx), sgn = Math.sign(sx) || 1;
    if (ax > mx - R) {
      const d = ax - (mx - R);
      const arc = R * Math.PI / 2;
      if (d < arc) { const a = d / R; x = sgn * (mx - R + Math.sin(a) * (R + 0.015)); y = TOP + 0.02 - R + Math.cos(a) * R + wr * 0.5; }
      else {
        const t = d - arc;
        x = sgn * (mx + 0.015 + t * 0.06 + Math.sin(sz * 9 + sgn) * 0.012 * smooth(0, 0.1, t));
        y = TOP + 0.02 - R - t;
      }
    }
    let z = sz;
    // foot drape over the mattress end
    const zEdge = zB - R;
    if (sz > zEdge) {
      const d = sz - zEdge;
      const arc = R * Math.PI / 2;
      if (d < arc) { const a = d / R; z = zEdge + Math.sin(a) * (R + 0.015); y = Math.min(y, TOP + 0.02 - R + Math.cos(a) * R + wr * 0.4); }
      else { const t = d - arc; z = zB + 0.015 + t * 0.08 + Math.sin(sx * 8) * 0.012 * smooth(0, 0.1, t); y = Math.min(y, TOP + 0.02 - R - t); }
    }
    // turned-down fold band near the pillows: a soft ridge
    const fold = Math.exp(-Math.pow((sz - (zA + 0.12)) / 0.05, 2)) * 0.025;
    y += fold * (1 - smooth(mx - 0.1, mx + 0.05, ax));
    // keep it above the floor
    y = Math.max(y, VAN.floorY + 0.03);
    o.set(x, y, z);
  }, [3, 3]);
  return g;
}

/** Pillow: squished sphere with flattened top/bottom, pinched corners and a dent where your head goes. */
export function makePillow(w = 0.27, h = 0.075, d = 0.18) {
  const g = new THREE.SphereGeometry(1, 28, 18);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    // squarify the footprint
    const k = 1 + 0.35 * Math.pow(Math.abs(x * z), 0.8);
    x *= k; z *= k;
    // flatten and pinch toward corners (seam)
    const corner = Math.pow(Math.abs(x) * Math.abs(z), 1.2);
    y *= 1 - 0.55 * Math.min(1, corner * 1.6);
    // flatten bottom against the bed
    if (y < 0) y *= 0.55;
    // head dent on top
    const dent = Math.exp(-((x + 0.1) ** 2 + (z - 0.05) ** 2) / 0.18) * 0.32;
    if (y > 0) y -= dent * y;
    p.setXYZ(i, x * w, y * h, z * d);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Gingham blanket: lies on the duvet near the tailgate, rolls over the mattress end and hangs over the tailgate sill
 * with vertical folds. Built as a sheet in (s across, t along) mapped onto that path.
 */
export function makeBlanket(nu = 40, nv = 48): G {
  const width = 1.05, x0 = -0.08; // centred a bit left
  const zStart = 0.4;
  const yTop = TOP + 0.045;
  const zEdge = MATTRESS.z1 + 0.02; // where it rolls over
  const R = 0.06;
  const flatLen = zEdge - R - zStart;
  const arc = R * Math.PI / 2;
  const total = flatLen + arc + 0.34;
  return gridSurface(nu, nv, (u, v, o) => {
    const s = (u - 0.5) * width;
    const t = v * total;
    // folds grow toward the hanging part
    const fold = (amp: number) => (Math.sin(s * 22 + 0.6) * 0.6 + Math.sin(s * 9.5 + 1.7) * 0.4) * amp;
    let y: number, z: number;
    if (t < flatLen) {
      z = zStart + t; y = yTop + fbm(s * 4, t * 4, 2.1, 2) * 0.01 + fold(0.006 * (t / flatLen));
      // the corner nearest the pillows is slightly lifted (rumpled)
      y += Math.exp(-((s + 0.4) ** 2 + (t - 0.05) ** 2) / 0.02) * 0.03;
    } else if (t < flatLen + arc) {
      const a = (t - flatLen) / R;
      z = zEdge - R + Math.sin(a) * R; y = yTop - R + Math.cos(a) * R;
      const f = fold(0.012); z += f * Math.sin(a); y += f * Math.cos(a) * 0.3;
    } else {
      const h = t - flatLen - arc;
      z = zEdge + 0.01 + h * 0.12 + fold(0.02 + h * 0.06);
      y = yTop - R - h;
    }
    // outer edges curl down slightly
    const e = smooth(width * 0.38, width * 0.5, Math.abs(s));
    y -= e * 0.015;
    o.set(x0 + s * (1 + (t > flatLen ? 0.04 : 0)), Math.max(y, VAN.floorY - 0.12), z);
  }, [2.5, 2.5]);
}
