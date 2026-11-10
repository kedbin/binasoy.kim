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
    sunDir: [-0.45, 0.07, 1], sunColor: '#FFB27A', sunIntensity: 2.6,
    hemiSky: '#F7D2B0', hemiGround: '#6A5A3E', hemiIntensity: 0.75,
    fog: '#E7C2B4', fogNear: 180, fogFar: 1100, interior: 1, exposure: 1,
  },
  // Placeholder for the Day phase.
  day: {
    sunDir: [-0.3, 0.6, 0.6], sunColor: '#FFF4E0', sunIntensity: 3.0,
    hemiSky: '#BFD9F2', hemiGround: '#5E6B45', hemiIntensity: 0.9,
    fog: '#C9DCEB', fogNear: 220, fogFar: 1300, interior: 0.4, exposure: 1,
  },
  night: {
    sunDir: [0.4, 0.5, 0.8], sunColor: '#8FA0D0', sunIntensity: 0.25,   // moonlight
    hemiSky: '#3A4466', hemiGround: '#0D0F14', hemiIntensity: 0.22,
    fog: '#0E1220', fogNear: 120, fogFar: 900, interior: 1.6, exposure: 1,
  },
};
