import { useState } from "react";
import type { MetadataItem } from "../types";

interface ChipListProps {
  values: MetadataItem[];
  onChange: (next: MetadataItem[]) => void;
  placeholder?: string;
  label: string;
  namePlaceholder?: string;
  linkPlaceholder?: string;
}

export function ChipList({
  values,
  onChange,
  placeholder = "Add…",
  label,
  namePlaceholder,
  linkPlaceholder = "Link (URL)",
}: ChipListProps) {
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    const exists = values.some((item) => item.name === name);
    if (exists) {
      setNewName("");
      setNewUrl("");
      return;
    }
    onChange([
      ...values,
      { name, url: newUrl.trim() || undefined },
    ]);
    setNewName("");
    setNewUrl("");
  };

  const remove = (i: number) => {
    onChange(values.filter((_, j) => j !== i));
  };

  const updateItem = (i: number, patch: Partial<MetadataItem>) => {
    const next = values.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  return (
    <div className="chip-list-field">
      <span className="editor-label">{label}</span>
      <div className="chip-list chip-list--with-links">
        {values.map((item, i) => (
          <div key={`${item.name}-${i}`} className="chip-row">
            <input
              type="text"
              className="chip-input chip-input-name"
              value={item.name}
              onChange={(e) => updateItem(i, { name: e.target.value })}
              placeholder={namePlaceholder ?? placeholder}
              aria-label={`${label} name`}
            />
            <input
              type="url"
              className="chip-input chip-input-link"
              value={item.url ?? ""}
              onChange={(e) =>
                updateItem(i, { url: e.target.value.trim() || undefined })
              }
              placeholder={linkPlaceholder}
              aria-label={`${label} link`}
            />
            <button
              type="button"
              className="chip-remove"
              onClick={() => remove(i)}
              aria-label={`Remove ${item.name}`}
            >
              ×
            </button>
          </div>
        ))}
        <div className="chip-row chip-row--add">
          <input
            type="text"
            className="chip-input chip-input-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
            placeholder={namePlaceholder ?? placeholder}
            aria-label={`Add ${label.toLowerCase()} name`}
          />
          <input
            type="url"
            className="chip-input chip-input-link"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
            placeholder={linkPlaceholder}
            aria-label={`Add ${label.toLowerCase()} link`}
          />
          <button
            type="button"
            className="chip-add"
            onClick={add}
            aria-label="Add"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
