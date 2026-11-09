// OWNER: Sonnet task S7/S8. HUD: name chip, back button, day/night, sound, "quick view" (reader) toggle.
import { useScene } from '../state/store';

export function Overlay() {
  const { view, goTo, back, toggleTime, timeOfDay, toggleSound, sound } = useScene();
  const quick = () => {
    localStorage.setItem('kb:mode', 'reader');
    location.reload();
  };
  return (
    <div className="hud">
      <header className="hud__name">
        <strong>Kim Binasoy</strong> <span>& Wingwing's van</span>
      </header>
      <nav className="hud__controls" aria-label="Scene controls">
        {view === 'intro' ? (
          <button onClick={() => goTo('seat')}>Climb in →</button>
        ) : view !== 'seat' ? (
          <button onClick={back}>← Back (Esc)</button>
        ) : null}
        <button onClick={toggleTime} aria-pressed={timeOfDay === 'night'}>{timeOfDay === 'golden' ? '☀︎ Golden hour' : '☾ Night'}</button>
        <button onClick={toggleSound} aria-pressed={sound}>{sound ? '♪ Sound on' : '♪ Sound off'}</button>
        <button onClick={quick}>Quick view</button>
      </nav>
    </div>
  );
}
