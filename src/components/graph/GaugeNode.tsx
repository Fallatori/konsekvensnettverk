import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { ConsequenceLabel, NodeSubtype } from "@/lib/calc/mappings";
import { GaugeIndicator } from "@/components/graph/GaugeIndicator";
import { SUBTYPE_FILL_COLORS } from "@/lib/ui/subtypeColors";
import { useNodeHoverOpacity } from "@/components/graph/graphHoverContext";

export type GaugeNodeData = {
  label: string;
  /** null only for the hendelse (root event) node. */
  category: ConsequenceLabel | null;
  isHendelse: boolean;
  subtype: NodeSubtype;
};

export type GaugeNodeType = Node<GaugeNodeData, "gauge">;

// Edges are "floating" (see FloatingEdge.tsx) and compute their own
// attachment points from each node's live center + radius - these handles
// exist only because React Flow requires at least one source/target handle
// per node to accept an edge; their fixed top/bottom position is otherwise
// meaningless now that the layout isn't a strict top-down tree, so they're
// hidden rather than shown as (misleading) fixed connection points.
const HIDDEN_HANDLE_STYLE = { visibility: "hidden" as const };

export function GaugeNode({ id, data }: NodeProps<GaugeNodeType>) {
  const opacity = useNodeHoverOpacity(id);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 96, opacity }}>
      <Handle type="target" position={Position.Top} style={HIDDEN_HANDLE_STYLE} />
      {data.isHendelse ? (
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: SUBTYPE_FILL_COLORS[data.subtype],
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            textAlign: "center",
            padding: 4,
            boxShadow: `0 0 16px ${SUBTYPE_FILL_COLORS[data.subtype]}99`,
          }}
        >
          {data.label}
        </div>
      ) : (
        <div style={{ filter: `drop-shadow(0 0 10px ${SUBTYPE_FILL_COLORS[data.subtype]}80)` }}>
          <GaugeIndicator
            category={data.category ?? "ingen"}
            size={64}
            label={data.label}
            fillColor={SUBTYPE_FILL_COLORS[data.subtype]}
          />
        </div>
      )}
      <div style={{ fontSize: 12, maxWidth: 96, textAlign: "center", lineHeight: 1.2 }}>{data.label}</div>
      <Handle type="source" position={Position.Bottom} style={HIDDEN_HANDLE_STYLE} />
    </div>
  );
}
