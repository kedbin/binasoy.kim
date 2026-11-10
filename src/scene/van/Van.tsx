// Van assembly: exterior body + wheels + liftgate (open ~75° above closed... see GATE_OPEN), interior shell,
// soft goods, small props, string lights. Geometry lives in sibling modules; this file only wires meshes/materials.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { VAN, PALETTE } from '../layout';
import { useScene } from '../../state/store';
import { useVanMats } from './materials';
import { makeBody, makeGlass, WHEEL, OUT, Z_BACK } from './body';
import { makeWheel } from './wheels';
import { makeGate, GATE } from './gate';
import { makeInterior, makeLeafDecals } from './interior';
import { makeMattress, makeDuvet, makePillow, makeBlanket } from './bed';
import { makeTumbler, makeBook, makePlant, makeGarment, makeHook } from './decor';
import { fabricTex, floralTex, ginghamTex, plateTex } from './textures';
import { FairyLights } from './FairyLights';

/** Liftgate rotation about the hinge (rad). 0 = closed; the panel swings up and out. */
const GATE_OPEN = -(105 * Math.PI) / 180;

export function Van() {
  const quality = useScene((s) => s.quality);
  const night = useScene((s) => s.timeOfDay) === 'night';
  const low = quality === 'low';
  const M = useVanMats();

  const body = useMemo(makeBody, []);
  const glass = useMemo(makeGlass, []);
  const wheel = useMemo(() => makeWheel(WHEEL.r), []);
  const gate = useMemo(makeGate, []);
  const inter = useMemo(makeInterior, []);
  const leaves = useMemo(makeLeafDecals, []);
  const mattress = useMemo(() => makeMattress(low ? 3 : 6), [low]);
  const duvet = useMemo(() => (low ? makeDuvet(40, 44) : makeDuvet(90, 100)), [low]);
  const pillow = useMemo(() => makePillow(), []);
  const blanket = useMemo(() => (low ? makeBlanket(24, 30) : makeBlanket(48, 60)), [low]);
  const tumbler = useMemo(makeTumbler, []);
  const book = useMemo(makeBook, []);
  const plant = useMemo(makePlant, []);
  const hoodie = useMemo(() => makeGarment({ len: 0.42, width: 0.3, hood: true, seed: 1 }), []);
  const jacket = useMemo(() => makeGarment({ len: 0.5, width: 0.32, hood: false, seed: 4 }), []);
  const hook = useMemo(makeHook, []);

  const tex = useMemo(() => {
    const duv = fabricTex(); duv.repeat.set(4, 4);
    return { floral: floralTex(PALETTE.mustard), gingham: ginghamTex(PALETTE.gingham, PALETTE.ginghamGreen), plate: plateTex(), duvet: duv };
  }, []);

  useEffect(() => () => {
    for (const g of [body.white, body.black, body.chrome, body.seam, glass, wheel.tyre, wheel.rim, wheel.dark, inter.fabric, inter.trim, inter.black, inter.glass, leaves]) g.dispose();
  }, [body, glass, wheel, inter, leaves]);
  useEffect(() => () => { mattress.dispose(); duvet.dispose(); blanket.dispose(); }, [mattress, duvet, blanket]);

  const top = VAN.bedTopY;
  const tailGlow = night ? M.tailGlow : M.tail;
  return (
    <group name="van">
      {/* ---------- exterior ---------- */}
      <mesh geometry={body.white} material={M.paint} castShadow receiveShadow />
      <mesh geometry={body.black} material={M.black} castShadow receiveShadow />
      <mesh geometry={body.chrome} material={M.chrome} />
      <mesh geometry={body.seam} material={M.rubber} />
      <mesh geometry={glass} material={M.smoke} renderOrder={2} />
      {WHEEL.zs.flatMap((z) => [1, -1].map((s) => (
        <group key={`${z}${s}`} position={[s * (OUT - 0.12), WHEEL.y, z]} scale={[s, 1, 1]}>
          <mesh geometry={wheel.tyre} material={M.rubber} castShadow />
          <mesh geometry={wheel.rim} material={M.alloy} castShadow />
          <mesh geometry={wheel.dark} material={M.black} />
        </group>
      )))}
      {/* tail-light clusters on the body D-pillars (vertical, wrap the corner) */}
      {[1, -1].map((s) => (
        <group key={s} position={[s * (OUT - 0.07), 0.98, Z_BACK - 0.02]}>
          <mesh material={M.tail}><boxGeometry args={[0.13, 0.5, 0.06]} /></mesh>
          <mesh position={[0, 0.08, 0.032]} material={tailGlow}><boxGeometry args={[0.09, 0.03, 0.004]} /></mesh>
          <mesh position={[0, -0.04, 0.032]} material={tailGlow}><boxGeometry args={[0.09, 0.03, 0.004]} /></mesh>
          <mesh position={[0, -0.16, 0.031]} material={M.amber}><boxGeometry args={[0.09, 0.06, 0.004]} /></mesh>
        </group>
      ))}
      {/* headlights */}
      {[1, -1].map((s) => (
        <mesh key={s} position={[s * 0.66, 0.8, -3.6]} rotation={[0, s * 0.35, 0]} material={M.lamp}>
          <boxGeometry args={[0.32, 0.09, 0.08]} />
        </mesh>
      ))}

      {/* ---------- liftgate ---------- */}
      <group position={[0, VAN.tailgateHingeY, Z_BACK]} rotation={[GATE_OPEN, 0, 0]}>
        <mesh geometry={gate.paint} material={M.paint} castShadow receiveShadow />
        <mesh geometry={gate.trim} material={M.trim} receiveShadow />
        <mesh geometry={gate.glass} material={M.smoke} renderOrder={2} />
        <mesh geometry={gate.black} material={M.black} />
        <mesh geometry={gate.chrome} material={M.chrome} />
        <mesh geometry={gate.tail} material={tailGlow} />
        <mesh geometry={gate.dome}><meshBasicMaterial color={new THREE.Color('#FFE2B0').multiplyScalar(night ? 1.8 : 1.2)} toneMapped={false} /></mesh>
        <mesh position={[0, gate.plateY, 0.05]}>
          <planeGeometry args={[0.36, 0.18]} />
          <meshStandardMaterial map={tex.plate} roughness={0.5} metalness={0.1} />
        </mesh>
        {/* high-mount stop light */}
        <mesh position={[0, -0.03, 0.12]}><boxGeometry args={[0.5, 0.012, 0.01]} /><meshStandardMaterial color="#5a0b0b" emissive="#ff2a1a" emissiveIntensity={night ? 1.2 : 0.3} /></mesh>
      </group>
      {/* gas struts */}
      {[1, -1].map((s) => {
        const a = new THREE.Vector3(s * 0.72, 1.1, Z_BACK - 0.06);
        const hinge = new THREE.Vector3(0, VAN.tailgateHingeY, Z_BACK);
        const b = new THREE.Vector3(s * 0.72, -0.55, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), GATE_OPEN).add(hinge);
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const len = a.distanceTo(b);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
        return (
          <mesh key={s} position={mid} quaternion={q} material={M.black}>
            <cylinderGeometry args={[0.009, 0.009, len, 8]} />
          </mesh>
        );
      })}
      <mesh position={[0, VAN.tailgateHingeY - 0.02, Z_BACK - 0.03]}><boxGeometry args={[GATE.w - 0.1, 0.02, 0.02]} /><meshStandardMaterial color="#222" /></mesh>

      {/* ---------- interior shell ---------- */}
      <mesh geometry={inter.fabric} material={M.fabric} receiveShadow />
      <mesh geometry={inter.trim} material={M.trim} receiveShadow castShadow />
      <mesh geometry={inter.black} material={M.black} />
      <mesh geometry={inter.glass} material={M.glass} renderOrder={2} />
      <mesh geometry={leaves}><meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.7} emissive="#ff8a3a" emissiveIntensity={0.15} /></mesh>
      <mesh position={[0, VAN.roofY - 0.03, VAN.frontZ + 0.18]}><boxGeometry args={[0.16, 0.006, 0.07]} /><meshBasicMaterial color={new THREE.Color('#FFF1D6').multiplyScalar(night ? 1.4 : 1.0)} toneMapped={false} /></mesh>

      {/* ---------- bed ---------- */}
      <mesh geometry={mattress} castShadow receiveShadow><meshStandardMaterial color="#DCD5CA" roughness={1} /></mesh>
      <mesh geometry={duvet} castShadow receiveShadow>
        <meshStandardMaterial color={PALETTE.duvet} map={tex.duvet} roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {[[-0.36, 0.2, 0.06], [0.37, -0.25, -0.05]].map(([x, ry, rz], i) => (
        <mesh key={i} geometry={pillow} position={[x, top + 0.075, -1.08]} rotation={[0.28, ry, rz]} castShadow receiveShadow>
          <meshStandardMaterial map={tex.floral} roughness={0.95} />
        </mesh>
      ))}
      <mesh geometry={blanket} castShadow receiveShadow>
        <meshStandardMaterial map={tex.gingham} roughness={1} side={THREE.DoubleSide} />
      </mesh>

      {/* ---------- props ---------- */}
      <group position={[0.6, top + 0.03, -0.62]} rotation={[0, 0.6, 0]}>
        <mesh geometry={tumbler.pink} castShadow><meshPhysicalMaterial color="#E88FA8" roughness={0.45} clearcoat={0.6} /></mesh>
        <mesh geometry={tumbler.lid}><meshStandardMaterial color="#F4F0EA" roughness={0.5} /></mesh>
        <mesh geometry={tumbler.straw}><meshStandardMaterial color="#F7C9D6" roughness={0.3} /></mesh>
      </group>
      <group position={[-0.28, top + 0.045, -0.55]} rotation={[0, 0.5, 0]}>
        <mesh geometry={book.cover} castShadow><meshStandardMaterial color="#3E5A7A" roughness={0.8} /></mesh>
        <mesh geometry={book.pages} castShadow><meshStandardMaterial color="#F3ECDD" roughness={0.95} side={THREE.DoubleSide} /></mesh>
      </group>
      <group position={[-0.6, top + 0.03, -1.15]}>
        <mesh geometry={plant.pot} castShadow><meshStandardMaterial vertexColors roughness={0.9} /></mesh>
        <mesh geometry={plant.leaves} castShadow><meshStandardMaterial vertexColors roughness={0.7} /></mesh>
      </group>

      {/* hanging hoodie + jacket on the C-pillar hooks */}
      <group position={[-0.74, 1.5, 0.62]}>
        <mesh geometry={hook} material={M.chrome} />
        <mesh geometry={jacket} castShadow receiveShadow><meshStandardMaterial color="#3F6B4A" map={tex.duvet} roughness={1} side={THREE.DoubleSide} /></mesh>
      </group>
      <group position={[0.74, 1.5, 0.62]} scale={[-1, 1, 1]}>
        <mesh geometry={hook} material={M.chrome} />
        <mesh geometry={hoodie} castShadow receiveShadow><meshStandardMaterial color="#E9E4DA" map={tex.duvet} roughness={1} side={THREE.DoubleSide} /></mesh>
      </group>

      <FairyLights />

      {/* LED puck lamp on the right C-pillar */}
      <mesh position={[0.86, 1.4, 0.95]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.04, 0.015, 20]} />
        <meshBasicMaterial color={new THREE.Color('#FFF1D6').multiplyScalar(night ? 1.5 : 1.05)} toneMapped={false} />
      </mesh>
    </group>
  );
}
