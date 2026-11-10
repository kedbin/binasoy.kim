// Consistent panel shell for Photos / Certs / Résumé.
// Desktop: side sheet on the right. Compact: bottom sheet with a drag handle (drag down to close).
// Focus moves in on open, Tab is trapped, focus returns to the opener on close. Reports its footprint to the
// store so CameraRig can lens-shift the subject into the free space.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useScene } from '../../state/store';
import { useCompact } from './useCompact';

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active = true) {
  useEffect(() => {
    if (!active) return;
    const el = ref.current; if (!el) return;
    const opener = document.activeElement as HTMLElement | null;
    (el.querySelector<HTMLElement>('[data-autofocus]') ?? el.querySelector<HTMLElement>(FOCUSABLE) ?? el).focus({ preventScroll: true });
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const f = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    el.addEventListener('keydown', k);
    return () => {
      el.removeEventListener('keydown', k);
      // return focus to whatever opened us (dock button) if it still exists; otherwise the dock's current item
      const target = opener && document.contains(opener) && opener !== document.body ? opener : document.querySelector<HTMLElement>('.dock__btn');
      target?.focus({ preventScroll: true });
    };
  }, [ref, active]);
}

interface Props { title: string; label: string; kicker?: string; children: ReactNode; footer?: ReactNode }

export function Sheet({ title, label, kicker, children, footer }: Props) {
  const back = useScene((s) => s.back);
  const setSheet = useScene((s) => s.setSheet);
  const compact = useCompact();
  const ref = useRef<HTMLElement>(null);
  const [drag, setDrag] = useState(0);
  useFocusTrap(ref);

  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const report = () => {
      const r = el.getBoundingClientRect();
      setSheet(compact ? { side: 'bottom', size: Math.round(r.height) } : { side: 'right', size: Math.round(innerWidth - r.left) });
    };
    report();
    const ro = new ResizeObserver(report); ro.observe(el);
    return () => { ro.disconnect(); setSheet(null); };
  }, [compact, setSheet]);

  // drag handle (compact): pull down past 90px to close
  const start = useRef<number | null>(null);
  const onDown = (e: React.PointerEvent) => { start.current = e.clientY; (e.target as HTMLElement).setPointerCapture(e.pointerId); };
  const onMove = (e: React.PointerEvent) => { if (start.current !== null) setDrag(Math.max(0, e.clientY - start.current)); };
  const onUp = () => { if (start.current === null) return; start.current = null; if (drag > 90) back(); else setDrag(0); };

  return (
    <aside
      ref={ref}
      className={'sheet' + (compact ? ' sheet--bottom' : ' sheet--side')}
      role="dialog"
      aria-modal="false"
      aria-label={label}
      tabIndex={-1}
      style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
    >
      {compact && (
        <div className="sheet__handle" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-hidden="true"><span /></div>
      )}
      <div className="sheet__head">
        <div>
          {kicker && <p className="sheet__kicker">{kicker}</p>}
          <h2>{title}</h2>
        </div>
        <button type="button" className="sheet__close" onClick={back} aria-label={`Close ${label}`} data-autofocus>✕</button>
      </div>
      <div className="sheet__body">{children}</div>
      {footer && <div className="sheet__foot">{footer}</div>}
    </aside>
  );
}
