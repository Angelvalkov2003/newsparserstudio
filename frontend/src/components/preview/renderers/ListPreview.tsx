import type { ListComponent } from "../../../types";

interface ListPreviewProps {
  component: ListComponent;
}

export function ListPreview({ component }: ListPreviewProps) {
  const items = component.items ?? [];
  return (
    <div className="preview-list-block">
      <ul className="preview-list">
        {items.map((item, i) => (
          <li key={i} style={{ marginLeft: `${(item.indent ?? 0) * 1.5}em` }}>
            {item.bullet ?? "-"} {item.content}
          </li>
        ))}
      </ul>
    </div>
  );
}
