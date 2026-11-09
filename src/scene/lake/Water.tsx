// Glassy lake: a translucent tinted plane over mirrored hills + mirrored sky.
// Fresnel: looking down → more tint/depth; grazing → more transparent (reflection shows through).
// Adds gentle horizontal ripple streaks and a sun glitter path.
import { useMemo } from 'react';
import * as THREE from 'three';
import { WORLD } from '../layout';
import { nightUniform, timeUniform } from './timeOfDay';

const vert = /* glsl */ `
varying vec3 vWorld;
#include <fog_pars_vertex>
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const frag = /* glsl */ `
uniform float uTime; uniform float uNight; uniform vec3 uSunDir;
varying vec3 vWorld;
#include <fog_pars_fragment>
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
void main(){
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);
  float dist = length(vWorld.xz - cameraPosition.xz);
  // ripple streaks: stretched noise, stronger near the shore, fading with distance
  vec2 p = vWorld.xz * vec2(0.18, 1.6) + vec2(uTime * 0.05, uTime * 0.12);
  float r = n2(p) * 0.6 + n2(p * 2.7 + 13.0) * 0.4;
  float streak = smoothstep(0.62, 0.9, r) * (1.0 - smoothstep(20.0, 160.0, dist));
  vec3 deep = mix(vec3(0.36, 0.40, 0.52), vec3(0.03, 0.05, 0.09), uNight);
  vec3 shine = mix(vec3(1.0, 0.86, 0.72), vec3(0.6, 0.7, 0.9), uNight);
  // sun glitter path toward the sun
  vec3 R = reflect(-V, vec3(0.0, 1.0, 0.0));
  float glit = pow(max(dot(R, normalize(uSunDir)), 0.0), 400.0) * 0.5;
  glit *= step(0.75, n2(vWorld.xz * vec2(0.6, 3.0) + uTime * 0.6)) * (1.0 - uNight);
  float alpha = mix(0.62, 0.22, fres);
  vec3 col = deep + shine * streak * 0.25 + vec3(1.0, 0.8, 0.55) * glit * 1.5;
  alpha = clamp(alpha + streak * 0.15 + glit, 0.0, 1.0);
  // shoreline foam/softness
  float shore = 1.0 - smoothstep(0.0, 1.6, vWorld.z - float(${WORLD.shoreZ.toFixed(1)}));
  col = mix(col, vec3(0.85, 0.78, 0.68), shore * 0.35);
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export function Water() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]) as Record<string, THREE.IUniform>,
  }), []);
  // Shared uniform objects must be attached after merge (merge clones values).
  mat.uniforms.uTime = timeUniform;
  mat.uniforms.uNight = nightUniform;
  mat.uniforms.uSunDir = { value: new THREE.Vector3(...WORLD.sunDir) };
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, WORLD.waterY, WORLD.shoreZ - 2 + 400]} material={mat} renderOrder={1}>
      <planeGeometry args={[1600, 800, 1, 1]} />
    </mesh>
  );
}
