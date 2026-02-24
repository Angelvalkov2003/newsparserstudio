import type { ParagraphComponent } from "../../../types";
import { MarkdownText } from "../MarkdownText";

interface ParagraphPreviewProps {
  component: ParagraphComponent;
}

export function ParagraphPreview({ component }: ParagraphPreviewProps) {
  return (
    <div className="preview-paragraph-wrap">
      <MarkdownText text={component.text} className="preview-paragraph preview-markdown" />
    </div>
  );
}
