import { useState, useRef, useEffect } from "react";
import type { ArticleComponent } from "../../types";
import type { Dispatch } from "react";
import type { ArticleEditorAction } from "../../state/articleEditorState";
import { arrayMove } from "@dnd-kit/sortable";
import { ComponentPreview } from "./ComponentPreview";
import { ComponentJsonEditor } from "../editor/editors/ComponentJsonEditor";

interface PreviewComponentWrapProps {
  component: ArticleComponent;
  index: number;
  total: number;
  components: ArticleComponent[];
  dispatch: Dispatch<ArticleEditorAction>;
}

export function PreviewComponentWrap({
  component,
  index,
  total,
  components,
  dispatch,
}: PreviewComponentWrapProps) {
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  const handleDelete = () => {
    dispatch({ type: "DELETE_COMPONENT", payload: index });
    setOpen(false);
  };

  const handleEdit = () => {
    setOpen(false);
    setIsEditing(true);
  };

  const handleMoveUp = () => {
    if (index <= 0) return;
    const reordered = arrayMove([...components], index, index - 1);
    dispatch({ type: "REORDER_COMPONENTS", payload: reordered });
    setOpen(false);
  };

  const handleMoveDown = () => {
    if (index >= total - 1) return;
    const reordered = arrayMove([...components], index, index + 1);
    dispatch({ type: "REORDER_COMPONENTS", payload: reordered });
    setOpen(false);
  };

  return (
    <div
      ref={wrapRef}
      className="preview-component-wrap interactive"
    >
      <div
        className="preview-component-clickable"
        onClick={() => setOpen((o) => !o)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpen((o) => !o)}
        aria-label={`Component ${index + 1}, click for actions`}
      >
        <ComponentPreview component={component} />
      </div>
      {open && (
        <div className="preview-component-menu" role="menu">
          <button type="button" className="preview-menu-btn" onClick={handleEdit} role="menuitem">
            Edit
          </button>
          <button type="button" className="preview-menu-btn" onClick={handleMoveUp} disabled={index <= 0} role="menuitem">
            Move up
          </button>
          <button type="button" className="preview-menu-btn" onClick={handleMoveDown} disabled={index >= total - 1} role="menuitem">
            Move down
          </button>
          <button type="button" className="preview-menu-btn preview-menu-btn-delete" onClick={handleDelete} role="menuitem">
            Delete
          </button>
        </div>
      )}
      {isEditing && (
        <div className="preview-component-edit-wrap">
          <ComponentJsonEditor
            component={component}
            onApply={(next) => {
              dispatch({ type: "UPDATE_COMPONENT", payload: { index, component: next } });
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      )}
    </div>
  );
}
