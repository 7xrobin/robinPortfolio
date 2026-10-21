---
number: "0005"
type: spec
slug: work-section-carousel
title: Work section with glass project cards, and the hero field handing off to it on scroll
status: planned
created: 2026-10-21
headline: Visitors can now scroll from the hero into a Work section — the hero's triangles dissolve from the top down and a smaller field traces in behind a sideways-scrolling row of glass project cards.
tags: [spec, status/planned]
---

# 0005 — Work section with glass project cards, and the hero field handing off to it on scroll

**Status:** planned — spec only. Today the page is the hero alone (`app/page.tsx` renders
`<Hero />`); there is no section below it, and the nav's only link (`#about`,
`components/Hero.tsx:11`) points at nothing.
**Build doc:** `docs/plans/0005-work-section-carousel.md` (not written yet — `/planc`).

## Why

The portfolio shows who Robin is but not what Robin has built. The owner asked (2026-10-21) for a
work section under the hero:

> It should have a similar bg, but smaller, which when scrolling from here to the portfolio the
> shape 'dissolves and going down to the second section'. The portfolio should have like a glass
> isomorph cards carousel, can be scrolled on the side to show next works, each work has a
> picture, title on top, and below a description, link and tags for technologies used.

Decisions taken with the owner (2026-10-21): the handoff is **scrubbed by scroll**, the smaller
field sits **behind the carousel**, and the first version ships **placeholder projects**.

## Current state the change builds on

- **The field engine is hero-only.** `components/HeroField.tsx` takes its section from
  `canvas.parentElement` (:353), its anchors from `[data-field="frame" | "nav" | "text"]` (:357–360),
  and its canvas class from `Hero.module.css` (`.hero-field`). Everything below the anchor is
  generic: `place()` (:100) lays the design out from any frame rect, `renderTrace()` (:288) draws
  the design at any time `now`, each element appearing by its `dist` to the frame centroid.
- **The trace is a pure function of time.** `renderTrace(ctx, st, glow, glowSize, now)` draws
  edge `e` with `drawn = smooth((now − start(e.dist)) / edgeMs)`, fills and lit nodes with
  `settle(dist)`. Feeding it a time derived from scroll instead of `performance.now()` plays the
  intro forwards or backwards — no new drawing code.
- **Order key.** `dist` is set in `place()` from the frame centroid (`frameCentroid`,
  `lib/field/lattice.ts:201`); `distMax` normalises it (:156).
- **Live changes stop cleanly.** `step()` returns early when `st.elig` is null (:516), and
  `measure()` drops all live changes (:441). With no `elig`, a field draws the design at rest plus
  its trace — nothing else.
- **Loop gating.** The rAF loop runs only while the section is on screen and the tab visible
  (`IntersectionObserver`, :596); reduced motion draws one still frame (:556–566).
- **Page tokens.** `app/globals.css` already carries `--color-surface`, `--radius-lg`,
  `--shadow-md`, `.tag` / `.tag-accent` and `.btn` / `.btn-primary` — the card's tags and link
  reuse them.

## Shape — the decisions

- **One field engine, two fields.** `HeroField` becomes a generic `TriangleField`
  (`components/TriangleField.tsx`, its own CSS module for the canvas class), mounted twice: in the
  hero and in the work section. It reads the same `data-field` anchors from its parent section;
  a `handoff` prop says how scroll drives it (`"leave"` for the hero, `"enter"` for work). Why: a
  second copy of 640 lines of canvas code would drift from the first on the next tuning pass.
- **The work field is the same design, smaller.** The work section carries an invisible
  `data-field="frame"` anchor whose width sets the scale (start: 60 % of the hero frame, i.e.
  288 px desktop, tuned per breakpoint in CSS like `--img-max`). Same triangles, fills, fade and
  lit nodes — "similar bg, but smaller".
- **The work field has no live changes.** It traces in and then rests; `st.elig` stays null.
  Why: motion behind text in a glass card hurts reading, and it keeps the `eligible()` placement
  limits (built around a portrait and a text block) out of this change.
- **The handoff is scrubbed by scroll, both ways.** Two progress values, read from section rects
  each frame, `0 → 1`:
  - *hero leave*: from the hero's top at the viewport top until its bottom reaches ~40 % of the
    viewport height;
  - *work enter*: from the work section's top at the viewport bottom until it reaches ~30 %.

  The ranges overlap, so the eye reads one shape leaving the hero and arriving below. Scrolling up
  reverses both. The exact ranges are starting values, tuned by eye.
- **"Going down" = the sweep runs top to bottom.** During the handoff each element's order key is
  its height in the field, not its distance to the centroid: the hero's top triangles dissolve
  first (the design traced backwards, edges pulling back with a lit point on the tip), and the work
  field traces in from its top. `place()` computes this second key (`drop`, normalised `0..1`)
  next to `dist`; `renderTrace` takes which key to use. The hero's load intro keeps the centroid
  order.
- **Scroll and intro compose by taking the earlier time.** The hero is drawn at
  `min(now, timeFromScroll)`: a visitor who scrolls during the intro sees it dissolve from where it
  had got to. When the hero's leave progress is above 0, its live changes are dropped and it draws
  through `renderTrace`; back at 0 it returns to the cached layers and changes resume.
- **The work field redraws on scroll, not every frame.** With no live changes, a passive scroll
  listener coalesced through one rAF is enough; the loop does not run while the page is still.
