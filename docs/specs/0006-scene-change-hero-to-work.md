---
number: "0006"
type: spec
slug: scene-change-hero-to-work
title: Pinned scene change from the hero to the work section, triangle art behind the work, one card at a time
status: planned
created: 2026-10-22
headline: Visitors now see the hero play its intro backwards and the work section build itself in the same place, over its own traced triangles, with one project card at a time.
tags: [spec, status/planned]
---

# 0006 — Pinned scene change from the hero to the work section

**Status:** planned — spec only. Today the hero and the work section are two stacked sections: the
hero's field dissolves and its frame un-traces as it scrolls up (`--hero-leave`, scroll-scrubbed),
and the work section has its own grown `TriangleField` (`components/Work.tsx:16`) behind a
carousel that shows a card and a half (`components/Work.module.css`, `.card` flex-basis).
**Build doc:** `docs/plans/0006-scene-change-hero-to-work.md` (not written yet — `/planc`).

## Why

The owner asked (2026-10-22):

> The elements of the first section should disappear as they entered, and then show the second
> section animating the elements. It should look like the second section appears on the same
> place as the first. I want to remove the field from the second section BG, instead it should
> have the triangle forms similar to the placeholder and the shade color. On the carousel it
> should show only one card at a time.

Today the two sections slide past each other: the hero's text and portrait scroll away while
the field dissolves, and the work section arrives from below. The owner wants a **scene change**
instead — one screen that empties and then fills again.

Decisions taken with the owner (2026-10-22):

