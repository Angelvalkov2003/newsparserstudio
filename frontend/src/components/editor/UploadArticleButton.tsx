import { useRef } from "react";
import type { Dispatch } from "react";
import type { ArticleEditorAction } from "../../state/articleEditorState";
import type { ArticleDataParsed, ArticleMetadata, ArticleComponent, MetadataItem } from "../../types";
import { buildLoadPayload } from "../../state/articleEditorState";

interface UploadArticleButtonProps {
  dispatch: Dispatch<ArticleEditorAction>;
  onError?: (message: string) => void;
}

function toMetadataItems(arr: unknown): MetadataItem[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => {
      if (x && typeof x === "object" && "name" in x) {
        const name = String((x as { name?: unknown }).name ?? "").trim();
        if (!name) return null;
        const url = (x as { url?: unknown }).url;
        return {
          name,
          url: typeof url === "string" && url.trim() ? url.trim() : undefined,
        };
      }
      const name = String(x).trim();
      return name ? { name } : null;
    })
    .filter((x): x is MetadataItem => x !== null);
}

function normalizeMetadata(m: unknown): ArticleMetadata {
  const meta = m as Record<string, unknown>;
  const documentDate = meta.document_date;
  return {
    title: typeof meta.title === "string" ? meta.title : "",
    document_date:
      typeof documentDate === "string" && documentDate.trim()
        ? documentDate.trim()
        : undefined,
    authors: toMetadataItems(meta.authors),
    categories: toMetadataItems(meta.categories),
    tags: toMetadataItems(meta.tags),
  };
}

function normalizeComponents(arr: unknown): ArticleComponent[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((item, i) => {
    const raw = item as Record<string, unknown>;
    const id = (typeof raw.id === "string" && raw.id.trim() ? raw.id : `imported-${Date.now()}-${i}`) as string;
    if (raw.type && raw.properties && typeof raw.properties === "object") {
      const props = raw.properties as Record<string, unknown>;
      return { ...props, id, type: raw.type } as ArticleComponent;
    }
    return { ...raw, id } as ArticleComponent;
  });
}

export function parseArticleFile(json: unknown): { url: string; data_parsed: ArticleDataParsed } | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;

  const url = typeof obj.url === "string" ? obj.url : "";
  const data_parsedRaw = obj.data_parsed;
  if (!data_parsedRaw || typeof data_parsedRaw !== "object") return null;

  const parsed = data_parsedRaw as Record<string, unknown>;
  const metadata = normalizeMetadata(parsed.metadata ?? {});
  const rawList = parsed.components ?? (parsed as { components?: { components?: unknown[] } }).components;
  const list = Array.isArray(rawList) ? rawList : (rawList && typeof rawList === "object" && "components" in rawList && Array.isArray((rawList as { components: unknown[] }).components) ? (rawList as { components: unknown[] }).components : []);
  const components = normalizeComponents(list);

  return {
    url: url || "https://example.com/article",
    data_parsed: { metadata, components },
  };
}

export function UploadArticleButton({ dispatch, onError }: UploadArticleButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    onError?.("");
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      if (typeof text !== "string") {
        onError?.("File could not be read.");
        return;
      }
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        onError?.("Invalid JSON file.");
        return;
      }
      const parsed = parseArticleFile(json);
      if (!parsed) {
        onError?.("File must contain url and data_parsed (metadata + components).");
        return;
      }
      onError?.("");
      dispatch({ type: "LOAD_ARTICLE", payload: buildLoadPayload(parsed) });
    };
    reader.readAsText(file, "UTF-8");
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        className="editor-upload-input"
        aria-label="Choose JSON file with article"
      />
      <button
        type="button"
        className="editor-upload-button"
        onClick={handleClick}
        aria-label="Upload JSON file from computer"
      >
        Upload JSON
      </button>
    </>
  );
}
