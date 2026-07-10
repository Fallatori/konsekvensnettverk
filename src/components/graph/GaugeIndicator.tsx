import type { ConsequenceLabel } from "@/lib/calc/mappings";
import { SEVERITY_COLORS, filledSegmentCount } from "@/lib/ui/severityColors";

const SEGMENT_COUNT = 5; // one per non-"ingen" category
const GAP_DEGREES = 6;

/**
 * Shared segmented radial severity gauge - a "gas gauge" style ring around a
 * circle, used both as the small in-graph node dial and the larger
 * detail-panel view. All filled segments share ONE color - the current
 * category's color (e.g. "middels" fills 3 segments, all in middels' color)
 * - not a green-to-red rainbow across the filled segments.
 */
export function GaugeIndicator({
  category,
  size = 64,
  label,
  fillColor = "#ffffff",
}: {
  category: ConsequenceLabel;
  size?: number;
  label?: string;
  /** Node's subtype color (see lib/ui/subtypeColors.ts) - the inner circle,
   * distinct from the severity ring around it. */
  fillColor?: string;
}) {
  const filled = filledSegmentCount(category);
  const filledSegmentColor = SEVERITY_COLORS[category];
  const strokeWidth = size * 0.14;
  const center = size / 2;
  const ringRadius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const segmentDegrees = 360 / SEGMENT_COUNT - GAP_DEGREES;
  const segmentLength = (segmentDegrees / 360) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? category}>
      <circle cx={center} cy={center} r={center - strokeWidth} fill={fillColor} />
      {Array.from({ length: filled }, (_, i) => {
        const rotation = i * (360 / SEGMENT_COUNT) - 90; // start at the top
        return (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={ringRadius}
            fill="none"
            stroke={filledSegmentColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
            transform={`rotate(${rotation} ${center} ${center})`}
          />
        );
      })}
    </svg>
  );
}
