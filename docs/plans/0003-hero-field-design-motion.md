---
number: "0003"
type: plan
slug: hero-field-design-motion
title: Animate the hero field on the design's own triangle structure
status: planned
created: 2026-10-20
tags: [plan, status/planned]
---

# 0003 — Plan: animate the hero field on the design's own triangle structure

**Spec:** `docs/specs/0003-hero-field-design-motion.md` — the decisions and their why. This file
is only how they land.

## Goal

The hero canvas draws the "Hero 6a refined" field exactly as the old static SVG did (edges, fills,
lit nodes, same fade), revealed by the existing intro ripple. After the intro, a few edges open and
close and fills come and go, always reverting, so the overall structure never changes. The 0002
pen/forms engine and the dot layer are gone.

## Starting point

- `components/HeroField.tsx` (492 lines) — canvas sizing, DOM measurement (`relativeRect` :17),
  dot layer (`renderDots` :58), glow sprite (`renderGlow` :82), forms (`startForm` :104, `place`
  calls :253 and :396), ripple (:204–:240, :332–:350), reduced-motion still (:380–:413), pause
  (IntersectionObserver :448, visibilitychange :453).
- `lib/field/lattice.ts` — `latticeFrame` :67, `nodePosition` :78, `fade` :98, `cleanZone` :129,
  `buildLattice` :152, cell helpers `cellId` / `cellNodes` / `cellNeighbours` :203–:260.
- `lib/field/forms.ts` — polyiamond / triangle / hexagon generators and `place` :201, with the
  `Obstacles` rect checks (`inRect`, `inFrame`) the new code still needs.
- `lib/field/config.ts` — `FIELD` :77; `lines`, `fills`, `litNode`, `fade`, `cleanZone`, `intro`
  stay; `dots`, `formMix`, `pacing.liveForms/penSpeed/outlineHoldMs` go.
- The design SVG is in git only: `git show 5a69190^:public/triangle-grid.svg` (42 978 bytes;
  167 paths: 1 stroke path of 841 `M..L..` segments, 165 fill paths in 3 colours, 1 lit-node
  path of 189 circles).

## Changes by area

**Design data** (new)
- `scripts/extract-field.mjs` — reads the SVG blob via `git show 5a69190^:public/triangle-grid.svg`,
  maps each design point to a lattice node: `r = round((Y − 138.6) / 34.641)`,
  `c = round((X − 320) / 40 − (odd(r) ? 0.5 : 0))`; fails if any point is more than 0.5 du off
  its node. Writes `lib/field/design.ts`.
- `lib/field/design.ts` — generated, with a header saying so: `DESIGN_EDGES` (node-pair tuples,
  sorted, deduped), `DESIGN_FILLS` (`{ cell: CellId, colour: 0|1|2, opacity }`), `DESIGN_LIT`
  (node tuples). The cell of a fill is found from its three nodes (flat side row and the lowest
  `hx` on it — see `cellNodes` at `lib/field/lattice.ts:231` for the inverse).
- The SVG fill colours are `oklch()`; the canvas keeps using the hex palette already in
  `FIELD.fills.palette` (`#33969b`, `#3a80b7`, `#968ae0`), mapped by order of appearance.

**Drawing the design** — `components/HeroField.tsx`
- Replace `renderDots` with `renderDesign`: fills, then edges (line gradient `FIELD.lines`), then
  lit nodes (glow sprite), every element multiplied by its weight (fade × clean zone; an edge uses
  the min of its two node weights, a fill the min of its three). Cached offscreen per resize.
- The ripple reveals elements by distance of their midpoint/centroid from the frame centroid,
  same soft edge as today.
- Reduced-motion still = `renderDesign` copied once.

**Changes** (new) — `lib/field/changes.ts`, pure, seeded `Rand`
- State: per edge `on/off` (design value as default), per cell fill (design fill or none).
- `pickChange(state, live, rules, rand)` → one of `open-edge`, `close-edge`, `fill`, `unfill`,
  with the rules from the spec §Shape (close only completes a cell; fill only on a closed cell;
  open on a filled cell also fades its fill; caps on diverged edges / fills; no live change in
  the same or an adjacent cell; skip elements with weight below `minChangeFade`, in the frame
  triangle, or in the text rect).
- `alphaAt(change, t)` → fade in / hold / fade out curve; lit nodes derive from the edges.

**Config** — `lib/field/config.ts`
- Remove `dots`, `formMix`, pen fields. Add `changes: { busy, calm }` each
  `{ perSecond, holdMinMs, holdMaxMs, fadeMs }`, plus `maxEdgeShare: 0.06`,
  `maxFillShare: 0.12`, `minChangeFade` (rename of `fade.minFormFade`). Starting values:
  busy `{ perSecond: 4, hold 800–1600, fadeMs 400 }`, calm `{ perSecond: 1.2, hold 1800–4000,
  fadeMs 700 }`. `MOBILE_OVERRIDES` halves `perSecond`.

**Removed** — `lib/field/forms.ts` (after porting `inRect` / `inFrame` into `lib/field/lattice.ts`).

## Risks

