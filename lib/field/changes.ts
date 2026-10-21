// Picks the hero field's changes and samples them over time. Pure: no DOM,
// no React; every random choice goes through a `Rand`.
//
// The edge of the shape moves (dissolve / form, a form can grow a chain of up
// to `formChainMax` cells out of the shape), triangles in the body are
// rebuilt (rebuild: their edges erase one by one and draw back), colours
// shift (recolour, fill, unfill) and points light and fade (light / dim).
// Edges are traced, not faded: a new edge grows from one node to the other,
// a removed one shrinks back. The structure is kept by rules:
// - every change fades in, holds, fades out and is then gone, so the field
//   always goes back to the design;
// - caps on how many changes are live per group;
// - no live change on the same or an adjacent cell (cells sharing a corner);
// - no change in the nav band or its ramp, in the frame triangle, in the text
//   rect, outside the design box or where the design's fade is below
//   `minChangeFade`.

import type { ChangePacing, FieldConfig } from "./config";
import {
  cellCentroid,
  cellNeighbours,
  cellNodes,
  cellsAroundNode,
  fade,
  inFrame,
  inRect,
  navBand,
  nodePosition,
  type CellId,
  type LatticeFrame,
  type NodeKey,
  type Point,
  type Rect,
} from "./lattice";
import { cellEdges, nodeKey, type BoundaryTriangle, type EdgeKey, type FrontierCell, type Shape } from "./shape";

export type Rand = () => number;

export type ChangeKind = "dissolve" | "form" | "rebuild" | "recolour" | "fill" | "unfill" | "light" | "dim";

/** A fill's look: an index into FIELD.fills.palette and an opacity. */
export interface FillLook {
  colour: number;
  opacity: number;
}

export interface ChangeEdge {
  a: NodeKey;
  b: NodeKey;
  key: EdgeKey;
}

export interface Change {
  kind: ChangeKind;
  /** Cells the change occupies, for the adjacency rule. */
  footprint: CellId[];
  /** Design edges that fade out, then back. */
  edgesOut: ChangeEdge[];
  /** Edges the design lacks that fade in, then away. */
  edgesIn: ChangeEdge[];
  /** The fill cell, if the change touches a fill. */
  fillCell: CellId | null;
  /** The design's fill on that cell (null: none). */
  fillFrom: FillLook | null;
  /** The fill while the change holds (null: none). */
  fillTo: FillLook | null;
  /** Design lit nodes that go dark, then come back. */
  litOut: NodeKey[];
  /** Nodes that light up, then go dark. */
  litIn: NodeKey[];
  start: number;
  fadeMs: number;
  holdMs: number;
  /** start + 2 × fadeMs + holdMs: the change is over, the design is back. */
  end: number;
}

/** Where on screen the field is, to apply the placement limits. */
export interface Placement {
  /** The lattice frame the design is drawn with. */
  g: LatticeFrame;
  /** The real frame rect (the portrait triangle). */
  frame: Rect;
  text: Rect | null;
  navBottom: number | null;
  /** The design's 1280 × 760 box in section px. */
  box: Rect;
}

/** The parts of the shape where a change may go, for one placement. */
export interface Eligible {
  boundary: BoundaryTriangle[];
  frontier: FrontierCell[];
  /** Closed triangles that may be rebuilt. */
  closed: CellId[];
  /** Whether any cell may take a change (a form chain checks each cell it grows into). */
  ok: (id: CellId) => boolean;
  /** Design fills that may recolour or fade out. */
  fills: CellId[];
  /** Closed triangles without fill that may gain one. */
  unfilled: CellId[];
  /** Design lit nodes that may go dark. */
  lit: NodeKey[];
  /** Unlit corners of the shape that may light up. */
  dark: NodeKey[];
}

