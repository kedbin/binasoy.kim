// Far shore: layered rolling hills in full fall colour + their mirror image under the glassy lake.
import { useMemo } from 'react';
import * as THREE from 'three';
import { WORLD } from '../layout';
import { fbm1, fbm2, mulberry32 } from './noise';
import { nightUniform } from './timeOfDay';

const FALL = ['#D9682B', '#C4452C', '#E3A63B', '#B8642A', '#8E3B26', '#E8B44A'].map((c) => new THREE.Color(c));
const MUTE = new THREE.Color('#8A5E4C');
const PINE = [new THREE.Color('#2F4A3A'), new THREE.Color('#3B5A3F'), new THREE.Color('#24392C')];

interface LayerOpts { z: number; width: number; height: number; depth: number; seed: number; haze: number; hazeColor: THREE.Color }

function hillGeometry({ z, width, height, depth, seed, haze, hazeColor }: LayerOpts) {
  const segX = 220, segY = 10;
  const rand = mulberry32(seed);
  const off = rand() * 100;
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const c = new THREE.Color();
  for (let j = 0; j <= segY; j++) {
    const v = j / segY;
    for (let i = 0; i <= segX; i++) {
      const u = i / segX;
      const x = (u - 0.5) * width;
      // ridge silhouette: big soft rolls + smaller bumps (tree canopy)
      const ridge = height * (0.55 + 0.45 * fbm1(u * 4.0 + off, 3)) + height * 0.06 * fbm1(u * 60.0 + off, 2);
      const prof = Math.sin(v * Math.PI * 0.5); // rounded front face
      const y = WORLD.waterY + ridge * prof;
      const zz = z + depth * (1 - Math.cos(v * Math.PI * 0.5)) + Math.sin(u * 5.0 + off) * depth * 0.4;
      pos.push(x, y, zz);
      // colour: mottled fall canopy with evergreen clusters, darker at the waterline
      const n = fbm2(x * 0.018 + off, zz * 0.02 + y * 0.04, 3);
      const p = fbm2(x * 0.008 - off, y * 0.02 + 7.0, 2);
      // smooth blend across the fall palette instead of hard picks (avoids camo look)
      const t = THREE.MathUtils.clamp((n - 0.25) * 2.0, 0, 0.999) * (FALL.length - 1);
      const i0 = Math.floor(t);
      c.copy(FALL[i0]).lerp(FALL[i0 + 1], t - i0);
      c.lerp(PINE[0], THREE.MathUtils.smoothstep(p, 0.5, 0.68) * 0.85);
      c.lerp(MUTE, 0.28); // backlit by the low sun: muted, slightly dusky
      c.multiplyScalar(0.62 + 0.3 * v);
      c.lerp(hazeColor, haze);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let j = 0; j < segY; j++) for (let i = 0; i < segX; i++) {
    const a = j * (segX + 1) + i, b = a + 1, d = a + segX + 1, e = d + 1;
    idx.push(a, d, b, b, d, e);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function Hills() {
  const { geos, mat } = useMemo(() => {
    const haze = new THREE.Color('#C9A9B8');
    const geos = [
      hillGeometry({ z: WORLD.hillsZ + 140, width: 1300, height: 70, depth: 40, seed: 3, haze: 0.5, hazeColor: haze }),
      hillGeometry({ z: WORLD.hillsZ + 40, width: 1000, height: 46, depth: 30, seed: 7, haze: 0.22, hazeColor: haze }),
      hillGeometry({ z: WORLD.hillsZ - 40, width: 700, height: 26, depth: 24, seed: 11, haze: 0.0, hazeColor: haze }),
    ];
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    mat.onBeforeCompile = (s) => {
      s.uniforms.uNight = nightUniform;
      s.fragmentShader = 'uniform float uNight;\n' + s.fragmentShader.replace(
        '#include <dithering_fragment>',
        'gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * vec3(0.12,0.14,0.25), uNight);\n#include <dithering_fragment>',
      );
    };
    return { geos, mat };
  }, []);
  return (
    <group name="hills">
      {geos.map((g, i) => <mesh key={i} geometry={g} material={mat} />)}
      {/* Mirror about y = waterY: y' = 2w - y */}
      <group position-y={WORLD.waterY * 2} scale-y={-1} name="hills-reflection">
        {geos.map((g, i) => <mesh key={i} geometry={g} material={mat} />)}
      </group>
    </group>
  );
}
