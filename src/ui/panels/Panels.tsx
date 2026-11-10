// DOM panels per view. Every panel waits until the camera has arrived (store.arrived) before sliding in.
import { content } from '../../content';
import { useScene } from '../../state/store';
import { useWall } from '../../scene/hotspots/wallStore';
import { PhotoLightbox } from './PhotoLightbox';
import { Sheet, useFocusTrap } from './Sheet';
import { useCompact } from './useCompact';
import { lazy, Suspense, useRef, useState } from 'react';

const KimOS = lazy(() => import('../kimos').then((m) => ({ default: m.KimOS })));

function KimOSModal() {
  const back = useScene((s) => s.back);
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref);
  return (
    <div ref={ref} className="kimos-modal" role="dialog" aria-modal="true" aria-label="KimOS — Kim's portfolio" tabIndex={-1}>
      <Suspense fallback={<p className="kimos-modal__loading">Opening laptop…</p>}>
        <KimOS mode="modal" onExit={back} />
      </Suspense>
    </div>
  );
}

export function StickersPanel() {
  const feat = content.certs.filter((c) => c.featured), more = content.certs.filter((c) => !c.featured);
  return (
    <Sheet title="Certifications" label="Certifications" kicker="Stickers on the van wall">
      {content.certs.length === 0 && <p className="sheet__empty">No certifications listed yet.</p>}
      <ul className="certs">
        {feat.map((c) => <li key={c.id} data-vendor={c.vendor}><span className="dot" /><div><strong>{c.name}</strong><em>{c.issuer}</em><p>{c.blurb}</p></div></li>)}
      </ul>
      {more.length > 0 && <><h3>Also certified</h3><ul className="certs certs--small">{more.map((c) => <li key={c.id} data-vendor={c.vendor}><span className="dot" /><div><strong>{c.name}</strong><em>{c.issuer}</em></div></li>)}</ul></>}
    </Sheet>
  );
}

export function ClipboardPanel() {
  const { experience, profile } = content;
  return (
    <Sheet
      title="Experience"
      label="Experience summary"
      kicker="Résumé on the clipboard"
      footer={<a className="btn" href={profile.resumePdf} download>Download résumé (PDF)</a>}
    >
      {experience.length === 0 && <p className="sheet__empty">Nothing here yet.</p>}
      <ol className="jobs">
        {experience.map((j) => (
          <li key={j.id}>
            <strong>{j.role}</strong>
            <em>{j.company} · {j.start}–{j.end}</em>
            {j.summary && <p>{j.summary}</p>}
            <ul>{j.bullets.slice(0, 2).map((b, i) => <li key={i}>{b}</li>)}</ul>
          </li>
        ))}
      </ol>
    </Sheet>
  );
}

function Thumb({ i }: { i: number }) {
  const p = content.photos[i];
  const [ok, setOk] = useState(false);
  return (
    <li>
      <button type="button" className={'thumb' + (ok ? ' is-loaded' : '')} onClick={() => useWall.getState().setOpen(i)} aria-label={`Open photo ${i + 1}: ${p.alt}`}>
        <img src={p.src.replace(/\.webp$/, '-thumb.webp')} alt="" loading="lazy" decoding="async" onLoad={() => setOk(true)} />
      </button>
    </li>
  );
}

export function WallPanel() {
  const open = useWall((s) => s.open);
  const compact = useCompact();
  return (
    <>
      <Sheet title="Photos" label="Photo wall" kicker={compact ? 'Tap a photo to enlarge' : 'Click a polaroid or a photo to enlarge'}>
        {content.photos.length === 0
          ? <p className="sheet__empty">No photos pinned up yet.</p>
          : <ul className="thumbs">{content.photos.map((_, i) => <Thumb key={i} i={i} />)}</ul>}
      </Sheet>
      {open !== null && <PhotoLightbox />}
    </>
  );
}

export function Panels() {
  const view = useScene((s) => s.view);
  const arrived = useScene((s) => s.arrived === s.view && !s.transitioning);
  const compact = useCompact();
  if (!arrived) return null;
  switch (view) {
    case 'stickers': return <StickersPanel />;
    case 'clipboard': return <ClipboardPanel />;
    case 'wall': return <WallPanel />;
    case 'laptop': return compact ? <KimOSModal /> : null; // desktop: KimOS lives on the 3D screen (LaptopScreen)
    case 'outside': return <p className="caption">Algonquin, golden hour · Kim &amp; Wingwing</p>;
    default: return null;
  }
}
