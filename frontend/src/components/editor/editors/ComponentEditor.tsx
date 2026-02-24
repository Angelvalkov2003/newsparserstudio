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
} from "../../../types";
import { HeadingEditor } from "./HeadingEditor";
import { ParagraphEditor } from "./ParagraphEditor";
import { ImageEditor } from "./ImageEditor";
import { LinkEditor } from "./LinkEditor";
import { CodeBlockEditor } from "./CodeBlockEditor";
import { EquationEditor } from "./EquationEditor";
import { CitationEditor } from "./CitationEditor";
import { FootnoteEditor } from "./FootnoteEditor";
import { HorizontalRulerEditor } from "./HorizontalRulerEditor";

export interface ComponentEditorProps {
  component: ArticleComponent;
  index: number;
  onChange: (index: number, next: ArticleComponent) => void;
}

export function ComponentEditor({
  component,
  index,
  onChange,
}: ComponentEditorProps) {
  const handleChange = (next: ArticleComponent) => onChange(index, next);

  switch (component.type) {
    case "heading":
      return (
        <HeadingEditor
          component={component as HeadingComponent}
          onChange={handleChange as (n: HeadingComponent) => void}
        />
      );
    case "paragraph":
      return (
        <ParagraphEditor
          component={component as ParagraphComponent}
          onChange={handleChange as (n: ParagraphComponent) => void}
        />
      );
    case "image":
      return (
        <ImageEditor
          component={component as ImageComponent}
          onChange={handleChange as (n: ImageComponent) => void}
        />
      );
    case "link":
      return (
        <LinkEditor
          component={component as LinkComponent}
          onChange={handleChange as (n: LinkComponent) => void}
        />
      );
    case "code_block":
      return (
        <CodeBlockEditor
          component={component as CodeBlockComponent}
          onChange={handleChange as (n: CodeBlockComponent) => void}
        />
      );
    case "equation":
      return (
        <EquationEditor
          component={component as EquationComponent}
          onChange={handleChange as (n: EquationComponent) => void}
        />
      );
    case "citation":
      return (
        <CitationEditor
          component={component as CitationComponent}
          onChange={handleChange as (n: CitationComponent) => void}
        />
      );
    case "footnote":
      return (
        <FootnoteEditor
          component={component as FootnoteComponent}
          onChange={handleChange as (n: FootnoteComponent) => void}
        />
      );
    case "horizontal_ruler":
      return (
        <HorizontalRulerEditor
          component={component as HorizontalRulerComponent}
          onChange={handleChange as (n: HorizontalRulerComponent) => void}
        />
      );
    default: {
      const t = (component as ArticleComponent).type;
      return (
        <div className="component-editor unknown-editor">
          <span className="editor-label">Unknown type: {String(t)}</span>
          <pre className="editor-raw">{JSON.stringify(component, null, 2)}</pre>
        </div>
      );
    }
  }
}
