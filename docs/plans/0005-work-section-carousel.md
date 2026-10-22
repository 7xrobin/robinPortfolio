---
number: "0005"
type: plan
slug: work-section-carousel
title: Work section with glass project cards, and the hero field handing off to it on scroll
status: done
created: 2026-10-21
tags: [plan, status/done]
---

# 0005 — Plan: work section with glass project cards, and the scroll handoff

**Spec:** `docs/specs/0005-work-section-carousel.md` — the decisions and their why. This file is
only how they land.

## Goal

Below the hero, a Work section (`#work`) shows four placeholder projects as glass cards in a
sideways-scrolling, snapping row with prev/next buttons. Behind the cards, a smaller copy of the
hero's triangle field. Scrolling down, the hero field dissolves from the top down (the design
traced backwards) while the work field traces in from the top down; scrolling up reverses both.
The hero's load intro is unchanged. Reduced motion: both fields at rest, nothing scrubs.

## Starting point

Checked against `948247a` (spec 0005 committed). No code changed since the spec was written.

- `app/page.tsx` renders `<Hero />` only.
- `components/Hero.tsx:6` mounts `<HeroField />` as the section's first child; the nav has one
  link, `#about` (`Hero.tsx:11–13`).
- `components/HeroField.tsx` (637 lines) — the whole field engine:
  - `PlacedEdge` / `PlacedFill` / `PlacedLit` (:40–69) carry `dist` (to the frame centroid);
    `FieldState.distMax` (:85) normalises it.
  - `place()` (:100–157) sets positions, weights, `dist`, `box`, `elig`.
  - `renderTrace(ctx, st, glow, glowSize, now)` (:288–338): `start(d) = traceStartMs +
    spreadMs × smooth(d / distMax)`; edges grow `a → b`, `a` being the end nearer the centroid.
  - The component (:348–637): `section = canvas.parentElement`; anchors via
    `[data-field="frame" | "nav" | "text"]` (:357–361, returns early with no frame);
    `draw(now)` (:478–490) uses the cached layers once `now ≥ introEndMs`, `renderTrace` before;
    `step()` (:498–516) starts changes, returns early with no `st.elig`; `tick` (:568–581) loops
    while `sync()` (:585–594) says the section is on screen; reduced motion draws `still()` once.
  - The canvas class is `styles["hero-field"]` from `Hero.module.css` (:637; rule at
    `Hero.module.css:96–103`).
- `lib/field/config.ts` — `FIELD`, `introEndMs()` (:180). No handoff tunables yet.
- `app/globals.css` — tokens (`--color-surface`, `--radius-lg`, `--shadow-md`), `.tag`,
  `.tag-accent`, `.btn`, `.btn-primary`, breakpoints at 560 / 1080 px.

## The scroll clock — how the handoff reuses `renderTrace`

The trace is a pure function of a time `T` and an order key `k ∈ [0, 1]` per element:
an element is hidden at `T ≤ traceStartMs + spreadMs·smooth(k)` and fully drawn
`edgeMs + settleMs` later. So a **presence** `p ∈ [0, 1]` maps to a time:

```
T(p) = traceStartMs + p × (introEndMs(cfg) − traceStartMs)
```

`p = 0` draws nothing, `p = 1` draws the whole design. Three order keys:

| order | key per element | used by |
|---|---|---|
| `centroid` | `dist / distMax` (today) | hero load intro |
| `fromTop` | `drop` = `(y − box.top) / box.height`, clamped 0..1 | work field enter (top appears first) |
| `fromBottom` | `1 − drop` | hero leave, played backwards (largest start vanishes first → top goes first) |

For an edge, `y` is its **upper** end, and under `fromTop` / `fromBottom` the edge grows from its
upper end to its lower end (so the sweep reads as going down). For a fill, `y` is its centroid's;
for a lit node, its own.

Progress from the section rect, `vh = window.innerHeight`, clamped 0..1:

```
hero leave  = −rect.top / (rect.height − leaveEndAt × vh)          leaveEndAt  = 0.4
work enter  = (enterStartAt × vh − rect.top) / ((enterStartAt − enterEndAt) × vh)
                                                                    enterStartAt = 1, enterEndAt = 0.3
```

Hero presence = `1 − leave`; work presence = `enter`. The three fractions go in `FIELD.handoff`
(`lib/field/config.ts`), starting values tuned by eye.

