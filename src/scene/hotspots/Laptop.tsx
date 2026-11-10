import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ANCHORS } from '../layout';
import { useScene } from '../../state/store';
import { Hotspot } from './Hotspot';
import { useLaptopStore, SCREEN_SIZE } from './laptopStore';
import { wallpaperTex } from './textures';
import { extrude, rrShape, rrHole, rbox } from '../van/util';

const LID_TILT = -(105 - 90) * Math.PI / 180; // lid open ~105° (leans back toward -Z)
const BASE = { w: 0.32, d: 0.22, t: 0.014 };
const ALU = '#3a3c42', KEY = '#1d1e21';

/** Rounded aluminium slab lying in XZ, thickness along Y [0, t]. Optional rect hole (keyboard well). */
function slabXZ(w: number, d: number, t: number, r: number, bev: number, hole?: [number, number, number, number]) {
  const s = rrShape(-w / 2, -d / 2, w / 2, d / 2, r);
  if (hole) s.holes.push(rrHole(...hole, 0.006));
  const g = extrude(s, Math.max(0.0005, t - 2 * bev), bev, 3, 8);
  g.rotateX(Math.PI / 2); // shape y -> world z, extrusion -> world -y
  g.translate(0, t - bev, 0);
  return g;
}

export function Laptop() {
  const q = useScene((s) => s.quality);
  const tex = useMemo(() => wallpaperTex(q === 'low' ? 256 : 512), [q]);
  useEffect(() => () => tex.dispose(), [tex]);
  const setScreen = useLaptopStore((s) => s.setScreen);
  const setMount = useLaptopStore((s) => s.setMount);
  const { w, h } = SCREEN_SIZE;
  const hingeZ = -BASE.d / 2 + 0.006;
  const lidW = w + 0.016, lidH = h + 0.024;

  const geo = useMemo(() => {
    // keyboard well in the deck (after rotateX(+90°) shape y == world z)
    const deck = slabXZ(BASE.w, BASE.d, BASE.t, 0.014, 0.003, [-0.137, -0.1, 0.137, 0.01]);
    const lid = (() => {
      const s = rrShape(-lidW / 2, 0, lidW / 2, lidH, 0.012);
      const g = extrude(s, 0.004, 0.002, 3, 8);
      g.translate(0, 0, -0.008);
      return g;
    })();
    const bezel = (() => {
      const s = rrShape(-lidW / 2 + 0.002, 0.002, lidW / 2 - 0.002, lidH - 0.002, 0.01);
      s.holes.push(rrHole(-w / 2, 0.012, w / 2, 0.012 + h, 0.003));
      return new THREE.ShapeGeometry(s, 6).translate(0, 0, 0.0002);
    })();
    const hinge = new THREE.CylinderGeometry(0.0055, 0.0055, BASE.w * 0.78, 16);
    hinge.rotateZ(Math.PI / 2);
    const key = rbox(0.0165, 0.003, 0.0165, 0, 0, 0, 0.0012, 1);
    const pad = rbox(0.11, 0.0008, 0.065, 0, 0, 0, 0.0004, 1);
    const feet = rbox(0.02, 0.002, 0.008, 0, 0, 0, 0.001, 1);
    return { deck, lid, bezel, hinge, key, pad, feet };
  }, [lidW, lidH, w, h]);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  // instanced keys: 5 rows x 14 + space bar row
  const keys = useMemo(() => {
    const out: { x: number; z: number; sx: number }[] = [];
    const pitch = 0.0188;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 14; c++) {
      const sx = r === 0 ? 0.6 : 1;
      out.push({ x: (c - 6.5) * pitch, z: -0.088 + r * pitch * (r === 0 ? 0.85 : 1) + (r ? 0.002 : 0), sx });
    }
    for (const c of [-5.5, -4.5, 4.5, 5.5, 6.5]) out.push({ x: c * pitch, z: -0.088 + 5 * pitch + 0.002, sx: 1 });
    out.push({ x: 0, z: -0.088 + 5 * pitch + 0.002, sx: 7.5 });
    return out;
  }, []);
  const keysRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = keysRef.current; if (!m) return;
    const o = new THREE.Object3D();
    keys.forEach((k, i) => {
      o.position.set(k.x, BASE.t - 0.0005, k.z); o.scale.set(k.sx, 1, k.sx === 0.6 ? 0.6 : 1);
      if (k.sx > 2) o.scale.set(k.sx, 1, 1);
      o.updateMatrix(); m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [keys]);

  return (
    <Hotspot id="laptop" label="Open laptop" view="laptop" position={ANCHORS.laptop.pos} rotY={ANCHORS.laptop.rotY} labelPos={[0, 0.3, -0.05]} hit={[0.4, 0.3, 0.32]} hitPos={[0, 0.12, 0]}>
      <group name="laptop">
        <mesh geometry={geo.deck} castShadow receiveShadow>
          <meshStandardMaterial color={ALU} roughness={0.38} metalness={0.75} />
        </mesh>
        {/* keyboard well floor + instanced keys */}
        <mesh position={[0, BASE.t - 0.0025, -0.045]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.27, 0.1]} />
          <meshStandardMaterial color="#141517" roughness={0.9} />
        </mesh>
        <instancedMesh ref={keysRef} args={[geo.key, undefined, keys.length]}>
          <meshStandardMaterial color={KEY} roughness={0.7} />
        </instancedMesh>
        <mesh geometry={geo.pad} position={[0, BASE.t + 0.0002, 0.06]}>
          <meshStandardMaterial color="#45474d" roughness={0.25} metalness={0.6} />
        </mesh>
        {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} geometry={geo.feet} position={[sx * 0.12, -0.0008, sz * 0.085]}><meshStandardMaterial color="#111" /></mesh>
        )))}
        <mesh geometry={geo.hinge} position={[0, BASE.t, hingeZ]}><meshStandardMaterial color="#222327" roughness={0.4} metalness={0.6} /></mesh>
        {/* lid */}
        <group position={[0, BASE.t, hingeZ]} rotation={[LID_TILT, 0, 0]}>
          <mesh geometry={geo.lid} castShadow>
            <meshStandardMaterial color={ALU} roughness={0.35} metalness={0.75} />
          </mesh>
          <mesh geometry={geo.bezel}><meshStandardMaterial color="#0c0c0e" roughness={0.3} /></mesh>
          <mesh position={[0, lidH - 0.006, 0.0004]}><circleGeometry args={[0.0018, 10]} /><meshBasicMaterial color="#222" /></mesh>
          <mesh name="laptop-screen" ref={setScreen} position={[0, 0.012 + h / 2, 0.0006]}>
            <planeGeometry args={[w, h]} />
            <meshStandardMaterial color="#111" emissive="#ffffff" emissiveMap={tex} emissiveIntensity={1.05} roughness={0.4} toneMapped={false} />
            {/* MOUNT POINT for S7 KimOS: <Html transform> goes in this group (or portal into laptopStore.screen) */}
            <group name="kimos-mount" ref={setMount} position={[0, 0, 0.001]} />
          </mesh>
          {/* back-of-lid logo */}
          <mesh position={[0, lidH / 2, -0.0102]} rotation={[0, Math.PI, 0]}>
            <circleGeometry args={[0.014, 24]} />
            <meshStandardMaterial color="#c9ccd2" roughness={0.15} metalness={1} />
          </mesh>
        </group>
      </group>
    </Hotspot>
  );
}
