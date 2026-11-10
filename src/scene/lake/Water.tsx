// OWNER: Opus O1. Glassy lake: a translucent tinted plane over the mirrored hills + mirrored sky.
// Fresnel: looking down → more body colour; grazing → transparent (the mirror shows through).
// Adds a soft sky-gradient sheen, faint ripple streaks, a sun glitter path, a dark shoreline band,
// and at night a warm smear of the van's interior glow on the near water.
//
// O4: on 'mid'/'high' the lake is a real planar mirror (three Reflector, reduced-res RT) with scrolling
// normal distortion, fresnel (deep tint looking down → mirror at grazing), a darker far-shore band, the
// sun/moon glitter path, the van's night glow and a soft ripple disturbance around the raft. 'low' keeps
// the translucent plane over Hills' mirrored geometry.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { WORLD, VAN, ANCHORS } from '../layout';
import { envUniforms } from '../env/live';
import { useScene, type Quality } from '../../state/store';

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

// ---------------------------------------------------------------- Reflector (mid / high)
const rVert = /* glsl */ `
uniform mat4 textureMatrix;
varying vec4 vUvProj; varying vec3 vWorld;
#include <fog_pars_vertex>
void main(){
  vUvProj = textureMatrix * vec4(position, 1.0);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const rFrag = /* glsl */ `
