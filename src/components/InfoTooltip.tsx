/**
 * Small "i" icon that reveals an explanatory tooltip on hover/focus. Used next
 * to labels in NodeDetailPanel to explain what a value means and how it's
 * computed, in plain language.
 */
export function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="infoTooltip" tabIndex={0}>
      <span className="material-symbols-outlined" aria-hidden="true">
        info
      </span>
      <span className="infoTooltipBubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}
