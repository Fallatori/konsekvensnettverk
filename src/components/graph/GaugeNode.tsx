import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { ConsequenceLabel, NodeSubtype } from "@/lib/calc/mappings";
import { NODE_SUBTYPE_LABEL } from "@/lib/calc/mappings";
import { GaugeIndicator } from "@/components/graph/GaugeIndicator";
import { useNodeHoverOpacity } from "@/components/graph/graphHoverContext";
import { useCurrentTheme } from "@/lib/styles/context";
import { SEVERITY_COLORS, SUBTYPE_FILL_COLORS, THEME_NODE_LAYOUT, hexToRgba } from "@/lib/styles/tokens";

export type GaugeNodeData = {
  label: string;
  /** null only for the hendelse (root event) node. */
  category: ConsequenceLabel | null;
  isHendelse: boolean;
  subtype: NodeSubtype;
};

export type GaugeNodeType = Node<GaugeNodeData, "gauge">;

// Edges are "floating" (see FloatingEdge.tsx) and compute their own
// attachment points from each node's live center + shape - these handles
// exist only because React Flow requires at least one source/target handle
// per node to accept an edge; their fixed top/bottom position is otherwise
// meaningless now that the layout isn't a strict top-down tree, so they're
// hidden rather than shown as (misleading) fixed connection points.
const HIDDEN_HANDLE_STYLE = { visibility: "hidden" as const };

export function GaugeNode({ id, data }: NodeProps<GaugeNodeType>) {
  const opacity = useNodeHoverOpacity(id);
  const theme = useCurrentTheme();
  const layout = THEME_NODE_LAYOUT[theme];

  if (theme === "lys") return <CardNode data={data} opacity={opacity} width={layout.width} />;
  if (theme === "terminal") return <RingCardNode data={data} opacity={opacity} width={layout.width} />;

  return (
    <div
      style={{
        position: "relative",
        // Fixed box, circle centered inside it - deliberately NOT sized by
        // content (see the label below). FloatingEdge/floatingEdgeGeometry
        // find each edge's attachment point from this node's *measured*
        // center + layout.radius; if the box grew with the label (as a
        // plain flex column would), a long/wrapping label would push the
        // measured center down away from the circle, and edges would stop
        // short of - or past - the visible ring instead of touching it.
        // That drift was most visible with indirect impact on, since the
        // full function catalog has several long labels that wrap to 3
        // lines. Keeping the box fixed keeps "measured center" == "circle
        // center" regardless of label length.
        width: layout.width,
        height: layout.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
      }}
    >
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
      {/* Positioned out of flow so it can wrap to any number of lines
          without changing the box above (and therefore the edge-attachment
          math) - see the comment on the wrapper. */}
      <div
        style={{
          position: "absolute",
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          marginTop: 4,
          width: layout.width,
          fontSize: 12,
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} style={HIDDEN_HANDLE_STYLE} />
    </div>
  );
}

/** "lys" theme: a white SaaS-dashboard card - colored subtype pill, bold
 * label, and (for non-root nodes) a percent-filled severity bar underneath -
 * modeled directly on the reference's tag-pill + criticality-bar cards. */
function CardNode({ data, opacity, width }: { data: GaugeNodeData; opacity: number; width: number }) {
  const subtypeColor = SUBTYPE_FILL_COLORS[data.subtype];

  if (data.isHendelse) {
    return (
      <div className="cardNode cardNodeHendelse" style={{ width, opacity }}>
        <Handle type="target" position={Position.Top} style={HIDDEN_HANDLE_STYLE} />
        <span className="cardNodePill cardNodePillHendelse">Hendelse</span>
        <div className="cardNodeLabel cardNodeLabelHendelse">{data.label}</div>
        <Handle type="source" position={Position.Bottom} style={HIDDEN_HANDLE_STYLE} />
      </div>
    );
  }

  const category = data.category ?? "ingen";
  const filled = ["ingen", "svært små", "små", "middels", "store", "svært store"].indexOf(category);
  const percent = Math.round((filled / 5) * 100);
  const severityColor = SEVERITY_COLORS[category];

  return (
    <div className="cardNode" style={{ width, opacity, borderTopColor: subtypeColor }}>
      <Handle type="target" position={Position.Top} style={HIDDEN_HANDLE_STYLE} />
      <span className="cardNodePill" style={{ background: hexToRgba(subtypeColor, 0.14), color: subtypeColor }}>
        {NODE_SUBTYPE_LABEL[data.subtype]}
      </span>
      <div className="cardNodeLabel">{data.label}</div>
      <div className="cardNodeSeverity">
        <div className="cardNodeSeverityTrack">
          <div className="cardNodeSeverityFill" style={{ width: `${percent}%`, background: severityColor }} />
        </div>
        <span className="cardNodeSeverityLabel" style={{ color: severityColor }}>
          {category} · {percent}%
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} style={HIDDEN_HANDLE_STYLE} />
    </div>
  );
}

/** "terminal" theme: a dark HUD card with a percentage ring on the left and
 * a label/status readout on the right - modeled on the reference dashboard's
 * node-load cards. */
function RingCardNode({ data, opacity, width }: { data: GaugeNodeData; opacity: number; width: number }) {
  const subtypeColor = SUBTYPE_FILL_COLORS[data.subtype];
  const category = data.category ?? "ingen";
  const critical = category === "store" || category === "svært store";

  return (
    <div
      className={critical ? "cardNode cardNodeTerminal cardNodeTerminalCritical" : "cardNode cardNodeTerminal"}
      style={{ width, opacity }}
    >
      <Handle type="target" position={Position.Top} style={HIDDEN_HANDLE_STYLE} />
      <div className="cardNodeTerminalRing">
        {data.isHendelse ? (
          <div className="cardNodeTerminalRoot" style={{ boxShadow: `0 0 14px ${subtypeColor}99`, background: subtypeColor }} />
        ) : (
          <GaugeIndicator category={category} size={44} label={data.label} />
        )}
      </div>
      <div className="cardNodeTerminalText">
        <div className="cardNodeTerminalLabel">{data.label}</div>
        <div className="cardNodeTerminalStatus">
          {data.isHendelse ? "ROT // HENDELSE" : `STATUS: ${category.toUpperCase()}`}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={HIDDEN_HANDLE_STYLE} />
    </div>
  );
}
