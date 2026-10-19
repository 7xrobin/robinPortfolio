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
(`app/globals.css:118-119`, `components/Hero.module.css:33-42`), the new 12-cell
`public/triangle-grid.svg`, and the spec rewritten for that geometry. The plan's numbers (12 cells,
apex at design (320, 138.6), horizontal fade) are those of the refresh. **Commit the refresh
before Card 1** — Card 1 deletes the SVG and the `.hero-field` rule it touches.

## Changes by area

**Tunables** — `lib/field/config.ts` (new). Every number the spec calls a "starting value" lives
here and nowhere else: dot radius/opacity, lit-node style, line gradient stops, stroke opacity and
width, fill palette and opacity range, clean-zone padding (0.6 cell) and ramp (1.5 cells), fade
stops, form-mix weights, fill chance (0.4), busy/calm form counts and pen speeds, the calm switch
(~4 s), intro timings (ripple 250–1350 ms, first forms ~900 ms), mobile overrides (< 560 px).
Card 4 then tunes one file. All sizes are in **design units** (cell side = 40) and scaled by
`side / 40` at draw time.

**Geometry** — `lib/field/lattice.ts` (new, no DOM, no React):
- `buildLattice(frame, section)` → nodes in section coordinates: `side = frame.width / 12`,
  `rowHeight = side · √3/2`, origin = frame apex (`frame.left + frame.width/2`, `frame.top`);
  rows extend to cover the whole section, odd rows offset by `side/2`.
- Node and cell ids by integer `(row, col)`; a cell is an up or down triangle, so neighbours,
  edges and "cells around a node" are integer lookups.
- `fade(x)` — the design ramp: `t = (x − (apexX − 320/480 · fw)) / (1280/480 · fw)`; stops
  1 @ 0, 0.8 @ 0.45, 0.2 @ 0.75, held to t = 1, then down to 0 over one cell.
- `cleanZone(logoRect, side)` → `weight(x, y)`: 0 inside the logo rect padded by 0.6 cell, smooth
  ramp (smoothstep) to 1 over 1.5 cells. Node weight = `fade × cleanZone`.

**Forms** — `lib/field/forms.ts` (new, no DOM, no React):
- Three generators over cell ids: random polyiamond of 1–6 cells (grow from a seed by random
  neighbours), large triangle of side 2 or 3, hexagon of the 6 cells around a node.
- `outline(cells)` — edges used by exactly one cell, chained into one closed node path; return
  `null` if the edges do not form a single loop (a polyiamond with a hole or a pinch point).
- `place(...)` — try a few random seeds; reject when any node has weight < 1 (clean zone or its
  ramp), lies inside the frame triangle or the text rect, sits beyond the revealed ripple radius,
  or a cell is already held by a live form.
- Each placed form carries its path, its cells, a fill colour or none (40 %), and one fill
  opacity per cell in [0.08, 0.34].

**Component** — `components/HeroField.tsx` (new, the only `'use client'` file):
- Renders `<canvas className={styles["hero-field"]} aria-hidden="true" />`. It finds what it
  measures through **data attributes**, because CSS Module class names are hashed:
  `canvas.parentElement` (the section) → `[data-field="frame"]`, `[data-field="logo"]`,
  `[data-field="text"]`. Rects are taken relative to the section.
- Sizing: canvas backing store = CSS size × `devicePixelRatio`; one `ResizeObserver` on the
  section re-measures, rebuilds the lattice and re-renders the static dots into an offscreen
  canvas.
- Per frame: clear, `drawImage` the dots layer (masked by the ripple during the intro), then draw
  live forms — pen segment lines (gradient over the section), lit nodes with `shadowBlur`, cell
  fills; everything multiplied by node weight.
- Form phases: `draw → (fill-in → hold → fill-out) → hold → erase`, each driven by elapsed time,
  not frame count. Erase moves the tail along the path in the draw direction.
- Clock = `performance.now()` (measured from navigation start, like the spec asks).
- Pausing: `IntersectionObserver` on the section and `visibilitychange`; on resume, shift form
  start times by the paused duration so forms do not jump.

**Hero** — `components/Hero.tsx`, `components/Hero.module.css`:
- `<HeroField />` as the first child of the `<section>`; remove the `<img>` at
  `components/Hero.tsx:15-17`.
- Add `data-field="logo"` on `.hero-logo`, `data-field="frame"` on `.hero-img`,
  `data-field="text"` on `.hero-text`.
