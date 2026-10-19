---
number: "0002"
type: plan
slug: hero-field-animation
title: Animated triangle field and intro sequence for the hero
status: planned
created: 2026-10-19
tags: [plan, status/planned]
---

# 0002 — Plan: animated triangle field and intro sequence for the hero

**Hardened:** 2026-10-19 against `dc8022c`
**Executed:** landed `74d44a1`..`a4fd5e3`: `components/HeroField.tsx`, `lib/field/*`, intro keyframes in `Hero.module.css`; awaiting the owner's review by eye.

**Spec:** `docs/specs/0002-hero-field-animation.md` — the decisions and their why. This file is
only how they land.

## Goal

The static `public/triangle-grid.svg` behind the hero is replaced by `HeroField`, one client
component that draws the lattice on a `<canvas>`: faint dots, forms that a pen traces, fills and
erases, and a clean zone around the logo. On every load the hero builds itself — dots ripple out,
then the frame, the portrait and the text arrive by CSS keyframes. After ~4 s the field calms
down; it pauses off screen and in hidden tabs; reduced motion gets one static frame.

## Starting point

The working tree carries the **"Hero 6a refined" refresh, not yet committed**: frame 480 × 415.7
(`app/globals.css:118-119` — `--img-flex: 0 1 480px`, `--img-max: 480px`;
`components/Hero.module.css:36` — `aspect-ratio: 480 / 415.7`; the `.hero-field` placement at
`Hero.module.css:38-42`), the new 12-cell `public/triangle-grid.svg`, and the spec rewritten for
that geometry. The plan's numbers (12 cells, apex at design (320, 138.6), horizontal fade) are
those of the refresh.

