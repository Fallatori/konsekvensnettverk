import { createContext, useContext } from "react";

// Hover-to-isolate dimming - full opacity for the hovered node and whatever
// it connects to, faded for everything else. Not a strength/severity
// encoding, just a temporary decluttering aid while exploring dense graphs.
const HOVER_DIM_NODE_OPACITY = 0.28;
const HOVER_DIM_EDGE_OPACITY = 0.05;

export type GraphHoverContextValue = {
  hoveredNodeId: string | null;
  /** hoveredNodeId plus every node directly connected to it - null when
   * nothing is hovered. */
  relatedNodeIds: Set<string> | null;
};

const GraphHoverContext = createContext<GraphHoverContextValue>({
  hoveredNodeId: null,
  relatedNodeIds: null,
});

export const GraphHoverProvider = GraphHoverContext.Provider;

/**
 * Opacity is read by GaugeNode/FloatingEdge themselves, from context, rather
 * than by putting it on the node/edge objects passed to <ReactFlow>: React
 * Flow resets its own hover tracking whenever the nodes/edges array
 * references change, so recomputing them on every hover fights the very
 * interaction this is meant to support.
 */
export function useNodeHoverOpacity(nodeId: string): number {
  const { hoveredNodeId, relatedNodeIds } = useContext(GraphHoverContext);
  if (!hoveredNodeId) return 1;
  return relatedNodeIds?.has(nodeId) ? 1 : HOVER_DIM_NODE_OPACITY;
}

export function useEdgeHoverOpacity(sourceId: string, targetId: string): number {
  const { hoveredNodeId } = useContext(GraphHoverContext);
  if (!hoveredNodeId) return 1;
  return sourceId === hoveredNodeId || targetId === hoveredNodeId ? 1 : HOVER_DIM_EDGE_OPACITY;
}
