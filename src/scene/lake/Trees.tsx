// Instanced low-poly trees: pines + fall maples along both sides of the clearing and the near shore,
// plus a couple of bare birches framing the left of the view (collage #5).
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { WORLD } from '../layout';
import { mulberry32 } from './noise';
import { mergeAll } from './Shore';
import { useScene } from '../../state/store';

type Kind = 'pine' | 'maple';
interface T { x: number; z: number; s: number; r: number; c: THREE.Color; kind: Kind }

function placements(count: number): T[] {
  const rand = mulberry32(7);
  const out: T[] = [];
  const maples = ['#D9682B', '#C4452C', '#E3A63B', '#E8B44A', '#B8642A'].map((h) => new THREE.Color(h));
  const pines = ['#2F4A3A', '#3B5A3F', '#28402F'].map((h) => new THREE.Color(h));
  let tries = 0;
  while (out.length < count && tries++ < count * 20) {
    const side = rand() < 0.5 ? -1 : 1;
    const behind = rand() < 0.4; // dense belt behind the van (seen in the intro view)
    const x = behind ? (rand() - 0.5) * 80 : side * (6 + rand() * 40);
    const z = behind ? -10 - rand() * 30 : -14 + rand() * 24; // never reaches the beach
    if (z > WORLD.beachZ0 - 1.5) continue;
    if (z > WORLD.fenceZ - 1 && Math.abs(x) < 20) continue; // keep the view to the lake open
    if (Math.abs(x) < 9 && z > -6) continue; // keep the clearing open around the van
    const kind: Kind = rand() < 0.45 ? 'pine' : 'maple';
    const s = 0.8 + rand() * 0.9 + (Math.abs(x) > 20 ? 0.4 : 0);
    const c = (kind === 'pine' ? pines[Math.floor(rand() * 3)] : maples[Math.floor(rand() * maples.length)]).clone();
    c.offsetHSL(0, 0, (rand() - 0.5) * 0.06);
    out.push({ x, z, s, r: rand() * Math.PI * 2, c, kind });
  }
  return out;
}

function pineGeo() {
  const parts: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(0.12, 0.16, 1.2, 5).translate(0, 0.6, 0)];
  for (let i = 0; i < 3; i++) parts.push(new THREE.ConeGeometry(1.3 - i * 0.32, 1.8, 7).translate(0, 1.6 + i * 1.0, 0));
  return mergeAll(parts);
}
function mapleGeo() {
  const parts: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(0.12, 0.18, 2.0, 5).translate(0, 1.0, 0)];
  const blobs: [number, number, number, number][] = [[0, 3.0, 0, 1.5], [0.8, 2.6, 0.3, 1.0], [-0.7, 2.7, -0.2, 1.1], [0.1, 3.6, -0.4, 0.95]];
  for (const [x, y, z, r] of blobs) parts.push(new THREE.IcosahedronGeometry(r, 0).translate(x, y, z));
  return mergeAll(parts);
}

function Forest({ kind, items }: { kind: Kind; items: T[] }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const geo = useMemo(() => (kind === 'pine' ? pineGeo() : mapleGeo()), [kind]);
  const list = items.filter((t) => t.kind === kind);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    list.forEach((t, i) => {
      e.set(0, t.r, 0); q.setFromEuler(e);
      m.compose(new THREE.Vector3(t.x, 0, t.z), q, new THREE.Vector3(t.s, t.s * (kind === 'pine' ? 1.25 : 1), t.s));
      ref.current.setMatrixAt(i, m);
      ref.current.setColorAt(i, t.c);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [list, kind]);
  return (
    <instancedMesh ref={ref} args={[geo, undefined, list.length]} castShadow receiveShadow>
      <meshLambertMaterial flatShading />
    </instancedMesh>
  );
}

function Birches() {
  // bare-ish birch trunks with sparse golden leaves, framing the left side of the lake view
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const rand = mulberry32(99);
    const trunks: [number, number, number][] = [[-7.5, 5.5, 0.12], [-9, 4, -0.08], [-6.2, 8.2, 0.05]];
    for (const [x, z, lean] of trunks) {
      const h = 7 + rand() * 2;
      parts.push(new THREE.CylinderGeometry(0.09, 0.14, h, 6).translate(0, h / 2, 0).rotateZ(lean).translate(x, 0, z));
      for (let b = 0; b < 5; b++) {
        const by = h * (0.45 + b * 0.1), len = 1.2 + rand();
        const br = new THREE.CylinderGeometry(0.025, 0.045, len, 4).translate(0, len / 2, 0)
          .rotateZ((rand() < 0.5 ? -1 : 1) * (0.6 + rand() * 0.5)).rotateY(rand() * 6.28).translate(x + lean * by, by, z);
        parts.push(br);
      }
    }
    return mergeAll(parts);
  }, []);
  return (
    <mesh geometry={geo} castShadow>
      <meshLambertMaterial color="#E9E4DA" />
    </mesh>
  );
}

export function Trees() {
  const quality = useScene((s) => s.quality);
  const items = useMemo(() => placements(quality === 'low' ? 90 : quality === 'mid' ? 190 : 280), [quality]);
  return (
    <group name="trees">
      <Forest kind="pine" items={items} />
      <Forest kind="maple" items={items} />
      <Birches />
    </group>
  );
}
