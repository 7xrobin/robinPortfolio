"use client";

import { useEffect, useRef } from "react";
import styles from "./TriangleField.module.css";
import {
  DESIGN,
  MOBILE_QUERY,
  fieldConfig,
  introEndMs,
  presenceTime,
  type FieldConfig,
} from "@/lib/field/config";
import { DESIGN_EDGES, DESIGN_FILLS, DESIGN_LIT, DESIGN_STUBS } from "@/lib/field/design";
import {
  eligible,
  excluded,
  pickChange,
  sample,
  smooth,
  type Change,
  type Eligible,
  type Excluded,
} from "@/lib/field/changes";
import { designShape, edgeKey, nodeKey, type EdgeKey } from "@/lib/field/shape";
import {
  cellNodes,
  designToSection,
  type CellId,
  fade,
  frameCentroid,
  latticeFrame,
  navBand,
  nodePosition,
  type LatticeFrame,
  type Point,
  type Rect,
} from "@/lib/field/lattice";

/** Rect of `el` relative to `base`, in CSS px. */
function relativeRect(el: Element, base: DOMRect): Rect {
  const r = el.getBoundingClientRect();
  return { left: r.left - base.left, top: r.top - base.top, width: r.width, height: r.height };
}

type NodeKey = readonly [r: number, c: number];

const clamp01 = (u: number) => Math.min(1, Math.max(0, u));

/** The order the trace reaches the design's elements in: outward from the
 *  frame centroid (the hero's intro), or top-down by `drop`. */
type TraceOrder = "centroid" | "fromTop" | "fromBottom";

/** A design node placed in the section. */
interface PlacedNode extends Point {
  fade: number;
  band: number;
}

interface PlacedEdge {
  key: EdgeKey;
  /** The end nearer the frame centroid: the intro traces a → b. */
  a: Point;
  b: Point;
  /** fade (mean of the two ends) × nav band (min of the two ends). */
  weight: number;
  /** Distance of `a` to the frame centroid. */
  dist: number;
  /** The edge, upper end first: the scroll handoff traces it top-down. */
  down: { a: Point; b: Point };
  /** How far down the design box the upper end sits, 0..1. */
  drop: number;
}

interface PlacedFill {
  cell: CellId;
  p: readonly [Point, Point, Point];
  colour: number;
  opacity: number;
  /** fade (mean of the three corners) × nav band (min of the three). */
  weight: number;
  /** Distance of the triangle's centroid to the frame centroid. */
  dist: number;
  /** How far down the design box the triangle's centroid sits, 0..1. */
  drop: number;
}

interface PlacedLit extends Point {
  key: string;
  weight: number;
  dist: number;
  drop: number;
}

interface FieldState {
  width: number;
  height: number;
  dpr: number;
  cfg: FieldConfig;
  g: LatticeFrame | null;
  edges: PlacedEdge[];
  /** Edges crossing the design's left edge; drawn clipped to the box. */
  stubs: PlacedEdge[];
  /** The design's 1280 × 760 box in section px; nothing is drawn outside it. */
  box: Rect;
  fills: PlacedFill[];
  lit: PlacedLit[];
  /** The farthest edge's `dist`: the intro trace has swept the design by then. */
  distMax: number;
  /** Places a node; set by place(). */
  at: (k: NodeKey) => PlacedNode;
  /** Where changes may go in this layout. */
  elig: Eligible | null;
}

/**
 * Places every design element in the section: positions, weights,
 * distances to the frame centroid, which time the intro trace, and drops
 * down the design box, which time the scroll handoff. The weights fold in
 * the design's horizontal fade and the nav band, so nothing reaches into the
 * nav bar.
 */
