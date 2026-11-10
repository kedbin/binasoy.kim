// KimOS Terminal: a small, friendly shell. Short command list, Tab completion, ↑/↓ history.
// 'wingwing' picks a random flavour line (not facts; no dates, places, employers or numbers).
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { content } from '../../content';
import { PAGES, pageOf, resolvePage } from './pages';
import type { PageId } from './pages';

const P = content.profile;
const W = P.partner;

/** Flavour lines for `wingwing`. Warm, playful, no facts. */
export const WING_LINES: string[] = [
  `${W} is the best co-pilot on every trail.`,
  `${W} picks the campsite, and somehow it always has the best view.`,
  `${W} is in charge of snacks. Morale has never been higher.`,
  `Every sunset is better with ${W} narrating it.`,
  `${W} can turn a cold van into the coziest place on earth.`,
  `${W} has already named every duck on the lake.`,
  `The fairy lights were ${W}’s idea, and they’re perfect.`,
  `${W} is the reason the playlist has the best songs.`,
  `${W} is chief raft inflator and head of giggles.`,
  `Hot chocolate tastes better when ${W} makes it.`,
  `${W} spots the first star, every single time.`,
  `${W} makes any parking spot feel like home.`,
  `The lake is calm, the fire is warm, and ${W} is stealing all the blankets.`,
  `${W} rates every sunset. They all get full marks.`,
  `${W} is the best part of every road trip.`,
  `${W} says it’s s’mores o’clock. ${W} is always right.`,
];
const ART = [
  '  .-.   .-.',
  ' (   \\ /   )',
  '  \\   v   /',
  '   \\     /',
  '    \\   /',
  "     '.'",
];
const PAW = [
  '   o   o',
  ' o       o',
  '   .---.',
  '  (     )',
  "   '---'",
];

const FIRE = [
  '      (  .      )',
  '     )           (     )',
  '      .  \'   .   \'  .',
  '   (    , )       (.   )',
  '     .\'  ) ( . )    ,',
  '      \\ ( \\ ) ( /  /',
  '     _(_.\'_)_.(_\'_)_',
  '    (____________)   crackle…',
].join('\n');
const STARS = [
  '   .        *            .      ✦',
  '        ✦        .   *         .',
  '  *         .          ✦    .',
  '       .  ✦      *        .      *',
  '  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '   the lake is holding every one of them',
].join('\n');

const COMMANDS: { cmd: string; help: string }[] = [
  { cmd: 'help', help: 'show this list' },
  { cmd: 'about', help: `who is ${P.shortName}?` },
  { cmd: 'open <page>', help: 'open a page in Trailhead (' + PAGES.map((x) => x.path.split('-')[0]).join(', ') + ')' },
  { cmd: 'mail', help: 'write to ' + P.shortName + ' in CampMail' },
  { cmd: 'wingwing', help: 'a little note about ' + W },
  { cmd: 'clear', help: 'tidy the screen' },
  { cmd: 'exit', help: 'close the terminal' },
];
const NAMES = ['help', 'about', 'open', 'mail', 'wingwing', 'clear', 'exit', 'campfire', 'stars'];
const OPEN_ARGS = PAGES.map((x) => x.path.split('-')[0]);

interface Line { kind: 'in' | 'out' | 'art' | 'err' | 'sys'; text: string }

