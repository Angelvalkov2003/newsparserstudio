import { useState, useEffect } from "react";
import type { Dispatch } from "react";
import type { ArticleEditorState, ArticleEditorAction, PreviewMode } from "../../state/articleEditorState";
import type { ParsedWithPage } from "../../api";
import type { ArticleDataCorrected } from "../../types";
import { CorrectedPreview } from "./CorrectedPreview";
import { formatParsedLabel } from "../../utils/formatParsedLabel";
import { checkPreviewEmbeddable, getParsed } from "../../api";
import { parseDataParsedLike } from "../editor/UploadArticleButton";
import { useIsAdmin } from "../../context";

interface PreviewPanelProps {
  state: ArticleEditorState;
  dispatch: Dispatch<ArticleEditorAction>;
  pageUrl: string;
  verifiedList: ParsedWithPage[];
  selectedReference: "url" | string;
  onReferenceChange: (value: "url" | string) => void;
  /** Download the current reference (verified parsed) as JSON file */
  onDownloadReference?: () => void;
}

const MODE_OPTIONS: { value: PreviewMode; label: string }[] = [
  { value: "original", label: "url" },
  { value: "corrected", label: "data_corrected" },
];

function OriginalArticleIframe({ src, title }: { src: string; title: string }) {
  return <iframe title={title} src={src} className="preview-iframe" />;
}

/**
 * Asks the backend whether the URL allows iframe embedding from this origin.
 * If not, shows URL + open link only (no iframe) so the browser does not log X-Frame-Options errors.
 */
function UrlPreviewWithEmbedCheck({ src, title }: { src: string; title: string }) {
  const [status, setStatus] = useState<"checking" | "allowed" | "blocked">("checking");
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    setStatus("checking");
    setReason(null);
    let cancelled = false;
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      checkPreviewEmbeddable(src, window.location.origin, ac.signal)
        .then((res) => {
          if (cancelled) return;
          if (res.embeddable === false) {
            setStatus("blocked");
            setReason(res.reason ?? "This page cannot be shown inside the preview.");
          } else {
            setStatus("allowed");
            setReason(null);
          }
        })
        .catch(() => {
          if (cancelled || ac.signal.aborted) return;
          setStatus("allowed");
        });
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      ac.abort();
    };
  }, [src]);

  if (status === "checking") {
    return (
      <div className="preview-embed-checking" aria-live="polite">
        <p>Checking whether in-app preview is allowed for this site…</p>
      </div>
    );
  }

  if (status === "blocked") {
    return (
      <div className="preview-embed-fallback">
        <p className="preview-embed-fallback-msg">{reason}</p>
        <p className="preview-embed-fallback-url" title={src}>
          {src}
        </p>
        <a href={src} target="_blank" rel="noopener noreferrer" className="preview-external-open-link">
          Open in new tab
        </a>
      </div>
    );
  }

  return <OriginalArticleIframe src={src} title={title} />;
}

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
  const isAdmin = useIsAdmin();
  const [referenceData, setReferenceData] = useState<ArticleDataCorrected | null>(null);
  const [loadingReference, setLoadingReference] = useState(false);
  const articleUrl = url || pageUrl;
  const [editableUrl, setEditableUrl] = useState(articleUrl);

  const hasPage = Boolean(pageUrl);

  /** Only use as iframe src when it looks like an absolute URL to avoid loading relative paths (e.g. "dsadasdas d") as app routes */
  const iframeSrc = editableUrl && /^https?:\/\//i.test(editableUrl.trim()) ? editableUrl.trim() : "";

  useEffect(() => {
    setEditableUrl(articleUrl);
  }, [articleUrl]);

  // When reference is a parsed id, fetch its data (skip when reference is "url" = preview by URL)
  useEffect(() => {
    if (typeof selectedReference !== "string" || selectedReference === "url") {
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
      onReferenceChange(v);
    }
  };

  return (
    <main className="preview-panel" aria-label="Preview">
      <div className="preview-panel-toolbar">
        {hasPage ? (
          <>
            <label className="preview-mode-label">
              <span className="preview-mode-label-text">Reference</span>
              <select
                className="preview-mode-select"
                value={selectedReference === "url" ? "url" : selectedReference}
                onChange={handleReferenceChange}
                aria-label="Reference: URL or verified parsed"
              >
                <option value="url">URL</option>
                {verifiedList.map((p) => {
                  const base = formatParsedLabel(p);
                  const by =
                    isAdmin && (p.created_by_username || p.created_by)
                      ? ` · ${p.created_by_username ?? p.created_by}`
                      : "";
                  return (
                    <option key={p.id} value={p.id}>
                      {base}
                      {by}
                    </option>
                  );
                })}
              </select>
            </label>
            {selectedReference === "url" && (
              <label className="preview-mode-label">
                <span className="preview-mode-label-text">URL</span>
                <input
                  className="preview-url-input"
                  type="url"
                  value={editableUrl}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditableUrl(v);
                    dispatch({ type: "SET_URL", payload: v });
                  }}
                  placeholder={pageUrl || "https://example.com/article"}
                />
              </label>
            )}
          </>
        ) : (
          <>
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
            {activePreviewMode === "original" && (
              <label className="preview-mode-label">
                <span className="preview-mode-label-text">Link (URL)</span>
                <input
                  className="preview-url-input"
                  type="url"
                  value={editableUrl}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditableUrl(v);
                    dispatch({ type: "SET_URL", payload: v });
                  }}
                  placeholder="https://..."
                />
              </label>
            )}
          </>
        )}
      </div>

      <div className="preview-panel-content">
        {hasPage ? (
          selectedReference === "url" ? (
            iframeSrc ? (
              <UrlPreviewWithEmbedCheck src={iframeSrc} title="Original article (page URL)" />
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
                {iframeSrc ? (
                  <UrlPreviewWithEmbedCheck src={iframeSrc} title="Original article" />
                ) : (
                  <p className="preview-placeholder-block">
                    Load an article to see the original page, or enter a URL above.
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

      {hasPage && typeof selectedReference === "string" && onDownloadReference && (
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
