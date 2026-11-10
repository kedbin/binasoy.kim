// OWNER: Opus O1. Gradient sky dome: horizon → low → mid → zenith from LIGHTS[timeOfDay].sky,
// sun disk + layered glow, streaky stratus lit from below on the sun side, moon + stars at night.
// abs(dir.y) mirrors the lower hemisphere, so the translucent lake "reflects" the sky for free.
import { useMemo } from 'react';
import * as THREE from 'three';
import { envUniforms } from '../env/live';

const vert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w; // far plane
}`;

const frag = /* glsl */ `
uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uTime;
uniform vec3 uSkyHorizon, uSkyLow, uSkyMid, uSkyZenith, uCloud, uCloudLit, uGlow;
uniform float uStars, uMoon, uNight;
varying vec3 vDir;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*n2(p); p*=2.03; a*=.5; } return v; }
void main() {
  vec3 d = normalize(vDir);
  float below = step(d.y, 0.0);
  vec3 m = vec3(d.x, abs(d.y), d.z);
  float y = m.y;
  vec3 s = normalize(uSunDir);
  float sd = max(dot(m, s), 0.0);
  // horizontal proximity to the sun (azimuth) — the glow spreads sideways along the horizon
  float az = max(dot(normalize(m.xz + 1e-4), normalize(s.xz + 1e-4)), 0.0);

  vec3 col = mix(uSkyHorizon, uSkyLow, smoothstep(0.0, 0.1, y));
  col = mix(col, uSkyMid, smoothstep(0.08, 0.32, y));
  col = mix(col, uSkyZenith, smoothstep(0.28, 0.85, y));
  // warm horizon glow concentrated around the sun's azimuth
  float hg = pow(az, 3.0) * (1.0 - smoothstep(0.0, 0.25, y));
  col = mix(col, uGlow, hg * 0.55 * (1.0 - uNight * 0.6));
  col += uGlow * pow(sd, 8.0) * 0.35;
  col += uSunColor * pow(sd, 120.0) * 0.6;

  // streaky stratus, under-lit near the sun
  vec2 cuv = m.xz / (y + 0.06);
  float c = fbm(cuv * vec2(0.32, 2.4) + vec2(uTime * 0.003, 0.0));
  c = smoothstep(0.5, 0.78, c) * smoothstep(0.015, 0.09, y) * (1.0 - smoothstep(0.3, 0.6, y));
  vec3 cc = mix(uCloud, uCloudLit, pow(az, 2.0) * 0.8 + pow(sd, 4.0) * 0.4);
  // edge brightening (silver lining) toward the sun
  cc += uCloudLit * pow(sd, 20.0) * 0.5;
  col = mix(col, cc, c * 0.8);

  // sun disk (hidden below horizon clipped by the hills anyway) — soft-edged, HDR so it blooms
  float disk = smoothstep(0.99955, 0.99985, sd) * (1.0 - below);
  col = mix(col, uSunColor * 3.0 + vec3(0.6), disk * (1.0 - uMoon));

  // moon: crisp pale disk + halo
  float moon = smoothstep(0.99935, 0.9996, sd);
  col += vec3(0.75, 0.82, 1.0) * pow(sd, 400.0) * 0.25 * uMoon;
  col = mix(col, vec3(1.6, 1.65, 1.8), moon * uMoon * (1.0 - below * 0.5));

  // stars — larger cells sparse + twinkle, fade toward the horizon and in clouds
  vec2 sg = floor(m.xz / (y + 0.35) * 260.0);
  float star = step(0.9972, h(sg)) * smoothstep(0.06, 0.35, y) * (1.0 - c);
  star *= 0.55 + 0.45 * sin(uTime * 1.7 + h(sg + 3.1) * 40.0);
  vec2 sg2 = floor(m.xz / (y + 0.35) * 90.0);
  float big = step(0.9985, h(sg2 + 7.7)) * smoothstep(0.1, 0.4, y) * (1.0 - c);
  col += vec3(0.9, 0.95, 1.0) * (star * 0.9 + big * 1.6) * uStars;

  // reflection: slightly darker / bluer (Fresnel ~ 0.8 at grazing on a still lake)
  col = mix(col, col * vec3(0.8, 0.85, 0.92), below);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function Sky() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uSunDir: envUniforms.uSunDir, uSunColor: envUniforms.uSunColor, uTime: envUniforms.uTime,
      uSkyHorizon: envUniforms.uSkyHorizon, uSkyLow: envUniforms.uSkyLow, uSkyMid: envUniforms.uSkyMid,
      uSkyZenith: envUniforms.uSkyZenith, uCloud: envUniforms.uCloud, uCloudLit: envUniforms.uCloudLit,
      uGlow: envUniforms.uGlow, uStars: envUniforms.uStars, uMoon: envUniforms.uMoon, uNight: envUniforms.uNight,
    },
  }), []);
  return (
    <mesh material={mat} renderOrder={-10} frustumCulled={false} name="sky">
      <sphereGeometry args={[800, 48, 24]} />
    </mesh>
  );
}
