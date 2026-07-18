import type { InternalNode } from "@xyflow/react";

/** "graf" nodes are circular gauge dials; "lys"/"terminal" nodes are
 * rectangular cards - each shape needs its own boundary-intersection math
 * below (see NodeBoundary). */
export type NodeBoundary = { shape: "circle"; radius: number } | { shape: "rect"; halfWidth: number; halfHeight: number };

/** Node center in absolute flow coordinates (positionAbsolute is top-left). */
function nodeCenter(node: InternalNode): { x: number; y: number } {
  const width = node.measured?.width ?? 0;
  const height = node.measured?.height ?? 0;
  return {
    x: node.internals.positionAbsolute.x + width / 2,
    y: node.internals.positionAbsolute.y + height / 2,
  };
}

/** Where a ray from `center` in unit direction (ux, uy) exits `boundary`. */
function boundaryPoint(
  center: { x: number; y: number },
  ux: number,
  uy: number,
  boundary: NodeBoundary,
): { x: number; y: number } {
  if (boundary.shape === "circle") {
    return { x: center.x + ux * boundary.radius, y: center.y + uy * boundary.radius };
  }
  // Axis-aligned rectangle: the ray hits whichever of the two edge planes
  // (vertical at halfWidth, horizontal at halfHeight) it reaches first.
  const tX = ux !== 0 ? boundary.halfWidth / Math.abs(ux) : Infinity;
  const tY = uy !== 0 ? boundary.halfHeight / Math.abs(uy) : Infinity;
  const t = Math.min(tX, tY);
  return { x: center.x + ux * t, y: center.y + uy * t };
}

/**
 * Floating-edge endpoints (Kumu-style): rather than snapping to a fixed
 * handle position (which is what causes many edges to converge on the exact
 * same point and overlap in a hierarchical layout), compute where the
 * straight line between two node centers crosses each node's own boundary
 * (circle or rect card, per the active theme). Works for any node
 * arrangement, not just top-to-bottom trees.
 */
export function floatingEdgePoints(
  source: InternalNode,
  target: InternalNode,
  sourceBoundary: NodeBoundary,
  targetBoundary: NodeBoundary,
): { sx: number; sy: number; tx: number; ty: number } {
  const sourceCenter = nodeCenter(source);
  const targetCenter = nodeCenter(target);

  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;
  const distance = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / distance;
  const uy = dy / distance;

  const s = boundaryPoint(sourceCenter, ux, uy, sourceBoundary);
  const t = boundaryPoint(targetCenter, -ux, -uy, targetBoundary);

  return { sx: s.x, sy: s.y, tx: t.x, ty: t.y };
}

/** A small perpendicular bow so that edges read as smooth organic curves
 * (matching the reference's curved-connection look) instead of dead-straight
 * lines that fully overlap whenever two node centers happen to align. The
 * bow direction/magnitude is derived from the edge id, so it's stable across
 * re-renders without needing extra state. */
export function curvedPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  edgeId: string,
): { path: string; mid: { x: number; y: number } } {
  const midX = (sx + tx) / 2;
  const midY = (sy + ty) / 2;

  const dx = tx - sx;
  const dy = ty - sy;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  // Perpendicular unit vector.
  const px = -dy / length;
  const py = dx / length;

  const bowSeed = hashString(edgeId);
  const bowMagnitude = length * 0.12 * (0.4 + (bowSeed % 100) / 100); // ~5-15% of edge length
  const bowSign = bowSeed % 2 === 0 ? 1 : -1;

  const controlX = midX + px * bowMagnitude * bowSign;
  const controlY = midY + py * bowMagnitude * bowSign;

  // On-curve midpoint (quadratic Bezier at t=0.5) - where the severity marker
  // is drawn, so it sits on the visible curve rather than at the straight
  // sx/tx midpoint (which drifts off the curve as the bow grows).
  const mid = {
    x: 0.25 * sx + 0.5 * controlX + 0.25 * tx,
    y: 0.25 * sy + 0.5 * controlY + 0.25 * ty,
  };

  return { path: `M ${sx},${sy} Q ${controlX},${controlY} ${tx},${ty}`, mid };
}

export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}
