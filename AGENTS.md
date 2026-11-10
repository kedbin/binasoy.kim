# AGENTS.md — binasoy.kim "Van Camp"

Guide for AI agents working in this repo. Read `REVAMP_PLAN.md` for the design intent and `ASSETS.md` for asset provenance.

## Project overview
Personal portfolio for Kim Edrian Binasoy, staged as a cosy 3D golden-hour camp inside a minivan, looking out a tailgate at a still lake. The laptop on the bed opens **KimOS**, an interactive desktop UI that carries the portfolio content.

It is **progressive enhancement**: a semantic static reader (`#reader`) is rendered into `index.html` at build time and is always in the DOM. The 3D layer mounts on top only when JS, WebGL, and motion checks pass (`src/boot.ts`). No-JS, print, screen readers, SEO, and low-end devices all get the reader.

## Stack
Vite 8 · React 19 · TypeScript · three 0.187 · @react-three/fiber 9 · @react-three/drei 10 · @react-three/postprocessing (light bloom/vignette only) · zustand 5 (scene/UI state) · detect-gpu (tier) · howler (audio, planned) · maath (easing) · Playwright (tests and screenshots).

## Commands
```
npm install
npm run dev          # vite dev server (reader plugin runs here too)
npm run typecheck    # tsc --noEmit
npm run build        # tsc --noEmit && vite build  -> dist/
npm run preview      # vite preview on :4173 (serve dist/ after a build)
npm test             # playwright test (no tests/ dir yet; add under tests/)
node scripts/shot.mjs <url> <out.png> [view] [waitMs=7000] [w=1440] [h=900]
```
`shot.mjs` launches headed-capable Chromium with GPU flags, optionally calls `window.__scene.getState().goTo(view)`, screenshots, and prints console errors. Example: `node scripts/shot.mjs http://localhost:5173/ out/laptop.png laptop`. Use `?q=low|mid|high` to force a quality tier and `?reader` to force the static reader. Run `npm run build && npm run preview` first if you want the production bundle.

## Directory map
Root
- `index.html` — shell; `<!--READER-->` placeholder is filled by `scripts/vite-reader-plugin.ts`.
- `REVAMP_PLAN.md` — design, art direction, camera state machine, work routing.
- `ASSETS.md` — CC0 asset shortlist and licences. `assets-src/raw/` is git-ignored.
- `CNAME`, `Kim_Binasoy_Resume.pdf` — copied into `dist/` by the deploy workflow.
- `legacy/` — the old portfolio (reference only, do not edit).
- `RevampRef/` — reference photos for the art direction.

`public/`
- `CNAME` — custom domain (`binasoy.kim`), shipped with the build.
- `photos/` — `van-01..06.webp` plus `-thumb.webp` variants.
- `favicon.svg`, `Kim_Binasoy_Resume.pdf`.

`scripts/`
- `shot.mjs` — Playwright screenshot helper (see Commands).
- `vite-reader-plugin.ts` — injects the reader HTML into `index.html` at build and dev time.
- `generate_resume.py` — generates the résumé (not used by the build).

`src/`
- `boot.ts` — entry point; chooses static reader vs 3D (WebGL, reduced motion, `?reader`, `kb:mode` in localStorage).
- `app/App.tsx` — R3F `<Canvas>`; composes scene parts; DPR per quality tier.
- `app/mount.tsx` — React root mount for the 3D app.
- `app/quality.ts` — `pickQuality()`: `?q=` override, else `detect-gpu` tier.
- `content/content.json` — **single source of truth for all facts.** `types.ts` is its schema; `index.ts` exports `content`.
- `reader/render.ts` — pure `Content -> HTML` for the static reader; holds `PHOTO_SIZES` (intrinsic sizes).
- `state/store.ts` — zustand `useScene`: `view`, `quality`, `timeOfDay`, `sound`, `loaded`, `hovered`, `goTo/back`. Exposed as `window.__scene` in dev or `?debug`.
- `scene/layout.ts` — **shared world constants**: `VAN`, `WORLD`, `ANCHORS`, `CAMERA`, `PALETTE`.
- `scene/CameraRig.tsx` — animates the camera between `CAMERA` presets per view.
- `scene/Lighting.tsx`, `scene/Effects.tsx` — lights, time-of-day, post-processing.
- `scene/van/Van.tsx` — procedural van shell, interior, bed, sunroof, fairy lights, hatch.
- `scene/lake/` — `Lake.tsx` (assembly), `Sky.tsx`, `Water.tsx` (stylised shader), `Hills.tsx`, `Trees.tsx`, `Shore.tsx`, `timeOfDay.ts`, `noise.ts`.
- `scene/characters/` — `Characters.tsx` (assembly), `People.tsx`, `Raft.tsx`, `Kayak.tsx`, `Leaves.tsx`, `Birds.tsx`, `Fireflies.tsx`.
- `scene/hotspots/` — `Hotspot.tsx` (clickable anchor + label), `Hotspots.tsx` (hatch + assembly), `Laptop.tsx`, `LaptopScreen.tsx` (KimOS via `<Html transform occlude>`), `PhotoWall.tsx`, `Stickers.tsx`, `Clipboard.tsx`, plus `laptopStore.ts`, `wallStore.ts`, `textures.ts`.
- `ui/Overlay.tsx` — HUD: name chip, back, day/night, sound, quick-view toggle.
- `ui/Loader.tsx` — loading screen.
- `ui/kimos/KimOS.tsx` — desktop UI: `APPS` table, window manager, app components; `kimos.css`; `harness.tsx`/`harness.html` for isolated work.
- `ui/panels/Panels.tsx`, `PhotoLightbox.tsx` — DOM panels for hotspot content and the photo lightbox.
- `styles/` — `global.css`, `hud.css`, `reader.css`.