**Intro and scroll on the hero.** While `now < introEndMs`, the hero draws the intro as today
(`centroid` order) at `T = min(now, T(1 − leave))`. After it, `fromBottom` order at
`T(1 − leave)`; at `leave = 0` the cached layers and live changes run as today. Scrolling within the
first ~5.6 s and then holding still can show a jump when the intro ends (the order switches). This
is accepted as a narrow case — see Risks.

## Changes by area

### Work section markup and carousel (Card 1)

- `lib/work.ts` — `export interface WorkItem { slug; title; description; image; imageAlt; href;
  tags: string[] }` and `export const WORK: WorkItem[]` with four placeholder entries ("Project
  One" … "Project Four", one or two sentence descriptions, `href: "#"`, 2–4 tags each from Next.js,
  TypeScript, React, Python, Figma, Vercel, Postgres, AI).
- `public/work/placeholder-1.svg` … `-4.svg` — 800 × 500, `--color-bg`-dark base, one gradient
  in the field palette (`#33969b`, `#3a80b7`, `#968ae0`) and a few triangles, each a different
  tint so the four cards are told apart.
- `components/Work.tsx` (server component) — `<section id="work" className={styles.work}
  data-screen-label="02 Work" aria-labelledby="work-title">`, an `.inner` with `<h2
  id="work-title">Work</h2>` and `<WorkCarousel items={WORK} />`. Leaves a slot comment where
  Card 2 mounts the field and the anchor.
- `components/WorkCarousel.tsx` (`"use client"`) — the `<ul>` of cards and the prev/next buttons.
  Card markup per item, top to bottom: `<h3>` title, `<img src width={800} height={500}
  loading="lazy" alt>` (plain img, with the same eslint-disable comment as `Hero.tsx:63–64`),
  `<p>` description, `<ul>` of `.tag .tag-accent` tags, `<a className="btn btn-primary"
  href target="_blank" rel="noopener noreferrer">View project</a>`.
