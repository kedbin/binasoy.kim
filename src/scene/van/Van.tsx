// OWNER: Sonnet task S4 (van shell + interior).
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { VAN, PALETTE } from '../layout';
import { useScene } from '../../state/store';

const W = VAN.innerWidth / 2; // 0.775
const OUT = 0.95; // outer body half-width
const Z_FRONT = -3.0;
const Z_BACK = VAN.backZ + 0.05;
const CHAR2 = '#2a2b2f';
const FAIRY = new THREE.Color(PALETTE.fairy);

/* ---------- geometry helpers ---------- */
function box(w: number, h: number, d: number, x: number, y: number, z: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}
function rbox(w: number, h: number, d: number, x: number, y: number, z: number, r = 0.025) {
  const rr = Math.min(r, Math.min(w, h, d) / 2 - 0.001);
  const g = new RoundedBoxGeometry(w, h, d, 2, rr);
  g.translate(x, y, z);
  return g;
}
/** box from ranges */
const bx = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, round = false) =>
  (round ? rbox : box)(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
const merge = (gs: THREE.BufferGeometry[]) =>
  mergeGeometries(gs.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'color'].includes(k)) n.deleteAttribute(k);
    return n;
  }), false)!;
const both = (f: (s: number) => THREE.BufferGeometry[]) => [...f(1), ...f(-1)];

