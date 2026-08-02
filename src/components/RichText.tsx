import { Fragment, type ReactNode } from "react";

/**
 * Renders the small Markdown subset the authored text fields in
 * src/data/domainData.json support - `definition` on a function, and
 * `description` on a scenario's hendelse and its direct hits. Plain text
 * without any markers renders unchanged, so existing content keeps working.
 *
 * Supported syntax (JSON has no multi-line strings, so newlines are written
 * as the escape "\n" inside the JSON value):
 *
 *   blank line ("\n\n")  new paragraph
 *   single newline       line break inside the same paragraph
 *   "- " line prefix     bullet point (consecutive lines form one list)
 *   **text**             bold
 *   *text*               italic
 *
 * Deliberately not a full Markdown implementation, and deliberately no
 * dependency: headings, links, tables and raw HTML are out of scope, and
 * unmatched markers are left alone as literal characters rather than
 * swallowed.
 *
 * Everything is emitted as <span>s given display roles by CSS, never <p>/<ul>.
 * That keeps the output valid wherever it is used - including inside the
 * tooltip bubble in the panel header, which lives in an <h2> and so may
 * legally contain phrasing content only.
 */
export function RichText({ text }: { text: string }) {
  return <span className="richText">{renderBlocks(text)}</span>;
}

/** Splits on blank lines into paragraphs, then groups each paragraph's
 * consecutive "- " lines into a single bullet list. */
function renderBlocks(text: string): ReactNode[] {
  const blocks: ReactNode[] = [];

  text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .forEach((block, blockIndex) => {
      const lines = block.split("\n").map((line) => line.trim());
      let paragraph: string[] = [];
      let bullets: string[] = [];

      const flushParagraph = () => {
        if (paragraph.length === 0) return;
        blocks.push(
          <span className="richTextParagraph" key={`p-${blockIndex}-${blocks.length}`}>
            {joinWithLineBreaks(paragraph)}
          </span>,
        );
        paragraph = [];
      };

      const flushBullets = () => {
        if (bullets.length === 0) return;
        blocks.push(
          <span className="richTextList" key={`ul-${blockIndex}-${blocks.length}`}>
            {bullets.map((item, i) => (
              <span className="richTextItem" key={i}>
                {renderInline(item)}
              </span>
            ))}
          </span>,
        );
        bullets = [];
      };

      for (const line of lines) {
        if (line.startsWith("- ")) {
          flushParagraph();
          bullets.push(line.slice(2));
        } else if (line.length > 0) {
          flushBullets();
          paragraph.push(line);
        }
      }
      flushParagraph();
      flushBullets();
    });

  return blocks;
}

function joinWithLineBreaks(lines: string[]): ReactNode[] {
  return lines.flatMap((line, i) =>
    i === 0 ? renderInline(line) : [<br key={`br-${i}`} />, ...renderInline(line)],
  );
}

// Bold before italic, so "**x**" is never mistaken for an italic "*" pair.
// Both require non-empty, non-marker content, so a lone "*" stays literal.
const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;

function renderInline(text: string): ReactNode[] {
  return text.split(INLINE_PATTERN).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
