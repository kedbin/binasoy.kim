// OWNER: O3 (geometry/scatter). Crafted stylised forest: clumped-canopy maples, tiered drooping spruces,
// white birches framing the left of the lake view, and understory bushes. Foliage hue = instance colour
// picked from SEASONS[season].foliage / .conifer; sun-kissed highlight = material tint (brightest swatch).
// Materials come from ../nature/materials (O1 may retune there).
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { WORLD } from '../layout';
import { useScene } from '../../state/store';
import { SEASONS } from '../env/presets';
import { mulberry32 } from '../nature/util';
import { maple, spruce, birch, bush, type TreeGeo } from '../nature/treeGeo';
import { MAT, setTint } from '../nature/materials';
import { brightest } from '../nature/util';
import { groundHeight } from '../nature/terrain';

type Kind = 'spruce' | 'maple';
interface T { x: number; y: number; z: number; s: number; r: number; v: number; ci: number; kind: Kind; lum: number }

const VARIANTS = { maple: 4, spruce: 3 } as const;

function placements(count: number): T[] {
  const rand = mulberry32(7);
  const out: T[] = [];
  let tries = 0;
  while (out.length < count && tries++ < count * 30) {
    const side = rand() < 0.5 ? -1 : 1;
    const behind = rand() < 0.42;
    const x = behind ? (rand() - 0.5) * 90 : side * (7 + rand() * 42);
    const z = behind ? -9 - rand() * 34 : -14 + rand() * 22;
    if (z > WORLD.beachZ0 - 2) continue;
    if (z > WORLD.fenceZ - 1.5 && Math.abs(x) < 22) continue; // keep the lake view open
    if (Math.abs(x) < 12 && z > -9) continue;                  // clearing around the van
    if (Math.hypot(x, z) < 12.5) continue;
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < 2.6)) continue; // no interpenetrating trunks
    const kind: Kind = rand() < 0.42 ? 'spruce' : 'maple';
    const far = Math.abs(x) > 22 || z < -22;
    const s = (0.85 + rand() * 0.55) * (far ? 1.35 : 1);
    out.push({ x, y: groundHeight(x, z) - 0.05, z, s, r: rand() * Math.PI * 2, v: Math.floor(rand() * VARIANTS[kind]), ci: Math.floor(rand() * 64), kind, lum: (rand() - 0.5) * 0.08 });
  }
  return out;
}

function useTreeGeos(quality: string) {
  return useMemo(() => {
    const detail = quality === 'high' ? 2 : 1;
    const maples: TreeGeo[] = Array.from({ length: VARIANTS.maple }, (_, i) =>
      maple(101 + i * 17, { height: 4.2 + (i % 2) * 0.9, spread: 0.9 + (i % 3) * 0.15, detail }));
    const spruces: TreeGeo[] = Array.from({ length: VARIANTS.spruce }, (_, i) =>
      spruce(301 + i * 23, { height: 6 + i * 0.9, width: 1.35 + (i % 2) * 0.25, tiers: quality === 'low' ? 5 : 6 + (i % 2) }));
    return { maple: maples, spruce: spruces };
  }, [quality]);
}

/** One instanced variant: wood + leaf meshes sharing the same matrices. */
function Variant({ geo, items, palette, leafMat, woodMat, shadows }: {
  geo: TreeGeo; items: T[]; palette: string[]; leafMat: THREE.Material; woodMat: THREE.Material; shadows: boolean;
}) {
  const wood = useRef<THREE.InstancedMesh>(null!), leaf = useRef<THREE.InstancedMesh>(null!);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const c = new THREE.Color();
    items.forEach((t, i) => {
      e.set(0, t.r, 0); q.setFromEuler(e); p.set(t.x, t.y, t.z); s.setScalar(t.s);
      m.compose(p, q, s);
      wood.current.setMatrixAt(i, m); leaf.current.setMatrixAt(i, m);
      c.set(palette[t.ci % Math.max(1, palette.length)] ?? '#6B5A4C'); c.offsetHSL(0, 0, t.lum);
      leaf.current.setColorAt(i, c);
    });
    for (const r of [wood, leaf]) { r.current.instanceMatrix.needsUpdate = true; r.current.computeBoundingSphere(); }
    if (leaf.current.instanceColor) leaf.current.instanceColor.needsUpdate = true;
  }, [items, palette]);
  if (!items.length) return null;
  return (
    <>
      <instancedMesh ref={wood} args={[geo.wood, woodMat, items.length]} castShadow={shadows} receiveShadow={shadows} />
      <instancedMesh ref={leaf} args={[geo.leaf, leafMat, items.length]} castShadow={shadows} receiveShadow={shadows} />
    </>
  );
}