- `components/Work.module.css`:
  - `.work` — `position: relative; overflow: hidden; min-height: 80vh`; background: the hero's
    language (`--color-bg` base, an `--color-accent-900` radial near the top-left so there is no
    seam with the hero's bottom-left glow at `Hero.module.css:23`, a faint teal radial bottom-right).
  - `.inner` — `position: relative; z-index: 1`, same max-width / side padding as `.hero-inner`
    (`Hero.module.css:27–31`), vertical padding ~96 px (64 px on phone).
  - The track — `display: flex; gap: 24px; overflow-x: auto; scroll-snap-type: x mandatory;
    scroll-padding-inline` = the side padding; `padding-block: 24px 40px` so shadows are not
    clipped; `scrollbar-width: thin`; `list-style: none; margin: 0`; `tabindex={0}` and
    `aria-label="Projects"` on it in the TSX.
  - The card — `flex: 0 0 clamp(280px, 32vw, 380px)` (phone: `82%`, so the next card peeks in);
    `scroll-snap-align: start`; glass: `background: color-mix(in srgb, var(--color-surface) 38%,
    transparent)`, `-webkit-backdrop-filter` and `backdrop-filter: blur(16px) saturate(140%)`,
    `border: 1px solid color-mix(in srgb, var(--color-text) 14%, transparent)`,
    `border-radius: var(--radius-lg)`, `box-shadow: inset 0 1px 0 color-mix(in srgb,
    var(--color-text) 10%, transparent), 0 16px 40px rgba(0,0,0,.35)`; padding 20 px; image
    `border-radius: var(--radius-md)`, `aspect-ratio: 16 / 10`, `object-fit: cover`.
  - Buttons — round, glass like the cards, right-aligned above the track next to the heading;
    `:disabled` at 40 % opacity.
  - `@media (prefers-reduced-motion: reduce)` — `.track { scroll-behavior: auto; }`.
- Prev/next behaviour (`WorkCarousel.tsx`): buttons render with `hidden` until a mount effect
  shows them (no JS → no dead buttons). Click → `track.scrollBy({ left: ±(card width + gap),
  behavior: reduced ? "auto" : "smooth" })`. Disabled state from `scrollLeft ≤ 1` /
  `≥ scrollWidth − clientWidth − 1`, updated on the track's `scroll` (passive) and a
  `ResizeObserver`. Buttons carry `aria-controls` (track id) and `aria-label` "Previous project" /
  "Next project".
- `app/page.tsx` — `<><Hero /><Work /></>`.
- `components/Hero.tsx:11–13` — add `<a href="#work">Work</a>` before About. The `.hero-links a`
  rule already animates every link.

### The field engine and the handoff (Card 2)

- `git mv components/HeroField.tsx components/TriangleField.tsx`; export `default function
  TriangleField({ handoff }: { handoff: "leave" | "enter" })`. The canvas class moves to
  `components/TriangleField.module.css` (`.field`, the rule from `Hero.module.css:96–103`), and
  `.hero-field` is removed from `Hero.module.css`. `Hero.tsx` mounts `<TriangleField
  handoff="leave" />`. Update the doc comment at `:340–347` to name both uses.
- `lib/field/config.ts` — `handoff: { leaveEndAt: number; enterStartAt: number; enterEndAt:
  number }` on `FieldConfig` with a doc comment, values `0.4 / 1 / 0.3` in `FIELD`; a
  `presenceTime(cfg, p)` helper next to `introEndMs` (`:180`) implementing `T(p)`.
- `TriangleField.tsx`, placement — `PlacedEdge` gains `drop: number` and `down: { a: Point; b:
  Point }` (upper end first); `PlacedFill` / `PlacedLit` gain `drop`. `place()` computes them from
  `st.box` (set before the edges are placed — move the `b0`/`b1` box lines above `st.edges`).
- `renderTrace(…, now, order: "centroid" | "fromTop" | "fromBottom")` — the key and, for the
  two handoff orders, the `down` orientation; everything else unchanged. The `centroid` path draws
  exactly what it draws today.
- Hero (`handoff="leave"`): `tick` reads `leave` from `section.getBoundingClientRect()`. In
  `draw`: `reduced` → layers (today). `now < introEndMs` → `renderTrace(min(now,
  presenceTime(1 − leave)), "centroid")`. Else `leave > 0` → `renderTrace(presenceTime(1 −
  leave), "fromBottom")`, and `live` is cleared once (layers marked dirty) and `step` skipped while
  `leave > 0`. Else layers + changes as today.
- Work (`handoff="enter"`): `st.elig` stays null (never call `eligible`), so `step` never starts a
  change. No continuous loop: a passive `scroll` listener and the existing `ResizeObserver` call a
  `schedule()` that coalesces into one rAF, which measures if dirty and draws
  `renderTrace(presenceTime(enter), "fromTop")`, or the layers once `enter ≥ 1`. The
  `IntersectionObserver` only gates whether scroll events schedule a draw. Reduced motion: the
  still frame (layers), as today.
- `components/Work.tsx` — mount `<TriangleField handoff="enter" />` as the section's first child
  and an empty `<div className={styles.anchor} data-field="frame" aria-hidden="true" />`.
  `Work.module.css` `.anchor`: `position: absolute; aspect-ratio: 480 / 415.7; width:
  var(--work-frame); visibility: hidden; pointer-events: none`; `--work-frame` 288 px desktop,
  240 px tablet, 56 % on phone; `top` / `left` placed so the design box (768 × 456 px at 288 px)
  starts at the section's left edge and its top sits just under the heading — tuned by eye.

## Risks

- **Order switch at the end of the hero intro** if the visitor scrolled during the first ~5.6 s
  and then stopped: the drawn set jumps from the centroid sweep to the top-down sweep at the same
  `T`. Narrow; check by eye. If it shows, the fix is to keep `centroid` until the next scroll
  event after the intro — do not add it unless seen.
- **`backdrop-filter` cost in Safari** over a canvas that repaints. The work field repaints only
  on scroll and stops at `enter ≥ 1`; the hero canvas is a different section. Check scroll
  smoothness in Safari, or record it as an owner check (0004 found Safari not drivable from the
  session).
- **`scroll-snap` with `smooth` scrollBy** can land between cards on some trackpads; `mandatory`
  snaps it back. Fine unless seen.
- **Layout read per frame.** The hero `tick` calls `getBoundingClientRect()` each frame while on
  screen. One read per frame after the draw writes nothing to the DOM — no forced reflow loop.

## Verification

- `npm run lint` and `npm run build` exit 0 after each commit.
- `npm run dev`, in Chrome (the claude-in-chrome tools when available) at 1440×900, 900×1100 and
  390×844:
  - fresh load: hero intro as before (field ripple, frame trace, portrait, text);
  - scroll to ~25 %, ~50 %, ~75 % of the hero height and onto the work section: the hero field
    loses its top rows first, the work field gains its top rows first, the cards' glass blurs it;
    scroll back up: the hero field returns, its changes resume once fully back;
  - the carousel: trackpad/shift+wheel and keyboard (focus the track, arrow keys) scroll with
    snap; prev/next move one card and disable at the ends; the next card peeks in.
- DevTools rendering → `prefers-reduced-motion: reduce`: both fields at rest at every scroll
  position, no tips.
- JS disabled (DevTools): the cards and the track scroll; no buttons; the hero intro runs.
- Safari: scroll smoothness over the glass, or recorded as an owner check.

## Sessions  ·  one card = one fresh session; a card may land several commits; git carries state between cards

Single lane: the field card needs the work section's markup, so the two cards are a sequence.

### Card 1 — the work section and the glass carousel
precondition:  none — first session. `948247a` or later on the branch; `app/page.tsx` renders only `<Hero />`
read for why:  `docs/specs/0005-work-section-carousel.md` §Shape (carousel, glass cards, card content, project data) — follow only if you need the why
model:         opus
commits:
  1. feat: add the work section with placeholder projects
     touches: lib/work.ts, public/work/placeholder-1.svg, public/work/placeholder-2.svg, public/work/placeholder-3.svg, public/work/placeholder-4.svg, components/Work.tsx, components/Work.module.css, components/WorkCarousel.tsx, app/page.tsx, components/Hero.tsx  (only these)
     do:      - `lib/work.ts` and the four SVGs per this plan §Changes by area → Card 1
              - `Work.tsx` + `WorkCarousel.tsx` with the card markup (no buttons yet), `.work` / `.inner` / heading styles in `Work.module.css`; `app/page.tsx` renders `<Hero /><Work />`
              - the `Work` link at `components/Hero.tsx:11–13`
  2. feat: glass cards in a scroll-snap carousel
     touches: components/Work.module.css, components/WorkCarousel.tsx  (only these)
     do:      - track + card + glass + image styles, phone peek, reduced-motion `scroll-behavior`
              - prev/next buttons: hidden until mounted, `scrollBy` one card, disabled at the ends, `aria-controls` / `aria-label`
done when:     `npm run lint` and `npm run build` exit 0 after each commit; in `npm run dev` at 1440×900, 900×1100 and 390×844 the Work section sits under the hero with no background seam, four cards show title / picture / description / tags / link in that order, the track scrolls sideways with snap (trackpad, shift+wheel, keyboard on the focused track), prev/next move one card and disable at the ends, the next card peeks in, and the nav shows Work before About; with JS disabled the track still scrolls and no buttons show; all commits landed

### Card 2 — one field engine, and the scroll handoff
precondition:  Card 1 landed — `components/Work.tsx` exists and renders under the hero with the field slot comment
read for why:  this plan §The scroll clock (the formulas and the three orders); spec §Shape (handoff, "going down", work field has no live changes) — follow only if you need the why
model:         opus
commits:
  1. refactor: extract the field engine into TriangleField
     touches: components/HeroField.tsx → components/TriangleField.tsx (git mv), components/TriangleField.module.css, components/Hero.tsx, components/Hero.module.css  (only these)
     do:      - rename + `handoff` prop (accepted, not yet used); `.field` rule moved from `Hero.module.css:96–103`; `Hero.tsx` mounts `<TriangleField handoff="leave" />`
              - no visual change: the hero load and rest state look as before
  2. feat: dissolve the hero field top-down on scroll
     touches: components/TriangleField.tsx, lib/field/config.ts  (only these)
     do:      - `FIELD.handoff` + `presenceTime()` in `config.ts`; `drop` / `down` in `place()` (box computed first); `renderTrace` takes `order`
              - hero `draw` / `step` per this plan §Changes by area → Card 2 (leave progress, `min(now, …)` during the intro, `fromBottom` after, live changes dropped while `leave > 0`)
  3. feat: trace the work field in on scroll behind the carousel
     touches: components/TriangleField.tsx, components/Work.tsx, components/Work.module.css  (only these)
     do:      - `handoff="enter"`: no `elig`, scroll-scheduled draw at `presenceTime(enter)` with `fromTop`, layers at `enter ≥ 1`, still frame under reduced motion
              - mount the field + the hidden `data-field="frame"` anchor in `Work.tsx` (replacing the slot comment); `.anchor` and `--work-frame` per breakpoint in `Work.module.css`, placed by eye
done when:     `npm run lint` and `npm run build` exit 0 after each commit; this plan §Verification passes at 1440×900, 900×1100 and 390×844 — hero load intro unchanged, scrolling down dissolves the hero field from the top and traces the work field in from the top behind the glass, scrolling up reverses it and the hero's changes resume at the top; reduced motion shows both fields at rest at every scroll position; Safari checked or recorded as an owner check; all commits landed