`.github/workflows/`
- `deploy.yml` — build + GitHub Pages deploy. Triggers on push to `main`.
- `test.yml` — build + Playwright on `main` PRs and pushes.

## Shared contract rules
1. **Layout constants live in `src/scene/layout.ts`.** Any scene module that positions things (van, lake, characters, hotspots, camera) must import `VAN`, `WORLD`, `ANCHORS`, `CAMERA`, `PALETTE`. Do not hard-code world coordinates elsewhere. Change the constant, not the callers. Units are metres, Y up, +Z points out of the tailgate toward the lake.
2. **`content.json` is the single source of truth for facts.** Names, roles, dates, employers, metrics, certs, links, and photo captions come from there. The reader, KimOS, and the 3D panels all read `content`.
3. **Never invent facts.** No new dates, metrics, employers, certifications, links, or testimonials. If a fact is missing, leave it out or ask the user. Copy from `legacy/src/index.html` when in doubt.
4. **Store contract:** only add views to the `View` union in `store.ts` together with a matching `CAMERA` preset and a `goTo` caller. Interactive objects call `goTo(view)`; they do not mutate the camera.

## Quality tiers and performance budget
- Tiers: `low | mid | high` (`store.ts`). Chosen by `pickQuality()`: `?q=` override, else `detect-gpu` (mobile: tier ≥ 3 → mid, else low; desktop: 3 → high, 2 → mid, else low; errors → mid).
- DPR per tier (`App.tsx`): low `[0.75, 1]`, mid `[1, 1.25]`, high `[1, 1.5]`. `AdaptiveDpr` is on.
- Low tiers and `prefers-reduced-motion` get the static reader (plus `?3d` to force 3D with reduced motion).
- Budget: JS under **450 KB gzip** (chunks `three` and `r3f` are split in `vite.config.ts`), assets under **3 MB**, textures as WebP/KTX2, GLB compressed (meshopt/Draco). Keep particle counts and shader cost modest on `low`.
- Render on demand when idle; pause rendering when the tab is hidden. Do not add per-frame allocations in `useFrame`.
- Lighthouse on the reader should stay **≥ 90**. Check the reader after changes to `reader.css` or `render.ts`.

## Accessibility rules
- The reader is real semantic HTML: keep headings in order, alt text on every image, and `aria-label`s on icon-only controls.
- Every interactive 3D hotspot must have a text label (`Hotspot` label) and be reachable by keyboard from the HUD or DOM panels, not only by pointer.
- KimOS is keyboard-navigable: icons are `role="listitem"` buttons, windows are `role="dialog"` with close buttons, `Escape` closes the top window. Keep this working when you change it.
- Respect `prefers-reduced-motion`: no camera tweens, no autoplay motion beyond what the reader already shows.
- Sound is **off by default**; never autoplay audio.
- Maintain colour contrast on HUD text over the scene; provide DOM text for any information shown only in 3D.

## How to add…
**A KimOS app**
1. Add an id to `AppId` and an entry to `APPS` in `src/ui/kimos/KimOS.tsx` (label, glyph, colour, window size).
2. Write the component (render from `content`, never hard-coded facts) and add it to the app switch.
3. Use `Link` for links (it sets `target`/`rel` for external URLs).
4. Check it with `node scripts/shot.mjs <url> out.png laptop 9000`, then test keyboard open/close.

**A new hotspot**
1. Add the position and rotation to `ANCHORS` in `src/scene/layout.ts`.
2. If it is a new camera view: add it to `View` in `src/state/store.ts` and to `CAMERA` in `layout.ts`.
3. Create the object in `src/scene/hotspots/`, wrap it in `<Hotspot id label view position rotY …>`, and add it to `Hotspots.tsx`.
4. Provide DOM content in `ui/panels/Panels.tsx` if the view needs text. Confirm `goTo` and `back` work from it.

**A new photo**
1. Export the image as `public/photos/van-NN.webp` and a `van-NN-thumb.webp`. Keep the existing naming.
2. Add an entry to `photos` in `src/content/content.json` (`id`, `src`, `caption`, `alt`). Write warm, factual captions only.
3. Add its intrinsic sizes to `PHOTO_SIZES` in `src/reader/render.ts`.
4. Run `npm run build` and check the reader figure and the photo wall.

## Deployment
- Production: GitHub Pages at `https://binasoy.kim`, served from `dist/`.
- `.github/workflows/deploy.yml` runs on push to `main` (or manual dispatch): `npm ci` → `npm run build` → copies `CNAME` and `Kim_Binasoy_Resume.pdf` into `dist/` → uploads the Pages artifact → deploys.
- `public/CNAME` is shipped by Vite. The root `CNAME` is copied explicitly by the workflow. Keep the domain in both in sync. Do not remove either.
- Do not commit `dist/`, `node_modules/`, or `assets-src/raw/`.
- Before merging to `main`, run `npm run typecheck`, `npm run build`, and `npm test`.

## Conventions
- Small, focused commits named like `scene: …`, `ui: …`, `content: …`, `docs: …`.
- Work on branches (the current work is on `revamp-van`); do not push to `main` directly.
- Do not edit `legacy/` or the reference folders.