**The owner commits the refresh before Card 1.** Card 1 edits `Hero.module.css` and deletes the
SVG, so a dirty refresh would be swept into a card's commit. No card commits it. Card 1 checks
it and stops if it is missing (see Card 1's precondition).

Facts the cards rely on, checked against the tree:

- `components/Hero.tsx:15-17` is the field block: two comment lines (`:15` the "Plain img" note,
  `:16` the `eslint-disable-next-line @next/next/no-img-element`) and the `<img>` itself at `:17`.
  All three lines go.
- `components/Hero.module.css:29-32` is a comment that describes the SVG field placement; `:38-42`
  is the `.hero-field` rule; `:47-50` is `.hero-portrait` with the triangle
  `clip-path: polygon(50% 0, 100% 100%, 0 100%)` at `:49`.
- `.hero` (`Hero.module.css:1-2`) is `position: relative; overflow: hidden`; `.hero-inner`
  (`:8-9`) is `position: relative` with no `z-index`, so a positioned canvas placed **before** it
  in the DOM paints under it with no `z-index` needed.
- `.hero-links` is `display: flex` (`:25`), so its `a` children are flex items and take
  `transform`; `.hero-hello` (`display: flex`), `h1` and `.hero-sub` are block boxes.
- `app/globals.css:164-166` holds the only global `prefers-reduced-motion` block, and it only
  resets `scroll-behavior`. It does nothing for animations, so the module needs its own block.
- The mobile breakpoint is `@media (max-width: 560px)` (`app/globals.css:138`).
- Lint is `eslint .` with `eslint-config-next` 16.4.1, which pulls `eslint-plugin-react-hooks`
  7.1.1 (`package-lock.json`). That version ships the React Compiler rules (`react-hooks/purity`,
  `react-hooks/refs`, `react-hooks/set-state-in-effect`, `react-hooks/immutability`). So
  `Math.random()` and `performance.now()` belong inside effects and rAF callbacks, never in render.
  Animation state lives in plain objects inside the effect closure, not in refs read during
  render, and the component never calls `setState`.
- `tsconfig.json` maps `@/*` to `./*`, so the new code imports as `@/lib/field/...`. `lib/`
  does not exist yet.

Design values read from `public/triangle-grid.svg` (1280 × 760 design space, cell side 40, row
height 34.64, odd rows offset by 20, apex node (320, 138.6) on row 4, base corners (80, 554.3) and
(560, 554.3) on row 16):

| What | SVG | Canvas value |
|---|---|---|
| Fade | `tg-fade`, objectBoundingBox x 0→1 over the 1280-wide mask rect; stops 1 @ 0, 0.8 @ 0.45, 0.2 @ 0.75 | same, in design x |
| Line gradient | `tg-line`, userSpaceOnUse (0, 0) → (900, 760); `oklch(0.74 0.09 200)`, `oklch(0.70 0.11 245)`, `#9184d9` | `#5dbcc1` → `#5fa5de` → `#9184d9`, same endpoints mapped to section coords |
| Lines | `stroke-opacity 0.55`, `stroke-width 0.8` | 0.55, 0.8 design units |
| Lit node | `r 1.6`, fill `oklch(0.80 0.10 195)` | r 1.6 du, `#65d2d2` |
| Glow | `feDropShadow stdDeviation 2`, flood `oklch(0.78 0.11 195)` | `shadowBlur` 4 du, `#4fcdcd` |
| Fill colours | `oklch(0.62 0.09 200)`, `oklch(0.58 0.11 245)`, `#968ae0` | `#33969b`, `#3a80b7`, `#968ae0` |
| Fill opacity | 0.06–0.36 per cell | spec range 0.08–0.34 per cell |

The SVG has **no faint-dot layer**. Every circle in it is a lit node. So the base-dot radius,
colour and opacity below have no design source. They are starting values for Card 4 to tune.

## Changes by area

**Tunables** — `lib/field/config.ts` (new). Every canvas number the spec calls a "starting value"
lives here and nowhere else. All sizes are in **design units** (cell side = 40), scaled by
`s = side / 40` at draw time. Starting values:

- Dots: radius 1.0, colour `#5dbcc1`, opacity 0.35.
- Lit node: radius 1.6, `#65d2d2`, glow blur 4, glow colour `#4fcdcd`.
- Lines: gradient stops `#5dbcc1` / `#5fa5de` / `#9184d9` from design (0, 0) to (900, 760),
  opacity 0.55, width 0.8.
- Fills: palette `#33969b`, `#3a80b7`, `#968ae0`; per-cell opacity in [0.08, 0.34]; fill chance
  0.4; per-cell fade-in stagger 120 ms, fade 300 ms, fill hold 1200 ms.
- Clean zone: padding 0.6 cell, ramp 1.5 cells.
- Fade: stops (0, 1), (0.45, 0.8), (0.75, 0.2), held to t = 1, then down to 0 over one cell.
  Forms are not placed where any node's fade is < 0.15, because they would be invisible.
- Form mix: polyiamond 0.6, large triangle 0.25, hexagon 0.15; placement attempts per spawn 12.
- Pacing: busy has 6 live forms, pen 160 du/s, outline hold 900 ms, gap 150–400 ms. Calm has
  3 live forms, pen 80 du/s, outline hold 1600 ms, gap 900–2200 ms. The calm switch is at 4000 ms.
- Intro (canvas side): ripple 250–1350 ms, ripple edge softness 2 cells, first forms at 900 ms.
- Mobile overrides under `(max-width: 560px)`, the same query as `app/globals.css:138`. They
  start empty, and Card 4 fills them.
- `maxDpr: 2`.

The CSS intro timings cannot live in `config.ts`, because the CSS has to run without JS. They are
custom properties on `.hero` in `Hero.module.css` (`--intro-frame-delay`, `--intro-portrait-delay`,
`--intro-text-delay`, `--intro-text-step` and the durations). Card 4 tunes those two places.

**Geometry** — `lib/field/lattice.ts` (new, no DOM, no React):
- `buildLattice(frame, section)` returns nodes in section coordinates: `side = frame.width / 12`,
  `rowHeight = side · √3/2`, origin = frame apex (`frame.left + frame.width / 2`, `frame.top`).
  Node `(r, c)` sits at `x = apexX + (c + (odd(r) ? 0.5 : 0)) · side`, `y = apexY + r · rowHeight`,
  with `odd(r) = ((r % 2) + 2) % 2 === 1`, so negative rows above the apex get the right parity.
  Row and column ranges cover the whole section plus one cell margin. Ids are relative to the
  apex, so `(0, 0)` is the apex node and the base corners are `(12, −6)` and `(12, 6)`.
- Cells are up or down triangles keyed by integer ids. `cellNodes`, `cellNeighbours` (the three
  edge-sharing cells), `cellsAroundNode` (the 6 fan cells) and `cellCentroid` are pure integer
  lookups.
- `designToSection(X, Y)` = `(apexX + (X − 320) · s, apexY + (Y − 138.6) · s)` maps any design
  coordinate (line gradient endpoints, fade origin).
- `fade(x)`: `t = (x − (apexX − 320 · s)) / (1280 · s)`, clamped to 1 for `t < 0` (the SVG
  gradient pads with its first stop), the stops from `config.ts` up to `t = 1`, then linear to 0
  over one `side` past the design's right edge.
- `cleanZone(logoRect, side)` returns `weight(x, y)`: the distance from the point to the logo rect
  padded by 0.6 cell. 0 inside, then `smoothstep` to 1 over 1.5 cells.
- Each node stores `fade`, `clean` and `weight = fade × clean`. Drawing uses `weight`. Placement
  uses `clean` and `fade` separately (see §Forms).
- `frameCentroid(frame)` = `(apexX, frame.top + 2/3 · frame.height)`, the ripple origin.

**Forms** — `lib/field/forms.ts` (new, no DOM, no React):
- Three generators over cell ids, all taking an injected `rand()`: a random polyiamond of 1–6
  cells (grow from a seed cell by adding random edge-neighbours), a large triangle of side 2 or 3
  (4 or 9 cells, either orientation), and a hexagon (the 6 `cellsAroundNode` of a node).
- `outline(cells)`: collect the edges used by exactly one cell. Reject (`null`) unless every
  boundary node has exactly two boundary edges and a single walk from any edge visits all of
  them. That catches holes (two loops) and pinch points (a node of degree 4). On success it
  returns the closed node path in walk order.
- `place(lattice, live, obstacles, revealed, rand)`: try up to the configured number of random
  seeds. Reject the candidate when any of these holds:
  - any outline node has `clean < 1` (inside the zone or its ramp);
  - any node has `fade < 0.15`;
  - any node lies outside the section;
  - any cell centroid lies inside the frame triangle (edge-sharing with the frame is allowed);
  - any node lies inside the text rect;
  - any node lies beyond `revealed.r` from `revealed.centre`. Callers pass `r = Infinity` until
    the ripple exists (Card 3);
  - any cell is already held by a live form.
- Each placed form carries its path, its cells, a fill colour or `null` (fill chance 0.4) and one
  fill opacity per cell in [0.08, 0.34].

**Component** — `components/HeroField.tsx` (new, the only `'use client'` file):
- Imports `styles from "./Hero.module.css"`, the same module as `Hero`, so the hashed class
  matches. It renders `<canvas className={styles["hero-field"]} aria-hidden="true" />`.
- Measures through **data attributes**, because CSS Module class names are hashed:
  `canvas.parentElement` (the section) → `[data-field="frame"]`, `[data-field="logo"]`,
  `[data-field="text"]`. Rects are `getBoundingClientRect()` minus the section's rect. None of
  the three measured elements is ever animated. The keyframes go on their children (`.hero-frame`,
  `.hero-portrait img`, the text children), so measured rects never carry a transform.
- One `useEffect` owns everything. It builds the state object, the observers, the listeners and
  the rAF. Its cleanup disconnects every observer, removes every listener and cancels the pending
  frame. Dev StrictMode runs effects twice, so a leak shows up as double speed.
- Sizing: backing store = CSS size × `min(devicePixelRatio, maxDpr)`, and `ctx.setTransform(dpr,
  0, 0, dpr, 0, 0)`. One `ResizeObserver` watches the section **and** the three measured elements.
  A font swap can resize `.hero-text` without resizing the section. `document.fonts.ready` also
  triggers one re-measure. A re-measure rebuilds the lattice, re-renders the static dots into an
  offscreen canvas (`document.createElement("canvas")`, same DPR) and clears the live forms. The
  scheduler refills them.
- `shadowBlur` ignores the canvas transform. The glow is set as `glowBlur · s · dpr` in device
  pixels. Better still, lit nodes are drawn from a glow sprite pre-rendered once per re-measure.
- Per frame: clear, draw the dots (see the ripple in Card 3, then `drawImage` of the cached
  layer), then the live forms. Fills go first, then pen segments (`globalAlpha = lineOpacity ×`
  the mean endpoint weight, `strokeStyle` = the line gradient built once per re-measure from
  `designToSection(0, 0)` to `designToSection(900, 760)`), then lit nodes. Everything is
  multiplied by node weight.
- Form phases are driven by elapsed time, not frame count. A filled form goes
  `draw → fill-in → fill-hold → fill-out → hold → erase`; an unfilled form goes
  `draw → hold → erase`. Draw time = path length / pen speed. Erase moves the tail along the path
  in the draw direction, and a lit node goes dark when the tail passes it.
- Clock = `performance.now()`, which counts from the document's time origin (navigation start), as
  the spec asks. Pacing (busy or calm) is picked from that absolute time.
- Pausing: `IntersectionObserver` on the section and `visibilitychange`. While hidden, no rAF is
  pending. On resume, form start times shift by the paused duration so forms do not jump.

**Hero** — `components/Hero.tsx`, `components/Hero.module.css`:
- `<HeroField />` as the first child of the `<section>`, before `.hero-inner`. Remove
  `components/Hero.tsx:15-17` (both comments and the `<img>`).
- Add `data-field="logo"` on the `.hero-logo` anchor, `data-field="frame"` on `.hero-img` and
  `data-field="text"` on `.hero-text`.
- Replace the `.hero-field` rule (`Hero.module.css:38-42`) with the canvas rule:
  `position: absolute; inset: 0; width: 100%; height: 100%; display: block; pointer-events: none;`.
  It stacks under `.hero-inner` by DOM order. Rewrite the comment at `:29-32` to describe the
  12-cell frame and the computed lattice instead of the SVG placement.
- Intro keyframes on existing classes. The **base rules stay the final, visible state**; the hidden
  state lives only in each keyframe's `from` plus `animation-fill-mode: both`:
  - `.hero-frame`: opacity 0 → 1 and scale 0.92 → 1, `transform-origin: 50% 0`, at
    `--intro-frame-delay` (1100 ms), 600 ms.
  - `.hero-portrait img`: `clip-path: inset(0 0 100% 0)` → `inset(0)`, at
    `--intro-portrait-delay` (1450 ms), 700 ms. This goes on the `img`, so the triangle
    `clip-path` on `.hero-portrait` (`:49`) is untouched.
  - `.hero-hello`, `.hero h1`, `.hero-sub`, `.hero-links a`: opacity 0 → 1 and translateY(12px)
    → 0, 500 ms, starting at `--intro-text-delay` (2000 ms) with `--intro-text-step` (150 ms)
    between them, so the last one starts at 2450 ms.
  - The logo (`.hero-logo`) is **not** animated.
- `@media (prefers-reduced-motion: reduce)` in the module: `animation: none` on every animated
  selector above.

**Removed** — `public/triangle-grid.svg` (`git rm`).

## Risks

- **The outline chaining is the subtle part.** Edge sets with a hole or a pinch point are not one
  loop. `outline()` must reject them by the degree-2 plus single-walk test, and the form must
  never be drawn half-way. Check by eye: no stray segments, and the pen always returns to its
  start.
- **Placement uses `clean`, not `weight`.** `weight` includes the fade, which is below 1 almost
  everywhere right of the design's x = 0. A "weight < 1" rejection would refuse nearly every form.
- **CSS and canvas clocks differ slightly.** CSS animations start at first style resolution, and
  `performance.now()` counts from navigation start. The gap is the time to first paint, tens of
  ms on a fast load. That is fine for this intro. If the gap shows, start the CSS steps from a
  class set at hydration, but that brings back the blank-page risk. Only do it after a check by
  eye.
- **`clip-path` on the portrait is already the triangle.** Animating `.hero-portrait`'s
  `clip-path` would replace it. That is why the reveal goes on `.hero-portrait img`.
- **HiDPI cost.** At DPR 2 the canvas has 4× the pixels. `maxDpr: 2`, the pre-rendered dots and
  the glow sprite keep frames cheap. `shadowBlur` per node per frame is the expensive path to
  avoid.
- **Lint.** The React Compiler rules in `eslint-plugin-react-hooks` 7.1.1 flag impure calls in
  render and ref reads during render. Keep all of that inside the effect.
- **Static export, no SSR canvas.** The canvas renders empty on the server and fills after
  hydration. That is by design: the spec has the CSS intro not wait for JS.

## Verification

There is no test runner in the repo. Each card's gate is `npm run build` + `npm run lint` (after
`npm ci` if `node_modules` is missing), plus a look in the browser. Serve the export with
`python3 -m http.server 8001 -d out` and check the three baseline sizes 1440×900, 900×1100 and
390×844. Capture the narrow sizes inside an iframe of the exact width, as in
`docs/specs/0001-nextjs-migration.md` §Shape, "Parity" bullet, because headless Chrome will not
shrink its window below ~500 px.

