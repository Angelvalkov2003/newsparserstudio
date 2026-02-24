import type { CodeBlockComponent } from "../../../types";

interface CodeBlockPreviewProps {
  component: CodeBlockComponent;
}

export function CodeBlockPreview({ component }: CodeBlockPreviewProps) {
  return (
    <pre className="preview-code-block">
      <code className={component.language ? `language-${component.language}` : undefined}>
        {component.code}
      </code>
    </pre>
  );
}
