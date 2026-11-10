// Photo garland: instant-film prints pegged with mini clothespins to two sagging twines that hang from
// suction hooks on the sliding-door window. Real-world sizes (a print is ~11 cm wide); each print hangs
// from its peg under gravity and sways a little, instead of being pasted flat in mid-air.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { ANCHORS } from '../layout';
import { content } from '../../content';
import { useScene } from '../../state/store';
import { Hotspot } from './Hotspot';
import { useWall } from './wallStore';

const W = 0.112, H = 0.136, PH = 0.098, T = 0.0016;
const MARGIN = (W - PH) / 2;
const PEG_H = 0.034;
/** Distance from the twine down to the card centre (the peg bites the top ~1 cm of the card). */
const DROP = H / 2 - 0.009;
const HALF = 0.37;                 // half span of each twine
const ROWS = [{ y: 0.2, sag: 0.03 }, { y: -0.005, sag: 0.036 }];
const OUT = 0.035;                 // garland hangs this far inboard of the glass
const urls = content.photos.map((p) => p.src.replace(/\.webp$/, '-thumb.webp'));
const PEG_COLORS = ['#D9B98A', '#CFA877', '#E2C79C'];

const twineY = (row: number, x: number) => ROWS[row].y - ROWS[row].sag * (1 - (x / HALF) ** 2);

/** Slight cylindrical bow + bottom curl, like a real print that has lived in a humid van. */
function warp(g: THREE.BufferGeometry) {
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / (W / 2), y = p.getY(i) / (H / 2);
    const low = Math.max(0, -y);
    p.setZ(i, p.getZ(i) + 0.0035 * (1 - x * x) + 0.006 * low * low);
  }
  g.computeVertexNormals();
  return g;
}
const cardGeo = warp(new THREE.BoxGeometry(W, H, T, 6, 8, 1));
const photoGeo = (() => { const g = new THREE.PlaneGeometry(PH, PH, 6, 6); g.translate(0, H / 2 - MARGIN - PH / 2, T / 2 + 0.0004); return warp(g); })();
const pegGeo = new THREE.BoxGeometry(0.0085, PEG_H, 0.009);
const springGeo = (() => { const g = new THREE.TorusGeometry(0.0052, 0.0009, 5, 12); g.rotateY(Math.PI / 2); return g; })();
const cupGeo = (() => { const g = new THREE.CylinderGeometry(0.017, 0.02, 0.006, 20); g.rotateX(Math.PI / 2); return g; })();
const hookGeo = (() => { const g = new THREE.CylinderGeometry(0.0022, 0.0022, OUT, 6); g.rotateX(Math.PI / 2); g.translate(0, 0, OUT / 2); return g; })();

