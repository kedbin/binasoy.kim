import { useEffect } from 'react';
import { content } from '../../content';
import { useWall } from '../../scene/hotspots/wallStore';

export function PhotoLightbox() {
  const open = useWall((s) => s.open);
  const setOpen = useWall((s) => s.setOpen);
  useEffect(() => {
    if (open === null) return;
    const n = content.photos.length;
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(null); }
      if (e.key === 'ArrowRight') setOpen((open + 1) % n);
      if (e.key === 'ArrowLeft') setOpen((open + n - 1) % n);
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [open, setOpen]);
  if (open === null) return null;
  const p = content.photos[open];
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo" onClick={() => setOpen(null)}>
      <figure onClick={(e) => e.stopPropagation()}>
        <img src={p.src} alt={p.alt} />
        <figcaption>{p.caption}</figcaption>
        <div className="lightbox__nav">
          <button onClick={() => setOpen((open + content.photos.length - 1) % content.photos.length)} aria-label="Previous photo">←</button>
          <span>{open + 1} / {content.photos.length}</span>
          <button onClick={() => setOpen((open + 1) % content.photos.length)} aria-label="Next photo">→</button>
          <button onClick={() => setOpen(null)} autoFocus>Close</button>
        </div>
      </figure>
    </div>
  );
}
