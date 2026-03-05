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
  downloadJson(json, filename);
}

/** Extra fields for parsed export/import (is_verified, updated_at, etc.). */
export interface ParsedExportMeta {
  id?: number;
  page_id?: number;
  name?: string | null;
  info?: string | null;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Download parsed as JSON with all fields: url, data_parsed, is_verified, name, info, created_at, updated_at, page_id, id. */
export function downloadParsedFile(
  url: string,
  data_parsed: ArticleDataCorrected,
  meta?: ParsedExportMeta
): void {
  const payload: Record<string, unknown> = {
    url,
    data_parsed,
    ...(meta && {
      ...(meta.id !== undefined && { id: meta.id }),
      ...(meta.page_id !== undefined && { page_id: meta.page_id }),
      ...(meta.name !== undefined && { name: meta.name }),
      ...(meta.info !== undefined && { info: meta.info }),
      ...(meta.is_verified !== undefined && { is_verified: meta.is_verified }),
      ...(meta.created_at !== undefined && { created_at: meta.created_at }),
      ...(meta.updated_at !== undefined && { updated_at: meta.updated_at }),
    }),
  };
  const json = JSON.stringify(payload, null, 2);
  const baseName = filenameFromTitle(data_parsed.metadata.title);
  const filename = `${baseName}.json`;
  downloadJson(json, filename);
}

/** @deprecated Use downloadParsedFile with meta for full fields. */
export function downloadDataParsedOnly(
  url: string,
  data_corrected: ArticleDataCorrected
): void {
  downloadParsedFile(url, data_corrected, { is_verified: false, name: data_corrected.metadata?.title ?? null });
}

function downloadJson(json: string, filename: string): void {
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
