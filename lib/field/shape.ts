// The design's shape, derived once from lib/field/design.ts. Pure: no DOM,
// no React, no screen geometry.
//
// - Closed triangles: cells with all three edges drawn.
// - Edge use: for every edge, how many closed triangles have it.
// - Boundary triangles: closed triangles with an edge no other closed
//   triangle shares (use 1). Those edges are its outer edges; dissolving the
//   triangle removes only them, so the body never gets a hole.
// - Frontier cells: cells that are not closed but share an edge with a closed
//   triangle. Forming one draws its missing edges, so a new triangle only
//   ever appears against the shape.

import { DESIGN_EDGES, DESIGN_FILLS, DESIGN_LIT } from "./design";
import { cellNeighbours, cellNodes, cellsAroundNode, type CellId, type NodeKey } from "./lattice";

/** A canonical edge key, "r0,c0|r1,c1" with the ends sorted. */
export type EdgeKey = string;

export function nodeKey([r, c]: NodeKey): string {
  return `${r},${c}`;
}

export function edgeKey(a: NodeKey, b: NodeKey): EdgeKey {
  const ka = nodeKey(a);
  const kb = nodeKey(b);
  const aFirst = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  return aFirst ? `${ka}|${kb}` : `${kb}|${ka}`;
}

/** The three edges of a cell, each as its node pair and key. */
export function cellEdges(id: CellId): { a: NodeKey; b: NodeKey; key: EdgeKey }[] {
  const [p, q, r] = cellNodes(id);
  return [
    [p, q],
    [q, r],
    [p, r],
  ].map(([a, b]) => ({ a, b, key: edgeKey(a, b) }));
}

export interface BoundaryTriangle {
  cell: CellId;
  /** Edges no other closed triangle uses. */
  outer: EdgeKey[];
  /** Corners whose every design edge is outer: they float once it dissolves. */
  corners: NodeKey[];
}

export interface FrontierCell {
  cell: CellId;
  /** The cell's edges the design does not draw. */
  missing: { a: NodeKey; b: NodeKey; key: EdgeKey }[];
}

export interface Shape {
  /** Every design edge by key. */
  edges: Map<EdgeKey, { a: NodeKey; b: NodeKey }>;
  closed: CellId[];
  closedSet: Set<CellId>;
  /** Closed triangles using each design edge (0, 1 or 2). */
  edgeUse: Map<EdgeKey, number>;
  boundary: BoundaryTriangle[];
  frontier: FrontierCell[];
  /** Design fills by cell. */
  fills: Map<CellId, (typeof DESIGN_FILLS)[number]>;
  /** Closed triangles with no design fill. */
  unfilled: CellId[];
  /** Design lit nodes, by node key. */
  lit: Map<string, NodeKey>;
  /** Corners of closed triangles that the design does not light. */
  dark: NodeKey[];
}

export function buildShape(): Shape {
  const edges = new Map<EdgeKey, { a: NodeKey; b: NodeKey }>();
  const nodeEdges = new Map<string, EdgeKey[]>();
  for (const [a, b] of DESIGN_EDGES) {
    const key = edgeKey(a, b);
    edges.set(key, { a, b });
    for (const n of [a, b]) {
      const k = nodeKey(n);
      const list = nodeEdges.get(k);
      if (list) list.push(key);
      else nodeEdges.set(k, [key]);
    }
  }

  // Every cell touching a drawn edge: the cells fanned around its ends.
  const candidates = new Set<CellId>();
  for (const { a } of edges.values()) for (const id of cellsAroundNode(a[0], a[1])) candidates.add(id);

  const closed: CellId[] = [];
  const closedSet = new Set<CellId>();
  for (const id of candidates) {
    if (cellEdges(id).every((e) => edges.has(e.key))) {
      closed.push(id);
      closedSet.add(id);
    }
  }
  closed.sort((x, y) => x - y);

  const edgeUse = new Map<EdgeKey, number>();
  for (const key of edges.keys()) edgeUse.set(key, 0);
  for (const id of closed) for (const e of cellEdges(id)) edgeUse.set(e.key, (edgeUse.get(e.key) ?? 0) + 1);

  const boundary: BoundaryTriangle[] = [];
  for (const id of closed) {
    const outer = cellEdges(id)
      .filter((e) => edgeUse.get(e.key) === 1)
      .map((e) => e.key);
    if (outer.length === 0) continue;
    const outerSet = new Set(outer);
    const corners = cellNodes(id).filter((n) =>
      (nodeEdges.get(nodeKey(n)) ?? []).every((k) => outerSet.has(k)),
    );
    boundary.push({ cell: id, outer, corners });
  }

  const frontierSet = new Set<CellId>();
  for (const id of closed) for (const n of cellNeighbours(id)) if (!closedSet.has(n)) frontierSet.add(n);
  const frontier: FrontierCell[] = [...frontierSet]
    .sort((x, y) => x - y)
    .map((cell) => ({ cell, missing: cellEdges(cell).filter((e) => !edges.has(e.key)) }));

  const fills = new Map(DESIGN_FILLS.map((f) => [f.cell, f]));
  const unfilled = closed.filter((id) => !fills.has(id));

  const lit = new Map(DESIGN_LIT.map((n) => [nodeKey(n), n]));
  const darkMap = new Map<string, NodeKey>();
  for (const id of closed) {
    for (const n of cellNodes(id)) {
      const k = nodeKey(n);
      if (!lit.has(k)) darkMap.set(k, n);
    }
  }

  return {
    edges,
    closed,
    closedSet,
    edgeUse,
    boundary,
    frontier,
    fills,
    unfilled,
    lit,
    dark: [...darkMap.values()],
  };
}

let cached: Shape | null = null;

/** The shape, built on first use. */
export function designShape(): Shape {
  return (cached ??= buildShape());
}
