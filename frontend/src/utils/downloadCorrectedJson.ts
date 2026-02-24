import type { NewsArticle } from "../types";

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

export function serializeArticleJson(article: NewsArticle): string {
  return JSON.stringify(
    {
      url: article.url,
      data_parsed: article.data_parsed,
      data_corrected: article.data_corrected,
    },
    null,
    2
  );
}

export function downloadCorrectedJson(article: NewsArticle): void {
  const json = serializeArticleJson(article);
  const baseName = filenameFromTitle(article.data_corrected.metadata.title);
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
