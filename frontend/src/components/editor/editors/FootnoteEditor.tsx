import type { FootnoteComponent } from "../../../types";

interface FootnoteEditorProps {
  component: FootnoteComponent;
  onChange: (next: FootnoteComponent) => void;
}

export function FootnoteEditor({ component, onChange }: FootnoteEditorProps) {
  return (
    <div className="component-editor footnote-editor">
      <label className="editor-field">
        <span className="editor-label">Identifier</span>
        <input
          type="text"
          className="editor-input"
          value={component.identifier}
          onChange={(e) =>
            onChange({ ...component, identifier: e.target.value })
          }
          placeholder="e.g. 1, note, ref-a"
        />
      </label>
      <label className="editor-field">
        <span className="editor-label">Content (Markdown)</span>
        <textarea
          className="editor-textarea"
          value={component.content}
          onChange={(e) => onChange({ ...component, content: e.target.value })}
          placeholder="Footnote content"
          rows={3}
        />
      </label>
    </div>
  );
}
