import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ANCHORS } from '../layout';
import { content } from '../../content';
import { Hotspot } from './Hotspot';
import { canvasTex, rr } from './textures';

export const STICKER_SHORT: Record<string, string> = {
  'gcp-devops': 'DevOps', 'gcp-security': 'Security', 'gcp-architect': 'Architect', 'azure-az-204': 'AZ-204',
  'aws-cloud-practitioner': 'AWS CLF', 'google-ai-leader-gemini': 'Gemini', 'azure-ai-900': 'AI-900', 'azure-az-900': 'AZ-900',
};

function drawSticker(g: CanvasRenderingContext2D, s: number, vendor: string, label: string, sub: string, shape: number) {
  const m = 10, i = s - 2 * m;
  const path = () => { if (shape === 0) { g.beginPath(); g.arc(s / 2, s / 2, i / 2, 0, 7); } else rr(g, m, m + 20, i, i - 40, shape === 1 ? 46 : 22); };
  g.fillStyle = '#fff'; g.shadowColor = '#0006'; g.shadowBlur = 6; path(); g.fill(); g.shadowBlur = 0;
  g.save(); g.translate(s / 2, s / 2); g.scale(0.9, 0.9); g.translate(-s / 2, -s / 2); path(); g.clip();
  let fill: string | CanvasGradient = '#888';
  if (vendor === 'gcp') fill = '#4285F4';
  else if (vendor === 'azure') fill = '#0F6CBD';
  else if (vendor === 'aws') fill = '#232F3E';
  else if (vendor === 'google-ai') { const gr = g.createLinearGradient(0, s, s, 0); gr.addColorStop(0, '#4285F4'); gr.addColorStop(0.55, '#9B72CB'); gr.addColorStop(1, '#D96570'); fill = gr; }
  g.fillStyle = fill; g.fillRect(0, 0, s, s);
  if (vendor === 'gcp') { ['#EA4335', '#FBBC04', '#34A853'].forEach((c, k) => { g.fillStyle = c; g.fillRect(s * (0.15 + k * 0.24), s * 0.12, s * 0.2, 12); }); }
  if (vendor === 'aws') { g.fillStyle = '#FF9900'; g.fillRect(s * 0.15, s * 0.74, s * 0.7, 14); }
  g.restore();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 ' + (label.length > 7 ? 54 : 66) + 'px ui-rounded, Nunito, system-ui, sans-serif';
  g.fillText(label, s / 2, s / 2 - 8, i * 0.8);
  g.font = '600 28px ui-rounded, Nunito, system-ui, sans-serif'; g.globalAlpha = 0.9;
  g.fillText(sub, s / 2, s / 2 + 52, i * 0.8);
}
const SUB: Record<string, string> = { gcp: 'Google Cloud', azure: 'Azure', aws: 'AWS', 'google-ai': 'Google AI', other: '' };

/** Sticker sheet: subdivided plane with one corner peeling up a hair (die-cut vinyl). */
const planeG = (() => {
  const g = new THREE.PlaneGeometry(1, 1, 8, 8);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const d = Math.max(0, (x + y) - 0.55); // top-right corner
    p.setZ(i, d * d * 0.18);
  }
  g.computeVertexNormals();
  return g;
})();
export function Stickers() {
  const certs = content.certs;
  const texs = useMemo(() => certs.map((c, i) => canvasTex(256, 256, (g) => drawSticker(g, 256, c.vendor, STICKER_SHORT[c.id] ?? c.name.slice(0, 8), SUB[c.vendor], i % 3))), [certs]);
  useEffect(() => () => texs.forEach((t) => t.dispose()), [texs]);
  const rots = [0.1, -0.08, 0.05, -0.12, 0.07, -0.04, 0.12, -0.07];
  return (
    <Hotspot id="stickers" label="See the certifications" view="stickers" position={ANCHORS.stickers.pos} rotY={ANCHORS.stickers.rotY} labelPos={[0, 0.3, 0.05]} lift={0.03} scale={0.6}>
      <mesh position={[0, 0, 0.004]} visible={false}><planeGeometry args={[0.8, 0.4]} /></mesh>
      {texs.map((t, i) => {
        const feat = certs[i].featured;
        const sz = feat ? 0.2 : 0.14;
        const col = i % 4, row = Math.floor(i / 4);
        return (
          <mesh key={certs[i].id} geometry={planeG} position={[(col - 1.5) * 0.2 + (row ? 0.0 : 0), 0.1 - row * 0.2, 0.006 + i * 0.0002]} rotation={[0, 0, rots[i % rots.length]]} scale={[sz, sz, 1]}>
            <meshPhysicalMaterial map={t} transparent alphaTest={0.3} roughness={0.4} clearcoat={1} clearcoatRoughness={0.15} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </Hotspot>
  );
}
