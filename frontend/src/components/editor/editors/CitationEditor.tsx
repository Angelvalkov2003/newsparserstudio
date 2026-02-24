import type { CitationComponent } from "../../../types";

interface CitationEditorProps {
  component: CitationComponent;
  onChange: (next: CitationComponent) => void;
}

export function CitationEditor({ component, onChange }: CitationEditorProps) {
  return (
    <div className="component-editor citation-editor">
      <label className="editor-field">
        <span className="editor-label">Citation text (Markdown)</span>
        <textarea
          className="editor-textarea"
          value={component.citation_text}
          onChange={(e) =>
            onChange({ ...component, citation_text: e.target.value })
          }
          placeholder="Quoted material"
          rows={3}
        />
      </label>
      <label className="editor-field">
        <span className="editor-label">Author / attribution</span>
        <input
          type="text"
          className="editor-input"
          value={component.author_text ?? ""}
          onChange={(e) =>
            onChange({ ...component, author_text: e.target.value || undefined })
          }
          placeholder="Optional attribution"
        />
      </label>
    </div>
  );
}
