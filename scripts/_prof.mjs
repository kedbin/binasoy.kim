// Usage: node scripts/_prof.mjs <cpuprofile> [topN]  -> self time + inclusive time per function
import fs from 'node:fs';
const [f, topN = '35', filt = '', w0 = '', w1 = ''] = process.argv.slice(2); // filt: regex on key; w0/w1: window in ms from profile start
const p = JSON.parse(fs.readFileSync(f, 'utf8'));
const nodes = new Map(p.nodes.map((n) => [n.id, n]));
const parent = new Map(); for (const n of p.nodes) for (const c of n.children || []) parent.set(c, n.id);
const self = new Map(), incl = new Map();
const key = (n) => (n.callFrame.functionName || '(anon)') + ' ' + n.callFrame.url.split('/').pop().split('?')[0] + ':' + n.callFrame.lineNumber;
let total = 0;
let clock = 0;
for (let i = 0; i < p.samples.length; i++) {
  const dt = (p.timeDeltas[i] || 0) / 1000; clock += dt;
  if (w0 && (clock < +w0 || clock > +w1)) continue;
  total += dt;
  let n = nodes.get(p.samples[i]);
  self.set(key(n), (self.get(key(n)) || 0) + dt);
  if (process.env.ANC) { let ok = false; for (let id = n.id; id != null; id = parent.get(id)) if (key(nodes.get(id)).includes(process.env.ANC)) { ok = true; break; } if (!ok) continue; }
  const seen = new Set();
  for (let id = n.id; id != null; id = parent.get(id)) { const k = key(nodes.get(id)); if (!seen.has(k)) { seen.add(k); incl.set(k, (incl.get(k) || 0) + dt); } }
}
const show = (m, t) => { console.log('--- ' + t + ' (total ' + Math.round(total) + 'ms)'); [...m].filter(([k]) => !filt || new RegExp(filt).test(k)).sort((a, b) => b[1] - a[1]).slice(0, +topN).forEach(([k, v]) => console.log(String(Math.round(v)).padStart(7) + 'ms  ' + k)); };
show(self, 'SELF'); show(incl, 'INCLUSIVE');
