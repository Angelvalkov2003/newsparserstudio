import type { LinkComponent } from "../../../types";

interface LinkPreviewProps {
  component: LinkComponent;
}

export function LinkPreview({ component }: LinkPreviewProps) {
  return (
    <p className="preview-link-block">
      <a
        href={component.url}
        target="_blank"
        rel="noopener noreferrer"
        className="preview-link"
      >
        {component.text || component.url}
      </a>
    </p>
  );
}
