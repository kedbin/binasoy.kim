// Liftgate (local space: hinge at origin, panel hangs along -Y when closed; +Z = outside paint, -Z = inner trim).
// Built as a gently curved panel: outer skin with window opening, smoked glass, spoiler, wiper, tail-light wings,
// inner charcoal trim with pull handle + dome lights.
import * as THREE from 'three';
import { extrude, merge, rb, rbox, roundPoly, type G } from './util';

export const GATE = { w: 1.76, h: 1.24, win: { x: 0.64, y0: -0.78, y1: -0.14 } };

/** Bend a gate-local geometry so it bulges outward (+z) in the middle (convex hatch). */
function bow(g: G, amt = 0.05) {
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const u = x / (GATE.w / 2), v = (y + GATE.h / 2) / (GATE.h / 2);
    p.setZ(i, p.getZ(i) + amt * (1 - u * u) * 0.6 + amt * (1 - v * v) * 0.4 - 0.02 * Math.max(0, -y - 0.9));
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

export function makeGate() {
  const { w, h, win } = GATE;
  // outer skin: rounded slab with window hole
  const outer = new THREE.Shape();
  roundPoly(outer, [[-w / 2, -h], [w / 2, -h], [w / 2 - 0.02, 0], [-w / 2 + 0.02, 0]], [0.08, 0.08, 0.06, 0.06]);
  outer.holes.push(roundPoly(new THREE.Path(), [[-win.x, win.y0], [-win.x + 0.04, win.y1], [win.x - 0.04, win.y1], [win.x, win.y0]], 0.07));
  const skin = bow(extrude(outer, 0.03, 0.018, 3, 10).translate(0, 0, -0.01), 0.05);

  // inner trim: charcoal panel recessed inside the skin
  const inner = new THREE.Shape();
  roundPoly(inner, [[-w / 2 + 0.05, -h + 0.05], [w / 2 - 0.05, -h + 0.05], [w / 2 - 0.07, -0.05], [-w / 2 + 0.07, -0.05]], 0.06);
  inner.holes.push(roundPoly(new THREE.Path(), [[-win.x - 0.03, win.y0 - 0.03], [-win.x + 0.01, win.y1 + 0.03], [win.x - 0.01, win.y1 + 0.03], [win.x + 0.03, win.y0 - 0.03]], 0.08));
  const trim = bow(extrude(inner, 0.025, 0.012, 2, 8).translate(0, 0, -0.06), 0.05);

  const trimParts: G[] = [trim];
  // pull handle recess + strap
  trimParts.push(bow(rbox(0.22, 0.05, 0.03, 0, -h + 0.16, -0.08, 0.012, 2), 0.05));
  trimParts.push(bow(rbox(0.04, 0.22, 0.012, 0.32, -h + 0.25, -0.078, 0.005, 1), 0.05));

  // smoked glass + black frit band
  const glassSh = roundPoly(new THREE.Shape(), [[-win.x, win.y0], [win.x, win.y0], [win.x - 0.04, win.y1], [-win.x + 0.04, win.y1]], 0.07);
  const glass = bow(new THREE.ShapeGeometry(glassSh, 8).translate(0, 0, 0.026), 0.05);

  const black: G[] = [];
  // spoiler: lofted wedge at top
  const sp = new THREE.Shape();
  sp.moveTo(0, 0); sp.lineTo(0.12, 0.0); sp.quadraticCurveTo(0.16, 0.02, 0.13, 0.04); sp.lineTo(0, 0.05); sp.closePath();
  const spoiler = extrude(sp, w - 0.14, 0.012, 2, 6);
  spoiler.rotateY(Math.PI / 2); // shape x -> -z? we want +z outward
  spoiler.translate(-(w - 0.14) / 2, 0, 0);
  // after rotateY(+90): shape x -> world -z; flip to +z
  spoiler.scale(1, 1, -1);
  spoiler.translate(0, -0.06, 0.02);
  const paintParts: G[] = [skin, bow(spoiler, 0.0)];
  black.push(rb(-0.3, 0.3, -0.035, -0.02, 0.05, 0.16, 0.006, 1)); // high-mount brake light housing
  // wiper: pivot + arm + blade lying on glass
  black.push(rbox(0.05, 0.05, 0.03, 0, win.y0 - 0.04, 0.045, 0.015, 2));
  const arm = rbox(0.018, 0.4, 0.014, 0, 0, 0, 0.006, 1);
  arm.translate(0, 0.2, 0); arm.rotateZ(0.5); arm.translate(0, win.y0 - 0.04, 0.06);
  black.push(arm);
  const blade = rbox(0.012, 0.42, 0.02, 0, 0, 0, 0.005, 1);
  blade.rotateZ(0.5); blade.translate(-0.18, win.y0 + 0.13, 0.05);
  black.push(blade);
  // licence-plate recess (dark surround), plate is a separate textured quad
  black.push(bow(rbox(0.42, 0.22, 0.02, 0, -h + 0.28, 0.035, 0.03, 2), 0.05));
  // camera + latch
  black.push(rbox(0.05, 0.025, 0.02, 0, -h + 0.42, 0.05, 0.008, 1));
  // badge
  const chrome: G[] = [bow(rbox(0.16, 0.025, 0.012, 0.0, -h + 0.5, 0.05, 0.008, 1), 0.05)];
  chrome.push(bow(rbox(0.62, 0.02, 0.012, 0, -h + 0.43, 0.048, 0.006, 1), 0.05)); // chrome garnish

  // tail-light wings on the gate edges (wrap the corners)
  const tail: G[] = [];
  for (const s of [1, -1]) tail.push(bow(rbox(0.14, 0.34, 0.04, s * (w / 2 - 0.09), -h + 0.62, 0.04, 0.02, 2), 0.05));

  // dome lights on the inner trim + gate strut balls
  const dome: G[] = [];
  for (const s of [1, -1]) dome.push(rbox(0.16, 0.05, 0.02, s * 0.42, -0.16, -0.085, 0.015, 2));

  const plateY = -h + 0.28;
  return {
    paint: merge(paintParts, false), trim: merge(trimParts, false), glass, black: merge(black, false),
    chrome: merge(chrome, false), tail: merge(tail, false), dome: merge(dome, false), plateY,
  };
}
