// Maple-leaf silhouette (7 pointed lobes with serrated edges + stem), shared by falling leaves and litter.
import * as THREE from 'three';

/** Returns outline points (unit scale, stem at origin pointing -Y, leaf tip at +Y ≈ 1). */
export function mapleOutline(samples = 84): THREE.Vector2[] {
  // lobes: [angle deg (90 = up), length, width]
  const lobes: [number, number, number][] = [
    [90, 1.0, 15], [45, 0.88, 14], [135, 0.88, 14], [8, 0.62, 13], [172, 0.62, 13], [-28, 0.38, 12], [208, 0.38, 12],
  ];
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < samples; i++) {
    const deg = -90 + (i / samples) * 360;
    let r = 0.3;
    for (const [a, h, w] of lobes) {
      let da = Math.abs(((deg - a + 540) % 360) - 180);
      const lobe = Math.max(0, 1 - da / (w * 1.25));
      r = Math.max(r, 0.3 + (h - 0.3) * Math.pow(lobe, 1.35));
    }
    // serration: small teeth
    r *= 1 + 0.06 * Math.max(0, Math.sin((deg * Math.PI) / 180 * 26));
    // notch at the stem
    let ds = Math.abs(((deg + 90 + 540) % 360) - 180);
    if (ds < 16) r *= 0.25 + 0.75 * (ds / 16);
    const a = (deg * Math.PI) / 180;
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r + 0.12));
  }
  return pts;
}

/** Flat maple leaf geometry with a slight centre fold and a stem; size = tip-to-stem ≈ size. */
export function mapleLeafGeometry(size: number, fold = 0.25) {
  const s = new THREE.Shape(mapleOutline());
  const g = new THREE.ShapeGeometry(s, 1);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, Math.abs(x) * fold - y * y * 0.08); // V fold + slight curl
  }
  // stem: a thin quad
  const stem = new THREE.PlaneGeometry(0.05, 0.35).translate(0, -0.12, 0);
  const merged = new THREE.BufferGeometry();
  const a = g.toNonIndexed(), b = stem.toNonIndexed();
  const pa = a.attributes.position.array as Float32Array, pb = b.attributes.position.array as Float32Array;
  const all = new Float32Array(pa.length + pb.length); all.set(pa); all.set(pb, pa.length);
  merged.setAttribute('position', new THREE.BufferAttribute(all, 3));
  merged.scale(size, size, size);
  merged.computeVertexNormals();
  // shade: veins darker toward centre (vertex colour)
  const n = all.length / 3, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = all[i * 3] / size, y = all[i * 3 + 1] / size;
    const r = Math.hypot(x, y - 0.12);
    const v = 0.78 + 0.3 * Math.min(1, r);
    col[i * 3] = v; col[i * 3 + 1] = v; col[i * 3 + 2] = v;
  }
  merged.setAttribute('color', new THREE.BufferAttribute(col, 3));
  merged.setAttribute('aTint', new THREE.BufferAttribute(new Float32Array(n), 1));
  return merged;
}
