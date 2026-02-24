import { useRef, useState } from "react";
import type { Dispatch } from "react";
import type { ArticleEditorAction } from "../state/articleEditorState";
import { buildLoadPayload } from "../state/articleEditorState";
import type { NewsArticle } from "../types";
import { downloadCorrectedJson } from "../utils/downloadCorrectedJson";
import { parseArticleFile } from "./editor/UploadArticleButton";

interface BottomBarProps {
  dispatch: Dispatch<ArticleEditorAction>;
  article: NewsArticle;
}

export function BottomBar({ dispatch, article }: BottomBarProps) {
  const { url, data_parsed, data_corrected } = article;
  const inputRef = useRef<HTMLInputElement>(null);
  const [loadError, setLoadError] = useState("");

  const handleLoadClick = () => {
    setLoadError("");
    inputRef.current?.click();
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
          setLoadError("File must contain url and data_parsed (metadata + components).");
          return;
        }
        setLoadError("");
        dispatch({ type: "LOAD_ARTICLE", payload: buildLoadPayload(parsed) });
      } catch {
        setLoadError("Invalid JSON file.");
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleSave = () => {
    // Save = data_corrected is already up to date in state; no file download.
  };

  const handleDownload = () => {
    downloadCorrectedJson(article);
  };

  return (
    <footer className="app-bottom-bar" role="contentinfo">
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        className="app-bottom-bar-input"
        aria-label="Choose JSON file"
      />
      <button type="button" className="app-bottom-bar-btn" onClick={handleLoadClick}>
        Load
      </button>
      <button type="button" className="app-bottom-bar-btn" onClick={handleSave}>
        Save
      </button>
      <button type="button" className="app-bottom-bar-btn" onClick={handleDownload}>
        Download
      </button>
      {loadError && (
        <span className="app-bottom-bar-error" role="alert">
          {loadError}
        </span>
      )}
    </footer>
  );
}
