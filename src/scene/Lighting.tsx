// OWNER: Opus O1. Golden-hour look: low warm raking key with tight soft shadows, cool lavender sky fill,
// cool counter/rim light, warm bounce + sun shaft inside the van, warm practical spill at night.
// Every value comes from env/presets.ts via the damped `live` env (see env/live.ts).
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useScene } from '../state/store';
import { live } from './env/live';
import { VAN } from './layout';

/** Shadow frustum is fitted around the van + clearing (light-space ortho box, metres). */
const SHADOW_TARGET = new THREE.Vector3(0, 0.6, -1.2);
const SHADOW_BOX = { x: 7.5, y: 4.5, dist: 40 };

export function Lighting() {
  const quality = useScene((s) => s.quality);
  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const bounce = useRef<THREE.PointLight>(null);
  const spill = useRef<THREE.SpotLight>(null);
  const fill = useRef<THREE.PointLight>(null);
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.copy(SHADOW_TARGET);
    return o;
  }, []);
  const spillTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 0, VAN.backZ + 3.2);
    return o;
  }, []);

  const shadows = quality !== 'low';
  const mapSize = quality === 'high' ? 2048 : 1024;

  useEffect(() => {
    const l = key.current;
    if (!l) return;
    l.target = target;
    const cam = l.shadow.camera;
    cam.left = -SHADOW_BOX.x; cam.right = SHADOW_BOX.x;
    cam.top = SHADOW_BOX.y; cam.bottom = -SHADOW_BOX.y;
    cam.near = 1; cam.far = SHADOW_BOX.dist * 2;
    cam.updateProjectionMatrix();
    l.shadow.bias = -0.00025;
    l.shadow.normalBias = 0.025;
    l.shadow.radius = quality === 'high' ? 4 : 3; // PCF Vogel-disk softness (texels)
    l.shadow.mapSize.set(mapSize, mapSize);
    l.shadow.map?.dispose();
    l.shadow.map = null as unknown as THREE.WebGLRenderTarget;
    if (spill.current) spill.current.target = spillTarget;
    if (rim.current) rim.current.target = target;
  }, [target, spillTarget, mapSize, quality]);

  useFrame(() => {
    const L = live;
    const k = key.current;
    if (k) {
      k.position.copy(SHADOW_TARGET).addScaledVector(L.v.sunDir, SHADOW_BOX.dist);
      k.color.copy(L.c.sunColor);
      k.intensity = L.n.sunIntensity;
    }
    if (rim.current) {
      rim.current.position.copy(SHADOW_TARGET).addScaledVector(L.v.rimDir, 30);
      rim.current.color.copy(L.c.rimColor);
      rim.current.intensity = L.n.rimIntensity;
    }
    if (hemi.current) {
      hemi.current.color.copy(L.c.hemiSky);
      hemi.current.groundColor.copy(L.c.hemiGround);
      hemi.current.intensity = L.n.hemiIntensity;
    }
    if (bounce.current) {
      // sun spill bouncing off the duvet onto the dark headliner
      bounce.current.color.copy(L.c.bounceColor);
      bounce.current.intensity = L.n.bounce * 1.6;
    }
    const prac = L.n.interior * L.night;
    if (spill.current) {
      // warm pool of light falling out of the hatch onto the grass at night
      spill.current.color.copy(L.c.practicalColor);
      spill.current.intensity = prac * 6;
      spill.current.visible = prac > 0.02;
    }
    if (fill.current) {
      fill.current.color.copy(L.c.practicalColor);
      fill.current.intensity = prac * 0.25; // van.tsx practicals already light the cabin
      fill.current.visible = prac > 0.02;
    }
  });

  return (
    <>
      <primitive object={target} />
      <primitive object={spillTarget} />
      <hemisphereLight ref={hemi} />
      <directionalLight ref={key} castShadow={shadows} shadow-mapSize={[mapSize, mapSize]} />
      <directionalLight ref={rim} />
      {quality !== 'low' && (
        <pointLight ref={bounce} position={[0, VAN.bedTopY + 0.25, 0.1]} distance={2.6} decay={1.6} />
      )}
      <pointLight ref={fill} position={[0, 1.35, -0.3]} distance={3.2} decay={2} />
      <spotLight
        ref={spill}
        position={[0, 1.6, VAN.backZ - 0.35]}
        angle={0.95}
        penumbra={1}
        distance={10}
        decay={1.6}
        castShadow={quality === 'high'}
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
      />
    </>
  );
}
