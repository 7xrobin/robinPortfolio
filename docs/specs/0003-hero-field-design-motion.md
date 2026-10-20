---
number: "0003"
type: spec
slug: hero-field-design-motion
title: Animate the hero field on the design's own triangle structure
status: planned
created: 2026-10-20
headline: The hero background is the "Hero 6a refined" triangle field, and it breathes — triangles form and dissolve along the edge of the shape, colours shift, points light and fade, the body of the shape never moves.
tags: [spec, status/planned]
---

# 0003 — Animate the hero field on the design's own triangle structure

**Status:** planned — plan written, not built. The hero shows the static `public/triangle-grid.svg`
again (`039a0b9` reverted the 0002 canvas); the intro keyframes from 0002 stay.
**Build doc:** `docs/plans/0003-hero-field-design-motion.md`.

## Why

0002 drew a dot lattice where a "pen" traced random polyiamonds, big triangles and hexagons. The
owner rejected it by eye on 2026-10-20 — "math forms like for kids" — and had the static field put
back. What the owner wants (2026-10-20, two messages):

> Keep the triangle forms of the initial static background. The animation should just open some
> vertices and close others, adding the fill colour, but keeping the overall structure.

> What I want to see is the rearrangement of the triangles on the edges of the form, some forming
> and disappearing, and the colours, and some points appearing and disappearing.

## The design, measured

`public/triangle-grid.svg` (1280 × 760, cell 40, apex on node (320, 138.6)) is:

- **841 edges** in one stroke path. They close **517 triangles** (cells with all 3 edges). One
  edge belongs to no closed triangle.
- **97 boundary triangles** — closed triangles with at least one edge no other closed triangle
  shares. Together they are the outline of the shape.
- **110 open triangles** around the shape — cells with 1 or 2 of their edges drawn, the ragged
  border of the design.
- **165 fills** (55 teal `oklch(0.62 0.09 200)`, 55 blue `oklch(0.58 0.11 245)`, 55 accent-500
  `#968ae0`, opacity 0.08–0.34 each), all on closed triangles.
- **189 lit nodes** (radius 1.6, glow).
- A horizontal fade mask (1 → 0.8 at 0.45 → 0.2 at 0.75).

## Shape — the decisions

- **The base state is the design, element for element.** The canvas draws exactly what the SVG
  draws. The SVG is extracted once into lattice coordinates (edges as node pairs, fills as cell +
  colour + opacity, lit nodes as nodes) and committed as data, with the script that rebuilds it.
- **Only the edge of the shape moves.** Three kinds of change, all on the design's lattice:
  - **Dissolve** — a boundary triangle fades away: its outer edges (the ones no other closed
    triangle uses) and its fill fade out. Inner edges stay, so the body never gets a hole.
  - **Form** — an empty or open cell that touches the shape completes: its missing edges fade
    in, and it may take a fill. It never appears away from the shape.
  - Dissolve and form run side by side, so the outline seems to shift a little — one triangle
    gone here, one new there.
- **Colours shift across the whole shape.** A fill cross-fades to another palette colour or
  another opacity in the 0.08–0.34 range; a closed triangle without fill gains one; a fill fades
  out. Always one cell at a time, slowly.
- **Points light and fade.** Lit nodes appear on nodes of the shape and fade away; design lit
  nodes go dark for a while and come back. A node on a dissolving triangle's outer corner dims
  with it.
- **The structure is kept by rules, not by hope.** Every change goes back to the design after its
  hold. Caps on what differs from the design at any moment (starting values: 8 boundary changes,
  12 % of fills, 15 % of lit nodes). No two live changes on the same or an adjacent cell. So a
  screenshot at any moment reads as the design.
- **The field stops before the nav bar** (owner's decision, 2026-10-20 — "to not cover my
  logo"). Nothing is drawn above the bottom of `.hero-nav` (measured from the DOM; 88 px, 72 px
  on phones). Below it the field fades in over ~1 cell, so it has no hard cut. This replaces
  0002's padded logo rect: the whole bar is clean, the logo and the About link always sit on the
  plain background. Today's static field already reaches the logo on phones (390 px: the field
  starts ~15 px from the top), so this is a visible change there.
- **Placement limits** (from 0002): no change in the nav band or its ramp, inside the frame
  triangle or the text rect, or where the fade is very low.
- **Kept from 0002:** the canvas covers the whole section; geometry from the measured frame
  (`side = frameWidth / 12`); busy-then-calm pacing; pause off screen or on a hidden tab; the
  intro ripple from the frame centre, now revealing the design's elements; the CSS intro
  keyframes. 0002's code is in git: `git show 039a0b9^:components/HeroField.tsx`,
  `…:lib/field/lattice.ts`, `…:lib/field/config.ts`.
- **No dots, no pen, no generated shapes.** The 0002 forms engine (`lib/field/forms.ts`) does
  not come back.
- **Reduced motion** shows the design exactly, once, with no loop. With no JS the static field
  is not shown (the canvas is empty) — acceptable, as in 0002.

## The new part

- `lib/field/design.ts` — the extracted data; `scripts/extract-field.mjs` writes it.
- `lib/field/shape.ts` — derived once from the data: closed triangles, boundary triangles, the
  frontier (cells next to the shape that can form), each with its outer edges.
- `lib/field/changes.ts` — pure: picks dissolve / form / colour / point changes under the caps
  and rules, and gives each element's alpha and colour at time `t`.

## Out of scope

- Intro timing and the frame / portrait / text animation — unchanged.
- Cursor interaction — still deferred.
- Changing the composition — the SVG is the source of truth.

## Open questions

- **Rates and caps** — starting values in the plan, to tune by eye with the owner.
- **Drift** — changes always revert. If the owner wants the outline to wander for real (no
  revert), that is a later change on `changes.ts`.
