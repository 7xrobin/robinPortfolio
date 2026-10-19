// Every tunable of the hero field lives here and nowhere else.
// Sizes are in design units (one lattice cell side = 40 du), scaled by
// s = side / 40 at draw time. Times are in milliseconds, speeds in du/s.
// The CSS intro timings live on `.hero` in Hero.module.css, because the CSS
// has to run without JS.

/** Design space of the original 1280 × 760 field. */
export const DESIGN = {
  width: 1280,
  height: 760,
  cell: 40,
  /** Frame apex in design coordinates. */
  apexX: 320,
  apexY: 138.6,
  /** The frame is this many cells wide. */
  frameCells: 12,
} as const;

export type FadeStop = readonly [t: number, value: number];

export interface FieldConfig {
  dots: { radius: number; color: string; opacity: number };
  litNode: { radius: number; color: string; glowBlur: number; glowColor: string };
  lines: {
    stops: readonly string[];
    from: readonly [x: number, y: number];
    to: readonly [x: number, y: number];
    opacity: number;
    width: number;
  };
  fills: {
    palette: readonly string[];
    opacityMin: number;
    opacityMax: number;
    chance: number;
    staggerMs: number;
    fadeMs: number;
    holdMs: number;
  };
  cleanZone: { paddingCells: number; rampCells: number };
  fade: {
    /** (t, value) stops along design x, t = x / 1280; held to t = 1. */
    stops: readonly FadeStop[];
    /** Past t = 1 the fade drops linearly to 0 over this many cells. */
    dropCells: number;
    /** Forms are not placed where any node's fade is below this. */
    minFormFade: number;
  };
  formMix: { polyiamond: number; largeTriangle: number; hexagon: number; attempts: number };
  pacing: {
    busy: Pacing;
    calm: Pacing;
    calmAtMs: number;
  };
  intro: {
    /** The dot ripple grows from the frame centroid between these two times,
     *  on the performance.now() clock (navigation start = 0). */
    rippleStartMs: number;
    /** By then the ripple has passed the farthest section corner. */
    rippleEndMs: number;
    /** Width of the ripple's soft edge, in cells. */
    rippleSoftCells: number;
    /** No form starts before this time. */
    firstFormsMs: number;
  };
  maxDpr: number;
}

export interface Pacing {
  liveForms: number;
  penSpeed: number;
  outlineHoldMs: number;
  gapMinMs: number;
  gapMaxMs: number;
}

export const FIELD: FieldConfig = {
  dots: { radius: 1.0, color: "#5dbcc1", opacity: 0.35 },
  litNode: { radius: 1.6, color: "#65d2d2", glowBlur: 4, glowColor: "#4fcdcd" },
  lines: {
    stops: ["#5dbcc1", "#5fa5de", "#9184d9"],
    from: [0, 0],
    to: [900, 760],
    opacity: 0.55,
    width: 0.8,
  },
  fills: {
    palette: ["#33969b", "#3a80b7", "#968ae0"],
    opacityMin: 0.08,
    opacityMax: 0.34,
    chance: 0.4,
    staggerMs: 120,
    fadeMs: 300,
    holdMs: 1200,
  },
  cleanZone: { paddingCells: 0.6, rampCells: 1.5 },
  fade: {
    stops: [
      [0, 1],
      [0.45, 0.8],
      [0.75, 0.2],
    ],
    dropCells: 1,
    minFormFade: 0.15,
  },
  formMix: { polyiamond: 0.6, largeTriangle: 0.25, hexagon: 0.15, attempts: 12 },
  pacing: {
    busy: { liveForms: 5, penSpeed: 160, outlineHoldMs: 900, gapMinMs: 150, gapMaxMs: 400 },
    calm: { liveForms: 3, penSpeed: 80, outlineHoldMs: 1600, gapMinMs: 900, gapMaxMs: 2200 },
    calmAtMs: 3500,
  },
  intro: {
    rippleStartMs: 250,
    rippleEndMs: 1350,
    rippleSoftCells: 2,
    firstFormsMs: 900,
  },
  maxDpr: 2,
};

/** Same query as the mobile breakpoint in app/globals.css. */
export const MOBILE_QUERY = "(max-width: 560px)";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/** Overrides applied under MOBILE_QUERY: a fainter lattice and fewer forms,
 *  because on a phone the field sits behind the text rather than beside it. */
export const MOBILE_OVERRIDES: DeepPartial<FieldConfig> = {
  dots: { opacity: 0.22 },
  pacing: {
    busy: { liveForms: 3 },
    calm: { liveForms: 2 },
  },
};

function merge<T>(base: T, over: DeepPartial<T> | undefined): T {
  if (!over) return base;
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(over)) {
    if (v === undefined) continue;
    const b = (base as Record<string, unknown>)[k];
    out[k] =
      b && typeof b === "object" && !Array.isArray(b) && typeof v === "object" && !Array.isArray(v)
        ? merge(b, v as DeepPartial<typeof b>)
        : v;
  }
  return out as T;
}

/** The config in effect for a viewport: the base, plus mobile overrides when they apply. */
export function fieldConfig(mobile: boolean): FieldConfig {
  return mobile ? merge(FIELD, MOBILE_OVERRIDES) : FIELD;
}
