# O4 handoff: far hills and lake reflection

**Status:** I researched the task but changed **no code** and made **no commits**. The branch is still at `1043d83`. Read `.tmp/tasks/O4-hills.md` (the full task, port **5304**) and `AGENTS.md` first.

## Ownership
- **You may edit:** `src/scene/lake/{Hills,Water,Sky,Lake}.tsx`, and any new files under `src/scene/lake/**` or `src/scene/env/**`.
- **Read only:** Trees, Shore, characters and van files.

## What I found

### Existing `Hills.tsx` (214 lines)
- Builds 3 ridge meshes with `hillGeometry({z,width,height,depth,seed,haze,crown})`:
  - far: `hillsZ+150`
  - mid: `hillsZ+50`
  - near: `hillsZ-40`
- `hillsZ` is 220.
- Each ridge has a 1D crown-bump silhouette.
- The canopy shader uses cellular crowns, coloured from the `uFol[6]` and `uCon[3]` uniforms, which are set from `SEASONS[season]`.
- Lighting uses `envUniforms` (`uHillLit/Shade/Rim`, `uHaze`, `uHazeAmt`, `uMist`, `uNight`, `uKeyDir`).
- **Fake reflection:** a `<group position-y={waterY*2} scale-y={-1}>` holds mirrored copies with ripple displacement. **Keep this for the `low` tier**, as the task requires.

### `Water.tsx`
- A transparent ShaderMaterial plane at `y=WORLD.waterY` (-0.15), size 1600×800, centred at z=`shoreZ-2+400`. It is rotated -π/2 on X.
- It already has: fresnel alpha, ripple streaks, a sun glitter path (`uSunDir`, `uGlitter`), the van glow at night (`uPractical*uInterior*uNight`), a dark band at the far shore and a sandy near shore.
- It uses envUniforms: `uTime`, `uNight`, `uSunDir`, `uSunColor`, `uGlitter`, `uWaterDeep`, `uWaterShine`, `uSkyLow`, `uSkyMid`, `uPractical`, `uInterior`.

### `Sky.tsx`
- A BackSide sphere of radius 800 with `gl_Position.z = w` (drawn at the far plane) and `renderOrder -10`.
- It renders correctly inside a Reflector camera.

### Raft position
- `Raft.tsx` owns `<group name="raft">` and sets its `position` every frame. The anchor is `ANCHORS.raft.pos = [-3, waterY, 26]`.
- In dev only, it also exposes `window.__raft`.
- **Plan:** in Water's `useFrame`, call `scene.getObjectByName('raft')` once, cache the result, copy its `position` into a `uRaft` vec3 uniform, and make no allocations per frame.
- The raft already has its own small wake mesh. Add a soft ring ripple and a disturbance to the normal distortion in the water shader.

### Environment and store
- `envUniforms` live in `src/scene/env/live.ts`. They are damped about 2 s toward the active preset, so timeOfDay transitions are smooth for free.
- `useScene` has `quality` (`low|mid|high`), `season` and `timeOfDay`.

### Post-processing
- `Effects.tsx` (not mine) runs an EffectComposer on mid and high tiers with AgX tone mapping. Shaders should keep `#include <tonemapping_fragment>` and `<colorspace_fragment>`, as they do now.

### Reflector
- `three/examples/jsm/objects/Reflector.js` is available. It takes `textureWidth/Height`, `clipBias`, `multisample` and a custom `shader`.
- Its `textureMatrix` maps world position to the projective UV, which you sample with `texture2DProj(tDiffuse, vUvProj)`.
- It turns shadow `autoUpdate` off during its own pass. This is safe.

## Recommended plan (commit after each step)

### 1. `src/scene/lake/FarForest.tsx` (new)
- Use instanced crowns on the **near ridge**, about 6k on high, 3.5k on mid and 1.5k on low.
- Use two geometries:
  - rounded clump: a low-poly icosahedron, squashed
  - spruce spire: a cone
- Place crowns by sampling the ridge surface. Export the ridge height function from `Hills.tsx`, or recompute it with the same seed.
- Set colour with `setColorAt`. Pick patches from 2D noise (`fbm2` in `./noise`), giving red maple, gold birch and dark spruce stands.
- Apply a sun-side warm rim and a cool shade side in a small `onBeforeCompile` or a custom shader that reads `envUniforms`.
- Give the **mid ridge** fewer and larger crowns. Leave the **far ridge** as the existing shader silhouette.
- Add a dark treeline band at the waterline, a few pale granite rocks (instanced dodecahedrons) and a tiny cabin and dock. These are all static, with no `useFrame`.

### 2. `Water.tsx`
- Use a `Reflector` on mid and high (512 on mid, 1024 on high, multisample 0 on mid), with a custom shader. The shader should:
  - distort `vUvProj.xy` with scrolling noise normals
  - apply fresnel: a deep tint looking down, mirror at grazing angles
  - darken a band near the far shore
  - keep the sun or moon glitter path and the night van glow
  - add the raft ripple using `uRaft`
- Size the Reflector plane the same as the current water plane.
- On **low**, keep the current transparent material.

### 3. `Hills.tsx`
- When quality is not `low`, do not render the `hills-reflection` group. The Reflector shows the real hills instead.

### 4. Performance
- In dev, log `gl.info.render.calls` and `triangles` once for the outside view.
- Optionally use layers to hide the van interior from the reflection camera.

### 5. Verify (at least 3 rounds)
- `npx tsc --noEmit`
- `npx vite build`
- `npx vite --port 5304 --strictPort`
- `node scripts/views.mjs http://localhost:5304/ .tmp/shots/o4-vN intro,seat,outside,night`
- Look at the sheet. Run `PORT=4184 npx playwright test` at the end.

### 6. Final report
Reply DONE with a summary, the final sheet path and any integration notes.

## Risks
- **Reflector `onBeforeRender` recursion with EffectComposer.** This works in practice. Check for a black reflection on mid and high.
- **Transparency.** Transparent objects such as SunShafts and fireflies also render into the reflection. That is acceptable.
- **Fog.** Fog distances come from `live.n.fogNear/Far`. Make sure the crown materials use `fog:true`, or the haze will not match.
