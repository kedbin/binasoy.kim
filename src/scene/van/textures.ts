// Procedural canvas textures for the van (fabric, gingham, floral, plate, paint grime). Small, tiling, generated once.
import * as THREE from 'three';
import { rng } from './util';

function make(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, repeat = 1, srgb = true) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}

/** Fine woven fabric: neutral grey-ish weave + speckle, used as a multiplier map (keep colour in material). */
export const fabricTex = () => make(128, 128, (c, w, h) => {
  const r = rng(7);
  c.fillStyle = '#d8d8d8'; c.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) { c.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.05})`; c.fillRect(0, y, w, 1); }
  for (let x = 0; x < w; x += 2) { c.fillStyle = `rgba(255,255,255,${0.03 + r() * 0.04})`; c.fillRect(x, 0, 1, h); }
  for (let i = 0; i < 900; i++) {
    const v = r() > 0.5 ? 255 : 0;
    c.fillStyle = `rgba(${v},${v},${v},${0.04 + r() * 0.06})`;
    c.fillRect(r() * w, r() * h, 1 + r() * 2, 1);
  }
}, 1);

/** Bump-ish roughness variation for fabric (linear). */
export const fabricBump = () => make(128, 128, (c, w, h) => {
  const r = rng(11);
  c.fillStyle = '#808080'; c.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
    const v = 110 + ((x + y) % 4 === 0 ? 40 : 0) + r() * 30;
    c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(x, y, 2, 2);
  }
}, 1, false);

/** Red/green gingham with woven thread texture. */
export const ginghamTex = (red = '#B8483E', green = '#5E7D4E') => make(256, 256, (c, w, h) => {
  c.fillStyle = '#F1E8D8'; c.fillRect(0, 0, w, h);
  const n = 4, s = w / n;
  c.globalAlpha = 0.78; c.fillStyle = red;
  for (let i = 0; i < n; i++) c.fillRect(0, i * s, w, s / 2);
  c.globalAlpha = 0.62; c.fillStyle = green;
  for (let i = 0; i < n; i++) c.fillRect(i * s, 0, s / 2, h);
  c.globalAlpha = 1;
  const r = rng(3);
  for (let y = 0; y < h; y += 2) { c.fillStyle = `rgba(0,0,0,${0.04 + r() * 0.05})`; c.fillRect(0, y, w, 1); }
  for (let x = 0; x < w; x += 2) { c.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.05})`; c.fillRect(x, 0, 1, h); }
}, 3);

/** Mustard floral print for the pillows. */
export const floralTex = (base = '#D9A93A') => make(256, 256, (c) => {
  c.fillStyle = base; c.fillRect(0, 0, 256, 256);
  const flower = (x: number, y: number, r: number, col: string) => {
    c.fillStyle = col;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      c.beginPath(); c.ellipse(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, r * 0.55, a, 0, 7); c.fill();
    }
    c.fillStyle = '#8a5a1e'; c.beginPath(); c.arc(x, y, r * 0.45, 0, 7); c.fill();
  };
  for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 4; gx++) {
    const ox = (gy % 2) * 32;
    flower(gx * 64 + 32 + ox, gy * 64 + 32, 9, '#FBF3DF');
    c.fillStyle = '#6E8A55';
    c.beginPath(); c.ellipse(gx * 64 + ox + 6, gy * 64 + 6, 6, 3, 0.7, 0, 7); c.fill();
  }
  const r = rng(5);
  for (let i = 0; i < 1500; i++) { c.fillStyle = `rgba(0,0,0,${r() * 0.06})`; c.fillRect(r() * 256, r() * 256, 1, 1); }
}, 1);

/** Cute licence plate. */
export const plateTex = () => {
  const t = make(256, 128, (c, w, h) => {
    c.fillStyle = '#F7F5EE'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#2A3A6A'; c.lineWidth = 6; c.strokeRect(5, 5, w - 10, h - 10);
    c.fillStyle = '#2A3A6A'; c.font = '600 16px system-ui, sans-serif'; c.textAlign = 'center';
    c.fillText('ONTARIO', w / 2, 28);
    c.font = '800 54px ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif';
    c.fillText('KIM', w / 2 - 58, 88);
    c.fillText('WW', w / 2 + 62, 88);
    c.fillStyle = '#D9483E';
    const hx = w / 2 + 2, hy = 70, s = 15;
    c.beginPath();
    c.moveTo(hx, hy + s * 0.9);
    c.bezierCurveTo(hx - s * 1.6, hy - s * 0.2, hx - s * 0.7, hy - s * 1.3, hx, hy - s * 0.4);
    c.bezierCurveTo(hx + s * 0.7, hy - s * 1.3, hx + s * 1.6, hy - s * 0.2, hx, hy + s * 0.9);
    c.fill();
    c.fillStyle = '#2A3A6A'; c.font = 'italic 600 13px system-ui, sans-serif';
    c.fillText('Yours to discover', w / 2, h - 16);
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
};
