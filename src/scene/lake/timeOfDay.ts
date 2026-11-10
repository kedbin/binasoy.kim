// Shared animated uniforms for lake materials. Now backed by the damped env (env/live.ts):
// 0 = golden/day, 1 = night. Kept as a thin alias so existing imports keep working.
import { envUniforms } from '../env/live';

export const nightUniform = envUniforms.uNight;
export const timeUniform = envUniforms.uTime;

/** @deprecated EnvDriver (env/EnvLighting.tsx) drives all env uniforms now. */
export function useTimeOfDayDriver() {}
