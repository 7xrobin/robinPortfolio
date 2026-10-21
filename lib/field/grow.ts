// The work section's field: triangles grown on the hero's lattice, so they
// read as the hero's field continuing down the page. No DOM, no React.
//
// Which cells hold a triangle is a seeded value noise over the lattice,
// thinned out to the right like the design, so the same layout always grows
// the same field.

import type { FadeStop, FieldConfig } from "./config";
import type { DesignFill } from "./design";
import {
  cellCentroid,
  cellId,
  cellNodes,
  type CellId,
  type LatticeFrame,
  type NodeKey,
  type Rect,
} from "./lattice";
import { cellEdges, nodeKey } from "./shape";

export interface GrownField {
  edges: (readonly [NodeKey, NodeKey])[];
  fills: DesignFill[];
  lit: NodeKey[];
}

const SQRT3_2 = Math.sqrt(3) / 2;

/** A stable 0..1 hash of two integers and a seed. */
function hash(a: number, b: number, seed: number): number {
  let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(seed, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth value noise, 0..1, on a grid of unit cells. */
function noise(x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const ease = (u: number) => u * u * (3 - 2 * u);
  const u = ease(x - x0);
  const v = ease(y - y0);
  const top = hash(x0, y0, 1) + (hash(x0 + 1, y0, 1) - hash(x0, y0, 1)) * u;
  const bottom = hash(x0, y0 + 1, 1) + (hash(x0 + 1, y0 + 1, 1) - hash(x0, y0 + 1, 1)) * u;
  return top + (bottom - top) * v;
}

/** The value of (t, value) stops at t, held flat past both ends. */
export function stopsAt(stops: readonly FadeStop[], t: number): number {
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [t1, v1] = stops[i];
    if (t <= t1) {
      const [t0, v0] = stops[i - 1];
      return v0 + ((t - t0) / (t1 - t0)) * (v1 - v0);
    }
  }
  return stops[stops.length - 1][1];
}

/**
 * Grows a field over `area` (section px) on the lattice `g`: every cell
 * whose strip lies inside the area holds a triangle where the noise is
 * under the density at its x, ramped in below the area's top. Edges are
 * the union of the triangles' edges; some triangles take a fill and some of
 * their nodes are lit.
 */
export function growField(g: LatticeFrame, area: Rect, cfg: FieldConfig["grow"]): GrownField {
  const rowHeight = g.side * SQRT3_2;
  const rMin = Math.ceil((area.top - g.apexY) / rowHeight);
  const rMax = Math.floor((area.top + area.height - g.apexY) / rowHeight) - 1;
  const kMin = Math.floor((2 * (area.left - g.apexX)) / g.side) - 2;
  const kMax = Math.ceil((2 * (area.left + area.width - g.apexX)) / g.side);

  const cells: CellId[] = [];
  for (let r = rMin; r <= rMax; r++) {
    for (let k = kMin; k <= kMax; k++) {
      const id = cellId(r, k);
      const p = cellCentroid(g, id);
      const t = (p.x - area.left) / area.width;
      const ramp = Math.min(1, (p.y - area.top) / (cfg.topRampCells * g.side));
      const n = noise((p.x - g.apexX) / g.side / cfg.clusterCells, (p.y - g.apexY) / g.side / cfg.clusterCells);
      if (n < stopsAt(cfg.density, t) * ramp) cells.push(id);
    }
  }

  const edges = new Map<string, readonly [NodeKey, NodeKey]>();
  const lit = new Map<string, NodeKey>();
  const fills: DesignFill[] = [];
  for (const id of cells) {
    for (const e of cellEdges(id)) edges.set(e.key, [e.a, e.b]);
    if (hash(id, 0, 2) < cfg.fillChance) {
      const { opacityMin, opacityMax } = cfg.fillOpacity;
      fills.push({
        cell: id,
        colour: Math.floor(hash(id, 0, 3) * 3) as 0 | 1 | 2,
        opacity: opacityMin + (opacityMax - opacityMin) * hash(id, 0, 4),
      });
    }
    for (const n of cellNodes(id)) {
      if (hash(n[0], n[1], 5) < cfg.litChance) lit.set(nodeKey(n), n);
    }
  }
  return { edges: [...edges.values()], fills, lit: [...lit.values()] };
}