/** Applies the placement limits to the shape. */
export function eligible(shape: Shape, p: Placement, cfg: FieldConfig): Eligible {
  const { g } = p;
  const box: Rect = { left: p.box.left - 0.5, top: p.box.top - 0.5, width: p.box.width + 1, height: p.box.height + 1 };
  const pointOk = (pt: Point) =>
    inRect(pt, box) &&
    !inFrame(pt, p.frame) &&
    !inRect(pt, p.text) &&
    navBand(pt.y, p.navBottom, g.side, cfg.navBand) >= 1 &&
    fade(pt.x, g, cfg.fade) >= cfg.changes.minChangeFade;
  const nodeOk = ([r, c]: NodeKey) => pointOk(nodePosition(g, r, c));
  const cellOk = (id: CellId) => cellNodes(id).every(nodeOk) && pointOk(cellCentroid(g, id));

  return {
    boundary: shape.boundary.filter((b) => cellOk(b.cell)),
    frontier: shape.frontier.filter((f) => f.missing.length > 0 && cellOk(f.cell)),
    closed: shape.closed.filter(cellOk),
    ok: cellOk,
    fills: [...shape.fills.keys()].filter(cellOk),
    unfilled: shape.unfilled.filter(cellOk),
    lit: [...shape.lit.values()].filter(nodeOk),
    dark: shape.dark.filter(nodeOk),
  };
}

type Group = "boundary" | "body" | "fill" | "lit";

const GROUP: Record<ChangeKind, Group> = {
  dissolve: "boundary",
  form: "boundary",
  rebuild: "body",
  recolour: "fill",
  fill: "fill",
  unfill: "fill",
  light: "lit",
  dim: "lit",
};

function pick<T>(items: readonly T[], rand: Rand): T | undefined {
  return items.length ? items[Math.floor(rand() * items.length) % items.length] : undefined;
}

/** Cells that share a corner with any of `cells` (including themselves). */
function near(cells: readonly CellId[]): Set<CellId> {
  const out = new Set<CellId>();
  for (const id of cells) for (const [r, c] of cellNodes(id)) for (const n of cellsAroundNode(r, c)) out.add(n);
  return out;
}

function randomLook(cfg: FieldConfig, rand: Rand): FillLook {
  const { palette, opacityMin, opacityMax } = cfg.fills;
  return {
    colour: Math.floor(rand() * palette.length) % palette.length,
    opacity: opacityMin + rand() * (opacityMax - opacityMin),
  };
}

/** Another look for a design fill: another colour, or another opacity. */
function otherLook(from: FillLook, cfg: FieldConfig, rand: Rand): FillLook {
  const { palette, opacityMin, opacityMax } = cfg.fills;
  if (rand() < 0.6) {
    const step = 1 + (Math.floor(rand() * (palette.length - 1)) % (palette.length - 1));
    return { colour: (from.colour + step) % palette.length, opacity: from.opacity };
  }
  // Move the opacity at least a third of the range, inside the range.
  const span = opacityMax - opacityMin;
  const up = from.opacity + span / 3 <= opacityMax;
  const down = from.opacity - span / 3 >= opacityMin;
  const goUp = up && (!down || rand() < 0.5);
  const lo = goUp ? from.opacity + span / 3 : opacityMin;
  const hi = goUp ? opacityMax : from.opacity - span / 3;
  return { colour: from.colour, opacity: lo + rand() * Math.max(0, hi - lo) };
}

function chooseKind(mix: FieldConfig["changes"]["mix"], rand: Rand): ChangeKind {
  const entries = Object.entries(mix) as [keyof typeof mix, number][];
  const total = entries.reduce((s, [, w]) => s + Math.max(0, w), 0);
  let x = rand() * total;
  let kind: keyof typeof mix = entries[entries.length - 1][0];
  for (const [k, w] of entries) {
    x -= Math.max(0, w);
    if (x < 0) {
      kind = k;
      break;
    }
  }
  if (kind === "fill") return rand() < 0.5 ? "fill" : "unfill";
  if (kind === "light") return rand() < 0.5 ? "light" : "dim";
  return kind;
}

const ATTEMPTS = 8;

/**
 * Picks one new change under the caps and rules, or null when the chosen kind
 * is capped or finds no free place. `live` are the changes still running.
 */
