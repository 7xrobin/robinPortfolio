---
number: "0003"
type: plan
slug: hero-field-design-motion
title: Animate the hero field on the design's own triangle structure
status: done
created: 2026-10-20
tags: [plan, status/done]
---

# 0003 — Plan: animate the hero field on the design's own triangle structure

**Spec:** `docs/specs/0003-hero-field-design-motion.md` — the decisions, the measured design and
their why. This file is only how they land.

## Goal

A canvas draws the "Hero 6a refined" field exactly as `public/triangle-grid.svg` does, revealed by
the intro ripple. After the intro, triangles dissolve and form along the edge of the shape,
colours shift and lit points fade in and out — always reverting, so the shape stays the design.

## Starting point

- `039a0b9` put the static field back: `components/Hero.tsx:17` renders
  `<img className={styles["hero-field"]} src="/triangle-grid.svg">`, placed by `.hero-field` in
  `components/Hero.module.css`. The intro keyframes (`--intro-*` on `.hero`, `hero-frame-in`,
  `hero-portrait-in`, `hero-rise`, reduced-motion block) are in the same file and stay.
- There is no `HeroField` and no `lib/field/` now. 0002's versions are in git and are the start
  for the canvas: `git show 039a0b9^:components/HeroField.tsx` (sizing, `relativeRect`, glow
  sprite `renderGlow`, ripple, reduced-motion still, IntersectionObserver / visibilitychange
  pause), `git show 039a0b9^:lib/field/lattice.ts` (`latticeFrame`, `nodePosition`, `fade`,
  `cleanZone`, cell helpers `cellId` / `cellNodes` / `cellNeighbours`), `git show
  039a0b9^:lib/field/config.ts` (`FIELD`, `fieldConfig`, `MOBILE_OVERRIDES`).
  `git show 039a0b9^:lib/field/forms.ts` has `inRect` / `inFrame` — copy those two, not the file.
- 0002 marked its DOM targets with `data-field="logo" | "frame" | "text"` on the logo link,
  `.hero-img` and `.hero-text`; `039a0b9` removed them. This plan uses `"nav"` (on `.hero-nav`)
  instead of `"logo"` — see §Nav band.

## Changes by area

**Design data** (new)
- `scripts/extract-field.mjs` — reads `public/triangle-grid.svg`; maps each point to a node:
  `r = round((Y − 138.6) / 34.641)`, `c = round((X − 320) / 40 − (odd(r) ? 0.5 : 0))`; exits 1
  if a point is more than 0.5 du from its node. Writes `lib/field/design.ts`.
- `lib/field/design.ts` — generated (header says so): `DESIGN_EDGES` (node pairs, sorted),
  `DESIGN_FILLS` (`{ cell, colour: 0|1|2, opacity }`), `DESIGN_LIT` (nodes). Counts must be
  841 / 165 / 189 (spec §The design, measured).
