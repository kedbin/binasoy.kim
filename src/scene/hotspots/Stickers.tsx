import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ANCHORS } from '../layout';
import { content } from '../../content';
import { Hotspot } from './Hotspot';
import { canvasTex, rr } from './textures';
import { rbox } from '../van/util';

export const STICKER_SHORT: Record<string, string> = {
  'gcp-devops': 'DevOps', 'gcp-security': 'Security', 'gcp-architect': 'Architect', 'azure-az-204': 'AZ-204',
  'aws-cloud-practitioner': 'AWS CLF', 'google-ai-leader-gemini': 'Gemini', 'azure-ai-900': 'AI-900', 'azure-az-900': 'AZ-900',
};

function drawSticker(g: CanvasRenderingContext2D, s: number, vendor: string, label: string, sub: string, shape: number) {
  const m = 12, i = s - 2 * m;
  const path = () => {
    if (shape === 0) { g.beginPath(); g.arc(s / 2, s / 2, i / 2, 0, 7); }
    else if (shape === 1) rr(g, m, m + 24, i, i - 48, 52); // pill badge
    else rr(g, m, m + 18, i, i - 36, 26); // rounded-rect badge
  };
  g.fillStyle = '#FAF6EE'; g.shadowColor = '#0005'; g.shadowBlur = 5; path(); g.fill(); g.shadowBlur = 0;
  g.save(); g.translate(s / 2, s / 2); g.scale(0.89, 0.89); g.translate(-s / 2, -s / 2); path(); g.clip();
  let fill: string | CanvasGradient = '#888';
  if (vendor === 'gcp') fill = '#3B78E7';
  else if (vendor === 'azure') fill = '#0F6CBD';
  else if (vendor === 'aws') fill = '#232F3E';
  else if (vendor === 'google-ai') { const gr = g.createLinearGradient(0, s, s, 0); gr.addColorStop(0, '#4285F4'); gr.addColorStop(0.55, '#9B72CB'); gr.addColorStop(1, '#D96570'); fill = gr; }
  g.fillStyle = fill; g.fillRect(0, 0, s, s);
  if (vendor === 'gcp') { ['#EA4335', '#FBBC04', '#34A853'].forEach((c, k) => { g.fillStyle = c; g.fillRect(s * (0.18 + k * 0.22), s * 0.14, s * 0.18, 10); }); }
  if (vendor === 'aws') { g.fillStyle = '#FF9900'; g.fillRect(s * 0.18, s * 0.74, s * 0.64, 12); }
  g.restore();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 ' + (label.length > 7 ? 48 : 58) + 'px ui-rounded, Nunito, system-ui, sans-serif';
  g.fillText(label, s / 2, s / 2 - 6, i * 0.78);
  g.font = '600 24px ui-rounded, Nunito, system-ui, sans-serif'; g.globalAlpha = 0.9;
  g.fillText(sub, s / 2, s / 2 + 46, i * 0.78);
}
const SUB: Record<string, string> = { gcp: 'Google Cloud', azure: 'Azure', aws: 'AWS', 'google-ai': 'Google AI', other: '' };

/** Sticker mesh: 1x1 plane with a subtle corner lift (scaled uniformly so Z curl stays flat). */
const planeG = (() => {
  const g = new THREE.PlaneGeometry(1, 1, 6, 6);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const d = Math.max(0, (x + y) - 0.6);
    p.setZ(i, d * d * 0.04);
  }
  g.computeVertexNormals();
  return g;
})();

/** Organic sticker layout across the camper cubby door [x, y, rot, size]. */
const LAYOUT: [number, number, number, number][] = [
  [-0.155,  0.034,  0.08, 0.082],
  [-0.054,  0.026, -0.06, 0.082],
  [ 0.052,  0.026,  0.05, 0.082],
  [ 0.152,  0.034, -0.09, 0.080],
  [-0.142, -0.044, -0.06, 0.078],
  [-0.036, -0.042,  0.07, 0.080],
  [ 0.064, -0.044, -0.05, 0.068],
  [ 0.150, -0.040,  0.09, 0.068],
];

export function Stickers() {
  const certs = content.certs;
  const texs = useMemo(() => certs.map((c, i) => canvasTex(256, 256, (g) => drawSticker(g, 256, c.vendor, STICKER_SHORT[c.id] ?? c.name.slice(0, 8), SUB[c.vendor], i % 3))), [certs]);
  useEffect(() => () => texs.forEach((t) => t.dispose()), [texs]);

  const geo = useMemo(() => ({
    frame: rbox(0.46, 0.20, 0.008, 0, 0, 0.002, 0.018, 2),
    door: rbox(0.43, 0.172, 0.008, 0, 0, 0.006, 0.014, 2),
    latch: rbox(0.036, 0.014, 0.006, 0, 0.070, 0.011, 0.004, 1),
  }), []);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  return (
    <Hotspot id="stickers" label="See the certifications" view="stickers" position={ANCHORS.stickers.pos} rotY={ANCHORS.stickers.rotY} labelPos={[0, 0.14, 0.03]} lift={0.025} hit={[0.5, 0.24, 0.08]} hitPos={[0, 0, 0.02]}>
      {/* recessed camper storage cubby door on the lower side wall */}
      <mesh geometry={geo.frame} receiveShadow>
        <meshStandardMaterial color="#1f1b18" roughness={0.85} />
      </mesh>
      <mesh geometry={geo.door} castShadow receiveShadow>
        <meshStandardMaterial color="#DFD7C8" roughness={0.65} metalness={0.08} />
      </mesh>
      <mesh geometry={geo.latch}>
        <meshStandardMaterial color="#3a3632" roughness={0.4} metalness={0.5} />
      </mesh>
      {texs.map((t, i) => {
        const [x, y, rot, sz] = LAYOUT[i] ?? [0, 0, 0, 0.07];
        return (
          <mesh key={certs[i].id} geometry={planeG} position={[x, y, 0.011 + i * 0.0002]} rotation={[0, 0, rot]} scale={sz}>
            <meshPhysicalMaterial map={t} transparent alphaTest={0.3} roughness={0.38} clearcoat={0.85} clearcoatRoughness={0.2} />
          </mesh>
        );
      })}
    </Hotspot>
  );
}
