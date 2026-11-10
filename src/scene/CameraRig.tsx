// OWNER: Opus O5. Camera flights between CAMERA presets + drag-to-look.
// Flights are quadratic Béziers through a waypoint (convex hull → no overshoot, no clipping through the van
// walls when entering/leaving through the tailgate). Reduced motion = hard cuts.
// On landing it calls store.arrive(view) so DOM panels can slide in after the camera settles.
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CAMERA, VAN } from './layout';
import { useScene, type View } from '../state/store';
import { useLaptopStore, SCREEN_SIZE } from './hotspots/laptopStore';
import { look, stepLook, resetLook, attachLook } from './look';

const _n = new THREE.Vector3();
const _c = new THREE.Vector3();
const _q = new THREE.Quaternion();
const Y = new THREE.Vector3(0, 1, 0);

/** Frame the laptop screen so it fills ~86% of the viewport, looking straight at it. */
function laptopPose(aspect: number, screen: THREE.Object3D, pos: THREE.Vector3, target: THREE.Vector3) {
  screen.getWorldPosition(_c);
  screen.getWorldQuaternion(_q);
  _n.set(0, 0, 1).applyQuaternion(_q).normalize();
  const fov = THREE.MathUtils.degToRad(CAMERA.laptop.fov);
  const fill = 0.86;
  const dH = (SCREEN_SIZE.h / fill) / (2 * Math.tan(fov / 2));
  const dW = (SCREEN_SIZE.w / fill) / (2 * Math.tan(fov / 2) * aspect);
  target.copy(_c);
  pos.copy(_c).addScaledVector(_n, Math.max(dH, dW));
}

const INSIDE = new Set<View>(['seat', 'laptop', 'wall', 'stickers', 'clipboard']);
/** Pre-reveal camera: pulled back from the intro shot so the reveal can dolly in. */
const INTRO_START = new THREE.Vector3(...CAMERA.intro.target).lerp(new THREE.Vector3(...CAMERA.intro.pos), 1.32).add(new THREE.Vector3(0, 0.25, 0));
/** Through the middle of the tailgate opening, a bit outside. */
const HATCH = new THREE.Vector3(0, 1.3, VAN.backZ + 0.6);
const CABIN = new THREE.Vector3(0, 1.2, -0.45);

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function bez(out: THREE.Vector3, a: THREE.Vector3, c: THREE.Vector3, b: THREE.Vector3, t: number) {
  const u = 1 - t;
  return out.set(
    u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    u * u * a.y + 2 * u * t * c.y + t * t * b.y,
    u * u * a.z + 2 * u * t * c.z + t * t * b.z,
  );
}

