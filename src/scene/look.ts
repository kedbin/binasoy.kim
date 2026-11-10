// Drag-to-look with inertia. Mutable singleton (no React state) read by CameraRig every frame.
// Pointer + touch via Pointer Events on the canvas element; arrow keys nudge. Clamped yaw/pitch per view.
import { useScene } from '../state/store';

export const look = {
  yaw: 0, pitch: 0,       // radians, current offset from the preset's forward direction
  vYaw: 0, vPitch: 0,     // radians / s, inertia after release
  dragging: false,
  /** px moved in the current gesture: hotspots ignore clicks after a real drag */
  moved: 0,
};

export const LOOK_LIMITS: Record<string, { yaw: number; pitch: number }> = {
  seat: { yaw: 0.85, pitch: 0.38 },
  outside: { yaw: 0.7, pitch: 0.28 },
  intro: { yaw: 0.25, pitch: 0.1 },
};

const SENS = 0.0042; // rad per css px

export function lookLimits() {
  return LOOK_LIMITS[useScene.getState().view] ?? null;
}

/** Frame step: inertia decay + clamping. Snap back to 0 in views without look. */
export function stepLook(dt: number) {
  const lim = lookLimits();
  if (!lim) {
    const k = 1 - Math.exp(-6 * dt);
    look.yaw -= look.yaw * k; look.pitch -= look.pitch * k; look.vYaw = look.vPitch = 0;
    return;
  }
  if (!look.dragging) {
    look.yaw += look.vYaw * dt; look.pitch += look.vPitch * dt;
    const decay = Math.exp(-4.5 * dt);
    look.vYaw *= decay; look.vPitch *= decay;
  }
  // soft clamp: spring back past the limit
  const clampSoft = (v: number, m: number) => (Math.abs(v) > m ? v - (v - Math.sign(v) * m) * Math.min(1, dt * 10) : v);
  look.yaw = clampSoft(look.yaw, lim.yaw); look.pitch = clampSoft(look.pitch, lim.pitch);
}

export function resetLook() { look.yaw = look.pitch = look.vYaw = look.vPitch = 0; }

/** Attach to the canvas container. Returns a cleanup. */
export function attachLook(el: HTMLElement) {
  let id = -1, lx = 0, ly = 0, lt = 0;
  const down = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    id = e.pointerId; lx = e.clientX; ly = e.clientY; lt = performance.now();
    look.moved = 0; look.vYaw = look.vPitch = 0;
    look.dragging = !!lookLimits();
  };
  const move = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    const dx = e.clientX - lx, dy = e.clientY - ly;
    lx = e.clientX; ly = e.clientY;
    look.moved += Math.abs(dx) + Math.abs(dy);
    if (!look.dragging) return;
    const now = performance.now(), dtt = Math.max(1, now - lt) / 1000; lt = now;
    // drag the world: moving the pointer right turns the view left
    const yy = dx * SENS, pp = dy * SENS;
    look.yaw += yy; look.pitch += pp;
    look.vYaw = look.vYaw * 0.6 + (yy / dtt) * 0.4; look.vPitch = look.vPitch * 0.6 + (pp / dtt) * 0.4;
    if (look.moved > 6) el.style.cursor = 'grabbing';
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    id = -1; look.dragging = false; el.style.cursor = '';
    if (performance.now() - lt > 80) look.vYaw = look.vPitch = 0; // held still before release: no fling
  };
  const key = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName))) return;
    if (!lookLimits()) return;
    const step = 1.6;
    if (e.key === 'ArrowLeft') look.vYaw = step;
    else if (e.key === 'ArrowRight') look.vYaw = -step;
    else if (e.key === 'ArrowUp') look.vPitch = step * 0.6;
    else if (e.key === 'ArrowDown') look.vPitch = -step * 0.6;
  };
  el.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  window.addEventListener('keydown', key);
  return () => {
    el.removeEventListener('pointerdown', down);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    window.removeEventListener('keydown', key);
  };
}