function makeShell() {
  const white: THREE.BufferGeometry[] = [];
  const char: THREE.BufferGeometry[] = [];
  const char2: THREE.BufferGeometry[] = [];
  const glass: THREE.BufferGeometry[] = [];
  const red: THREE.BufferGeometry[] = [];
  const black: THREE.BufferGeometry[] = [];

  const pillars: [number, number][] = [[-3.0, -2.6], [-1.0, -0.85], [0.85, 1.2]];
  const sr = (s: number, a: number, b: number) => (s > 0 ? [a, b] : [-b, -a]);

  // white outer body (x from inner panel to OUT)
  white.push(...both((s) => {
    const [a, b] = sr(s, W + 0.015, OUT);
    const out = [bx(a, b, 0.25, 1.05, Z_FRONT - 0.2, Z_BACK, true)];
    for (const [z0, z1] of pillars) out.push(bx(a, b, 1.0, 1.78, z0, z1, true));
    out.push(bx(a, b, 1.62, 1.78, Z_FRONT, Z_BACK, true)); // roof rail
    return out;
  }));
  // outer roof ring around sunroof hole
  const sr0 = VAN.sunroof.z0, sr1 = VAN.sunroof.z1, hw = VAN.sunroof.halfWidth;
  white.push(
    bx(-OUT, -hw, 1.72, 1.79, Z_FRONT, Z_BACK, true), bx(hw, OUT, 1.72, 1.79, Z_FRONT, Z_BACK, true),
    bx(-hw, hw, 1.72, 1.79, Z_FRONT, sr0, true), bx(-hw, hw, 1.72, 1.79, sr1, Z_BACK, true),
    bx(-hw, hw, 1.72, 1.78, -0.28, -0.22), // sunroof divider
  );
  // bumper + rear
  white.push(rbox(OUT * 2 + 0.04, 0.3, 0.3, 0, 0.42, Z_BACK + 0.2, 0.08));
  white.push(bx(-OUT, OUT, 0.25, 0.5, Z_FRONT - 0.2, Z_BACK, true));
  // hood / nose
  white.push(rbox(OUT * 2, 0.45, 1.0, 0, 0.92, Z_FRONT - 0.5, 0.1));

  // charcoal interior
  char.push(
    bx(-W, W, 0.5, VAN.floorY, VAN.frontZ, VAN.backZ), // floor
    bx(-W, W, 0.54, 0.56, VAN.backZ - 0.18, VAN.backZ + 0.06), // sill
    bx(-W, W, 0.55, 1.72, VAN.frontZ - 0.06, VAN.frontZ), // front wall
    bx(-W, W, 1.7, 1.72, Z_FRONT, Z_BACK), // headliner base (under sunroof frame handled by glass)
  );
  char.push(...both((s) => {
    const [a, b] = sr(s, W, W + 0.015);
    const out = [bx(a, b, 0.55, 1.05, VAN.frontZ, Z_BACK)];
    for (const [z0, z1] of pillars) out.push(bx(a, b, 1.0, 1.72, Math.max(z0, VAN.frontZ), z1));
    out.push(bx(a, b, 1.62, 1.72, VAN.frontZ, Z_BACK));
    return out;
  }));
  // remove the headliner centre (replace with ring around sunroof): rebuild below
  char.splice(3, 1,
    bx(-W, -hw, 1.7, 1.72, Z_FRONT, Z_BACK), bx(hw, W, 1.7, 1.72, Z_FRONT, Z_BACK),
    bx(-hw, hw, 1.7, 1.72, VAN.frontZ, sr0), bx(-hw, hw, 1.7, 1.72, sr1, Z_BACK),
    bx(-hw, hw, 1.69, 1.72, -0.28, -0.22),
  );
  // grab handles
  for (const s of [1, -1]) for (const z of [-0.7, 0.55]) {
    char2.push(bx(s * 0.72 - 0.015, s * 0.72 + 0.015, 1.64, 1.7, z - 0.1, z + 0.1));
    char2.push(bx(s * 0.72 - 0.015, s * 0.72 + 0.015, 1.6, 1.64, z - 0.1, z - 0.085));
    char2.push(bx(s * 0.72 - 0.015, s * 0.72 + 0.015, 1.6, 1.64, z + 0.085, z + 0.1));
  }
  // front seat silhouettes (lighter charcoal)
  for (const sx of [-0.4, 0.4]) {
    char2.push(rbox(0.5, 0.75, 0.16, sx, 0.95, VAN.frontZ - 0.16, 0.06)); // backrest
    char2.push(rbox(0.26, 0.24, 0.12, sx, 1.45, VAN.frontZ - 0.16, 0.05)); // headrest
  }
  // windows (dark tinted glass planes)
  for (const s of [1, -1]) for (const [z0, z1] of [[-2.6, -1.0], [-0.85, 0.85]] as const) {
    const g = new THREE.PlaneGeometry(z1 - z0, 0.57);
    g.rotateY(s * Math.PI / 2);
    g.translate(s * 0.86, 1.335, (z0 + z1) / 2);
    glass.push(g);
  }
  // tail lights (vertical red clusters)
  for (const s of [1, -1]) {
    red.push(rbox(0.12, 0.62, 0.04, s * 0.86, 0.78, Z_BACK + 0.015, 0.015));
    red.push(rbox(0.1, 0.18, 0.04, s * 0.86, 1.3, Z_BACK + 0.015, 0.015));
  }
  // wheels
  for (const s of [1, -1]) for (const z of [-2.3, 0.0]) {
    const g = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 14);
    g.rotateZ(Math.PI / 2);
    g.translate(s * 0.9, 0.33, z);
    black.push(g);
  }
  black.push(bx(-OUT, OUT, 0.2, 0.28, Z_FRONT - 0.2, Z_BACK + 0.2)); // underbody
  // windshield
  const ws = new THREE.PlaneGeometry(1.7, 0.6);
  ws.rotateX(-0.9);
  ws.translate(0, 1.5, Z_FRONT - 0.15);
  glass.push(ws);

  return {
    white: merge(white), char: merge(char), char2: merge(char2),
    glass: merge(glass), red: merge(red), black: merge(black),
  };
}

