// Shared materials for nature + props (O3). O1 (lighting/material owner) can tune roughness/env response here
// without touching geometry. All materials read vertex colours (painted AO/shade) and an `aTint` attribute
// that blends toward `uTint` (sun-kissed highlight). Foliage materials additionally sway in the wind.
import * as THREE from 'three';
import { timeUniform, nightUniform } from '../lake/timeOfDay';

export const windUniform = { value: 1 };

export interface NatureMatOpts {
  color?: THREE.ColorRepresentation;
  tint?: THREE.ColorRepresentation;
  roughness?: number;
  /** wind amplitude (m) at the top of the sway band; 0 = static. */
  wind?: number;
  /** local Y where sway starts / reaches full strength. */
  windY?: [number, number];
  /** sway frequency multiplier (grass flutters faster than canopies). */
  windFreq?: number;
  side?: THREE.Side;
  alphaTest?: number;
  map?: THREE.Texture | null;
  /** subtle back-light wrap so thin foliage glows when the sun is behind it. */
  translucency?: number;
  flatShading?: boolean;
  /** cheap stylised fill: adds albedo × fill as emission so backlit subjects (characters vs sunset) stay readable. */
  fill?: number;
}

export function natureMaterial(o: NatureMatOpts = {}) {
  const m = new THREE.MeshStandardMaterial({
    color: o.color ?? '#ffffff', roughness: o.roughness ?? 0.92, metalness: 0,
    vertexColors: true, side: o.side ?? THREE.FrontSide, flatShading: o.flatShading ?? false,
    alphaTest: o.alphaTest ?? 0, map: o.map ?? null,
  });
  const uTint = { value: new THREE.Color(o.tint ?? '#ffffff') };
  const uWind = { value: o.wind ?? 0 };
  const uWindY = { value: new THREE.Vector2(...(o.windY ?? [0, 1])) };
  const uFreq = { value: o.windFreq ?? 1 };
  const uTrans = { value: o.translucency ?? 0 };
  const uFill = { value: o.fill ?? 0 };
  m.userData.uniforms = { uTint, uWind, uWindY, uFreq, uTrans, uFill };
  m.customProgramCacheKey = () => `nature${o.wind ? 'w' : ''}${o.translucency ? 't' : ''}`;
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, { uTint, uWind, uWindY, uFreq, uTrans, uFill, uTime: timeUniform, uWindGlobal: windUniform, uNight: nightUniform });
    s.vertexShader = s.vertexShader
      .replace('#include <common>', `#include <common>
attribute float aTint; varying float vTint;
uniform float uTime; uniform float uWind; uniform vec2 uWindY; uniform float uFreq; uniform float uWindGlobal;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vTint = aTint;
if (uWind > 0.0) {
  vec3 org = vec3(0.0);
  #ifdef USE_INSTANCING
    org = instanceMatrix[3].xyz;
  #endif
  float ph = dot(org.xz, vec2(0.37, 0.21)) + dot(position.xz, vec2(0.9, 0.7));
  float k = smoothstep(uWindY.x, uWindY.y, position.y);
  k *= k;
  float t = uTime * uFreq;
  float gust = 0.65 + 0.35 * sin(t * 0.31 + org.x * 0.05);
  float sx = sin(t * 1.30 + ph) * 0.7 + sin(t * 2.70 + ph * 1.7) * 0.3;
  float sz = sin(t * 1.05 + ph * 1.3) * 0.5;
  transformed.x += sx * uWind * k * gust * uWindGlobal;
  transformed.z += sz * uWind * k * gust * uWindGlobal * 0.6;
  transformed.y -= abs(sx) * uWind * k * 0.15;
}`);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
varying float vTint; uniform vec3 uTint; uniform float uTrans; uniform float uFill; uniform float uNight;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb = mix(diffuseColor.rgb, uTint * (0.75 + 0.25 * vColor.rgb), clamp(vTint, 0.0, 1.0));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
// sun-driven glow (translucency) vanishes at night; the readability fill drops to a faint moonlit lift
totalEmissiveRadiance += diffuseColor.rgb * (uTrans * 0.18 * vTint * (1.0 - uNight) + uFill * (1.0 - 0.75 * uNight));`);
  };
  return m;
}

/** Set a material's highlight tint at runtime (season swap). */
export function setTint(m: THREE.Material, c: THREE.ColorRepresentation) {
  const u = (m.userData.uniforms as { uTint: { value: THREE.Color } } | undefined);
  if (u) u.uTint.value.set(c);
}

// ---- common surface presets (geometry modules call these; O1 may retune) ----
export const MAT = {
  bark: () => natureMaterial({ color: '#ffffff', roughness: 0.95 }),
  foliage: (tint: THREE.ColorRepresentation, wind = 0.12) =>
    natureMaterial({ color: '#ffffff', tint, roughness: 0.85, wind, windY: [1.2, 6], windFreq: 0.9, translucency: 1 }),
  conifer: (tint: THREE.ColorRepresentation) =>
    natureMaterial({ color: '#ffffff', tint, roughness: 0.9, wind: 0.06, windY: [1.0, 8], windFreq: 0.7 }),
  grass: (tint: THREE.ColorRepresentation) =>
    natureMaterial({ color: '#ffffff', tint, roughness: 0.9, wind: 0.09, windY: [0, 0.6], windFreq: 1.6, side: THREE.DoubleSide, translucency: 1 }),
  rock: () => natureMaterial({ color: '#ffffff', tint: '#7E8A5A', roughness: 0.88, flatShading: true }),
  wood: () => natureMaterial({ color: '#ffffff', tint: '#B9A58A', roughness: 0.95 }),
  ground: () => natureMaterial({ color: '#ffffff', roughness: 1 }),
};
