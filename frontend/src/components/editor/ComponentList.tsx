import {
  DndContext,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { ArticleComponent } from "../../types";
import type { Dispatch } from "react";
import type { ArticleEditorAction } from "../../state/articleEditorState";
import { SortableComponentItem } from "./SortableComponentItem";

interface ComponentListProps {
  components: ArticleComponent[];
  dispatch: Dispatch<ArticleEditorAction>;
}

export function ComponentList({ components, dispatch }: ComponentListProps) {
  const handleChange = (index: number, next: ArticleComponent) => {
    dispatch({ type: "UPDATE_COMPONENT", payload: { index, component: next } });
  };

  const handleDelete = (index: number) => {
    dispatch({ type: "DELETE_COMPONENT", payload: index });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = components.findIndex((c) => c.id === active.id);
    const newIndex = components.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove([...components], oldIndex, newIndex);
    dispatch({ type: "REORDER_COMPONENTS", payload: reordered });
  }

  const componentIds = components.map((c) => c.id);
  const dndKey = `${components.length}-${[...componentIds].sort().join(",")}`;

  return (
    <section
      className="editor-section editor-components"
      aria-label="Article components"
    >
      <h2 className="editor-section-title">Components</h2>

      <DndContext
        key={dndKey}
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={componentIds}
          strategy={verticalListSortingStrategy}
        >
          <ol className="component-list">
            {components.map((component, index) => (
              <SortableComponentItem
                key={component.id}
                component={component}
                index={index}
                total={components.length}
                components={components}
                dispatch={dispatch}
                onComponentChange={handleChange}
                onDelete={handleDelete}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      {components.length === 0 && (
        <p className="editor-empty">No components. Load an article to edit.</p>
      )}
    </section>
  );
}
