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
import { ListEditor } from "./ListEditor";
import { PollEditor } from "./PollEditor";
import { TableEditor } from "./TableEditor";
import { VideoEditor } from "./VideoEditor";
import { ComponentStyleSection } from "./ComponentStyleSection";

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

  const styleSection = (
    <ComponentStyleSection component={component} onChange={handleChange} />
  );

  switch (component.type) {
    case "heading":
      return (
        <>
          <HeadingEditor
            component={component as HeadingComponent}
            onChange={handleChange as (n: HeadingComponent) => void}
          />
          {styleSection}
        </>
      );
    case "paragraph":
      return (
        <>
          <ParagraphEditor
            component={component as ParagraphComponent}
            onChange={handleChange as (n: ParagraphComponent) => void}
          />
          {styleSection}
        </>
      );
    case "image":
      return (
        <>
          <ImageEditor
            component={component as ImageComponent}
            onChange={handleChange as (n: ImageComponent) => void}
          />
          {styleSection}
        </>
      );
    case "link":
      return (
        <>
          <LinkEditor
            component={component as LinkComponent}
            onChange={handleChange as (n: LinkComponent) => void}
          />
          {styleSection}
        </>
      );
    case "code_block":
      return (
        <>
          <CodeBlockEditor
            component={component as CodeBlockComponent}
            onChange={handleChange as (n: CodeBlockComponent) => void}
          />
          {styleSection}
        </>
      );
    case "equation":
      return (
        <>
          <EquationEditor
            component={component as EquationComponent}
            onChange={handleChange as (n: EquationComponent) => void}
          />
          {styleSection}
        </>
      );
    case "citation":
      return (
        <>
          <CitationEditor
            component={component as CitationComponent}
            onChange={handleChange as (n: CitationComponent) => void}
          />
          {styleSection}
        </>
      );
    case "footnote":
      return (
        <>
          <FootnoteEditor
            component={component as FootnoteComponent}
            onChange={handleChange as (n: FootnoteComponent) => void}
          />
          {styleSection}
        </>
      );
    case "horizontal_ruler":
      return (
        <>
          <HorizontalRulerEditor
            component={component as HorizontalRulerComponent}
            onChange={handleChange as (n: HorizontalRulerComponent) => void}
          />
          {styleSection}
        </>
      );
    case "list":
      return (
        <>
          <ListEditor
            component={component as ListComponent}
            onChange={handleChange as (n: ListComponent) => void}
          />
          {styleSection}
        </>
      );
    case "poll":
      return (
        <>
          <PollEditor
            component={component as PollComponent}
            onChange={handleChange as (n: PollComponent) => void}
          />
          {styleSection}
        </>
      );
    case "table":
      return (
        <>
          <TableEditor
            component={component as TableComponent}
            onChange={handleChange as (n: TableComponent) => void}
          />
          {styleSection}
        </>
      );
    case "video":
      return (
        <>
          <VideoEditor
            component={component as VideoComponent}
            onChange={handleChange as (n: VideoComponent) => void}
          />
          {styleSection}
        </>
      );
    default: {
      const t = (component as ArticleComponent).type;
      return (
        <>
          <div className="component-editor unknown-editor">
            <span className="editor-label">Unknown type: {String(t)}</span>
            <pre className="editor-raw">{JSON.stringify(component, null, 2)}</pre>
          </div>
          {styleSection}
        </>
      );
    }
  }
}
