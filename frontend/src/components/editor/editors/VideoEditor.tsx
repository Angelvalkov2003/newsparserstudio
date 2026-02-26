import type { VideoComponent } from "../../../types";

interface VideoEditorProps {
  component: VideoComponent;
  onChange: (next: VideoComponent) => void;
}

export function VideoEditor({ component, onChange }: VideoEditorProps) {
  return (
    <div className="component-editor video-editor">
      <label className="editor-field">
        <span className="editor-label">URL *</span>
        <input
          type="text"
          className="editor-input"
          value={component.url ?? ""}
          onChange={(e) => onChange({ ...component, url: e.target.value })}
          placeholder="Video URL"
        />
      </label>
      <label className="editor-field">
        <span className="editor-label">Name</span>
        <input
          type="text"
          className="editor-input"
          value={component.name ?? ""}
          onChange={(e) =>
            onChange({ ...component, name: e.target.value || undefined })
          }
          placeholder="Display name / link text"
        />
      </label>
      <label className="editor-field">
        <span className="editor-label">Caption</span>
        <input
          type="text"
          className="editor-input"
          value={component.caption ?? ""}
          onChange={(e) =>
            onChange({ ...component, caption: e.target.value || undefined })
          }
          placeholder="Optional caption"
        />
      </label>
      <label className="editor-field">
        <span className="editor-label">Description (alt)</span>
        <input
          type="text"
          className="editor-input"
          value={component.description ?? ""}
          onChange={(e) =>
            onChange({ ...component, description: e.target.value || undefined })
          }
          placeholder="Accessibility description"
        />
      </label>
      <label className="editor-field">
        <span className="editor-label">Thumbnail image URL</span>
        <input
          type="text"
          className="editor-input"
          value={component.thumbnail_image_url ?? ""}
          onChange={(e) =>
            onChange({
              ...component,
              thumbnail_image_url: e.target.value || undefined,
            })
          }
          placeholder="Optional thumbnail"
        />
      </label>
    </div>
  );
}
