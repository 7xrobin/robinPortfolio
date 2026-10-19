// Triangle forms for the hero field: shape generators, outline chaining and
// placement on the lattice. No DOM, no React. Every random choice goes through
// an injected `rand()` returning [0, 1), so the logic stays testable.

import { FIELD, type FieldConfig } from "./config";
import {
  cellCentroid,
  cellId,
  cellNeighbours,
  cellNodes,
  cellsAroundNode,
  nodeAt,
  odd,
  type CellId,
  type Lattice,
  type LatticeNode,
  type NodeKey,
  type Point,
  type Rect,
  type Size,
} from "./lattice";

export type Rand = () => number;

/** A form placed on the lattice, ready to animate. */
export interface Form {
  /** Its cells, in the order they fill. */
  cells: CellId[];
  /** The three lattice nodes of each cell, parallel to `cells`. */
  cellCorners: [LatticeNode, LatticeNode, LatticeNode][];
  /** The closed outline in walk order; the last node joins back to the first. */
  path: LatticeNode[];
  /** Fill colour, or null for an outline-only form. */
  fill: string | null;
  /** One fill opacity per cell, parallel to `cells` (empty when unfilled). */
  cellOpacity: number[];
}

/** What a form must stay clear of, in section px. */
export interface Obstacles {
  section: Size;
  /** The frame's bounding rect; its triangle is apex top-centre, base along the bottom. */
  frame: Rect | null;
  text: Rect | null;
}

/** The area revealed so far. `r = Infinity` means everything. */
export interface Revealed {
  centre: Point;
  r: number;
}

function pick<T>(items: readonly T[], rand: Rand): T {
  return items[Math.min(items.length - 1, Math.floor(rand() * items.length))];
}

function hxOf(r: number, c: number): number {
  return 2 * c + (odd(r) ? 1 : 0);
}

// ---- Generators ------------------------------------------------------------

/** A random polyiamond of 1–6 cells, grown from `seed` by edge-neighbours. */
export function polyiamond(seed: CellId, rand: Rand): CellId[] {
  const size = 1 + Math.floor(rand() * 6);
  const cells = [seed];
  const held = new Set(cells);
  for (let guard = 0; cells.length < size && guard < 64; guard++) {
    const next = pick(cellNeighbours(pick(cells, rand)), rand);
    if (held.has(next)) continue;
    held.add(next);
    cells.push(next);
  }
  return cells;
}

/**
 * A large triangle of side 2 or 3 (4 or 9 cells) with its apex on node
 * (r, c), pointing up (apex on top) or down (apex at the bottom).
 */
export function largeTriangle(r: number, c: number, rand: Rand): CellId[] {
  const side = rand() < 0.5 ? 2 : 3;
  const up = rand() < 0.5;
  const hx = hxOf(r, c);
  const cells: CellId[] = [];
  for (let i = 0; i < side; i++) {
    const strip = up ? r + i : r - 1 - i;
    for (let k = hx - (i + 1); k <= hx + i - 1; k++) cells.push(cellId(strip, k));
  }
  return cells;
}

/** The hexagon of the six cells around node (r, c). */
export function hexagon(r: number, c: number): CellId[] {
  return cellsAroundNode(r, c);
}

// ---- Outline ---------------------------------------------------------------

function nodeKey(r: number, c: number): string {
  return `${r},${c}`;
}

/**
 * The outline of a set of cells as one closed node path, in walk order.
 * Boundary edges are those used by exactly one cell. Returns null unless every
 * boundary node has exactly two boundary edges and one walk visits them all,
 * which rejects holes (two loops) and pinch points (a node of degree 4).
 */
export function outline(cells: readonly CellId[]): NodeKey[] | null {
  if (cells.length === 0) return null;
  const edges = new Map<string, { a: NodeKey; b: NodeKey; count: number }>();
  for (const id of cells) {
    const ns = cellNodes(id);
    for (let i = 0; i < 3; i++) {
      const a = ns[i];
      const b = ns[(i + 1) % 3];
      const ka = nodeKey(a[0], a[1]);
      const kb = nodeKey(b[0], b[1]);
      const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      const e = edges.get(key);
      if (e) e.count++;
      else edges.set(key, { a, b, count: 1 });
    }
  }

  const adj = new Map<string, { node: NodeKey; next: NodeKey[] }>();
  let boundary = 0;
  for (const { a, b, count } of edges.values()) {
    if (count !== 1) continue;
    boundary++;
    for (const [p, q] of [
      [a, b],
      [b, a],
    ] as const) {
      const k = nodeKey(p[0], p[1]);
      const entry = adj.get(k);
      if (entry) entry.next.push(q);
      else adj.set(k, { node: p, next: [q] });
    }
  }
  if (boundary < 3) return null;
  for (const { next } of adj.values()) if (next.length !== 2) return null;

  const [start] = adj.values();
  const path: NodeKey[] = [start.node];
  let prev = start.node;
  let cur = start.next[0];
  let walked = 1;
  while (nodeKey(cur[0], cur[1]) !== nodeKey(start.node[0], start.node[1])) {
    path.push(cur);
    const { next } = adj.get(nodeKey(cur[0], cur[1]))!;
    const forward = nodeKey(next[0][0], next[0][1]) === nodeKey(prev[0], prev[1]) ? next[1] : next[0];
    prev = cur;
    cur = forward;
    walked++;
    if (walked > boundary) return null;
  }
  return walked === boundary ? path : null;
}

