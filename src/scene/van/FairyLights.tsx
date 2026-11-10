// String lights: wire zig-zags across the headliner between hooks with a catenary sag; each bulb is a glass shell
// (instanced) with an emissive filament core (instanced, HDR for bloom) that twinkles; two warm point lights.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE, VAN } from '../layout';
import { useScene } from '../../state/store';

const FAIRY = new THREE.Color(PALETTE.fairy);

/** Catenary between hooks: y(t) = yHook - sag * cosh-ish (4t(1-t) parabola close enough). */
function buildPath(hooks: THREE.Vector3[], sag: number, perSpan: number) {
  const pts: THREE.Vector3[] = [];
  for (let k = 0; k < hooks.length - 1; k++) {
    const a = hooks[k], b = hooks[k + 1];
    const len = a.distanceTo(b);
    for (let i = 0; i < perSpan; i++) {
      const t = i / perSpan;
      const p = a.clone().lerp(b, t);
      const c = Math.cosh((t - 0.5) * 2.2) - Math.cosh(1.1); // ≤0 in the middle
      p.y += c * sag * len * 1.2;
      pts.push(p);
    }
  }
  pts.push(hooks[hooks.length - 1].clone());
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
}

export function FairyLights() {
  const quality = useScene((s) => s.quality);
  const night = useScene((s) => s.timeOfDay) === 'night';
  const n = quality === 'low' ? 26 : quality === 'mid' ? 40 : 56;

  const { curve, bulbs } = useMemo(() => {
    const y = VAN.roofY - 0.03;
    const hooks: THREE.Vector3[] = [];
    // hooks on alternating sides of the headliner, skipping over the sunroof by hugging the side rails
    const zs = [-1.22, -0.9, -0.55, -0.2, 0.15, 0.5, 0.85];
    zs.forEach((z, i) => hooks.push(new THREE.Vector3(i % 2 ? 0.66 : -0.66, y, z)));
    const curve = buildPath(hooks, 0.07, 14);
    const bulbs: { p: THREE.Vector3; tan: THREE.Vector3 }[] = [];
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      bulbs.push({ p: curve.getPointAt(u), tan: curve.getTangentAt(u) });
    }
    return { curve, bulbs };
  }, [n]);

  const wire = useMemo(() => new THREE.TubeGeometry(curve, 260, 0.0022, 4), [curve]);
  const shellGeo = useMemo(() => {
    const g = new THREE.SphereGeometry(0.009, 10, 8);
    g.scale(1, 1.25, 1);
    g.translate(0, -0.013, 0);
    return g;
  }, []);
  const coreGeo = useMemo(() => { const g = new THREE.SphereGeometry(0.0038, 6, 5); g.translate(0, -0.012, 0); return g; }, []);
  const capGeo = useMemo(() => { const g = new THREE.CylinderGeometry(0.004, 0.005, 0.008, 8); g.translate(0, -0.003, 0); return g; }, []);

  const shells = useRef<THREE.InstancedMesh>(null);
  const cores = useRef<THREE.InstancedMesh>(null);
  const caps = useRef<THREE.InstancedMesh>(null);
  const lightA = useRef<THREE.PointLight>(null);
  const lightB = useRef<THREE.PointLight>(null);
  const nk = useRef(night ? 1 : 0);
  const phases = useMemo(() => Float32Array.from({ length: n }, (_, i) => i * 1.7 + (i % 5) * 0.9), [n]);

  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    bulbs.forEach(({ p, tan }, i) => {
      o.position.copy(p);
      // bulbs dangle with a little random tilt around the wire
      o.rotation.set(Math.sin(i * 2.3) * 0.35, 0, Math.cos(i * 1.7) * 0.35 + tan.x * 0.2);
      o.updateMatrix();
      for (const m of [shells.current, cores.current, caps.current]) m?.setMatrixAt(i, o.matrix);
      cores.current?.setColorAt(i, FAIRY);
    });
    for (const m of [shells.current, cores.current, caps.current]) if (m) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }
  }, [bulbs]);

  const tmp = useMemo(() => new THREE.Color(), []);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    nk.current += ((night ? 1 : 0) - nk.current) * Math.min(1, dt * 2.5);
    const k = nk.current;
    const m = cores.current;
    if (m && m.instanceColor) {
      const gain = 2.2 + k * 2.6; // > 1 so bloom (threshold 1.0) picks the filaments up
      for (let i = 0; i < n; i++) {
        const f = 0.8 + 0.2 * Math.sin(t * (1.3 + (i % 4) * 0.35) + phases[i]);
        tmp.copy(FAIRY).multiplyScalar(gain * f);
        m.setColorAt(i, tmp);
      }
      m.instanceColor.needsUpdate = true;
    }
    const fl = 0.92 + 0.08 * Math.sin(t * 2.1) * Math.sin(t * 0.7);
    if (lightA.current) lightA.current.intensity = (1.0 + 5.0 * k) * fl;
    if (lightB.current) lightB.current.intensity = (0.8 + 4.2 * k) * (1.84 - fl);
  });

  return (
    <group name="fairy-lights">
      <mesh geometry={wire}><meshStandardMaterial color="#1c1c1f" roughness={0.6} /></mesh>
      <instancedMesh ref={caps} args={[capGeo, undefined, n]}><meshStandardMaterial color="#2a2a2d" roughness={0.5} /></instancedMesh>
      <instancedMesh ref={cores} args={[coreGeo, undefined, n]}><meshBasicMaterial color="#ffffff" toneMapped={false} /></instancedMesh>
      <instancedMesh ref={shells} args={[shellGeo, undefined, n]} renderOrder={3}>
        <meshPhysicalMaterial color="#fff4dc" emissive="#ffcf7a" emissiveIntensity={0.35 + (night ? 0.6 : 0)} roughness={0.08} transparent opacity={0.38} depthWrite={false} />
      </instancedMesh>
      <pointLight ref={lightA} position={[0, 1.55, -0.45]} color="#FFC878" distance={5} decay={2} intensity={1.2} />
      <pointLight ref={lightB} position={[0, 1.5, 0.65]} color="#FFB45E" distance={5} decay={2} intensity={0.9} />
    </group>
  );
}
