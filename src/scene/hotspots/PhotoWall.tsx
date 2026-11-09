import { useMemo, useState } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { ANCHORS } from '../layout';
import { content } from '../../content';
import { useScene } from '../../state/store';
import { Hotspot } from './Hotspot';
import { useWall } from './wallStore';

const W = 0.19, H = 0.225, PH = 0.16;
const urls = content.photos.map((p) => p.src.replace(/\.webp$/, '-thumb.webp'));
const TAPE = ['#E8A5A0', '#A9C9B0', '#F2D58A', '#B9A7C9', '#9DBCD4', '#F4C7A1'];
const framePlane = new THREE.PlaneGeometry(1, 1);

function Polaroid({ i, tex, x, y, rot }: { i: number; tex: THREE.Texture; x: number; y: number; rot: number }) {
  const [hov, setHov] = useState(false);
  const map = useMemo(() => {
    const t = tex.clone(); t.needsUpdate = true;
    const img = tex.image as { width: number; height: number };
    const a = img.width / img.height;
    if (a > 1) { t.repeat.set(1 / a, 1); t.offset.set((1 - 1 / a) / 2, 0); } else { t.repeat.set(1, a); t.offset.set(0, (1 - a) / 2); }
    return t;
  }, [tex]);
  return (
    <group
      position={[x, y, 0.01]}
      rotation={[0, 0, rot]}
      scale={hov ? 1.08 : 1}
      onPointerOver={(e) => {
        if (useScene.getState().view !== 'wall') return;
        e.stopPropagation(); setHov(true); document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => { setHov(false); document.body.style.cursor = ''; }}
      onClick={(e) => {
        if (useScene.getState().view !== 'wall') return;
        e.stopPropagation(); useWall.getState().setOpen(i);
      }}
    >
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[W, H, 0.004]} />
        <meshStandardMaterial color="#FAF7F0" roughness={0.9} />
      </mesh>
      <mesh geometry={framePlane} position={[0, 0.012, 0.0025]} scale={[PH, PH, 1]}>
        <meshStandardMaterial map={map} roughness={0.8} emissive="#ffffff" emissiveMap={map} emissiveIntensity={0.18} />
      </mesh>
      <mesh position={[0.01, H / 2 - 0.002, 0.004]} rotation={[0, 0, 0.12 * (i % 2 ? 1 : -1)]}>
        <boxGeometry args={[0.06, 0.02, 0.002]} />
        <meshStandardMaterial color={TAPE[i % TAPE.length]} roughness={0.9} transparent opacity={0.88} />
      </mesh>
    </group>
  );
}

export function PhotoWall() {
  const texs = useTexture(urls);
  const rots = [0.05, -0.04, 0.03, -0.05, 0.04, -0.03];
  return (
    <Hotspot id="wall" label="Look at the photos" view="wall" position={ANCHORS.photoWall.pos} rotY={ANCHORS.photoWall.rotY} labelPos={[0, 0.38, 0.05]} lift={0.03} scale={0.78}>
      {/* invisible hit backing so gaps between polaroids still click */}
      <mesh position={[0, 0, 0.005]} visible={false}><planeGeometry args={[0.8, 0.55]} /></mesh>
      {texs.map((t, i) => (
        <Polaroid key={i} i={i} tex={t} x={((i % 3) - 1) * 0.24} y={i < 3 ? 0.14 : -0.14} rot={rots[i]} />
      ))}
      {/* twine between pins */}
      <mesh position={[0, 0.275, 0.006]}><boxGeometry args={[0.74, 0.003, 0.002]} /><meshStandardMaterial color="#C9A66B" roughness={1} /></mesh>
    </Hotspot>
  );
}
