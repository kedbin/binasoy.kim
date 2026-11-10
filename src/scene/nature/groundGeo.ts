// Ground mesh + painted detail (O3): grass colour patches, worn dirt + tyre tracks under the van, wet/dry sand,
// painted contact AO under the van. Colours come from SEASONS (grass[], ground).
import * as THREE from 'three';
import { WORLD } from '../layout';
import type { SeasonPalette } from '../env/presets';
import { fbm2, noise2, smooth01 } from './util';
import { groundHeight, beachMask, trackX, TRACK_OFFS, VAN_FOOT } from './terrain';

export function groundGeometry(pal: SeasonPalette, res: number) {
  const x0 = -90, x1 = 90, z0 = -70, z1 = 40;
  // non-uniform grid: denser near the van/beach (|x|<20, z in -8..16)
  const xs: number[] = [], zs: number[] = [];
  for (let x = x0; x <= x1 + 1e-6;) { xs.push(x); x += Math.abs(x) < 18 ? 0.5 / res : Math.abs(x) < 35 ? 1.5 : 4; }
  for (let z = z0; z <= z1 + 1e-6;) { zs.push(z); z += z > -9 && z < 17 ? 0.4 / res : z > -25 && z < 25 ? 1.2 : 4; }
  const nx = xs.length, nz = zs.length;
  const pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3);
  const grass = pal.grass.map((h) => new THREE.Color(h));
  const g0 = grass[0] ?? new THREE.Color('#6E7B45'), g1 = grass[1] ?? g0, g2 = grass[2] ?? g1;
  const sand = new THREE.Color(pal.ground), wet = sand.clone().multiplyScalar(0.72).lerp(new THREE.Color('#7C7466'), 0.25);
  const dirt = new THREE.Color(pal.ground).lerp(new THREE.Color('#6E5A44'), 0.6);
  const dark = g0.clone().multiplyScalar(0.72).lerp(new THREE.Color('#3E4A2C'), 0.3);
  const c = new THREE.Color(), s = new THREE.Color();
  let k = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++, k++) {
    const x = xs[i], z = zs[j];
    const y = groundHeight(x, z);
    pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
    // grass: big soft patches of 3 tones + fine mottling
    const big = fbm2(x * 0.06 + 3, z * 0.06 - 1, 3), mid = fbm2(x * 0.25, z * 0.25, 2), fine = noise2(x * 1.7, z * 1.7);
    c.copy(g0).lerp(g1, smooth01(big, 0.35, 0.65)).lerp(g2, smooth01(mid, 0.6, 0.8) * 0.8);
    c.lerp(dark, smooth01(0.4 - mid, 0, 0.25) * 0.6);
    c.multiplyScalar(0.93 + 0.14 * fine);
    // worn dirt pad around/behind the van + tyre tracks leading in from the back
    const pad = 1 - smooth01(Math.hypot(Math.max(0, Math.abs(x) - 1.2) / 1.3, Math.max(0, z - 1.4, VAN_FOOT.z0 + 0.3 - z) / 1.6), 0.2, 1.0);
    let tr = 0;
    if (z < 6) for (const o of TRACK_OFFS) {
      const d = Math.abs(x - trackX(o, z));
      tr = Math.max(tr, (1 - smooth01(d, 0.08, 0.26)) * (1 - smooth01(z, 2.5, 6)) * (0.55 + 0.45 * noise2(z * 0.9, o)));
    }
    const wear = Math.max(pad * (0.45 + 0.5 * fbm2(x * 0.9, z * 0.9, 2)), tr * 0.85);
    c.lerp(dirt, wear);
    // painted AO under the van body
    const under = 1 - smooth01(Math.hypot(Math.max(0, Math.abs(x) - 0.75), Math.max(0, z - 1.25, -3.6 - z)), 0, 0.9);
    c.multiplyScalar(1 - under * 0.55);
    // beach
    const b = beachMask(x, z);
    s.copy(sand).multiplyScalar(0.94 + 0.1 * noise2(x * 2.3, z * 2.3)).lerp(wet, smooth01(z, WORLD.shoreZ - 2.2, WORLD.shoreZ + 0.2));
    // dry grass fringe at the beach edge
    c.lerp(g2.clone().lerp(sand, 0.4), smooth01(b, 0.05, 0.5) * 0.7);
    c.lerp(s, smooth01(b, 0.35, 1));
    col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
  }
  const idx: number[] = [];
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, cc = a + nx, d = cc + 1;
    idx.push(a, cc, b, b, cc, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aTint', new THREE.BufferAttribute(new Float32Array(nx * nz), 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
