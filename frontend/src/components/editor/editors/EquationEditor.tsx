import type { EquationComponent } from "../../../types";

interface EquationEditorProps {
  component: EquationComponent;
  onChange: (next: EquationComponent) => void;
}

export function EquationEditor({ component, onChange }: EquationEditorProps) {
  return (
    <div className="component-editor equation-editor">
      <label className="editor-field">
        <span className="editor-label">LaTeX</span>
        <textarea
          className="editor-textarea"
          value={component.latex}
          onChange={(e) => onChange({ ...component, latex: e.target.value })}
          placeholder="E = mc^2"
          rows={2}
        />
      </label>
      <label className="editor-field">
        <span className="editor-label">Equation number</span>
        <input
          type="number"
          className="editor-input"
          value={component.equation_number ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onChange({
              ...component,
              equation_number: v === "" ? undefined : Number(v),
            });
          }}
          placeholder="Optional"
        />
      </label>
    </div>
  );
}
