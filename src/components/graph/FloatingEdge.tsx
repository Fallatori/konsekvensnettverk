import { BaseEdge, useInternalNode, type Edge, type EdgeProps } from "@xyflow/react";
import { curvedPath, floatingEdgePoints, type NodeBoundary } from "@/components/graph/floatingEdgeGeometry";
import { useEdgeHoverOpacity } from "@/components/graph/graphHoverContext";
import { useCurrentTheme } from "@/lib/styles/context";
import { THEME_NODE_LAYOUT } from "@/lib/styles/tokens";
import type { GaugeNodeType } from "@/components/graph/GaugeNode";

export type FloatingEdgeData = {
  kind: "DIRECT" | "INDIRECT";
};

export type FloatingEdgeType = Edge<FloatingEdgeData, "floating">;

// Flat gray "wire" stroke shared by every edge, in every theme - reads the
// --edge-wire custom property, which is the same gray in every [data-theme]
// block (see globals.css) rather than a per-theme accent, so the connection
// style is one single look across "graf"/"lys"/"terminal". Fully opaque -
// EDGE_BASE_OPACITY below is what makes edges translucent, so it's the one
// thing controlling how strongly overlapping edges combine.
export const EDGE_WIRE_COLOR = "var(--edge-wire)";
// Every connection renders at this base opacity, so a single edge reads as
// soft/muted but two or more crossing at the same point visibly compound
// into a stronger color (plain SVG alpha stacking - no blend-mode trick
// needed). Multiplied with the per-edge strokeOpacity ScenarioGraph.tsx
// already sets for indirect edges (their own strength signal), not replaced
// by it.
const EDGE_BASE_OPACITY = 0.55;

/**
 * Kumu-style floating edge: connects wherever the straight line between the
 * two nodes' current centers crosses their boundaries (circle or rect card,
 * per the active theme), with a gentle curve - rather than snapping to a
 * fixed handle position on a hierarchical layout. This is what lets many
 * edges fan out naturally instead of converging on the same point and
 * overlapping.
 *
 * Every edge is a flat gray line (EDGE_WIRE_COLOR), translucent
 * (EDGE_BASE_OPACITY) so crossing edges visibly compound into a stronger
 * color where they overlap. Which hop the edge represents - scenario ->
 * direct impact, or direct -> indirect impact - is shown by strokeWidth
 * alone (see ScenarioGraph.tsx: DIRECT_EDGE_WIDTH/INDIRECT_EDGE_WIDTH), not
 * by color, so the same look applies in every theme.
 */
export function FloatingEdge({ id, source, target, markerEnd, style }: EdgeProps<FloatingEdgeType>) {
  const sourceNode = useInternalNode<GaugeNodeType>(source);
  const targetNode = useInternalNode<GaugeNodeType>(target);
  const opacity = useEdgeHoverOpacity(source, target);
  const theme = useCurrentTheme();

  if (!sourceNode || !targetNode) return null;

  const layout = THEME_NODE_LAYOUT[theme];
  const boundary: NodeBoundary =
    layout.shape === "circle"
      ? { shape: "circle", radius: layout.radius }
      : { shape: "rect", halfWidth: layout.width / 2, halfHeight: layout.height / 2 };

  const { sx, sy, tx, ty } = floatingEdgePoints(sourceNode, targetNode, boundary, boundary);
  const { path } = curvedPath(sx, sy, tx, ty, id);

  // Multiplied, not overwritten - indirect edges already carry their own
  // strokeOpacity (impact strength, see ScenarioGraph.tsx); direct edges
  // have none set, so `?? 1` leaves EDGE_BASE_OPACITY as the only factor.
  const strokeOpacity = EDGE_BASE_OPACITY * (typeof style?.strokeOpacity === "number" ? style.strokeOpacity : 1);

  const edgeStyle = { ...style, stroke: EDGE_WIRE_COLOR, strokeOpacity };

  return (
    <g opacity={opacity}>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={edgeStyle} />
    </g>
  );
}
