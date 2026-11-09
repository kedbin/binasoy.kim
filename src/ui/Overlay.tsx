// OWNER: Sonnet task S7/S8. HUD: name chip, back button, day/night, sound, "quick view" (reader) toggle,
// contextual hint, nav row (keyboard/screen-reader equivalents of the 3D hotspots) and DOM panels.
import '../styles/hud.css';
import { useScene, type View } from '../state/store';
import { Panels } from './panels/Panels';

const NAV: { view: View; label: string }[] = [
  { view: 'laptop', label: 'Laptop' },
  { view: 'wall', label: 'Photos' },
  { view: 'stickers', label: 'Stickers' },
  { view: 'clipboard', label: 'Résumé' },
  { view: 'outside', label: 'Look outside' },
];

const HINTS: Record<View, string> = {
  intro: 'Climb in to take a look around',
  seat: 'Click the laptop to see my work · drag to look around',
  laptop: 'Esc to step back',
  wall: 'Click a polaroid to enlarge · Esc to step back',
  stickers: 'Esc to step back',
  clipboard: 'Esc to step back',
  outside: 'Esc to step back',
};

export function Overlay() {
  const { view, goTo, back, toggleTime, timeOfDay, toggleSound, sound, hovered } = useScene();
  const quick = () => {
    localStorage.setItem('kb:mode', 'reader');
    location.reload();
  };
  return (
    <div className="hud" data-view={view}>
      <header className="hud__name">
        <strong>Kim Binasoy</strong> <span>&amp; Wingwing's van</span>
      </header>
      <div className="hud__hint" aria-live="polite">{hovered ? 'Click to open' : HINTS[view]}</div>
      <Panels />
      <div className="hud__bottom">
        {view !== 'intro' && (
          <nav className="hud__nav" aria-label="Look around the van">
            {NAV.map((n) => (
              <button key={n.view} onClick={() => goTo(n.view)} aria-current={view === n.view ? 'true' : undefined} className={view === n.view ? 'is-on' : ''}>{n.label}</button>
            ))}
          </nav>
        )}
        <nav className="hud__controls" aria-label="Scene controls">
          {view === 'intro' ? (
            <button className="primary" onClick={() => goTo('seat')}>Climb in →</button>
          ) : view !== 'seat' ? (
            <button onClick={back}>← Back (Esc)</button>
          ) : null}
          <button onClick={toggleTime} aria-pressed={timeOfDay === 'night'}>{timeOfDay === 'golden' ? '☀︎ Golden hour' : '☾ Night'}</button>
          <button onClick={toggleSound} aria-pressed={sound}>{sound ? '♪ Sound on' : '♪ Sound off'}</button>
          <button onClick={quick}>Quick view</button>
        </nav>
      </div>
    </div>
  );
}