- Canvas colours stay hex: fills `#33969b`, `#3a80b7`, `#968ae0`; lines `#5dbcc1` → `#5fa5de` →
  `#9184d9` over design (0,0)→(900,760), stroke opacity 0.55, width 0.8 du; lit node
  `#65d2d2`, glow `#4fcdcd` blur 4 du (0002's tuned values in its `config.ts`).

**Nav band** — `lib/field/lattice.ts`, `components/HeroField.tsx`, `components/Hero.tsx`
- Replace 0002's `cleanZone` (padded logo rect + ramp) with `navBand(y, navBottom, side, cfg)`:
  0 for `y ≤ navBottom`, a smoothstep up to 1 over `cfg.navBand.rampCells` (start: 1) cells below.
  It goes into each node's weight where `clean` went; an edge uses the min of its two nodes, a fill
  the min of three, so nothing crosses into the bar.
- `navBottom` is `.hero-nav`'s bottom (via `data-field="nav"`), re-measured on resize like the
  frame. Config: `cleanZone` → `navBand: { rampCells: 1 }`.

**Shape model** (new) — `lib/field/shape.ts`, pure, built once from `design.ts`
- Closed triangles (517), each edge's count of closed triangles using it, boundary triangles
  (97: closed with an edge used once) with their outer edges, frontier cells (not closed, share
  an edge with a closed triangle) with their missing edges.

**Changes** (new) — `lib/field/changes.ts`, pure, takes a `Rand`
- Kinds: `dissolve` (boundary triangle: outer edges + fill out), `form` (frontier cell:
  missing edges in, fill in with `formFillChance`), `recolour` (fill → other colour or
  opacity), `fill` / `unfill` (closed triangle), `light` / `dim` (lit node).
- Rules from spec §Shape: caps, no live change on the same or adjacent cell, placement limits
  (nav band weight must be 1, `inFrame`, `inRect` text, `minChangeFade`), every change reverts.
- `sample(change, t)` → alpha (and colour for recolour) per element: fade in, hold, fade out.
- An edge is drawn if the design has it and no live dissolve removes it, or a live form adds it.

**Canvas** — `components/HeroField.tsx` (new, from 0002's), `components/Hero.tsx`,
`components/Hero.module.css`
- `Hero` renders `<HeroField />` as the first child of the section, puts the `data-field`
  markers back, and drops the `<img>`; `.hero-field` becomes the canvas rule
  (`position: absolute; inset: 0; width: 100%; height: 100%; display: block; pointer-events: none`).
  `public/triangle-grid.svg` stays — the script reads it; it is no longer served to the page.
  (Decision: keep it in `public/` for now; moving it out of the build is a later tidy-up.)
- Design layer cached offscreen per resize: fills → edges → lit nodes, each weighted by fade ×
  clean zone (edge: min of its two nodes, fill: min of three). Elements under a live change are
  left out of the cache; the cache is rebuilt when a change starts or ends.
- Per frame: copy the cache, draw live changes with `sample`.

**Config** — `lib/field/config.ts` (from 0002's, trimmed)
- Keep `lines`, `fills.palette/opacityMin/opacityMax`, `litNode`, `cleanZone`, `fade`, `intro`
  (ripple), `maxDpr`, `pacing.calmAtMs`. Drop `dots`, `formMix`, the pen fields.
- Add `changes`: `busy` / `calm` each `{ perSecond, holdMinMs, holdMaxMs, fadeMs }` — starting
  values busy `{ 3, 1000, 2000, 500 }`, calm `{ 1, 2500, 5000, 900 }`; mix
  `{ dissolve: 0.3, form: 0.3, recolour: 0.15, fill: 0.1, light: 0.15 }`;
  caps `{ boundary: 8, fillShare: 0.12, litShare: 0.15 }`; `formFillChance: 0.5`;
  `minChangeFade: 0.15`. `MOBILE_OVERRIDES` halves `perSecond` and the boundary cap.

## Risks

- **SVG rounding** (34.6 vs 34.641, 69.3, 103.9) — the snap tolerance fails loudly; the gate
  compares canvas and SVG by eye.
- **Draw cost** — 841 gradient edges per frame is too much; the cache + rebuild-on-change keeps it
  to a few rebuilds per second. If rebuilds show in a profile, batch start/end to one rebuild per
  frame.
- **No-JS** — the page shows no field without JS (the `<img>` goes). Accepted in 0002; flag it if
  the owner minds.

## Verification

`npm run build && python3 -m http.server 8001 -d out`; headless Chrome at 1440×900, 900×1100 and
390×844 (narrow sizes inside an iframe of the exact width, as in 0001). Reference for "same as
the design": a screenshot of the current static page (`039a0b9`) at the same sizes, taken before
Card 1's last commit.

## Sessions  ·  one card = one fresh session; a card may land several commits; git carries state between cards

### Card 1 — the canvas draws the design field exactly
precondition:  none — first session. `039a0b9` landed (static field back, no `HeroField`, no `lib/field/`); tree clean
read for why:  `docs/specs/0003-hero-field-design-motion.md` §The design, measured and §Shape — only if you need the why
model:         opus
commits:
  1. feat: extract the hero triangle field into lattice data
     touches: scripts/extract-field.mjs, lib/field/design.ts  (only these)
     do:      - script per this plan §Design data, reading `public/triangle-grid.svg`; snap tolerance 0.5 du, exit 1 past it
              - write `lib/field/design.ts`; assert 841 edges / 165 fills / 189 lit nodes
  2. feat: add the hero field geometry and config
     touches: lib/field/lattice.ts, lib/field/config.ts
     do:      - `lattice.ts` from `git show 039a0b9^:lib/field/lattice.ts`, plus `inRect` / `inFrame` copied from `git show 039a0b9^:lib/field/forms.ts`; `cleanZone` replaced by `navBand` (this plan §Nav band)
              - `config.ts` from `git show 039a0b9^:lib/field/config.ts`, trimmed per this plan §Config (keep / drop lists; `changes` comes in Card 2)
  3. feat: draw the hero triangle field on a canvas
     touches: components/HeroField.tsx, components/Hero.tsx, components/Hero.module.css
     do:      - first save reference screenshots of the static page at the three sizes into the scratchpad
              - `HeroField.tsx` from `git show 039a0b9^:components/HeroField.tsx` without dots and forms: `renderDesign` (fills → edges → lit nodes, weighted, cached), ripple reveals elements by midpoint/centroid distance, reduced-motion still = the design
              - `Hero.tsx`: `<HeroField />` first in the section, `data-field` markers back, `<img>` removed (`data-field="nav"` on `.hero-nav`, not on the logo); `.hero-field` becomes the canvas rule (this plan §Canvas)
done when:     re-running `node scripts/extract-field.mjs` leaves `git diff` empty; `npm run build` and `npm run lint` exit 0; reduced-motion captures at the three sizes match the reference screenshots by eye (same triangles, fills, lit nodes, same fade; nothing above the nav bar — at 390×844 the triangles that touch the logo today are gone, faded in below the bar); a normal-motion capture series shows the ripple revealing the design; all commits landed

### Card 2 — triangles form and dissolve on the edge, colours and points change
precondition:  Card 1 landed — `HeroField` draws `DESIGN_*` from `lib/field/design.ts` through a cached layer; `lib/field/lattice.ts` has `inRect` / `inFrame`
read for why:  `docs/specs/0003-hero-field-design-motion.md` §Shape — read it, the rules are the work
model:         opus
commits:
  1. feat: model the hero field shape, its boundary and frontier
     touches: lib/field/shape.ts
     do:      - closed triangles, edge use counts, boundary triangles with outer edges, frontier cells with missing edges (this plan §Shape model)
              - a dev-only check (or a one-off `node` run noted in the commit body) that the counts are 517 closed / 97 boundary
  2. feat: pick dissolve, form, colour and point changes
     touches: lib/field/changes.ts, lib/field/config.ts
     do:      - `changes.ts` per this plan §Changes: kinds, rules, caps, `sample`
              - `FIELD.changes` and mobile overrides per this plan §Config
  3. feat: animate the hero field edge, colours and points
     touches: components/HeroField.tsx
     do:      - after the ripple, start changes at `changes.busy.perSecond`, switch to `calm` at `pacing.calmAtMs`; elements under change leave the cache (rebuild on start/end) and are drawn per frame with `sample`
              - pause and reduced-motion behaviour unchanged
  4. docs(specs): record 0003 landed
     touches: docs/specs/README.md, docs/specs/0003-hero-field-design-motion.md
     do:      - 0003 row and spec **Status:** → landed `<first>`..`<last>`, awaiting the owner's review by eye (status stays `planned`, as 0002 did)
done when:     `npm run build` and `npm run lint` exit 0; captures at 3 s, 6 s and 12 s at the three sizes each read as the design with a few edge triangles gone or added, some fills recoloured, some points changed — never a triangle away from the shape, never a hole in the body, nothing in the nav bar, the frame or the text; a hidden tab stops the loop; reduced motion shows the design still; all commits landed
