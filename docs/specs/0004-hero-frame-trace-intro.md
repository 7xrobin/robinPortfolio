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

**Status:** planned — spec only. Today the whole frame SVG fades and scales in from its apex
(`hero-frame-in`, `opacity 0 → 1` + `scale(0.92 → 1)`, 600 ms starting at 1100 ms) and the portrait
image is uncovered from top to bottom (`hero-portrait-in`, a `clip-path: inset()` wipe on
`.hero-portrait img`, 700 ms starting at 1450 ms), both in `components/Hero.module.css`
(`.hero-frame` :95–104, `.hero-portrait img` :114–121, keyframes :170–185).
**Hardened:** 2026-10-20 against `8f802b7`
**Build doc:** `docs/plans/0004-hero-frame-trace-intro.md` (not written yet).

## Why

0003 made the background triangles move by tracing their edges: a new edge grows from one node to
the next, with a lit point on its tip. The frame around the portrait is the largest triangle on the
page, and it still just fades in. The owner wants it built the same way (2026-10-20):

> It should initially draw the triangle, as the others in the bg, and fade in the image.

## Current state the change builds on

- **Frame markup** (`components/Hero.tsx:16–37`): `.hero-img` (`data-field="frame"`) holds one SVG,
  `viewBox="0 0 100 100"` + `preserveAspectRatio="none"`, with a single `<polygon
  points="50,0 100,100 0,100">` that is both the fill (`var(--color-bg)`, `fillOpacity` 0.88) and
  the stroke (`url(#frame-stroke)` gradient, width 1.4, `vectorEffect="non-scaling-stroke"`).
- **Frame glow**: `filter: drop-shadow(0 0 18px …)` sits on the whole SVG (`.hero-frame`,
  `Hero.module.css:101`), so it applies to everything drawn inside it — fill, line, and any tip.
- **Frame size**: `.hero-img` has `aspect-ratio: 480 / 415.7` unconditionally
  (`Hero.module.css:83`); the breakpoints in `app/globals.css:112–151` change only its width
  (`--img-max` 480 px / 400 px / 86 %). The triangle is equilateral: side 480 at full size.
- **Portrait**: `.hero-portrait` (class `lighten` → `mix-blend-mode: lighten`, `globals.css:82`)
  keeps a static triangle `clip-path` (`Hero.module.css:110`) — that is the mask, not the intro, and
  stays. The intro is only the `animation` on `.hero-portrait img` (`:120`).
- **Intro timing model**: `--intro-*` custom properties on `.hero` (`Hero.module.css:7–14`); base
  rules hold the final state; keyframes hold only the hidden `from` with fill-mode `both`. The
  text rises from 2000 ms in 150 ms steps for 500 ms, so the intro ends at **~2950 ms**
  (`2000 + 3 × 150 + 500`, last item `.hero-links a`).
- **Reduced motion**: `Hero.module.css:195–205` sets `animation: none` on an explicit selector list
  (`.hero-frame`, `.hero-portrait img`, the text items); the base rules then show the final state.
- **The field under the frame**: `HeroField` draws on a canvas that is a direct child of the
  section, painted beneath `.hero-img` (`z-index: 1`). 189 of the design's 830 edges lie inside the
  frame triangle, so while the frame fill is clear the ripple shows lattice inside it. The ripple
  grows from the frame centroid between 250 and 1350 ms (`FIELD.intro`, `lib/field/config.ts:130`),
  timed on `performance.now()` (`HeroField.tsx:392–395`). `HeroField` measures `.hero-img` (the
  `data-field="frame"` box, `HeroField.tsx:301`), never the SVG, so nothing in this change moves
  the field.
- **The background trace being matched**: `sample` in `lib/field/changes.ts:405–413` grows a
  change's edges one after another in list order (the `trace` helper); `HeroField.tsx:417–438`
  draws each growing edge brighter mid-trace and rides a lit point on its tip at 1.5 × the lit-node
  sprite (`FIELD.litNode`: radius 1.6, `#65d2d2`, glow blur 4, `#4fcdcd`, all in design units ×
  `s`), dropping it the moment the edge completes.

## Shape — the decisions