function makeGate() {
  // local: hangs down along -y from hinge. +z = outer (closed: rear). -z = inner trim.
  const white = [rbox(1.75, 1.0, 0.04, 0, -0.5, 0.02, 0.03)];
  const char = [
    bx(-0.85, 0.85, -1.0, 0, -0.04, 0),
    // window frame bars on inner trim
  ];
  const glass = new THREE.PlaneGeometry(1.3, 0.38);
  glass.rotateY(Math.PI);
  glass.translate(0, -0.5, -0.043);
  const trim = [bx(-0.7, 0.7, -0.98, -0.9, -0.06, -0.04), bx(-0.05, 0.05, -0.8, -0.2, -0.06, -0.04)];
  const dome = [bx(-0.45, -0.3, -0.18, -0.12, -0.065, -0.04), bx(0.3, 0.45, -0.18, -0.12, -0.065, -0.04)];
  return { white: merge(white), char: merge([...char, ...trim]), glass, dome: merge(dome) };
}

function makeMapleLeaves() {
  const shape = new THREE.Shape();
  const pts = 10;
  for (let i = 0; i < pts * 2; i++) {
    const a = (i / (pts * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? (i % 4 === 0 ? 1 : 0.8) : 0.42;
    const x = Math.sin(a) * r, y = Math.cos(a) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  const stem = new THREE.Shape();
  stem.moveTo(-0.05, -0.4); stem.lineTo(0.05, -0.4); stem.lineTo(0.04, -1.1); stem.lineTo(-0.04, -1.1);
  const leaves: [number, number, number, number, string][] = [
    [-0.3, -0.7, 0.4, 0.09, PALETTE.maple], [0.25, -0.55, 2.2, 0.08, PALETTE.gold], [0.05, -0.15, 1.0, 0.1, '#C4501F'],
    [-0.2, 0.2, 3.5, 0.075, PALETTE.gold], [0.32, 0.35, 5.0, 0.085, PALETTE.maple], [-0.38, -0.05, 2.9, 0.07, '#E88A2E'],
    [0.1, -0.95, 4.1, 0.07, '#C4501F'],
  ];
  const gs: THREE.BufferGeometry[] = [];
  for (const [x, z, rot, sc, col] of leaves) {
    for (const sh of [shape, stem]) {
      const g = new THREE.ShapeGeometry(sh);
      g.scale(sc, sc, sc);
      g.rotateZ(rot);
      g.rotateX(Math.PI / 2); // face downward
      g.translate(x, 1.732, z);
      const c = new THREE.Color(col);
      const n = g.attributes.position.count;
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      g.deleteAttribute('uv');
      gs.push(g);
    }
  }
  return merge(gs.map((g) => (g.index ? g : g)));
}

/** Rumpled duvet: subdivided plane with smooth sine-noise wrinkles; sides drape over the mattress edge. */
function makeDuvet(segX: number, segZ: number) {
  const w = 1.58, d = 1.75, zc = 0.18;
  const g = new THREE.PlaneGeometry(w, d, segX, segZ);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    let h = 0;
    h += Math.sin(x * 5.1 + z * 2.3 + 1.0) * 0.012;
    h += Math.sin(x * 9.7 - z * 6.1 + 2.0) * 0.007;
    h += Math.sin(z * 7.3 + x * 3.1 + 4.0) * 0.01;
    h += Math.sin(x * 14.0 + z * 12.0) * 0.003 * Math.sin(z * 3.0);
    h += Math.sin((x + z * 0.7) * 3.3 + 0.5) * Math.cos(z * 2.1) * 0.014;
    const ex = Math.max(0, Math.abs(x) - 0.7) / (w / 2 - 0.7);
    const ez = Math.max(0, z - (d / 2 - 0.1)) / 0.1;
    const edge = Math.max(ex, ez);
    h -= edge * edge * 0.09;
    p.setY(i, h);
  }
  g.translate(0, VAN.bedTopY - 0.005, zc);
  g.computeVertexNormals();
  return g;
}

function makeGinghamBlanket() {
  const g = new THREE.PlaneGeometry(1.1, 1, 22, 24);
  const p = g.attributes.position as THREE.BufferAttribute;
  const top = VAN.bedTopY + 0.02;
  const zStart = 0.6, flat = 0.46;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const dist = (p.getY(i) + 0.5) * 0.95; // 0..0.95
    let y: number, z: number;
    if (dist < flat) { z = zStart + dist; y = top + Math.sin(x * 11 + dist * 8) * 0.006; }
    else {
      const t = dist - flat;
      const bend = Math.min(t / 0.06, 1);
      z = zStart + flat + 0.04 * Math.sin(bend * Math.PI / 2) + Math.sin(x * 16 + t * 6) * 0.012 * t * 3;
      y = top - Math.max(0, t - 0.03 * (1 - bend)) * 0.98;
    }
    p.setXYZ(i, x, y, z);
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/* ---------- textures ---------- */
function canvasTex(size: number, draw: (c: CanvasRenderingContext2D) => void, repeat = 1) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}
const floralTex = () => canvasTex(256, (c) => {
  c.fillStyle = PALETTE.mustard; c.fillRect(0, 0, 256, 256);
  const flower = (x: number, y: number, r: number, col: string) => {
    c.fillStyle = col;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      c.beginPath(); c.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.7, 0, 7); c.fill();
    }
    c.fillStyle = '#7a4a1a'; c.beginPath(); c.arc(x, y, r * 0.5, 0, 7); c.fill();
  };
  for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 4; gx++) {
    const ox = (gy % 2) * 32;
    flower(gx * 64 + 32 + ox, gy * 64 + 32, 7, gy % 2 ? '#F4E3C0' : '#B5532F');
    c.fillStyle = '#5E7D4E'; c.beginPath(); c.arc(gx * 64 + ox + 4, gy * 64 + 4, 3, 0, 7); c.fill();
  }
}, 1);
const ginghamTex = () => canvasTex(256, (c) => {
  c.fillStyle = '#EFE6D6'; c.fillRect(0, 0, 256, 256);
  c.fillStyle = 'rgba(184,72,62,0.8)';
  for (let i = 0; i < 4; i++) c.fillRect(0, i * 64, 256, 32);
  c.fillStyle = 'rgba(94,125,78,0.7)';
  for (let i = 0; i < 4; i++) c.fillRect(i * 64, 0, 32, 256);
}, 3);

