// OWNER: Opus O1. Glassy lake: a translucent tinted plane over the mirrored hills + mirrored sky.
// Fresnel: looking down → more body colour; grazing → transparent (the mirror shows through).
// Adds a soft sky-gradient sheen, faint ripple streaks, a sun glitter path, a dark shoreline band,
// and at night a warm smear of the van's interior glow on the near water.
import { useMemo } from 'react';
import * as THREE from 'three';
import { WORLD, VAN } from '../layout';
import { envUniforms } from '../env/live';

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
uniform float uTime, uNight, uGlitter, uInterior;
uniform vec3 uSunDir, uWaterDeep, uWaterShine, uSkyLow, uSkyMid, uSunColor, uPractical;
uniform float uShoreZ, uFarZ, uVanZ;
varying vec3 vWorld;
#include <fog_pars_fragment>
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
void main(){
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 4.0);
  float dist = length(vWorld.xz - cameraPosition.xz);
  // soft ripple streaks: very stretched noise, fade with distance (glassy far water)
  vec2 p = vWorld.xz * vec2(0.12, 1.4) + vec2(uTime * 0.04, uTime * 0.1);
  float r = n2(p) * 0.6 + n2(p * 2.7 + 13.0) * 0.4;
  float streak = smoothstep(0.66, 0.92, r) * (1.0 - smoothstep(15.0, 120.0, dist));

  // body: deep tint looking down, sky sheen toward grazing
  vec3 sheen = mix(uSkyLow, uSkyMid, smoothstep(0.0, 0.5, V.y));
  vec3 col = mix(uWaterDeep, sheen, 0.25);
  col += uWaterShine * streak * 0.18;
  float alpha = mix(0.7, 0.12, fres);
  alpha = clamp(alpha + streak * 0.08, 0.0, 1.0);

  // sun glitter path: sparse sparkles along the reflected sun
  vec3 R = reflect(-V, vec3(0.0, 1.0, 0.0));
  float sd = max(dot(R, normalize(uSunDir)), 0.0);
  float path = pow(sd, 60.0);
  float sp = step(0.86, n2(vWorld.xz * vec2(1.2, 6.0) + vec2(uTime * 0.9, uTime * 0.3)));
  float glit = path * sp * uGlitter;
  col += uSunColor * glit * 2.2 + uSunColor * pow(sd, 18.0) * 0.12 * uGlitter;
  alpha = clamp(alpha + glit * 0.9, 0.0, 1.0);

  // warm practical glow from the van reflecting on the near water at night
  float vg = exp(-pow(vWorld.x * 0.35, 2.0)) * exp(-max(vWorld.z - uShoreZ, 0.0) * 0.06);
  float vgs = 0.6 + 0.4 * n2(vWorld.xz * vec2(0.6, 4.0) + uTime * 0.4);
  col += uPractical * vg * vgs * uNight * uInterior * 0.14;

  // dark band where the far shore meets the water (undergrowth + its reflection)
  float farBand = smoothstep(uFarZ - 38.0, uFarZ - 6.0, vWorld.z);
  col *= 1.0 - farBand * 0.35;
  alpha = mix(alpha, 0.85, farBand * 0.35);

  // near shore: shallow, sandy, soft edge
  float shore = 1.0 - smoothstep(0.0, 2.2, vWorld.z - uShoreZ);
  col = mix(col, vec3(0.62, 0.55, 0.45) * (1.0 - uNight * 0.85), shore * 0.4);
  alpha *= mix(1.0, 0.75, shore);
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export function Water() {
  const mat = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]) as Record<string, THREE.IUniform>,
    });
    // Shared uniform objects must be attached after merge (merge clones values).
    const u = envUniforms;
    Object.assign(m.uniforms, {
      uTime: u.uTime, uNight: u.uNight, uSunDir: u.uSunDir, uSunColor: u.uSunColor, uGlitter: u.uGlitter,
      uWaterDeep: u.uWaterDeep, uWaterShine: u.uWaterShine, uSkyLow: u.uSkyLow, uSkyMid: u.uSkyMid,
      uPractical: u.uPractical, uInterior: u.uInterior,
      uShoreZ: { value: WORLD.shoreZ }, uFarZ: { value: WORLD.hillsZ - 40 }, uVanZ: { value: VAN.backZ },
    });
    return m;
  }, []);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, WORLD.waterY, WORLD.shoreZ - 2 + 400]} material={mat} renderOrder={1} name="water">
      <planeGeometry args={[1600, 800, 1, 1]} />
    </mesh>
  );
}
