import type { ImageComponent } from "../../../types";

interface ImageEditorProps {
  component: ImageComponent;
  onChange: (next: ImageComponent) => void;
}

export function ImageEditor({ component, onChange }: ImageEditorProps) {
  const url = component.url ?? "";
  const hasUrl = url.startsWith("http") || url.startsWith("data:") || url.startsWith("/");

  return (
    <div className="component-editor image-editor">
      {hasUrl && (
        <div className="image-editor-preview">
          <img src={url} alt={component.description ?? "Preview"} />
        </div>
      )}
      <label className="editor-field">
        <span className="editor-label">URL</span>
        <input
          type="text"
          className="editor-input"
          value={url}
          onChange={(e) => onChange({ ...component, url: e.target.value || undefined })}
          placeholder="Image URL"
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
          placeholder="Alt text"
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
          placeholder="Caption"
        />
      </label>
      <label className="editor-field">
        <span className="editor-label">Link URL</span>
        <input
          type="text"
          className="editor-input"
          value={component.link_url ?? ""}
          onChange={(e) =>
            onChange({ ...component, link_url: e.target.value || undefined })
          }
          placeholder="Optional link when image is clicked"
        />
      </label>
    </div>
  );
}
