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
/** Curl the bottom edge away from the wall a touch (glossy instant-film card). */
function curl(g: THREE.BufferGeometry, h: number, amt: number) {
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const t = Math.max(0, (-p.getY(i) / h) * 2); // 0 at middle, 1 at bottom edge
    p.setZ(i, p.getZ(i) + t * t * amt);
  }
  g.computeVertexNormals();
  return g;
}
const cardGeo = curl(new THREE.BoxGeometry(W, H, 0.003, 4, 8, 1), H, 0.012);
const photoGeo = (() => { const g = new THREE.PlaneGeometry(PH, PH, 4, 6); g.translate(0, 0.012, 0.0018); return curl(g, H, 0.012); })();
/** Washi tape: thin strip with torn ends, slightly translucent. */
const tapeGeo = (() => {
  const s = new THREE.Shape();
  const w = 0.03, h = 0.0095;
  s.moveTo(-w, -h);
  for (let k = 0; k <= 6; k++) s.lineTo(-w + w * 2 * (k / 6), -h + (k % 2 ? 0.0012 : 0));
  for (let k = 0; k <= 4; k++) s.lineTo(w + (k % 2 ? 0.0015 : 0), -h + (2 * h * k) / 4);
  for (let k = 6; k >= 0; k--) s.lineTo(-w + w * 2 * (k / 6), h - (k % 2 ? 0.0012 : 0));
  for (let k = 4; k >= 0; k--) s.lineTo(-w - (k % 2 ? 0.0015 : 0), -h + (2 * h * k) / 4);
  return new THREE.ShapeGeometry(s);
})();
const paperTex = (() => {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(110,90,60,${Math.random() * 0.06})`; g.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random(), 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();

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
      <mesh geometry={cardGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#FAF7F0" map={paperTex} roughness={0.85} />
      </mesh>
      <mesh geometry={photoGeo}>
        <meshPhysicalMaterial map={map} roughness={0.35} clearcoat={0.6} clearcoatRoughness={0.25} emissive="#ffffff" emissiveMap={map} emissiveIntensity={0.18} />
      </mesh>
      <mesh geometry={tapeGeo} position={[0.01, H / 2 - 0.002, 0.0035]} rotation={[0, 0, 0.12 * (i % 2 ? 1 : -1)]}>
        <meshStandardMaterial color={TAPE[i % TAPE.length]} roughness={0.8} transparent opacity={0.8} depthWrite={false} />
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
