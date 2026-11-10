// OWNER: Opus O1. Far shore: three layered forested ridges + their mirror under the glassy lake.
// - Silhouette: big soft rolls + a row of individual tree crowns (rounded maples, pointed conifers).
// - Canopy shader: cellular crowns (per-crown colour from SEASONS[season], fake dome normal, dark gaps),
//   sun-side warm / shade-side cool from LIGHTS[timeOfDay].hillLit/hillShade, warm backlit rims on the crests,
//   aerial haze per layer + low mist at the waterline, a darker shoreline band.
// - Reflection: same geometry mirrored about the water plane with ripple distortion, darker + hazier.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { WORLD } from '../layout';
import { SEASONS } from '../env/presets';
import { envUniforms } from '../env/live';
import { useScene } from '../../state/store';
import { fbm1, mulberry32 } from './noise';

interface LayerOpts { z: number; width: number; height: number; depth: number; seed: number; haze: number; crown: number }

function hillGeometry({ z, width, height, depth, seed, haze, crown }: LayerOpts) {
  const segX = Math.round(width / (crown * 0.22)), segY = 14;
  const rand = mulberry32(seed);
  const off = rand() * 100;
  // pre-compute the crown row (independent trees along x)
  const nC = Math.ceil(width / crown) + 2;
  const cH = new Float32Array(nC), cW = new Float32Array(nC), cK = new Uint8Array(nC), cO = new Float32Array(nC);
  for (let i = 0; i < nC; i++) {
    cH[i] = crown * (0.35 + rand() * 0.5);
    cW[i] = 0.75 + rand() * 0.6;
    cO[i] = (rand() - 0.5) * 0.4;
    cK[i] = 0;
  }
  const crownAt = (x: number, conif: number) => {
    const fx = (x + width / 2) / crown;
    const i0 = Math.floor(fx);
    let best = 0;
    for (let k = -1; k <= 1; k++) {
      const i = THREE.MathUtils.clamp(i0 + k, 0, nC - 1);
      const t = (fx - (i + 0.5 + cO[i])) / (0.5 * cW[i]);
      if (Math.abs(t) >= 1) continue;
      const dome = Math.sqrt(1 - t * t);
      const spire = Math.pow(1 - Math.abs(t), 1.4) * 1.5;
      const v = cH[i] * THREE.MathUtils.lerp(dome, spire, conif);
      if (v > best) best = v;
    }
    return best;
  };
  const pos: number[] = [], uvs: number[] = [], idx: number[] = [], extra: number[] = [];
  for (let j = 0; j <= segY; j++) {
    const v = j / segY;
    for (let i = 0; i <= segX; i++) {
      const u = i / segX;
      const x = (u - 0.5) * width;
      const conif = THREE.MathUtils.smoothstep(fbm1(u * 9.0 - off, 2), 0.5, 0.62);
      const ridge = height * (0.5 + 0.5 * fbm1(u * 3.2 + off, 3)) + crownAt(x, conif);
      const prof = Math.sin(v * Math.PI * 0.5); // rounded front face
      const y = WORLD.waterY + ridge * prof;
      const zz = z + depth * (1 - Math.cos(v * Math.PI * 0.5)) + Math.sin(u * 5.0 + off) * depth * 0.35;
      pos.push(x, y, zz);
      uvs.push(u, v);
      extra.push(haze, conif);
    }
  }
  for (let j = 0; j < segY; j++) for (let i = 0; i < segX; i++) {
    const a = j * (segX + 1) + i, b = a + 1, d = a + segX + 1, e = d + 1;
    idx.push(a, d, b, b, d, e);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute('aHill', new THREE.Float32BufferAttribute(extra, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const vert = /* glsl */ `
uniform float uReflect; uniform float uTime; uniform float uWaterY;
attribute vec2 aHill;
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying vec2 vHill; varying float vCrest;
void main(){
  vUv = uv; vHill = aHill;
  vCrest = uv.y;
  vec3 p = position;
  vec4 w = modelMatrix * vec4(p, 1.0);
  if (uReflect > 0.5) {
    // ripple distortion grows with depth below the waterline (further from the shore in the reflection)
    float dy = max(uWaterY - w.y, 0.0);
    w.x += sin(w.y * 0.9 + uTime * 0.7) * dy * 0.012 + sin(w.y * 2.3 - uTime * 1.1) * dy * 0.006;
  }
  vW = (modelMatrix * vec4(p, 1.0)).xyz;   // undistorted for canopy lookup
  vN = normalize(mat3(modelMatrix) * normal);
  if (uReflect > 0.5) vN.y = -vN.y; // light the mirror as the original
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const frag = /* glsl */ `
uniform vec3 uFol[6]; uniform vec3 uCon[3];
uniform vec3 uKeyDir, uHillLit, uHillShade, uHillRim, uHaze; uniform float uHazeAmt, uMist, uNight, uReflect, uWaterY, uTime;
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying vec2 vHill; varying float vCrest;
vec2 hash2(vec2 p){ p = vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3))); return fract(sin(p) * 43758.5453); }
float h1(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
// returns (dist to crown centre, crown id, local dx, local dy)
vec4 cells(vec2 p){
  vec2 i = floor(p), f = fract(p); float md = 9.0; vec2 mo = vec2(0); vec2 mid = vec2(0);
  for (int y=-1; y<=1; y++) for (int x=-1; x<=1; x++){
    vec2 g = vec2(float(x), float(y)); vec2 o = hash2(i + g) * 0.8 + 0.1;
    vec2 r = g + o - f; float d = dot(r, r);
    if (d < md){ md = d; mo = r; mid = i + g; }
  }
  return vec4(sqrt(md), h1(mid), -mo);
}
vec3 pick6(float t){
  float s = t * 5.999; int i = int(s);
  vec3 a = uFol[0];
  for (int k = 0; k < 6; k++) if (k == i) a = uFol[k];
  return a;
}
void main(){
  float hy = abs(vW.y - uWaterY);
  // canopy cells: crowns ~5-6 m; elongated vertically on conifer patches
  float conif = vHill.y;
  vec2 cp = vec2(vW.x * 0.17 + vW.z * 0.05, hy * mix(0.2, 0.13, conif));
  vec4 c = cells(cp);
  vec3 fol = pick6(c.y);
  vec3 con = c.y < 0.33 ? uCon[0] : c.y < 0.66 ? uCon[1] : uCon[2];
  // scattered evergreens inside deciduous patches + solid conifer stands
  float isCon = max(conif, step(0.82, fract(c.y * 7.13)));
  vec3 base = mix(fol, con, isCon);
  // night: desaturate
  float lum = dot(base, vec3(0.299, 0.587, 0.114));
  base = mix(base, vec3(lum), uNight * 0.7);

  // fake crown dome normal → lit from the sun side (sun x sign), dark gaps between crowns
  vec2 l2 = normalize(vec2(-uKeyDir.x, 0.8));
  vec2 cd = c.zw;
  float dome = 1.0 - smoothstep(0.15, 0.55, c.x);
  float crownLit = clamp(0.5 + dot(cd * 1.6, l2), 0.0, 1.0);
  float gap = smoothstep(0.32, 0.62, c.x);
  // macro: sun-side slopes + up-facing get light; backlit front faces stay in cool shade
  vec3 L = normalize(uKeyDir);
  float macro = clamp(dot(normalize(vN), normalize(vec3(L.x, 0.6, -0.15))) * 0.7 + 0.35, 0.0, 1.0);
  float lit = clamp(macro * 0.65 + crownLit * dome * 0.45 - gap * 0.25, 0.0, 1.0);
  vec3 col = base * mix(uHillShade, uHillLit, lit);
  // AO toward the waterline (dense understory)
  col *= mix(0.55, 1.0, smoothstep(0.0, 9.0, hy));
  // backlit rim along the crest
  float crest = smoothstep(0.82, 1.0, vCrest) * (0.6 + 0.4 * dome);
  col += uHillRim * crest * 0.22 * (1.0 - gap);

  // aerial perspective
  float haze = clamp(vHill.x * uHazeAmt, 0.0, 1.0);
  col = mix(col, uHaze, haze);
  // low mist band hugging the far shore
  float mist = (1.0 - smoothstep(0.0, 10.0, hy)) * uMist;
  col = mix(col, uHaze, mist * 0.55);

  if (uReflect > 0.5) {
    // darker, softer, hazier mirror (still lake: ~80% reflectance at grazing)
    col = mix(col, uHaze * 0.85, 0.12 + haze * 0.2);
    col *= vec3(0.78, 0.8, 0.86);
    // darker band right at the shoreline (shadowed undergrowth + its reflection)
    col *= mix(0.7, 1.0, smoothstep(0.0, 4.0, hy));
  } else {
    col *= mix(0.75, 1.0, smoothstep(0.0, 3.0, hy));
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function makeMat(reflect: boolean) {
  return new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, side: THREE.DoubleSide, fog: false,
    uniforms: {
      uReflect: { value: reflect ? 1 : 0 },
      uWaterY: { value: WORLD.waterY },
      uFol: { value: Array.from({ length: 6 }, () => new THREE.Color()) },
      uCon: { value: Array.from({ length: 3 }, () => new THREE.Color()) },
      uTime: envUniforms.uTime, uKeyDir: envUniforms.uKeyDir, uHillLit: envUniforms.uHillLit,
      uHillShade: envUniforms.uHillShade, uHillRim: envUniforms.uHillRim, uHaze: envUniforms.uHaze,
      uHazeAmt: envUniforms.uHazeAmt, uMist: envUniforms.uMist, uNight: envUniforms.uNight,
    },
  });
}

export function Hills() {
  const season = useScene((s) => s.season);
  const { geos, mat, rmat } = useMemo(() => {
    const geos = [
      hillGeometry({ z: WORLD.hillsZ + 150, width: 1500, height: 72, depth: 40, seed: 3, haze: 0.62, crown: 11 }),
      hillGeometry({ z: WORLD.hillsZ + 50, width: 1100, height: 44, depth: 30, seed: 7, haze: 0.3, crown: 8 }),
      hillGeometry({ z: WORLD.hillsZ - 40, width: 760, height: 24, depth: 24, seed: 11, haze: 0.06, crown: 6 }),
    ];
    return { geos, mat: makeMat(false), rmat: makeMat(true) };
  }, []);
  useEffect(() => {
    const pal = SEASONS[season];
    for (const m of [mat, rmat]) {
      const f = m.uniforms.uFol.value as THREE.Color[];
      const c = m.uniforms.uCon.value as THREE.Color[];
      f.forEach((col, i) => col.set(pal.foliage[i % pal.foliage.length]));
      c.forEach((col, i) => col.set(pal.conifer[i % pal.conifer.length]));
    }
  }, [season, mat, rmat]);
  useEffect(() => () => { geos.forEach((g) => g.dispose()); mat.dispose(); rmat.dispose(); }, [geos, mat, rmat]);
  return (
    <group name="hills">
      {geos.map((g, i) => <mesh key={i} geometry={g} material={mat} renderOrder={-5 + i} />)}
      {/* Mirror about y = waterY: y' = 2w - y */}
      <group position-y={WORLD.waterY * 2} scale-y={-1} name="hills-reflection">
        {geos.map((g, i) => <mesh key={i} geometry={g} material={rmat} renderOrder={-5 + i} />)}
      </group>
    </group>
  );
}
