// Shared terrain height + footprint helpers so scatter (grass, rocks, leaves, fence, kayak) sits ON the ground.
import { WORLD } from '../layout';
import { fbm2, smooth01 } from './util';

/** Van footprint on the ground (x half-width, z range), incl. a little margin. */
export const VAN_FOOT = { hx: 1.05, z0: -3.9, z1: 1.75 };

/** Flatten factor around the van so tyres sit on level ground. */
function vanFlat(x: number, z: number) {
  const dx = Math.max(0, Math.abs(x) - 1.6), dz = Math.max(0, z - 2.4, -4.6 - z);
  return smooth01(Math.hypot(dx, dz), 0, 2.5);
}

export function groundHeight(x: number, z: number) {
  const n = fbm2(x * 0.15, z * 0.15, 3);
  let y = 0;
  const b0 = WORLD.beachZ0 - 1.5;
  // grass bank steps down to a dry beach that stays just above the waterline, then shelves under the lake
  if (z > b0) y = -0.07 * smooth01(z, b0, WORLD.beachZ0 + 0.5) - 0.06 * smooth01(z, WORLD.beachZ0 + 0.5, WORLD.shoreZ - 0.2);
  if (z > WORLD.shoreZ - 0.4) y -= 0.25 * (z - (WORLD.shoreZ - 0.4));
  const amp = z < WORLD.beachZ0 ? 0.14 : 0.04;
  y += (n - 0.5) * amp * vanFlat(x, z);
  // gentle rise into the forest behind / to the sides
  y += 0.35 * smooth01(Math.abs(x), 14, 40) + 0.4 * smooth01(-z, 12, 45);
  return y;
}

/** 0 = grass, 1 = sand (matches the ground paint). */
export function beachMask(x: number, z: number) {
  return smooth01(z + Math.sin(x * 0.2) * 0.8 + Math.sin(x * 0.53 + 1) * 0.3, WORLD.beachZ0 - 0.6, WORLD.beachZ0 + 0.6);
}

export function inVan(x: number, z: number, pad = 0) {
  return Math.abs(x) < VAN_FOOT.hx + pad && z > VAN_FOOT.z0 - pad && z < VAN_FOOT.z1 + pad;
}

/** Tyre-track centre-lines: van drove in from the back-left track, curving under the van. */
export function trackX(off: number, z: number) {
  const k = Math.max(0, -z - 3.2);
  return off - 0.011 * k * k - 0.002 * k * k * k * 0.1;
}
export const TRACK_OFFS = [-0.84, 0.84];
