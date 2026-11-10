# KimOS

The laptop desktop. `KimOS.tsx` is mounted by `scene/hotspots/LaptopScreen.tsx` (`mode="screen"`, a fixed 1280×800 canvas inside drei `<Html transform>`) and by `ui/panels/Panels.tsx` (`mode="modal"`, full-screen and compact).

## Desktop (5 icons)
| Icon | What |
|---|---|
| **Trailhead** | Browser-style app with all the portfolio pages: About, Experience, Projects, Certs & Skills, Résumé (download link). Back/Forward (Alt+←/→), Reload, Home, and a bookmarks bar. |
| **CampMail** | Contact form. Sends in-page to `POST /api/contact` (Cloudflare Worker, `worker/index.ts`). |
| **Photos** | `content.photos` gallery (thumbs, then the full image with prev/next). |
| **Terminal** | Flavour: `help`, `whoami`, `ls`, `open <page>`, `mail`, `skills`, `wingwing`, `weather`, history with ↑/↓. |
| **Back to the van** | Calls `onExit` (the same as "Close lid"). |

All text comes from `content.json`.

## CampMail
- `contact.ts` holds the API client, the reason mapping, and the failure copy. `turnstile.ts` holds the lazy Turnstile loader and the `useTurnstile()` hook.
- Phases: `editing → sending (min 1.6 s; none with reduced motion) → sent | failed`.
- Payload: `{ message, subject?, email?, name?, template, trap, mountedAt, turnstileToken }`. There is never a `to` field, and the To line is read-only.
- Reasons:
  - 400 → `invalid`
  - 403 → `captcha` or `refused`
  - 429 → `busy`
  - 5xx → `server`
  - network error → `offline`
  - `refused` less than 3 s after opening → `hasty`
  - 404/405, or a non-JSON reply → `unavailable`
- The mailto / copy fallback is shown, and labelled as such, only for `unavailable` and `captcha`.
- Turnstile: `api.js?render=explicit` is injected only when CampMail mounts. The widget renders with `action:'contact'` and `appearance:'interaction-only'`, and it is reset after every attempt. The site key comes from `VITE_TURNSTILE_SITE_KEY` (`.env.development` uses the always-pass test key; `.env.production` uses the real key). Without a key, the widget is skipped and `turnstileToken:''` is sent. The server answers `captcha`, and the user sees the fallback.

## Checks
- `node .tmp/kimos-test.mjs` runs harness tests (mocked fetch plus a stubbed Turnstile).
- `node .tmp/kimos-ts-real.mjs` runs the real Turnstile test key in the harness.
- `node .tmp/kimos-scene.mjs` runs the in-scene screenshots.
- Harness: `/src/ui/kimos/harness.html` (`?mode=modal` for the compact layout).
