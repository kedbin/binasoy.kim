// OWNER: Opus O4. Far-shore detail on top of the Hills silhouettes:
// - near ridge: thousands of instanced crowns (squashed low-poly clumps + spruce spires) in clustered stands
//   (red maple / orange / gold birch-aspen / dark spruce groves), a dark treeline band at the waterline,
//   pale granite rocks and a tiny cabin + dock for scale;
// - mid ridge: fewer, larger crowns; far ridge stays the hazy shader silhouette (Hills.tsx).
// Colours from SEASONS[season]; light from the damped env (hillLit/Shade/Rim, haze, mist) so presets cross-fade.
// Everything is static: no useFrame, a handful of draw calls.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { WORLD } from '../layout';
import { SEASONS } from '../env/presets';
import { envUniforms } from '../env/live';
import { useScene, type Quality } from '../../state/store';
import { RIDGES, makeRidge, type Ridge } from './Hills';
import { fbm2, mulberry32 } from './noise';

const vert = /* glsl */ `
varying vec3 vW; varying vec3 vC; varying float vH;
void main(){
  vec3 c = vec3(1.0);
  #ifdef USE_INSTANCING_COLOR
  c = instanceColor;
  #endif
  vC = c;
  vH = position.y;               // geometries are normalised to y in [0, 1]
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const frag = /* glsl */ `
uniform vec3 uKeyDir, uHillLit, uHillShade, uHillRim, uHaze, uPractical;
uniform float uHazeAmt, uMist, uNight, uLayerHaze, uWaterY, uGlow;
varying vec3 vW; varying vec3 vC; varying float vH;
void main(){
  // faceted normal (low-poly read at distance), always facing the viewer
  vec3 N = normalize(cross(dFdx(vW), dFdy(vW)));
  vec3 V = normalize(cameraPosition - vW);
  if (dot(N, V) < 0.0) N = -N;
  vec3 K = normalize(uKeyDir);
  vec3 base = vC;
  float lum = dot(base, vec3(0.299, 0.587, 0.114));
  base = mix(base, vec3(lum), uNight * 0.7);
  // sun behind the ridge: camera-facing sides sit in cool shade, sun-side + up faces warm
  float lit = clamp(dot(N, K) * 0.55 + 0.5 * N.y * 0.6 + 0.2, 0.0, 1.0);
  lit = smoothstep(0.1, 0.95, lit);
  vec3 col = base * mix(uHillShade, uHillLit, lit);
  // self-shadow toward the crown base (dense canopy)
  col *= mix(0.62, 1.0, smoothstep(0.0, 0.85, vH));
  // backlit rim: silhouette edges looking toward the key light
  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.5);
  float back = clamp(dot(-V, K), 0.0, 1.0);
  col += uHillRim * base * fres * back * smoothstep(0.35, 1.0, vH) * 0.9;
  // warm emissive (cabin window at night)
  col += uPractical * uGlow * uNight * 2.5;
  float hy = vW.y - uWaterY;
  col *= mix(0.5, 1.0, smoothstep(0.0, 3.5, hy));                         // dark understory at the waterline
  col = mix(col, uHaze, clamp(uLayerHaze * uHazeAmt, 0.0, 1.0));          // aerial perspective (matches Hills)
  col = mix(col, uHaze, (1.0 - smoothstep(0.0, 8.0, hy)) * uMist * 0.55 * smoothstep(0.1, 0.6, uLayerHaze)); // mist: far layers only
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function makeMat(layerHaze: number, glow = 0) {
  return new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, fog: false,
    uniforms: {
      uLayerHaze: { value: layerHaze }, uWaterY: { value: WORLD.waterY }, uGlow: { value: glow },
      uKeyDir: envUniforms.uKeyDir, uHillLit: envUniforms.uHillLit, uHillShade: envUniforms.uHillShade,
      uHillRim: envUniforms.uHillRim, uHaze: envUniforms.uHaze, uHazeAmt: envUniforms.uHazeAmt,
      uMist: envUniforms.uMist, uNight: envUniforms.uNight, uPractical: envUniforms.uPractical,
    },
  });
}

