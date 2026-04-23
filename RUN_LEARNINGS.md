# Run Learnings

## 2026-04-23 – Design review run

- Playwright CLI could not save a screenshot directly to `/home/kedbin/binasoy-review-screenshot.png` because that path is outside its allowed roots.
- Recovery: save the screenshot inside the project root first, then copy it to the requested destination.
- The requested 1440x900 viewport screenshot hides lower-page sections because the implementation is vertically taller than the mockup; use an extra full-page capture for reviewer context, but keep the required viewport screenshot as the official artifact.
- A later polish pass improved visual richness but accidentally regressed viewport fit by making the hero and certification stack too tall.
- Recovery: compress the hero again and move secondary certification details into compact metadata lines instead of keeping all badges as equal-sized cards.
- Visual fidelity work on this layout is highly sensitive to headline width and cert-card count; these two knobs most directly determine whether the stats bar remains above the fold at 1440x900.
- Dead anchor nav items created a broken-feeling header even when the visuals were improving.
- Recovery: remove non-functional top-nav items instead of leaving placeholders that do nothing.
- The stats strip added noise without improving the story; removing it gave the hero and experience panel more authority.
- When the right side becomes too information-dense, splitting hero content and experience into separate slide states is more digestible than trying to balance both in one viewport.
- Recovery: keep the left portrait/role rail fixed, and let the right column act as a two-panel carousel with explicit arrow controls.
- `python3 -m pip install --user` failed due to the system's externally-managed Python environment (PEP 668).
- Recovery: create a local virtualenv (`.venv-resume`) and install `python-pptx` there for PPTX generation.
- PPTX redesign verification is easier by converting the generated deck to PDF with LibreOffice headless and then rasterizing the first page with `pdftoppm` for visual inspection.
- The first PPTX draft fit content semantically but still overflowed visually; PPTX layout work needs screenshot-style verification, not just XML text extraction.

## 2026-04-23 – Design review round 2

- The screenshot path restriction still applies for round-two artifacts; keep using project-root save plus copy-out instead of trying direct writes to `/home/kedbin` via Playwright.
- Second-pass review was easiest when comparing only the remaining fidelity gaps rather than repeating solved round-one issues.
