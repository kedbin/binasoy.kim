// OWNER: Opus O1. Soft volumetric sun shafts pouring through the open hatch onto the duvet.
// A sheared prism: the hatch opening rectangle swept along the sun's travel direction (exactly what a
// parallel light through a window looks like), shaded additively with soft edges, streaks and drifting dust.
// Strength/colour come from LIGHTS[timeOfDay].shaft / shaftColor (damped via `live`).
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { VAN } from '../layout';
import { useScene } from '../../state/store';
import { live, envUniforms } from './live';

const W = VAN.innerWidth - 0.12;
const H = VAN.roofY - VAN.bedTopY - 0.15;
const LEN = 3.2;
const SEG = 1;

const vert = /* glsl */ `
attribute vec3 aLocal;
varying vec3 vL;
varying vec3 vWorld;
void main(){
  vL = aLocal;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const frag = /* glsl */ `
uniform float uStrength; uniform vec3 uColor; uniform float uTime;
varying vec3 vL;
varying vec3 vWorld;
float h(float x){ return fract(sin(x * 127.1) * 43758.5453); }
float n1(float x){ float i = floor(x), f = fract(x); f = f*f*(3.-2.*f); return mix(h(i), h(i+1.), f); }
void main(){
  // cross-section softness
  float ex = smoothstep(0.0, 0.22, vL.x) * smoothstep(1.0, 0.78, vL.x);
  float ey = smoothstep(0.0, 0.3, vL.y) * smoothstep(1.0, 0.7, vL.y);
  // fade in just inside the hatch, die out as it hits the bed / deeper cabin
  float ez = smoothstep(0.0, 0.12, vL.z) * (1.0 - smoothstep(0.35, 1.0, vL.z));
  // shafts: slanted streaks across the opening, slowly breathing
  float s = n1(vL.x * 9.0 + vL.y * 2.5 + 3.0) * 0.6 + n1(vL.x * 23.0 - vL.y * 4.0 + uTime * 0.05) * 0.4;
  s = 0.35 + 0.65 * smoothstep(0.25, 0.85, s);
  // drifting dust motes
  vec3 p = vWorld * 38.0 + vec3(0.0, uTime * 0.6, uTime * 0.25);
  float d = step(0.985, h(floor(p.x) + floor(p.y) * 57.0 + floor(p.z) * 113.0));
  float a = ex * ey * ez * s * uStrength;
  gl_FragColor = vec4(uColor * (a * 0.11 + d * a * 0.6), 1.0);
}`;

export function SunShafts() {
  const quality = useScene((s) => s.quality);
  const mesh = useRef<THREE.Mesh>(null);
  const { geo, mat } = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1, 4, 4, SEG);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const loc = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) loc.set([pos.getX(i) + 0.5, pos.getY(i) + 0.5, pos.getZ(i) + 0.5], i * 3);
    g.setAttribute('aLocal', new THREE.BufferAttribute(loc, 3));
    const m = new THREE.ShaderMaterial({
      vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
      uniforms: { uStrength: { value: 1 }, uColor: { value: new THREE.Color() }, uTime: envUniforms.uTime },
    });
    return { geo: g, mat: m };
  }, []);

  // Re-shear the prism every frame from the (damped) key direction.
  const tmp = useMemo(() => ({ d: new THREE.Vector3(), base: null as Float32Array | null }), []);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const k = live.n.shaft;
    m.visible = k > 0.02;
    if (!m.visible) return;
    mat.uniforms.uStrength.value = k;
    (mat.uniforms.uColor.value as THREE.Color).copy(live.c.shaftColor);
    // light travels along -sunDir
    tmp.d.copy(live.v.sunDir).multiplyScalar(-LEN);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const loc = geo.attributes.aLocal as THREE.BufferAttribute;
    const ox = 0, oy = VAN.bedTopY + 0.08 + H / 2, oz = VAN.backZ + 0.15;
    for (let i = 0; i < pos.count; i++) {
      const lx = loc.getX(i) - 0.5, ly = loc.getY(i) - 0.5, lz = loc.getZ(i);
      pos.setXYZ(i, ox + lx * W + tmp.d.x * lz, oy + ly * H + tmp.d.y * lz, oz + tmp.d.z * lz);
    }
    pos.needsUpdate = true;
  });

  if (quality === 'low') return null;
  return <mesh ref={mesh} name="shaft" geometry={geo} material={mat} renderOrder={5} frustumCulled={false} />;
}