/** Unit geometries, base at y = 0, height 1, width 1. */
function clumpGeo() {
  const g = new THREE.IcosahedronGeometry(0.5, 0);
  g.translate(0, 0.5, 0);
  return g;
}
function spireGeo() {
  const g = new THREE.ConeGeometry(0.5, 1, 6, 1, true);
  g.translate(0, 0.5, 0);
  return g;
}

// Stand kinds → palette slots
const enum Kind { Red, Orange, Gold, Conifer }
const FOL_SLOTS: Record<Kind, number[]> = { [Kind.Red]: [1, 5], [Kind.Orange]: [0, 4], [Kind.Gold]: [2, 3], [Kind.Conifer]: [0, 1, 2] };

interface Crowns { clump: THREE.InstancedMesh; spire: THREE.InstancedMesh; kinds: { mesh: THREE.InstancedMesh; kind: Kind; slot: number; shade: number }[] }

const COUNTS: Record<Quality, [near: number, mid: number]> = { high: [6000, 2000], mid: [3500, 1200], low: [1500, 450] };
/** keep crowns off the cabin clearing */
const CABIN_U = 0.56;

function buildCrowns(ridge: Ridge, count: number, size: number, seed: number, mat: THREE.ShaderMaterial, clearing: boolean): Crowns {
  const rand = mulberry32(seed);
  const o = ridge.opts;
  const p = new THREE.Vector3();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), e = new THREE.Euler();
  type Item = { x: number; y: number; z: number; w: number; h: number; kind: Kind; slot: number; shade: number; rot: number };
  const items: Item[] = [];
  const band = Math.round(count * 0.14); // extra dark treeline crowns at the waterline
  for (let i = 0; i < count + band; i++) {
    const isBand = i >= count;
    const u = 0.02 + rand() * 0.96;
    // sample uniformly in screen height (v = asin(h)): the front face is mostly vertical
    const hh = isBand ? rand() * 0.12 : Math.pow(rand(), 0.9);
    const v = Math.asin(hh) / (Math.PI / 2);
    ridge.sample(u, v, p);
    const x = p.x;
    if (clearing && Math.abs(u - CABIN_U) < 0.012 && hh < 0.35) continue;
    const conifStand = ridge.conif(u);
    const patch = fbm2(x * 0.016 + seed, p.y * 0.05, 3);
    const grove = fbm2(x * 0.03 - seed * 1.7, p.y * 0.08 + 9.0, 2);
    let kind: Kind;
    if (rand() < conifStand * 0.85 || grove > 0.66 || rand() < 0.09 || (isBand && rand() < 0.6)) kind = Kind.Conifer;
    else {
      const t = patch + (rand() - 0.5) * 0.14;
      kind = t < 0.43 ? Kind.Red : t < 0.56 ? Kind.Orange : Kind.Gold;
    }
    const slots = FOL_SLOTS[kind];
    const slot = slots[Math.floor(rand() * slots.length)];
    const conif = kind === Kind.Conifer;
    const k = size * (0.7 + rand() * 0.6) * (isBand ? 0.8 : 1);
    const w = conif ? k * (0.5 + rand() * 0.15) : k * (0.95 + rand() * 0.35);
    const h = conif ? k * (1.6 + rand() * 0.7) : k * (0.8 + rand() * 0.25);
    const shade = (0.82 + rand() * 0.3) * (isBand ? 0.55 : 1);
    // sit in front of the surface, base sunk a little; push toward the camera so crowns layer over the shader canopy
    items.push({ x, y: p.y - h * 0.22, z: p.z - w * 0.35, w, h, kind, slot, shade, rot: rand() * Math.PI * 2 });
  }
  const nS = items.filter((t) => t.kind === Kind.Conifer).length;
  const clump = new THREE.InstancedMesh(clumpGeo(), mat, items.length - nS);
  const spire = new THREE.InstancedMesh(spireGeo(), mat, nS);
  const kinds: Crowns['kinds'] = [];
  let ic = 0, is = 0;
  for (const t of items) {
    const conif = t.kind === Kind.Conifer;
    e.set(0, t.rot, conif ? 0 : (t.rot - 3) * 0.05);
    q.setFromEuler(e);
    s.set(t.w, t.h, conif ? t.w : t.w * 0.75);
    m.compose(p.set(t.x, t.y, t.z), q, s);
    const mesh = conif ? spire : clump;
    mesh.setMatrixAt(conif ? is++ : ic++, m);
    kinds.push({ mesh, kind: t.kind, slot: t.slot, shade: t.shade });
  }
  for (const mesh of [clump, spire]) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false; // spans the whole shore; bounding sphere of the base geo would be wrong
    mesh.matrixAutoUpdate = false;
  }
  return { clump, spire, kinds };
}

