import type { Dispatch } from "react";
import type { ArticleEditorState, ArticleEditorAction, PreviewMode } from "../../state/articleEditorState";
import { CorrectedPreview } from "./CorrectedPreview";

interface PreviewPanelProps {
  state: ArticleEditorState;
  dispatch: Dispatch<ArticleEditorAction>;
}

const MODE_OPTIONS: { value: PreviewMode; label: string }[] = [
  { value: "original", label: "url" },
  { value: "corrected", label: "data_corrected" },
];

export function PreviewPanel({ state, dispatch }: PreviewPanelProps) {
  const { url, data_corrected, activePreviewMode } = state;

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as PreviewMode;
    if (value === "original" || value === "corrected") {
      dispatch({ type: "SET_PREVIEW_MODE", payload: value });
    }
  };

  return (
    <main className="preview-panel" aria-label="Preview">
      <div className="preview-panel-toolbar">
        <label className="preview-mode-label">
          <span className="preview-mode-label-text">Preview</span>
          <select
            className="preview-mode-select"
            value={activePreviewMode}
            onChange={handleModeChange}
            aria-label="Preview mode"
          >
            {MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="preview-panel-content">
        {activePreviewMode === "original" && (
          <>
            {url ? (
              <iframe
                title="Original article"
                src={url}
                className="preview-iframe"
                sandbox="allow-same-origin allow-scripts"
              />
            ) : (
              <p className="preview-placeholder-block">
                Load an article to see the original page. Enter a URL and load
                the article, or the URL is set when you upload a JSON file.
              </p>
            )}
          </>
        )}

        {activePreviewMode === "corrected" && (
          <CorrectedPreview data={data_corrected} readOnly />
        )}
      </div>
    </main>
  );
}