export function pickChange(
  live: readonly Change[],
  shape: Shape,
  elig: Eligible,
  cfg: FieldConfig,
  pace: ChangePacing,
  rand: Rand,
  now: number,
): Change | null {
  const c = cfg.changes;
  const kind = chooseKind(c.mix, rand);
  const group = GROUP[kind];
  const count = live.filter((ch) => GROUP[ch.kind] === group).length;
  const cap =
    group === "boundary"
      ? c.caps.boundary
      : group === "body"
        ? c.caps.body
        : group === "fill"
        ? Math.floor(c.caps.fillShare * shape.fills.size)
        : Math.floor(c.caps.litShare * shape.lit.size);
  if (count >= cap) return null;

  const taken = near(live.flatMap((ch) => ch.footprint));
  const free = (cells: CellId[]) => cells.every((id) => !taken.has(id));
  const holdMs = pace.holdMinMs + rand() * (pace.holdMaxMs - pace.holdMinMs);
  const base = { start: now, fadeMs: pace.fadeMs, holdMs, end: now + 2 * pace.fadeMs + holdMs };
  const none = {
    edgesOut: [] as ChangeEdge[],
    edgesIn: [] as ChangeEdge[],
    fillCell: null as CellId | null,
    fillFrom: null as FillLook | null,
    fillTo: null as FillLook | null,
    litOut: [] as NodeKey[],
    litIn: [] as NodeKey[],
  };
  const designLook = (id: CellId): FillLook | null => {
    const f = shape.fills.get(id);
    return f ? { colour: f.colour, opacity: f.opacity } : null;
  };

  for (let i = 0; i < ATTEMPTS; i++) {
    switch (kind) {
      case "dissolve": {
        const b = pick(elig.boundary, rand);
        if (!b || !free([b.cell])) continue;
        return {
          kind,
          footprint: [b.cell],
          ...none,
          edgesOut: b.outer.map((key) => ({ ...shape.edges.get(key)!, key })),
          fillCell: shape.fills.has(b.cell) ? b.cell : null,
          fillFrom: designLook(b.cell),
          litOut: b.corners.filter((n) => shape.lit.has(nodeKey(n))),
          ...base,
        };
      }
      case "form": {
        const f = pick(elig.frontier, rand);
        if (!f || !free([f.cell])) continue;
        // Grow a chain out of the shape: each next cell shares an edge with the
        // last one, is not closed and passes the placement limits.
        const cells = [f.cell];
        const edgesIn: ChangeEdge[] = f.missing.map((e) => ({ ...e }));
        const seen = new Set(edgesIn.map((e) => e.key));
        const extra = Math.floor(rand() * c.formChainMax);
        for (let k = 0; k < extra; k++) {
          const options = cellNeighbours(cells[cells.length - 1]).filter(
            (n) => !shape.closedSet.has(n) && !cells.includes(n) && elig.ok(n) && free([n]),
          );
          const next = pick(options, rand);
          if (next === undefined) break;
          cells.push(next);
          for (const e of cellEdges(next)) {
            if (shape.edges.has(e.key) || seen.has(e.key)) continue;
            seen.add(e.key);
            edgesIn.push(e);
          }
        }
        const fill = rand() < c.formFillChance;
        const fillCell = cells[cells.length - 1];
        return {
          kind,
          footprint: cells,
          ...none,
          edgesIn,
          fillCell: fill ? fillCell : null,
          fillTo: fill ? randomLook(cfg, rand) : null,
          ...base,
        };
      }
      case "rebuild": {
        const id = pick(elig.closed, rand);
        if (id === undefined || !free([id])) continue;
        // The corners stay lit while the edges erase and draw back.
        return { kind, footprint: [id], ...none, edgesOut: cellEdges(id), ...base };
      }
      case "recolour":
      case "unfill": {
        const id = pick(elig.fills, rand);
        if (id === undefined || !free([id])) continue;
        const from = designLook(id)!;
        return {
          kind,
          footprint: [id],
          ...none,
          fillCell: id,
          fillFrom: from,
          fillTo: kind === "recolour" ? otherLook(from, cfg, rand) : null,
          ...base,
        };
      }
      case "fill": {
        const id = pick(elig.unfilled, rand);
        if (id === undefined || !free([id])) continue;
        return { kind, footprint: [id], ...none, fillCell: id, fillTo: randomLook(cfg, rand), ...base };
      }
      case "light":
      case "dim": {
        const n = pick(kind === "light" ? elig.dark : elig.lit, rand);
        if (!n) continue;
        const cells = cellsAroundNode(n[0], n[1]);
        if (!free(cells)) continue;
        return {
          kind,
          footprint: cells,
          ...none,
          litIn: kind === "light" ? [n] : [],
          litOut: kind === "dim" ? [n] : [],
          ...base,
        };
      }
    }
  }
  return null;
}

