import type { LinkComponent } from "../../../types";

interface LinkEditorProps {
  component: LinkComponent;
  onChange: (next: LinkComponent) => void;
}

export function LinkEditor({ component, onChange }: LinkEditorProps) {
  return (
    <div className="component-editor link-editor">
      <label className="editor-field">
        <span className="editor-label">Text</span>
        <input
          type="text"
          className="editor-input"
          value={component.text}
          onChange={(e) => onChange({ ...component, text: e.target.value })}
          placeholder="Link text"
        />
      </label>
      <label className="editor-field">
        <span className="editor-label">URL</span>
        <input
          type="text"
          className="editor-input"
          value={component.url}
          onChange={(e) => onChange({ ...component, url: e.target.value })}
          placeholder="https://..."
        />
      </label>
    </div>
  );
}