function place(
  st: FieldState,
  frame: Rect,
  navBottom: number | null,
  text: Rect | null,
  changes: boolean,
) {
  // The static field put design point (320, 138.6), node (0, 0) of the design
  // data, on the frame's left corner x and apex y — not on the apex, which is
  // design (560, 138.6), six cells right. Anchoring the lattice half a frame
  // to the left lands every element where the SVG drew it.
  const g = latticeFrame({ ...frame, left: frame.left - frame.width / 2 });
  st.g = g;
  const centre = frameCentroid(frame);
  const at = ([r, c]: NodeKey): PlacedNode => {
    const p = nodePosition(g, r, c);
    return { ...p, fade: fade(p.x, g, st.cfg.fade), band: navBand(p.y, navBottom, g.side, st.cfg.navBand) };
  };
  st.at = at;
  const dist = (x: number, y: number) => Math.hypot(x - centre.x, y - centre.y);
  const b0 = designToSection(g, 0, 0);
  const b1 = designToSection(g, DESIGN.width, DESIGN.height);
  st.box = { left: b0.x, top: b0.y, width: b1.x - b0.x, height: b1.y - b0.y };
  const drop = (y: number) => clamp01((y - st.box.top) / st.box.height);
  const edge = ([ka, kb]: readonly [NodeKey, NodeKey]): PlacedEdge => {
    let a = at(ka);
    let b = at(kb);
    let da = dist(a.x, a.y);
    const db = dist(b.x, b.y);
    if (db < da) {
      [a, b] = [b, a];
      da = db;
    }
    const down = a.y <= b.y ? { a, b } : { a: b, b: a };
    return {
      key: edgeKey(ka, kb),
      a,
      b,
      weight: ((a.fade + b.fade) / 2) * Math.min(a.band, b.band),
      dist: da,
      down,
      drop: drop(down.a.y),
    };
  };
  st.edges = DESIGN_EDGES.map(edge);
  st.stubs = DESIGN_STUBS.map(edge);
  st.fills = DESIGN_FILLS.map((f) => {
    const [p, q, r] = cellNodes(f.cell).map(at);
    return {
      cell: f.cell,
      p: [p, q, r] as const,
      colour: f.colour,
      opacity: f.opacity,
      weight: ((p.fade + q.fade + r.fade) / 3) * Math.min(p.band, q.band, r.band),
      dist: dist((p.x + q.x + r.x) / 3, (p.y + q.y + r.y) / 3),
      drop: drop((p.y + q.y + r.y) / 3),
    };
  });
  st.lit = DESIGN_LIT.map((k) => {
    const n = at(k);
    return {
      key: nodeKey(k),
      x: n.x,
      y: n.y,
      weight: n.fade * n.band,
      dist: dist(n.x, n.y),
      drop: drop(n.y),
    };
  });
  st.distMax = Math.max(1, ...st.edges.map((e) => e.dist), ...st.stubs.map((e) => e.dist));
  // The placement limits use the real frame (the portrait triangle), not
  // the shifted lattice anchor. A field without live changes has none.
  st.elig = !changes ? null : eligible(designShape(), { g, frame, text, navBottom, box: st.box }, st.cfg);
}

/**
 * Renders one lit node with its glow into `sprite`, at `dpr`. Returns the
 * sprite's size in CSS px; it is drawn centred on the node.
 */
function renderGlow(sprite: HTMLCanvasElement, st: FieldState): number {
  const s = st.g?.s ?? 1;
  const { radius, color, glowBlur, glowColor } = st.cfg.litNode;
  const r = radius * s;
  const blur = glowBlur * s;
  const size = 2 * (r + 2 * blur + 1);
  sprite.width = sprite.height = Math.max(1, Math.ceil(size * st.dpr));
  const ctx = sprite.getContext("2d");
  if (!ctx) return size;
  ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  // shadowBlur ignores the transform, so it is set in device pixels.
  ctx.shadowBlur = blur * st.dpr;
  ctx.shadowColor = glowColor;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
  ctx.fill();
  return size;
}

