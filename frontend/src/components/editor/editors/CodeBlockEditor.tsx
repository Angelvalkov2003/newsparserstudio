import type { CodeBlockComponent } from "../../../types";

interface CodeBlockEditorProps {
  component: CodeBlockComponent;
  onChange: (next: CodeBlockComponent) => void;
}

export function CodeBlockEditor({ component, onChange }: CodeBlockEditorProps) {
  return (
    <div className="component-editor code-block-editor">
      <label className="editor-field">
        <span className="editor-label">Language</span>
        <input
          type="text"
          className="editor-input"
          value={component.language ?? ""}
          onChange={(e) =>
            onChange({ ...component, language: e.target.value || undefined })
          }
          placeholder="e.g. javascript, python"
        />
      </label>
      <label className="editor-field">
        <span className="editor-label">Code</span>
        <textarea
          className="editor-textarea editor-code"
          value={component.code}
          onChange={(e) => onChange({ ...component, code: e.target.value })}
          placeholder="Source code"
          rows={6}
          spellCheck={false}
        />
      </label>
    </div>
  );
}
