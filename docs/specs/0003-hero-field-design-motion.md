---
number: "0003"
type: spec
slug: hero-field-design-motion
title: Animate the hero field on the design's own triangle structure
status: planned
created: 2026-10-20
headline: The hero background is the "Hero 6a refined" triangle field again — and it breathes: a few edges open, others close, fills come and go, the overall structure never changes.
tags: [spec, status/planned]
---

# 0003 — Animate the hero field on the design's own triangle structure

**Status:** planned — plan written, not built. Replaces the forms part of 0002.
**Build doc:** `docs/plans/0003-hero-field-design-motion.md`.

## Why

0002 landed a dot lattice where a "pen" draws random polyiamonds, big triangles and hexagons.
The owner reviewed it by eye and rejected it: the shapes look like a maths exercise for children.
What the owner wants instead (2026-10-20):

> Keep the triangle forms of the initial static background. The animation should just open some
> vertices and close others, adding the fill colour, but keeping the overall structure.

So the base state is the static design — `public/triangle-grid.svg` as it was before 0002 deleted
it (`git show 5a69190^:public/triangle-grid.svg`) — and the motion is small, local changes on it.

## Shape — the decisions

- **The base state is the design, element for element.** The SVG holds 841 edge segments
  (one stroke path), 165 filled cells (55 each of teal `oklch(0.62 0.09 200)`, blue
  `oklch(0.58 0.11 245)`, accent-500 `#968ae0`, each with its own fill opacity 0.08–0.34) and
  189 lit nodes (radius 1.6, glow). All of it sits on the lattice 0002 already computes (cell 40,
  apex on node (320, 138.6)). It is extracted once into lattice coordinates — edges as node pairs
  `(r, c)`, fills as `CellId` + colour + opacity, lit nodes as `(r, c)` — and committed as data.
  The extraction script stays in the repo so the data can be rebuilt from the SVG blob.
- **No dot layer.** The design has no dots; the 0002 "dots only" base layer is removed. (Open
  question below if the owner wants faint dots back.)
- **"Open" and "close" are on edges.** Reading of the owner's words: a triangle *opens* when one
  of its present edges fades out; a triangle *closes* when a missing edge fades in.
  - **Open:** pick a present design edge, fade it out, hold, fade it back.
  - **Close:** pick a missing edge whose cell already has its other two edges present — the
    change completes a triangle; it never draws a lone line in empty space. Fade in, hold, fade out.
  - **Fill follows closure.** When a close completes a cell, that cell may fill (one palette
    colour, opacity 0.08–0.34 at random, like the design) while it is closed. When an open breaks
    a filled design cell, its fill fades out with the edge and comes back with it.
  - **Fill-only changes** too: a closed cell without fill fades a fill in and out; a design fill
    fades out and back. This is the "adding the fill colour" part.
  - **Lit nodes follow edges:** a node lights while a closed-in edge touches it; a design lit node
    dims while all its edges are open.
- **The structure is kept by a cap, not by hope.** Every change reverts to the design after its
  hold. At most a small share of elements differs from the design at any time (starting values:
  6 % of edges, 12 % of fills), and changes are spread out (no two live changes in the same or
  adjacent cells). A screenshot at any moment reads as the design.
- **Kept from 0002:** the canvas component and its geometry (`lib/field/lattice.ts`), the
  horizontal fade, the logo clean zone (still a hard rule — design elements inside it are not
  drawn, the ramp softens them), no changes inside the frame or the text rect, busy-then-calm
  pacing, pause off screen / hidden tab, the intro timeline. The intro ripple now reveals the
  design's elements (edges, fills, lit nodes) instead of dots; the CSS keyframes are unchanged.
- **Reduced motion** shows the design exactly, once, no loop.

## The new part

- `lib/field/design.ts` — the extracted data, plus the script that writes it.
- `lib/field/changes.ts` — pure: picks open / close / fill changes against the cap and the
  placement rules, and gives each element's alpha at time `t`.
- `HeroField.tsx` draws the design layer (cached offscreen, minus the elements under change) and
  the live changes on top.

## Reused, not rebuilt

`components/HeroField.tsx` (sizing, DOM measurement, pause, ripple, reduced-motion still),
`lib/field/lattice.ts`, `lib/field/config.ts` (lines, fills, litNode, fade, cleanZone, intro),
the intro keyframes in `components/Hero.module.css`.

## Out of scope

- The intro timing, the frame/portrait/text animation — not touched.
- Cursor interaction — still deferred.
- Changing the design composition itself — the SVG is the source of truth.

## Open questions

- **Faint dots under the structure?** Default: no, as in the design. One config flag if wanted.
- **Change rate and cap** — starting values above, to tune by eye with the owner.
