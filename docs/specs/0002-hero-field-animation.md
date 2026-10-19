---
number: "0002"
type: spec
slug: hero-field-animation
title: Animated triangle field and intro sequence for the hero
status: planned
created: 2026-10-19
headline: Visitors now see the hero build itself — a dot lattice that draws, fills and erases triangles, then the portrait and the text arrive in order.
tags: [spec, status/planned]
---

# 0002 — Animated triangle field and intro sequence for the hero

**Status:** planned — spec only. The hero background is still the static `public/triangle-grid.svg`
(`components/Hero.tsx:15`); there is no client component and no animation yet.
**Build doc:** `docs/plans/0002-hero-field-animation.md` (not written yet).

## Why

The hero background is a still image of a triangle lattice. The owner wants it alive: dots that
draw triangular forms and erase them, some triangles that fill with colour and clear again — while
the area around the logo always stays clean so the logo is readable. The first load should also
feel built, not just painted: an empty background first, then the lattice, then the portrait
triangle, then the text.

This builds on 0001 (the hero as a Server Component with CSS Modules). It replaces the static
field; the rest of the hero keeps its look.

## Shape — the decisions

- **One client component, `HeroField`, drawing on a `<canvas>`.** It is the only `'use client'`
  file; `Hero` stays a Server Component and renders `<HeroField />` as the first child of the
  section. Canvas, not SVG/DOM: the lattice has ~800 dots at desktop size and many short-lived
  lines; animating that many SVG nodes costs layout and style work every frame, a canvas costs
  only the pixels that change. No animation library — the loop is `requestAnimationFrame` and
  the logic is small.
- **The canvas covers the whole hero section** (`position: absolute; inset: 0`, under
  `.hero-inner`). The old field image covered a fixed 1280 × 760 box anchored to the frame; a
  full-section canvas lets the lattice reach every edge at every breakpoint.
- **The lattice is computed, aligned to the frame — same geometry as the design.** The design
  field (`triangle-grid.svg`) has cell side 44 and row height 38.1 in a space where the frame is
  484 × 419.2, i.e. exactly 11 cells, with the frame apex on a lattice node. So:
  `side = frameWidth / 11`, `rowHeight = side · √3/2`, origin = frame apex. The frame edges then
  lie on lattice lines at every size, as in the design. The frame rect is measured from the DOM
  (`.hero-img`) and re-measured with a `ResizeObserver`.
- **The design's radial fade is kept.** Every dot, line and fill is multiplied by the fade the
  SVG used (centre at frame-x, apex-y + 199.6/484 · frameWidth; radius 640/484 · frameWidth;
  opacity stops 0.95 → 0.4 → 0). Same falloff as today, so the text side stays quiet.
