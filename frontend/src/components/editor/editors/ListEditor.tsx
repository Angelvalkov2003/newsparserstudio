import type { ListComponent, ListItemComponent } from "../../../types";

interface ListEditorProps {
  component: ListComponent;
  onChange: (next: ListComponent) => void;
}

export function ListEditor({ component, onChange }: ListEditorProps) {
  const items = component.items ?? [];

  const updateItem = (index: number, patch: Partial<ListItemComponent>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange({ ...component, items: next });
  };

  const addItem = () => {
    onChange({
      ...component,
      items: [...items, { indent: 0, bullet: "-", content: "" }],
    });
  };

  const removeItem = (index: number) => {
    onChange({ ...component, items: items.filter((_, i) => i !== index) });
  };

  return (
    <div className="component-editor list-editor">
      <div className="editor-field">
        <span className="editor-label">List items</span>
        {items.map((item, i) => (
          <div key={i} className="list-editor-row">
            <input
              type="number"
              className="editor-input editor-input-narrow"
              value={item.indent}
              onChange={(e) =>
                updateItem(i, { indent: Math.max(0, parseInt(e.target.value, 10) || 0) })
              }
              placeholder="Indent"
              min={0}
              title="Indent level"
            />
            <input
              type="text"
              className="editor-input editor-input-narrow"
              value={item.bullet}
              onChange={(e) => updateItem(i, { bullet: e.target.value })}
              placeholder="Bullet (-, *, 1.)"
              title="Bullet"
            />
            <input
              type="text"
              className="editor-input list-editor-content"
              value={item.content}
              onChange={(e) => updateItem(i, { content: e.target.value })}
              placeholder="Content"
            />
            <button
              type="button"
              className="editor-button editor-button--secondary list-editor-remove"
              onClick={() => removeItem(i)}
              aria-label="Remove item"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="editor-button editor-button--secondary"
          onClick={addItem}
        >
          Add item
        </button>
      </div>
    </div>
  );
}
