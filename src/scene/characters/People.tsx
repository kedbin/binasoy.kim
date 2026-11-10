// OWNER: O3. Kim & Wingwing â€” chunky stylised figures sitting side by side on the raft thwart, facing the bow (+Z local).
// Kim (right, +x) rows his oar in bursts with a proper catch â†’ drive â†’ finish â†’ recovery arc (2-bone IK arms).
// Wingwing (left, âˆ’x) has her oar shipped; while Kim rows she points at the sunset, while he rests she leans
// her head on his shoulder and they glance at each other. Both breathe. A little thermos sits between them.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WORLD } from '../layout';
import { natureMaterial } from '../nature/materials';
import { BODY, hoodieGeometry, headGeometry, eyesGeometry, shortHair, longHair, glassesGeometry, handGeometry, shoeGeometry } from './personGeo';
import { oarGeometry } from './raftGeo';
import { solve2, span } from './ik';
import { smooth01, soft, paint } from '../nature/util';

/** Capsule with painted underside AO (vertex colours required by natureMaterial). */
function cap(r: number, len: number) {
  return paint(soft(new THREE.CapsuleGeometry(r, Math.max(0.001, len), 4, 10)), (_p, n, o) => { o.setScalar(0.78 + 0.26 * (n.y * 0.5 + 0.5)); });
}

/** Raft-local rig constants (raft origin = hull bottom centre). */
export const SEAT = { y: 0.3, z: -0.15, kimX: 0.18, wingX: -0.18 };
export const OARLOCK = { x: 0.44, y: 0.49, z: 0 };
const INBOARD = 0.32, OAR_LEN = 1.6;
const ROW = { cycle: 2.1, burst: 7.5, period: 16 };

const SKIN = '#E8BC98';
const LOOK = {
  kim: { hoodie: '#3A4250', pants: '#4A5266', hair: '#1B1613', shoes: '#26272B', skin: SKIN },
  wing: { hoodie: '#C9A27A', pants: '#4A473F', hair: '#5B3A26', shoes: '#F0ECE4', skin: '#EDC3A2' },
};

// fill: characters are seen against the sunset (backlit) — a soft albedo fill keeps their colours readable.
const FILL = 0.3;
const cloth = (c: string, tint = '#ffffff') => natureMaterial({ color: c, tint, roughness: 0.88, fill: FILL });

interface Shared { yaw: { value: number } }

type Limb = { upper: THREE.Mesh; fore: THREE.Mesh; hand: THREE.Mesh };

function makeLimb(len: [number, number], r: [number, number], sleeve: THREE.Material, skin: THREE.Material, hand: THREE.BufferGeometry) {
  const up = new THREE.Mesh(cap(r[0], len[0] - r[0] * 1.2), sleeve);
  const fo = new THREE.Mesh(cap(r[1], len[1] - r[1] * 1.2), sleeve);
  const h = new THREE.Mesh(hand, skin);
  for (const m of [up, fo, h]) { m.castShadow = true; m.receiveShadow = true; }
  return { upper: up, fore: fo, hand: h } as Limb;
}

/** A seated person: returns the root group plus handles the animator drives. */
function buildPerson(kind: 'kim' | 'wing', geo: ReturnType<typeof useGeos>) {
  const L = LOOK[kind];
  const mats = {
    hoodie: cloth(L.hoodie), pants: cloth(L.pants), skin: cloth(L.skin), hair: natureMaterial({ color: L.hair, tint: kind === 'wing' ? '#B07C50' : '#4A403A', roughness: 0.6, fill: FILL }),
    shoes: cloth(L.shoes, '#F4F1EA'), dark: natureMaterial({ color: '#141416', roughness: 0.4 }),
  };
  const root = new THREE.Group();
  const torso = new THREE.Group(); root.add(torso);
  const body = new THREE.Mesh(geo.hoodie, mats.hoodie); body.castShadow = body.receiveShadow = true; torso.add(body);
  const head = new THREE.Group(); head.position.set(0, BODY.headY, 0); torso.add(head);
  const skull = new THREE.Mesh(geo.head, mats.skin); skull.castShadow = true; head.add(skull);
  head.add(new THREE.Mesh(geo.eyes, mats.dark));
  const hair = new THREE.Mesh(kind === 'kim' ? geo.short : geo.long, mats.hair); hair.castShadow = true; head.add(hair);
  if (kind === 'kim') head.add(new THREE.Mesh(geo.glasses, mats.dark));
  const neck = new THREE.Mesh(paint(soft(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 10)), (_p, _n, o) => { o.setScalar(0.8); }), mats.skin); neck.position.set(0, 0.53, 0); torso.add(neck);
  // legs (static seated pose, knees up): thigh + shin capsules, shoes
  for (const s of [-1, 1]) {
    const hip = new THREE.Vector3(s * 0.09, 0.03, 0.02), knee = new THREE.Vector3(s * 0.105, 0.1, 0.36), foot = new THREE.Vector3(s * 0.115, -0.19, 0.5);
    const th = new THREE.Mesh(cap(0.075, hip.distanceTo(knee) - 0.04), mats.pants);
    const sh = new THREE.Mesh(cap(0.06, knee.distanceTo(foot) - 0.05), mats.pants);
    span(th, hip, knee); span(sh, knee, foot);
    const shoe = new THREE.Mesh(geo.shoe, mats.shoes); shoe.position.copy(foot).add(new THREE.Vector3(0, -0.035, 0.0)); shoe.rotation.y = s * 0.12;
    for (const m of [th, sh, shoe]) { m.castShadow = m.receiveShadow = true; root.add(m); }
  }
  const arms = [makeLimb([BODY.upper, BODY.fore], [0.052, 0.045], mats.hoodie, mats.skin, geo.hand), makeLimb([BODY.upper, BODY.fore], [0.052, 0.045], mats.hoodie, mats.skin, geo.hand)];
  for (const a of arms) root.add(a.upper, a.fore, a.hand);
  return { root, torso, head, arms, mats };
}