- `.hero-field` rule (`Hero.module.css:38-42`) is replaced by the canvas rule:
  `position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;` (stacking:
  under `.hero-inner`, which is `position: relative`).
- Intro keyframes on existing classes, `animation-fill-mode: both`: `.hero-frame` fade + scale
  from the apex (`transform-origin: 50% 0`) at ~1100 ms; `.hero-portrait` a `clip-path` reveal
  from the apex at ~1450 ms (animate a second clip layer or a mask so the triangle clip at
  `Hero.module.css:47-50` stays intact); `.hero-hello`, `h1`, `.hero-sub`, `.hero-links a` rise
  in staggered over 2000–2500 ms. The logo is **not** animated.
- `@media (prefers-reduced-motion: reduce)` in the module: `animation: none` on all of the above.

**Removed** — `public/triangle-grid.svg` (`git rm`).

## Risks

- **The outline chaining is the subtle part.** Polyiamonds with a hole or touching at one node
  give edge sets that are not one loop. `outline()` must detect that and the form be rejected,
  never drawn half-way. Check visually: no stray segments, the pen always returns to its start.
- **CSS and canvas clocks differ slightly.** CSS animations start at first style resolution,
  `performance.now()` counts from navigation start. The gap is the time to first paint (tens of
  ms on a fast load). Acceptable for this intro; if it shows, start the CSS steps from a class
  set at hydration — but that brings back the blank-page risk, so only after a check by eye.
- **`clip-path` on the portrait is already used for the triangle shape.** Animating it directly
  replaces the triangle. Use a wrapper or `mask-image` for the reveal.
- **HiDPI cost.** At DPR 2–3 the canvas is 4–9× the pixels. Pre-rendering dots keeps frames
  cheap; if a frame is still slow on a phone, cap the DPR at 2.
- **Static export, no SSR canvas.** The canvas renders empty on the server and fills after
  hydration — by design (spec: the CSS intro does not wait for JS).

## Verification

There is no test runner in the repo. Each card's gate is `npm run build` + `npm run lint`, plus a
look in the browser: serve the export with `python3 -m http.server 8001 -d out` and check the
three baseline sizes 1440×900, 900×1100 and 390×844 (narrow sizes in an iframe of the exact
width, as in `docs/specs/0001-nextjs-migration.md` §Parity). Headless Chrome screenshots with
`--virtual-time-budget=<ms>` freeze the page at a given point in the intro.

## Open questions

- Exact timings and densities — Card 4 tunes them by eye (spec, Open questions).
- Mobile density below 560 px — Card 4 decides between a lower dot opacity and fewer forms.

## Sessions  ·  one card = one fresh session; a card may land several commits; git carries state between cards

### Card 1 — HeroField canvas with the static dot lattice
precondition:  the "Hero 6a refined" refresh committed (480 × 415.7 frame, 12-cell lattice — see §Starting point); spec `0002` committed
read for why:  `docs/specs/0002-hero-field-animation.md` §Shape (lattice, fade, clean zone, dots only) — only if you need the why
model:         opus
commits:
  1. feat: add the field config and lattice geometry
     touches: lib/field/config.ts, lib/field/lattice.ts  (only these)
     do:      - `config.ts` with every tunable listed in this plan §Tunables, in design units
              - `lattice.ts`: `buildLattice`, integer node/cell ids and neighbour lookups, `fade(x)`, `cleanZone(logoRect, side)` — exactly as in §Geometry
  2. feat: draw the hero lattice on a canvas in place of the static field
     touches: components/HeroField.tsx, components/Hero.tsx, components/Hero.module.css
     do:      - `HeroField.tsx` (`'use client'`): canvas, DPR sizing, `ResizeObserver` on the section, offscreen dots layer, one draw per resize (no loop yet) — §Component
              - `Hero.tsx`: `<HeroField />` first in the section; remove the `<img>` at `components/Hero.tsx:15-17`; add `data-field="logo|frame|text"`
              - `Hero.module.css:38-42`: replace the `.hero-field` rule with the full-section canvas rule
  3. chore: remove the static triangle field
     touches: public/triangle-grid.svg  (deletion only)
     do:      - `git rm public/triangle-grid.svg`; `grep -r triangle-grid app components lib` returns nothing
done when:     `npm run build` and `npm run lint` exit 0; in the browser at 1440×900, 900×1100 and 390×844 the dots sit on the frame's apex and base corners, fade out to the right, and the logo has a clean zone with no hard edge; all commits landed

