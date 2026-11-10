// Usage: node scripts/_tasks.mjs <cpuprofile> [minMs=150] -> busy stretches (split on idle) with their heaviest app-level frames
import fs from 'node:fs';
const [f, minMs = '150'] = process.argv.slice(2);
const p = JSON.parse(fs.readFileSync(f, 'utf8'));
const nodes = new Map(p.nodes.map((n) => [n.id, n]));
const parent = new Map(); for (const n of p.nodes) for (const c of n.children || []) parent.set(c, n.id);
const key = (n) => (n.callFrame.functionName || '(anon)') + ' ' + n.callFrame.url.split('/').pop().split('?')[0].replace(/-[\w-]{8}\.js/, '') + ':' + n.callFrame.lineNumber;
const tasks = []; let cur = null, clock = 0, idleRun = 0;
for (let i = 0; i < p.samples.length; i++) {
  const dt = (p.timeDeltas[i] || 0) / 1000; clock += dt;
  const n = nodes.get(p.samples[i]); const idle = n.callFrame.functionName === '(idle)';
  if (idle) { idleRun += dt; if (cur && idleRun > 3) { tasks.push(cur); cur = null; } continue; }
  idleRun = 0;
  if (!cur) cur = { start: clock, dur: 0, incl: new Map() };
  cur.dur += dt;
  const seen = new Set();
  for (let id = n.id; id != null; id = parent.get(id)) { const k = key(nodes.get(id)); if (!seen.has(k)) { seen.add(k); cur.incl.set(k, (cur.incl.get(k) || 0) + dt); } }
}
if (cur) tasks.push(cur);
for (const t of tasks.filter((t) => t.dur >= +minMs)) {
  const top = [...t.incl].filter(([k]) => /^(?!\(anon\))[A-Za-z_$][\w$.]{2,} (mount|index|kimos|Effects|three):|fromScene|compile |G\.getProgramParameter|onFirstUse|Reflector|shadowMap|texSubImage|texImage|bufferData/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 12);
  console.log('@' + Math.round(t.start) + 'ms  ' + Math.round(t.dur) + 'ms: ' + top.map(([k, v]) => k.replace(/ (mount|r3f|three|index)/, ' ') + '=' + Math.round(v)).join(', '));
}
