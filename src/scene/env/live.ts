// OWNER: Opus O1. Live, damped environment state derived from LIGHTS[timeOfDay] (+ SEASONS[season]).
// Every look-dev consumer (lights, sky, water, hills, post) reads from `live` / `envUniforms` so a
// time-of-day change cross-fades smoothly and a new preset never needs module edits.
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { LIGHTS, type LightPreset, type TimeOfDay } from './presets';
import { useScene } from '../../state/store';

type ColorKeys = {
  [K in keyof LightPreset]: LightPreset[K] extends string ? K : never;
}[keyof LightPreset];
type NumKeys = {
  [K in keyof LightPreset]: LightPreset[K] extends number ? K : never;
}[keyof LightPreset];
type VecKeys = 'sunDir' | 'skySun' | 'rimDir';

const COLOR_KEYS: ColorKeys[] = [
  'sunColor', 'hemiSky', 'hemiGround', 'fog', 'rimColor', 'envHorizon', 'envTop', 'bounceColor',
  'shaftColor', 'practicalColor', 'haze', 'hillLit', 'hillShade', 'hillRim',
];
const NUM_KEYS: NumKeys[] = [
  'sunIntensity', 'hemiIntensity', 'fogNear', 'fogFar', 'interior', 'exposure', 'rimIntensity', 'envIntensity',
  'bounce', 'shaft', 'stars', 'moon', 'hazeAmount', 'mist', 'bloom', 'bloomThreshold', 'ao', 'vignette',
];
const VEC_KEYS: VecKeys[] = ['sunDir', 'skySun', 'rimDir'];
const SKY_KEYS = ['horizon', 'low', 'mid', 'zenith', 'cloud', 'cloudLit', 'glow'] as const;
type SkyKey = (typeof SKY_KEYS)[number];

export interface LiveEnv {
  c: Record<ColorKeys, THREE.Color>;
  n: Record<NumKeys, number>;
  v: Record<VecKeys, THREE.Vector3>;
  sky: Record<SkyKey, THREE.Color>;
  water: { deep: THREE.Color; shine: THREE.Color; glitter: number };
  /** 0 = golden/day, 1 = night (damped). Handy for binary-ish switches (fireflies, stars). */
  night: number;
}

function resolve(p: LightPreset): LiveEnv {
  const c = {} as LiveEnv['c'];
  const n = {} as LiveEnv['n'];
  const v = {} as LiveEnv['v'];
  const sky = {} as LiveEnv['sky'];
  for (const k of COLOR_KEYS) c[k] = new THREE.Color(p[k]);
  for (const k of NUM_KEYS) n[k] = p[k];
  for (const k of VEC_KEYS) v[k] = new THREE.Vector3(...p[k]).normalize();
  for (const k of SKY_KEYS) sky[k] = new THREE.Color(p.sky[k]);
  return { c, n, v, sky, water: { deep: new THREE.Color(p.water.deep), shine: new THREE.Color(p.water.shine), glitter: p.water.glitter }, night: 0 };
}

const TARGETS = Object.fromEntries(
  (Object.keys(LIGHTS) as TimeOfDay[]).map((t) => {
    const r = resolve(LIGHTS[t]);
    r.night = t === 'night' ? 1 : 0;
    return [t, r];
  }),
) as Record<TimeOfDay, LiveEnv>;

/** The current (damped) environment. Mutated in place every frame — never reassign. */
export const live: LiveEnv = resolve(LIGHTS[useScene.getState().timeOfDay]);
live.night = TARGETS[useScene.getState().timeOfDay].night;

/** Shared shader uniforms (same objects referenced by every material — update once per frame). */
export const envUniforms = {
  uTime: { value: 0 },
  uNight: { value: live.night },
  uSunDir: { value: live.v.skySun },          // sky disk / glitter direction
  uKeyDir: { value: live.v.sunDir },          // shadow-casting key direction
  uSunColor: { value: live.c.sunColor },
  uSkyHorizon: { value: live.sky.horizon },
  uSkyLow: { value: live.sky.low },
  uSkyMid: { value: live.sky.mid },
  uSkyZenith: { value: live.sky.zenith },
  uCloud: { value: live.sky.cloud },
  uCloudLit: { value: live.sky.cloudLit },
  uGlow: { value: live.sky.glow },
  uStars: { value: live.n.stars },
  uMoon: { value: live.n.moon },
  uHaze: { value: live.c.haze },
  uHazeAmt: { value: live.n.hazeAmount },
  uMist: { value: live.n.mist },
  uHillLit: { value: live.c.hillLit },
  uHillShade: { value: live.c.hillShade },
  uHillRim: { value: live.c.hillRim },
  uWaterDeep: { value: live.water.deep },
  uWaterShine: { value: live.water.shine },
  uGlitter: { value: live.water.glitter },
  uPractical: { value: live.c.practicalColor },
  uInterior: { value: live.n.interior },
};

const RATE = 1.4; // damping λ — ~2 s cross-fade

/** Call once (in <EnvDriver/>). Damps `live` toward the active preset and syncs uniforms. */
export function useEnvDriver() {
  useFrame((state, dt) => {
    const d = Math.min(dt, 0.1);
    const k = 1 - Math.exp(-RATE * d);
    const tgt = TARGETS[useScene.getState().timeOfDay] ?? TARGETS.golden;
    for (const key of COLOR_KEYS) live.c[key].lerp(tgt.c[key], k);
    for (const key of NUM_KEYS) live.n[key] += (tgt.n[key] - live.n[key]) * k;
    for (const key of VEC_KEYS) live.v[key].lerp(tgt.v[key], k).normalize();
    for (const key of SKY_KEYS) live.sky[key].lerp(tgt.sky[key], k);
    live.water.deep.lerp(tgt.water.deep, k);
    live.water.shine.lerp(tgt.water.shine, k);
    live.water.glitter += (tgt.water.glitter - live.water.glitter) * k;
    live.night += (tgt.night - live.night) * k;

    const u = envUniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uNight.value = live.night;
    u.uStars.value = live.n.stars;
    u.uMoon.value = live.n.moon;
    u.uHazeAmt.value = live.n.hazeAmount;
    u.uMist.value = live.n.mist;
    u.uGlitter.value = live.water.glitter;
    u.uInterior.value = live.n.interior;
  });
}
