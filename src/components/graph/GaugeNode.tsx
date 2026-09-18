import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { CONSEQUENCE_LABEL_EN, type ConsequenceLabel, type NodeSubtype } from "@/lib/calc/mappings";
import type { CatalogSubtypeLabel } from "@/lib/calc/catalog/types";
import { GaugeIndicator } from "@/components/graph/GaugeIndicator";
import { useNodeHoverOpacity } from "@/components/graph/graphHoverContext";
import { useCurrentTheme } from "@/lib/styles/context";
import { useCurrentLanguage } from "@/lib/i18n/googleTranslate";
import { NODE_FILL_IMPACT, NODE_FILL_SCENARIO, SEVERITY_COLORS, THEME_NODE_LAYOUT } from "@/lib/styles/tokens";

export type GaugeNodeData = {
  label: string;
  /** null only for the hendelse (root event) node. */
  category: ConsequenceLabel | null;
  isHendelse: boolean;
  subtype: NodeSubtype;
  /** The full samfunnsverdi name (e.g. "Samfunnets funksjonalitet") - same
   * field NodeDetailPanel shows as "Undertype: ..." - null for the hendelse
   * node, which has no catalog entry. */
  subtypeLabel: CatalogSubtypeLabel | null;
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
        // content. FloatingEdge/floatingEdgeGeometry find each edge's
        // attachment point from this node's *measured* center + layout.radius;
        // if the box grew with the label (as a plain flex column would), a
        // long/wrapping label would push the measured center away from the
        // circle, and edges would stop short of - or past - the visible ring
        // instead of touching it. The label itself now renders *inside* the
        // circle (GaugeIndicator's foreignObject, or the hendelse dot below),
        // sized generously enough (see THEME_NODE_LAYOUT.graf) to hold a
        // wrapped label without covering the severity ring.
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
            width: 84,
            height: 84,
            borderRadius: "50%",
            background: NODE_FILL_SCENARIO,
            color: "var(--foreground)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            textAlign: "center",
            padding: 8,
            boxShadow: "0 0 16px rgba(148, 163, 184, 0.45)",
          }}
        >
          {data.label}
        </div>
      ) : (
        <GaugeIndicator category={data.category ?? "ingen"} size={96} label={data.label} fillColor={NODE_FILL_IMPACT} />
      )}
      <Handle type="source" position={Position.Bottom} style={HIDDEN_HANDLE_STYLE} />
    </div>
  );
}

/** "lys" theme: a white SaaS-dashboard card - neutral subtype pill, bold
 * label, and (for non-root nodes) a percent-filled severity bar underneath -
 * modeled directly on the reference's tag-pill + criticality-bar cards. */
function CardNode({ data, opacity, width }: { data: GaugeNodeData; opacity: number; width: number }) {
  const language = useCurrentLanguage();

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
  const categoryText = language === "en" ? CONSEQUENCE_LABEL_EN[category] : category;

  return (
    <div className="cardNode" style={{ width, opacity }}>
      <Handle type="target" position={Position.Top} style={HIDDEN_HANDLE_STYLE} />
      <span className="cardNodePill cardNodePillNeutral">{data.subtypeLabel}</span>
      <div className="cardNodeLabel">{data.label}</div>
      <div className="cardNodeSeverity">
        <div className="cardNodeSeverityTrack">
          <div className="cardNodeSeverityFill" style={{ width: `${percent}%`, background: severityColor }} />
        </div>
        {/* notranslate: hand-translated via CONSEQUENCE_LABEL_EN above, not
            Google Translate - this text re-renders on every recompute, and
            Google's widget only does a fresh translation pass on a genuine
            language *switch*, not on a same-language re-render of content it
            already visited (confirmed empirically - not fixable with a
            forced remount either). Left to Google, this either freezes at
            its first-ever value or silently stops updating; see
            CONSEQUENCE_LABEL_EN's comment in lib/calc/mappings.ts. */}
        <span className="cardNodeSeverityLabel notranslate" style={{ color: severityColor }}>
          {categoryText} · {percent}%
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
  const language = useCurrentLanguage();
  const category = data.category ?? "ingen";
  const categoryText = language === "en" ? CONSEQUENCE_LABEL_EN[category] : category;
  const rootStatusText = language === "en" ? "ROOT // EVENT" : "ROT // HENDELSE";

  return (
    <div className="cardNode cardNodeTerminal" style={{ width, opacity }}>
      <Handle type="target" position={Position.Top} style={HIDDEN_HANDLE_STYLE} />
      <div className="cardNodeTerminalRing">
        {data.isHendelse ? (
          <div className="cardNodeTerminalRoot" />
        ) : (
          <GaugeIndicator category={category} size={44} label={data.label} />
        )}
      </div>
      <div className="cardNodeTerminalText">
        <div className="cardNodeTerminalLabel">{data.label}</div>
        {/* notranslate: see the matching CardNode fix above - hand-translated
            via CONSEQUENCE_LABEL_EN instead of Google Translate. */}
        <div className="cardNodeTerminalStatus notranslate">
          {data.isHendelse ? rootStatusText : `STATUS: ${categoryText.toUpperCase()}`}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={HIDDEN_HANDLE_STYLE} />
    </div>
  );
}