export function CameraRig() {
  const { camera, gl, size } = useThree();
  const f = useRef({
    from: new THREE.Vector3().copy(INTRO_START), fromT: new THREE.Vector3(...CAMERA.intro.target), fromFov: CAMERA.intro.fov,
    ctrl: new THREE.Vector3(), to: new THREE.Vector3(), toT: new THREE.Vector3(),
    pos: new THREE.Vector3().copy(INTRO_START), tgt: new THREE.Vector3(...CAMERA.intro.target),
    t: 1, dur: 1, view: 'intro' as View, started: false, shift: 0,
  });

  useEffect(() => attachLook(gl.domElement), [gl]);

  // Start a flight whenever the view changes (or the loader reveals the intro).
  useEffect(() => {
    const begin = (view: View, prev: View, reveal = false) => {
      const s = f.current, st = useScene.getState();
      s.from.copy(camera.position);
      // fold the current look offset into the start target so the flight starts where we're looking
      camera.getWorldDirection(_n);
      s.fromT.copy(camera.position).addScaledVector(_n, s.from.distanceTo(s.tgt) || 1);
      s.fromFov = (camera as THREE.PerspectiveCamera).fov;
      resetLook();
      s.view = view; s.t = 0; s.started = true;
      target(view, s.to, s.toT);
      const crossing = INSIDE.has(view) !== INSIDE.has(prev) && !reveal;
      if (crossing) s.ctrl.copy(HATCH);
      else if (INSIDE.has(view) && INSIDE.has(prev)) s.ctrl.copy(s.from).lerp(s.to, 0.5).lerp(CABIN, 0.6);
      else s.ctrl.copy(s.from).lerp(s.to, 0.5);
      const dist = s.from.distanceTo(s.ctrl) + s.ctrl.distanceTo(s.to);
      s.dur = st.reducedMotion ? 0 : reveal ? 2.6 : THREE.MathUtils.clamp(0.75 + dist * 0.16, 0.9, 2.1);
    };
    const unsub = useScene.subscribe((st, prev) => {
      if (st.view !== prev.view) begin(st.view, prev.view);
      else if (st.revealed && !prev.revealed) begin(st.view, st.view, true);
    });
    return unsub;
  }, [camera]);

  function target(view: View, pos: THREE.Vector3, tgt: THREE.Vector3) {
    const screen = useLaptopStore.getState().screen;
    if (view === 'laptop' && screen) { laptopPose((camera as THREE.PerspectiveCamera).aspect, screen, pos, tgt); return; }
    const p = CAMERA[view] ?? CAMERA.seat;
    pos.set(...p.pos); tgt.set(...p.target);
  }

  useFrame((_, dt) => {
    const s = f.current, st = useScene.getState();
    const cam = camera as THREE.PerspectiveCamera;
    const preset = CAMERA[s.view] ?? CAMERA.seat;
    if (!s.started) {
      // before reveal: hold the pulled-back establishing shot
      cam.position.copy(INTRO_START); cam.lookAt(s.tgt);
    } else {
      target(s.view, s.to, s.toT); // live (laptop pose depends on aspect)
      if (s.t < 1) {
        s.t = s.dur <= 0 ? 1 : Math.min(1, s.t + dt / s.dur);
        const k = ease(s.t);
        bez(s.pos, s.from, s.ctrl, s.to, k);
        s.tgt.copy(s.fromT).lerp(s.toT, ease(Math.min(1, s.t * 1.15)));
        if (s.t >= 1) st.arrive(s.view);
      } else {
        s.pos.copy(s.to); s.tgt.copy(s.toT);
        if (st.arrived !== s.view && st.view === s.view) st.arrive(s.view);
      }
      stepLook(dt);
      cam.position.copy(s.pos);
      cam.lookAt(s.tgt);
      if (look.yaw || look.pitch) { cam.rotateOnWorldAxis(Y, look.yaw); cam.rotateX(look.pitch); }
    }
    // Portrait screens: widen vertical FOV so the horizontal framing roughly matches a 16:10 desktop.
    const portraitBoost = s.view === 'laptop' ? 1 : THREE.MathUtils.clamp(1.6 / cam.aspect, 1, 1.55);
    const goal = Math.min(preset.fov * portraitBoost, 95);
    const fov = s.t < 1 ? THREE.MathUtils.lerp(s.fromFov, goal, ease(s.t)) : goal;
    // Lens shift: keep the subject centred in the area not covered by a side sheet (bottom sheets: shift up).
    const sh = st.arrived === s.view ? st.sheet : null;
    const want = sh ? sh.size / 2 : 0;
    s.shift = st.reducedMotion ? want : THREE.MathUtils.damp(s.shift, want, 5, dt);
    const ox = sh?.side === 'bottom' ? 0 : s.shift, oy = sh?.side === 'bottom' ? s.shift * 0.8 : 0;
    const shifting = Math.abs(s.shift) > 0.5;
    if (shifting) cam.setViewOffset(size.width, size.height, ox, oy, size.width, size.height);
    else if (cam.view?.enabled) cam.clearViewOffset();
    if (Math.abs(cam.fov - fov) > 0.01 || shifting) { cam.fov = fov; cam.updateProjectionMatrix(); }
  });
  return null;
}
