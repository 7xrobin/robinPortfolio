---
number: "0004"
type: plan
slug: hero-frame-trace-intro
title: Trace the portrait frame edge by edge and fade the portrait in
status: planned
created: 2026-10-20
tags: [plan, status/planned]
---

# 0004 — Plan: trace the portrait frame edge by edge and fade the portrait in

**Hardened:** 2026-10-20 against `6913fac`
**Executed:** landed `2d702c2`..`371c958`: mask trace, `offset-path` tip, fill/glow and portrait fades in `components/Hero.tsx` + `Hero.module.css`; Safari is an owner check (not drivable from the session); awaiting the owner's review by eye.

**Spec:** `docs/specs/0004-hero-frame-trace-intro.md` — the decisions and their why. This file is
only how they land.

## Goal

On load, the frame's outline is drawn apex → right corner → left corner → apex with a lit point
riding its tip, while the field's ripple spreads. Once the triangle closes, the frame's fill and
glow fade in over the lattice inside it, then the portrait fades in (opacity, no wipe), then the
text rises as today. CSS and SVG only; the frame looks exactly as it does today at rest, at every
breakpoint.

## Starting point

Checked against `6913fac` (no code changed since the spec's `8f802b7`).

- `components/Hero.tsx:17–37` — one SVG, `viewBox="0 0 100 100"` + `preserveAspectRatio="none"`,
  one `<polygon points="50,0 100,100 0,100">` carrying both the fill (`var(--color-bg)`,
  `fillOpacity="0.88"`) and the stroke (`url(#frame-stroke)`, `strokeWidth="1.4"`,
  `vectorEffect="non-scaling-stroke"`; default `stroke-linejoin: miter`). The gradient
  `#frame-stroke` (`:24–27`) uses the default `objectBoundingBox` units.
- `components/Hero.module.css` — `--intro-*` on `.hero` (`:7–14`: frame `:7–8`, portrait `:9–10`,
  text `:11–13`, ease `:14`); `.hero-frame` (`:95–104`) holds the `drop-shadow` glow (`:101`),
  `transform-origin: 50% 0` (`:102`) and the `hero-frame-in` animation (`:103`);
  `.hero-portrait img` holds `hero-portrait-in` (`:120`); keyframes `hero-frame-in` (`:170–175`),
  `hero-portrait-in` (`:177–185`), `hero-rise` (`:187–192`); reduced-motion list (`:195–205`,
  already holding `.hero-frame` and `.hero-portrait img`).
- `.hero-img` is `aspect-ratio: 480 / 415.7` at every size (`Hero.module.css:83`) and has only
  absolutely positioned children (the SVG, `.hero-portrait`); the field canvas is a child of the
  section, not of `.hero-img`. Its width is fluid — `--img-flex` / `--img-max` in
  `app/globals.css:112–151` (`0 1 480px` capped 480 px; `0 1 42%` capped 400 px; `1 1 100%` capped
  86 %). There is **no fixed frame width per breakpoint**, so nothing here may assume one. Smallest
  frames: ~301 px at a 390 px viewport, ~241 px at 320 px (`.hero-inner` padding 20 px each side).
- The field's ripple runs 250 → 1350 ms (`lib/field/config.ts:131–132`). Its edge trace grows
  edges one after another in list order (`lib/field/changes.ts:405–413`) and rides a lit point at
  1.5 × the lit-node sprite on the tip while `drawn < 0.999` (`components/HeroField.tsx:433–436`;
  sprite in `renderGlow`, `:162–181`). None of this is touched.

## The stroke choice — keep `non-scaling-stroke`, trace through a user-space mask

Spec §Open questions leaves (a) keep `vector-effect: non-scaling-stroke` vs (b) drop it. **This plan
keeps it (a)** — the line stays 1.4 px at every viewport, so the frame at rest is today's and no
owner sign-off is needed. (b) would thin the line to ~1.17 px on tablet and ~0.9 px on a phone.

The spec's literal (a) — a per-breakpoint dash length in CSS px — does not work as written, because
the frame width is fluid inside every breakpoint (see Starting point). So the dash moves off the
visible line:

- **The visible outline is never dashed.** It is the stroke-only polygon with today's gradient,
  1.4 width, `non-scaling-stroke` and miter join, unchanged.
- **The outline is revealed through an SVG `<mask>`** whose content is one stroke-only polygon on
  the same points, white, **without** `non-scaling-stroke`, `stroke-width: 8` (viewBox units),
  `stroke-linecap: round`, `stroke-linejoin: round`. The mask content is in the outline's user
  space (default `maskContentUnits`), so its dash is in viewBox units and one value is right at
  every size: dash `1440 1440`, offset animated `1440 → 0` (the outline is 3 × 480.007 ≈ 1440.02;
  the round caps close the 0.02 gap).
- **Why width 8 and no less.** The mask band must cover the visible line everywhere, including the
  60° miter tips, which reach 1.4 px (screen) out from each vertex (0.7 / sin 30°), plus ~0.5 px of
  anti-aliasing. The round join/cap puts a disc of radius 4 units (= 4 × frame/480 px) on each
  vertex: 2.5 px at a 301 px frame, 2.0 px at 241 px, 4 px at 480 px — always ≥ 1.9 px. A width of
  6 would give 1.9 px at 301 px and 1.5 px at 241 px and clip the miter tips on phones, so **the
  mask width is not lowered below 8**.
- **The rest state carries no dash.** The base rule of the mask polygon has no
  `stroke-dasharray`; the dash lives in both the `from` and `to` of the trace keyframe, and the
  animation uses fill-mode `backwards` (not `both`). So after the trace — and under reduced motion,
  where the animation is `none` — the mask is the full, undashed band and reveals the whole
  outline, joins included. The base rule still holds the final state, as the house timing model
  requires.
- **No apex dot during the delay.** The keyframe's `from` also sets `visibility: hidden`
  (discrete: visible for any progress > 0), so the zero-length dash end at the apex does not paint
  a round cap during the backwards-filled delay.
- **Mask lead.** Mid-trace, the round cap reveals up to 4 units of line ahead of the dash end, i.e.
  ahead of the tip's centre; it sits inside the tip's 8.4-unit glow. Accepted — do not trade it for
  a narrower mask (see above).
- **Fallback, still (a):** if the animated mask does not repaint in Safari, drop the mask and dash
  the visible outline itself: `container-type: inline-size` on `.hero-img`, and on the outline a
  keyframe with `stroke-dasharray: 300cqw 300cqw` in `from` and `to`, `stroke-dashoffset: 300cqw →
  0`, fill-mode `backwards`, plus `visibility: hidden` in `from`. Under `non-scaling-stroke` the
  dash is measured in screen px and the outline is exactly 3 × the box width. Fill-mode
  `backwards` matters more here: a dashed closed polygon loses its join at the apex, so the dash
  must be gone at rest. `.hero-img`'s width comes from its flex basis, never its content, and it
  has only absolute children, so inline-size containment changes no layout; `HeroField` measures
  it with the same box. If the fallback lands, the mask, `#frame-trace` and `.hero-frame-trace` do
  not ship.
- **Only if both fail in Safari** is (b) back on the table. That is an owner decision (the line
  thins on tablet/phone): stop the card, commit nothing that changes the stroke, and report it.

## Changes by area

**Frame SVG** — `components/Hero.tsx:17–37` (commit 1)
- `viewBox="0 0 480 415.7"`, `preserveAspectRatio` removed (default `xMidYMid meet`; the box's
  aspect is the viewBox's, so nothing letterboxes beyond sub-pixel rounding). Points
  `240,0 480,415.7 0,415.7`. Outline length 1440.
- In `<defs>`, next to `#frame-stroke`: `<mask id="frame-trace" maskUnits="userSpaceOnUse" x="-20"
  y="-20" width="520" height="455.7">` holding the trace polygon (class `hero-frame-trace`;
  `fill="none"`, `stroke="#fff"`, `strokeWidth="8"`, `strokeLinecap="round"`,
  `strokeLinejoin="round"`). The region holds the round caps (4 units) and the outline's miters.
- Children in paint order: fill polygon (class `hero-frame-fill`; `fill="var(--color-bg)"`,
  `fillOpacity="0.88"`, `stroke="none"`); outline polygon (class `hero-frame-line`; `fill="none"`,
  `stroke="url(#frame-stroke)"`, `strokeWidth="1.4"`, `vectorEffect="non-scaling-stroke"`,
  `mask="url(#frame-trace)"`); tip group (class `hero-frame-tip`, commit 2).
- The `objectBoundingBox` gradient maps the unit square onto the outline polygon's box, which lands
  on the same screen rectangle as today's 100 × 100 polygon — same colours along the line.

**Intro CSS** — `components/Hero.module.css`
- Commit 1, on `.hero`, replacing `--intro-frame-*` (`:7–8`) (starting values, tuned by eye):
  `--intro-trace-delay: 300ms`, `--intro-trace-duration: 900ms`, `--intro-trace-ease: linear`
  (equal speed on each edge, as the field's list-order trace), `--intro-fill-delay: 1200ms`,
  `--intro-fill-duration: 450ms`. `--intro-portrait-*` stays until commit 3 — the portrait wipe
  still uses it.
- Commit 3, replacing `--intro-portrait-*` (`:9–10`): `--intro-portrait-fade-delay: 1550ms`,
  `--intro-portrait-fade-duration: 600ms`.
- Resulting timeline: trace 300 → 1200 ms (closes before the ripple ends at 1350); fill and glow
  1200 → 1650; portrait 1550 → 2150 (in by ~2150, as today); text unchanged from 2000; intro ends
  ~2950 ms.
- `.hero-frame-trace` (mask content, commit 1): no dash in the base rule; `animation:
  hero-frame-trace var(--intro-trace-duration) var(--intro-trace-ease) var(--intro-trace-delay)
  backwards`; `@keyframes hero-frame-trace { from { stroke-dasharray: 1440 1440;
  stroke-dashoffset: 1440; visibility: hidden; } to { stroke-dasharray: 1440 1440;
  stroke-dashoffset: 0; } }`.
- `.hero-frame-fill` (commit 1): `animation: hero-fade var(--intro-fill-duration) var(--intro-ease)
  var(--intro-fill-delay) both`; `@keyframes hero-fade { from { opacity: 0; } }` (reused by the
  portrait in commit 3).
- `.hero-frame` (commit 1): `animation` becomes `hero-frame-glow var(--intro-fill-duration)
  var(--intro-ease) var(--intro-fill-delay) both`; `@keyframes hero-frame-glow { from { filter:
  drop-shadow(0 0 18px transparent); } }` (same function list as the base `filter` at `:101`, so
  it interpolates). `transform-origin` (`:102`) removed; `hero-frame-in` keyframes deleted.
- `.hero-frame-tip` (commit 2): base `opacity: 0`; `transform-box: view-box; transform-origin: 0 0`
  (the SVG defaults, set explicitly so the offset anchor is the group's own origin);
  `offset-path: path("M240,0 L480,415.7 L0,415.7 Z")`, `offset-rotate: 0deg`,
  `offset-distance: 100%`; two animations on the trace's delay and duration, fill-mode `both` —
  `hero-frame-tip-move` (`from { offset-distance: 0%; }`, `var(--intro-trace-ease)`) and
  `hero-frame-tip-glint` (linear; `0% { opacity: 0; } 2% { opacity: 1; } 90% { opacity: 1; }
  100% { opacity: 0; }`). The point and the line share one timeline.
- `.hero-portrait img` (commit 3): its `animation` only → `hero-fade
  var(--intro-portrait-fade-duration) var(--intro-ease) var(--intro-portrait-fade-delay) both`;
  `hero-portrait-in` keyframes deleted; `width` / `left` / `top` untouched (owner's).
- Reduced-motion list (`:195–205`), per commit: commit 1 adds `.hero-frame-trace` and
  `.hero-frame-fill` (`.hero-frame`, carrying the glow, is already listed); commit 2 adds
  `.hero-frame-tip`; commit 3 adds nothing (`.hero-portrait img` is already listed). At rest:
  undashed mask (closed outline), fill and glow in, tip at `opacity: 0`, portrait visible.

**Tip markup** — `components/Hero.tsx` (commit 2)
- `<g className={styles["hero-frame-tip"]}>` after the outline, centred on its own origin: a glow
  `<circle r="8.4" fill="url(#frame-tip-glow)">` (radial gradient in `<defs>`: `#4fcdcd` at 0,
  transparent at 1) and a core `<circle r="2.4" fill="#65d2d2">` — radius 2.4 and glow 6 per the
  spec (`FIELD.litNode` × 1.5, `lib/field/config.ts:96`), in viewBox units, so they scale with the
  frame as the field's do.
- `offset-path` on an SVG element resolves in the view-box reference box (origin = viewBox 0,0),
  so the path's coordinates are the polygon's. Check that the point sits on the apex at the start
  and on each corner. If Chrome or Safari misplaces or ignores it, fall back to SMIL
  `<animateMotion path="M240,0 L480,415.7 L0,415.7 Z" begin="0.3s" dur="0.9s" fill="freeze">` on
  the group, keeping the CSS glint (and dropping the CSS `offset-*`); note the clock drift in the
  commit body. SMIL ignores `animation: none`, but the glint's `animation: none` leaves the tip at
  `opacity: 0`, so reduced motion still shows no tip.

## Risks

- **Safari** — animated mask content and `offset-path` on SVG are the two uncertain pieces. Each has
  an in-(a) fallback above. Only a double failure of the trace reaches the owner.
- **Clock skew** — CSS delays count from first style, the ripple from navigation start; on a real
  load the trace lags its numbers by time-to-first-paint. Accepted in the spec.
- **Mask width vs. miter** — the mask band is what keeps the 60° miter tips visible; at 8 units it
  covers them down to a ~228 px frame (below any supported phone). Tuning the mask lead by narrowing
  the mask is off the table.

## Verification

As 0002/0003: no test runner; gate is `npm run lint` + `npm run build` (after `npm ci` if
`node_modules` is missing), run after **every** commit, not only at the end of the card. Serve
with `python3 -m http.server 8001 -d out`; capture 1440×900, 900×1100 and 390×844 with headless
Chrome (narrow sizes inside an iframe of the exact width, as in 0001):

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
  --window-size=1440,900 --virtual-time-budget=<ms> --screenshot=<file>.png http://localhost:8001/
```

Add `--force-prefers-reduced-motion` for reduced motion and `--blink-settings=scriptEnabled=false`
for no-JS. **Reference for "same at rest":** before the first commit, capture the current page at
the three sizes with `--force-prefers-reduced-motion` into the scratchpad.

Expected intro captures (with the starting timings):

| ms | Expected |
|---|---|
| 250 | no frame line, no tip, no fill, no glow; ripple just starting |
| 600 | line on the right edge (~1/3 of the outline), round lit point on its tip; lattice visible inside the triangle |
| 900 | line past the right corner, on the bottom edge (~2/3), tip on it |
| 1100 | line on the left edge (~89 %), tip still fully lit |
| 1450 | triangle closed, no tip; fill and glow part-way in over the lattice |
| 1900 | fill and glow in; portrait part-way faded in (no top-to-bottom wipe); text rising |
| 3200 | final state |

**Safari:** open `http://localhost:8001/` in Safari (`open -a Safari …`) at a desktop and a narrow
window; if Safari can be driven (`safaridriver`, or `screencapture` after a reload), confirm the
trace draws and closes and the tip rides the corners. If it cannot be driven from the session,
record "Safari pass by eye" as an owner check in the 0004 row — it does not block the card.

## Sessions  ·  one card = one fresh session; a card may land several commits; git carries state between cards

One card: every commit edits the same two files (`components/Hero.tsx`,
`components/Hero.module.css`), they share one warmup, and the portrait fade alone is far below a
session's floor. The browser unknowns (mask, `offset-path`) are the card's first work, so a
failure stops it before the rest.

### Card 1 — trace the frame, ride the tip, fade the portrait
precondition:  none — first session. `6913fac` (plan written) on the branch; `components/Hero.tsx` and `components/Hero.module.css` as described in this plan §Starting point
read for why:  `docs/specs/0004-hero-frame-trace-intro.md` §Shape — only if you need the why; this plan §The stroke choice is the how, read it
commits:
  1. feat: trace the hero frame edge by edge
     touches: components/Hero.tsx, components/Hero.module.css  (only these)
     do:      - first save the reduced-motion reference captures (this plan §Verification)
              - `Hero.tsx:17–37`: real-aspect viewBox, `#frame-trace` mask (width 8, round cap and join), fill polygon + masked outline polygon (this plan §Frame SVG)
              - `Hero.module.css`: `--intro-trace-*` / `--intro-fill-*` on `.hero` replacing `:7–8` only (`--intro-portrait-*` stays); `.hero-frame-trace` (dash only in keyframes, fill-mode `backwards`), `.hero-frame-fill`, glow keyframe on `.hero-frame` (`:101–103`, `transform-origin` dropped); `hero-frame-in` deleted; `.hero-frame-trace`, `.hero-frame-fill` added to the reduced-motion list
              - check the trace in Safari now (this plan §Verification); if the mask does not animate, use the `cqw` fallback (this plan §The stroke choice); if that fails too, stop — owner decision
              - `npm run lint` + `npm run build` exit 0; a 3200 ms capture and a reduced-motion capture at 390×844 match the reference (closed triangle, apex and corner joins intact)
  2. feat: ride a lit point on the frame trace
     touches: components/Hero.tsx, components/Hero.module.css
     do:      - `<g class="hero-frame-tip">` with glow + core circles and `#frame-tip-glow` gradient (this plan §Tip markup)
              - `transform-box` / `transform-origin` / `offset-path` + `hero-frame-tip-move` / `hero-frame-tip-glint` on the trace's timeline; base `opacity: 0`; `.hero-frame-tip` added to the reduced-motion list
              - confirm in Chrome captures (600 / 900 / 1100 ms) the point sits on the line's tip, and on the apex/corners at the right moments; check Safari; SMIL fallback if either misplaces it
              - `npm run lint` + `npm run build` exit 0
  3. feat: fade the portrait in after the frame closes
     touches: components/Hero.module.css
     do:      - `--intro-portrait-*` (`:9–10`) → `--intro-portrait-fade-*`; `.hero-portrait img` `animation` (`:120`) → `hero-fade`; `hero-portrait-in` (`:177–185`) deleted
              - `npm run lint` + `npm run build` exit 0
  4. docs(specs): record 0004 landed
     touches: docs/specs/README.md, docs/specs/0004-hero-frame-trace-intro.md, docs/plans/0004-hero-frame-trace-intro.md
     do:      - README 0004 row evidence → landed `<first>`..`<last>`, awaiting the owner's review by eye; status cell and frontmatter `status:` stay `planned` (as 0003's landing commit `56554ce` did); note the stroke route taken (mask or `cqw`), the tip route (`offset-path` or SMIL) and whether Safari was checked or is an owner check
              - spec: **Status:** and **Build doc:** lines → landed `<first>`..`<last>`, awaiting the owner's review by eye
              - plan: add an **Executed:** line under the **Hardened:** line, as 0002's (`docs/plans/0002-hero-field-animation.md:14`)
done when:     `npm run lint` and `npm run build` exit 0 after each commit; at 1440×900, 900×1100 and 390×844, `--virtual-time-budget` captures at 250 / 600 / 900 / 1100 / 1450 / 1900 / 3200 ms match this plan §Verification's table; the 3200 ms capture matches the reduced-motion reference by eye at each size (same triangle, same 1.4 px line, apex and corner joins intact, corners on the box, glow, portrait) — no stretch, no thinner line. With `--blink-settings=scriptEnabled=false` the same sequence runs (the field aside); with `--force-prefers-reduced-motion` the 250 ms capture is already the final state with no tip. Safari checked per this plan §Verification or recorded as an owner check; all commits landed
