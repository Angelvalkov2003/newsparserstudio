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
}: AddComponentByTypeProps) {
  const [selectedType, setSelectedType] = useState<ArticleComponentType | "">("");
  const [draft, setDraft] = useState<ArticleComponent | null>(null);

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
  };

  return (
    <section
      className="editor-section editor-add-by-type"
      aria-label="Add component"
    >
      <h2 className="editor-section-title">Add component</h2>
      <label className="editor-field">
        <span className="editor-label">Type</span>
        <select
          className="editor-select"
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
