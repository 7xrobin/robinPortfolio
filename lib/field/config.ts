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

export interface ChangePacing {
  /** Changes started per second. */
  perSecond: number;
  holdMinMs: number;
  holdMaxMs: number;
  /** Each change fades in and out over this long. */
  fadeMs: number;
}

export interface FieldConfig {
  litNode: { radius: number; color: string; glowBlur: number; glowColor: string };
  lines: {
    stops: readonly string[];
    from: readonly [x: number, y: number];
    to: readonly [x: number, y: number];
    opacity: number;
    width: number;
  };
  fills: {
    /** Indexed by DesignFill.colour. */
    palette: readonly string[];
    opacityMin: number;
    opacityMax: number;
  };
  navBand: {
    /** Below the nav bar's bottom the field ramps from 0 to 1 over this many cells. */
    rampCells: number;
  };
  fade: {
    /** (t, value) stops along design x, t = x / 1280; held to t = 1. */
    stops: readonly FadeStop[];
    /** Past t = 1 the fade drops linearly to 0 over this many cells. */
    dropCells: number;
  };
  pacing: {
    calmAtMs: number;
  };
  /** Edge, colour and point changes after the intro (lib/field/changes.ts). */
  changes: {
    /** From the end of the intro until pacing.calmAtMs. */
    busy: ChangePacing;
    /** From pacing.calmAtMs on. */
    calm: ChangePacing;
    /** Relative odds of each kind; fill covers fill / unfill, light covers light / dim. */
    mix: { dissolve: number; form: number; rebuild: number; recolour: number; fill: number; light: number };
    caps: {
      /** Live dissolve + form changes at most. */
      boundary: number;
      /** Live rebuilds in the body at most. */
      body: number;
      /** Live fill changes (recolour, fill, unfill) at most, as a share of the design's fills. */
      fillShare: number;
      /** Live point changes (light, dim) at most, as a share of the design's lit nodes. */
      litShare: number;
    };
    /** A form grows up to this many cells out of the shape. */
    formChainMax: number;
    /** Odds that a formed triangle also takes a fill. */
    formFillChance: number;
    /** No change where the design's fade is below this. */
    minChangeFade: number;
  };
  intro: {
    /** The design is traced edge by edge, outward from the frame centroid,
     *  starting at this time on the performance.now() clock (navigation start = 0). */
    traceStartMs: number;
    /** An edge starts tracing at traceStartMs + spreadMs × smooth(its near
     *  end's distance to the centroid ÷ the farthest edge's), so the trace
     *  sweeps outward over this long, easing in and out. */
    spreadMs: number;
    /** Each edge grows from its near end to its far end over this long, eased,
     *  a lit point on its tip, the same trace as a rebuild after the intro. */
    edgeMs: number;
    /** A fill or a lit node fades in over this long once the trace has passed it. */
    settleMs: number;
  };
  /** The scroll handoff from the hero's field to the work section's. Each
   *  field's presence (0 = nothing drawn, 1 = the whole design) maps to a
   *  time on the intro's trace (presenceTime), so scrolling plays the trace
   *  top-down: the hero's backwards as it leaves, the work field's forwards
   *  as it enters. Fractions of the viewport height. */
  handoff: {
    /** The hero field is gone once the hero's bottom is this far from the
     *  viewport's top. */
    leaveEndAt: number;
    /** The work field starts tracing when the section's top is this far
     *  from the viewport's top... */
    enterStartAt: number;
    /** ...and is whole once it is this far. */
    enterEndAt: number;
  };
  maxDpr: number;
}

export const FIELD: FieldConfig = {
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
  },
  navBand: { rampCells: 1 },
  fade: {
    stops: [
      [0, 1],
      [0.45, 0.8],
      [0.75, 0.2],
    ],
    dropCells: 1,
  },
  pacing: {
    calmAtMs: 9200,
  },
  changes: {
    busy: { perSecond: 7, holdMinMs: 900, holdMaxMs: 2000, fadeMs: 900 },
    calm: { perSecond: 3.5, holdMinMs: 1500, holdMaxMs: 3500, fadeMs: 1100 },
    mix: { dissolve: 0.2, form: 0.25, rebuild: 0.25, recolour: 0.1, fill: 0.1, light: 0.1 },
    caps: { boundary: 14, body: 6, fillShare: 0.12, litShare: 0.15 },
    formChainMax: 3,
    formFillChance: 0.5,
    minChangeFade: 0.15,
  },
  intro: {
    traceStartMs: 300,
    spreadMs: 3600,
    edgeMs: 900,
    settleMs: 800,
  },
  handoff: {
    leaveEndAt: 0.4,
    enterStartAt: 1,
    enterEndAt: 0.3,
  },
  maxDpr: 2,
};

/** Same query as the mobile breakpoint in app/globals.css. */
export const MOBILE_QUERY = "(max-width: 560px)";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/** Overrides applied under MOBILE_QUERY. The design draws the same on every
 *  viewport; only the motion is calmer on a phone: half the rate, half the
 *  boundary and body caps. */
export const MOBILE_OVERRIDES: DeepPartial<FieldConfig> = {
  changes: {
    busy: { perSecond: 3.5 },
    calm: { perSecond: 1.75 },
    caps: { boundary: 7, body: 3 },
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

/** When the intro has traced every edge and settled every fill and lit node. */
export function introEndMs(cfg: FieldConfig): number {
  const { traceStartMs, spreadMs, edgeMs, settleMs } = cfg.intro;
  return traceStartMs + spreadMs + edgeMs + settleMs;
}

/**
 * The time on the intro's trace at which a field has presence `p` (0..1):
 * nothing is drawn at 0, the whole design at 1.
 */
export function presenceTime(cfg: FieldConfig, p: number): number {
  const { traceStartMs } = cfg.intro;
  return traceStartMs + p * (introEndMs(cfg) - traceStartMs);
}
