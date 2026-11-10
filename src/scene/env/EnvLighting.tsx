// OWNER: Opus O1. Image-based light + global shadow flags + contact shadows.
// - A generated Lightformer environment (no HDR download): warm sun-side band, lavender dome, dark ground.
// - Shadow flags: van/props from other workers don't set castShadow/receiveShadow, so we flag opaque lit
//   meshes globally (cheap traversal at a few frames after load). Opt out with `userData.noShadow = true`.
// - ContactShadows baked once under the van + kayak (works on every tier, incl. low with no realtime shadows).
import { useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';
import { useScene } from '../../state/store';
import { LIGHTS } from './presets';
import { live, useEnvDriver } from './live';
import { ANCHORS } from '../layout';

/** Drives the damped env + scene-wide env intensity, fog and exposure. Mount once. */
export function EnvDriver() {
  useEnvDriver();
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  useFrame(() => {
    (scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity = live.n.envIntensity;
    gl.toneMappingExposure = live.n.exposure;
    const f = scene.fog as THREE.Fog | null;
    if (f && (f as THREE.Fog).isFog) {
      f.color.copy(live.c.fog);
      f.near = live.n.fogNear;
      f.far = live.n.fogFar;
    }
  });
  return null;
}

export function EnvMap() {
  const tod = useScene((s) => s.timeOfDay);
  const p = LIGHTS[tod];
  const [sx, sy, sz] = p.skySun;
  const az = Math.atan2(sx, sz);
  return (
    <Environment key={tod} resolution={64} frames={1} background={false}>
      {/* dome */}
      <Lightformer form="rect" intensity={1.0} color={p.envTop} scale={[40, 40, 1]} position={[0, 12, 0]} rotation-x={Math.PI / 2} />
      {/* ground bounce */}
      <Lightformer form="rect" intensity={0.35} color={p.hemiGround} scale={[40, 40, 1]} position={[0, -6, 0]} rotation-x={-Math.PI / 2} />
      {/* warm horizon band toward the sun */}
      <Lightformer form="rect" intensity={2.2} color={p.envHorizon} scale={[18, 2.2, 1]}
        position={[Math.sin(az) * 9, 1 + sy * 6, Math.cos(az) * 9]} target={[0, 0, 0]} />
      {/* sun hot-spot */}
      <Lightformer form="circle" intensity={6 * (1 - (tod === 'night' ? 0.85 : 0))} color={p.sunColor} scale={1.5}
        position={[Math.sin(az) * 9, 1.2 + sy * 8, Math.cos(az) * 9]} target={[0, 0, 0]} />
      {/* cool counter sky behind the van */}
      <Lightformer form="rect" intensity={0.8} color={p.rimColor} scale={[20, 6, 1]} position={[-2, 4, -10]} target={[0, 0, 0]} />
    </Environment>
  );
}

const SKIP = /hills|sky|water|leaves|birds|fireflies|shaft|hotspot/i;

function flag(root: THREE.Object3D, quality: string) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || o.userData.noShadow) return;
    // skip whole subtrees by name
    let p: THREE.Object3D | null = o;
    while (p) { if (SKIP.test(p.name)) return; p = p.parent; }
    const mats = (Array.isArray(m.material) ? m.material : [m.material]) as THREE.Material[];
    const lit = mats.every((mt) => mt && !(mt as THREE.MeshBasicMaterial).isMeshBasicMaterial && !(mt as THREE.ShaderMaterial).isShaderMaterial);
    const opaque = mats.every((mt) => mt && (!mt.transparent || mt.alphaTest > 0));
    if (!lit) return;
    m.receiveShadow = true;
    if (opaque && quality !== 'low') {
      // tiny instanced fluff (leaf particles) shouldn't cast
      const inst = (m as unknown as THREE.InstancedMesh).isInstancedMesh ? (m as unknown as THREE.InstancedMesh).count : 0;
      if (inst < 400) m.castShadow = true;
    }
  });
}

export function ShadowFlags() {
  const scene = useThree((s) => s.scene);
  const quality = useScene((s) => s.quality);
  const frame = useRef(0);
  const lastQ = useRef(quality);
  useFrame(() => {
    if (lastQ.current !== quality) { lastQ.current = quality; frame.current = 0; }
    const f = ++frame.current;
    if (f === 2 || f === 45 || f === 200 || f === 600) flag(scene, quality);
  });
  return null;
}

export function GroundContact() {
  const quality = useScene((s) => s.quality);
  const [kx, , kz] = ANCHORS.kayak.pos;
  const res = quality === 'high' ? 512 : 256;
  return (
    <group name="contact-shadows">
      {/* under the van: wheels, bumper, body — baked once */}
      <ContactShadows frames={1} position={[0, 0.012, -1.0]} scale={[4.2, 7.2]} resolution={res}
        far={1.1} blur={2.4} opacity={0.75} color="#2a1c18" />
      <ContactShadows frames={1} position={[kx, -0.33, kz]} scale={[3, 4.4]} resolution={256}
        far={0.6} blur={2} opacity={0.6} color="#3a281c" />
    </group>
  );
}