### Card 2 — Forms: generation, pen, fills, pacing, pause
precondition:  Card 1 landed — `lib/field/lattice.ts` gives nodes, cells, weights; `HeroField` draws the static dots and knows the frame, logo and text rects
read for why:  `docs/specs/0002-hero-field-animation.md` §Shape (Forms, clean zone, "Forms also avoid", after the intro, pausing) and §The new part — only if you need the why
model:         opus
commits:
  1. feat: generate and place triangle forms on the lattice
     touches: lib/field/forms.ts  (only this)
     do:      - the three generators, `outline(cells)` returning one closed node path or `null`, `place(...)` with every rejection rule in §Forms
              - per-form fill colour (40 %, palette from `config.ts`) and per-cell opacity in [0.08, 0.34]
  2. feat: animate forms with a pen that draws, fills and erases
     touches: components/HeroField.tsx
     do:      - `requestAnimationFrame` loop; form phases `draw → fill-in → hold → fill-out → hold → erase` driven by elapsed time; lit nodes with glow; line gradient, stroke opacity and width from `config.ts`
              - busy pacing until the calm switch (~4 s from navigation start), then about half the live forms, a slower pen and longer gaps
  3. feat: pause the hero field when it is not visible
     touches: components/HeroField.tsx
     do:      - `IntersectionObserver` on the section + `visibilitychange` stop and restart the loop; shift form start times by the paused time on resume
done when:     `npm run build` and `npm run lint` exit 0; in the browser forms appear, trace closed outlines with no stray segments, ~40 % fill unevenly, erase tail-after-head, never enter the logo zone, the frame or the text; scrolling the hero away or switching tab stops the loop (no rAF calls in the Performance panel); all commits landed

### Card 3 — Intro sequence and reduced motion
precondition:  Card 2 landed — the field runs with forms and busy-then-calm pacing
read for why:  `docs/specs/0002-hero-field-animation.md` §Shape (Intro table, reduced motion) — only if you need the why
model:         opus
commits:
  1. feat: reveal the hero lattice with a ripple from the frame
     touches: components/HeroField.tsx, lib/field/forms.ts
     do:      - dots appear by distance from the frame centre over the ripple window in `config.ts`; a late hydration joins mid-ripple (time from `performance.now()`, never restarted)
              - `place(...)` gets the revealed radius; no form before ~900 ms
  2. feat: animate the frame, portrait and text into the hero
     touches: components/Hero.module.css
     do:      - keyframes with `animation-fill-mode: both` per §Hero: frame from the apex ~1100 ms, portrait reveal ~1450 ms (keep the triangle `clip-path` at `Hero.module.css:47-50` — reveal with a mask or inner layer), text and the "About" link staggered 2000–2500 ms; logo untouched
  3. feat: show the hero at rest when reduced motion is requested
     touches: components/HeroField.tsx, components/Hero.module.css
     do:      - `matchMedia('(prefers-reduced-motion: reduce)')`: draw one static frame (all dots + a few filled forms), no loop; react to changes of the query
              - module `@media (prefers-reduced-motion: reduce)` sets `animation: none` on every animated class
done when:     `npm run build` and `npm run lint` exit 0; a page load shows, in order, background + logo, dot ripple, first forms, frame, portrait, text (headless screenshots at `--virtual-time-budget` 200 / 1000 / 1600 / 3000 ms confirm it); with JS disabled the frame, portrait and text still arrive; with reduced motion emulated the final state shows at once and nothing moves; all commits landed

### Card 4 — Tune timings and densities by eye
precondition:  Card 3 landed — the full feature runs; every tunable is in `lib/field/config.ts`
read for why:  `docs/specs/0002-hero-field-animation.md` §Open questions — only if you need the why
commits:
  1. style: tune the hero field timings and densities
     touches: lib/field/config.ts, components/Hero.module.css
     do:      - at 1440×900, 900×1100 and 390×844: adjust intro timings, busy/calm counts, pen speed, dot opacity until the field reads as calm after the intro and the text stays readable
              - below 560 px: pick lower dot opacity and/or fewer forms (spec open question) and set the mobile overrides
  2. docs(specs): mark 0002 done
     touches: docs/specs/0002-hero-field-animation.md, docs/specs/README.md, docs/plans/0002-hero-field-animation.md
     do:      - spec + plan frontmatter `status: done` / `status/done`; spec Status line and index row point at the landed commits; record the tuned values that differ from the spec
done when:     `npm run build` and `npm run lint` exit 0; screenshots at the three sizes, after the intro and at ~10 s, show a calm field, a clean logo zone and readable text; all commits landed