export function Terminal({ onClose, openPage, openMail }: { onClose: () => void; openPage: (p: PageId) => void; openMail: () => void }) {
  const [lines, setLines] = useState<Line[]>([
    { kind: 'sys', text: `KimOS terminal · ${P.shortName.toLowerCase()}@van` },
    { kind: 'sys', text: 'type "help" to see what this little shell can do.' },
  ]);
  const [val, setVal] = useState('');
  const [hist, setHist] = useState<string[]>([]);
  const [hi, setHi] = useState(-1);
  const [lastWing, setLastWing] = useState(-1);
  const endRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { const b = boxRef.current; if (b) b.scrollTop = b.scrollHeight; }, [lines]);

  const say = (...ls: Line[]) => setLines((l) => [...l, ...ls]);
  const out = (text: string, kind: Line['kind'] = 'out'): Line => ({ kind, text });

  const wing = (): Line[] => {
    let i = Math.floor(Math.random() * WING_LINES.length);
    if (WING_LINES.length > 1 && i === lastWing) i = (i + 1) % WING_LINES.length;
    setLastWing(i);
    const art = Math.random() < 0.5 ? ART : PAW;
    return [out(art.join('\n'), 'art'), out(WING_LINES[i])];
  };

  const run = (raw: string): Line[] | 'clear' => {
    const [c0, ...rest] = raw.trim().split(/\s+/);
    const c = (c0 ?? '').toLowerCase();
    const arg = rest.join(' ');
    switch (c) {
      case '': return [];
      case 'help': case '?':
        return [out(COMMANDS.map((x) => '  ' + x.cmd.padEnd(13) + x.help).join('\n')), out('psst: there might be a campfire somewhere…', 'sys')];
      case 'about': case 'whoami':
        return [out(`${P.name}\n${P.roles.join(' · ')}\n\n${P.tagline}`), out('more: open about', 'sys')];
      case 'open': case 'cd': {
        if (!arg) return [out('open where? try: ' + OPEN_ARGS.join(', '), 'err')];
        const pg = resolvePage(arg);
        if (!pg) return [out(`no trail called "${arg}". try: ${OPEN_ARGS.join(', ')}`, 'err')];
        openPage(pg);
        return [out(`opening trail://kim/${pageOf(pg).path} in Trailhead…`)];
      }
      case 'mail': openMail(); return [out('opening CampMail… ✉️')];
      case 'wingwing': case 'wing': return wing();
      case 'campfire': case 'fire': return [out(FIRE, 'art')];
      case 'stars': return [out(STARS, 'art')];
      case 'clear': return 'clear';
      case 'exit': case 'quit': onClose(); return [];
      case 'sudo': return [out('nice try. the van stays parked. 🚐', 'err')];
      default: return [out(`${c}: not a command. try "help"`, 'err')];
    }
  };

  const complete = () => {
    const v = val.replace(/^\s+/, '');
    const parts = v.split(/\s+/);
    if (parts.length <= 1) {
      const m = NAMES.filter((n) => n.startsWith(parts[0].toLowerCase()));
      if (m.length === 1) setVal(m[0] + (m[0] === 'open' ? ' ' : ''));
      else if (m.length > 1) say(out('$ ' + v, 'in'), out(m.join('  '), 'sys'));
      return;
    }
    if (parts[0].toLowerCase() === 'open' || parts[0].toLowerCase() === 'cd') {
      const a = parts[1].toLowerCase();
      const m = OPEN_ARGS.filter((n) => n.startsWith(a));
      if (m.length === 1) setVal(parts[0] + ' ' + m[0]);
      else if (m.length > 1) say(out('$ ' + v, 'in'), out(m.join('  '), 'sys'));
    }
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') { if (val.trim()) { e.preventDefault(); complete(); } return; }
    if (e.key === 'ArrowUp') { if (!hist.length) return; e.preventDefault(); const n = Math.min(hist.length - 1, hi + 1); setHi(n); setVal(hist[hist.length - 1 - n]); return; }
    if (e.key === 'ArrowDown') { if (hi < 0) return; e.preventDefault(); const n = hi - 1; setHi(n); setVal(n < 0 ? '' : hist[hist.length - 1 - n]); return; }
    if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); setLines([]); return; }
    if (e.key !== 'Enter') return;
    const cmd = val; setVal(''); setHi(-1);
    if (cmd.trim()) setHist((h) => (h[h.length - 1] === cmd ? h : [...h.slice(-49), cmd]));
    const res = run(cmd);
    if (res === 'clear') { setLines([]); return; }
    say(out('$ ' + cmd, 'in'), ...res);
  };

  return (
    <div className="kos-term" ref={boxRef} onClick={() => { if (!window.getSelection()?.toString()) inputRef.current?.focus({ preventScroll: true }); }}>
      <div role="log" aria-live="polite" aria-label="Terminal output">
        {lines.map((l, i) => <div key={i} className={'kos-term__' + l.kind}>{l.text}</div>)}
      </div>
      <div className="kos-term__prompt">
        <span aria-hidden="true">{P.shortName.toLowerCase()}@van:~$</span>
        <input ref={inputRef} value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={onKey}
          aria-label="Terminal input. Type help for commands. Tab completes." spellCheck={false} autoCapitalize="off" autoComplete="off" />
      </div>
      <div ref={endRef} />
    </div>);
}