- **The frame is traced edge by edge** (owner's choice): apex → right corner → left corner → apex,
  one edge after the other, which is the order of the polygon's own points — and the order in which
  an SVG polygon's dash pattern runs, so one `stroke-dashoffset` animation over the closed outline
  traces exactly that. Same movement as a background rebuild, only larger.
- **The frame SVG moves to its real aspect, in design units.** `viewBox="0 0 480 415.7"`, outline
  `240,0 480,415.7 0,415.7`, default `preserveAspectRatio`. Because the box's aspect ratio is fixed
  (`.hero-img`), this draws the same triangle at every breakpoint with no stretch — a round tip stays
  round. One viewBox unit is one design unit (the frame is 12 cells × 40 du), so the field's
  lit-node sizes apply unchanged, and the outline is exactly **1440 units** long (3 × 480).
- **Fill and line are split.** The single polygon becomes two: a fill-only polygon (`--color-bg`
  at 0.88) and a stroke-only outline (the `frame-stroke` gradient) on top of it, so the line can be
  traced while the fill is still clear, and the fill can fade on its own.
- **A lit point rides the tip** while the line grows: a small SVG circle in `#65d2d2` with a
  `#4fcdcd` glow, sized as the field's tip (radius 2.4, glow 6 — `FIELD.litNode` × 1.5, in viewBox
  units, which scale with the frame as the field's do). It moves along the same outline on the same
  timeline — same start, duration and timing function as the trace — and fades out as the triangle
  closes. Its base (final) state is hidden.
- **The trace runs with the ripple** (owner's choice). The trace starts shortly after the ripple
  starts and closes by about 1200 ms, before the ripple ends, so the frame and the field build
  together. The two run on different clocks: CSS delays count from when the hero is first styled
  (≈ first paint), the ripple from navigation start, so on a real load the trace lags the numbers by
  the time to first paint — the same alignment the 0002 intro already lives with. Timings are
  tuned by eye, not computed from each other.
- **The frame's fill and glow fade in after the trace closes.** While the fill is clear the ripple
  shows the lattice inside the triangle; the fill then covers it, so the inside reads as "built,
  then closed". The glow is the `drop-shadow` on the SVG, so its fade is a `filter` keyframe on
  `.hero-frame` from a transparent shadow colour — which means the outline and tip have no
  drop-shadow while tracing; the tip's own glow carries the light.
- **`hero-frame-in` is retired.** No more fade + scale on the whole SVG: the trace is the frame's
  entrance. `transform-origin: 50% 0` on `.hero-frame` goes with it.
- **The portrait fades in** (opacity only) once the fill is in, replacing the `hero-portrait-in`
  `clip-path` wipe. Only the `animation` declaration of `.hero-portrait img` changes; the
  container's triangle `clip-path` stays. Then the text rises as today (`--intro-text-delay`
  2000 ms). Total intro length stays about what it is today (~3 s).
- **CSS and SVG only — no JS, no canvas.** The intro must run without JS, as the 0002 intro does.
  `HeroField` and everything in `lib/field/` stay as they are.
- **Reduced motion shows the final state:** frame closed, fill and glow in, portrait visible, no
  tip. Every element that gets an intro animation is added to the reduced-motion selector list in
  the same commit that animates it.

## The new part

- `components/Hero.module.css`: the trace keyframe (`stroke-dashoffset` from the full outline
  length to 0), the tip's movement along the outline and its fade, the fill fade, the glow
  (`filter`) fade, the portrait opacity fade; their delays and durations as `--intro-*` properties
  next to the existing ones on `.hero`; `hero-frame-in`, `hero-portrait-in` and the
  `--intro-frame-*` / `--intro-portrait-*` properties they use replaced; the reduced-motion list
  extended.
- `components/Hero.tsx`: the frame SVG gets the real-aspect `viewBox`, the fill-only polygon, the
  stroke-only outline, and the tip circle, each with a class from the module.

## Reused, not rebuilt

- The intro timing model — `--intro-*` custom properties on `.hero`, base rules hold the final
  state, keyframes hold only the hidden `from`.
- The frame's look — the `frame-stroke` gradient, the 1.4 stroke width, the `drop-shadow`.
- The lit-node look from `FIELD.litNode`, copied as values (CSS cannot read the TS config).
- The reduced-motion block at the end of `Hero.module.css`.

## Out of scope

- The background field and its motion — 0003, unchanged.
- The text intro — unchanged.
- The portrait's size and position in the frame (`.hero-portrait img` `width` / `left`) — the
  owner is adjusting these by hand; this spec does not touch them.
- Replaying the intro on scroll or on hover — not asked.

## Open questions — the plan settles each

- **Stroke dash with `vector-effect: non-scaling-stroke`.** Today the line is 1.4 px at every size
  through `non-scaling-stroke`, but under it the dash pattern is measured in screen space, so a
  dash length in viewBox units (or `pathLength`) does not match the drawn outline. Two ways out:
  (a) keep `non-scaling-stroke` and set the dash length per breakpoint in CSS px as a custom
  property (3 × the frame's rendered width); or (b) drop `non-scaling-stroke`, keep
  `stroke-width: 1.4` in viewBox units and dash over 1440 units. (b) has one length at every size
  and matches how the field's own lines scale (`lines.width * s`, `HeroField.tsx:257`), but the
  frame line thins with the frame: 1.4 px at 480 px, ~1.17 px at 400 px, ~0.9 px on a 375 px phone.
  The plan checks both in Chrome and Safari and picks one; if (b) visibly changes the frame on
  tablet/phone, that is an owner call.
- **Moving the tip without JS.** CSS `offset-path: path(…)` on the SVG circle, or SMIL
  `<animateMotion>`. Both run without JS; the requirement is that the tip and the line share one
  timeline (CSS delay + duration + timing function for both — `offset-path` keeps them on one
  model, SMIL runs on its own clock). The plan checks Safari before choosing.
- **Exact timings** — starting values in the plan, tuned by eye with the owner.

## Done when

- `npm run lint` and `npm run build` pass.
- At 1440×900, 900×1100 and 390×844, a fresh load shows: the frame outline traced apex → right →
  left → apex with a round lit point on its tip, while the ripple spreads; lattice visible inside the
  triangle until the fill fades in; the glow arriving with the fill; then the portrait fading in
  (no top-to-bottom wipe); then the text rising as before. The tip is gone once the triangle closes.
- The triangle is the same shape and position as today at all three sizes (no stretch, corners on
  the `.hero-img` box).
- With JS disabled the same frame/portrait/text intro runs.
- With `prefers-reduced-motion: reduce` the hero is shown at rest: closed frame, fill and glow in,
  portrait visible, no tip, no animation.

## Commit breakdown — a sketch, not the plan

`/planc` turns this into session cards.

1. `feat: trace the hero frame edge by edge` — real-aspect `viewBox`, fill and outline split, the
   dash trace, fill and glow fade after it, `hero-frame-in` retired, timings as `--intro-*`, the
   new elements added to the reduced-motion list.
2. `feat: ride a lit point on the frame trace` — the tip circle on the outline's timeline, hidden
   at rest, added to the reduced-motion list.
3. `feat: fade the portrait in after the frame closes` — opacity in place of the `clip-path` wipe
   on `.hero-portrait img` (its `animation` only), `hero-portrait-in` and its properties retired.
