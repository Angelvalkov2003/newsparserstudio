/**
 * API client for backend (proxied under /api).
 */
const API = '/api'

export type Site = { id: number; name: string; url: string; created_at: string; updated_at: string }
export type Page = { id: number; title: string | null; url: string; site_id: number; created_at: string; updated_at: string }
export type PageWithSite = Page & { site_name: string | null }
export type Parsed = {
  id: number
  page_id: number
  name: string | null
  data: string
  info: string | null
  is_verified: boolean
  created_at: string
  updated_at: string
}
export type ParsedWithPage = Parsed & { page_title: string | null; page_url: string | null }

export async function fetchSites(): Promise<Site[]> {
  const r = await fetch(`${API}/sites`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getSite(id: number): Promise<Site> {
  const r = await fetch(`${API}/sites/${id}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function createSite(name: string, url: string): Promise<Site> {
  const r = await fetch(`${API}/sites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, url }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function updateSite(id: number, name: string, url: string): Promise<Site> {
  const r = await fetch(`${API}/sites/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, url }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function deleteSite(id: number): Promise<void> {
  const r = await fetch(`${API}/sites/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error(await r.text())
}

export async function fetchPages(siteId?: number): Promise<PageWithSite[]> {
  const url = siteId != null ? `${API}/pages?site_id=${siteId}` : `${API}/pages`
  const r = await fetch(url)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getPage(id: number): Promise<PageWithSite> {
  const r = await fetch(`${API}/pages/${id}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function createPage(title: string | null, url: string, site_id: number): Promise<Page> {
  const r = await fetch(`${API}/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title || null, url, site_id }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function updatePage(
  id: number,
  title: string | null,
  url: string,
  site_id: number
): Promise<Page> {
  const r = await fetch(`${API}/pages/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title || null, url, site_id }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function deletePage(id: number): Promise<void> {
  const r = await fetch(`${API}/pages/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error(await r.text())
}

export async function fetchParsed(pageId?: number): Promise<ParsedWithPage[]> {
  const url = pageId != null ? `${API}/parsed?page_id=${pageId}` : `${API}/parsed`
  const r = await fetch(url)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getParsed(id: number): Promise<ParsedWithPage> {
  const r = await fetch(`${API}/parsed/${id}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function createParsed(
  page_id: number,
  name: string | null,
  data: string,
  info: string | null,
  is_verified: boolean
): Promise<Parsed> {
  const r = await fetch(`${API}/parsed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page_id, name: name || null, data, info: info || null, is_verified }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function updateParsed(
  id: number,
  page_id: number,
  name: string | null,
  data: string,
  info: string | null,
  is_verified: boolean
): Promise<Parsed> {
  const r = await fetch(`${API}/parsed/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page_id, name: name || null, data, info: info || null, is_verified }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function deleteParsed(id: number): Promise<void> {
  const r = await fetch(`${API}/parsed/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error(await r.text())
}

/** Bulk import: nested sites → pages → parsed. Match by URL (site/page), by name (parsed); overwrite or create. */
export type ParsedBulkItem = {
  name?: string | null
  data: string | object
  info?: string | null
  is_verified?: boolean
}
export type PageBulkItem = {
  title?: string | null
  url: string
  parsed?: ParsedBulkItem[]
}
export type SiteBulkItem = {
  name: string
  url: string
  pages?: PageBulkItem[]
}
export type ImportBulkResult = {
  sites_created: number
  sites_matched: number
  pages_created: number
  pages_matched: number
  parsed_created: number
  parsed_updated: number
  errors: string[]
}

export async function importBulk(payload: { sites: SiteBulkItem[] }): Promise<ImportBulkResult> {
  const r = await fetch(`${API}/import-bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}