- **Base layer: dots only** (owner's decision). All lattice nodes are small faint dots. There are
  no permanent grid lines — a line exists only while a form is drawing it.
- **Forms: traced by a "pen", then erased the same way.**
  - A form is a connected set of lattice triangles: a random polyiamond of 1–6 cells, a large
    triangle of side 2 or 3, or a hexagon of the 6 cells around one node.
  - Its outline (edges used by exactly one cell) is chained into one closed path. A pen draws the
    path from node to node; each node it reaches lights up (the design's "lit" node style). After
    a hold, the pen erases the path in the same direction — the tail follows the head.
  - About 40 % of forms fill: after the outline closes, its cells fade in one by one in one
    colour from the design palette — teal `#33969b`, blue `#3a80b7`, accent `#9184d9` (hex of the
    SVG's `oklch()` values, so they render the same in every canvas) — hold, fade out, then the
    outline erases.
  - Line colour is the design's line gradient (`#5dbcc1` → `#5fa5de` → `#9184d9`).
- **The clean zone around the logo is a hard rule.** The logo rect (measured from the DOM) is
  padded by ~0.6 cell; inside it nothing is drawn — no dots, no forms. Outside it a smooth ramp
  over ~1.5 cells brings dots back, so the zone has no visible edge. Forms are rejected if any of
  their nodes falls in the zone or in the ramp.
- **Forms also avoid** the frame interior (it is covered by the frame fill) and the text block
  (readability). Two live forms never share a cell.
- **Intro, every page load** (owner's decision). Times are from navigation start:

  | Time | What happens |
  |---|---|
  | 0 | Empty background (the hero gradients) **and the logo** — the logo is visible from the first frame (owner's decision) |
  | ~250–1350 ms | Dots appear in a ripple outward from the frame centre |
  | ~900 ms → | First forms start, only inside the area the ripple has already revealed |
  | ~1100 ms | Frame triangle fades and scales in from its apex |
  | ~1450 ms | Portrait reveals inside the triangle, top to bottom (`clip-path` from the apex) |
  | ~2000–2500 ms | "Hi, I'm Robin", the headline, the sub-text and the "About" link rise in, staggered |

  The frame, portrait and text steps are **CSS keyframes** in `Hero.module.css` with
  `animation-fill-mode: both`. They start at first paint without waiting for JavaScript, so a
  slow or failed hydration never leaves the page blank. The canvas uses `performance.now()`
  (also measured from navigation start) as its clock, so it lines up with the CSS timeline; if it
  hydrates late it joins the ripple mid-way instead of restarting.
- **After the intro the field slows down** (owner's decision). During the intro: more live forms
  and a faster pen. After ~4 s: fewer live forms (about half), a slower pen and longer pauses
  between forms, so the hero settles into a calm background. The loop keeps running at that pace.
- **The loop pauses when nobody sees it:** `IntersectionObserver` (hero off screen) and
  `visibilitychange` (tab hidden) stop `requestAnimationFrame`.
- **`prefers-reduced-motion: reduce`** shows the final state at once: CSS animations off, canvas
  draws one static frame (dots + a few filled triangles), no loop.
- **The static `public/triangle-grid.svg` is deleted** and the `.hero-field` rule removed. Git
  history keeps it.

## The new part

`HeroField` is the only genuinely new code — a small state machine on a canvas:

- **Geometry** — lattice from the frame rect; per-node weight = fade × clean-zone ramp.
- **Form generation** — the three shape generators, the outline chaining (reject the form if the
  outline is not one closed path), and the placement checks (clean zone, frame, text, occupied
  cells, revealed area).
- **The timeline** — the intro ripple, the busy-then-calm pacing, and the per-form phases
  (draw → fill → hold → clear → erase).

Static dots are pre-rendered once per resize into an offscreen canvas and copied each frame;
only live forms are drawn per frame.

## Reused, not rebuilt

- The hero markup, layout tokens and frame/portrait CSS from 0001 (`components/Hero.tsx`,
  `components/Hero.module.css`, `app/globals.css`). The intro only adds keyframes on existing
  classes.
- The design's lattice geometry, fade and colours from `public/triangle-grid.svg` — reproduced
  in code, not redesigned.
- The existing global `prefers-reduced-motion` block in `app/globals.css`.

## Out of scope (named, deferred)

- **Interaction** (forms following the cursor, hover reactions) — not requested; can be a later
  change on the same component.
- **Skip-intro on repeat visits** — rejected: the intro plays on every load.
- **Animating other sections** — there are none yet.
- **A WebGL renderer** — 2D canvas is enough for this number of shapes.

## Open questions

- **Exact timings and densities** — the numbers above are starting values, to be tuned by eye in
  the browser at the three baseline sizes.
- **Mobile density** — at 390 px wide the frame is smaller, so cells are smaller and dots denser;
  may need a lower dot opacity or fewer forms below 560 px.

## Commit breakdown — SKETCH

This is a sketch of intent, in dependency order. **It is not the plan** — `/planc` expands it
into executable session cards in `docs/plans/0002-hero-field-animation.md`.

1. `HeroField` client component: canvas sizing, lattice geometry, fade and logo clean zone,
   static dots layer; mount it in `Hero` and remove `triangle-grid.svg` and `.hero-field`.
2. Forms: shape generators, outline chaining, placement checks, pen draw/erase, fills, lit nodes;
   busy-then-calm pacing; pause off screen / hidden tab.
3. Intro: canvas ripple reveal, CSS keyframes for frame, portrait and text; reduced-motion path.
4. Tune timings and densities by eye at 1440×900, 900×1100 and 390×844.