Headless Chrome captures:

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
  --window-size=1440,900 --virtual-time-budget=<ms> --screenshot=<file>.png http://localhost:8001/
```

`--virtual-time-budget` advances CSS animations, timers, rAF and `performance.now()` together, so
a capture shows the page at that point in the intro. Add `--force-prefers-reduced-motion` for the
reduced-motion check and `--blink-settings=scriptEnabled=false` for the no-JS check. Read the PNGs
back to inspect them. The browser console must show no errors or hydration warnings.

## Open questions

- Exact timings and densities: Card 4 tunes them by eye (spec, Open questions).
- Mobile density at or below 560 px: Card 4 decides between a lower dot opacity and fewer forms.

## Sessions  ·  one card = one fresh session; a card may land several commits; git carries state between cards

### Card 1 — HeroField canvas with the static dot lattice
precondition:  the "Hero 6a refined" refresh is committed by the owner. `git status --short -- app/globals.css components/Hero.module.css public/triangle-grid.svg docs/specs/0002-hero-field-animation.md` prints nothing, and `grep -n "480 / 415.7" components/Hero.module.css` hits. If either check fails, STOP: never commit the refresh inside a card.
read for why:  `docs/specs/0002-hero-field-animation.md` §Shape (lattice, fade, clean zone, dots only), only if you need the why
model:         opus
commits:
  1. feat: add the field config and lattice geometry
     touches: lib/field/config.ts, lib/field/lattice.ts  (only these)
     do:      - `config.ts` with every tunable and starting value in this plan §Tunables, in design units
              - `lattice.ts`: `buildLattice` with apex-relative `(r, c)` ids and negative-row parity, cell lookups, `designToSection`, `fade(x)` (clamped for t < 0, one-cell drop past t = 1), `cleanZone(logoRect, side)`, per-node `fade`/`clean`/`weight`, `frameCentroid`, exactly as in §Geometry
  2. feat: draw the hero lattice on a canvas in place of the static field
     touches: components/HeroField.tsx, components/Hero.tsx, components/Hero.module.css
     do:      - `HeroField.tsx` (`'use client'`, imports `./Hero.module.css`): canvas, DPR sizing capped at `maxDpr`, one effect with full cleanup, `ResizeObserver` on the section and the three measured elements plus `document.fonts.ready`, offscreen dots layer, one draw per re-measure (no loop yet), per §Component
              - `Hero.tsx`: `<HeroField />` first in the section; remove `components/Hero.tsx:15-17`; add `data-field="logo|frame|text"`
              - `Hero.module.css`: replace the `.hero-field` rule at `:38-42` with the full-section canvas rule; rewrite the comment at `:29-32`
  3. chore: remove the static triangle field
     touches: public/triangle-grid.svg  (deletion only)
     do:      - `git rm public/triangle-grid.svg`; `git grep -n triangle-grid -- app components lib public` returns nothing
done when:     `npm run build` and `npm run lint` exit 0; in captures at 1440×900, 900×1100 and 390×844, dots sit exactly on the frame's apex and both base corners and along its edges, fade to the right and are gone one cell past the design's right edge, and the logo has a clean zone with no hard edge; no console errors; all commits landed

### Card 2 — Forms: generation, pen, fills, pacing, pause
precondition:  Card 1 landed. `lib/field/lattice.ts` gives nodes (with `fade`/`clean`/`weight`), cells and lookups; `HeroField` draws the static dots and holds the section-relative frame, logo and text rects
read for why:  `docs/specs/0002-hero-field-animation.md` §Shape (Forms, clean zone, "Forms also avoid", after the intro, pausing) and §The new part, only if you need the why
model:         opus
commits:
  1. feat: generate and place triangle forms on the lattice
     touches: lib/field/forms.ts  (only this)
     do:      - the three generators with injected `rand`, `outline(cells)` with the degree-2 + single-walk test returning one closed node path or `null`, `place(lattice, live, obstacles, revealed, rand)` with every rejection rule in §Forms (clean < 1, fade < 0.15, outside the section, a cell centroid in the frame triangle, a node in the text rect, beyond `revealed.r`, an occupied cell)
              - per-form fill colour (chance 0.4, palette from `config.ts`) and per-cell opacity in [0.08, 0.34]
  2. feat: animate forms with a pen that draws, fills and erases
     touches: components/HeroField.tsx
     do:      - `requestAnimationFrame` loop; phases `draw → fill-in → fill-hold → fill-out → hold → erase` for filled forms and `draw → hold → erase` for the rest, driven by elapsed time; lit nodes from a glow sprite (or `shadowBlur` scaled by `s · dpr`); line gradient from `designToSection(0,0)` to `designToSection(900,760)`, stroke opacity and width from `config.ts`; `place` called with `revealed.r = Infinity`
              - busy pacing until the calm switch (4000 ms on the `performance.now()` clock), then the calm count, a slower pen and longer gaps
  3. feat: pause the hero field when it is not visible
     touches: components/HeroField.tsx
     do:      - `IntersectionObserver` on the section and `visibilitychange` stop and restart the loop (no pending rAF while hidden); shift form start times by the paused time on resume
done when:     `npm run build` and `npm run lint` exit 0; in the browser, forms appear across the visible field (not only left of the design's x = 0), trace closed outlines with no stray segments, about 40 % fill unevenly, erase tail-after-head, and never enter the logo zone, the frame interior or the text block; after ~4 s fewer forms run, more slowly; scrolling the hero away or switching tab stops the loop (no rAF activity in the DevTools Performance panel) and coming back resumes without forms jumping; all commits landed

### Card 3 — Intro sequence and reduced motion
precondition:  Card 2 landed. The field runs with forms and busy-then-calm pacing, and `place` takes a `revealed` radius
read for why:  `docs/specs/0002-hero-field-animation.md` §Shape (Intro table, reduced motion), only if you need the why
model:         opus
commits:
  1. feat: reveal the hero lattice with a ripple from the frame
     touches: components/HeroField.tsx, lib/field/config.ts
     do:      - ripple radius grows from `frameCentroid` to the farthest section corner over the ripple window in `config.ts`. While it grows, draw dots one by one with alpha = weight × a soft edge over the configured softness; after the window, use the cached layer. A late hydration joins mid-ripple (time from `performance.now()`, never restarted)
              - pass the live ripple radius to `place`; no form starts before the first-forms time (900 ms)
  2. feat: animate the frame, portrait and text into the hero
     touches: components/Hero.module.css
     do:      - intro custom properties on `.hero` and keyframes with `animation-fill-mode: both` per §Hero: `.hero-frame` fade and scale from the apex, `.hero-portrait img` `clip-path: inset()` reveal top to bottom (the triangle `clip-path` at `Hero.module.css:49` stays untouched), `.hero-hello`, `h1`, `.hero-sub` and `.hero-links a` rising in, staggered; base rules keep the visible final state; `.hero-logo`, `.hero-img` and `.hero-text` are not animated
  3. feat: show the hero at rest when reduced motion is requested
     touches: components/HeroField.tsx, components/Hero.module.css
     do:      - `matchMedia('(prefers-reduced-motion: reduce)')`: draw one static frame (all dots, no ripple, plus a few filled forms placed with `revealed.r = Infinity`) and run no loop; react to `change` events in both directions
              - module `@media (prefers-reduced-motion: reduce)` sets `animation: none` on every animated selector
done when:     `npm run build` and `npm run lint` exit 0; headless captures at `--virtual-time-budget` 200 / 1000 / 1600 / 3000 ms show, in order, background + logo only, then the dot ripple with first forms, then the frame and the portrait revealing, then the text in place; with `--blink-settings=scriptEnabled=false` the 3000 ms capture shows the frame, portrait and text (no dots); with `--force-prefers-reduced-motion` the 200 ms capture already shows the final state and nothing moves after; all commits landed

### Card 4 — Tune timings and densities by eye
precondition:  Card 3 landed. The full feature runs; every canvas tunable is in `lib/field/config.ts` and every CSS intro timing is a custom property on `.hero`
read for why:  `docs/specs/0002-hero-field-animation.md` §Open questions, only if you need the why
model:         opus
commits:
  1. style: tune the hero field timings and densities
     touches: lib/field/config.ts, components/Hero.module.css
     do:      - at 1440×900, 900×1100 and 390×844: adjust intro timings, busy/calm counts, pen speed and dot radius/opacity until the field reads as calm after the intro and the text stays readable
              - at or below 560 px: pick a lower dot opacity and/or fewer forms (spec open question) and set the mobile overrides
  2. docs(specs): mark 0002 done
     touches: docs/specs/0002-hero-field-animation.md, docs/specs/README.md, docs/plans/0002-hero-field-animation.md
     do:      - spec and plan frontmatter `status: done` / `status/done`; the spec's Status and Build doc lines and the index row point at the landed commits; record the tuned values that differ from the spec
done when:     `npm run build` and `npm run lint` exit 0; captures at the three sizes, after the intro and at ~10 s, show a calm field, a clean logo zone and readable text; all commits landed
