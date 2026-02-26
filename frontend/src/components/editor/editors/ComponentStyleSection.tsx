import type { ArticleComponent, ArticleComponentType } from "../../../types";
import { COMPONENT_TYPES } from "../../../types";
import { getDefaultComponent } from "../defaultComponent";

const TYPE_LABELS: Record<string, string> = {
  heading: "Heading",
  paragraph: "Paragraph",
  image: "Image",
  link: "Link",
  code_block: "Code block",
  equation: "Equation",
  citation: "Citation",
  footnote: "Footnote",
  horizontal_ruler: "Horizontal ruler",
  list: "List",
  poll: "Poll",
  table: "Table",
  video: "Video",
};

interface ComponentStyleSectionProps {
  component: ArticleComponent;
  onChange: (next: ArticleComponent) => void;
}

export function ComponentStyleSection({
  component,
  onChange,
}: ComponentStyleSectionProps) {
  const handleTypeChange = (newType: ArticleComponentType) => {
    if (newType === component.type) return;
    const next = getDefaultComponent(newType, component.id);
    const prev = component as Record<string, unknown>;
    const strKeys = [
      "text",
      "citation_text",
      "author_text",
      "code",
      "latex",
      "question",
      "url",
      "content",
      "identifier",
      "name",
      "caption",
      "description",
    ] as const;
    for (const key of strKeys) {
      if (key in prev && typeof prev[key] === "string" && key in next)
        (next as Record<string, unknown>)[key] = prev[key];
    }
    onChange(next);
  };

  return (
    <div className="component-editor-style-section">
      <span className="editor-label">Style & attributes</span>
      <label className="editor-field">
        <span className="editor-label">Type</span>
        <select
          className="editor-select"
          value={component.type}
          onChange={(e) =>
            handleTypeChange((e.target.value as ArticleComponentType) || "paragraph")
          }
          aria-label="Component type"
        >
          {COMPONENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t] ?? t}
            </option>
          ))}
        </select>
      </label>
      <label className="editor-field">
        <span className="editor-label">ID</span>
        <input
          type="text"
          className="editor-input"
          value={component.id}
          onChange={(e) => onChange({ ...component, id: e.target.value.trim() || component.id })}
          placeholder="Unique component ID"
        />
      </label>
    </div>
  );
}
