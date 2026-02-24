import { useState, useCallback } from "react";
import type { Dispatch } from "react";
import type { ArticleEditorAction } from "../../state/articleEditorState";
import { validateComponentJson, generateComponentId } from "./validateComponentJson";
import { COMPONENT_TYPES } from "../../types";

interface AddComponentByJsonProps {
  dispatch: Dispatch<ArticleEditorAction>;
  existingComponentIds: string[];
}

const PLACEHOLDER = `{
  "type": "paragraph",
  "text": "New paragraph content."
}`;

export function AddComponentByJson({
  dispatch,
  existingComponentIds,
}: AddComponentByJsonProps) {
  const [jsonInput, setJsonInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleInsert = useCallback(() => {
    setError(null);
    setSuccessMessage(null);

    const result = validateComponentJson(jsonInput);

    if (!result.success) {
      setError(result.error);
      return;
    }

    const existingSet = new Set(existingComponentIds);
    const component =
      existingSet.has(result.component.id)
        ? { ...result.component, id: generateComponentId() }
        : result.component;

    dispatch({ type: "ADD_COMPONENT", payload: component });
    setSuccessMessage(`Added "${component.type}" component.`);
    setJsonInput("");
  }, [jsonInput, dispatch, existingComponentIds]);

  const handleClear = useCallback(() => {
    setJsonInput("");
    setError(null);
    setSuccessMessage(null);
  }, []);

  return (
    <section
      className="editor-section editor-add-json"
      aria-label="Insert component from JSON"
    >
      <h2 className="editor-section-title">Insert component (JSON)</h2>
      <p className="editor-hint">
        Paste a single component as JSON. Type must be one of:{" "}
        {COMPONENT_TYPES.join(", ")}.
      </p>

      <label className="editor-field">
        <span className="editor-label">JSON</span>
        <textarea
          className="editor-textarea editor-json-input"
          value={jsonInput}
          onChange={(e) => {
            setJsonInput(e.target.value);
            setError(null);
            setSuccessMessage(null);
          }}
          placeholder={PLACEHOLDER}
          rows={6}
          spellCheck={false}
          aria-invalid={error !== null}
          aria-describedby={error ? "add-json-error" : successMessage ? "add-json-success" : undefined}
        />
      </label>

      {error && (
        <div
          id="add-json-error"
          className="editor-message editor-message--error"
          role="alert"
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          id="add-json-success"
          className="editor-message editor-message--success"
          role="status"
        >
          {successMessage}
        </div>
      )}

      <div className="editor-add-json-actions">
        <button
          type="button"
          className="editor-button editor-button--primary"
          onClick={handleInsert}
          disabled={jsonInput.trim() === ""}
        >
          Insert component
        </button>
        <button
          type="button"
          className="editor-button editor-button--secondary"
          onClick={handleClear}
        >
          Clear
        </button>
      </div>
    </section>
  );
}