function Birches({ shadows, foliage }: { shadows: boolean; foliage: string[] }) {
  // the bare-ish birch cluster that frames the left of the lake view (collage #5) + one on the right
  const geos = useMemo(() => {
    const spots: [number, number, number, number, number][] = [
      // x, z, height, lean, leafiness
      [-7.6, 5.4, 8.2, 0.12, 0.45], [-9.2, 4.0, 6.8, -0.09, 0.5], [-6.3, 8.0, 7.4, 0.06, 0.35], [-10.5, 7.2, 9.0, -0.04, 0.55],
      [9.4, 3.2, 7.6, -0.1, 0.5],
    ];
    return spots.map(([x, z, h, lean, leafy], i) => ({ x, z, y: groundHeight(x, z) - 0.05, ...birch(900 + i * 11, { height: h, lean, leafy }) }));
  }, []);
  const woodMat = useMemo(() => MAT.bark(), []);
  const gold = useMemo(() => brightest(foliage), [foliage]);
  const leafMat = useMemo(() => {
    const m = MAT.foliage(gold, 0.1);
    m.color.copy(gold).multiplyScalar(0.92);
    return m;
  }, [gold]);
  useEffect(() => () => { woodMat.dispose(); leafMat.dispose(); }, [woodMat, leafMat]);
  return (
    <group name="birches">
      {geos.map((g, i) => (
        <group key={i} position={[g.x, g.y, g.z]} rotation={[0, i * 1.3, 0]}>
          <mesh geometry={g.wood} material={woodMat} castShadow={shadows} receiveShadow={shadows} />
          {foliage.length > 0 && (
            <mesh geometry={g.leaf} material={leafMat} castShadow={shadows} />
          )}
        </group>
      ))}
    </group>
  );
}

function Bushes({ shadows, palette, tint }: { shadows: boolean; palette: string[]; tint: THREE.Color }) {
  const geo = useMemo(() => bush(77, 1), []);
  const mat = useMemo(() => MAT.foliage(tint, 0.05), [tint]);
  const ref = useRef<THREE.InstancedMesh>(null!);
  const items = useMemo(() => {
    const rand = mulberry32(55);
    const out: { x: number; z: number; s: number }[] = [];
    // forest-edge belt + clumps by the fence ends + a couple framing the beach
    for (let i = 0; i < 46; i++) {
      const side = rand() < 0.5 ? -1 : 1;
      const x = side * (9 + rand() * 18), z = -10 + rand() * 17;
      if (z > WORLD.fenceZ - 0.5 && Math.abs(x) < 11) continue;
      out.push({ x, z, s: 0.6 + rand() * 0.8 });
    }
    out.push({ x: -10.4, z: 7.3, s: 1.1 }, { x: 8.6, z: 6.6, s: 1.2 }, { x: -12.5, z: 9.4, s: 0.9 }, { x: 11.5, z: 9.6, s: 1 }, { x: 7.6, z: 8.2, s: 0.7 });
    return out;
  }, []);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), c = new THREE.Color();
    items.forEach((b, i) => {
      m.makeRotationY(i * 2.1).scale(new THREE.Vector3(b.s, b.s * 0.85, b.s)).setPosition(b.x, groundHeight(b.x, b.z) - 0.08, b.z);
      ref.current.setMatrixAt(i, m);
      ref.current.setColorAt(i, c.set(palette[i % palette.length] ?? '#5E6B45').offsetHSL(0, -0.05, -0.04));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [items, palette]);
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} castShadow={shadows} receiveShadow={shadows} />;
}

export function Trees() {
  const quality = useScene((s) => s.quality);
  const season = useScene((s) => s.season);
  const pal = SEASONS[season];
  const geos = useTreeGeos(quality);
  const items = useMemo(() => placements(quality === 'low' ? 80 : quality === 'mid' ? 150 : 210), [quality]);
  const woodMat = useMemo(() => MAT.bark(), []);
  const mapleTint = useMemo(() => brightest(pal.foliage), [pal]);
  const coniferTint = useMemo(() => brightest(pal.conifer).clone().lerp(new THREE.Color('#9AA35A'), 0.45), [pal]);
  const mapleMat = useMemo(() => MAT.foliage('#ffffff'), []);
  const spruceMat = useMemo(() => MAT.conifer('#ffffff'), []);
  useEffect(() => { setTint(mapleMat, mapleTint); setTint(spruceMat, coniferTint); }, [mapleMat, spruceMat, mapleTint, coniferTint]);
  useEffect(() => () => { woodMat.dispose(); mapleMat.dispose(); spruceMat.dispose(); }, [woodMat, mapleMat, spruceMat]);
  const shadows = quality !== 'low';
  // deciduous trees in winter: leaf palette may be bare-brown; still rendered (sparser look comes from palette).
  const bushPalette = useMemo(() => [...pal.foliage.slice(-3), ...pal.conifer], [pal]);
  return (
    <group name="trees">
      {(['maple', 'spruce'] as const).map((kind) =>
        geos[kind].map((g, v) => (
          <Variant key={kind + v + quality} geo={g} items={items.filter((t) => t.kind === kind && t.v === v)}
            palette={kind === 'maple' ? pal.foliage : pal.conifer} leafMat={kind === 'maple' ? mapleMat : spruceMat} woodMat={woodMat} shadows={shadows && quality === 'high'} />
        )),
      )}
      <Birches shadows={shadows} foliage={pal.foliage} />
      <Bushes shadows={shadows && quality === 'high'} palette={bushPalette} tint={mapleTint} />
    </group>
  );
}
