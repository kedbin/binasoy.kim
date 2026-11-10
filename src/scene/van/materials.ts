// Shared van materials, quality-aware (clearcoat paint on high). Created once per quality tier.
import { useMemo } from 'react';
import * as THREE from 'three';
import { PALETTE } from '../layout';
import { useScene } from '../../state/store';
import { fabricTex, fabricBump } from './textures';

export type VanMats = ReturnType<typeof makeMats>;

function makeMats(high: boolean) {
  const fab = fabricTex(); fab.repeat.set(6, 6);
  const bump = fabricBump(); bump.repeat.set(6, 6);
  const paint = high
    ? new THREE.MeshPhysicalMaterial({ color: PALETTE.vanWhite, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.12, vertexColors: true })
    : new THREE.MeshStandardMaterial({ color: PALETTE.vanWhite, roughness: 0.42, vertexColors: true });
  addDirt(paint);
  return {
    paint,
    fabric: new THREE.MeshStandardMaterial({ color: '#4a4b50', roughness: 0.97, map: fab, bumpMap: bump, bumpScale: 0.6, vertexColors: true }),
    trim: new THREE.MeshStandardMaterial({ color: '#2b2c30', roughness: 0.62, vertexColors: true }),
    black: new THREE.MeshStandardMaterial({ color: '#121315', roughness: 0.55, vertexColors: true }),
    rubber: new THREE.MeshStandardMaterial({ color: '#17171a', roughness: 0.9, vertexColors: true }),
    chrome: new THREE.MeshStandardMaterial({ color: '#e2e5e8', roughness: 0.22, metalness: 0.55, vertexColors: true }),
    alloy: new THREE.MeshStandardMaterial({ color: '#c8ccd1', roughness: 0.32, metalness: 0.55, vertexColors: true }),
    smoke: new THREE.MeshPhysicalMaterial({ color: '#0b0f14', roughness: 0.06, metalness: 0.2, clearcoat: high ? 1 : 0, transparent: true, opacity: 0.86, side: THREE.DoubleSide }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#28333d', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }),
    tail: new THREE.MeshStandardMaterial({ color: '#6e0d10', roughness: 0.25, emissive: '#ff2020', emissiveIntensity: 0.35, vertexColors: true }),
    tailGlow: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3a2a').multiplyScalar(2.2), toneMapped: false }),
    amber: new THREE.MeshStandardMaterial({ color: '#c46a12', roughness: 0.3, emissive: '#ff8a1a', emissiveIntensity: 0.25 }),
    lamp: new THREE.MeshStandardMaterial({ color: '#eef0f2', roughness: 0.1, metalness: 0.5, emissive: '#fff1d0', emissiveIntensity: 0.25 }),
  };
}

/** Road-grime gradient near the bottom of the body (world-space, so it works on big flat extruded faces). */
function addDirt(m: THREE.Material) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDirtP;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvDirtP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDirtP;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float dirt = 1.0 - smoothstep(0.24, 0.72, vDirtP.y + 0.05 * sin(vDirtP.z * 11.0 + sin(vDirtP.x * 5.0) * 3.0));
        dirt *= 0.7 + 0.3 * sin(vDirtP.z * 37.0 + vDirtP.y * 23.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.52, 0.45, 0.36), clamp(dirt, 0.0, 1.0) * 0.42);`);
  };
  m.customProgramCacheKey = () => 'van-dirt';
}

export function useVanMats() {
  const high = useScene((s) => s.quality) === 'high';
  return useMemo(() => makeMats(high), [high]);
}
