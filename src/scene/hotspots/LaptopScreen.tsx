// OWNER: Opus. Mounts KimOS (DOM) onto the 3D laptop screen with drei <Html transform>.
// Desktop: live on-screen UI when the camera is in 'laptop' view (pointer events enabled only then).
// Mobile / narrow viewports: the 3D screen just shows the wallpaper; KimOS opens as a full-screen modal (Panels).
import { Html } from '@react-three/drei';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useLaptopStore, SCREEN_SIZE } from './laptopStore';
import { useScene } from '../../state/store';

const KimOS = lazy(() => import('../../ui/kimos').then((m) => ({ default: m.KimOS })));

const DESIGN_W = 1280; // KimOS fixed design canvas
const DESIGN_H = 800;

export function useIsCompact() {
  const size = useThree((s) => s.size);
  return size.width < 820 || size.height < 520;
}

const _p = new THREE.Vector3();
const _n = new THREE.Vector3();
const _q = new THREE.Quaternion();
/** Camera must be at least this far (m) in front of the screen plane for the DOM layer to show. */
const FACING_EPS = 0.01;
/** Live DOM appears once the camera is this close (m); laptop pose is ~0.3 m, seat is ~1.4 m away. */
const SHOW_DIST = 0.9;
const _d = new THREE.Vector3();

export function LaptopScreen() {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<HTMLDivElement>(null);
  const shown = useRef<boolean | null>(null);
  // Why no drei occlusion: occlude='blending' punches a transparent hole in the canvas for the DOM behind it.
  // With the post-processing composer the canvas alpha is opaque, so the hole rendered black from the seat, and the
  // CSS-3D layer has no idea the lid is in front of it, so from behind (outside / van / intro) the wallpaper bled
  // through the aluminium. Now: the 3D screen mesh (FrontSide, same wallpaper texture) is what you see from
  // anywhere else; the live KimOS DOM is shown on top only while the camera is heading to / at the laptop AND in
  // front of the screen plane. Toggled per frame via style.visibility (no React re-render).
  useFrame(({ camera }) => {
    const g = group.current; if (!g) return;
    const wrap = inner.current?.closest<HTMLElement>('.kimos-3d'); if (!wrap) return;
    g.getWorldPosition(_p);
    _n.set(0, 0, 1).applyQuaternion(g.getWorldQuaternion(_q));
    _d.subVectors(camera.position, _p);
    const facing = _n.dot(_d) > FACING_EPS;
    // only in the last part of the dolly-in: nothing can sit between the camera and the screen that close
    const show = facing && _d.length() < SHOW_DIST && useScene.getState().view === 'laptop';
    if (show === shown.current) return;
    shown.current = show;
    wrap.style.visibility = show ? '' : 'hidden';
  });
  const mount = useLaptopStore((s) => s.mount);
  const view = useScene((s) => s.view);
  // Go live only once the camera has landed: no DOM layer swap mid-flight, and clicks during the dolly-in
  // fall through to the canvas (where they are ignored) instead of hitting KimOS icons by accident.
  const landed = useScene((s) => s.view === 'laptop' && s.arrived === 'laptop' && !s.transitioning);
  const back = useScene((s) => s.back);
  const compact = useIsCompact();
  const [warm, setWarm] = useState(false);
  // Mount KimOS once the user gets near the laptop (or on idle) so the first dolly-in is instant.
  useEffect(() => {
    if (view === 'laptop' || view === 'seat' || view === 'van') setWarm(true);
  }, [view]);
  if (!mount || compact || !warm) return null;
  const active = landed;
  // drei Html transform: 1 CSS px = 1/40 world units at distanceFactor 1 (scale = factor / 400 * 10).
  // We want DESIGN_W css px to span SCREEN_SIZE.w metres.
  const scale = SCREEN_SIZE.w / DESIGN_W;
  return createPortal(
    <group ref={group}>
    <Html
      ref={inner}
      transform
      scale={scale * 40}
      position={[0, 0, 0.0005]}
      zIndexRange={[5, 0]}
      wrapperClass={'kimos-3d' + (active ? ' is-active' : '')}
      // Inactive: the whole DOM layer must be click-through. drei's inner transform div defaults to
      // pointer-events:auto; if it catches the click, R3F raycasts with offsetX/Y relative to that div
      // and misses the laptop, so clicking the screen did nothing (only the bezel/edges worked).
      pointerEvents={active ? 'auto' : 'none'}
      style={{ width: DESIGN_W, height: DESIGN_H, pointerEvents: active ? 'auto' : 'none' }}
    >
      <Suspense fallback={null}>
        <div className="kimos-3d__frame" style={{ width: DESIGN_W, height: DESIGN_H }} aria-hidden={!active} inert={!active ? true : undefined}>
          <KimOS mode="screen" onExit={back} />
        </div>
      </Suspense>
    </Html>
    </group>,
    mount,
  );
}
