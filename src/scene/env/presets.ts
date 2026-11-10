/**
 * ENVIRONMENT CONTRACT (Opus coordinator). Time of day × season.
 * Today only { timeOfDay: 'golden' | 'night', season: 'fall' } is fully art-directed.
 * Polish work MUST read colours/intensities from here (or add fields here) instead of hardcoding,
 * so 'day' and spring/summer/winter can be added later by filling in presets — not by rewriting modules.
 */
export type TimeOfDay = 'golden' | 'day' | 'night';
export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export interface SeasonPalette {
  /** canopy colours for deciduous trees + far hills (fall = maple oranges, summer = greens, winter = bare/snow). */
  foliage: string[];
  conifer: string[];
  grass: string[];
  ground: string;          // dirt/sand tint
  leafFall: string[];      // falling particles (leaves / blossoms / snowflakes)
  particle: 'leaves' | 'blossoms' | 'none' | 'snow';
  snow: number;            // 0..1 snow cover on ground/roofs/tree tops
  waterFrozen: number;     // 0..1 (winter could be partially iced)
}

export interface LightPreset {
  sunDir: [number, number, number];
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  fog: string;
  fogNear: number;
  fogFar: number;
  interior: number;        // multiplier for van practical lights (fairy lights, puck lamp)
  exposure: number;
  // ---- Look-dev fields (O1). All colours/intensities for light, sky, haze and post come from here. ----
  /** Visible sun/moon disk direction in the sky (can sit lower than the shadow-casting key). */
  skySun: [number, number, number];
  /** Cool counter light from the sky opposite the sun: rims silhouettes, lifts shadow sides. */
  rimDir: [number, number, number];
  rimColor: string;
  rimIntensity: number;
  /** Image-based light (generated Lightformer rig) strength for PBR materials. */
  envIntensity: number;
  envHorizon: string;      // warm band on the sun side of the env map
  envTop: string;          // sky dome in the env map
  /** Warm bounce inside the van (sun spill off the duvet) — day/golden only. */
  bounce: number;
  bounceColor: string;
  /** Volumetric sun shaft through the open hatch (0 = off). */
  shaft: number;
  shaftColor: string;
  /** Warm practical colour inside the van at night (scaled by `interior`). */
  practicalColor: string;
  /** Gain + falloff applied to the van's own practical point lights (warm pools with darker edges). */
  practicalGain: number;
  practicalDistance: number;
  /** Sky gradient (horizon → zenith) + clouds. */
  sky: { horizon: string; low: string; mid: string; zenith: string; cloud: string; cloudLit: string; glow: string };
  stars: number;           // 0..1
  moon: number;            // 0..1 moon disk visibility (drawn at skySun)
  /** Aerial perspective toward the far hills + low mist on the lake. */
  haze: string;
  hazeAmount: number;      // 0..1 extra haze per hill layer
  mist: number;            // 0..1 low mist band at the far shore
  /** Far hills: lit/shadow tints multiplied over the season foliage. */
  hillLit: string;
  hillShade: string;
  hillRim: string;         // backlit crown edges
  water: { deep: string; shine: string; glitter: number };
  /** Post-processing. */
  bloom: number;
  bloomThreshold: number;
  ao: number;
  vignette: number;
  saturation: number;      // post grade (AgX is desaturating; -1..1)
  contrast: number;        // post grade (-1..1)
}

export const SEASONS: Record<Season, SeasonPalette> = {
  fall: {
    foliage: ['#D9682B', '#C4452C', '#E3A63B', '#E8B44A', '#B8642A', '#8E3B26'],
    conifer: ['#2F4A3A', '#3B5A3F', '#28402F'],
    grass: ['#6E7B45', '#8A8A4E', '#A79A62'],
    ground: '#CDB894',
    leafFall: ['#D9682B', '#C4452C', '#E3A63B', '#B8642A'],
    particle: 'leaves',
    snow: 0,
    waterFrozen: 0,
  },
  // Placeholders — to be art-directed in the Seasons phase.
  summer: { foliage: ['#4F7A3A', '#5E8B42', '#3F6A33'], conifer: ['#2F4A3A', '#3B5A3F'], grass: ['#6C8F3E', '#7FA14A'], ground: '#D6C29A', leafFall: [], particle: 'none', snow: 0, waterFrozen: 0 },
  spring: { foliage: ['#9CC46B', '#F2B8C6', '#B9D98A'], conifer: ['#33503D', '#3E5E45'], grass: ['#7FA850', '#93B95C'], ground: '#C9B48E', leafFall: ['#F7C9D4', '#FFFFFF'], particle: 'blossoms', snow: 0, waterFrozen: 0 },
  winter: { foliage: ['#6B5A4C', '#7A6A5C'], conifer: ['#2A3F33', '#334A3C'], grass: ['#E8EEF2', '#D9E2EA'], ground: '#E4EAF0', leafFall: ['#FFFFFF'], particle: 'snow', snow: 1, waterFrozen: 0.6 },
};

