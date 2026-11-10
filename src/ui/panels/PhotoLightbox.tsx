import { useEffect, useRef, useState } from 'react';
import { content } from '../../content';
import { useWall } from '../../scene/hotspots/wallStore';
import { useFocusTrap } from './Sheet';

/** Photo lightbox: prev/next buttons, ←/→ keys, swipe, Esc closes (only the lightbox, not the view). */
export function PhotoLightbox() {
  const open = useWall((s) => s.open);
  const setOpen = useWall((s) => s.setOpen);
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [dx, setDx] = useState(0);
  const sx = useRef<number | null>(null);
  useFocusTrap(ref, open !== null);
  const n = content.photos.length;

  useEffect(() => {
    if (open === null) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); setOpen(null); }
      else if (e.key === 'ArrowRight') { e.stopPropagation(); setOpen((open + 1) % n); }
      else if (e.key === 'ArrowLeft') { e.stopPropagation(); setOpen((open + n - 1) % n); }
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [open, setOpen, n]);

  if (open === null) return null;
  const p = content.photos[open];
  const go = (d: number) => setOpen((open + d + n) % n);
  const down = (e: React.PointerEvent) => { if (e.pointerType !== 'mouse') sx.current = e.clientX; };
  const move = (e: React.PointerEvent) => { if (sx.current !== null) setDx(e.clientX - sx.current); };
  const up = () => { if (sx.current === null) return; sx.current = null; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); setDx(0); };

  return (
    <div ref={ref} className="lightbox" role="dialog" aria-modal="true" aria-label={`Photo ${open + 1} of ${n}`} onClick={() => setOpen(null)}>
      <figure
        onClick={(e) => e.stopPropagation()}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={dx ? { transform: `translateX(${dx}px) rotate(${dx * 0.01}deg)`, transition: 'none' } : undefined}
      >
        <div className={'lightbox__img' + (loaded === p.src ? ' is-loaded' : '')}>
          <img
            key={p.src}
            ref={(el) => { if (el?.complete && el.naturalWidth > 0 && loaded !== p.src) setLoaded(p.src); }}
            src={p.src}
            alt={p.alt}
            onLoad={() => setLoaded(p.src)}
            draggable={false}
          />
        </div>
        <figcaption>{p.caption}</figcaption>
        <div className="lightbox__nav">
          <button type="button" onClick={() => go(-1)} aria-label="Previous photo">←</button>
          <span aria-live="polite">{open + 1} / {n}</span>
          <button type="button" onClick={() => go(1)} aria-label="Next photo">→</button>
          <button type="button" className="lightbox__close" onClick={() => setOpen(null)} data-autofocus>Close</button>
        </div>
      </figure>
    </div>
  );
}