/* ---------- fairy lights ---------- */
function makeFairyPath(count: number) {
  const pts: THREE.Vector3[] = [];
  const legs = 8;
  for (let i = 0; i <= legs; i++) {
    const z = -1.25 + (i / legs) * 2.3;
    pts.push(new THREE.Vector3(i % 2 ? 0.66 : -0.66, 1.675, z));
    if (i < legs) pts.push(new THREE.Vector3(0, 1.64, z + 0.14));
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.3);
  const positions: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) positions.push(curve.getPointAt((i + 0.5) / count));
  return { curve, positions };
}

/* ---------- component ---------- */
export function Van() {
  const quality = useScene((s) => s.quality);
  const night = useScene((s) => s.timeOfDay) === 'night';

  const shell = useMemo(makeShell, []);
  const gate = useMemo(makeGate, []);
  const leaves = useMemo(makeMapleLeaves, []);
  const duvet = useMemo(() => (quality === 'low' ? makeDuvet(28, 32) : makeDuvet(56, 64)), [quality]);
  const blanket = useMemo(makeGinghamBlanket, []);
  const floral = useMemo(floralTex, []);
  const gingham = useMemo(ginghamTex, []);
  const nLights = quality === 'low' ? 28 : quality === 'mid' ? 44 : 64;
  const fairy = useMemo(() => makeFairyPath(nLights), [nLights]);
  const wireGeo = useMemo(() => new THREE.TubeGeometry(fairy.curve, 240, 0.0028, 4), [fairy]);
  const bulbGeo = useMemo(() => new THREE.IcosahedronGeometry(0.014, 1), []);
  const pillowGeo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 20, 14);
    g.scale(0.27, 0.085, 0.19);
    return g;
  }, []);
  const clothes = useMemo(() => {
    const jacket = [
      box(0.07, 0.5, 0.3, 0, 0, 0), box(0.07, 0.32, 0.1, 0, -0.05, 0.19), box(0.07, 0.32, 0.1, 0, -0.05, -0.19),
      box(0.08, 0.06, 0.2, 0, 0.27, 0),
    ];
    jacket[1].rotateX(0.0); 
    const hood = [
      box(0.08, 0.46, 0.3, 0, 0, 0), box(0.08, 0.34, 0.1, 0, -0.04, 0.19), box(0.08, 0.34, 0.1, 0, -0.04, -0.19),
    ];
    const hoodTop = new THREE.SphereGeometry(0.11, 10, 8);
    hoodTop.scale(0.6, 0.8, 1.2);
    hoodTop.translate(0, 0.25, 0);
    return { jacket: merge(jacket), hoodie: merge([...hood, hoodTop]) };
  }, []);

  const bulbs = useRef<THREE.InstancedMesh>(null);
  const lightA = useRef<THREE.PointLight>(null);
  const lightB = useRef<THREE.PointLight>(null);
  const nk = useRef(night ? 1 : 0);
  const phases = useMemo(() => Float32Array.from({ length: nLights }, (_, i) => i * 1.7 + (i % 5) * 0.9), [nLights]);

  useLayoutEffect(() => {
    const m = bulbs.current;
    if (!m) return;
    const o = new THREE.Object3D();
    fairy.positions.forEach((p, i) => {
      o.position.copy(p); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, FAIRY);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [fairy]);

  useEffect(() => () => {
    [shell.white, shell.char, shell.char2, shell.glass, shell.red, shell.black, leaves, duvet, blanket, wireGeo].forEach((g) => g.dispose());
  }, [shell, leaves, duvet, blanket, wireGeo]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    nk.current += ((night ? 1 : 0) - nk.current) * Math.min(1, dt * 2.5);
    const k = nk.current;
    const m = bulbs.current;
    if (m && m.instanceColor) {
      const gain = 2.2 + k * 2.2;
      const arr = m.instanceColor.array as Float32Array;
      for (let i = 0; i < nLights; i++) {
        const f = 0.78 + 0.22 * Math.sin(t * (1.3 + (i % 4) * 0.35) + phases[i]);
        const v = gain * f;
        arr[i * 3] = FAIRY.r * v; arr[i * 3 + 1] = FAIRY.g * v; arr[i * 3 + 2] = FAIRY.b * v;
      }
      m.instanceColor.needsUpdate = true;
    }
    const fl = 0.92 + 0.08 * Math.sin(t * 2.1) * Math.sin(t * 0.7);
    if (lightA.current) lightA.current.intensity = (1.2 + 5.5 * k) * fl;
    if (lightB.current) lightB.current.intensity = (0.9 + 4.5 * k) * (1.84 - fl);
  });

  const top = VAN.bedTopY;
  return (
    <group name="van">
      {/* shell */}
      <mesh geometry={shell.white}><meshStandardMaterial color={PALETTE.vanWhite} roughness={0.55} /></mesh>
      <mesh geometry={shell.char} receiveShadow><meshStandardMaterial color={PALETTE.charcoal} roughness={0.95} /></mesh>
      <mesh geometry={shell.char2}><meshStandardMaterial color={CHAR2} roughness={0.95} /></mesh>
      <mesh geometry={shell.black}><meshStandardMaterial color="#111214" roughness={0.9} /></mesh>
      <mesh geometry={shell.red}>
        <meshStandardMaterial color="#8c1414" emissive="#d01818" emissiveIntensity={0.8} roughness={0.4} />
      </mesh>
      <mesh geometry={shell.glass} renderOrder={2}>
        <meshStandardMaterial color="#1b2530" transparent opacity={0.4} roughness={0.1} metalness={0.2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* sunroof glass (two panels) */}
      {[[VAN.sunroof.z0, -0.28], [-0.22, VAN.sunroof.z1]].map(([a, b], i) => (
        <mesh key={i} position={[0, 1.73, (a + b) / 2]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
          <planeGeometry args={[VAN.sunroof.halfWidth * 2, b - a]} />
          <meshStandardMaterial color="#9db6c9" transparent opacity={0.22} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      <mesh geometry={leaves}>
        <meshBasicMaterial vertexColors side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      {/* open liftgate */}
      <group position={[0, VAN.tailgateHingeY, VAN.backZ + 0.05]} rotation={[-(160 * Math.PI) / 180, 0, 0]}>
        <mesh geometry={gate.white}><meshStandardMaterial color={PALETTE.vanWhite} roughness={0.55} /></mesh>
        <mesh geometry={gate.char}><meshStandardMaterial color="#25262a" roughness={0.95} /></mesh>
        <mesh geometry={gate.glass} renderOrder={2}>
          <meshStandardMaterial color="#1b2530" transparent opacity={0.5} roughness={0.1} depthWrite={false} />
        </mesh>
        <mesh geometry={gate.dome}><meshBasicMaterial color="#FFE2B0" toneMapped={false} /></mesh>
      </group>

      {/* bed */}
      <mesh position={[0, 0.675, -0.14]}>
        <boxGeometry args={[1.5, 0.15, 2.38]} />
        <meshStandardMaterial color="#D8D2C8" roughness={1} />
      </mesh>
      <mesh geometry={duvet}><meshStandardMaterial color={PALETTE.duvet} roughness={1} side={THREE.DoubleSide} /></mesh>
      {[-0.36, 0.37].map((x, i) => (
        <mesh key={i} geometry={pillowGeo} position={[x, top + 0.07, -1.1]} rotation={[0.12, i ? -0.25 : 0.2, 0]}>
          <meshStandardMaterial map={floral} roughness={1} />
        </mesh>
      ))}
      <mesh geometry={blanket}><meshStandardMaterial map={gingham} roughness={1} side={THREE.DoubleSide} /></mesh>
      {/* pink tumbler */}
      <group position={[0.62, top + 0.075, -0.6]}>
        <mesh><cylinderGeometry args={[0.042, 0.032, 0.17, 14]} /><meshStandardMaterial color="#E88FA8" roughness={0.35} metalness={0.2} /></mesh>
        <mesh position={[0, 0.095, 0]}><cylinderGeometry args={[0.044, 0.044, 0.02, 14]} /><meshStandardMaterial color="#F4F0EA" roughness={0.6} /></mesh>
      </group>

      {/* hanging clothes */}
      <group position={[-0.7, 1.4, 0.55]}>
        <mesh geometry={clothes.jacket}><meshStandardMaterial color="#3F6B4A" roughness={1} /></mesh>
      </group>
      <group position={[0.7, 1.4, 0.55]} rotation={[0, 0.05, 0]}>
        <mesh geometry={clothes.hoodie}><meshStandardMaterial color="#F3F1EC" roughness={1} /></mesh>
      </group>

      {/* fairy lights */}
      <mesh geometry={wireGeo}><meshBasicMaterial color="#17171a" /></mesh>
      <instancedMesh ref={bulbs} args={[bulbGeo, undefined, nLights]} frustumCulled={false}>
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
      <pointLight ref={lightA} position={[0, 1.55, -0.45]} color="#FFC878" distance={5} decay={2} intensity={1.2} />
      <pointLight ref={lightB} position={[0, 1.5, 0.65]} color="#FFB45E" distance={5} decay={2} intensity={0.9} />

      {/* LED puck lamp on the right C-pillar */}
      <mesh position={[W - 0.01, 1.38, 1.0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.02, 16]} />
        <meshBasicMaterial color={night ? '#FFF6E0' : '#FFE9C4'} toneMapped={false} />
      </mesh>
    </group>
  );
}