- **Pinned + triggered.** The screen holds still; crossing a scroll threshold plays the change as
  one timed animation at its own speed. Scrolling back past it plays it in reverse. (This replaces
  0005's scroll-*scrubbed* handoff.)
- **The nav stays fixed** over both scenes and does not play backwards.
- **The work triangles are traced in, then rest** — the portrait frame's language: outline drawn
  edge by edge, then fill and shade fade in.
- **One card at a time, split on desktop:** picture on one side, text on the other; stacked on
  phone.

## Current state the change builds on

- **`--hero-leave` is already the hero's exit contract.** `TriangleField` writes it (0..1) on the
  section, and `data-leaving` while it is above 0 (`components/TriangleField.tsx:509–516`).
  `Hero.module.css` derives `--leave-portrait`, `--leave-fill`, `--leave-trace` from it and plays
  the portrait, fill/glow and outline backwards. Only its *source* changes in this spec.
- **The field's dissolve reads one number.** `draw()` renders the hero at
  `presenceTime(cfg, 1 − leave)` in `fromBottom` order (`TriangleField.tsx:638–646`), and drops
  live changes while `leave > 0` (:736). Feeding `leave` from a timed tween instead of
  `leaveProgress()` (:496) needs no new drawing code.
- **Intro keyframes set only `from`.** Every hero intro animation ends on its base rule, so a base
  rule that reads a variable (`opacity: calc(1 - var(--leave-portrait))`) stays live after the
  intro. The hero text and nav links (`.hero-hello`, `h1`, `.hero-sub`, `.hero-links a`) use the
  same `hero-rise` pattern and can take the same treatment.
- **The work field is the only user of the grown field.** `handoff="enter"`, the `anchor` prop,
  `lib/field/grow.ts`, `FIELD.grow`, `FIELD.handoff.enterStartAt` / `enterWholeAt`, the `grown`
  branch in `place()` (:142–160) and the window scroll listener (:776) exist only for it.
- **The carousel is native scroll snap** with prev/next that scroll by one card
  (`components/WorkCarousel.tsx:37–47`). It already works with one card per view.
- **Placeholder art** (`public/work/placeholder-*.svg`): `--color-bg` base, one radial "shade" in
  a brand colour, three overlapping outlined equilateral triangles with a gradient fill at
  rising opacity (0.10 / 0.18 / 0.26).

## Shape — the decisions

- **A stage pins both scenes.** A new `Stage` wraps `<Hero />` and `<Work />` in `app/page.tsx`: a
  tall outer block (100vh of scene + a scroll track, start 100vh) with a `position: sticky`
  100vh inner that holds both sections stacked in the same place (work absolutely over the hero).
  Why: "the second section appears on the same place as the first" means one screen, so the page
  must stop moving while the change plays; sticky does that with no scroll capture.
- **One scene variable, timed, not scrolled.** The stage's small client component sets
  `data-scene="hero" | "work"` from the scroll position: past a threshold in the track (start: 25 %)
  it is `work`, back above it (with a small gap so it does not flicker) it is `hero`. A rAF tween
  moves `--scene` (0..1) toward the target over a fixed duration (start: 2.4 s). Reversing
  mid-way retargets the tween from where it is, so the change never jumps. Why a tween and not
  CSS transitions: transitions replay the same delays in both directions, and "disappear as they
  entered" needs the order reversed going out.
- **Two halves of one timeline.** `--hero-leave = clamp(--scene / 0.55)`; `--work-enter =
  clamp((--scene − 0.45) / 0.55)`. The small overlap lets the work's first triangle start as the
  hero's field finishes. Every element reads its own sub-span of its half, as `--leave-*` already
  does.
- **The hero leaves in the reverse of its intro order.** The intro is field → frame trace → fill
  → portrait → text. Leaving is text (sub, h1, hello, each a step apart) → portrait → fill/glow →
  outline un-trace → field dissolve. The text gets `--leave-text-*` spans, each fading and sinking
  12 px — `hero-rise` backwards. The existing portrait/fill/trace spans are re-timed to follow the
  text.
- **`TriangleField` reads the scene, not the scroll.** The hero's `leave` comes from `--hero-leave`
  set by the stage (read once per frame from the section's style), replacing `leaveProgress()`.
  `shareLeave()` and `data-leaving` move to the stage, which owns the number. Live changes drop
  while `leave > 0` and resume at 0, as today.
- **The nav leaves the hero.** It moves into its own `components/Nav.tsx`, `position: fixed` at
  the stage level, above both scenes, keeping the `hero-rise` load animation on its links. The
  field still needs the nav bottom for its nav band, so `TriangleField` finds `[data-field="nav"]`
  in the document, not only in its section.
- **The work field is removed, with everything only it used.** `Work.tsx` stops mounting
  `TriangleField`; `handoff="enter"`, `anchor`, `lib/field/grow.ts`, `FIELD.grow`, the enter
  progress, the scroll listener and the `grown` branch in `place()` go. `TriangleField` keeps one
  mode; the `handoff` prop goes too. Why: dead code in a 821-line canvas file is where the next
  tuning pass goes wrong.
- **The work background is triangle art, in SVG.** An inline SVG (`components/WorkArt.tsx`) in the
  placeholder's language: one radial shade in `#33969b` / accent, and a small cluster of
  overlapping outlined equilateral triangles (gradient fill at 0.10 / 0.18 / 0.26), placed behind
  and beside the card so the glass has something to blur. Each triangle uses the frame's mask
  trace technique (`Hero.tsx:33–49`, `.hero-frame-trace`): outline drawn edge by edge with a lit
  tip, then its fill fades in; the shade fades in under them first. Driven by `--work-enter`
  sub-spans, so it reverses too. Static after that. Why SVG and not the canvas: a few still
  triangles need no engine, and the frame's trace is already the tested SVG route.
- **The work content arrives after its art.** Title then card rise in (`hero-rise` language) on
  the last part of `--work-enter`.
- **One card per view.** `.card` takes the full row (`flex-basis: 100%`); the peek and its
  `calc(... / 1.5)` go. From 900 px up the card is a two-column grid: picture left (16:10), title /
  description / tags / link right. Below 900 px it stacks as today. Prev/next keep scrolling by
  one card — the existing `step()` already measures the card width.
- **Hash links and focus land in the right scene.** The `#work` id sits on an anchor at the end of
  the track, so the nav's Work link scrolls past the threshold and plays the change. Focus moving
  into the work section (keyboard Tab) while the scene is `hero` scrolls to that anchor. The
  inactive scene gets `pointer-events: none` and `aria-hidden`; the work section is not `inert`
  so Tab can still reach it.
- **The pin is opt-in by JS and motion.** The stacked layout is the base CSS; the stage adds
  `data-staged` when mounted and motion is allowed, and only then does the sticky pin apply.
  Without JS, or with `prefers-reduced-motion: reduce`, the two sections stack as today, both at
  rest, and the hero intro still runs without JS.

## The new part

- **The stage and its scene tween** (`components/Stage.tsx` + CSS module): threshold with a gap,
  the rAF tween with mid-way reversal, writing `--scene`, `--hero-leave`, `--work-enter`,
  `data-scene`, `data-leaving`; focus/hash handling. This is the one new piece of motion logic.
- **The work triangle art** (`components/WorkArt.tsx`): the mask trace applied to several
  triangles with staggered sub-spans.

## Reused, not rebuilt

- The `--hero-leave` → `--leave-*` CSS pattern and the un-trace with its lit tip
  (`Hero.module.css`, `.hero[data-leaving] .hero-frame-trace`, `.hero-frame-untip`).
- `renderTrace()` in `fromBottom` order at `presenceTime(cfg, 1 − leave)` — the field's dissolve.
- The frame's mask trace (`Hero.tsx:33–49`, `@keyframes hero-frame-trace`) for the work triangles.
- `hero-rise` for the text going out and the work content coming in.
- `WorkCarousel`'s scroll snap and prev/next, glass styles, `lib/work.ts` data — unchanged.

## Out of scope

- **Scroll capture** (hijacking wheel/touch to snap between scenes) — sticky + threshold gives
  the pin without taking scroll away from the visitor. See Open questions.
- **More scenes** (About) — the stage is written for two; a third earns a general timeline later.
- **Carousel dots or a position counter** — prev/next disable at the ends; add if the owner misses
  a cue now that the peek is gone.
- **Changing the hero load intro** — its timings and order stay as 0002–0004 set them.
- **Real project content** — still placeholders (0005).

## Open questions

- **Track length, threshold, tween duration and the half overlap** — starting values above, tuned
  by eye with the owner.
- **Fast scrolling past the track.** If the visitor scrolls through the whole track before the
  tween ends, the stage unpins with the change mid-way. Options: a longer track; or
  `scroll-snap-type: y proximity` on the root with snap points at the stage top and the track end.
  Start with the longer track; try snap if it reads badly.
- **Work content taller than a viewport.** The work scene must fit 100svh (one split card does at
  the three check sizes). On short landscape phones it may not; the fallback is to drop the pin
  below a height (start: `max-height: 560px`) and stack.
- **Which triangle layout behind the card** — the art's exact cluster and position are placed by
  eye; the placeholder SVGs are the reference.

## Done when

- `npm run lint` and `npm run build` pass.
- At 1440×900, 900×1100 and 390×844: the hero load intro is unchanged; scrolling past the
  threshold holds the screen still while the hero text, portrait, fill, outline and field leave in
  that order, then the work triangles trace in, then the title and the card rise in, in the same
  place; scrolling back plays it in reverse; reversing mid-way does not jump.
- The nav stays on screen and clickable through both scenes; its Work link plays the change.
- The work section has no canvas; `lib/field/grow.ts` and the `enter` mode are gone.
- The carousel shows exactly one card; on desktop it is split picture | text; prev/next move one
  card and disable at the ends.
- With reduced motion, or JS disabled, the sections stack with no pin and everything at rest
  (hero intro still runs without JS).

## Commit breakdown — a sketch, not the plan

`/planc` turns this into session cards.

1. `refactor: drop the work section's grown field` — remove the `enter` mode, `anchor`, `grow.ts`,
   `FIELD.grow` and enter config; `Work.tsx` mounts no field.
2. `refactor: move the nav out of the hero` — `Nav.tsx`, fixed; field finds the nav in the document.
3. `feat: one project card at a time, split on desktop` — card width, two-column grid ≥ 900 px.
4. `feat: pin the hero and work in one stage with a timed scene change` — `Stage`, threshold,
   tween, `--scene` / `--hero-leave` / `--work-enter`; field reads `--hero-leave`; work content
   rises in; focus/hash; no-JS and reduced-motion stack.
5. `feat: play the hero text out in reverse of its intro` — `--leave-text-*`, re-timed
   portrait/fill/trace spans.
6. `feat: trace triangle art in behind the work card` — `WorkArt.tsx`, shade + traced triangles on
   `--work-enter`.