const paperTex = (() => {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(110,90,60,${Math.random() * 0.06})`; g.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random(), 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();

const cardMat = new THREE.MeshStandardMaterial({ color: '#F7F3EA', map: paperTex, roughness: 0.82 });
const twineMat = new THREE.MeshStandardMaterial({ color: '#B8935A', roughness: 1 });
const springMat = new THREE.MeshStandardMaterial({ color: '#9A9AA0', roughness: 0.35, metalness: 0.8 });
const cupMat = new THREE.MeshPhysicalMaterial({ color: '#E9EEF0', roughness: 0.15, transparent: true, opacity: 0.55, depthWrite: false });
const pegMats = PEG_COLORS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));

interface Slot { i: number; row: number; x: number; tilt: number; twist: number; phase: number }
/** 3 prints per twine, unevenly spaced and tilted the way hand-pegged prints end up. */
const SLOTS: Slot[] = [
  { i: 0, row: 0, x: -0.235, tilt: 0.045, twist: 0.10, phase: 0.3 },
  { i: 1, row: 0, x: -0.01, tilt: -0.03, twist: -0.06, phase: 1.9 },
  { i: 2, row: 0, x: 0.225, tilt: 0.02, twist: 0.12, phase: 3.4 },
  { i: 3, row: 1, x: -0.215, tilt: -0.04, twist: -0.11, phase: 4.6 },
  { i: 4, row: 1, x: 0.02, tilt: 0.035, twist: 0.05, phase: 0.9 },
  { i: 5, row: 1, x: 0.24, tilt: -0.025, twist: -0.08, phase: 2.6 },
];

function Polaroid({ slot, tex }: { slot: Slot; tex: THREE.Texture }) {
  const g = useRef<THREE.Group>(null);
  const hov = useRef(false);
  const k = useRef(0);
  const map = useMemo(() => {
    const t = tex.clone(); t.needsUpdate = true;
    const img = tex.image as { width: number; height: number };
    const a = img.width / img.height;
    if (a > 1) { t.repeat.set(1 / a, 1); t.offset.set((1 - 1 / a) / 2, 0); } else { t.repeat.set(1, a); t.offset.set(0, (1 - a) / 2); }
    return t;
  }, [tex]);
  // slope of the twine at this peg: prints lean with the string
  const slope = Math.atan((2 * ROWS[slot.row].sag * slot.x) / (HALF * HALF));
  useFrame((state, dt) => {
    const o = g.current; if (!o) return;
    const s = useScene.getState();
    const t = s.reducedMotion ? 0 : state.clock.elapsedTime;
    k.current = THREE.MathUtils.damp(k.current, hov.current && s.view === 'wall' ? 1 : 0, 10, dt);
    const calm = 1 - k.current;
    // pendulum about the peg: a slow swing plus a faster flutter, out of phase per print
    o.rotation.z = slope + slot.tilt + calm * 0.014 * Math.sin(t * 0.9 + slot.phase);
    o.rotation.x = calm * (0.035 * Math.sin(t * 0.7 + slot.phase * 1.7) + 0.012 * Math.sin(t * 2.3 + slot.phase));
    o.rotation.y = slot.twist * calm + calm * 0.03 * Math.sin(t * 0.5 + slot.phase * 0.6);
    o.position.z = OUT + k.current * 0.03;
    o.scale.setScalar(1 + k.current * 0.07);
  });
  return (
    <group
      ref={g}
      position={[slot.x, twineY(slot.row, slot.x), OUT]}
      onPointerOver={(e) => {
        if (useScene.getState().view !== 'wall') return;
        e.stopPropagation(); hov.current = true; document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => { hov.current = false; document.body.style.cursor = ''; }}
      onClick={(e) => {
        if (useScene.getState().view !== 'wall') return;
        e.stopPropagation(); useWall.getState().setOpen(slot.i);
      }}
    >
      <mesh geometry={cardGeo} material={cardMat} position={[0, -DROP, 0]} castShadow receiveShadow />
      <mesh geometry={photoGeo} position={[0, -DROP, 0]}>
        {/* a touch of self-light so prints stay readable against the bright window behind them */}
        <meshStandardMaterial map={map} roughness={0.42} emissive="#ffffff" emissiveMap={map} emissiveIntensity={0.16} />
      </mesh>
      {/* clothespin: two wooden halves straddling the twine, wire spring */}
      <mesh geometry={pegGeo} material={pegMats[slot.i % pegMats.length]} position={[0, -0.006, 0.0052]} rotation={[0.07, 0, 0]} castShadow />
      <mesh geometry={pegGeo} material={pegMats[(slot.i + 1) % pegMats.length]} position={[0, -0.006, -0.0052]} rotation={[-0.07, 0, 0]} />
      <mesh geometry={springGeo} material={springMat} position={[0, 0.002, 0]} />
    </group>
  );
}

function Twine({ row }: { row: number }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 24; k++) { const x = -HALF + (2 * HALF * k) / 24; pts.push(new THREE.Vector3(x, twineY(row, x), OUT)); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.0013, 5);
  }, [row]);
  return (
    <group>
      <mesh geometry={geo} material={twineMat} castShadow />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * HALF, ROWS[row].y, 0]}>
          <mesh geometry={cupGeo} material={cupMat} position={[0, 0, 0.004]} />
          <mesh geometry={hookGeo} material={springMat} />
        </group>
      ))}
    </group>
  );
}

export function PhotoWall() {
  const texs = useTexture(urls);
  return (
    <Hotspot id="wall" label="Look at the photos" view="wall" position={ANCHORS.photoWall.pos} rotY={ANCHORS.photoWall.rotY} labelPos={[0, 0.3, 0.06]} lift={0.02} hit={[0.84, 0.46, 0.08]} hitPos={[0, 0.04, 0.04]}>
      <Twine row={0} />
      <Twine row={1} />
      {SLOTS.filter((s) => texs[s.i]).map((s) => <Polaroid key={s.i} slot={s} tex={texs[s.i]} />)}
    </Hotspot>
  );
}
