import type { EquationComponent } from "../../../types";

interface EquationPreviewProps {
  component: EquationComponent;
}

export function EquationPreview({ component }: EquationPreviewProps) {
  const num = component.equation_number != null ? ` (${component.equation_number})` : "";
  return (
    <p className="preview-equation" style={{ whiteSpace: "pre-wrap" }}>
      <span className="preview-equation-latex">{component.latex}</span>
      {num}
    </p>
  );
}
