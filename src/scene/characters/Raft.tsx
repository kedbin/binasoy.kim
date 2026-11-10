// OWNER: O3. Inflatable dinghy with Kim & Wingwing drifting on the lake: continuous swept tube (grey + white stripe),
// grab-line rope loops, valve caps, oarlocks + oars, slatted floor; bobs with a soft swell and trails a V-wake +
// expanding ripples (one cheap shader plane). Night adds a warm lantern.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ANCHORS } from '../layout';
import { useScene } from '../../state/store';
import { natureMaterial } from '../nature/materials';
import { People } from './People';
import { raftGeometry, ropeGeometry, fittingsGeometry } from './raftGeo';
import { timeUniform, nightUniform } from '../lake/timeOfDay';

/** Drift loop: period (s) and half-extents (m). */
const DRIFT = { period: 110, rx: 6, rz: 3.5 };

const wakeVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// Plane in raft-local XZ (uv.x → x, uv.y → z; raft at uv (0.5, 0.75), bow toward +z/uv.y=1).
const wakeFrag = /* glsl */ `
uniform float uTime; uniform float uSpeed; uniform float uNight;
varying vec2 vUv;
void main(){
  vec2 p = (vUv - vec2(0.5, 0.75)) * vec2(8.0, 16.0); // metres
  float r = length(p * vec2(1.0, 0.62));
  // expanding rings from the hull (bobbing ripples)
  float ring = 0.0;
  for (int i = 0; i < 3; i++) {
    float ph = fract(uTime * 0.16 + float(i) / 3.0);
    float rr = 1.35 + ph * 3.2;
    ring += smoothstep(0.09, 0.0, abs(r - rr)) * (1.0 - ph) * smoothstep(0.0, 0.15, ph);
  }
  // V-wake behind the stern (−z): two diverging lines with a faint sinus texture
  float behind = -p.y - 1.1;
  float v = 0.0;
  if (behind > 0.0) {
    float spread = behind * 0.36 + 0.55;
    float d = abs(abs(p.x) - spread);
    float wav = 0.6 + 0.4 * sin(behind * 5.0 - uTime * 3.0);
    v = smoothstep(0.16, 0.0, d) * wav * exp(-behind * 0.22) * uSpeed;
    v += smoothstep(0.5, 0.0, abs(p.x)) * exp(-behind * 0.6) * 0.35 * uSpeed; // turbulent centre
  }
  float a = clamp(ring * 0.32 + v * 0.42, 0.0, 1.0);
  vec3 col = mix(vec3(1.0, 0.93, 0.85), vec3(0.62, 0.7, 0.86), uNight);
  gl_FragColor = vec4(col, a * mix(1.0, 0.45, uNight));
}`;

export function RaftScene() {
  const drift = useRef<THREE.Group>(null);
  const bob = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const quality = useScene((s) => s.quality);
  const night = useScene((s) => s.timeOfDay) === 'night';
  const [ax, ay, az] = ANCHORS.raft.pos;
  const yaw = useMemo(() => ({ value: 0 }), []);

  const geo = useMemo(() => ({ hull: raftGeometry(), rope: ropeGeometry(), fit: fittingsGeometry() }), []);
  const mats = useMemo(() => ({
    hull: natureMaterial({ roughness: 0.5, fill: 0.34 }), // PVC sheen; fill keeps the backlit hull readable
    rope: natureMaterial({ color: '#D9CBA8', roughness: 1 }),
    fit: natureMaterial({ roughness: 0.5, fill: 0.15 }),
    wake: new THREE.ShaderMaterial({
      vertexShader: wakeVert, fragmentShader: wakeFrag, transparent: true, depthWrite: false,
      uniforms: { uTime: timeUniform, uSpeed: { value: 1 }, uNight: nightUniform },
    }),
  }), []);
  useEffect(() => () => { Object.values(mats).forEach((m) => m.dispose()); }, [mats]);

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __raft: THREE.Group | null }).__raft = drift.current;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const a = (t / DRIFT.period) * Math.PI * 2;
    const x = Math.sin(a) * DRIFT.rx, z = Math.sin(a * 2) * DRIFT.rz;
    const dx = Math.cos(a) * DRIFT.rx, dz = Math.cos(a * 2) * DRIFT.rz * 2;
    if (drift.current) {
      drift.current.position.set(ax + x, ay, az + z);
      // heading follows the path softly; mostly beam-on to the shore so both figures read
      yaw.value = Math.atan2(dx, dz) * 0.3 + 0.6 + Math.sin(t * 0.2) * 0.1;
      drift.current.rotation.y = yaw.value;
    }
    if (bob.current) {
      bob.current.position.y = -0.05 + Math.sin(t * 1.1) * 0.025 + Math.sin(t * 0.63 + 1) * 0.015;
      bob.current.rotation.x = Math.sin(t * 0.9) * 0.022;
      bob.current.rotation.z = Math.sin(t * 0.7 + 1) * 0.028;
    }
    if (light.current) light.current.intensity = 1.8 + Math.sin(t * 7) * 0.08 + Math.sin(t * 3.1) * 0.12;
  });

  return (
    <group ref={drift} position={[ax, ay, az]} name="raft">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, -2.0]} material={mats.wake} renderOrder={2}>
        <planeGeometry args={[8, 16]} />
      </mesh>
      <group ref={bob} scale={1.2}>
        <mesh geometry={geo.hull} material={mats.hull} castShadow receiveShadow />
        <mesh geometry={geo.rope} material={mats.rope} castShadow={quality === 'high'} />
        <mesh geometry={geo.fit.geo} material={mats.fit} />
        <People yaw={yaw} />
        {night && (
          <group position={[0.05, 0.3, 0.75]}>
            <mesh position={[0, 0.09, 0]}><cylinderGeometry args={[0.055, 0.065, 0.16, 12]} /><meshBasicMaterial color="#ffd58a" toneMapped={false} /></mesh>
            <mesh position={[0, 0.19, 0]}><cylinderGeometry args={[0.04, 0.07, 0.04, 12]} /><meshStandardMaterial color="#2a2a2e" roughness={0.6} /></mesh>
            <mesh position={[0, 0.0, 0]}><cylinderGeometry args={[0.07, 0.07, 0.02, 12]} /><meshStandardMaterial color="#2a2a2e" roughness={0.6} /></mesh>
            <pointLight ref={light} position={[0, 0.1, 0]} color="#ffb85a" intensity={1.8} distance={quality === 'low' ? 6 : 12} decay={2} />
          </group>
        )}
      </group>
    </group>
  );
}
