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

export async function createSite(name: string, url: string): Promise<Site> {
  const r = await fetch(`${API}/sites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, url }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function fetchPages(siteId?: number): Promise<PageWithSite[]> {
  const url = siteId != null ? `${API}/pages?site_id=${siteId}` : `${API}/pages`
  const r = await fetch(url)
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

export async function fetchParsed(pageId?: number): Promise<ParsedWithPage[]> {
  const url = pageId != null ? `${API}/parsed?page_id=${pageId}` : `${API}/parsed`
  const r = await fetch(url)
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
