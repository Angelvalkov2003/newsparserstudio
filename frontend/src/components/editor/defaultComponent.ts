import type { ArticleComponent, ArticleComponentType } from "../../types";
import type {
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

export function getDefaultComponent(
  type: ArticleComponentType,
  id: string
): ArticleComponent {
  switch (type) {
    case "heading":
      return { id, type: "heading", text: "", level: 1 } as HeadingComponent;
    case "paragraph":
      return { id, type: "paragraph", text: "" } as ParagraphComponent;
    case "image":
      return { id, type: "image" } as ImageComponent;
    case "link":
      return { id, type: "link", text: "", url: "" } as LinkComponent;
    case "code_block":
      return { id, type: "code_block", code: "" } as CodeBlockComponent;
    case "equation":
      return { id, type: "equation", latex: "" } as EquationComponent;
    case "citation":
      return { id, type: "citation", citation_text: "" } as CitationComponent;
    case "footnote":
      return { id, type: "footnote", identifier: "", content: "" } as FootnoteComponent;
    case "horizontal_ruler":
      return { id, type: "horizontal_ruler" } as HorizontalRulerComponent;
    case "list":
      return { id, type: "list", items: [] } as ListComponent;
    case "poll":
      return { id, type: "poll", question: "", choices: [] } as PollComponent;
    case "table":
      return { id, type: "table", headers: [], rows: [] } as TableComponent;
    case "video":
      return { id, type: "video", url: "" } as VideoComponent;
    default:
      return { id, type: "paragraph", text: "" } as ParagraphComponent;
  }
}
