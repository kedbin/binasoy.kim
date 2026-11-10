# binasoy.kim — Van Camp

The personal portfolio of Kim Edrian Binasoy, Cloud, DevOps, QA Automation and AI engineer.

It opens as a cosy 3D camp inside a minivan, looking out the tailgate at a still lake at golden hour. Open the laptop on the bed to browse the portfolio in KimOS, a small desktop UI inside the scene. Prefer a plain page? The static reader is always there: it is real HTML, works without JavaScript, prints well, and is what you get on low-end devices and with reduced-motion settings.

## Run locally

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check and build to dist/
npm run preview    # serve dist/ on http://localhost:4173
```

Handy URL flags: `?reader` for the static page only, `?q=low|mid|high` to force a graphics tier.

## Project layout

- `src/` — the app (React + react-three-fiber).
- `src/content/content.json` — all portfolio content.
- `public/` — static files served as-is (photos, CNAME, résumé).
- `AGENTS.md` — notes for AI coding agents working in this repo.
- `REVAMP_PLAN.md` — design plan for the van scene.

## Credits

3D models, textures, and sounds come from CC0 sources. See [ASSETS.md](ASSETS.md) for the asset list and [public/audio/CREDITS.md](public/audio/CREDITS.md) for audio credits.
