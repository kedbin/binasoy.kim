import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ANCHORS } from '../layout';
import { Hotspot } from './Hotspot';
import { canvasTex } from './textures';
import { rbox, gridSurface, merge, tube, V } from '../van/util';

function paperTex() {
  return canvasTex(256, 360, (g, w, h) => {
    g.fillStyle = '#FBF8F1'; g.fillRect(0, 0, w, h);
    // paper fibre speckle
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(120,100,80,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
    g.fillStyle = '#2A2420'; g.font = '800 22px system-ui, sans-serif'; g.fillText('KIM BINASOY', 20, 38);
    g.fillStyle = '#D9682B'; g.fillRect(20, 46, 60, 4);
    g.fillStyle = '#8a8178';
    let y = 74;
    const hdr = (t: string) => { g.fillStyle = '#2A2420'; g.font = '700 13px system-ui, sans-serif'; g.fillText(t, 20, y); y += 14; };
    const lines = (n: number) => { g.fillStyle = '#B9B1A6'; for (let i = 0; i < n; i++) { g.fillRect(20, y, 216 - (i % 3) * 30, 5); y += 12; } y += 8; };
    hdr('EXPERIENCE'); lines(4); hdr('SKILLS'); lines(3); hdr('CERTIFICATIONS'); lines(3); hdr('EDUCATION'); lines(2);
  });
}

function woodTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#B98249'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * w;
      g.strokeStyle = `rgba(${Math.random() > 0.5 ? '90,50,20' : '230,180,120'},${0.08 + Math.random() * 0.12})`;
      g.lineWidth = 0.5 + Math.random() * 2;
      g.beginPath(); g.moveTo(x, 0);
      for (let y = 0; y <= h; y += 16) g.lineTo(x + Math.sin(y * 0.03 + i) * 4, y);
      g.stroke();
    }
  });
}

const PW = 0.215, PD = 0.302;

export function Clipboard() {
  const tex = useMemo(paperTex, []);
  const wood = useMemo(woodTex, []);
  useEffect(() => () => { tex.dispose(); wood.dispose(); }, [tex, wood]);

  const geo = useMemo(() => {
    // rounded hardboard with bevel, lying flat (thickness 0..0.012)
    const board = rbox(0.25, 0.01, 0.35, 0, 0.006, 0, 0.004, 3);
    // paper: slight sag + lifted, curled free corner (bottom-left, away from the clip at +z)
    const paper = gridSurface(16, 22, (u, v, o) => {
      const x = (0.5 - u) * PW, z = (v - 0.5) * PD;
      const free = Math.max(0, (0.5 - v) * 2); // 1 at bottom edge
      const cx = Math.max(0, (u - 0.6) / 0.4); // toward one side
      const lift = 0.012 * Math.pow(free, 2.2) * (0.3 + cx) + 0.003 * Math.pow(free, 3);
      o.set(x, 0.0125 + lift + 0.0008 * Math.sin(u * 9), z - lift * 0.3);
    });
    // second sheet slightly offset beneath for thickness (kept below paper's sin trough at 0.0117)
    const under = gridSurface(2, 2, (u, v, o) => o.set((0.5 - u) * PW + 0.003, 0.0112, (v - 0.5) * PD - 0.003));
    // metal clip: base plate + rounded spring roll + lever
    const clipParts = [
      rbox(0.1, 0.004, 0.034, 0, 0.013, 0.152, 0.0015, 1),
      (() => { const c = new THREE.CylinderGeometry(0.007, 0.007, 0.08, 14); c.rotateZ(Math.PI / 2); c.translate(0, 0.02, 0.16); return c; })(),
      (() => { const l = rbox(0.07, 0.003, 0.05, 0, 0, 0, 0.0012, 1); l.rotateX(-0.35); l.translate(0, 0.03, 0.143); return l; })(),
      tube([V(-0.03, 0.026, 0.165), V(-0.03, 0.04, 0.175), V(0.03, 0.04, 0.175), V(0.03, 0.026, 0.165)], 0.0018, 12, 5),
    ];
    const clip = merge(clipParts, false);
    return { board, paper, under, clip };
  }, []);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  return (
    <Hotspot id="clipboard" label="Pick up the résumé" view="clipboard" position={ANCHORS.clipboard.pos} rotY={ANCHORS.clipboard.rotY} labelPos={[0, 0.16, 0]} hit={[0.3, 0.12, 0.42]} hitPos={[0, 0.03, 0]}>
      <mesh geometry={geo.board} castShadow receiveShadow>
        <meshStandardMaterial map={wood} roughness={0.7} />
      </mesh>
      <mesh geometry={geo.under}><meshStandardMaterial color="#EFEAE0" roughness={1} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={geo.paper} receiveShadow>
        <meshStandardMaterial map={tex} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geo.clip} castShadow>
        <meshStandardMaterial color="#D5D9DE" metalness={0.55} roughness={0.3} />
      </mesh>
    </Hotspot>
  );
}
