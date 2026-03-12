import type { ReactNode } from "react";
import type { ArticleComponent } from "../../types";
import { HeadingPreview } from "./renderers/HeadingPreview";
import { ParagraphPreview } from "./renderers/ParagraphPreview";
import { ImagePreview } from "./renderers/ImagePreview";
import { LinkPreview } from "./renderers/LinkPreview";
import { CodeBlockPreview } from "./renderers/CodeBlockPreview";
import { EquationPreview } from "./renderers/EquationPreview";
import { CitationPreview } from "./renderers/CitationPreview";
import { FootnotePreview } from "./renderers/FootnotePreview";
import { HorizontalRulerPreview } from "./renderers/HorizontalRulerPreview";
import { ListPreview } from "./renderers/ListPreview";
import { PollPreview } from "./renderers/PollPreview";
import { TablePreview } from "./renderers/TablePreview";
import { VideoPreview } from "./renderers/VideoPreview";
import { parseInlineStyle } from "../../utils/parseInlineStyle";

interface ComponentPreviewProps {
  component: ArticleComponent;
}

function wrapWithStyle(
  component: ArticleComponent,
  content: ReactNode
) {
  const hasClass = component.className?.trim();
  const hasStyle = component.style?.trim();
  if (!hasClass && !hasStyle) return content;
  return (
    <div
      className={hasClass ? hasClass : undefined}
      style={hasStyle ? parseInlineStyle(component.style) : undefined}
    >
      {content}
    </div>
  );
}

export function ComponentPreview({ component }: ComponentPreviewProps) {
  let content: ReactNode;
  switch (component.type) {
    case "heading":
      content = <HeadingPreview component={component} />;
      break;
    case "paragraph":
      content = <ParagraphPreview component={component} />;
      break;
    case "image":
      content = <ImagePreview component={component} />;
      break;
    case "link":
      content = <LinkPreview component={component} />;
      break;
    case "code_block":
      content = <CodeBlockPreview component={component} />;
      break;
    case "equation":
      content = <EquationPreview component={component} />;
      break;
    case "citation":
      content = <CitationPreview component={component} />;
      break;
    case "footnote":
      content = <FootnotePreview component={component} />;
      break;
    case "horizontal_ruler":
      content = <HorizontalRulerPreview component={component} />;
      break;
    case "list":
      content = <ListPreview component={component} />;
      break;
    case "poll":
      content = <PollPreview component={component} />;
      break;
    case "table":
      content = <TablePreview component={component} />;
      break;
    case "video":
      content = <VideoPreview component={component} />;
      break;
    default: {
      const t = component as ArticleComponent;
      content = (
        <div className="preview-unknown">
          <em>Unknown component: {t.type}</em>
        </div>
      );
    }
  }
  return wrapWithStyle(component, content);
}
