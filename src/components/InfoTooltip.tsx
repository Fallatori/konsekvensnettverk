import { RichText } from "@/components/RichText";

/**
 * Small "i" icon that reveals an explanatory tooltip on hover/focus. Used next
 * to labels in NodeDetailPanel to explain what a value means and how it's
 * computed, in plain language.
 *
 * placement: the bubble opens upwards by default. Pass "below" where there is
 * no room above - e.g. the panel header, which sits at the top of the
 * scrollable .sidePanels column and would clip an upward bubble.
 */
export function InfoTooltip({
  text,
  placement = "above",
}: {
  text: string;
  placement?: "above" | "below";
}) {
  return (
    <span className="infoTooltip" tabIndex={0}>
      <span className="material-symbols-outlined" aria-hidden="true">
        info
      </span>
      <span
        className={placement === "below" ? "infoTooltipBubble infoTooltipBubbleBelow" : "infoTooltipBubble"}
        role="tooltip"
      >
        <RichText text={text} />
      </span>
    </span>
  );
}