function useGeos() {
  return useMemo(() => ({
    hoodie: hoodieGeometry(), head: headGeometry(), eyes: eyesGeometry(), short: shortHair(), long: longHair(),
    glasses: glassesGeometry(), hand: handGeometry(), shoe: shoeGeometry(), oar: oarGeometry(OAR_LEN),
  }), []);
}

// ---- scratch (no per-frame allocation) ----
const _e = new THREE.Euler(), _sh = new THREE.Vector3(), _el = new THREE.Vector3(), _ha = new THREE.Vector3(), _tg = new THREE.Vector3();
const _pole = new THREE.Vector3(), _dir = new THREE.Vector3(), _grip = new THREE.Vector3(), _lock = new THREE.Vector3(), _q = new THREE.Quaternion();
const _sun = new THREE.Vector3(...WORLD.sunDir).setY(0.25).normalize();
const Y = new THREE.Vector3(0, 1, 0);

/** shoulder position in person-local after torso lean/twist. */
function shoulder(torso: THREE.Group, side: number, out: THREE.Vector3) {
  _e.copy(torso.rotation);
  return out.set(side * BODY.shoulderX, BODY.shoulderY, -0.01).multiply(torso.scale).applyEuler(_e).add(torso.position);
}
function poseArm(limb: Limb, S: THREE.Vector3, target: THREE.Vector3, pole: THREE.Vector3) {
  solve2(S, target, BODY.upper, BODY.fore, pole, _el, _ha);
  span(limb.upper, S, _el); span(limb.fore, _el, _ha);
  limb.hand.position.copy(_ha);
  _dir.subVectors(_ha, _el).normalize();
  limb.hand.quaternion.setFromUnitVectors(Y, _dir);
}

/** oar pose for stroke phase p âˆˆ [0,1): drive 0..0.42, recovery after. Returns direction (outboard) + grip. */
function oarPose(p: number, side: number, active: number, dir: THREE.Vector3, grip: THREE.Vector3) {
  let yaw: number, pitch: number;
  if (p < 0.42) { const t = smooth01(p, 0, 0.42); yaw = 0.62 - 1.0 * t; pitch = 0.42; }
  else { const t = smooth01(p, 0.42, 1); yaw = -0.38 + 1.0 * t; pitch = 0.42 - 0.26 * Math.sin(t * Math.PI) - 0.1 * (1 - smooth01(p, 0.42, 0.52)) * 0; }
  // rest pose: oar trailing alongside, blade feathered just above the water
  yaw = yaw * active + 1.2 * (1 - active);
  pitch = pitch * active + 0.2 * (1 - active);
  dir.set(side * Math.cos(yaw) * Math.cos(pitch), -Math.sin(pitch), -Math.sin(yaw) * Math.cos(pitch));
  _lock.set(side * OARLOCK.x, OARLOCK.y, OARLOCK.z);
  grip.copy(_lock).addScaledVector(dir, -INBOARD);
}

