import { useScene } from '../state/store';
import { PLACES } from './places';

/** One compact dock that mirrors the 3D hotspots. Highlights the current place; 1–5 shortcuts shown as hints. */
export function Dock() {
  const view = useScene((s) => s.view);
  const hovered = useScene((s) => s.hovered);
  const goTo = useScene((s) => s.goTo);
  return (
    <nav className="dock" aria-label="Places in the van">
      <ul>
        {PLACES.map((p) => {
          const on = view === p.view;
          const hot = hovered === p.view || (p.view === 'outside' && hovered === 'hatch');
          return (
            <li key={p.view}>
              <button
                type="button"
                className={'dock__btn' + (on ? ' is-on' : '') + (hot ? ' is-hot' : '')}
                aria-current={on ? 'location' : undefined}
                aria-keyshortcuts={p.key}
                onClick={() => (on ? useScene.getState().back() : goTo(p.view))}
                title={`${p.marker} (${p.key})`}
              >
                <span className="dock__icon" aria-hidden="true">{p.icon}</span>
                <span className="dock__label">{p.label}</span>
                <kbd className="dock__key" aria-hidden="true">{p.key}</kbd>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
