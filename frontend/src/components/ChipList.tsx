import { useState } from "react";
import type { MetadataItem } from "../types";

interface ChipListProps {
  values: MetadataItem[];
  onChange: (next: MetadataItem[]) => void;
  placeholder?: string;
  label: string;
}

export function ChipList({ values, onChange, placeholder = "Add…", label }: ChipListProps) {
  const [input, setInput] = useState("");

  const add = () => {
    const t = input.trim();
    if (!t) return;
    const exists = values.some((item) => item.name === t);
    if (exists) {
      setInput("");
      return;
    }
    onChange([...values, { name: t }]);
    setInput("");
  };

  const remove = (i: number) => {
    onChange(values.filter((_, j) => j !== i));
  };

  return (
    <div className="chip-list-field">
      <span className="editor-label">{label}</span>
      <div className="chip-list">
        {values.map((item, i) => (
          <span key={`${item.name}-${i}`} className="chip">
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="chip-link"
              >
                {item.name}
              </a>
            ) : (
              item.name
            )}
            <button
              type="button"
              className="chip-remove"
              onClick={() => remove(i)}
              aria-label={`Remove ${item.name}`}
            >
              ×
            </button>
          </span>
        ))}
        <span className="chip-input-wrap">
          <input
            type="text"
            className="chip-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
            onBlur={add}
            placeholder={placeholder}
            aria-label={`Add ${label.toLowerCase()}`}
          />
          <button type="button" className="chip-add" onClick={add} aria-label="Add">
            +
          </button>
        </span>
      </div>
    </div>
  );
}
