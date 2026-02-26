import type { ReactNode } from "react";
import type {
  ArticleComponent,
  HeadingComponent,
  ParagraphComponent,
  ImageComponent,
  LinkComponent,
  CodeBlockComponent,
  EquationComponent,
  CitationComponent,
  FootnoteComponent,
  HorizontalRulerComponent,
  ListComponent,
  PollComponent,
  TableComponent,
  VideoComponent,
} from "../../types";
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
      content = <HeadingPreview component={component as HeadingComponent} />;
      break;
    case "paragraph":
      content = <ParagraphPreview component={component as ParagraphComponent} />;
      break;
    case "image":
      content = <ImagePreview component={component as ImageComponent} />;
      break;
    case "link":
      content = <LinkPreview component={component as LinkComponent} />;
      break;
    case "code_block":
      content = <CodeBlockPreview component={component as CodeBlockComponent} />;
      break;
    case "equation":
      content = <EquationPreview component={component as EquationComponent} />;
      break;
    case "citation":
      content = <CitationPreview component={component as CitationComponent} />;
      break;
    case "footnote":
      content = <FootnotePreview component={component as FootnoteComponent} />;
      break;
    case "horizontal_ruler":
      content = <HorizontalRulerPreview component={component as HorizontalRulerComponent} />;
      break;
    case "list":
      content = <ListPreview component={component as ListComponent} />;
      break;
    case "poll":
      content = <PollPreview component={component as PollComponent} />;
      break;
    case "table":
      content = <TablePreview component={component as TableComponent} />;
      break;
    case "video":
      content = <VideoPreview component={component as VideoComponent} />;
      break;
    default:
      content = (
        <div className="preview-unknown">
          <em>Unknown component: {(component as ArticleComponent).type}</em>
        </div>
      );
  }
  return wrapWithStyle(component, content);
}
