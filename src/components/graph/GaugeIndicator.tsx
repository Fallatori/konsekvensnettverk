import type { ConsequenceLabel } from "@/lib/calc/mappings";
import { SEGMENT_COLORS, SEVERITY_COLORS, filledSegmentCount } from "@/lib/styles/tokens";
import { useCurrentTheme } from "@/lib/styles/context";

const SEGMENT_COUNT = 5; // one per non-"ingen" category
const GAP_DEGREES = 6;

/**
 * Shared severity gauge primitive, used both as the small in-graph node dial
 * and the larger detail-panel view - its visual form is one of the three
 * things that changes per theme (see globals.css [data-theme] blocks and
 * GaugeNode.tsx):
 * - "graf": segmented radial ring (the app's original look) - always shows
 *   all 5 segments in a fixed green -> light green -> yellow -> orange -> red
 *   order; only the first N (N = the category's severity) are filled in
 *   their own color, the rest are drawn as thin unfilled outlines.
 * - "lys": a flat horizontal progress bar (percent-filled), like a SaaS
 *   dashboard's "criticality" meter.
 * - "terminal": a single continuous percentage ring with the number in the
 *   center, like a HUD load gauge.
 */
export function GaugeIndicator({
  category,
  size = 64,
  label,
  fillColor = "var(--control-track)",
}: {
  category: ConsequenceLabel;
  size?: number;
  label?: string;
  /** Neutral inner-circle fill for the "graf" ring (see NODE_FILL_IMPACT/
   * NODE_FILL_SCENARIO in lib/styles/tokens.ts) - unused by the other two
   * variants. */
  fillColor?: string;
}) {
  const theme = useCurrentTheme();
  const filled = filledSegmentCount(category);
  const percent = Math.round((filled / SEGMENT_COUNT) * 100);
  const color = SEVERITY_COLORS[category];

  if (theme === "lys") return <BarGauge percent={percent} color={color} size={size} label={label ?? category} />;
  if (theme === "terminal") return <RingGauge percent={percent} color={color} size={size} label={label ?? category} />;

  const strokeWidth = size * 0.14;
  const center = size / 2;
  const ringRadius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const segmentDegrees = 360 / SEGMENT_COUNT - GAP_DEGREES;
  const segmentLength = (segmentDegrees / 360) * circumference;

  const unfilledStrokeWidth = Math.max(1, strokeWidth * 0.18);

  // Inner fill circle stays inset from the segment ring by the full stroke
  // width (not just half) so the wrapped label text below never overlaps the
  // colored severity segments.
  const innerRadius = center - strokeWidth;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? category}>
      <circle cx={center} cy={center} r={innerRadius} fill={fillColor} />
      {SEGMENT_COLORS.map((segmentColor, i) => {
        const rotation = i * (360 / SEGMENT_COUNT) - 90; // start at the top
        const isFilled = i < filled;
        return (
          <circle
            key={segmentColor}
            cx={center}
            cy={center}
            r={ringRadius}
            fill="none"
            stroke={isFilled ? segmentColor : "var(--control-border)"}
            strokeWidth={isFilled ? strokeWidth : unfilledStrokeWidth}
            strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
            transform={`rotate(${rotation} ${center} ${center})`}
          />
        );
      })}
      {label && (
        <foreignObject x={center - innerRadius} y={center - innerRadius} width={innerRadius * 2} height={innerRadius * 2}>
          <div
            // @ts-expect-error -- xmlns is valid on a foreignObject's HTML child but not in React's JSX typings.
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: strokeWidth * 0.3,
              fontSize: Math.max(9, size * 0.13),
              lineHeight: 1.15,
              color: "var(--foreground)",
              overflow: "hidden",
            }}
          >
            {label}
          </div>
        </foreignObject>
      )}
    </svg>
  );
}

/** "lys" theme: a flat percent-filled bar, like the reference dashboard's
 * "CRITICALITY 85%" meter. */
function BarGauge({ percent, color, size, label }: { percent: number; color: string; size: number; label: string }) {
  const width = Math.round(size * 2.15);
  return (
    <div role="img" aria-label={label} style={{ width, display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          width: "100%",
          height: Math.max(6, size * 0.12),
          borderRadius: 999,
          background: "var(--control-track)",
          border: "1px solid var(--control-border)",
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${percent}%`, height: "100%", background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

/** "terminal" theme: a single continuous ring with the percentage in the
 * center, like the reference dashboard's node-load rings. */
function RingGauge({ percent, color, size, label }: { percent: number; color: string; size: number; label: string }) {
  const strokeWidth = size * 0.12;
  const center = size / 2;
  const ringRadius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const filledLength = (percent / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
      <circle cx={center} cy={center} r={ringRadius} fill="none" stroke="var(--control-track)" strokeWidth={strokeWidth} />
      <circle
        cx={center}
        cy={center}
        r={ringRadius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${filledLength} ${circumference - filledLength}`}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ filter: `drop-shadow(0 0 6px ${color}99)` }}
      />
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--foreground)"
        fontFamily="var(--body-font)"
        fontSize={size * 0.24}
        fontWeight={700}
      >
        {percent}%
      </text>
    </svg>
  );
}
