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

**Spec:** `docs/specs/0004-hero-frame-trace-intro.md` — the decisions and their why. This file is
only how they land.

## Goal

On load, the frame's outline is drawn apex → right corner → left corner → apex with a lit point
riding its tip, while the field's ripple spreads. Once the triangle closes, the frame's fill and
glow fade in over the lattice inside it, then the portrait fades in (opacity, no wipe), then the
text rises as today. CSS and SVG only; the frame looks exactly as it does today at rest, at every
breakpoint.

## Starting point

Checked against `a9ba90a` (the spec is hardened against `8f802b7`; no code changed since).

- `components/Hero.tsx:17–37` — one SVG, `viewBox="0 0 100 100"` + `preserveAspectRatio="none"`,
  one `<polygon points="50,0 100,100 0,100">` carrying both the fill (`var(--color-bg)`,
  `fillOpacity="0.88"`) and the stroke (`url(#frame-stroke)`, `strokeWidth="1.4"`,
  `vectorEffect="non-scaling-stroke"`). The gradient `#frame-stroke` (`:24–27`) uses the default
  `objectBoundingBox` units.
- `components/Hero.module.css` — `--intro-*` on `.hero` (`:7–14`); `.hero-frame` (`:95–104`) holds
  the `drop-shadow` glow (`:101`), `transform-origin: 50% 0` (`:102`) and the `hero-frame-in`
  animation (`:103`); `.hero-portrait img` holds `hero-portrait-in` (`:120`); keyframes
  `hero-frame-in` (`:170–175`), `hero-portrait-in` (`:177–185`), `hero-rise` (`:187–192`);
  reduced-motion list (`:195–205`).
- `.hero-img` is `aspect-ratio: 480 / 415.7` at every size (`Hero.module.css:83`); its width is
  fluid — `--img-flex` / `--img-max` in `app/globals.css:112–151` (`0 1 480px` capped 480 px;
  `0 1 42%` capped 400 px; `1 1 100%` capped 86 %). There is **no fixed frame width per
  breakpoint**, so nothing here may assume one.
- The field's ripple runs 250 → 1350 ms (`lib/field/config.ts:131–132`). Its edge trace grows
  edges one after another in list order (`lib/field/changes.ts:405–413`) and rides a lit point at
  1.5 × `FIELD.litNode` on the tip (`components/HeroField.tsx:431–436`). None of this is touched.

## The stroke choice — keep `non-scaling-stroke`, trace through a user-space mask

Spec §Open questions leaves (a) keep `vector-effect: non-scaling-stroke` vs (b) drop it. **This plan
keeps it (a)** — the line stays 1.4 px at every viewport, so the frame at rest is pixel-for-pixel
today's and no owner sign-off is needed. (b) would thin the line to ~1.17 px on tablet and ~0.9 px
on a phone.

The spec's literal (a) — a per-breakpoint dash length in CSS px — does not work as written, because
the frame width is fluid inside every breakpoint (see Starting point). So the dash moves off the
visible line:

- **The visible outline is not dashed at all.** It is the stroke-only polygon with today's
  gradient, 1.4 width and `non-scaling-stroke`, unchanged.
- **The outline is revealed through an SVG `<mask>`** whose content is one stroke-only polygon on
  the same points, white, **without** `non-scaling-stroke`, `stroke-width: 8` (viewBox units),
  `stroke-linecap` and `stroke-linejoin: round`. Its dash is in viewBox units, so one value is right
  at every size: `stroke-dasharray: 1440 1440`, `stroke-dashoffset` animated `1440 → 0`. The
  round caps at the apex cover the outline's 60° miter once the trace closes; mid-trace they lead
  the line by 4 units — under the tip's glow.
- The mask content also gets `visibility: hidden` in the keyframe's `from` (discrete; visible for
  any progress > 0), so its zero-length round cap does not show a dot of outline at the apex during
  the delay.
- **Fallback, still (a):** if the animated mask does not repaint in Safari, dash the visible
  outline itself with `stroke-dasharray: 300cqw 300cqw` / `stroke-dashoffset: 300cqw → 0`, with
  `container-type: inline-size` on `.hero-img` (under `non-scaling-stroke` the dash is measured in
  screen px, and the outline is exactly 3 × the box width). `.hero-img` has only absolute children,
  so the containment changes no layout; `HeroField` measures it the same way.
- **Only if both fail in Safari** is (b) back on the table. That is an owner decision (the line
  thins on tablet/phone): stop the card, commit nothing that changes the stroke, and report it.

## Changes by area

