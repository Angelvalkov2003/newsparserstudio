import type { PollComponent } from "../../../types";

interface PollEditorProps {
  component: PollComponent;
  onChange: (next: PollComponent) => void;
}

export function PollEditor({ component, onChange }: PollEditorProps) {
  const choices = component.choices ?? [];

  const updateChoice = (index: number, value: string) => {
    const next = [...choices];
    next[index] = value;
    onChange({ ...component, choices: next });
  };

  const addChoice = () => {
    onChange({ ...component, choices: [...choices, ""] });
  };

  const removeChoice = (index: number) => {
    onChange({ ...component, choices: choices.filter((_, i) => i !== index) });
  };

  return (
    <div className="component-editor poll-editor">
      <label className="editor-field">
        <span className="editor-label">Poll name</span>
        <input
          type="text"
          className="editor-input"
          value={component.poll_name ?? ""}
          onChange={(e) =>
            onChange({ ...component, poll_name: e.target.value || undefined })
          }
          placeholder="e.g. Poll"
        />
      </label>
      <label className="editor-field">
        <span className="editor-label">Question</span>
        <input
          type="text"
          className="editor-input"
          value={component.question}
          onChange={(e) => onChange({ ...component, question: e.target.value })}
          placeholder="Poll question"
        />
      </label>
      <div className="editor-field">
        <span className="editor-label">Choices</span>
        {choices.map((c, i) => (
          <div key={i} className="poll-editor-choice-row">
            <input
              type="text"
              className="editor-input"
              value={c}
              onChange={(e) => updateChoice(i, e.target.value)}
              placeholder={`Choice ${i + 1}`}
            />
            <button
              type="button"
              className="editor-button editor-button--secondary"
              onClick={() => removeChoice(i)}
              aria-label="Remove choice"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="editor-button editor-button--secondary"
          onClick={addChoice}
        >
          Add choice
        </button>
      </div>
      <label className="editor-field editor-field-inline">
        <input
          type="checkbox"
          checked={component.allow_multiple ?? false}
          onChange={(e) =>
            onChange({ ...component, allow_multiple: e.target.checked })
          }
        />
        <span className="editor-label">Allow multiple choices</span>
      </label>
      <label className="editor-field">
        <span className="editor-label">Count name</span>
        <input
          type="text"
          className="editor-input"
          value={component.count_name ?? ""}
          onChange={(e) =>
            onChange({ ...component, count_name: e.target.value || undefined })
          }
          placeholder="e.g. votes"
        />
      </label>
    </div>
  );
}
