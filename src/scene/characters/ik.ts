// Tiny allocation-free helpers for posing capsule limbs (O3).
import * as THREE from 'three';

const Y = new THREE.Vector3(0, 1, 0);
const _d = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Vector3(), _m = new THREE.Vector3();

/** Place a Y-aligned segment mesh (centred geometry of length `len`) so it spans a → b. */
export function span(o: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  _d.subVectors(b, a);
  const l = _d.length() || 1e-4;
  o.position.addVectors(a, b).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(Y, _d.divideScalar(l));
}

/**
 * Two-bone IK: shoulder S, target H, bone lengths a/b, pole hint (direction the elbow should bend toward).
 * Writes the elbow into `elbow` and the (reach-clamped) hand into `hand`.
 */
export function solve2(S: THREE.Vector3, H: THREE.Vector3, a: number, b: number, pole: THREE.Vector3, elbow: THREE.Vector3, hand: THREE.Vector3) {
  _d.subVectors(H, S);
  let d = _d.length();
  const max = (a + b) * 0.999, min = Math.abs(a - b) + 1e-3;
  d = Math.min(max, Math.max(min, d));
  _d.normalize();
  hand.copy(S).addScaledVector(_d, d);
  const cosA = (a * a + d * d - b * b) / (2 * a * d);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  // perpendicular toward the pole
  _p.copy(pole).addScaledVector(_d, -pole.dot(_d));
  if (_p.lengthSq() < 1e-6) _p.set(0, -1, 0).addScaledVector(_d, _d.y);
  _p.normalize();
  _e.copy(S).addScaledVector(_d, a * cosA).addScaledVector(_p, a * sinA);
  elbow.copy(_e);
}

export const tmpV = () => new THREE.Vector3();
export { _m };
