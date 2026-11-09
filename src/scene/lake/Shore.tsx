// Foreground: grass bank under the van sloping to a sandy beach, split-rail fence, rocks.
import { useMemo } from 'react';
import * as THREE from 'three';
import { WORLD, PALETTE } from '../layout';
import { fbm2, mulberry32 } from './noise';
import { useScene } from '../../state/store';

function groundGeometry() {
  const w = 160, d = 100, sx = 120, sz = 90;
  const g = new THREE.PlaneGeometry(w, d, sx, sz);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, -60 + d / 2); // z from -60 .. 40
  const pos = g.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  const grass = new THREE.Color(PALETTE.grass), grass2 = new THREE.Color('#8A8A4E'), dry = new THREE.Color('#A79A62');
  const sand = new THREE.Color(PALETTE.sand), wet = new THREE.Color('#9C8C70');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const n = fbm2(x * 0.15, z * 0.15, 3);
    // profile: flat parking area, gentle drop to the beach, beach slopes under water
    let y = 0;
    if (z > WORLD.beachZ0 - 1.5) y = -0.35 * THREE.MathUtils.smoothstep(z, WORLD.beachZ0 - 1.5, WORLD.beachZ0 + 0.5);
    if (z > WORLD.shoreZ - 1) y -= 0.6 * (z - (WORLD.shoreZ - 1)) * 0.25;
    y += (n - 0.5) * 0.12 * (z < WORLD.beachZ0 ? 1 : 0.3);
    // the shore line wiggles in x
    pos.setY(i, y);
    const beach = THREE.MathUtils.smoothstep(z + Math.sin(x * 0.2) * 0.8, WORLD.beachZ0 - 0.6, WORLD.beachZ0 + 0.6);
    c.copy(grass).lerp(grass2, n).lerp(dry, Math.max(0, n - 0.55) * 1.5);
    const s = sand.clone().lerp(wet, THREE.MathUtils.smoothstep(z, WORLD.shoreZ - 2, WORLD.shoreZ));
    c.lerp(s, beach);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function fenceGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const rand = mulberry32(42);
  const x0 = -9, x1 = 7, posts = 6;
  for (let i = 0; i <= posts; i++) {
    const x = x0 + ((x1 - x0) * i) / posts;
    const p = new THREE.CylinderGeometry(0.07, 0.08, 1.0, 6);
    p.translate(x, 0.45, WORLD.fenceZ + Math.sin(i) * 0.15);
    p.rotateZ((rand() - 0.5) * 0.04);
    parts.push(p);
    if (i < posts) {
      const nx = x0 + ((x1 - x0) * (i + 1)) / posts;
      const len = nx - x;
      for (const h of [0.75]) {
        const r = new THREE.CylinderGeometry(0.05, 0.05, len, 6);
        r.rotateZ(Math.PI / 2);
        r.translate(x + len / 2, h - (rand() - 0.5) * 0.06, WORLD.fenceZ + Math.sin(i + 0.5) * 0.15);
        parts.push(r);
      }
    }
  }
  return mergeAll(parts);
}

function mergeAll(geos: THREE.BufferGeometry[]) {
  // minimal merge (non-indexed) to avoid importing examples just for this
  const ng = geos.map((g) => g.toNonIndexed());
  let n = 0; ng.forEach((g) => (n += g.attributes.position.count));
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of ng) {
    g.computeVertexNormals();
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

export function Shore() {
  const quality = useScene((s) => s.quality);
  const ground = useMemo(groundGeometry, []);
  const fence = useMemo(fenceGeometry, []);
  return (
    <group name="shore">
      <mesh geometry={ground} receiveShadow={quality !== 'low'}>
        <meshLambertMaterial vertexColors />
      </mesh>
      <mesh geometry={fence} castShadow={quality === 'high'}>
        <meshLambertMaterial color="#6B5640" />
      </mesh>
    </group>
  );
}

export { mergeAll };
