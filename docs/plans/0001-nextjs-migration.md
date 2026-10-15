---
number: "0001"
type: plan
slug: nextjs-migration
title: Migrate the portfolio to Next.js (React) with CSS Modules
status: planned
created: 2026-10-15
tags: [plan, status/planned]
---

# 0001 — Plan: migrate the portfolio hero to Next.js 16.4.1 with CSS Modules

**Spec:** `docs/specs/0001-nextjs-migration.md` — the decisions and their why. This file is only
how they land.

## Goal

The hero from `index.html` renders from a Next.js 16.4.1 App Router project as a static export
(`out/`), styled with one global CSS file plus `Hero.module.css`, and looks the same as the
baseline screenshots in `docs/specs/0001-baseline/` — except the removed scroll cue and "Work"
link. The old `index.html` and `assets/` are then deleted.

## Changes by area

**Project setup** (new files at the repo root)
- `package.json` — `next@16.4.1` pinned exactly, plus `react`, `react-dom`, `typescript`,
  `@types/react`, `@types/react-dom`, `@types/node`, `eslint`, `eslint-config-next@16.4.1`.
  Scripts: `dev`, `build`, `start`, `lint` (`eslint .` — Next 16 has no `next lint`).
- `next.config.ts` — `output: 'export'`, `images: { unoptimized: true }`.
- `tsconfig.json`, `eslint.config.mjs` — the shape `create-next-app@16.4.1` generates.
- **Do not run `create-next-app` in this folder.** It refuses a folder that already has files
  (`index.html`, `assets/`, `docs/`). Either install by hand (`npm i -E …`) and write the config
  files, or scaffold into a scratch folder and copy only the config files across. `.gitignore`
  already covers `node_modules/`, `.next/`, `out/`, `next-env.d.ts` (baseline `fcd4413`).

**Static files** — copy into `public/` unchanged: `assets/portrait.png`,
`assets/triangle-grid.svg`, `assets/robin-logo.svg`. `robin-name-rounded-black.svg` (repo root) is
not referenced by the page; leave it where it is.