/** The design's line gradient, made on `ctx` (a gradient belongs to its context). */
function lineGradient(ctx: CanvasRenderingContext2D, st: FieldState): CanvasGradient | string {
  const { lines } = st.cfg;
  if (!st.g) return lines.stops[0];
  const p0 = designToSection(st.g, lines.from[0], lines.from[1]);
  const p1 = designToSection(st.g, lines.to[0], lines.to[1]);
  const grad = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
  lines.stops.forEach((c, i) => grad.addColorStop(i / Math.max(1, lines.stops.length - 1), c));
  return grad;
}

const NO_SKIP: Excluded = { edges: new Set(), fills: new Set(), lit: new Set() };

/** Clips `ctx` to the design box, like the SVG's own viewport. */
function clipToBox(ctx: CanvasRenderingContext2D, st: FieldState) {
  ctx.beginPath();
  ctx.rect(st.box.left, st.box.top, st.box.width, st.box.height);
  ctx.clip();
}

function fillTriangle(ctx: CanvasRenderingContext2D, [p, q, r]: readonly [Point, Point, Point]) {
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(q.x, q.y);
  ctx.lineTo(r.x, r.y);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draws the design's fills onto `ctx` (already transformed to CSS px), each
 * at its weight times `reveal(fill)`, leaving out the cells in `skip`.
 */
function renderFills(
  ctx: CanvasRenderingContext2D,
  st: FieldState,
  reveal: (f: PlacedFill) => number,
  skip: Excluded,
) {
  if (!st.g) return;
  const { fills } = st.cfg;
  ctx.save();
  clipToBox(ctx, st);
  for (const f of st.fills) {
    if (skip.fills.has(f.cell)) continue;
    const a = f.opacity * f.weight * reveal(f);
    if (a <= 0.001) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = fills.palette[f.colour];
    fillTriangle(ctx, f.p);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/**
 * Draws the design's edges, the clipped stubs and the lit nodes onto `ctx`,
 * each at its weight times `reveal(dist)`, leaving out what `skip` names.
 * The stubs show only their half inside the box, and the two lit nodes left
 * of it stay hidden.
 */
function renderLines(
  ctx: CanvasRenderingContext2D,
  st: FieldState,
  glow: HTMLCanvasElement,
  glowSize: number,
  reveal: (dist: number) => number,
  skip: Excluded,
) {
  if (!st.g) return;
  const { lines } = st.cfg;
  ctx.save();
  clipToBox(ctx, st);
  ctx.strokeStyle = lineGradient(ctx, st);
  ctx.lineWidth = lines.width * st.g.s;
  const stroke = (e: PlacedEdge) => {
    const a = lines.opacity * e.weight * reveal(e.dist);
    if (a <= 0.001) return;
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.moveTo(e.a.x, e.a.y);
    ctx.lineTo(e.b.x, e.b.y);
    ctx.stroke();
  };
  for (const e of st.edges) if (!skip.edges.has(e.key)) stroke(e);
  for (const e of st.stubs) stroke(e);

  const half = glowSize / 2;
  for (const n of st.lit) {
    if (skip.lit.has(n.key)) continue;
    const a = n.weight * reveal(n.dist);
    if (a <= 0.001) continue;
    ctx.globalAlpha = a;
    ctx.drawImage(glow, n.x - half, n.y - half, glowSize, glowSize);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/**
 * Draws the intro at `now`: every edge traced from its near end outward, a
 * lit point on its tip while it grows, starting later the farther it is from
 * the frame centroid; fills and lit nodes fade in once the trace has passed
 * them. It is the same trace a rebuild draws after the intro, over the whole
 * design.
 *
 * The scroll handoff draws the same trace in another `order`: `fromTop`
 * starts each element later the lower it sits in the design box, and
 * `fromBottom` the higher, so played backwards the top goes first. Both
 * grow every edge from its upper end down.
 */
function renderTrace(
  ctx: CanvasRenderingContext2D,
  st: FieldState,
  glow: HTMLCanvasElement,
  glowSize: number,
  now: number,
  order: TraceOrder,
) {
  if (!st.g) return;
  const { lines, intro } = st.cfg;
  const key = (el: { dist: number; drop: number }) =>
    order === "centroid" ? el.dist / st.distMax : order === "fromTop" ? el.drop : 1 - el.drop;
  const start = (k: number) => intro.traceStartMs + intro.spreadMs * smooth(k);
  const settle = (el: { dist: number; drop: number }) =>
    smooth((now - start(key(el)) - intro.edgeMs) / intro.settleMs);
  renderFills(ctx, st, settle, NO_SKIP);

  ctx.save();
  clipToBox(ctx, st);
  ctx.strokeStyle = lineGradient(ctx, st);
  ctx.lineWidth = lines.width * st.g.s;
  const tipSize = glowSize * 1.5;
  // Tips go on after every line, so no line is drawn over a lit point.
  const tips: (Point & { w: number })[] = [];
  const trace = (e: PlacedEdge) => {
    const drawn = smooth((now - start(key(e))) / intro.edgeMs);
    if (drawn <= 0 || e.weight <= 0.001) return;
    const { a, b } = order === "centroid" ? e : e.down;
    const tip = { x: a.x + (b.x - a.x) * drawn, y: a.y + (b.y - a.y) * drawn };
    // Brighter while it grows, settling to the line opacity, as a rebuild does.
    const lift = Math.sin(Math.PI * drawn);
    ctx.globalAlpha = e.weight * (lines.opacity + (1 - lines.opacity) * lift);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    if (drawn < 0.999) tips.push({ ...tip, w: e.weight });
  };
  for (const e of st.edges) trace(e);
  for (const e of st.stubs) trace(e);

  for (const t of tips) {
    ctx.globalAlpha = t.w;
    ctx.drawImage(glow, t.x - tipSize / 2, t.y - tipSize / 2, tipSize, tipSize);
  }
  const half = glowSize / 2;
  for (const n of st.lit) {
    const a = n.weight * settle(n);
    if (a <= 0.001) continue;
    ctx.globalAlpha = a;
    ctx.drawImage(glow, n.x - half, n.y - half, glowSize, glowSize);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/**
 * The triangle field: the design's own triangles, fills and lit nodes on a
 * canvas filling its section, anchored on the section's `data-field="frame"`
 * element, faded to the right like the design and kept below the nav bar.
 *
 * The hero mounts it with `handoff="leave"`: the intro traces it edge by edge
 * outward from the frame centroid; after it, triangles dissolve and form
 * along the edge of the shape, chains of new triangles grow out of it,
 * triangles in the body are erased and traced again edge by edge, fills
 * change colour and points light and fade, each going back to the design
 * (lib/field/changes.ts). Scrolling away, it dissolves from the top down,
 * and its changes resume once it is fully back.
 *
 * The work section mounts it with `handoff="enter"`: a smaller copy behind
 * the cards, traced in from the top down as the section scrolls in, with no
 * live changes.
 */
export default function TriangleField({ handoff }: { handoff: "leave" | "enter" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !section || !ctx) return;

    const pick = (name: string) => section.querySelector<HTMLElement>(`[data-field="${name}"]`);
    const frameEl = pick("frame");
    const navEl = pick("nav");
    const textEl = pick("text");
    if (!frameEl) return;

    const mobile = window.matchMedia(MOBILE_QUERY);
    // Read `matches` once, then follow the change events. Chrome drops a change
    // event when `matches` is read between the switch and the notification,
    // so the hot paths read this flag instead.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = reduce.matches;
    // The design is cached in two layers, fills under lines, so a changing
    // fill is drawn between them as the design orders it.
    const fillLayer = document.createElement("canvas");
    const lineLayer = document.createElement("canvas");
    const glow = document.createElement("canvas");
    let glowSize = 0;
    let lineStyle: CanvasGradient | string = "#000";
    const st: FieldState = {
      width: 0,
      height: 0,
      dpr: 1,
      cfg: fieldConfig(mobile.matches),
      g: null,
      edges: [],
      stubs: [],
      box: { left: 0, top: 0, width: 0, height: 0 },
      fills: [],
      lit: [],
      distMax: 1,
      at: () => ({ x: 0, y: 0, fade: 0, band: 0 }),
      elig: null,
    };

    // Live changes, timed on the field clock: it only advances while the loop
    // runs, so a paused field resumes where it stopped.
    let live: Change[] = [];
    let clock = 0;
    let lastNow = -1;
    let due = 0;
    /** The cached layers no longer match the live changes. */
    let layersDirty = true;
    /** How far the hero has scrolled away, 0..1: its field's presence is 1 − leave. */
    let leave = 0;
    /** How far the work section has scrolled in, 0..1: its field's presence. */
    let enter = 0;

    /** The hero's leave progress, from where the section sits in the viewport. */
    const leaveProgress = () => {
      const rect = section.getBoundingClientRect();
      const end = rect.height - st.cfg.handoff.leaveEndAt * window.innerHeight;
      return clamp01(-rect.top / Math.max(1, end));
    };

    /** The work section's enter progress, from where it sits in the viewport. */
    const enterProgress = () => {
      const { enterStartAt, enterEndAt } = st.cfg.handoff;
      const vh = window.innerHeight;
      const rect = section.getBoundingClientRect();
      return clamp01((enterStartAt * vh - rect.top) / Math.max(1, (enterStartAt - enterEndAt) * vh));
    };

    const buildLayers = () => {
      layersDirty = false;
      const skip = live.length ? excluded(live) : NO_SKIP;
      for (const [layer, part] of [
        [fillLayer, "fills"],
        [lineLayer, "lines"],
      ] as const) {
        layer.width = canvas.width;
        layer.height = canvas.height;
        const lctx = layer.getContext("2d");
        if (!lctx) continue;
        lctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
        lctx.clearRect(0, 0, st.width, st.height);
        if (part === "fills") renderFills(lctx, st, () => 1, skip);
        else renderLines(lctx, st, glow, glowSize, () => 1, skip);
      }
    };

    const measure = () => {
      const base = section.getBoundingClientRect();
      st.cfg = fieldConfig(mobile.matches);
      st.width = base.width;
      st.height = base.height;
      st.dpr = Math.min(window.devicePixelRatio || 1, st.cfg.maxDpr);
      const frame = relativeRect(frameEl, base);
      const nav = navEl ? relativeRect(navEl, base) : null;
      const text = textEl ? relativeRect(textEl, base) : null;

      canvas.width = Math.max(1, Math.round(st.width * st.dpr));
      canvas.height = Math.max(1, Math.round(st.height * st.dpr));

      if (frame.width > 0) {
        place(st, frame, nav ? nav.top + nav.height : null, text, handoff === "leave");
      } else {
        st.g = null;
        st.elig = null;
      }
      glowSize = renderGlow(glow, st);
      lineStyle = lineGradient(ctx, st);

      // Live changes were placed for the old layout: drop them, the design
      // is drawn whole again.
      live = [];
      buildLayers();
    };

    /** Draws the live changes' fills (between the layers) or lines and points (on top). */
    const drawChanges = (part: "fills" | "lines") => {
      if (!st.g || !live.length) return;
      const { lines, fills } = st.cfg;
      for (const ch of live) {
        const s = sample(ch, clock, fills.palette);
        if (part === "fills") {
          if (!s.fill) continue;
          const [p, q, r] = cellNodes(s.fill.cell).map(st.at);
          const w = ((p.fade + q.fade + r.fade) / 3) * Math.min(p.band, q.band, r.band);
          const a = s.fill.opacity * w;
          if (a <= 0.001) continue;
          ctx.globalAlpha = a;
          ctx.fillStyle = s.fill.colour;
          fillTriangle(ctx, [p, q, r]);
          continue;
        }
        ctx.strokeStyle = lineStyle;
        ctx.lineWidth = lines.width * st.g.s;
        const half = glowSize / 2;
        for (const e of s.edges) {
          if (e.drawn <= 0.001) continue;
          const a = st.at(e.a);
          const b = st.at(e.b);
          const w = ((a.fade + b.fade) / 2) * Math.min(a.band, b.band);
          const tip = { x: a.x + (b.x - a.x) * e.drawn, y: a.y + (b.y - a.y) * e.drawn };
          // An edge in motion is brighter than the design's, settling back to
          // the line opacity at both ends of its trace.
          const lift = Math.sin(Math.PI * e.drawn);
          ctx.globalAlpha = w * (lines.opacity + (1 - lines.opacity) * lift);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(tip.x, tip.y);
          ctx.stroke();
          // A lit point rides the tip while the edge grows or shrinks: the
          // connection being made or undone.
          if (e.drawn < 0.999) {
            const size = glowSize * 1.5;
            ctx.globalAlpha = w;
            ctx.drawImage(glow, tip.x - size / 2, tip.y - size / 2, size, size);
          }
        }
        for (const l of s.lit) {
          const n = st.at(l.node);
          const alpha = n.fade * n.band * l.alpha;
          if (alpha <= 0.001) continue;
          ctx.globalAlpha = alpha;
          ctx.drawImage(glow, n.x - half, n.y - half, glowSize, glowSize);
        }
      }
      ctx.globalAlpha = 1;
    };

    // During the intro the design is drawn element by element as the trace
    // reaches it; once every edge is traced and every fill settled, the cached
    // layers take over, with the live changes drawn on them. The time is
    // absolute, so a late hydration joins the trace where it already is
    // instead of restarting it. Scrolling away plays the trace backwards to
    // the hero's presence: during the intro on the intro's own order, after
    // it top-down, so the top rows go first. The work field has no intro:
    // scrolling in traces it top-down to its presence.
    const draw = (now: number) => {
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, st.width, st.height);
      if (handoff === "enter") {
        if (reduced || enter >= 1) {
          ctx.drawImage(fillLayer, 0, 0, st.width, st.height);
          ctx.drawImage(lineLayer, 0, 0, st.width, st.height);
        } else {
          renderTrace(ctx, st, glow, glowSize, presenceTime(st.cfg, enter), "fromTop");
        }
        return;
      }
      const shown = presenceTime(st.cfg, 1 - leave);
      if (!reduced && now < introEndMs(st.cfg)) {
        renderTrace(ctx, st, glow, glowSize, Math.min(now, shown), "centroid");
        return;
      }
      if (!reduced && leave > 0) {
        renderTrace(ctx, st, glow, glowSize, shown, "fromBottom");
        return;
      }
      ctx.drawImage(fillLayer, 0, 0, st.width, st.height);
      drawChanges("fills");
      ctx.drawImage(lineLayer, 0, 0, st.width, st.height);
      drawChanges("lines");
    };

    /**
     * Advances the changes by `dt` ms of field time: ends the ones that are
     * over, then starts new ones at the busy rate until pacing.calmAtMs and
     * the calm rate after it. A start or an end marks the layers for one
     * rebuild this frame.
     */
    const step = (now: number, dt: number) => {
      clock += dt;
      const before = live.length;
      live = live.filter((ch) => ch.end > clock);
      if (live.length !== before) layersDirty = true;
      if (!st.elig) return;
      const pace = now < st.cfg.pacing.calmAtMs ? st.cfg.changes.busy : st.cfg.changes.calm;
      due += (dt / 1000) * pace.perSecond;
      while (due >= 1) {
        due -= 1;
        const ch = pickChange(live, designShape(), st.elig, st.cfg, pace, Math.random, clock);
        if (ch) {
          live.push(ch);
          layersDirty = true;
        }
      }
    };

    // Resizes only mark the field dirty; the next frame re-measures once, so a
    // resize while paused is picked up on resume.
    let dirty = true;
    let raf = 0;
    let stillRaf = 0;
    const markDirty = () => {
      dirty = true;
      if (reduced) scheduleStill();
      else if (handoff === "enter") schedule();
    };

    // The work field has no loop: it moves only with the scroll, so a scroll
    // or a resize asks for one frame, and the frame draws only when the
    // presence or the layout changed. Once whole, it stays on the layers.
    let drawnEnter = -1;
    const scrollFrame = () => {
      raf = 0;
      const measured = dirty;
      if (dirty) {
        dirty = false;
        measure();
      }
      enter = enterProgress();
      if (!measured && enter === drawnEnter) return;
      drawnEnter = enter;
      draw(Infinity);
    };
    function schedule() {
      if (!raf && !reduced && onScreen) raf = requestAnimationFrame(scrollFrame);
    }

    // Reduced motion: one static frame, the design at rest, and no loop. It is
    // redrawn only when the geometry changes.
    const still = () => {
      stillRaf = 0;
      if (dirty) {
        dirty = false;
        measure();
      }
      if (layersDirty) buildLayers();
      draw(Infinity);
    };
    function scheduleStill() {
      if (!stillRaf) stillRaf = requestAnimationFrame(still);
    }

    const tick = () => {
      const now = performance.now();
      // A long gap (a paused loop) counts as one frame.
      const dt = lastNow < 0 ? 0 : Math.min(50, Math.max(0, now - lastNow));
      lastNow = now;
      if (dirty) {
        dirty = false;
        measure();
      }
      if (handoff === "leave") leave = leaveProgress();
      if (leave > 0) {
        // Scrolled away: the trace plays the design, so the live changes
        // are dropped, and none start until the hero is fully back.
        if (live.length) {
          live = [];
          layersDirty = true;
        }
      } else if (now >= introEndMs(st.cfg)) {
        step(now, dt);
      }
      if (layersDirty) buildLayers();
      draw(now);
      raf = requestAnimationFrame(tick);
    };

    // The loop runs only while the hero is on screen and the tab is visible.
    // The work field's IntersectionObserver only gates its scroll frames.
    let onScreen = true;
    const sync = () => {
      if (handoff === "enter") {
        schedule();
        return;
      }
      const visible = !reduced && onScreen && document.visibilityState === "visible";
      if (visible && !raf) {
        lastNow = -1;
        raf = requestAnimationFrame(tick);
      } else if (!visible && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      sync();
    });
    io.observe(section);
    document.addEventListener("visibilitychange", sync);
    const onScroll = () => schedule();
    if (handoff === "enter") window.addEventListener("scroll", onScroll, { passive: true });

    const onMotionChange = (e: MediaQueryListEvent) => {
      reduced = e.matches;
      if (reduced) {
        // The still frame is the design itself: no change survives.
        live = [];
        layersDirty = true;
        sync();
        scheduleStill();
      } else {
        cancelAnimationFrame(stillRaf);
        stillRaf = 0;
        // The still frame drew the layers: the work field redraws its trace.
        drawnEnter = -1;
        sync();
      }
    };
    reduce.addEventListener("change", onMotionChange);

    const ro = new ResizeObserver(markDirty);
    for (const el of [section, frameEl, navEl, textEl]) if (el) ro.observe(el);
    document.fonts.ready.then(markDirty, () => {});
    if (reduced) scheduleStill();
    sync();

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("scroll", onScroll);
      reduce.removeEventListener("change", onMotionChange);
      ro.disconnect();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(stillRaf);
      raf = 0;
      stillRaf = 0;
    };
  }, [handoff]);

  return <canvas ref={canvasRef} className={styles.field} aria-hidden="true" />;
}
