---
number: "0004"
type: spec
slug: hero-frame-trace-intro
title: Trace the portrait frame edge by edge and fade the portrait in
status: planned
created: 2026-10-20
headline: Visitors now see the portrait's triangle drawn edge by edge, the way the background triangles are, while the field ripples out — then the portrait fades in.
tags: [spec, status/planned]
---

# 0004 — Trace the portrait frame edge by edge and fade the portrait in

**Status:** planned — spec only. Today the frame fades and scales in (`hero-frame-in`, 1100 ms)
and the portrait is uncovered from top to bottom (`hero-portrait-in`, a `clip-path` wipe at
1450 ms), both in `components/Hero.module.css`.
**Build doc:** `docs/plans/0004-hero-frame-trace-intro.md` (not written yet).

## Why

0003 made the background triangles move by tracing their edges: a new edge grows from one node to
the next, with a lit point on its tip. The frame around the portrait is the largest triangle on the
page, and it still just fades in. The owner wants it built the same way (2026-10-20):

> It should initially draw the triangle, as the others in the bg, and fade in the image.

## Shape — the decisions

- **The frame is traced edge by edge** (owner's choice): apex → right corner → left corner → apex,
  one edge after the other, in the order of the polygon's own points (`50,0 100,100 0,100` in
  `components/Hero.tsx`). This is the same movement as a background rebuild
  (`lib/field/changes.ts` `sample`, the `trace` helper), only larger.
- **A lit point rides the tip** while the line grows, like the background traces. It uses the
  field's lit-node look (`#65d2d2`, glow `#4fcdcd`, `FIELD.litNode` in `lib/field/config.ts`),
  scaled to the frame, and fades out when the triangle closes.
- **The trace runs with the ripple** (owner's choice). The ripple grows from the frame centroid
  between 250 and 1350 ms (`FIELD.intro`); the trace starts just after it and closes by about
  1200 ms, so the frame and the field build together. Total intro length stays about what it is
  today (~2.5 s).
- **The frame's dark fill fades in after the trace closes.** The polygon is filled with
  `--color-bg` at 0.88; while it is still clear, the ripple shows the lattice inside the triangle,
  and the fill then covers it — so the inside reads as "built, then closed". The line's
  drop-shadow glow comes in with the fill.
- **The portrait fades in** (opacity only) once the fill is in, replacing today's top-to-bottom
  `clip-path` wipe. Then the text rises as today (`hero-rise`, 2000 ms).
- **CSS and SVG only — no JS, no canvas.** The intro must run without JS, as the 0002 intro
  does (the timings are CSS custom properties on `.hero` for that reason). The trace is a
  `stroke-dashoffset` animation on the frame polygon; the tip is a small SVG circle moved along
  the same outline on the same timeline. `HeroField` stays as it is.
- **The frame SVG moves to its real aspect.** Today it is `viewBox="0 0 100 100"` with
  `preserveAspectRatio="none"`, which would stretch a round tip into an ellipse. The frame is
  always 480 : 415.7 (`.hero-img` `aspect-ratio`), so a `viewBox="0 0 480 415.7"` draws the same
  triangle at every size with no stretch.
- **Reduced motion shows the final state:** frame closed, fill and glow in, portrait visible, no
  tip — as the other intro keyframes already do under `prefers-reduced-motion`.

## The new part

- Keyframes in `components/Hero.module.css`: the trace (`stroke-dashoffset` over the outline's
  length), the tip's path along the outline and its fade, the fill + glow fade, and the portrait
  fade, with their delays as `--intro-*` properties next to the existing ones.
- In `components/Hero.tsx`: the frame SVG gets the real-aspect `viewBox`, a separate stroke-only
  outline to trace (so the fill can fade on its own), and the tip circle.

## Reused, not rebuilt

- The intro timing model — `--intro-*` custom properties on `.hero`, base rules hold the final
  state, keyframes hold only the hidden `from` (`components/Hero.module.css`, top of the file).
- The frame's look — the `frame-stroke` gradient, the stroke width, the drop-shadow.
- The lit-node colours from `FIELD.litNode`, copied as values (CSS cannot read the TS config).
- The reduced-motion block at the end of `Hero.module.css`.

## Out of scope

- The background field and its motion — 0003, unchanged.
- The text intro — unchanged.
- The portrait's size and position in the frame (`.hero-portrait img` `width` / `left`) — the
  owner is adjusting these by hand right now; this spec does not touch them.
- Replaying the intro on scroll or on hover — not asked.

## Open questions

- **Stroke dash with `vector-effect: non-scaling-stroke`.** The frame line keeps a 1.4 px width at
  every size through `non-scaling-stroke`, but a dash pattern is then measured in screen pixels,
  not along the path, so `pathLength` cannot be trusted. Either measure the outline in CSS px (the
  dash length becomes a custom property set per breakpoint) or drop `non-scaling-stroke` and set
  the width in `viewBox` units. The plan picks one after checking Chrome and Safari.
- **Moving the tip without JS.** CSS `offset-path` on an SVG element, or SMIL `<animateMotion>`.
  Both run without JS; what matters is that the tip and the line share one timeline. The plan
  checks Safari before choosing.
- **Exact timings** — starting values in the plan, to tune by eye with the owner.

## Commit breakdown — a sketch, not the plan

`/planc` turns this into session cards.

1. `feat: trace the hero frame edge by edge` — real-aspect `viewBox`, stroke-only outline with the
   dash trace, fill and glow fade after it, timings as `--intro-*`.
2. `feat: ride a lit point on the frame trace` — the tip circle on the outline's timeline.
3. `feat: fade the portrait in after the frame closes` — opacity in place of the `clip-path` wipe,
   reduced-motion block updated.
