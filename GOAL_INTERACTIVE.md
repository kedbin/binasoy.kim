# Goal — Interactive & Animated Portfolio Layer (binasoy.kim)

> Status: **proposed** (not yet started). Convert to an active goal when ready.

## Why & the guardrail (grounded in research)

The current site audits **9.8/10 (gemini-3.5-flash)** because it is fast, scannable,
and accessible. Research (bx) is clear:

- Recruiters value **fast, scannable** portfolios over flashy ones; "experience
  takes an edge over the portfolio."
- Full 3D **slows down or errors** on corporate laptops without a dedicated GPU and
  on mobile — the exact machines recruiters use.
- For **Cloud/DevOps/QA/AI** roles, abstract 3D shows WebGL flair, **not cloud skills**.

**Principle:** the interactive layer is an **enhancement, not the foundation**. It must
never regress LCP/Core Web Vitals, accessibility, or the scannable base. Interactivity
should be **on-brand** (CI/CD, terminal, cloud architecture) to showcase the target skills.

---

## Actionable items

### 0. Non-negotiable guardrails (do first, enforce throughout)
- [ ] Lighthouse **mobile perf ≥ 90**; **LCP < 2.5s**; **CLS ≈ 0** (no layout shift).
- [ ] Every animation respects `prefers-reduced-motion` (static fallback).
- [ ] All WebGL/Canvas features are **lazy-loaded + feature-detected** with a graceful
      static fallback on unsupported / low-power / no-dGPU devices.
- [ ] Heavy 3D assets never block first paint / LCP.
- [ ] Existing **65 Playwright tests stay green**; add new perf + motion-a11y tests.
- [ ] gemini-3.5-flash re-audit must stay **≥ 9/10**.

### 1. Micro-interactions (low risk, high ROI)
- [ ] Animated **stat counters** (count up on reveal) for 5× / 90% / 70%.
- [ ] **Tilt/hover** micro-interaction on cert + project cards (disabled under reduced-motion).
- [ ] **View Transitions** on nav anchor clicks (with fallback).
- [ ] Subtle pointer/parallax accent (desktop only, reduced-motion off).

### 2. Scroll-driven storytelling
- [ ] Scroll-reveal upgrade: GSAP **ScrollTrigger** (or native CSS scroll-timeline) with a
      top **scroll-progress indicator**.
- [ ] Experience **timeline connector line draws** as it enters the viewport.

### 3. On-brand "live system" widgets (the differentiator — showcases DevOps/QA/AI identity)
- [ ] **Animated CI/CD pipeline diagram** (build → test → deploy nodes lighting up) in the
      Experience or Projects area.
- [ ] **Typing terminal widget** running realistic commands (`terraform plan`,
      `playwright test`, `gh run list`) — reinforces DevOps/QA identity.
- [ ] **Cloud-architecture mini-diagram** (3 clouds + cert badges), hover-interactive.

### 4. Lightweight WebGL / Canvas hero accent (optional "3D feel", safe)
- [ ] Particle **"cloud"** or network-graph behind the hero — vanilla three.js **or** 2D
      canvas (prefer 2D canvas for perf); **capped FPS**, **paused off-screen**
      (IntersectionObserver-gated).
- [ ] **Lazy-load** the library; **feature-detect** WebGL; static gradient fallback.
- [ ] **Reduced-motion → static** image/gradient.

### 5. (Stretch) Opt-in 3D "Lab" route — `/lab`
- [ ] Separate **lazy-loaded** route with a richer three.js / React-Three-Fiber scene
      (the "wow" factor).
- [ ] Clear **"enter 3D experience — may be heavy on low-end devices"** affordance.
- [ ] Main portfolio (`/`) stays the fast, scannable base — 3D can never slow it down.

### 6. Performance & accessibility verification
- [ ] Add **Lighthouse CI** (or `playwright-lighthouse`) to `.github/workflows/test.yml`;
      assert perf / accessibility / best-practices thresholds.
- [ ] Add a **reduced-motion test** (assert no transform/opacity animation when reduced-motion is set).
- [ ] Add a **no-WebGL fallback test** (disable WebGL, assert page renders fully).

### 7. Ship + final audit
- [ ] Commit + push; `test.yml` + `deploy.yml` **green**; live site updated.
- [ ] gemini-3.5-flash **re-audit** (desktop + mobile + new interactive elements) **≥ 9/10**.
- [ ] Lighthouse **mobile perf ≥ 90**.

---

## Out of scope / anti-goals
- ❌ Do **not** replace the fast static base with a 3D SPA shell.
- ❌ Do **not** block LCP on 3D/model assets.
- ❌ Do **not** ship 3D that errors on machines without a dedicated GPU and has no fallback.
- ❌ Do **not** add motion that ignores `prefers-reduced-motion`.

## Suggested order
1 → 2 → 3 (the on-brand widgets are the real differentiator) → 4 → 6 → 7, with 5 (the
`/lab` route) last and fully optional.
