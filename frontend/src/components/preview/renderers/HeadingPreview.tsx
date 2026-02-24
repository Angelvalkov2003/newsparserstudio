import type { HeadingComponent } from "../../../types";

interface HeadingPreviewProps {
  component: HeadingComponent;
}

export function HeadingPreview({ component }: HeadingPreviewProps) {
  const Level = `h${Math.min(6, Math.max(1, component.level ?? 1))}` as keyof JSX.IntrinsicElements;
  return <Level className="preview-heading">{component.text}</Level>;
}