/** What a set of live changes takes out of the cached design layer. */
export interface Excluded {
  edges: Set<EdgeKey>;
  fills: Set<CellId>;
  lit: Set<string>;
}

export function excluded(live: readonly Change[]): Excluded {
  const out: Excluded = { edges: new Set(), fills: new Set(), lit: new Set() };
  for (const ch of live) {
    for (const e of ch.edgesOut) out.edges.add(e.key);
    if (ch.fillCell !== null && ch.fillFrom) out.fills.add(ch.fillCell);
    for (const n of ch.litOut) out.lit.add(nodeKey(n));
  }
  return out;
}

/** Smoothstep on u clamped to 0..1: the ease every field motion uses. */
export const smooth = (u: number) => {
  const v = u < 0 ? 0 : u > 1 ? 1 : u;
  return v * v * (3 - 2 * v);
};

/** How far a change is from the design at `t`: 0 → 1 (fade in), 1 (hold), 1 → 0 (fade out). */
export function progress(ch: Change, t: number): number {
  const u = t - ch.start;
  if (u <= 0 || t >= ch.end) return 0;
  if (u < ch.fadeMs) return smooth(u / ch.fadeMs);
  if (u < ch.fadeMs + ch.holdMs) return 1;
  return smooth((ch.end - t) / ch.fadeMs);
}

export interface ChangeSample {
  /** Each edge drawn from `a` towards `b` over this share of its length (0 → 1). */
  edges: { a: NodeKey; b: NodeKey; drawn: number }[];
  /** The changed cell's fill now (absolute opacity, before fade), if any. */
  fill: { cell: CellId; colour: string; opacity: number } | null;
  /** Each lit node with its alpha, as a share of a design lit node. */
  lit: { node: NodeKey; alpha: number }[];
}

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixColour(a: string, b: string, u: number): string {
  if (u <= 0) return a;
  if (u >= 1) return b;
  const [r0, g0, b0] = hexRgb(a);
  const [r1, g1, b1] = hexRgb(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * u);
  return `rgb(${m(r0, r1)}, ${m(g0, g1)}, ${m(b0, b1)})`;
}

/**
 * Every element a change draws at `t`: edges it removes shrink back towards
 * their first node and grow again, those it adds grow from their first node
 * and shrink away, one after the other in list order, so a triangle is traced
 * edge by edge. Lit nodes it removes fade out and back, those it adds fade in
 * and away, and its fill cross-fades from
 * the design's look to the held look and back (colour and opacity together).
 */
export function sample(ch: Change, t: number, palette: readonly string[]): ChangeSample {
  const u = progress(ch, t);
  const trace = (list: readonly ChangeEdge[], out: boolean) =>
    list.map((e, i) => {
      const local = smooth(u * list.length - i);
      return { a: e.a, b: e.b, drawn: out ? 1 - local : local };
    });
  const edges = [...trace(ch.edgesOut, true), ...trace(ch.edgesIn, false)];
  const lit = [...ch.litOut.map((node) => ({ node, alpha: 1 - u })), ...ch.litIn.map((node) => ({ node, alpha: u }))];
  let fill: ChangeSample["fill"] = null;
  if (ch.fillCell !== null && (ch.fillFrom || ch.fillTo)) {
    const from = ch.fillFrom;
    const to = ch.fillTo;
    if (from && to) {
      fill = {
        cell: ch.fillCell,
        colour: mixColour(palette[from.colour], palette[to.colour], u),
        opacity: from.opacity + (to.opacity - from.opacity) * u,
      };
    } else if (from) {
      fill = { cell: ch.fillCell, colour: palette[from.colour], opacity: from.opacity * (1 - u) };
    } else if (to) {
      fill = { cell: ch.fillCell, colour: palette[to.colour], opacity: to.opacity * u };
    }
  }
  return { edges, fill, lit };
}
