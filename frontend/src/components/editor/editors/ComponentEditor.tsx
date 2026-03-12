import type { ArticleComponent } from "../../../types";
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
  /** When true, hide the Type dropdown in Style & attributes (e.g. in Add component modal). */
  hideTypeSelect?: boolean;
}

export function ComponentEditor({
  component,
  index,
  onChange,
  hideTypeSelect = false,
}: ComponentEditorProps) {
  const handleChange = (next: ArticleComponent) => onChange(index, next);

  const styleSection = (
    <ComponentStyleSection
      component={component}
      onChange={handleChange}
      hideTypeSelect={hideTypeSelect}
    />
  );

  switch (component.type) {
    case "heading":
      return (
        <>
          <HeadingEditor component={component} onChange={handleChange} />
          {styleSection}
        </>
      );
    case "paragraph":
      return (
        <>
          <ParagraphEditor component={component} onChange={handleChange} />
          {styleSection}
        </>
      );
    case "image":
      return (
        <>
          <ImageEditor component={component} onChange={handleChange} />
          {styleSection}
        </>
      );
    case "link":
      return (
        <>
          <LinkEditor component={component} onChange={handleChange} />
          {styleSection}
        </>
      );
    case "code_block":
      return (
        <>
          <CodeBlockEditor component={component} onChange={handleChange} />
          {styleSection}
        </>
      );
    case "equation":
      return (
        <>
          <EquationEditor component={component} onChange={handleChange} />
          {styleSection}
        </>
      );
    case "citation":
      return (
        <>
          <CitationEditor component={component} onChange={handleChange} />
          {styleSection}
        </>
      );
    case "footnote":
      return (
        <>
          <FootnoteEditor component={component} onChange={handleChange} />
          {styleSection}
        </>
      );
    case "horizontal_ruler":
      return (
        <>
          <HorizontalRulerEditor component={component} onChange={handleChange} />
          {styleSection}
        </>
      );
    case "list":
      return (
        <>
          <ListEditor component={component} onChange={handleChange} />
          {styleSection}
        </>
      );
    case "poll":
      return (
        <>
          <PollEditor component={component} onChange={handleChange} />
          {styleSection}
        </>
      );
    case "table":
      return (
        <>
          <TableEditor component={component} onChange={handleChange} />
          {styleSection}
        </>
      );
    case "video":
      return (
        <>
          <VideoEditor component={component} onChange={handleChange} />
          {styleSection}
        </>
      );
    default: {
      const t = component as ArticleComponent;
      return (
        <>
          <div className="component-editor unknown-editor">
            <span className="editor-label">Unknown type: {String(t.type)}</span>
            <pre className="editor-raw">{JSON.stringify(component, null, 2)}</pre>
          </div>
          {styleSection}
        </>
      );
    }
  }
}
