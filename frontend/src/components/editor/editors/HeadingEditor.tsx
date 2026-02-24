import type { HeadingComponent } from "../../../types";

interface HeadingEditorProps {
  component: HeadingComponent;
  onChange: (next: HeadingComponent) => void;
}

export function HeadingEditor({ component, onChange }: HeadingEditorProps) {
  const level = component.level ?? 1;

  return (
    <div className="component-editor heading-editor">
      <label className="editor-field">
        <span className="editor-label">Heading</span>
        <input
          type="text"
          className="editor-input"
          value={component.text}
          onChange={(e) => onChange({ ...component, text: e.target.value })}
          placeholder="Heading text"
        />
      </label>
      <label className="editor-field editor-field-inline">
        <span className="editor-label">Level</span>
        <select
          className="editor-select"
          value={level}
          onChange={(e) =>
            onChange({ ...component, level: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6 })
          }
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              H{n}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
