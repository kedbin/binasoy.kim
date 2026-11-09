// Golden-hour gradient sky dome with sun glow, streaky pastel clouds, and night stars.
// Uses abs(dir.y) so the lower hemisphere mirrors the upper — the transparent lake then "reflects" the sky for free.
import { useMemo } from 'react';
import * as THREE from 'three';
import { WORLD } from '../layout';
import { nightUniform, timeUniform } from './timeOfDay';

const vert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w; // push to far plane
}`;

const frag = /* glsl */ `
uniform vec3 uSunDir; uniform float uNight; uniform float uTime;
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
  // Golden hour: warm peach horizon → rose → lavender → soft blue zenith (matches collage #5/#6).
  vec3 horizon = vec3(1.00, 0.80, 0.62);
  vec3 rose    = vec3(0.96, 0.74, 0.70);
  vec3 lav     = vec3(0.74, 0.69, 0.82);
  vec3 zenith  = vec3(0.55, 0.66, 0.84);
  vec3 col = mix(horizon, rose, smoothstep(0.0, 0.08, y));
  col = mix(col, lav, smoothstep(0.06, 0.25, y));
  col = mix(col, zenith, smoothstep(0.22, 0.75, y));
  // Sun glow
  vec3 s = normalize(uSunDir);
  float sd = max(dot(m, s), 0.0);
  col += vec3(1.0, 0.55, 0.30) * pow(sd, 6.0) * 0.28;
  col += vec3(1.0, 0.78, 0.55) * pow(sd, 90.0) * 0.35;
  col = mix(col, vec3(1.0, 0.93, 0.80), smoothstep(0.99965, 0.99985, sd) * 0.9);
  col = min(col, vec3(0.98));
  // Streaky stratus clouds, lit pink/peach from below
  vec2 cuv = m.xz / (y + 0.08);
  float c = fbm(cuv * vec2(0.35, 2.2) + vec2(uTime * 0.004, 0.0));
  c = smoothstep(0.52, 0.78, c) * smoothstep(0.02, 0.1, y) * (1.0 - smoothstep(0.35, 0.6, y));
  vec3 cloudCol = mix(vec3(0.98, 0.70, 0.66), vec3(1.0, 0.86, 0.72), pow(sd, 3.0));
  col = mix(col, cloudCol, c * 0.75);

  // Night
  vec3 nTop = vec3(0.02, 0.03, 0.08), nHor = vec3(0.10, 0.12, 0.22);
  vec3 ncol = mix(nHor, nTop, smoothstep(0.0, 0.5, y));
  vec2 sg = floor(m.xz / (y + 0.35) * 220.0);
  float star = step(0.9975, h(sg)) * smoothstep(0.05, 0.3, y);
  star *= 0.6 + 0.4 * sin(uTime * 2.0 + h(sg + 3.1) * 40.0);
  ncol += vec3(star);
  ncol = mix(ncol, vec3(0.08, 0.09, 0.16), c * 0.6);
  col = mix(col, ncol, uNight);

  // Reflection is slightly darker/bluer than the sky
  col = mix(col, col * vec3(0.78, 0.84, 0.92), below);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function Sky() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSunDir: { value: new THREE.Vector3(...WORLD.sunDir) }, uNight: nightUniform, uTime: timeUniform },
  }), []);
  return (
    <mesh material={mat} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[800, 48, 24]} />
    </mesh>
  );
}
