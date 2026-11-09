import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ANCHORS } from '../layout';
import { useScene } from '../../state/store';
import { Hotspot } from './Hotspot';
import { useLaptopStore, SCREEN_SIZE } from './laptopStore';
import { wallpaperTex } from './textures';

const LID_TILT = -(105 - 90) * Math.PI / 180; // lid open ~105° (leans back toward -Z)
const BASE = { w: 0.32, d: 0.22, t: 0.014 };
const GREY = '#34363B', KEY = '#232427';

export function Laptop() {
  const q = useScene((s) => s.quality);
  const tex = useMemo(() => wallpaperTex(q === 'low' ? 256 : 512), [q]);
  useEffect(() => () => tex.dispose(), [tex]);
  const setScreen = useLaptopStore((s) => s.setScreen);
  const setMount = useLaptopStore((s) => s.setMount);
  const { w, h } = SCREEN_SIZE;
  const hingeZ = -BASE.d / 2 + 0.004;

  return (
    <Hotspot id="laptop" label="Open laptop" view="laptop" position={ANCHORS.laptop.pos} rotY={ANCHORS.laptop.rotY} labelPos={[0, 0.3, 0]}>
      <group name="laptop">
        <mesh position={[0, BASE.t / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[BASE.w, BASE.t, BASE.d]} />
          <meshStandardMaterial color={GREY} roughness={0.55} metalness={0.35} />
        </mesh>
        {/* keyboard + trackpad */}
        <mesh position={[0, BASE.t + 0.0005, -0.02]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.28, 0.1]} />
          <meshStandardMaterial color={KEY} roughness={0.9} />
        </mesh>
        <mesh position={[0, BASE.t + 0.0005, 0.07]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.1, 0.06]} />
          <meshStandardMaterial color="#2c2e32" roughness={0.6} />
        </mesh>
        {/* lid */}
        <group position={[0, BASE.t, hingeZ]} rotation={[LID_TILT, 0, 0]}>
          <mesh position={[0, (h + 0.02) / 2, -0.004]} castShadow>
            <boxGeometry args={[w + 0.02, h + 0.02, 0.008]} />
            <meshStandardMaterial color={GREY} roughness={0.5} metalness={0.4} />
          </mesh>
          <mesh name="laptop-screen" ref={setScreen} position={[0, 0.01 + h / 2, 0.0006]}>
            <planeGeometry args={[w, h]} />
            <meshStandardMaterial color="#111" emissive="#ffffff" emissiveMap={tex} emissiveIntensity={1.05} roughness={0.4} toneMapped={false} />
            {/* MOUNT POINT for S7 KimOS: <Html transform> goes in this group (or portal into laptopStore.screen) */}
            <group name="kimos-mount" ref={setMount} position={[0, 0, 0.001]} />
          </mesh>
        </group>
      </group>
    </Hotspot>
  );
}