- **Rounding in the SVG** (34.6 vs 34.641 row height, 69.3, 103.9…) — the snap tolerance in the
  script catches a bad mapping; the gate compares the canvas to the SVG by eye.
- **Draw cost** — 841 edges with a gradient stroke every frame would be heavy; that is why the
  design layer is cached and only changed elements are drawn per frame. An element under change is
  left out of the cache, so the cache is rebuilt when a change starts or ends (cheap: a few times
  per second at most) — or, simpler, draw the cache with all design elements and paint changes as
  "erase" (open) or "add" (close) on top; pick whichever looks right — erasing needs the exact
  background, so prefer rebuild-on-change.
- **The cap is only as good as its count** — changes and design must share one element id space.

## Verification

Serve the static export: `npm run build && python3 -m http.server 8001 -d out`. Headless Chrome
at 1440×900, 900×1100, 390×844 (narrow sizes inside an iframe of the exact width, as in 0001).
Reference: the SVG blob saved to the scratchpad and opened at the same scale.

## Sessions  ·  one card = one fresh session; a card may land several commits; git carries state between cards

### Card 1 — the design field drawn by the canvas, forms engine removed
precondition:  none — first session. 0002 landed (`74d44a1`..`a4fd5e3`); tree clean.
read for why:  `docs/specs/0003-hero-field-design-motion.md` §Shape — only if you need the why
model:         opus
commits:
  1. feat: extract the 6a refined field into lattice data
     touches: scripts/extract-field.mjs, lib/field/design.ts  (only these)
     do:      - script per this plan §Design data: read `git show 5a69190^:public/triangle-grid.svg`, snap points to `(r, c)` with a 0.5 du tolerance (exit 1 past it), dedupe edges
              - write `lib/field/design.ts` with `DESIGN_EDGES`, `DESIGN_FILLS`, `DESIGN_LIT`; assert counts 841 / 165 / 189 (fewer edges only if duplicates were removed — print how many)
  2. feat: draw the design field in place of the dot lattice
     touches: components/HeroField.tsx, lib/field/config.ts
     do:      - `renderDesign` replaces `renderDots` (`components/HeroField.tsx:58`): fills → edges → lit nodes, weighted by fade × clean zone, cached offscreen
              - ripple (:204–:240, :332–:350) reveals design elements by midpoint/centroid distance; reduced-motion still (:380–:413) shows the design
              - stop calling `place` (:253, :396) — no forms are started; leave `lib/field/forms.ts` in place for this commit
  3. chore: remove the triangle form generator
     touches: lib/field/forms.ts, lib/field/lattice.ts, lib/field/config.ts, components/HeroField.tsx
     do:      - move `inRect` / `inFrame` from `lib/field/forms.ts` into `lib/field/lattice.ts`, then delete `forms.ts`
              - drop `dots`, `formMix`, and the pen fields of `pacing` from `FieldConfig` / `FIELD` / `MOBILE_OVERRIDES`; remove `startForm`, `LiveForm` and the form drawing from `HeroField.tsx`
done when:     `node scripts/extract-field.mjs` re-run leaves `git diff` empty; `npm run build` and `npm run lint` exit 0; reduced-motion screenshot at 1440×900 matches the SVG blob opened at the same scale by eye (same edges, fills, lit nodes; only the logo clean zone is emptier); a normal-motion capture shows the ripple revealing the design, then a still field; all commits landed

### Card 2 — open, close and fill changes on the design, then hand to the owner
precondition:  Card 1 landed — the canvas draws `DESIGN_*` from `lib/field/design.ts`, no forms code left, `inRect` / `inFrame` live in `lib/field/lattice.ts`
read for why:  `docs/specs/0003-hero-field-design-motion.md` §Shape (open/close/fill rules, the cap) — read it, the rules are the work
model:         opus
commits:
  1. feat: pick open, close and fill changes on the design field
     touches: lib/field/changes.ts, lib/field/config.ts
     do:      - `lib/field/changes.ts` per this plan §Changes: element ids shared with `design.ts`, `pickChange` with every rule in spec §Shape, `alphaAt`
              - `FIELD.changes`, `maxEdgeShare`, `maxFillShare`, `minChangeFade` per this plan §Config; mobile halves `perSecond`
  2. feat: animate the hero field with open, close and fill changes
     touches: components/HeroField.tsx
     do:      - after the ripple, schedule changes at `changes.busy.perSecond`, switch to `calm` at `pacing.calmAtMs`; elements under change leave the cached layer (rebuild on start/end) and are drawn per frame with `alphaAt`
              - lit nodes follow edges per spec; pause and reduced-motion paths unchanged in behaviour
  3. docs(specs): record 0003 landed and 0002's forms replaced
     touches: docs/specs/README.md, docs/specs/0003-hero-field-design-motion.md
     do:      - 0003 row and spec **Status:** → landed `<first>`..`<last>`, awaiting the owner's review by eye (status stays `planned`, as 0002 did)
done when:     `npm run build` and `npm run lint` exit 0; captures at 3 s, 6 s and 12 s at 1440×900, 900×1100, 390×844 each read as the design with a few edges opened/closed and fills changed — never a shape in empty space, never inside the logo zone, the frame or the text; the field pauses on a hidden tab; reduced motion still shows the design; all commits landed
