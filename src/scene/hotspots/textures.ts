import * as THREE from 'three';

export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

/** Golden-lake wallpaper for the laptop screen. */
export function wallpaperTex(size = 512) {
  return canvasTex(size, Math.round(size * 0.63), (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.62);
    sky.addColorStop(0, '#B9A7C9'); sky.addColorStop(0.6, '#F4C7A1'); sky.addColorStop(1, '#F6D9A0');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    const sun = g.createRadialGradient(w * 0.62, h * 0.55, 2, w * 0.62, h * 0.55, h * 0.4);
    sun.addColorStop(0, '#FFF4D0'); sun.addColorStop(1, '#FFD58A00');
    g.fillStyle = sun; g.fillRect(0, 0, w, h);
    const hill = (col: string, base: number, amp: number, ph: number) => {
      g.fillStyle = col; g.beginPath(); g.moveTo(0, h * 0.62);
      for (let x = 0; x <= w; x += 8) g.lineTo(x, h * (base - amp * Math.sin(x / w * 5 + ph) - amp * 0.5 * Math.sin(x / w * 13 + ph)));
      g.lineTo(w, h * 0.62); g.closePath(); g.fill();
    };
    hill('#8A6A5A', 0.55, 0.05, 1); hill('#D9682B', 0.6, 0.035, 3); hill('#2F4A3A', 0.62, 0.02, 5);
    const lake = g.createLinearGradient(0, h * 0.62, 0, h);
    lake.addColorStop(0, '#E8B96E'); lake.addColorStop(1, '#8FA3B8');
    g.fillStyle = lake; g.fillRect(0, h * 0.62, w, h * 0.38);
    g.fillStyle = '#FFF1C8aa'; g.fillRect(w * 0.55, h * 0.64, w * 0.14, 3);
    g.fillRect(w * 0.58, h * 0.7, w * 0.08, 3); g.fillRect(w * 0.6, h * 0.78, w * 0.04, 3);
  });
}
