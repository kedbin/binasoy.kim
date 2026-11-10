/**
 * SHARED WORLD LAYOUT — every scene module must use these constants. Units = metres. Y up.
 * Van cargo area is centred on X. +Z points OUT of the open tailgate toward the lake.
 *
 *   front seats (-Z)  ←  cargo/bed  →  tailgate (+Z)  →  bumper  →  grass → beach → lake (+Z)
 */
export const VAN = {
  innerWidth: 1.55,      // x: -0.775 .. +0.775
  floorY: 0.55,          // cargo floor height above ground
  bedTopY: 0.78,         // mattress top surface
  roofY: 1.72,           // headliner height (interior)
  backZ: 1.15,           // tailgate opening plane
  frontZ: -1.35,         // behind 2nd/1st row seats (bed head end)
  tailgateHingeY: 1.78,  // liftgate hinge
  sunroof: { z0: -1.1, z1: 0.6, halfWidth: 0.5 }, // two glass panels in the roof
} as const;

export const WORLD = {
  groundY: 0,
  grassToZ: 9,           // grass bank ends, fence at z≈7
  fenceZ: 7,
  beachZ0: 9,
  shoreZ: 13,            // water starts
  waterY: -0.15,
  lakeFarZ: 260,         // far shore
  hillsZ: 220,
  sunDir: [-0.45, 0.035, 1] as [number, number, number], // low sun, slightly left, beyond the lake
} as const;

/** Anchors for interactive props (hotspots). */
export const ANCHORS = {
  laptop: { pos: [0.18, VAN.bedTopY + 0.02, 0.35] as const, rotY: Math.PI + 0.25 },
  photoWall: { pos: [-0.745, 1.36, -0.52] as const, rotY: Math.PI / 2 }, // photo garland across the sliding-door window
  stickers: { pos: [0.762, 0.915, 0.08] as const, rotY: -Math.PI / 2 },  // right side cubby door (below sill)
  clipboard: { pos: [-0.5, VAN.bedTopY + 0.03, 0.75] as const, rotY: 0.4 },
  raft: { pos: [-3, WORLD.waterY, 26] as const },
  kayak: { pos: [3.6, -0.3, 11.2] as const }, // on the sand, nose toward the water
} as const;

/** Camera presets per view. position / target in world space. */
export const CAMERA: Record<string, { pos: [number, number, number]; target: [number, number, number]; fov: number }> = {
  intro:     { pos: [2.6, 1.9, 7.4],  target: [0, 1.0, -0.6],  fov: 46 },  // outside, looking INTO the van
  seat:      { pos: [0, 1.22, -1.05], target: [0, 1.0, 6],     fov: 62 },  // lying against pillows, facing the lake
  laptop:    { pos: [0.12, 1.12, -0.05], target: [0.18, 0.92, 0.35], fov: 40 },
  outside:   { pos: [0, 1.45, 2.2],   target: [-2, 2.2, 60],   fov: 55 },  // at bumper looking at lake
  wall:      { pos: [-0.1, 1.4, -0.52], target: [-0.71, 1.4, -0.52], fov: 50 },  // distance is refitted in CameraRig
  stickers:  { pos: [0.18, 0.96, 0.08], target: [0.762, 0.915, 0.08], fov: 46 },
  clipboard: { pos: [-0.4, 1.25, 0.45], target: [-0.5, 0.8, 0.75], fov: 45 },
};

export const PALETTE = {
  peach: '#F4C7A1', lavender: '#B9A7C9', lake: '#8FA3B8', maple: '#D9682B', gold: '#E3A63B',
  pine: '#2F4A3A', charcoal: '#1E1F22', fairy: '#FFD58A', duvet: '#EDE8E0', mustard: '#D9A93A',
  gingham: '#B8483E', ginghamGreen: '#5E7D4E', vanWhite: '#F2F2EE', sand: '#CDB894', grass: '#6E7B45',
} as const;
