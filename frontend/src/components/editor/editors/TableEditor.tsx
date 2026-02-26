import type { TableComponent } from "../../../types";

interface TableEditorProps {
  component: TableComponent;
  onChange: (next: TableComponent) => void;
}

export function TableEditor({ component, onChange }: TableEditorProps) {
  const headers = component.headers ?? [];
  const rows = component.rows ?? [];

  const setHeaders = (next: string[]) =>
    onChange({ ...component, headers: next });
  const setRows = (next: string[][]) =>
    onChange({ ...component, rows: next });

  const updateHeader = (index: number, value: string) => {
    const next = [...headers];
    next[index] = value;
    setHeaders(next);
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const row = rows[rowIndex] ?? [];
    const newRow = [...row];
    while (newRow.length <= colIndex) newRow.push("");
    newRow[colIndex] = value;
    const next = rows.map((r, i) => (i === rowIndex ? newRow : r));
    setRows(next);
  };

  const addHeader = () => setHeaders([...headers, ""]);
  const removeHeader = (index: number) =>
    setHeaders(headers.filter((_, i) => i !== index));
  const addRow = () =>
    setRows([
      ...rows,
      headers.length > 0 ? headers.map(() => "") : [""],
    ]);
  const removeRow = (index: number) =>
    setRows(rows.filter((_, i) => i !== index));

  return (
    <div className="component-editor table-editor">
      <label className="editor-field">
        <span className="editor-label">Caption</span>
        <input
          type="text"
          className="editor-input"
          value={component.caption ?? ""}
          onChange={(e) =>
            onChange({ ...component, caption: e.target.value || undefined })
          }
          placeholder="Optional table caption"
        />
      </label>
      <div className="editor-field">
        <span className="editor-label">Headers</span>
        {headers.map((h, i) => (
          <div key={i} className="table-editor-header-row">
            <input
              type="text"
              className="editor-input"
              value={h}
              onChange={(e) => updateHeader(i, e.target.value)}
              placeholder={`Header ${i + 1}`}
            />
            <button
              type="button"
              className="editor-button editor-button--secondary"
              onClick={() => removeHeader(i)}
              aria-label="Remove header"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="editor-button editor-button--secondary"
          onClick={addHeader}
        >
          Add header
        </button>
      </div>
      <div className="editor-field">
        <span className="editor-label">Rows</span>
        {rows.map((row, ri) => (
          <div key={ri} className="table-editor-row">
            {(headers.length > 0 ? headers : [""]).map((_, ci) => (
              <input
                key={ci}
                type="text"
                className="editor-input table-editor-cell"
                value={row[ci] ?? ""}
                onChange={(e) => updateCell(ri, ci, e.target.value)}
                placeholder={`Cell ${ri + 1},${ci + 1}`}
              />
            ))}
            <button
              type="button"
              className="editor-button editor-button--secondary"
              onClick={() => removeRow(ri)}
              aria-label="Remove row"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="editor-button editor-button--secondary"
          onClick={addRow}
        >
          Add row
        </button>
      </div>
    </div>
  );
}