function paint(c: Crowns, season: keyof typeof SEASONS) {
  const pal = SEASONS[season];
  const col = new THREE.Color();
  const idx = new Map<THREE.InstancedMesh, number>();
  for (const k of c.kinds) {
    const i = idx.get(k.mesh) ?? 0;
    idx.set(k.mesh, i + 1);
    const src = k.kind === Kind.Conifer ? pal.conifer : pal.foliage;
    col.set(src[k.slot % src.length]).multiplyScalar(k.shade);
    k.mesh.setColorAt(i, col);
  }
  for (const mesh of [c.clump, c.spire]) if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

/** Pale granite at the waterline + a tiny cabin and dock (for scale). */
function buildShoreProps(ridge: Ridge, mat: THREE.ShaderMaterial, glowMat: THREE.ShaderMaterial) {
  const rand = mulberry32(71);
  const p = new THREE.Vector3();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), e = new THREE.Euler();
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  rockGeo.translate(0, 0.35, 0);
  const N = 26;
  const rocks = new THREE.InstancedMesh(rockGeo, mat, N);
  const granite = ['#9C948A', '#867F77', '#ADA497', '#6E6862'];
  const col = new THREE.Color();
  for (let i = 0; i < N; i++) {
    // clustered: pick a few outcrops along the shore
    const centre = [0.3, 0.41, 0.47, 0.53, 0.6, 0.68][i % 6];
    const u = centre + (rand() - 0.5) * 0.03;
    ridge.sample(u, 0, p);
    const r = 0.7 + rand() * 1.6;
    e.set(rand() * 0.6, rand() * 6.28, rand() * 0.4);
    q.setFromEuler(e);
    s.set(r * (1.2 + rand() * 0.6), r * (0.45 + rand() * 0.3), r);
    m.compose(p.set(p.x, WORLD.waterY - r * 0.25, p.z - 2.5 - rand() * 3), q, s);
    rocks.setMatrixAt(i, m);
    rocks.setColorAt(i, col.set(granite[i % granite.length]));
  }
  rocks.frustumCulled = false;

  // cabin + dock as a few instanced boxes/prisms in the same material
  ridge.sample(CABIN_U, 0.08, p);
  const cx = p.x, cz = p.z - 3, base = WORLD.waterY + 1.6;
  const box = new THREE.BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);
  const parts: [number, number, number, number, number, number, string][] = [
    // x, y, z, w, h, d, colour
    [cx, base, cz, 7, 3.4, 5.5, '#6A4632'],          // log walls
    [cx - 4.2, base, cz + 0.4, 1.4, 4.8, 1.4, '#7A6E66'], // stone chimney
    [cx + 1.5, WORLD.waterY + 0.35, cz - 9, 2.4, 0.35, 13, '#8A6B4E'], // dock deck
    [cx + 1.5, WORLD.waterY - 0.8, cz - 15, 2.6, 1.2, 0.5, '#4B3A2E'],  // dock end post band
    [cx - 1.0, base - 1.6, cz, 8, 1.6, 6, '#4E3A2C'], // foundation / bank
    [cx + 6, WORLD.waterY + 0.2, cz - 13, 4.5, 0.7, 1.6, '#C94A2E'], // red canoe on the dock edge
  ];
  const boxes = new THREE.InstancedMesh(box, mat, parts.length);
  parts.forEach(([x, y, z, w, h, d, c], i) => {
    m.compose(p.set(x, y, z), q.identity(), s.set(w, h, d));
    boxes.setMatrixAt(i, m);
    boxes.setColorAt(i, col.set(c));
  });
  boxes.frustumCulled = false;
  // gable roof: a 3-sided prism along x
  const roofGeo = new THREE.CylinderGeometry(1, 1, 1, 3, 1);
  roofGeo.rotateZ(Math.PI / 2);
  roofGeo.rotateX(Math.PI / 6 + Math.PI);
  // the shader expects instancing: a 1-instance mesh
  const roofI = new THREE.InstancedMesh(roofGeo, mat, 1);
  roofI.setMatrixAt(0, m.compose(p.set(cx, base + 3.4 + 1.0, cz), q.identity(), s.set(8.4, 2.4, 3.9)));
  roofI.setColorAt(0, col.set('#3B2C27'));
  roofI.frustumCulled = false;
  // windows: glow at night (practical colour), dark glass by day
  const win = new THREE.InstancedMesh(box, glowMat, 2);
  [[cx - 1.6, cz - 2.8], [cx + 1.8, cz - 2.8]].forEach(([x, z], i) => {
    m.compose(p.set(x, base + 1.2, z), q.identity(), s.set(1.3, 1.1, 0.2));
    win.setMatrixAt(i, m);
    win.setColorAt(i, col.set('#2A2622'));
  });
  win.frustumCulled = false;
  return { rocks, boxes, roof: roofI, win, dispose: () => { rockGeo.dispose(); box.dispose(); roofGeo.dispose(); } };
}