- **The carousel is native horizontal scroll with CSS scroll snap.** A `<ul>` with
  `overflow-x: auto`, `scroll-snap-type: x mandatory`, cards `scroll-snap-align: start`. Touch,
  trackpad, shift+wheel and keyboard (the list is focusable, `aria-label`led) work with no JS and
  no dependency. Prev/next buttons (a small client component) scroll by one card and disable at the
  ends. The next card peeks in at the right edge so it is clear there is more.
- **Glass cards.** Translucent surface (`--color-surface` mixed toward transparent), a
  `backdrop-filter: blur() saturate()` (with the `-webkit-` prefix for Safari), a 1 px light
  border, `--radius-lg`. The field behind the carousel is what makes the glass read — that is why
  the field sits there.
- **Card content, top to bottom:** title (`h3`), picture, description, tags, link. This is the
  reading of "title on top, and below a description, link and tags" — see Open questions.
- **Project data is one typed file.** `lib/work.ts` exports `WORK: WorkItem[]`
  (`slug`, `title`, `description`, `image`, `imageAlt`, `href`, `tags`). First version: four
  placeholder entries with placeholder SVG images in `public/work/`, plain `<img>` with
  `width`/`height` and `loading="lazy"` (static export, as the portrait).
- **The section has the hero's background language, shorter.** The same `--color-bg` base with
  its own radial gradients, `min-height` around 80vh rather than 100vh, and no visible seam where
  the hero ends.
- **Nav gets a "Work" link** to `#work`, styled and animated by the existing `.hero-links a` rule.
- **Reduced motion:** no scrub. The hero field stays at rest, the work field is drawn at rest,
  the carousel's `scroll-behavior` is `auto`.

## The new part

- The **scroll handoff**: the two progress values, the second order key (`drop`) in `place()`,
  `renderTrace` taking the order key and a scroll-derived time, and the hero's switch between
  cached layers and trace when the leave progress crosses 0. This is the only new motion logic.
- The **work section**: `components/Work.tsx` + `Work.module.css`, `components/WorkCarousel.tsx`
  (client: prev/next), `lib/work.ts`, `public/work/*.svg`, `app/page.tsx` rendering it below the
  hero.

## Reused, not rebuilt

- `place()` (`HeroField.tsx:100`) and `latticeFrame()` (`lib/field/lattice.ts:67`) — the work field
  is laid out from its anchor exactly as the hero's is.
- `renderTrace()` (`HeroField.tsx:288`) — the dissolve and the trace-in are this function run on a
  scroll clock, with no new drawing code.
- The design data (`lib/field/design.ts`) and config (`lib/field/config.ts`) — unchanged values.
- The loop gating, resize handling and reduced-motion still frame of `HeroField`.
- `.tag`, `.btn`, colour/radius tokens from `app/globals.css`.

## Out of scope

- **Real project content** — placeholders now; the owner fills `lib/work.ts` later.
- **Project detail pages / case studies** — the link goes out; no new routes.
- **Filtering or sorting by tag** — earns itself when there are enough projects.
- **Mouse drag-to-scroll and autoplay** — native scroll covers touch/trackpad; autoplay fights
  reading.
- **Live changes in the work field** — deliberately static after the trace (see Shape).
- **The portrait frame on scroll** — the frame and portrait scroll away with the hero as they do
  today; only the canvas field dissolves.
- **The About section** the nav already links to — a separate spec.

## Open questions

- **Card order.** Read as title above the picture. The other reading is the title laid over the
  top of the picture. Cheap to switch; the owner confirms by eye.
- **Scroll ranges and work-field scale** — starting values above; tuned by eye with the owner.
- **Glass over a moving canvas in Safari.** `backdrop-filter` re-blurs whenever the canvas below
  repaints; the work field repaints only on scroll, so this should hold, but the plan checks
  scroll smoothness in Safari on a laptop before calling it done.

## Done when

- `npm run lint` and `npm run build` pass.
- At 1440×900, 900×1100 and 390×844: scrolling down dissolves the hero field from the top down
  and traces the smaller field in behind the cards from the top down; scrolling up reverses it;
  the hero load intro is unchanged.
- The carousel scrolls sideways by touch/trackpad/keyboard with snap, prev/next buttons move one
  card and disable at the ends, and the next card peeks in.
- Each card shows title, picture, description, tags and link; the glass blur over the field is
  visible.
- With `prefers-reduced-motion: reduce` both fields are drawn at rest and nothing scrubs.
- With JS disabled the cards and carousel still scroll and the hero intro still runs.

## Commit breakdown — a sketch, not the plan

`/planc` turns this into session cards.

1. `refactor: extract the field engine into TriangleField` — `HeroField` → `TriangleField` with
   its own CSS module and a `handoff` prop; the hero mounts it; no visual change.
2. `feat: add the work section with placeholder projects` — `lib/work.ts`, placeholder SVGs,
   `Work.tsx` with the static card markup, `app/page.tsx`, the nav "Work" link.
3. `feat: glass cards in a scroll-snap carousel` — card styles, scroll snap, the prev/next client
   component, reduced-motion `scroll-behavior`.
4. `feat: dissolve the hero field top-down on scroll` — the `drop` order key, the leave progress,
   `renderTrace` on the scroll clock, the switch from cached layers to trace and back.
5. `feat: trace the work field in on scroll behind the carousel` — the work anchor, the enter
   progress, scroll-driven redraw, reduced-motion still frame.
