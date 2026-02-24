import type { FootnoteComponent } from "../../../types";
import { MarkdownText } from "../MarkdownText";

interface FootnotePreviewProps {
  component: FootnoteComponent;
}

export function FootnotePreview({ component }: FootnotePreviewProps) {
  return (
    <aside className="preview-footnote">
      <sup className="preview-footnote-ref">[{component.identifier}]</sup>{" "}
      <span className="preview-footnote-content">
        <MarkdownText text={component.content} className="preview-markdown preview-markdown-inline" />
      </span>
    </aside>
  );
}