export function FarForest() {
  const season = useScene((s) => s.season);
  const quality = useScene((s) => s.quality);
  const built = useMemo(() => {
    const [nNear, nMid] = COUNTS[quality];
    const near = makeRidge(RIDGES[2]), mid = makeRidge(RIDGES[1]);
    const matNear = makeMat(RIDGES[2].haze), matMid = makeMat(RIDGES[1].haze), glow = makeMat(RIDGES[2].haze, 1);
    // crowns grow on lower tiers so the carpet still closes
    const nearC = buildCrowns(near, nNear, 4.2 * Math.sqrt(6000 / nNear), 11, matNear, true);
    const midC = buildCrowns(mid, nMid, 7.5 * Math.sqrt(2000 / nMid), 7, matMid, false);
    const props = buildShoreProps(near, matNear, glow);
    return { nearC, midC, props, mats: [matNear, matMid, glow] };
  }, [quality]);
  useEffect(() => { paint(built.nearC, season); paint(built.midC, season); }, [built, season]);
  useEffect(() => () => {
    for (const c of [built.nearC, built.midC]) { c.clump.geometry.dispose(); c.spire.geometry.dispose(); c.clump.dispose(); c.spire.dispose(); }
    built.props.dispose();
    built.mats.forEach((m) => m.dispose());
  }, [built]);
  const { nearC, midC, props } = built;
  return (
    <group name="far-forest">
      <primitive object={midC.clump} renderOrder={-4} />
      <primitive object={midC.spire} renderOrder={-4} />
      <primitive object={nearC.clump} renderOrder={-3} />
      <primitive object={nearC.spire} renderOrder={-3} />
      <primitive object={props.rocks} />
      <primitive object={props.boxes} />
      <primitive object={props.roof} />
      <primitive object={props.win} />
    </group>
  );
}
