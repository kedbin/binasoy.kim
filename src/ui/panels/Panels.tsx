import { content } from '../../content';
import { useScene } from '../../state/store';
import { PhotoLightbox } from './PhotoLightbox';

function Sheet({ title, children, label }: { title: string; children: React.ReactNode; label: string }) {
  const back = useScene((s) => s.back);
  return (
    <aside className="panel" role="region" aria-label={label}>
      <div className="panel__head"><h2>{title}</h2><button onClick={back} aria-label="Close panel">✕</button></div>
      <div className="panel__body">{children}</div>
    </aside>
  );
}

export function StickersPanel() {
  const feat = content.certs.filter((c) => c.featured), more = content.certs.filter((c) => !c.featured);
  return (
    <Sheet title="Certifications" label="Certifications">
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
    <Sheet title="Experience" label="Experience summary">
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
      <a className="btn" href={profile.resumePdf} download>Download résumé (PDF)</a>
    </Sheet>
  );
}

export function WallPanel() {
  return (
    <>
      <PhotoLightbox />
    </>
  );
}

export function Panels() {
  const view = useScene((s) => s.view);
  switch (view) {
    case 'stickers': return <StickersPanel />;
    case 'clipboard': return <ClipboardPanel />;
    case 'wall': return <WallPanel />;
    case 'laptop': return <div id="kimos-modal-root" />; // mobile KimOS mount point (S7)
    case 'outside': return <div className="caption">Algonquin, golden hour · Kim &amp; Wingwing</div>;
    default: return null;
  }
}
