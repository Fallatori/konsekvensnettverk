"use client";

import { useEffect, useMemo, useState } from "react";
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCollide,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from "d3-force";
import { ReactFlow, Controls, MarkerType, useReactFlow, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ComputedEdge, ComputedNode } from "@/lib/calc/recompute";
import { NODE_SUBTYPES, nearestConsequenceLabel, type ConsequenceLabel } from "@/lib/calc/mappings";
import { GaugeNode, type GaugeNodeType } from "@/components/graph/GaugeNode";
import { FloatingEdge, EDGE_WIRE_COLOR, type FloatingEdgeType } from "@/components/graph/FloatingEdge";
import { NODE_HEIGHT, NODE_RADIUS, NODE_WIDTH } from "@/components/graph/layoutConstants";
import { SeverityLegend } from "@/components/graph/SeverityLegend";
import { GraphHoverProvider } from "@/components/graph/graphHoverContext";

const nodeTypes = { gauge: GaugeNode };
const edgeTypes = { floating: FloatingEdge };

const SIMULATION_TICKS = 500;
const LINK_DISTANCE = 190;
const CHARGE_STRENGTH = -700;
const CHARGE_MAX_DISTANCE = 700;
const COLUMN_SPACING = 260;
const ROW_SPACING = 140;
// How strongly nodes are pulled back toward their assigned column/row versus
// left to settle wherever charge/link/collide puts them. X is firm (columns
// must stay columns); Y is loose (natural vertical spacing within a column).
const COLUMN_ANCHOR_STRENGTH = 0.55;
const ROW_ANCHOR_STRENGTH = 0.06;

const INDIRECT_EDGE_WIDTH = 2;
const MAX_INDIRECT_POINTS = 20; // INDIRECT_IMPACT_POINTS["svært store"] - see lib/calc/mappings.ts

/** Indirect strength reads as opacity, not width - color itself is the
 * source->target subtype gradient. */
function indirectEdgeOpacity(points: number): number {
  return Math.min(1, 0.25 + 0.75 * (points / MAX_INDIRECT_POINTS));
}

type SimNode = SimulationNodeDatum & { id: string; anchorX: number; anchorY: number };

/**
 * Column key per the layout rules:
 * 1. hazard (hendelse) nodes on one side,
 * 2. samfunnsfunksjon nodes on the other, grouped so same-subtype nodes
 *    share one line,
 * 3. nodes added by the indirect toggle get their own line.
 */
function columnKey(node: ComputedNode): string {
  if (node.isHendelse) return "hazard";
  if (!node.isDirect) return "indirect";
  return `direct:${node.subtype}`;
}

/** Column order left-to-right: hazard, then each present samfunnsfunksjon
 * subtype (in the mappings.ts NODE_SUBTYPES order, so it's stable across
 * recomputes), then indirect last. */
function columnOrder(nodes: ComputedNode[]): string[] {
  const present = new Set(nodes.map(columnKey));
  const order: string[] = [];
  if (present.has("hazard")) order.push("hazard");
  for (const subtype of NODE_SUBTYPES) {
    const key = `direct:${subtype}`;
    if (present.has(key)) order.push(key);
  }
  if (present.has("indirect")) order.push("indirect");
  return order;
}

/** Each node's target column (fixed x) and row (initial y, softly anchored)
 * - the structured starting point that the force simulation then refines. */
function computeAnchors(nodes: ComputedNode[]): Map<string, { x: number; y: number }> {
  const order = columnOrder(nodes);
  const columnIndex = new Map(order.map((key, i) => [key, i]));

  const byColumn = new Map<string, ComputedNode[]>();
  for (const node of nodes) {
    const key = columnKey(node);
    (byColumn.get(key) ?? byColumn.set(key, []).get(key)!).push(node);
  }

  const anchors = new Map<string, { x: number; y: number }>();
  for (const [key, groupNodes] of byColumn) {
    const x = (columnIndex.get(key) ?? 0) * COLUMN_SPACING;
    const sorted = [...groupNodes].sort((a, b) => a.id.localeCompare(b.id));
    sorted.forEach((node, i) => {
      const y = (i - (sorted.length - 1) / 2) * ROW_SPACING;
      anchors.set(node.id, { x, y });
    });
  }
  return anchors;
}

/**
 * Hybrid layout: a structured column arrangement (hazard | samfunnsfunksjon
 * by subtype | indirect) provides each node's target position, then a force
 * simulation (repulsion + link attraction + collision) refines it - nodes
 * are softly anchored to their column/row rather than hard-pinned, so the
 * result stays organized but still settles into natural, non-overlapping
 * spacing the way a pure grid wouldn't.
 */
