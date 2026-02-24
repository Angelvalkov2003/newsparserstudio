import type { ParagraphComponent } from "../../../types";

interface ParagraphEditorProps {
  component: ParagraphComponent;
  onChange: (next: ParagraphComponent) => void;
}

export function ParagraphEditor({ component, onChange }: ParagraphEditorProps) {
  return (
    <div className="component-editor paragraph-editor">
      <label className="editor-field">
        <span className="editor-label">Paragraph (Markdown)</span>
        <textarea
          className="editor-textarea"
          value={component.text}
          onChange={(e) => onChange({ ...component, text: e.target.value })}
          placeholder="Markdown text"
          rows={4}
        />
      </label>
    </div>
  );
}