uniform sampler2D tDiffuse; uniform vec3 color;
uniform float uTime, uNight, uGlitter, uInterior, uMoon;
uniform vec3 uSunDir, uWaterDeep, uWaterShine, uSkyLow, uSkyMid, uSunColor, uPractical, uHaze, uRaft;
uniform float uShoreZ, uFarZ;
varying vec4 vUvProj; varying vec3 vWorld;
#include <fog_pars_fragment>
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
// height field of gentle wind ripples (stretched across x: long low swells seen from the shore)
float wave(vec2 p){
  vec2 a = p * vec2(0.35, 1.6) + vec2(uTime * 0.05, uTime * 0.22);
  vec2 b = p * vec2(0.9, 3.4) + vec2(-uTime * 0.08, uTime * 0.31) + 17.0;
  return n2(a) * 0.65 + n2(b) * 0.35;
}
void main(){
  vec3 V = normalize(cameraPosition - vWorld);
  float dist = length(vWorld.xz - cameraPosition.xz);
  float near = 1.0 - smoothstep(10.0, 140.0, dist);

  // ripple normal from the height field (finite differences)
  vec2 p = vWorld.xz;
  float e = 0.08;
  float w0 = wave(p);
  vec2 g = vec2(wave(p + vec2(e, 0.0)) - w0, wave(p + vec2(0.0, e)) - w0) / e;

  // raft disturbance: expanding soft rings + a calm-breaking chop right at the hull
  vec2 rd = vWorld.xz - uRaft.xz;
  float rr = length(rd * vec2(1.0, 1.25));
  float ring = sin(rr * 5.5 - uTime * 2.4) * exp(-max(rr - 1.4, 0.0) * 0.45) * smoothstep(1.0, 1.6, rr);
  vec2 rg = (rr > 0.001 ? rd / rr : vec2(0.0)) * ring * 0.9;
  float rmask = exp(-rr * 0.18);

  // screen-space distortion shrinks with distance (perspective) → glassy far water, gentle wobble up close
  float persp = 6.0 / (6.0 + dist);
  vec2 distort = g * vec2(0.010, 0.006) * persp + rg * 0.012 * rmask * persp;
  vec2 uv = vUvProj.xy / vUvProj.w + distort;
  vec3 refl = texture2D(tDiffuse, uv).rgb;
  // a short stretched second tap: soft vertical smear typical of a lake mirror
  refl = mix(refl, texture2D(tDiffuse, uv + vec2(0.0, 0.0025)).rgb, 0.3);
  // still-lake mirror: slightly darker + cooler than the source, saturation kept (fall colours stay vivid)
  float rl = dot(refl, vec3(0.299, 0.587, 0.114));
  refl = mix(vec3(rl), refl, 1.12) * color;

  // fresnel: deep body looking down, mirror at grazing (still lake)
  float cosT = clamp(V.y, 0.0, 1.0);
  float fres = 0.18 + 0.78 * pow(1.0 - cosT, 3.0);
  vec3 body = mix(uWaterDeep, mix(uSkyLow, uSkyMid, 0.5), 0.2);
  vec3 col = mix(body, refl, fres);
  // ripple streaks catch a little sky light (not on the glassy far water)
  float streak = smoothstep(0.62, 0.9, w0) * near;
  col += uWaterShine * streak * 0.05;
  // soft horizontal ripple breaks: wind lines where the mirror is roughened and shows sky sheen
  float wl = n2(vec2(vWorld.x * 0.012 + uTime * 0.01, vWorld.z * 0.22)) * 0.7 + n2(vec2(vWorld.x * 0.03, vWorld.z * 0.6 + 7.0)) * 0.3;
  float brk = smoothstep(0.66, 0.82, wl);
  vec3 sheen = mix(uSkyLow, uSkyMid, 0.35) * (1.0 - uNight * 0.6);
  col = mix(col, mix(col, sheen, 0.55), brk * 0.6);
  col += uWaterShine * max(ring, 0.0) * rmask * 0.06 * (1.0 - uNight * 0.6);

  // sun / moon glitter path toward the low light source
  vec3 N = normalize(vec3(-g.x * 0.08, 1.0, -g.y * 0.08));
  vec3 R = reflect(-V, N);
  float sd = max(dot(R, normalize(uSunDir)), 0.0);
  // narrow column toward the sun azimuth; sparkles get sparser with distance
  float az = pow(max(dot(normalize(-V.xz + 1e-4), normalize(uSunDir.xz + 1e-4)), 0.0), 900.0);
  float path = pow(sd, 90.0) * (0.35 + 0.65 * az);
  // fine sparkles: product of two finely scaled noises drifting in different directions → tiny twinkling points
  vec2 sq = vWorld.xz * vec2(4.0, 14.0);
  float sp = n2(sq + vec2(uTime * 1.7, uTime * 0.6)) * n2(sq * 1.37 + vec2(-uTime * 1.3, uTime * 0.9) + 5.0);
  sp = smoothstep(0.42, 0.62, sp);
  vec3 glintCol = mix(uSunColor, vec3(0.85, 0.9, 1.0), uMoon);
  col += glintCol * path * sp * uGlitter * 2.2 + glintCol * pow(sd, 24.0) * az * 0.12 * uGlitter;

  // van glow on the near water at night
  float vg = exp(-pow(vWorld.x * 0.35, 2.0)) * exp(-max(vWorld.z - uShoreZ, 0.0) * 0.06);
  float vgs = 0.6 + 0.4 * n2(vWorld.xz * vec2(0.6, 4.0) + uTime * 0.4);
  col += uPractical * vg * vgs * uNight * uInterior * 0.14;

  // darker band where the far shore meets the water + a whisper of mist
  float farBand = smoothstep(uFarZ - 30.0, uFarZ - 4.0, vWorld.z);
  col *= 1.0 - farBand * 0.22;

  // near shore: shallow, sandy, soft edge (sand shows through)
  float shore = 1.0 - smoothstep(0.0, 2.2, vWorld.z - uShoreZ);
  col = mix(col, vec3(0.62, 0.55, 0.45) * (1.0 - uNight * 0.85), shore * 0.35);
  float alpha = mix(1.0, 0.55, shore);
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  // half-strength fog: the mirrored hills are unfogged (like their source), so full fog would lay a pale band
  #ifdef USE_FOG
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth) * 0.35;
    gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
  #endif
}`;

const RES: Record<Exclude<Quality, 'low'>, { w: number; h: number; ms: number }> = {
  high: { w: 1024, h: 640, ms: 4 },
  mid: { w: 640, h: 400, ms: 0 },
};

const WATER_POS = [0, WORLD.waterY, WORLD.shoreZ - 2 + 400] as const;

function ReflectiveWater({ quality }: { quality: Exclude<Quality, 'low'> }) {
  const scene = useThree((s) => s.scene);
  const raft = useRef<THREE.Object3D | null>(null);
  const tries = useRef(0);
  const frame = useRef(0);
  const mirror = useMemo(() => {
    const r = RES[quality];
    const geo = new THREE.PlaneGeometry(1600, 800, 1, 1);
    const m = new Reflector(geo, {
      textureWidth: r.w, textureHeight: r.h, multisample: r.ms, clipBias: 0.002, color: 0xc4ccda,
      shader: {
        name: 'LakeMirror', vertexShader: rVert, fragmentShader: rFrag,
        uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
          color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
        }]),
      },
    });
    const mat = m.material as THREE.ShaderMaterial;
    mat.fog = true;
    mat.transparent = true;
    mat.depthWrite = false;
    const u = envUniforms;
    Object.assign(mat.uniforms, {
      uTime: u.uTime, uNight: u.uNight, uSunDir: u.uSunDir, uSunColor: u.uSunColor, uGlitter: u.uGlitter,
      uWaterDeep: u.uWaterDeep, uWaterShine: u.uWaterShine, uSkyLow: u.uSkyLow, uSkyMid: u.uSkyMid,
      uPractical: u.uPractical, uInterior: u.uInterior, uMoon: u.uMoon, uHaze: u.uHaze,
      uRaft: { value: new THREE.Vector3(...ANCHORS.raft.pos) },
      uShoreZ: { value: WORLD.shoreZ }, uFarZ: { value: WORLD.hillsZ - 40 },
    });
    m.rotation.x = -Math.PI / 2;
    m.position.set(...WATER_POS);
    m.renderOrder = 1;
    m.name = 'water';
    // Skip the van + its props in the mirror pass: never visible in the reflection (they sit behind the
    // water's clip plane from every camera preset) but they are most of the draw calls.
    // Only meshes are toggled — hiding lights would change the light count and swap shader programs.
    const hide: THREE.Object3D[] = [];
    let collected = false;
    const inner = m.onBeforeRender;
    m.onBeforeRender = function (renderer, sc, cam, ...rest) {
      if (!collected) {
        collected = true;
        for (const n of ['van', 'hotspots']) sc.getObjectByName(n)?.traverse((o) => { if ((o as THREE.Mesh).isMesh) hide.push(o); });
      }
      const vis = hide.map((o) => o.visible);
      hide.forEach((o) => { o.visible = false; });
      inner.call(this, renderer, sc, cam, ...rest);
      hide.forEach((o, i) => { o.visible = vis[i]; });
    };
    return m;
  }, [quality]);
  useEffect(() => () => { mirror.geometry.dispose(); mirror.dispose(); }, [mirror]);

  useEffect(() => { if (import.meta.env.DEV) (window as unknown as { __three: THREE.Scene }).__three = scene; }, [scene]);
  useFrame(({ gl }) => {
    if (!raft.current && tries.current++ % 30 === 0) raft.current = scene.getObjectByName('raft') ?? null;
    if (raft.current) ((mirror.material as THREE.ShaderMaterial).uniforms.uRaft.value as THREE.Vector3).copy(raft.current.position);
    // dev perf probe: one full frame (mirror pass + main + post) a few seconds after each view change
    if (import.meta.env.DEV) {
      const f = ++frame.current;
      if (f === 300) { gl.info.autoReset = false; gl.info.reset(); }
      if (f === 301) {
        const i = gl.info.render;
        console.info(`[o4] ${useScene.getState().view} ${quality}: calls=${i.calls} triangles=${i.triangles}`);
        gl.info.autoReset = true;
      }
    }
  });
  const view = useScene((s) => s.view);
  useEffect(() => { frame.current = 0; }, [view]);
  return <primitive object={mirror} />;
}

export function Water() {
  const quality = useScene((s) => s.quality);
  return quality === 'low' ? <CheapWater /> : <ReflectiveWater quality={quality} />;
}

function CheapWater() {
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
    <mesh rotation-x={-Math.PI / 2} position={WATER_POS} material={mat} renderOrder={1} name="water">
      <planeGeometry args={[1600, 800, 1, 1]} />
    </mesh>
  );
}