// ---- Placement -------------------------------------------------------------

function inRect(p: Point, r: Rect | null): boolean {
  return !!r && p.x >= r.left && p.x <= r.left + r.width && p.y >= r.top && p.y <= r.top + r.height;
}

/** True when `p` lies strictly inside the frame triangle. */
function inFrame(p: Point, f: Rect | null): boolean {
  if (!f) return false;
  const ax = f.left + f.width / 2;
  const ay = f.top;
  const bx = f.left + f.width;
  const by = f.top + f.height;
  const cx = f.left;
  const cy = by;
  const cross = (x1: number, y1: number, x2: number, y2: number) =>
    (x2 - x1) * (p.y - y1) - (y2 - y1) * (p.x - x1);
  const d1 = cross(ax, ay, bx, by);
  const d2 = cross(bx, by, cx, cy);
  const d3 = cross(cx, cy, ax, ay);
  return (d1 > 0 && d2 > 0 && d3 > 0) || (d1 < 0 && d2 < 0 && d3 < 0);
}

function generate(node: LatticeNode, rand: Rand, mix: FieldConfig["formMix"]): CellId[] {
  const total = mix.polyiamond + mix.largeTriangle + mix.hexagon;
  const u = rand() * total;
  if (u < mix.polyiamond) return polyiamond(pick(cellsAroundNode(node.r, node.c), rand), rand);
  if (u < mix.polyiamond + mix.largeTriangle) return largeTriangle(node.r, node.c, rand);
  return hexagon(node.r, node.c);
}

/**
 * Tries up to `cfg.formMix.attempts` random seeds and returns the first form
 * that passes every check, or null. A candidate is rejected when any of its
 * nodes is in the logo zone or its ramp (clean < 1), is too faded to see, lies
 * outside the section, inside the text rect or beyond the revealed radius;
 * when any cell centroid is inside the frame triangle or in the text rect; or
 * when any cell is already held by a live form.
 */
export function place(
  lattice: Lattice,
  live: readonly Pick<Form, "cells">[],
  obstacles: Obstacles,
  revealed: Revealed,
  rand: Rand,
  cfg: FieldConfig = FIELD,
): Form | null {
  const held = new Set<CellId>();
  for (const f of live) for (const id of f.cells) held.add(id);

  const { section, frame, text } = obstacles;
  const minFade = cfg.fade.minFormFade;
  const nodeOk = (n: LatticeNode) =>
    n.clean >= 1 &&
    n.fade >= minFade &&
    n.x >= 0 &&
    n.x <= section.width &&
    n.y >= 0 &&
    n.y <= section.height &&
    !inRect(n, text) &&
    Math.hypot(n.x - revealed.centre.x, n.y - revealed.centre.y) <= revealed.r;

  // Seeds come from nodes that could carry a form at all.
  const seeds = lattice.nodes.filter(nodeOk);
  if (seeds.length === 0) return null;

  attempts: for (let a = 0; a < cfg.formMix.attempts; a++) {
    const cells = generate(pick(seeds, rand), rand, cfg.formMix);
    const corners: [LatticeNode, LatticeNode, LatticeNode][] = [];
    for (const id of cells) {
      if (held.has(id)) continue attempts;
      const c = cellCentroid(lattice, id);
      if (inFrame(c, frame) || inRect(c, text)) continue attempts;
      const ns = cellNodes(id).map(([r, col]) => nodeAt(lattice, r, col));
      if (ns.some((n) => !n || !nodeOk(n))) continue attempts;
      corners.push(ns as [LatticeNode, LatticeNode, LatticeNode]);
    }
    const keys = outline(cells);
    if (!keys) continue;
    const path = keys.map(([r, c]) => nodeAt(lattice, r, c)!);

    const filled = rand() < cfg.fills.chance;
    const { palette, opacityMin, opacityMax } = cfg.fills;
    return {
      cells,
      cellCorners: corners,
      path,
      fill: filled ? pick(palette, rand) : null,
      cellOpacity: filled ? cells.map(() => opacityMin + rand() * (opacityMax - opacityMin)) : [],
    };
  }
  return null;
}
