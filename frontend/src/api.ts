/**
 * API client. All IDs are strings (MongoDB). Auth token sent via getAuthHeaders().
 */
const API = '/api'

export type Site = {
  id: string
  name: string
  url: string
  created_by?: string | null
  allowed_for?: string[]
  created_at: string
  updated_at: string
}
export type Page = {
  id: string
  title: string | null
  url: string
  site_id: string
  created_by?: string | null
  allowed_for?: string[]
  created_at: string
  updated_at: string
}
export type PageWithSite = Page & { site_name: string | null }
export type Parsed = {
  id: string
  page_id: string
  name: string | null
  data: string
  info: string | null
  is_verified: boolean
  created_by?: string | null
  allowed_for?: string[]
  created_at: string
  updated_at: string
}
export type ParsedWithPage = Parsed & { page_title: string | null; page_url: string | null }

let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

function getAuthHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (authToken) h['Authorization'] = `Bearer ${authToken}`
  return h
}

function getAuthHeadersNoBody(): Record<string, string> {
  const h: Record<string, string> = {}
  if (authToken) h['Authorization'] = `Bearer ${authToken}`
  return h
}

export async function fetchSites(): Promise<Site[]> {
  const r = await fetch(`${API}/sites`, { headers: getAuthHeadersNoBody() })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getSite(id: string): Promise<Site> {
  const r = await fetch(`${API}/sites/${id}`, { headers: getAuthHeadersNoBody() })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function createSite(name: string, url: string): Promise<Site> {
  const r = await fetch(`${API}/sites`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, url }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function updateSite(id: string, name: string, url: string): Promise<Site> {
  const r = await fetch(`${API}/sites/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, url }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function deleteSite(id: string): Promise<void> {
  const r = await fetch(`${API}/sites/${id}`, {
    method: 'DELETE',
    headers: getAuthHeadersNoBody(),
  })
  if (!r.ok) throw new Error(await r.text())
}

export async function fetchPages(siteId?: string): Promise<PageWithSite[]> {
  const url = siteId != null ? `${API}/pages?site_id=${encodeURIComponent(siteId)}` : `${API}/pages`
  const r = await fetch(url, { headers: getAuthHeadersNoBody() })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getPage(id: string): Promise<PageWithSite> {
  const r = await fetch(`${API}/pages/${id}`, { headers: getAuthHeadersNoBody() })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function createPage(
  title: string | null,
  url: string,
  site_id: string
): Promise<Page> {
  const r = await fetch(`${API}/pages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ title: title || null, url, site_id }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function updatePage(
  id: string,
  title: string | null,
  url: string,
  site_id: string
): Promise<Page> {
  const r = await fetch(`${API}/pages/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ title: title || null, url, site_id }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function deletePage(id: string): Promise<void> {
  const r = await fetch(`${API}/pages/${id}`, {
    method: 'DELETE',
    headers: getAuthHeadersNoBody(),
  })
  if (!r.ok) throw new Error(await r.text())
}

export async function fetchParsed(pageId?: string): Promise<ParsedWithPage[]> {
  const url =
    pageId != null ? `${API}/parsed?page_id=${encodeURIComponent(pageId)}` : `${API}/parsed`
  const r = await fetch(url, { headers: getAuthHeadersNoBody() })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getParsed(id: string): Promise<ParsedWithPage> {
  const r = await fetch(`${API}/parsed/${id}`, { headers: getAuthHeadersNoBody() })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function createParsed(
  page_id: string,
  name: string | null,
  data: string,
  info: string | null,
  is_verified: boolean
): Promise<Parsed> {
  const r = await fetch(`${API}/parsed`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      page_id,
      name: name || null,
      data,
      info: info || null,
      is_verified,
    }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function updateParsed(
  id: string,
  page_id: string,
  name: string | null,
  data: string,
  info: string | null,
  is_verified: boolean
): Promise<Parsed> {
  const r = await fetch(`${API}/parsed/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      page_id,
      name: name || null,
      data,
      info: info || null,
      is_verified,
    }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function deleteParsed(id: string): Promise<void> {
  const r = await fetch(`${API}/parsed/${id}`, {
    method: 'DELETE',
    headers: getAuthHeadersNoBody(),
  })
  if (!r.ok) throw new Error(await r.text())
}

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
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

// --- Auth API (used by authContext) ---
export type UserPublic = {
  id: string
  username: string
  role: string
  is_verified_by_admin: boolean
  is_guest: boolean
}

export type LoginResponse = {
  access_token: string
  token_type: string
  user: UserPublic
}

export async function authLogin(username: string, password: string): Promise<LoginResponse> {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!r.ok) {
    const data = await r.json().catch(() => ({}))
    throw new Error(data.detail ?? await r.text())
  }
  return r.json()
}

export async function authGuest(): Promise<LoginResponse> {
  const r = await fetch(`${API}/auth/guest`, { method: 'POST' })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

/** Register first user (admin). Only works when there are no users. */
export async function authRegister(username: string, password: string): Promise<LoginResponse> {
  const r = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!r.ok) {
    const data = await r.json().catch(() => ({}))
    throw new Error(data.detail ?? await r.text())
  }
  return r.json()
}

export async function authMe(): Promise<UserPublic> {
  const r = await fetch(`${API}/auth/me`, { headers: getAuthHeadersNoBody() })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

// --- Users API (admin) ---
export async function fetchUsers(): Promise<UserPublic[]> {
  const r = await fetch(`${API}/users`, { headers: getAuthHeadersNoBody() })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function createUser(
  username: string,
  password: string,
  role: string
): Promise<UserPublic> {
  const r = await fetch(`${API}/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ username, password, role }),
  })
  if (!r.ok) {
    const data = await r.json().catch(() => ({}))
    throw new Error(data.detail ?? await r.text())
  }
  return r.json()
}

export async function updateUser(
  userId: string,
  updates: { role?: string; is_verified_by_admin?: boolean }
): Promise<UserPublic> {
  const r = await fetch(`${API}/users/${userId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}
