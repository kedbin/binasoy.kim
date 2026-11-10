// Lazy Cloudflare Turnstile loader + React hook for CampMail.
// The script is only injected the first time CampMail mounts (never on page load).
import { useCallback, useEffect, useRef, useState } from 'react';

const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string | undefined;
  reset(id?: string): void;
  remove(id?: string): void;
  getResponse(id?: string): string | undefined;
}
declare global { interface Window { turnstile?: TurnstileApi } }

/** Public site key from .env.production / .env.development. If missing, the widget is skipped and CampMail
 *  sends turnstileToken: '' (the worker answers 'captcha' and CampMail shows the send-it-yourself fallback). */
export const SITE_KEY: string = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim();

let loading: Promise<TurnstileApi> | null = null;
export function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loading) return loading;
  loading = new Promise<TurnstileApi>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile missing')));
    s.onerror = () => { loading = null; s.remove(); reject(new Error('turnstile failed to load')); };
    document.head.appendChild(s);
  });
  return loading;
}

type Waiter = (token: string | null) => void;

/**
 * Renders a managed, interaction-only Turnstile widget into `ref` (only when a site key is set).
 * `getToken()` resolves with a token, or '' when there is no site key / the check failed / timed out
 * (the server then answers 'captcha').
 * Call `reset()` after every send attempt — tokens are single-use.
 */
export function useTurnstile() {
  const enabled = SITE_KEY !== '';
  const ref = useRef<HTMLDivElement>(null);
  const id = useRef<string | undefined>(undefined);
  const token = useRef<string | null>(null);
  const failed = useRef(false);
  const waiters = useRef<Waiter[]>([]);
  const [status, setStatus] = useState<'off' | 'loading' | 'ready' | 'error'>(enabled ? 'loading' : 'off');

  const flush = (t: string | null) => { const w = waiters.current; waiters.current = []; w.forEach((f) => f(t)); };

  useEffect(() => {
    if (!enabled) return;
    let dead = false;
    let api: TurnstileApi | undefined;
    loadTurnstile().then((t) => {
      if (dead || !ref.current) return;
      api = t;
      id.current = t.render(ref.current, {
        sitekey: SITE_KEY,
        action: 'contact',
        appearance: 'interaction-only',
        theme: 'light',
        size: 'flexible',
        callback: (tk: string) => { token.current = tk; failed.current = false; setStatus('ready'); flush(tk); },
        'expired-callback': () => { token.current = null; },
        'timeout-callback': () => { token.current = null; },
        'error-callback': () => { token.current = null; setStatus('error'); flush(null); return true; },
      });
      setStatus('ready');
    }).catch(() => { if (dead) return; failed.current = true; setStatus('error'); flush(null); });
    return () => {
      dead = true;
      if (api && id.current) { try { api.remove(id.current); } catch { /* already gone */ } }
      id.current = undefined;
      token.current = null;
    };
  }, [enabled]);

  const getToken = useCallback((timeoutMs = 15000): Promise<string> => {
    if (!enabled) return Promise.resolve('');
    const now = token.current ?? (id.current ? window.turnstile?.getResponse(id.current) : undefined);
    if (now) return Promise.resolve(now);
    if (failed.current) return Promise.resolve('');
    return new Promise((resolve) => {
      const done: Waiter = (t) => { clearTimeout(timer); resolve(t ?? ''); };
      const timer = setTimeout(() => { waiters.current = waiters.current.filter((w) => w !== done); resolve(''); }, timeoutMs);
      waiters.current.push(done);
    });
  }, [enabled]);

  const reset = useCallback(() => {
    token.current = null;
    if (id.current) { try { window.turnstile?.reset(id.current); } catch { /* ignore */ } }
  }, []);

  return { ref, enabled, status, getToken, reset };
}