**Global CSS** — `app/globals.css`, in this order (order matters: `site.css`'s `body` overrides
Nocturne's):
1. All of `assets/nocturne.css` **except** the Google Fonts `@import` (`nocturne.css:3`).
2. From `assets/site.css`: the layout tokens and both breakpoint blocks (`site.css:3-55`)
   **without** the work-only tokens `--work-pad`, `--head-gap`, `--work-gap`, `--h3-size`,
   `--detail-gap`; the `html`, `body`, `a`, `a:hover` rules (`site.css:57-66`); and the
   `prefers-reduced-motion` block reduced to `html { scroll-behavior: auto; }`.
- Dropped entirely: `triBounce` / `triWipe` keyframes (`site.css:68-69`), `.scroll-cue*`
  (`site.css:140-148`), everything from `.fade-rule` to `.bars` (`site.css:150-253`), and
  `.hero-hello span` (`site.css:129`) — the hello line no longer has a span (`index.html:41`).

**Fonts** — `app/layout.tsx` loads `Inter` (weights 400/500/600/700) and `Outfit` (200/300/400)
with `next/font/google`, each with a `variable` (`--font-inter`, `--font-outfit`) set on `<html>`.
In `globals.css`, `--font-heading` and `--font-body` become
`var(--font-inter), system-ui, sans-serif`. In the hero module, the h1 uses
`var(--font-outfit), var(--font-heading)` instead of `'Outfit'` (`site.css:131`).

**Hero** — `components/Hero.tsx` + `components/Hero.module.css`:
- Markup from `index.html:16-48`, minus the "Work" link (`index.html:21`) and minus the scroll cue
  (`index.html:50-60`). `class` → `className`; asset paths become `/triangle-grid.svg`,
  `/portrait.png`.
- The portrait `onerror="this.remove()"` (`index.html:37`) is dropped: Server Components cannot
  carry event handlers, and the file always exists in `public/`.
- `.lighten` stays a global class next to the module class: `` className={`${styles.portrait} lighten`} ``.
- Plain `<img>` for both images, not `next/image` — static export cannot optimise them anyway,
  and the portrait CSS (`site.css:123`) expects a plain `img`. Disable the
  `@next/next/no-img-element` lint rule on those two lines with a reason comment.
- CSS: `site.css:73-138` (`.hero` through `.hero-sub`) move into the module unchanged, except the
  logo mask URL becomes `url(/robin-logo.svg)` (`site.css:94-95`) and the h1 font change above.
  The class names in the module drop nothing; `.hero h1` and `.hero h1 em` stay as descendant
  selectors (valid in CSS Modules).
- SVG attributes in JSX: `stop-color` → `stopColor`, `fill-opacity` → `fillOpacity`,
  `stroke-width` → `strokeWidth`, `vector-effect` → `vectorEffect`, `preserveAspectRatio` stays.
  The `aria-hidden` on the `<img>` stays.

**Page** — `app/layout.tsx`: `<html lang="en">`, `metadata` with the title and description from
`index.html:7-8`. `app/page.tsx`: `<Hero />`.

**Cleanup** — delete `index.html` and `assets/` after the parity check passes.

## Risks

- **Fonts not applied** — if the variables are not on `<html>`, or the CSS still says `'Outfit'`,
  the headline falls back to a system font. The 1440 screenshot shows it at once (Outfit is the
  thin, round headline).
- **Triangle grid misaligned** — `.hero-field` must stay a direct child of `.hero-img`
  (`site.css:104-113`). Compare the grid against the frame apex in the screenshots.
- **CSS order** — the `body` background in `site.css:58-64` must come after Nocturne's `body`
  rule, or the page loses its radial glow.
- **Static-export paths** — `out/` uses absolute `/_next/…` URLs, so it cannot be opened with
  `file://`. Serve it over HTTP for the screenshots. Port 8000 may already be taken by the old
  site's server; use 8001.

## Open questions

- The "About" nav link points at a missing `#about` — kept as it is (spec, Out of scope).

## Sessions  ·  one card = one fresh session; a card may land several commits; git carries state between cards

### Card 1 — Next.js 16.4.1 project that builds a static export
precondition:  none — first session. Spec `0001` committed; baseline site at `fcd4413`.
read for why:  `docs/specs/0001-nextjs-migration.md` §Shape (version, static export, CSS Modules, fonts) — only if you need the why
commits:
  1. chore: scaffold Next.js 16.4.1 with static export
     touches: package.json, package-lock.json, next.config.ts, tsconfig.json, eslint.config.mjs, app/layout.tsx, app/page.tsx  (only these)
     do:      - install by hand, not with `create-next-app` in this folder (it refuses a non-empty folder): `npm i -E next@16.4.1 react react-dom` and `npm i -E -D typescript @types/react @types/react-dom @types/node eslint eslint-config-next@16.4.1`; add the scripts `dev`/`build`/`start`/`lint` (`eslint .`)
              - `next.config.ts` with `output: 'export'` and `images: { unoptimized: true }`; `tsconfig.json` and `eslint.config.mjs` in the shape `create-next-app@16.4.1` generates (scaffold in a scratch dir to copy them if unsure)
              - minimal `app/layout.tsx` (`<html lang="en"><body>`) and `app/page.tsx` returning a placeholder, so `npm run build` succeeds
  2. feat: add global styles, fonts and metadata
     touches: app/globals.css, app/layout.tsx, public/portrait.png, public/triangle-grid.svg, public/robin-logo.svg
     do:      - build `app/globals.css` exactly as listed in this plan §Global CSS (Nocturne without the `@import` at `assets/nocturne.css:3`; `site.css:3-66` without the work tokens; reduced-motion rule)
              - `app/layout.tsx`: import `globals.css`; `next/font/google` Inter (400/500/600/700) and Outfit (200/300/400) with `variable: '--font-inter'` / `'--font-outfit'` on `<html>`; point `--font-heading`/`--font-body` at `var(--font-inter)`; `metadata` title + description from `index.html:7-8`
              - copy the 3 files from `assets/` into `public/` unchanged
done when:     `npm run build` exits 0 and creates `out/index.html`; `npm run lint` exits 0; `out/` contains `portrait.png`, `triangle-grid.svg`, `robin-logo.svg`; all commits landed

### Card 2 — Hero component, parity check, remove the old site
precondition:  Card 1 landed — Next.js builds to `out/`, `globals.css` holds the tokens, fonts are exposed as `--font-inter` / `--font-outfit`, assets are in `public/`
read for why:  `docs/specs/0001-nextjs-migration.md` §Shape (what is removed, parity) and §The new part — only if you need the why
model:         opus
commits:
  1. feat: port the hero to a Server Component with CSS Modules
     touches: components/Hero.tsx, components/Hero.module.css, app/page.tsx
     do:      - `components/Hero.tsx` from `index.html:16-48` per this plan §Hero: no "Work" link (`index.html:21`), no scroll cue (`index.html:50-60`), no `onerror` on the portrait, SVG attributes in camelCase, `/triangle-grid.svg` and `/portrait.png`, `lighten` kept as a global class
              - `components/Hero.module.css` from `assets/site.css:73-138`: logo mask `url(/robin-logo.svg)`; h1 `font-family: var(--font-outfit), var(--font-heading)`; drop `.hero-hello span`
              - `app/page.tsx` renders `<Hero />`
  2. chore: remove the static site replaced by Next.js
     touches: index.html, assets/  (deletions only)
     do:      - only after the parity check below passes: `git rm -r index.html assets`
done when:     `npm run build` and `npm run lint` exit 0; `out/` served with `python3 -m http.server 8001 -d out` and captured with headless Chrome at 1440×900, 900×1100 and 390×844 (narrow sizes inside an iframe of the exact width — see `docs/specs/0001-nextjs-migration.md` §Shape, Parity) matches `docs/specs/0001-baseline/` by eye, with only the scroll cue and the "Work" link missing (the Outfit headline, the radial glow and the grid-to-apex alignment are the three things to check); all commits landed