export function People({ yaw }: Shared) {
  const geo = useGeos();
  const kim = useMemo(() => buildPerson('kim', geo), [geo]);
  const wing = useMemo(() => buildPerson('wing', geo), [geo]);
  const oarMat = useMemo(() => natureMaterial({ roughness: 0.6, fill: 0.2 }), []);
  const oars = useMemo(() => [new THREE.Mesh(geo.oar, oarMat), new THREE.Mesh(geo.oar, oarMat)], [geo, oarMat]);
  const thermos = useMemo(() => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(paint(soft(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 14)), () => 0), natureMaterial({ color: '#B8483E', roughness: 0.5, fill: 0.2 }));
    const cap = new THREE.Mesh(paint(soft(new THREE.CylinderGeometry(0.042, 0.042, 0.05, 14)), () => 0), natureMaterial({ color: '#D9D5CC', roughness: 0.4, fill: 0.2 }));
    body.position.y = 0.1; cap.position.y = 0.225;
    body.castShadow = cap.castShadow = true;
    g.add(body, cap); g.position.set(0, SEAT.y + 0.0, SEAT.z - 0.02);
    return g;
  }, []);
  useEffect(() => {
    kim.root.position.set(SEAT.kimX, SEAT.y, SEAT.z);
    wing.root.position.set(SEAT.wingX, SEAT.y, SEAT.z);
    for (const o of oars) o.castShadow = true;
    return () => {
      for (const p of [kim, wing]) Object.values(p.mats).forEach((m) => m.dispose());
      oarMat.dispose();
    };
  }, [kim, wing, oars, oarMat]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // --- phases ---
    const cyc = t % ROW.period;
    const active = smooth01(cyc, 0, 0.8) * (1 - smooth01(cyc, ROW.burst - 0.6, ROW.burst + 0.4));
    const p = (t / ROW.cycle) % 1;
    const rest = 1 - active;
    const breathe = Math.sin(t * 1.7);

    // --- Kim ---
    const drive = p < 0.42 ? smooth01(p, 0, 0.42) : 1 - smooth01(p, 0.42, 1);
    kim.torso.rotation.set((0.2 - 0.38 * drive) * active + 0.04 * rest, -0.08 * active * (drive - 0.5), -0.06 * rest);
    kim.torso.scale.set(1, 1 + breathe * 0.012, 1 + breathe * 0.01);
    // look: at Wingwing when resting (every so often), else forward with a glance at the oar
    const glance = rest * smooth01(Math.sin(t * 0.45 + 1), 0.1, 0.6);
    kim.head.rotation.set(-0.08 * active + 0.05 * glance, -0.55 * glance + 0.15 * active * Math.sin(t * 0.3), 0.1 * glance);
    oarPose(p, 1, active, _dir, _grip);
    oars[0].position.copy(_grip); oars[0].quaternion.setFromUnitVectors(Y, _dir);
    // both hands on the handle (person-local = raft-local âˆ’ seat)
    _pole.set(0.6, -0.3, -0.5);
    _tg.copy(_grip).addScaledVector(_dir, 0.02).sub(kim.root.position);
    poseArm(kim.arms[1], shoulder(kim.torso, 1, _sh), _tg, _pole);
    _tg.copy(_grip).addScaledVector(_dir, 0.13).sub(kim.root.position);
    // when resting his left hand drops to his knee instead
    if (active < 0.5) _tg.set(-0.06, 0.12, 0.33);
    _pole.set(-0.6, -0.3, -0.5);
    poseArm(kim.arms[0], shoulder(kim.torso, -1, _sh), _tg, _pole);

    // --- Wingwing ---
    const lean = rest * smooth01(cyc, ROW.burst + 0.6, ROW.burst + 2.2);
    const point = active * smooth01(Math.sin(t * 0.55 - 0.6), 0.15, 0.55);
    wing.torso.rotation.set(0.08 + 0.05 * point, 0.12 * point, -0.3 * lean);
    wing.torso.scale.set(1, 1 + Math.sin(t * 1.55 + 1) * 0.012, 1);
    // sun direction in raft-local: rotate world dir by âˆ’yaw
    const cy = Math.cos(-yaw.value), sy = Math.sin(-yaw.value);
    const sx = _sun.x * cy + _sun.z * sy, sz = -_sun.x * sy + _sun.z * cy;
    const sunYaw = Math.atan2(sx, sz);
    const wGlance = rest * (1 - lean) * 0.6 + lean * 0.15;
    wing.head.rotation.set(-0.05 + 0.1 * lean, THREE.MathUtils.clamp(sunYaw * 0.6, -1, 1) * point + 0.5 * wGlance, -0.35 * lean);
    // left arm: points at the sunset; otherwise rests on her lap
    shoulder(wing.torso, -1, _sh);
    if (point > 0.01) {
      _tg.set(sx, 0.28, sz).normalize().multiplyScalar(0.46).add(_sh);
      _ha.set(-0.08, 0.1, 0.26);
      _tg.lerp(_ha, 1 - point);
    } else _tg.set(-0.08, 0.1, 0.26);
    _pole.set(-0.5, -0.5, -0.2);
    poseArm(wing.arms[0], _sh, _tg, _pole);
    // right arm: hooks around Kim's arm when leaning, else hand on her knee
    shoulder(wing.torso, 1, _sh);
    _tg.set(0.07, 0.11, 0.3).lerp(_ha.set(0.28, 0.24, 0.12), lean);
    _pole.set(0.5, -0.6, -0.3);
    poseArm(wing.arms[1], _sh, _tg, _pole);
    // shipped oar on her side
    oarPose(0, -1, 0, _dir, _grip);
    _q.setFromUnitVectors(Y, _dir);
    oars[1].position.copy(_grip); oars[1].quaternion.copy(_q);
  });

  return (
    <group>
      <primitive object={kim.root} />
      <primitive object={wing.root} />
      <primitive object={oars[0]} />
      <primitive object={oars[1]} />
      <primitive object={thermos} />
    </group>
  );
}
