import type { CitationComponent } from "../../../types";
import { MarkdownText } from "../MarkdownText";

interface CitationPreviewProps {
  component: CitationComponent;
}

export function CitationPreview({ component }: CitationPreviewProps) {
  return (
    <blockquote className="preview-citation">
      <MarkdownText text={component.citation_text} className="preview-citation-text preview-markdown" />
      {component.author_text && (
        <footer className="preview-citation-author">
          <MarkdownText text={`— ${component.author_text}`} className="preview-markdown" />
        </footer>
      )}
    </blockquote>
  );
}
