import type { HorizontalRulerComponent } from "../../../types";

interface HorizontalRulerEditorProps {
  component: HorizontalRulerComponent;
  onChange: (next: HorizontalRulerComponent) => void;
}

export function HorizontalRulerEditor({
  component,
  onChange,
}: HorizontalRulerEditorProps) {
  void onChange;
  return (
    <div className="component-editor horizontal-ruler-editor">
      <span className="editor-label">Horizontal rule</span>
      <p className="editor-hint">No editable fields (component id: {component.id})</p>
    </div>
  );
}
