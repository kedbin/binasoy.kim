// OWNER: O3 (geometry/scatter). Foreground: grass bank with tonal patches, worn dirt pad + tyre tracks under the van,
// sandy beach with pebbles + driftwood, rough split-rail fence, rocks, grass tufts, ferns and fallen-leaf litter.
// Colours: SEASONS[season] (grass[], ground, leafFall[]). Materials: ../nature/materials (O1 may retune there).
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { WORLD } from '../layout';
import { useScene } from '../../state/store';
import { SEASONS } from '../env/presets';
import { MAT, natureMaterial } from '../nature/materials';
import { groundGeometry } from '../nature/groundGeo';
import { fenceGeometry, grassTuft, fern, pebble, driftwood } from '../nature/propsGeo';
import { rock } from '../nature/treeGeo';
import { mapleLeafGeometry } from '../nature/leafShape';
import { groundHeight, beachMask, inVan, trackX, TRACK_OFFS } from '../nature/terrain';
import { mulberry32, brightest, mergeAll as mergeNature } from '../nature/util';

type Inst = { x: number; z: number; s: number; r: number; tilt?: number; c?: number };

function useInstances(ref: React.RefObject<THREE.InstancedMesh | null>, items: Inst[], colors: THREE.Color[] | null, yOff = 0, flatTilt = false) {
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return;
    const o = new THREE.Object3D();
    items.forEach((it, i) => {
      o.position.set(it.x, groundHeight(it.x, it.z) + yOff * it.s, it.z);
      if (flatTilt) o.rotation.set(-Math.PI / 2 + (it.tilt ?? 0), 0, it.r);
      else o.rotation.set(it.tilt ?? 0, it.r, (it.tilt ?? 0) * 0.7);
      o.scale.setScalar(it.s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      if (colors && colors.length) m.setColorAt(i, colors[(it.c ?? i) % colors.length]);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [ref, items, colors, yOff, flatTilt]);
}

function onTrack(x: number, z: number) {
  return z < 4 && TRACK_OFFS.some((o) => Math.abs(x - trackX(o, z)) < 0.3);
}

function scatter(seed: number, n: number, gen: (r: () => number) => Inst | null) {
  const rand = mulberry32(seed), out: Inst[] = [];
  for (let i = 0; i < n * 4 && out.length < n; i++) { const it = gen(rand); if (it) out.push(it); }
  return out;
}

function Grass({ count, palette, shadows }: { count: number; palette: string[]; shadows: boolean }) {
  const geo = useMemo(() => grassTuft(5, 9, 0.42), []);
  const tint = useMemo(() => brightest(palette).clone().lerp(new THREE.Color('#E8D58A'), 0.35), [palette]);
  const mat = useMemo(() => MAT.grass(tint), [tint]);
  useEffect(() => () => mat.dispose(), [mat]);
  const colors = useMemo(() => palette.map((h) => new THREE.Color(h)), [palette]);
  const items = useMemo(() => scatter(11, count, (r) => {
    // dense near the camera views: along the fence, the bank, around the van; sparse further out
    const band = r();
    const x = band < 0.35 ? -13 + r() * 24 : (r() - 0.5) * 44;
    const z = band < 0.35 ? 5 + r() * 4.3 : -12 + r() * 21;
    if (beachMask(x, z) > 0.35 || inVan(x, z, 0.15) || onTrack(x, z)) return null;
    return { x, z, s: 0.6 + r() * 0.8 + (z > 6 ? 0.3 : 0), r: r() * 6.28, tilt: (r() - 0.5) * 0.2, c: Math.floor(r() * 9) };
  }), [count]);
  const ref = useRef<THREE.InstancedMesh>(null);
  useInstances(ref, items, colors, -0.02);
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} receiveShadow={shadows} />;
}

function Ferns({ palette }: { palette: string[] }) {
  const geo = useMemo(() => fern(3, 0.75), []);
  const mat = useMemo(() => natureMaterial({ tint: brightest(palette), wind: 0.05, windY: [0.1, 0.5], windFreq: 1.2, side: THREE.DoubleSide, translucency: 1 }), [palette]);
  useEffect(() => () => mat.dispose(), [mat]);
  const colors = useMemo(() => palette.map((h) => new THREE.Color(h)), [palette]);
  const items = useMemo(() => scatter(23, 34, (r) => {
    const side = r() < 0.5 ? -1 : 1;
    const x = side * (5 + r() * 9), z = -6 + r() * 14;
    if (beachMask(x, z) > 0.1 || inVan(x, z, 1)) return null;
    return { x, z, s: 0.7 + r() * 0.6, r: r() * 6.28, c: Math.floor(r() * 5) };
  }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useInstances(ref, items, colors);
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} />;
}

function Rocks({ shadows }: { shadows: boolean }) {
  const geos = useMemo(() => [rock(1, 1), rock(2, 1), rock(3, 1)], []);
  const mat = useMemo(() => MAT.rock(), []);
  useEffect(() => () => mat.dispose(), [mat]);
  // hand-placed: a cluster by the fence end, a pair at the waterline, a few in the grass, shoreline boulders
  const sets = useMemo<Inst[][]>(() => [
    [{ x: -10.9, z: 7.6, s: 0.55, r: 0.3 }, { x: 6.2, z: 12.6, s: 0.42, r: 1.2 }, { x: -6.5, z: 13.3, s: 0.6, r: 2 }, { x: 12, z: 11.5, s: 0.9, r: 0.2 }],
    [{ x: -10.2, z: 7.9, s: 0.3, r: 1.5 }, { x: 5.4, z: 13.1, s: 0.25, r: 0.6 }, { x: 4.5, z: 3.5, s: 0.22, r: 2.2 }, { x: -14, z: 10.4, s: 1.1, r: 0.9 }],
    [{ x: -4.2, z: 5.2, s: 0.18, r: 0.4 }, { x: -1.2, z: 12.4, s: 0.32, r: 1.9 }, { x: 9.8, z: 4.4, s: 0.35, r: 2.6 }, { x: -12, z: 3, s: 0.6, r: 0.1 }],
  ], []);
  return (
    <>
      {geos.map((g, i) => <RockSet key={i} geo={g} mat={mat} items={sets[i]} shadows={shadows} />)}
    </>
  );
}
function RockSet({ geo, mat, items, shadows }: { geo: THREE.BufferGeometry; mat: THREE.Material; items: Inst[]; shadows: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useInstances(ref, items, null, 0.05);
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} castShadow={shadows} receiveShadow={shadows} />;
}

function Pebbles({ count, ground }: { count: number; ground: string }) {
  const geo = useMemo(() => pebble(9), []);
  const mat = useMemo(() => MAT.rock(), []);
  useEffect(() => () => mat.dispose(), [mat]);
  const colors = useMemo(() => {
    const g = new THREE.Color(ground);
    return [g.clone().multiplyScalar(0.62), g.clone().multiplyScalar(0.8), new THREE.Color('#8C8378'), new THREE.Color('#6F6A64'), g.clone().multiplyScalar(1.05)];
  }, [ground]);
  const items = useMemo(() => scatter(31, count, (r) => {
    const x = (r() - 0.5) * 34, z = WORLD.beachZ0 + 0.2 + r() * (WORLD.shoreZ - WORLD.beachZ0 + 0.8);
    if (beachMask(x, z) < 0.7) return null;
    const near = z > WORLD.shoreZ - 1.6 ? 1.6 : 1; // more pebbles at the waterline
    if (r() > 0.55 * near) return null;
    return { x, z, s: 0.03 + r() * r() * 0.09, r: r() * 6.28, c: Math.floor(r() * 5) };
  }), [count]);
  const ref = useRef<THREE.InstancedMesh>(null);
  useInstances(ref, items, colors, 0.15);
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} />;
}

function Driftwood({ shadows }: { shadows: boolean }) {
  const geo = useMemo(() => {
    const a = driftwood(4, 2.6), b = driftwood(8, 1.4);
    const place = (g: THREE.BufferGeometry, x: number, z: number, ry: number) => {
      g.rotateY(ry); g.translate(x, groundHeight(x, z) - 0.04, z); return g;
    };
    return mergeNature([place(a, -4.6, 11.3, 0.35), place(b, 7.4, 10.6, -0.9)]);
  }, []);
  const mat = useMemo(() => MAT.wood(), []);
  useEffect(() => () => mat.dispose(), [mat]);
  return <mesh geometry={geo} material={mat} castShadow={shadows} receiveShadow={shadows} />;
}

function LeafLitter({ count, colors: hex }: { count: number; colors: string[] }) {
  const geo = useMemo(() => mapleLeafGeometry(0.11, 0.18), []);
  const mat = useMemo(() => natureMaterial({ roughness: 0.85, side: THREE.DoubleSide }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  const colors = useMemo(() => hex.flatMap((h) => { const c = new THREE.Color(h); return [c, c.clone().multiplyScalar(0.78), c.clone().offsetHSL(-0.02, -0.1, -0.12)]; }), [hex]);
  const items = useMemo(() => scatter(47, count, (r) => {
    // drifts: denser under trees, along the fence and around the van tyres; a few on the sand
    const mode = r();
    let x: number, z: number;
    if (mode < 0.3) { x = -12 + r() * 22; z = WORLD.fenceZ - 0.4 + r() * 1.2; }
    else if (mode < 0.5) { const a = r() * 6.28, d = 1.2 + r() * 2.2; x = Math.cos(a) * d * 1.1; z = -1 + Math.sin(a) * d * 1.8; }
    else { x = (r() - 0.5) * 40; z = -12 + r() * 23; }
    if (inVan(x, z, -0.1)) return null;
    if (beachMask(x, z) > 0.5 && r() > 0.12) return null;
    return { x, z, s: 0.7 + r() * 0.8, r: r() * 6.28, tilt: (r() - 0.5) * 0.5, c: Math.floor(r() * 99) };
  }), [count]);
  const ref = useRef<THREE.InstancedMesh>(null);
  useInstances(ref, items, colors, 0.012, true);
  if (!hex.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} />;
}

export function Shore() {
  const quality = useScene((s) => s.quality);
  const season = useScene((s) => s.season);
  const pal = SEASONS[season];
  const hi = quality === 'high', lo = quality === 'low';
  const ground = useMemo(() => groundGeometry(pal, hi ? 1 : lo ? 0.5 : 0.75), [pal, hi, lo]);
  const fence = useMemo(fenceGeometry, []);
  const groundMat = useMemo(() => MAT.ground(), []);
  const woodMat = useMemo(() => MAT.wood(), []);
  useEffect(() => () => { groundMat.dispose(); woodMat.dispose(); }, [groundMat, woodMat]);
  useEffect(() => () => ground.dispose(), [ground]);
  const shadows = !lo;
  return (
    <group name="shore">
      <mesh geometry={ground} material={groundMat} receiveShadow={shadows} />
      <mesh geometry={fence} material={woodMat} castShadow={shadows} receiveShadow={shadows} />
      <Rocks shadows={shadows} />
      <Driftwood shadows={shadows} />
      <Pebbles count={hi ? 260 : lo ? 70 : 150} ground={pal.ground} />
      <Grass count={hi ? 2200 : lo ? 450 : 1200} palette={pal.grass} shadows={hi} />
      {!lo && <Ferns palette={pal.conifer} />}
      {pal.particle === 'leaves' && <LeafLitter count={hi ? 700 : lo ? 160 : 380} colors={pal.leafFall} />}
    </group>
  );
}

/** @deprecated kept for back-compat with older callers; prefer ../nature/util mergeAll. */
export const mergeAll = mergeNature;
