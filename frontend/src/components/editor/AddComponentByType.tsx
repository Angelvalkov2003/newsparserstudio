import { useState, useEffect } from "react";
import type { Dispatch } from "react";
import type { ArticleEditorAction } from "../../state/articleEditorState";
import type { ArticleComponent, ArticleComponentType } from "../../types";
import { COMPONENT_TYPES } from "../../types";
import { generateComponentId } from "./validateComponentJson";
import { getDefaultComponent } from "./defaultComponent";
import { ComponentEditor } from "./editors/ComponentEditor";

interface AddComponentByTypeProps {
  dispatch: Dispatch<ArticleEditorAction>;
  existingComponentIds: string[];
  /** Inline in toolbar row (dropdown only in row; draft form below when type selected) */
  compact?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  heading: "Heading",
  paragraph: "Paragraph",
  image: "Image",
  link: "Link",
  code_block: "Code block",
  equation: "Equation",
  citation: "Citation",
  footnote: "Footnote",
  horizontal_ruler: "Horizontal ruler",
  list: "List",
  poll: "Poll",
  table: "Table",
  video: "Video",
};

export function AddComponentByType({
  dispatch,
  existingComponentIds,
  compact = false,
}: AddComponentByTypeProps) {
  const [selectedType, setSelectedType] = useState<ArticleComponentType | "">("");
  const [draft, setDraft] = useState<ArticleComponent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!selectedType) {
      setDraft(null);
      return;
    }
    const id = generateComponentId();
    setDraft(getDefaultComponent(selectedType, id));
  }, [selectedType]);

  const handleAdd = () => {
    if (!draft) return;
    const existingSet = new Set(existingComponentIds);
    const component = existingSet.has(draft.id)
      ? { ...draft, id: generateComponentId() }
      : draft;
    dispatch({ type: "ADD_COMPONENT", payload: component });
    setSelectedType("");
    setDraft(null);
    setModalOpen(false);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedType("");
    setDraft(null);
  };

  const select = (
    <label className={compact ? "editor-add-inline" : "editor-field"}>
      {!compact && <span className="editor-label">Type</span>}
      <select
        className={compact ? "editor-panel-action-select" : "editor-select"}
        value={selectedType}
        onChange={(e) =>
          setSelectedType((e.target.value || "") as ArticleComponentType | "")
        }
        aria-label="Component type"
      >
        <option value="">— Select type —</option>
        {COMPONENT_TYPES.map((t) => (
          <option key={t} value={t}>
            {TYPE_LABELS[t] ?? t}
          </option>
        ))}
      </select>
    </label>
  );

  if (compact) {
    return (
      <div className="editor-add-by-type-compact">
        <button
          type="button"
          className="editor-panel-action-btn"
          onClick={() => setModalOpen(true)}
          aria-label="Add component"
        >
          Add component
        </button>
        {modalOpen && (
          <div
            className="editor-add-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editor-add-modal-title"
          >
            <div className="editor-add-modal" onClick={(e) => e.stopPropagation()}>
              <div className="editor-add-modal-header">
                <h2 id="editor-add-modal-title" className="editor-add-modal-title">
                  Add component
                </h2>
                <button
                  type="button"
                  className="editor-add-modal-close"
                  onClick={closeModal}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="editor-add-modal-body">
                {select}
                {draft && (
                  <div className="editor-add-by-type-draft">
                    <div className="add-component-form">
                      <ComponentEditor
                        component={draft}
                        index={0}
                        onChange={(_index, next) => setDraft(next)}
                        hideTypeSelect
                      />
                    </div>
                    <div className="editor-add-by-type-actions">
                      <button
                        type="button"
                        className="editor-button editor-button--primary"
                        onClick={handleAdd}
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        className="editor-button editor-button--secondary"
                        onClick={closeModal}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <section
      className="editor-section editor-add-by-type"
      aria-label="Add component"
    >
      <h2 className="editor-section-title">Add component</h2>
      {select}
      {draft && (
        <>
          <div className="add-component-form">
            <ComponentEditor
              component={draft}
              index={0}
              onChange={(_index, next) => setDraft(next)}
            />
          </div>
          <div className="editor-add-by-type-actions">
            <button
              type="button"
              className="editor-button editor-button--primary"
              onClick={handleAdd}
            >
              Add
            </button>
            <button
              type="button"
              className="editor-button editor-button--secondary"
              onClick={() => {
                setSelectedType("");
                setDraft(null);
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </section>
  );
}
