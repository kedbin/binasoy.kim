// OWNER: Opus O1. Image-based light + global shadow flags + contact shadows.
// - A generated Lightformer environment (no HDR download): warm sun-side band, lavender dome, dark ground.
// - Shadow flags: van/props from other workers don't set castShadow/receiveShadow, so we flag opaque lit
//   meshes globally (cheap traversal at a few frames after load). Opt out with `userData.noShadow = true`.
// - ContactShadows baked once (on the first drawn frames, so the van exists) under the van + kayak (works on every tier, incl. low with no realtime shadows).
import { useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useScene } from '../../state/store';
import { LIGHTS } from './presets';
import { live, useEnvDriver } from './live';
import { ANCHORS } from '../layout';
import { useLoad } from '../../app/loadState';

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

/**
 * Generated IBL: a tiny gradient dome (ground → horizon band toward the sun → dome) plus sun and cool
 * counter-sky patches, prefiltered with PMREM once per time-of-day. Hand-rolled instead of drei <Environment>
 * to avoid pulling the HDR/EXR/gainmap loaders into the bundle (~150 KB gzip).
 */
export function EnvMap() {
  const tod = useScene((s) => s.timeOfDay);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const p = LIGHTS[tod];
    const s = new THREE.Vector3(...p.skySun).normalize();
    const az = Math.atan2(s.x, s.z);
    const env = new THREE.Scene();
    const geo = new THREE.SphereGeometry(10, 32, 16);
    const col = new Float32Array(geo.attributes.position.count * 3);
    const top = new THREE.Color(p.envTop), hor = new THREE.Color(p.envHorizon), gnd = new THREE.Color(p.hemiGround);
    const rim = new THREE.Color(p.rimColor), c = new THREE.Color(), d = new THREE.Vector3();
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      d.fromBufferAttribute(pos, i).normalize();
      const toward = Math.max(0, Math.cos(Math.atan2(d.x, d.z) - az));
      if (d.y < 0) c.copy(gnd).multiplyScalar(0.5 + 0.5 * (1 + d.y));
      else {
        c.copy(hor).lerp(top, THREE.MathUtils.smoothstep(d.y, 0.0, 0.45));
        c.lerp(rim, (1 - toward) * 0.35 * (1 - d.y));
        c.multiplyScalar(1 + toward * toward * 1.4 * (1 - THREE.MathUtils.smoothstep(d.y, 0, 0.3)));
      }
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    env.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    // sun hot-spot
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(p.sunColor).multiplyScalar(tod === 'night' ? 1.2 : 6) }));
    sun.position.copy(s).multiplyScalar(8);
    env.add(sun);
    const pm = new THREE.PMREMGenerator(gl);
    const rt = pm.fromScene(env, 0.02);
    scene.environment = rt.texture;
    pm.dispose();
    env.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } });
    return () => { if (scene.environment === rt.texture) scene.environment = null; rt.dispose(); };
  }, [tod, gl, scene]);
  return null;
}

const SKIP = /hills|sky|water|leaves|birds|fireflies|shaft|hotspot|contact/i;

/** Exported so WarmUp can flag shadow casters before the first drawn frame (their depth programs build with it). */
export function flagShadows(root: THREE.Object3D, quality: string) {
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
    if (f === 2 || f === 45 || f === 200 || f === 600) flagShadows(scene, quality);
  });
  return null;
}

export function GroundContact() {
  const quality = useScene((s) => s.quality);
  // Baked from one frame of the real scene, so wait until it is actually being drawn (see WarmUp).
  const warm = useLoad((s) => s.phase === 'warm' || s.phase === 'ready');
  const ready = useScene((s) => s.sceneReady) || warm;
  const [kx, , kz] = ANCHORS.kayak.pos;
  const res = quality === 'high' ? 512 : 256;
  if (!ready) return null;
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
