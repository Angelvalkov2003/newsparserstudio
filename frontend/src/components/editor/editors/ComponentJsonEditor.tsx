import { useState, useEffect } from "react";
import type { ArticleComponent } from "../../../types";
import { validateComponentObject } from "../validateComponentJson";

export interface ComponentJsonEditorProps {
  component: ArticleComponent;
  onApply: (next: ArticleComponent) => void;
  onCancel: () => void;
}

export function ComponentJsonEditor({
  component,
  onApply,
  onCancel,
}: ComponentJsonEditorProps) {
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(component, null, 2)
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setJsonText(JSON.stringify(component, null, 2));
    setError(null);
  }, [component.id]);

  const handleApply = () => {
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid JSON";
      setError(`Invalid JSON: ${message}`);
      return;
    }
    const result = validateComponentObject(parsed, {
      keepId: component.id,
    });
    if (!result.success) {
      setError(result.error);
      return;
    }
    onApply(result.component);
  };

  return (
    <div className="component-json-editor">
      <label className="editor-field">
        <span className="editor-label">Component (JSON)</span>
        <textarea
          className="editor-textarea editor-json-editor-textarea"
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value);
            setError(null);
          }}
          spellCheck={false}
          rows={14}
          aria-invalid={error !== null}
          aria-describedby={error ? "component-json-error" : undefined}
        />
      </label>
      {error && (
        <div
          id="component-json-error"
          className="editor-message editor-message--error"
          role="alert"
        >
          {error}
        </div>
      )}
      <div className="component-json-editor-actions">
        <button
          type="button"
          className="editor-button editor-button--primary"
          onClick={handleApply}
        >
          Apply
        </button>
        <button
          type="button"
          className="editor-button editor-button--secondary"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
