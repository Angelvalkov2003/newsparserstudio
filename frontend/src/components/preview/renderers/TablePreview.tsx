import type { TableComponent } from "../../../types";

interface TablePreviewProps {
  component: TableComponent;
}

export function TablePreview({ component }: TablePreviewProps) {
  const headers = component.headers ?? [];
  const rows = component.rows ?? [];
  const caption = component.caption;
  return (
    <div className="preview-table-block">
      <table className="preview-table">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {caption && <p className="preview-table-caption">{caption}</p>}
    </div>
  );
}
