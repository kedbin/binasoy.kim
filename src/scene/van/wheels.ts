// Wheels: lathe tyre with sidewall bulge + tread grooves, 5-spoke alloy rim, centre cap. Built at origin, axis = X.
import * as THREE from 'three';
import { merge, rbox, type G } from './util';

export function makeWheel(r = 0.34, w = 0.23) {
  // tyre: lathe around Y then rotate to X. Profile (radius, y)
  const pts: THREE.Vector2[] = [];
  const ri = r * 0.64, hw = w / 2;
  const prof: [number, number][] = [
    [ri, -hw * 0.82], [ri + 0.02, -hw * 0.95], [r * 0.88, -hw * 1.02], [r * 0.97, -hw * 0.9], [r, -hw * 0.62],
    [r, hw * 0.62], [r * 0.97, hw * 0.9], [r * 0.88, hw * 1.02], [ri + 0.02, hw * 0.95], [ri, hw * 0.82],
  ];
  for (const [x, y] of prof) pts.push(new THREE.Vector2(x, y));
  const tyre = new THREE.LatheGeometry(pts, 40);
  // tread grooves: shrink a few radial bands
  const p = tyre.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const rr = Math.hypot(x, z);
    if (rr > r * 0.99 && Math.abs(y) < hw * 0.6) {
      const k = Math.abs(Math.sin((y / hw) * Math.PI * 2.0)) < 0.25 ? 0.985 : 1;
      p.setX(i, x * k); p.setZ(i, z * k);
    }
  }
  tyre.computeVertexNormals();
  tyre.rotateZ(Math.PI / 2);

  // rim: dished disc + barrel + 5 tapered spokes + cap
  const rimR = ri - 0.005;
  const parts: G[] = [];
  const barrel = new THREE.CylinderGeometry(rimR, rimR, w * 0.82, 32, 1, true);
  barrel.rotateZ(Math.PI / 2);
  parts.push(barrel);
  const lip = new THREE.TorusGeometry(rimR - 0.006, 0.01, 6, 40);
  lip.rotateY(Math.PI / 2); lip.translate(hw * 0.78, 0, 0);
  parts.push(lip);
  const hub = new THREE.CylinderGeometry(0.06, 0.07, 0.05, 20);
  hub.rotateZ(-Math.PI / 2); hub.translate(hw * 0.62, 0, 0);
  parts.push(hub);
  for (let k = 0; k < 5; k++) {
    // spoke: tapered, slightly dished outward toward the centre
    const s = new THREE.CylinderGeometry(0.018, 0.03, rimR - 0.06, 6, 1);
    s.translate(0, (rimR - 0.06) / 2 + 0.05, 0);
    s.scale(1, 1, 1.25);
    const pp = s.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pp.count; i++) pp.setX(i, pp.getX(i) * 0.9 + (1 - pp.getY(i) / rimR) * 0.02);
    s.computeVertexNormals();
    s.rotateX((k / 5) * Math.PI * 2);
    s.translate(hw * 0.62, 0, 0);
    parts.push(s);
  }
  const rim = merge(parts, false);

  const dark: G[] = [];
  const back = new THREE.CircleGeometry(rimR, 32); back.rotateY(Math.PI / 2); back.translate(hw * 0.2, 0, 0);
  dark.push(back); // dark brake-drum behind spokes
  const cap = new THREE.SphereGeometry(0.035, 12, 8); cap.scale(0.5, 1, 1); cap.translate(hw * 0.66, 0, 0);
  dark.push(cap);
  const caliper = rbox(0.04, 0.12, 0.07, hw * 0.3, 0.1, -0.08, 0.015, 2);
  dark.push(caliper);
  return { tyre, rim, dark: merge(dark, false) };
}
