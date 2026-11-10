import { useEffect } from 'react';
import { useScene } from '../state/store';

type HowlT = import('howler').Howl;

const AMBIENT_VOL = 0.55;
const FADE = 2500;
const base = import.meta.env.BASE_URL + 'audio/';
const src = (n: string) => [base + n + '.ogg', base + n + '.mp3'];

/** Mount outside the Canvas. Renders nothing; howler is lazy-loaded on first enable. */
export function AudioManager() {
  const sound = useScene((s) => s.sound);

  useEffect(() => {
    if (!sound) return;
    let disposed = false;
    let cleanup: (() => void) | null = null;

    import('howler').then(({ Howl, Howler }) => {
      if (disposed) return;
      const mk = (n: string, o: ConstructorParameters<typeof Howl>[0] extends infer T ? Partial<T> : never) =>
        new Howl({ src: src(n), html5: false, ...o } as never) as HowlT;
      const lake = mk('lake', { loop: true, volume: 0 });
      const night = mk('night', { loop: true, volume: 0 });
      const loon = mk('loon', { volume: 0.35 });
      const click = mk('click', { volume: 0.5 });
      Howler.mute(false);

      let duck = 1;
      let tod = useScene.getState().timeOfDay;
      const target = (kind: 'golden' | 'night') => (tod === kind ? AMBIENT_VOL * duck : 0);
      const apply = (ms: number) => {
        for (const [h, k] of [[lake, 'golden'], [night, 'night']] as const) {
          const from = h.volume();
          h.fade(from, target(k), ms);
        }
      };
      lake.play(); night.play();
      apply(FADE);

      let loonTimer: number | undefined;
      const scheduleLoon = () => {
        loonTimer = window.setTimeout(() => {
          if (!document.hidden) { loon.volume(0.3 * duck); loon.play(); }
          scheduleLoon();
        }, 40000 + Math.random() * 50000);
      };
      scheduleLoon();

      let view = useScene.getState().view;
      duck = view === 'laptop' ? 0.4 : 1;
      apply(400);
      const unsub = useScene.subscribe((s) => {
        if (s.view !== view) {
          view = s.view;
          click.play();
          const d = view === 'laptop' ? 0.4 : 1;
          if (d !== duck) { duck = d; apply(700); }
        }
        if (s.timeOfDay !== tod) { tod = s.timeOfDay; apply(FADE); }
      });

      const onVis = () => {
        if (document.hidden) { Howler.mute(true); lake.pause(); night.pause(); }
        else { Howler.mute(false); lake.play(); night.play(); apply(500); }
      };
      document.addEventListener('visibilitychange', onVis);

      cleanup = () => {
        unsub();
        document.removeEventListener('visibilitychange', onVis);
        window.clearTimeout(loonTimer);
        for (const h of [lake, night]) { h.fade(h.volume(), 0, 500); window.setTimeout(() => { h.stop(); h.unload(); }, 550); }
        loon.stop(); loon.unload(); click.unload();
      };
    });

    return () => { disposed = true; cleanup?.(); };
  }, [sound]);

  return null;
}
