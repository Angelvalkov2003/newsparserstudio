import type { ArticleDataCorrected, ArticleDataParsed } from "../types";

const DEFAULT_FILENAME = "article-corrected";

export function filenameFromTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return DEFAULT_FILENAME;
  const slug = trimmed
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || DEFAULT_FILENAME;
}

/** Serializes url + data_parsed (original) + data_corrected (after edits) for Save output. */
export function serializeSaveJson(
  url: string,
  data_parsed: ArticleDataParsed,
  data_corrected: ArticleDataCorrected
): string {
  return JSON.stringify(
    { url, data_parsed, data_corrected },
    null,
    2
  );
}

/** Save: create JSON { url, data_parsed, data_corrected } and trigger download. */
export function saveAndDownload(
  url: string,
  data_parsed: ArticleDataParsed,
  data_corrected: ArticleDataCorrected
): void {
  const json = serializeSaveJson(url, data_parsed, data_corrected);
  const baseName = filenameFromTitle(data_corrected.metadata.title);
  const filename = `${baseName}.json`;

  const blob = new Blob([json], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}
