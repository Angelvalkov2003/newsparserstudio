import { useState, useEffect } from "react";
import type { Dispatch } from "react";
import type { ArticleEditorState, ArticleEditorAction, PreviewMode } from "../../state/articleEditorState";
import type { ParsedWithPage } from "../../api";
import type { ArticleDataCorrected } from "../../types";
import { CorrectedPreview } from "./CorrectedPreview";
import { formatParsedLabel } from "../../utils/formatParsedLabel";
import { getParsed } from "../../api";
import { parseDataParsedLike } from "../editor/UploadArticleButton";

interface PreviewPanelProps {
  state: ArticleEditorState;
  dispatch: Dispatch<ArticleEditorAction>;
  pageUrl: string;
  verifiedList: ParsedWithPage[];
  selectedReference: "url" | number;
  onReferenceChange: (value: "url" | number) => void;
  /** Download the current reference (verified parsed) as JSON file */
  onDownloadReference?: () => void;
}

const MODE_OPTIONS: { value: PreviewMode; label: string }[] = [
  { value: "original", label: "url" },
  { value: "corrected", label: "data_corrected" },
];

export function PreviewPanel({
  state,
  dispatch,
  pageUrl,
  verifiedList,
  selectedReference,
  onReferenceChange,
  onDownloadReference,
}: PreviewPanelProps) {
  const { url, data_corrected_loaded, activePreviewMode } = state;
  const [referenceData, setReferenceData] = useState<ArticleDataCorrected | null>(null);
  const [loadingReference, setLoadingReference] = useState(false);

  const hasPage = Boolean(pageUrl);

  // When reference is a parsed id, fetch its data
  useEffect(() => {
    if (typeof selectedReference !== "number") {
      setReferenceData(null);
      return;
    }
    setLoadingReference(true);
    getParsed(selectedReference)
      .then((r) => {
        try {
          const raw = JSON.parse(r.data);
          const parsed = parseDataParsedLike(raw);
          setReferenceData(parsed ?? { metadata: { title: "", authors: [], categories: [], tags: [] }, components: [] });
        } catch {
          setReferenceData(null);
        }
      })
      .catch(() => setReferenceData(null))
      .finally(() => setLoadingReference(false));
  }, [selectedReference]);

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as PreviewMode;
    if (value === "original" || value === "corrected") {
      dispatch({ type: "SET_PREVIEW_MODE", payload: value });
    }
  };

  const handleReferenceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v === "url") {
      onReferenceChange("url");
    } else {
      onReferenceChange(Number(v));
    }
  };

  return (
    <main className="preview-panel" aria-label="Preview">
      <div className="preview-panel-toolbar">
        {hasPage ? (
          <label className="preview-mode-label">
            <span className="preview-mode-label-text">Reference</span>
            <select
              className="preview-mode-select"
              value={selectedReference === "url" ? "url" : selectedReference}
              onChange={handleReferenceChange}
              aria-label="Reference: URL or verified parsed"
            >
              <option value="url">URL</option>
              {verifiedList.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatParsedLabel(p)}
                </option>
              ))}
            </select>
          </label>
        ) : (
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
        )}
      </div>

      <div className="preview-panel-content">
        {hasPage ? (
          selectedReference === "url" ? (
            pageUrl ? (
              <iframe
                title="Original article (page URL)"
                src={pageUrl}
                className="preview-iframe"
                sandbox="allow-same-origin allow-scripts"
              />
            ) : (
              <p className="preview-placeholder-block">No page URL.</p>
            )
          ) : loadingReference ? (
            <p className="preview-placeholder-block">Loading reference…</p>
          ) : referenceData ? (
            <CorrectedPreview data={referenceData} readOnly />
          ) : (
            <p className="preview-placeholder-block">Could not load reference data.</p>
          )
        ) : (
          <>
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
              <CorrectedPreview data={data_corrected_loaded} readOnly />
            )}
          </>
        )}
      </div>

      {hasPage && typeof selectedReference === "number" && onDownloadReference && (
        <div className="preview-panel-footer">
          <button
            type="button"
            className="preview-panel-download-btn"
            onClick={onDownloadReference}
          >
            Download file
          </button>
        </div>
      )}
    </main>
  );
}
