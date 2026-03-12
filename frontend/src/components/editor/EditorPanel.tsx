import { useRef, useState } from "react";
import type { Dispatch } from "react";
import type { ArticleEditorState, ArticleEditorAction } from "../../state/articleEditorState";
import { buildLoadPayload } from "../../state/articleEditorState";
import type { ParsedWithPage } from "../../api";
import { parseArticleFile, type ParseArticleFileResult } from "./UploadArticleButton";
import { MetadataEditor } from "./MetadataEditor";
import { AddComponentByType } from "./AddComponentByType";
import { ComponentList } from "./ComponentList";
import { formatParsedLabel } from "../../utils/formatParsedLabel";

interface EditorPanelProps {
  state: ArticleEditorState;
  dispatch: Dispatch<ArticleEditorAction>;
  unverifiedList: ParsedWithPage[];
  selectedUnverifiedId: string | null;
  onSelectUnverified: (id: string | null) => void;
  loadingParsed: boolean;
  hasPage: boolean;
  /** After Load succeeds (e.g. save to DB when page selected) */
  onAfterLoad?: (parsed: ParseArticleFileResult) => void | Promise<void>;
  /** Clear bar error when Load is clicked */
  onClearBarError?: () => void;
  showVerify?: boolean;
  onVerify?: () => void;
  verifying?: boolean;
  showSaveParsed?: boolean;
  saveParsedDisabled?: boolean;
  onSaveParsed?: () => void;
  savingParsed?: boolean;
  onDownloadCurrentParsed?: () => void;
  showSaveAsUnique?: boolean;
  onSaveAsUnique?: () => void;
  savingAsUnique?: boolean;
}

export function EditorPanel({
  state,
  dispatch,
  unverifiedList,
  selectedUnverifiedId,
  onSelectUnverified,
  loadingParsed,
  hasPage,
  onAfterLoad,
  onClearBarError,
  showVerify = false,
  onVerify,
  verifying = false,
  showSaveParsed = false,
  saveParsedDisabled = true,
  onSaveParsed,
  savingParsed = false,
  onDownloadCurrentParsed,
  showSaveAsUnique = false,
  onSaveAsUnique,
  savingAsUnique = false,
}: EditorPanelProps) {
  const { data_corrected } = state;
  const loadInputRef = useRef<HTMLInputElement>(null);
  const [loadError, setLoadError] = useState("");

  const handleLoadClick = () => {
    setLoadError("");
    onClearBarError?.();
    loadInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      if (typeof text !== "string") {
        setLoadError("File could not be read.");
        return;
      }
      try {
        const json = JSON.parse(text);
        const parsed = parseArticleFile(json);
        if (!parsed) {
          setLoadError("File must contain url and valid data_parsed (object or null).");
          return;
        }
        setLoadError("");
        onClearBarError?.();
        dispatch({ type: "LOAD_ARTICLE", payload: buildLoadPayload(parsed) });
        onAfterLoad?.(parsed);
      } catch {
        setLoadError("Invalid JSON file.");
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  return (
    <aside className="editor-panel" role="complementary" aria-label="Markdown document editor">
      {hasPage && (
        <div className="editor-panel-dropdown-row">
          <label className="editor-panel-dropdown-label">
            <span className="editor-panel-dropdown-label-text">Working copy (unverified)</span>
            <select
              className="editor-panel-dropdown-select"
              value={selectedUnverifiedId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                onSelectUnverified(v === "" ? null : v);
              }}
              disabled={loadingParsed}
              aria-label="Select unverified parsed"
            >
              <option value="">— Select —</option>
              {unverifiedList.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatParsedLabel(p)}
                </option>
              ))}
              {!loadingParsed && unverifiedList.length === 0 && (
                <option value="" disabled>No unverified parsed</option>
              )}
            </select>
          </label>
        </div>
      )}
      <h1 className="editor-panel-title">Markdown Document</h1>
      <div className="editor-panel-content">
        <MetadataEditor metadata={data_corrected.metadata} dispatch={dispatch} />
        <ComponentList
          components={data_corrected.components}
          dispatch={dispatch}
        />
      </div>
      <div className="editor-panel-footer">
        <div className="editor-panel-actions">
          <AddComponentByType
            compact
            dispatch={dispatch}
            existingComponentIds={data_corrected.components.map((c) => c.id)}
          />
          <input
            ref={loadInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="app-bottom-bar-input"
            aria-label="Choose JSON file"
          />
          <button
            type="button"
            className="editor-panel-action-btn"
            onClick={handleLoadClick}
          >
            Load
          </button>
          <button
            type="button"
            className="editor-panel-action-btn"
            onClick={onSaveAsUnique ?? undefined}
            disabled={savingAsUnique || !onSaveAsUnique}
            title="Save document to Unique (website Unique, page Unique 0 your name)"
          >
            {savingAsUnique ? "Saving…" : "Save"}
          </button>
          {onDownloadCurrentParsed && (
            <button
              type="button"
              className="editor-panel-action-btn"
              onClick={onDownloadCurrentParsed}
            >
              Download
            </button>
          )}
          {showVerify && (
            <button
              type="button"
              className="editor-panel-action-btn editor-panel-action-btn--primary"
              onClick={onVerify}
              disabled={verifying}
            >
              {verifying ? "Verifying…" : "Verify"}
            </button>
          )}
          {showSaveParsed && (
            <button
              type="button"
              className="editor-panel-action-btn editor-panel-action-btn--primary"
              onClick={onSaveParsed}
              disabled={saveParsedDisabled || savingParsed}
            >
              {savingParsed ? "Saving…" : "Save to page"}
            </button>
          )}
        </div>
        {loadError && (
          <p className="editor-panel-load-error" role="alert">
            {loadError}
          </p>
        )}
      </div>
    </aside>
  );
}
