import { useEffect, useMemo } from 'react';
import { ANCHORS } from '../layout';
import { Hotspot } from './Hotspot';
import { canvasTex } from './textures';

function paperTex() {
  return canvasTex(256, 360, (g, w, h) => {
    g.fillStyle = '#FBF8F1'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2A2420'; g.font = '800 22px system-ui, sans-serif'; g.fillText('KIM BINASOY', 20, 38);
    g.fillStyle = '#D9682B'; g.fillRect(20, 46, 60, 4);
    g.fillStyle = '#8a8178';
    let y = 74;
    const hdr = (t: string) => { g.fillStyle = '#2A2420'; g.font = '700 13px system-ui, sans-serif'; g.fillText(t, 20, y); y += 14; };
    const lines = (n: number) => { g.fillStyle = '#B9B1A6'; for (let i = 0; i < n; i++) { g.fillRect(20, y, 216 - (i % 3) * 30, 5); y += 12; } y += 8; };
    hdr('EXPERIENCE'); lines(4); hdr('SKILLS'); lines(3); hdr('CERTIFICATIONS'); lines(3); hdr('EDUCATION'); lines(2);
  });
}

export function Clipboard() {
  const tex = useMemo(paperTex, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <Hotspot id="clipboard" label="Pick up the résumé" view="clipboard" position={ANCHORS.clipboard.pos} rotY={ANCHORS.clipboard.rotY} labelPos={[0, 0.2, 0]}>
      <mesh position={[0, 0.007, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.25, 0.014, 0.35]} />
        <meshStandardMaterial color="#B07A45" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.0155, 0.005]} rotation={[-Math.PI / 2, 0, Math.PI]}>
        <planeGeometry args={[0.215, 0.302]} />
        <meshStandardMaterial map={tex} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.02, 0.165]} castShadow>
        <boxGeometry args={[0.09, 0.012, 0.03]} />
        <meshStandardMaterial color="#B8BCC2" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* pen */}
      <mesh position={[0.17, 0.008, 0.02]} rotation={[0, 0.25, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.006, 0.006, 0.15, 8]} />
        <meshStandardMaterial color="#2F4A3A" roughness={0.5} />
      </mesh>
    </Hotspot>
  );
}
