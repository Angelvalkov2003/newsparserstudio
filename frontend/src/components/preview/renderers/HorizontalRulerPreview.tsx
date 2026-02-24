import type { HorizontalRulerComponent } from "../../../types";

interface HorizontalRulerPreviewProps {
  component: HorizontalRulerComponent;
}

export function HorizontalRulerPreview({ component }: HorizontalRulerPreviewProps) {
  void component;
  return <hr className="preview-hr" />;
}
