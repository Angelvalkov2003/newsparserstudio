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

interface ComponentPreviewProps {
  component: ArticleComponent;
}

export function ComponentPreview({ component }: ComponentPreviewProps) {
  switch (component.type) {
    case "heading":
      return <HeadingPreview component={component as HeadingComponent} />;
    case "paragraph":
      return <ParagraphPreview component={component as ParagraphComponent} />;
    case "image":
      return <ImagePreview component={component as ImageComponent} />;
    case "link":
      return <LinkPreview component={component as LinkComponent} />;
    case "code_block":
      return <CodeBlockPreview component={component as CodeBlockComponent} />;
    case "equation":
      return <EquationPreview component={component as EquationComponent} />;
    case "citation":
      return <CitationPreview component={component as CitationComponent} />;
    case "footnote":
      return <FootnotePreview component={component as FootnoteComponent} />;
    case "horizontal_ruler":
      return <HorizontalRulerPreview component={component as HorizontalRulerComponent} />;
    case "list":
      return <ListPreview component={component as ListComponent} />;
    case "poll":
      return <PollPreview component={component as PollComponent} />;
    case "table":
      return <TablePreview component={component as TableComponent} />;
    case "video":
      return <VideoPreview component={component as VideoComponent} />;
    default:
      return (
        <div className="preview-unknown">
          <em>Unknown component: {(component as ArticleComponent).type}</em>
        </div>
      );
  }
}
