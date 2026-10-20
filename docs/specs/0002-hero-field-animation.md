---
number: "0002"
type: spec
slug: hero-field-animation
title: Animated triangle field and intro sequence for the hero
status: done
created: 2026-10-19
headline: Visitors now see the hero build itself — a dot lattice that draws, fills and erases triangles, then the portrait and the text arrive in order.
tags: [spec, status/done]
---

# 0002 — Animated triangle field and intro sequence for the hero

**Status:** done — landed `74d44a1`..`a4fd5e3`; the intro keyframes in `components/Hero.module.css` stay live, the pen-drawn field was reverted (`039a0b9`) and redone by 0003.
**Replaced in part:** the owner rejected the forms by eye on 2026-10-20 — the field motion is redone in `docs/specs/0003-hero-field-design-motion.md`; the intro sequence stays.
**Build doc:** `docs/plans/0002-hero-field-animation.md` (executed, landed `74d44a1`..`a4fd5e3`).

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
  field ("Hero 6a refined", now `triangle-grid.svg`) has cell side 40 and row height 34.64 in a
  1280 × 760 space where the frame is 480 × 415.7, i.e. exactly 12 cells wide and 12 rows tall,
  with the apex on the lattice node (320, 138.6) and the base corners on lattice nodes too. So:
  `side = frameWidth / 12`, `rowHeight = side · √3/2`, origin = frame apex. The frame edges then
  lie on lattice lines at every size, as in the design. The frame rect is measured from the DOM
  (`.hero-img`) and re-measured with a `ResizeObserver`.
- **The design's horizontal fade is kept.** Every dot, line and fill is multiplied by the fade the
  SVG uses, a left-to-right ramp over the design space. In frame units, the design's x = 0 is
  `apexX − 320/480 · frameWidth` and its width is `1280/480 · frameWidth`. The opacity stops are
  1 at 0, 0.8 at 0.45, 0.2 at 0.75. The SVG holds 0.2 until its right edge, but the canvas
  covers the whole section, so past the design's right edge (t > 1) the fade drops to 0 over one
  cell. Without that, dots would cover the text side at 0.2.
- **Base layer: dots only** (owner's decision). All lattice nodes are small faint dots. There are
  no permanent grid lines — a line exists only while a form is drawing it.
- **Forms: traced by a "pen", then erased the same way.**
  - A form is a connected set of lattice triangles: a random polyiamond of 1–6 cells, a large
    triangle of side 2 or 3, or a hexagon of the 6 cells around one node.
  - Its outline (edges used by exactly one cell) is chained into one closed path. A pen draws the
    path from node to node; each node it reaches lights up (the design's "lit" node style:
    radius 1.6 in design units, `oklch(0.80 0.10 195)`, 4 px glow). After a hold, the pen erases
    the path in the same direction — the tail follows the head.
  - About 40 % of forms fill: after the outline closes, its cells fade in one by one in one
    colour from the design palette — teal `#33969b`, blue `#3a80b7`, accent-500 `#968ae0` (hex of
    the SVG's `oklch()` values and token, so they render the same in every canvas) — hold, fade
    out, then the outline erases. Each cell gets its own fill opacity between 0.08 and 0.34, the
    range the design uses, so a filled form looks uneven like the design and not flat.
  - Line colour is the design's line gradient (`#5dbcc1` → `#5fa5de` → `#9184d9`), stroke
    opacity 0.55, width 0.8 design units.
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

**Tuned values** (Card 4, `a4fd5e3`; every other starting value above was kept, including all CSS
intro timings):

- Busy pacing: 6 → 5 live forms.
- Calm switch: 4000 → 3500 ms, so the field settles soon after the text lands (~2950 ms).
- Below 560 px (`MOBILE_OVERRIDES`): dot opacity 0.35 → 0.22; busy 6 → 3 live forms; calm 3 → 2.

## Commit breakdown — SKETCH

This is a sketch of intent, in dependency order. **It is not the plan** — `/planc` expands it
into executable session cards in `docs/plans/0002-hero-field-animation.md`.

1. `HeroField` client component: canvas sizing, lattice geometry, fade and logo clean zone,
   static dots layer; mount it in `Hero` and remove `triangle-grid.svg` and `.hero-field`.
2. Forms: shape generators, outline chaining, placement checks, pen draw/erase, fills, lit nodes;
   busy-then-calm pacing; pause off screen / hidden tab.
3. Intro: canvas ripple reveal, CSS keyframes for frame, portrait and text; reduced-motion path.
4. Tune timings and densities by eye at 1440×900, 900×1100 and 390×844.