**Frame SVG** — `components/Hero.tsx:17–37`
- `viewBox="0 0 480 415.7"`, no `preserveAspectRatio` (default `xMidYMid meet`; the box's aspect
  is the viewBox's, so nothing letterboxes). Points `240,0 480,415.7 0,415.7`. Outline length
  1440.
- In `<defs>`, next to `#frame-stroke`: `<mask id="frame-trace" maskUnits="userSpaceOnUse" x="-20"
  y="-20" width="520" height="455.7">` holding the trace polygon (class `hero-frame-trace`). The
  explicit mask region keeps the round caps and the outline's miter inside it.
- Children in paint order: fill polygon (class `hero-frame-fill`; `fill="var(--color-bg)"`,
  `fillOpacity="0.88"`, `stroke="none"`); outline polygon (class `hero-frame-line`; `fill="none"`,
  `stroke="url(#frame-stroke)"`, `strokeWidth="1.4"`, `vectorEffect="non-scaling-stroke"`,
  `mask="url(#frame-trace)"`); tip group (class `hero-frame-tip`, added in commit 2).
- The `objectBoundingBox` gradient sits on the outline polygon's own box, which is the same triangle
  as today — same colours along the line.

**Intro CSS** — `components/Hero.module.css`
- On `.hero`, replacing `--intro-frame-*` and `--intro-portrait-*` (starting values, tuned by eye):
  `--intro-trace-delay: 300ms`, `--intro-trace-duration: 900ms`, `--intro-trace-ease: linear`
  (equal speed on each edge, as the field's list-order trace), `--intro-fill-delay: 1200ms`,
  `--intro-fill-duration: 450ms`, `--intro-portrait-fade-delay: 1550ms`,
  `--intro-portrait-fade-duration: 600ms`. The trace closes at ~1200 ms, before the ripple ends;
  the portrait is in by ~2150 ms, as today; text unchanged from 2000 ms; intro ends ~2950 ms.
- `.hero-frame-trace` (mask content): base `stroke-dasharray: 1440 1440; stroke-dashoffset: 0`;
  `animation: hero-frame-trace var(--intro-trace-duration) var(--intro-trace-ease)
  var(--intro-trace-delay) both`; `@keyframes hero-frame-trace { from { stroke-dashoffset: 1440;
  visibility: hidden; } }`.
- `.hero-frame-fill`: `animation: hero-fade …fill… both`; `@keyframes hero-fade { from { opacity:
  0; } }` (shared with the portrait in commit 3).
- `.hero-frame`: `animation` becomes `hero-frame-glow` on the fill's delay/duration;
  `@keyframes hero-frame-glow { from { filter: drop-shadow(0 0 18px transparent); } }` (same
  function list as the base `filter` at `:101`, so it interpolates). `transform-origin` removed.
  `hero-frame-in` keyframes deleted.
- `.hero-frame-tip` (commit 2): base `opacity: 0`; `offset-path: path("M240,0 L480,415.7
  L0,415.7 Z")`, `offset-rotate: 0deg`, `offset-distance: 100%`; two animations on the trace's
  delay and duration — `hero-frame-tip-move` (`from { offset-distance: 0%; }`, the trace's ease)
  and `hero-frame-tip-glint` (linear; `0% { opacity: 0; } 2% { opacity: 1; } 90% { opacity: 1; }
  100% { opacity: 0; }`). Same delay + duration + timing function as the trace, so the point and
  the line share one timeline.
- `.hero-portrait img` (commit 3): its `animation` only → `hero-fade
  var(--intro-portrait-fade-duration) var(--intro-ease) var(--intro-portrait-fade-delay) both`;
  `hero-portrait-in` keyframes deleted; `width` / `left` / `top` untouched (owner's).
- Reduced-motion list (`:195–205`): add `.hero-frame-trace`, `.hero-frame-fill` in commit 1 and
  `.hero-frame-tip` in commit 2 (`.hero-frame`, `.hero-portrait img` are already there). At rest:
  dashoffset 0 (closed), fill and glow in, tip at `opacity: 0`.

**Tip markup** — `components/Hero.tsx` (commit 2)
- `<g className={styles["hero-frame-tip"]}>` after the outline, centred on its own origin: a glow
  `<circle r="8.4" fill="url(#frame-tip-glow)">` (radial gradient in `<defs>`: `#4fcdcd` at 0,
  transparent at 1 — the field's glow sprite, radius 2.4 + 6) and a core `<circle r="2.4"
  fill="#65d2d2">`. Values copied from `FIELD.litNode` × 1.5 (`lib/field/config.ts`), viewBox
  units — they scale with the frame as the field's do.
- `offset-path` coordinates on an SVG element resolve in its user space; check that the point
  sits on the apex at the start and on each corner (not offset by the group's box). If Safari
  misplaces it, fall back to SMIL `<animateMotion>` with `begin` and `dur` matching the CSS values
  and note the clock drift in the commit body.

## Risks

- **Safari** — animated mask content and `offset-path` on SVG are the two uncertain pieces. Each has
  an in-(a) fallback above. Only a double failure of the trace reaches the owner.
- **Clock skew** — CSS delays count from first style, the ripple from navigation start; on a real
  load the trace lags its numbers by time-to-first-paint. Accepted in the spec.
- **Mask lead** — the round mask cap reveals ~4 viewBox units (≤ 4 px) of line ahead of the tip;
  hidden under the 8.4-unit glow. If it shows at a corner, lower the mask width to 6.

## Verification

As 0002/0003: no test runner; gate is `npm run lint` + `npm run build` (after `npm ci` if
`node_modules` is missing). Serve with `python3 -m http.server 8001 -d out`; capture 1440×900,
900×1100 and 390×844 with headless Chrome (narrow sizes inside an iframe of the exact width, as in
0001):

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
  --window-size=1440,900 --virtual-time-budget=<ms> --screenshot=<file>.png http://localhost:8001/
```

Add `--force-prefers-reduced-motion` for reduced motion and `--blink-settings=scriptEnabled=false`
for no-JS. **Reference for "same at rest":** before the first commit, capture the current page at
the three sizes with `--force-prefers-reduced-motion` into the scratchpad.

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
precondition:  none — first session. `a9ba90a` (spec hardened) on the branch; `components/Hero.tsx` and `components/Hero.module.css` as described in this plan §Starting point
read for why:  `docs/specs/0004-hero-frame-trace-intro.md` §Shape — only if you need the why; this plan §The stroke choice is the how, read it
commits:
  1. feat: trace the hero frame edge by edge
     touches: components/Hero.tsx, components/Hero.module.css  (only these)
     do:      - first save the reduced-motion reference captures (this plan §Verification)
              - `Hero.tsx:17–37`: real-aspect viewBox, `#frame-trace` mask, fill polygon + masked outline polygon (this plan §Frame SVG)
              - `Hero.module.css`: `--intro-trace-*` / `--intro-fill-*` on `.hero` (`:7–8` replaced); `.hero-frame-trace`, `.hero-frame-fill`, glow keyframe on `.hero-frame` (`:101–103`, `transform-origin` dropped); `hero-frame-in` deleted; `.hero-frame-trace`, `.hero-frame-fill` added to the reduced-motion list. If the mask does not animate in Safari, use the `cqw` fallback (this plan §The stroke choice); if that fails too, stop — owner decision
  2. feat: ride a lit point on the frame trace
     touches: components/Hero.tsx, components/Hero.module.css
     do:      - `<g class="hero-frame-tip">` with glow + core circles and `#frame-tip-glow` gradient (this plan §Tip markup)
              - `offset-path` + `hero-frame-tip-move` / `hero-frame-tip-glint` on the trace's timeline; base `opacity: 0`; added to the reduced-motion list
  3. feat: fade the portrait in after the frame closes
     touches: components/Hero.module.css
     do:      - `.hero-portrait img` `animation` (`:120`) → `hero-fade` on `--intro-portrait-fade-*`; `--intro-portrait-*` (`:9–10`) replaced; `hero-portrait-in` (`:177–185`) deleted
  4. docs(specs): record 0004 landed
     touches: docs/specs/README.md, docs/specs/0004-hero-frame-trace-intro.md, docs/plans/0004-hero-frame-trace-intro.md
     do:      - 0004 row evidence and spec **Status:** → landed `<first>`..`<last>`, awaiting the owner's review by eye (status stays `planned`, as 0003 did); note the stroke route taken (mask or `cqw`) and whether Safari was checked or is an owner check
              - plan: add an **Executed:** line under the title, as 0002's
done when:     `npm run lint` and `npm run build` exit 0; at 1440×900, 900×1100 and 390×844, `--virtual-time-budget` captures at 250 / 600 / 900 / 1150 / 1450 / 1900 / 3200 ms show, in order: no frame line; the line growing apex → right → left with a round lit point on its tip while the ripple spreads and lattice shows inside the triangle; the triangle closed with no tip; fill and glow arriving over the lattice; the portrait fading in (no top-to-bottom wipe); the text in place. The 3200 ms capture matches the reduced-motion reference by eye at each size (same triangle, same 1.4 px line, corners on the box, glow, portrait) — no stretch, no thinner line. With `--blink-settings=scriptEnabled=false` the same sequence runs (the field aside); with `--force-prefers-reduced-motion` the 250 ms capture is already the final state with no tip. Safari checked per this plan §Verification or recorded as an owner check; all commits landed