function layoutWithForce(nodes: ComputedNode[], gaugeNodes: GaugeNodeType[], edges: Edge[]): GaugeNodeType[] {
  const anchors = computeAnchors(nodes);

  const simNodes: SimNode[] = gaugeNodes.map((node) => {
    const anchor = anchors.get(node.id) ?? { x: 0, y: 0 };
    return { id: node.id, x: anchor.x, y: anchor.y, anchorX: anchor.x, anchorY: anchor.y };
  });

  const simulation = forceSimulation(simNodes)
    .force("charge", forceManyBody().strength(CHARGE_STRENGTH).distanceMax(CHARGE_MAX_DISTANCE))
    .force(
      "link",
      forceLink<SimNode, { source: string; target: string }>(
        edges.map((edge) => ({ source: edge.source, target: edge.target })),
      ).id((node) => node.id).distance(LINK_DISTANCE),
      // strength left at d3's default (degree-adaptive) - a fixed strength
      // pulls a densely-connected graph (many indirect edges) into a tight
      // "hairball" instead of letting repulsion/collision spread it out.
    )
    .force("collide", forceCollide(NODE_RADIUS + 32).iterations(2))
    .force("x", forceX<SimNode>((node) => node.anchorX).strength(COLUMN_ANCHOR_STRENGTH))
    .force("y", forceY<SimNode>((node) => node.anchorY).strength(ROW_ANCHOR_STRENGTH))
    .stop();

  for (let i = 0; i < SIMULATION_TICKS; i++) simulation.tick();

  const settled = new Map<string, { x: number; y: number }>();
  for (const simNode of simNodes) {
    settled.set(simNode.id, { x: simNode.x ?? 0, y: simNode.y ?? 0 });
  }

  return gaugeNodes.map((node) => {
    const position = settled.get(node.id) ?? { x: 0, y: 0 };
    return { ...node, position: { x: position.x - NODE_WIDTH / 2, y: position.y - NODE_HEIGHT / 2 } };
  });
}

/** The `fitView` prop only fits once on mount - toggling indirect (or
 * switching scenarios) changes how many columns/nodes exist, so without
 * this the view stays zoomed to the old bounds and new columns render
 * off-screen. Must be rendered inside <ReactFlow> to reach its context. */
function FitViewOnDataChange({ nodeIdsKey }: { nodeIdsKey: string }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    const frame = requestAnimationFrame(() => fitView({ duration: 300 }));
    return () => cancelAnimationFrame(frame);
  }, [nodeIdsKey, fitView]);

  return null;
}

export function ScenarioGraph({
  nodes,
  edges,
  onNodeClick,
  onEdgeClick,
}: {
  nodes: ComputedNode[];
  edges: ComputedEdge[];
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
}) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // hoveredNodeId is deliberately NOT a dependency of this memo (or passed
  // via the node/edge objects at all): React Flow resets its own hover
  // tracking whenever the nodes/edges array references change, so
  // recomputing them (and re-running the 500-tick force simulation) on every
  // hover would fight the very interaction this is meant to support.
  // GaugeNode/FloatingEdge read hover state from GraphHoverProvider instead
  // (see graphHoverContext.ts) and apply their own opacity locally.
  const { rfNodes, rfEdges } = useMemo(() => {
    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const severityFor = (nodeId: string): ConsequenceLabel => nodesById.get(nodeId)?.consequenceCategory ?? "ingen";

    const baseNodes: GaugeNodeType[] = nodes.map((node) => ({
      id: node.id,
      type: "gauge",
      position: { x: 0, y: 0 },
      data: {
        label: node.label,
        category: node.isHendelse ? null : nearestConsequenceLabel(node.totalConsequenceValue),
        isHendelse: node.isHendelse,
        subtype: node.subtype,
      },
    }));

    const baseEdges: FloatingEdgeType[] = edges.map((edge) => ({
      id: edge.id,
      source: edge.parentId,
      target: edge.childId,
      type: "floating",
      // markerUnits "userSpaceOnUse" keeps the arrowhead a constant size -
      // by default it scales with strokeWidth, which made it look huge on
      // thicker direct edges.
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 9,
        height: 9,
        markerUnits: "userSpaceOnUse",
        color: EDGE_WIRE_COLOR,
      },
      data: { kind: edge.kind, severity: severityFor(edge.childId) },
      style:
        edge.kind === "DIRECT"
          ? { strokeWidth: 1 + edge.connectionLevel }
          : // Indirect strength reads as opacity, not width - width stays
            // fixed so the two edge kinds are easy to tell apart
            // regardless of indirect-impact strength.
            { strokeWidth: INDIRECT_EDGE_WIDTH, strokeOpacity: indirectEdgeOpacity(edge.connectionLevel) },
    }));

    return { rfNodes: layoutWithForce(nodes, baseNodes, baseEdges), rfEdges: baseEdges };
  }, [nodes, edges]);

  // Adjacency is structural (from edges alone), so it's stable across hovers;
  // only the small "which set is currently active" result depends on
  // hoveredNodeId.
  const neighborsByNodeId = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const edge of edges) {
      (map.get(edge.parentId) ?? map.set(edge.parentId, new Set()).get(edge.parentId)!).add(edge.childId);
      (map.get(edge.childId) ?? map.set(edge.childId, new Set()).get(edge.childId)!).add(edge.parentId);
    }
    return map;
  }, [edges]);

  const hoverContextValue = useMemo(() => {
    if (!hoveredNodeId) return { hoveredNodeId: null, relatedNodeIds: null };
    const related = new Set(neighborsByNodeId.get(hoveredNodeId) ?? []);
    related.add(hoveredNodeId);
    return { hoveredNodeId, relatedNodeIds: related };
  }, [hoveredNodeId, neighborsByNodeId]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <GraphHoverProvider value={hoverContextValue}>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={(_event, node) => onNodeClick?.(node.id)}
          onEdgeClick={(_event, edge) => onEdgeClick?.(edge.id)}
          onNodeMouseEnter={(_event, node) => setHoveredNodeId(node.id)}
          onNodeMouseLeave={() => setHoveredNodeId(null)}
          fitView
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
        >
          <FitViewOnDataChange nodeIdsKey={rfNodes.map((n) => n.id).sort().join(",")} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </GraphHoverProvider>
      <SeverityLegend />
    </div>
  );
}
