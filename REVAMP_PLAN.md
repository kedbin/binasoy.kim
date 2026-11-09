# binasoy.kim — "Van Camp" Revamp Plan

> Status: **proposed — awaiting approval**. Coordinator: Opus 5.5 (via HERDR).

## Concept
A cosy, stylised 3D scene inside the camper minivan Kim and his wife built. It's golden hour.
String lights glow, there's a wooden bed platform and cabinets, and a laptop sits on a
fold-out table. The rear hatch is open onto a still lake with pines, mountains, and a
couple on an inflatable raft. Falling leaves, fireflies, small ripples, and low ambient sound (loons, water,
crickets).

References: jordanscamp.site (cosy R3F scene with a laptop, a static `#reader` fallback, and
a day/night cycle) and sadok.mx (a 3D device whose screen *is* the portfolio UI).

## Art direction (from RevampRef/ photos, approved: golden hour)
- **Vehicle:** white Chrysler Pacifica-style minivan, tailgate lifted, seats folded flat.
- **Interior:** dark charcoal headliner and trim, a panoramic **double sunroof** (autumn
  leaves stuck on the glass), a full-width mattress with white rumpled duvet, mustard
  floral pillows, a red/green gingham blanket at the tailgate edge, warm **fairy-light
  string** across the ceiling, an LED puck lamp on the C-pillar, jackets on the grab handles,
  a pink tumbler, and a laptop on the duvet.
- **View out the hatch:** a Canadian Shield lake (Algonquin feel) that's glassy and
  perfectly mirrored, low rolling hills in full fall colour (orange, red, gold, evergreen),
  a pastel peach-to-lavender sky with thin streaky clouds, a grass bank with a wooden
  split-rail fence, a sandy shore, bare birch branches framing the left side, and a yellow
  kayak on the bank.
- **Characters:** Kim and his wife (long hair) with an **inflatable raft**, not a canoe.
  The raft drifts on the lake, with the option of a "two people inflating it on the
  beach" vignette.
- **Palette:** peach `#F4C7A1`, lavender `#B9A7C9`, lake steel-blue `#8FA3B8`, maple
  `#D9682B`, gold `#E3A63B`, pine `#2F4A3A`, interior charcoal `#1E1F22`, fairy-light
  `#FFD58A`.
- **Style:** stylised low-poly with soft toon/baked lighting (jordanscamp-like), with
  falling leaves instead of rain.
- The photos go on the Polaroid wall: the hatch shot, the night interior, lakeside, and the
  raft.

## Interactions (camera state machine)
| State      | How you get there              | What you see |
|------------|--------------------------------|--------------|
| `seat`     | default                        | View from the bed toward the open hatch. Limited drag/gyro look-around. |
| `laptop`   | click the laptop / `L`         | Camera dollies in; the screen shows the interactive portfolio (KimOS). |
| `outside`  | click the hatch / `O`          | Camera moves to the bumper and looks out at the lake: the raft, sunset, mirrored hills. |
| `wall`     | click the photo wall           | Polaroids of the van build and trips (your story with your wife). |
| `stickers` | click the cabinet              | Cert badges as stickers (GCP ×3, AZ-204, AWS, Gemini). |
| `clipboard`| click the clipboard            | Résumé, with a PDF download. |

**KimOS** (on the laptop screen): About · Experience · Projects (relearn.ing, AI test
pipeline, KT bot) · Skills · Certs · Contact. HTML rendered into the screen with drei
`<Html transform occlude>`, keyboard-navigable.

Extras: a day/night toggle (golden hour ↔ starry night with a lantern), a sound toggle
(off by default), `Esc` to go back, and an "Enter quick view" button for recruiters.

## Guardrails (carried over from GOAL_INTERACTIVE.md)
- **Progressive enhancement**: real semantic HTML (`#reader`) ships first, for SEO, no-JS,
  printing, screen readers, and low-end devices. The 3D layer mounts on top of it, the way
  jordanscamp does it.
- The scene is lazy-loaded behind a loader, with WebGL feature detection and a GPU tier check
  (`detect-gpu`). Low tiers and `prefers-reduced-motion` get the static reader plus a
  painted illustration.
- Budget: JS under 450 KB gzip, assets under 3 MB (meshopt/Draco GLB, KTX2/WebP textures),
  DPR capped at 1.5, frameloop on demand when idle, render paused when the tab is hidden.
- Lighthouse on the reader stays ≥ 90. Playwright tests are migrated, not deleted.

## Stack
Vite + React 19 + TypeScript, `three`, `@react-three/fiber`, `@react-three/drei`,
`@react-three/postprocessing` (light bloom/vignette only), `zustand` (camera/UI state),
`maath` (easing), and `howler` (audio). Models come from CC0 low-poly packs (Quaternius,
Kenney, Poly Pizza) plus procedural geometry for the van shell, with baked-style toon
lighting. Water uses a custom stylised shader. Deployment stays on GitHub Pages
(`dist/`, CNAME).

## Work breakdown & model routing (HERDR)
Each Sonnet worker gets its own git worktree and branch. Opus reviews and merges.

| # | Task | Model | Notes |
|---|------|-------|-------|
| 0 | Architecture, scaffold (Vite/R3F), file layout, data schema, camera state machine | **Opus** | Foundation. Blocks everything else. |
| 1 | Extract content from `src/index.html` → `src/content/*.json` | Haiku | Mechanical. |
| 2 | Asset sourcing: CC0 models list, licenses, `CREDITS.md`, download + compress (gltf-transform) | Haiku | Opus approves the picks. |
| 3 | Static `#reader` fallback page + print CSS + meta/OG/JSON-LD | Sonnet | From the content JSON. |
| 4 | Van interior: shell, bed, cabinets, table, laptop, string lights, rear hatch | Sonnet | Opus sets the art direction. |
| 5 | Lake environment: water shader, terrain/pines, sky + day/night, fireflies | **Opus** → Sonnet | Opus writes the shader and lighting core; Sonnet adds dressing. |
| 6 | Inflatable raft + Kim & wife animation loop, falling leaves, birds, ripples | Sonnet | |
| 7 | KimOS laptop UI (React components, a11y, keyboard nav) | Sonnet | |
| 8 | Hotspots/interactions: photo wall, stickers, clipboard | Sonnet | |
| 9 | Camera transitions, Html-in-3D integration, perf tiers, loader | **Opus** | Hardest integration. |
| 10 | Audio manager + SFX sourcing (CC0) | Haiku → Sonnet | Haiku sources, Sonnet wires up. |
| 11 | Playwright migration (reader + 3D smoke + no-WebGL + reduced-motion), Lighthouse CI | Sonnet | |
| 12 | Docs: AGENTS.md, README, update deploy.yml for Vite | Haiku | |
| 13 | Visual QA screenshots, perf audit, final polish, merge, deploy | **Opus** | |

### Phases
1. **Foundation**: 0 (Opus), with 1 and 2 (Haiku) in parallel.
2. **Build-out**: 3, 4, 6, 7, 8 (Sonnet, in parallel worktrees), and 5 (Opus core).
3. **Integration**: 9 (Opus), 10, 11.
4. **Ship**: 12, 13.