export const LIGHTS: Record<TimeOfDay, LightPreset> = {
  golden: {
    // Key sits ~12° up so shadows are long but readable; the sky disk itself hugs the horizon.
    sunDir: [-0.5, 0.2, 1], sunColor: '#FFA460', sunIntensity: 4.2,
    hemiSky: '#B9A8D8', hemiGround: '#5A3E2C', hemiIntensity: 0.5,
    fog: '#E7C2B4', fogNear: 60, fogFar: 1100, interior: 1, exposure: 0.9,
    skySun: [-0.45, 0.035, 1],
    rimDir: [0.35, 0.55, -1], rimColor: '#9C98E0', rimIntensity: 0.7,
    envIntensity: 0.45, envHorizon: '#FFA868', envTop: '#9C9AC8',
    bounce: 0.45, bounceColor: '#FFB98A',
    shaft: 1, shaftColor: '#FFC48A',
    practicalColor: '#FFC27A', practicalGain: 1, practicalDistance: 4,
    sky: { horizon: '#FFCC94', low: '#F8B4A0', mid: '#C4AFD4', zenith: '#8DA6D6', cloud: '#F2A9A0', cloudLit: '#FFD7AE', glow: '#FF9050' },
    stars: 0, moon: 0,
    haze: '#E6B8B0', hazeAmount: 1, mist: 0.3,
    hillLit: '#F4C9A0', hillShade: '#6F5C78', hillRim: '#FFB070',
    water: { deep: '#5C6680', shine: '#FFE0C0', glitter: 1 },
    bloom: 0.55, bloomThreshold: 0.92, ao: 1, vignette: 0.45, saturation: 0.28, contrast: 0.12,
  },
  // Placeholder for the Day phase.
  day: {
    sunDir: [-0.3, 0.6, 0.6], sunColor: '#FFF4E0', sunIntensity: 3.0,
    hemiSky: '#BFD9F2', hemiGround: '#5E6B45', hemiIntensity: 0.9,
    fog: '#C9DCEB', fogNear: 220, fogFar: 1300, interior: 0.4, exposure: 1,
    skySun: [-0.3, 0.6, 0.6],
    rimDir: [0.3, 0.5, -1], rimColor: '#CFE0F5', rimIntensity: 0.4,
    envIntensity: 0.8, envHorizon: '#FFF2DA', envTop: '#9CC2EA',
    bounce: 0.4, bounceColor: '#FFF1DE',
    shaft: 0.2, shaftColor: '#FFF4E0',
    practicalColor: '#FFC27A', practicalGain: 1, practicalDistance: 4,
    sky: { horizon: '#E4EEF6', low: '#CFE2F2', mid: '#A9CBEA', zenith: '#6FA2D8', cloud: '#F4F6F8', cloudLit: '#FFFFFF', glow: '#FFF6E0' },
    stars: 0, moon: 0,
    haze: '#CFE0EE', hazeAmount: 0.8, mist: 0.1,
    hillLit: '#FFF6E6', hillShade: '#8A9AA8', hillRim: '#FFF2D8',
    water: { deep: '#4C6A86', shine: '#FFFFFF', glitter: 0.6 },
    bloom: 0.3, bloomThreshold: 1.0, ao: 1, vignette: 0.35, saturation: 0.15, contrast: 0.06,
  },
  night: {
    sunDir: [0.75, 0.85, 0.25], sunColor: '#8FA6E0', sunIntensity: 0.85,   // high + side: roof shades the bed   // moonlight key
    hemiSky: '#3C4A7A', hemiGround: '#0E1018', hemiIntensity: 0.42,
    fog: '#0E1220', fogNear: 40, fogFar: 900, interior: 1.6, exposure: 0.8,
    skySun: [0.42, 0.24, 1],
    rimDir: [-0.3, 0.5, -1], rimColor: '#5A6CB0', rimIntensity: 0.4,
    envIntensity: 0.18, envHorizon: '#2A3458', envTop: '#141A30',
    bounce: 0, bounceColor: '#FFB98A',
    shaft: 0, shaftColor: '#FFC48A',
    practicalColor: '#FFB566', practicalGain: 0.3, practicalDistance: 2.2,
    sky: { horizon: '#1C2340', low: '#141B33', mid: '#0C1226', zenith: '#05081A', cloud: '#161C30', cloudLit: '#2A3352', glow: '#3A4A80' },
    stars: 1, moon: 1,
    haze: '#1E2744', hazeAmount: 0.8, mist: 0.4,
    hillLit: '#5E70A8', hillShade: '#232C48', hillRim: '#9FB4EC',
    water: { deep: '#0E1628', shine: '#9FB4EC', glitter: 0.6 },
    bloom: 0.8, bloomThreshold: 0.92, ao: 0.9, vignette: 0.55, saturation: 0.05, contrast: 0.08,
  },
};
