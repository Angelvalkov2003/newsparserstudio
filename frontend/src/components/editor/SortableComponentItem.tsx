import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { arrayMove } from "@dnd-kit/sortable";
import type { ArticleComponent } from "../../types";
import type { Dispatch } from "react";
import type { ArticleEditorAction } from "../../state/articleEditorState";
import { ComponentPreview } from "../preview/ComponentPreview";
import { ComponentJsonEditor } from "./editors/ComponentJsonEditor";

interface SortableComponentItemProps {
  component: ArticleComponent;
  index: number;
  total: number;
  components: ArticleComponent[];
  dispatch: Dispatch<ArticleEditorAction>;
  onComponentChange: (index: number, next: ArticleComponent) => void;
  onDelete: (index: number) => void;
}

export function SortableComponentItem({
  component,
  index,
  total,
  components,
  dispatch,
  onComponentChange,
  onDelete,
}: SortableComponentItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(component.id) });

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuOpen]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleMoveUp = () => {
    if (index <= 0) return;
    dispatch({ type: "REORDER_COMPONENTS", payload: arrayMove([...components], index, index - 1) });
    setMenuOpen(false);
  };

  const handleMoveDown = () => {
    if (index >= total - 1) return;
    dispatch({ type: "REORDER_COMPONENTS", payload: arrayMove([...components], index, index + 1) });
    setMenuOpen(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setMenuOpen(false);
  };

  const handleDelete = () => {
    onDelete(index);
    setMenuOpen(false);
  };

  return (
    <li
      id={`component-index-${index}`}
      ref={setNodeRef}
      style={style}
      className={`component-list-item ${isDragging ? "component-list-item--dragging" : ""} ${menuOpen ? "component-list-item--menu-open" : ""}`}
    >
      <div className="component-list-item-body">
        <div className="component-list-item-preview">
          <ComponentPreview component={component} />
        </div>
        <div className="component-list-item-actions" ref={menuRef}>
          <span
            className="component-drag-handle"
            title="Drag to reorder"
            {...attributes}
            {...listeners}
            aria-label={`Drag to reorder component ${index + 1}`}
          >
            <DragHandleIcon />
          </span>
          <button
            type="button"
            className="component-menu-trigger"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="component-list-item-menu" role="menu">
              <button type="button" className="component-list-menu-btn" onClick={handleMoveUp} disabled={index <= 0} role="menuitem">
                Move up
              </button>
              <button type="button" className="component-list-menu-btn" onClick={handleMoveDown} disabled={index >= total - 1} role="menuitem">
                Move down
              </button>
              <button type="button" className="component-list-menu-btn" onClick={handleEdit} role="menuitem">
                Edit style & text
              </button>
              <button type="button" className="component-list-menu-btn component-list-menu-btn-delete" onClick={handleDelete} role="menuitem">
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      {isEditing && (
        <div className="component-list-item-editor-wrap">
          <ComponentJsonEditor
            component={component}
            onApply={(next) => {
              onComponentChange(index, next);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      )}
    </li>
  );
}

function DragHandleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden focusable="false">
      <circle cx="2" cy="2" r="1" fill="currentColor" />
      <circle cx="6" cy="2" r="1" fill="currentColor" />
      <circle cx="10" cy="2" r="1" fill="currentColor" />
      <circle cx="2" cy="6" r="1" fill="currentColor" />
      <circle cx="6" cy="6" r="1" fill="currentColor" />
      <circle cx="10" cy="6" r="1" fill="currentColor" />
      <circle cx="2" cy="10" r="1" fill="currentColor" />
      <circle cx="6" cy="10" r="1" fill="currentColor" />
      <circle cx="10" cy="10" r="1" fill="currentColor" />
    </svg>
  );
}
