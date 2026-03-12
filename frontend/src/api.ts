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
  created_by_username?: string | null
  allowed_for_usernames?: string[]
  created_at: string
  updated_at: string
}
export type Page = {
  id: string
  title: string | null
  url: string
  site_id: string
  notes: string | null
  created_by?: string | null
  allowed_for?: string[]
  created_by_username?: string | null
  allowed_for_usernames?: string[]
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
  notes: string | null
  created_by?: string | null
  allowed_for?: string[]
  created_by_username?: string | null
  allowed_for_usernames?: string[]
  created_at: string
  updated_at: string
}
export type ParsedWithPage = Parsed & { page_title: string | null; page_url: string | null }

let authToken: string | null = null
let onUnauthorized: (() => void) | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

/** Called when any authenticated request gets 401. AuthProvider should clear session and set a message. */
export function setOnUnauthorized(fn: (() => void) | null) {
  onUnauthorized = fn
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

const SESSION_EXPIRED_MESSAGE = 'Сесията изтече. Моля, влезте отново.'

/** Authenticated request: on 401 calls onUnauthorized and throws; on other errors throws with body. */
async function apiRequest(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const r = await fetch(input, init)
  if (r.status === 401) {
    onUnauthorized?.()
    throw new Error(SESSION_EXPIRED_MESSAGE)
  }
  return r
}

export async function fetchSites(sort?: 'created_by' | 'created_at'): Promise<Site[]> {
  const url = sort ? `${API}/sites?sort=${encodeURIComponent(sort)}` : `${API}/sites`
  const r = await apiRequest(url, { headers: getAuthHeadersNoBody() })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getSite(id: string): Promise<Site> {
  const r = await apiRequest(`${API}/sites/${id}`, { headers: getAuthHeadersNoBody() })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function createSite(name: string, url: string): Promise<Site> {
  const r = await apiRequest(`${API}/sites`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, url }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function updateSite(
  id: string,
  name: string,
  url: string,
  allowed_for?: string[]
): Promise<Site> {
  const body: { name: string; url: string; allowed_for?: string[] } = { name, url }
  if (allowed_for !== undefined) body.allowed_for = allowed_for
  const r = await apiRequest(`${API}/sites/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function deleteSite(id: string): Promise<void> {
  const r = await apiRequest(`${API}/sites/${id}`, {
    method: 'DELETE',
    headers: getAuthHeadersNoBody(),
  })
  if (!r.ok) throw new Error(await r.text())
}

export async function fetchPages(
  siteId?: string,
  sort?: 'created_by' | 'created_at'
): Promise<PageWithSite[]> {
  const params = new URLSearchParams()
  if (siteId) params.set('site_id', siteId)
  if (sort) params.set('sort', sort)
  const q = params.toString()
  const url = q ? `${API}/pages?${q}` : `${API}/pages`
  const r = await apiRequest(url, { headers: getAuthHeadersNoBody() })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getPage(id: string): Promise<PageWithSite> {
  const r = await apiRequest(`${API}/pages/${id}`, { headers: getAuthHeadersNoBody() })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function createPage(
  title: string | null,
  url: string,
  site_id: string,
  notes?: string | null
): Promise<Page> {
  const r = await apiRequest(`${API}/pages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ title: title || null, url, site_id, notes: notes || null }),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function updatePage(
  id: string,
  title: string | null,
  url: string,
  site_id: string,
  allowed_for?: string[],
  notes?: string | null
): Promise<Page> {
  const body: { title: string | null; url: string; site_id: string; allowed_for?: string[]; notes?: string | null } = {
    title: title || null,
    url,
    site_id,
    notes: notes ?? null,
  }
  if (allowed_for !== undefined) body.allowed_for = allowed_for
  const r = await apiRequest(`${API}/pages/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function deletePage(id: string): Promise<void> {
  const r = await apiRequest(`${API}/pages/${id}`, {
    method: 'DELETE',
    headers: getAuthHeadersNoBody(),
  })
  if (!r.ok) throw new Error(await r.text())
}

export async function fetchParsed(
  pageId?: string,
  sort?: 'created_by' | 'created_at'
): Promise<ParsedWithPage[]> {
  const params = new URLSearchParams()
  if (pageId) params.set('page_id', pageId)
  if (sort) params.set('sort', sort)
  const q = params.toString()
  const url = q ? `${API}/parsed?${q}` : `${API}/parsed`
  const r = await apiRequest(url, { headers: getAuthHeadersNoBody() })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getParsed(id: string): Promise<ParsedWithPage> {
  const r = await apiRequest(`${API}/parsed/${id}`, { headers: getAuthHeadersNoBody() })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function createParsed(
  page_id: string,
  name: string | null,
  data: string,
  info: string | null,
  is_verified: boolean,
  notes?: string | null
): Promise<Parsed> {
  const r = await apiRequest(`${API}/parsed`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      page_id,
      name: name || null,
      data,
      info: info || null,
      is_verified,
      notes: notes || null,
    }),
  })
  const text = await r.text()
  if (!r.ok) throw new Error(getErrorFromResponse(text) || 'Create parsed failed')
  return JSON.parse(text) as Parsed
}

export async function updateParsed(
  id: string,
  page_id: string,
  name: string | null,
  data: string,
  info: string | null,
  is_verified: boolean,
  allowed_for?: string[],
  notes?: string | null
): Promise<Parsed> {
  const body: {
    page_id: string
    name: string | null
    data: string
    info: string | null
    is_verified: boolean
    allowed_for?: string[]
    notes?: string | null
  } = {
    page_id,
    name: name || null,
    data,
    info: info || null,
    is_verified,
    notes: notes ?? null,
  }
  if (allowed_for !== undefined) body.allowed_for = allowed_for
  const r = await apiRequest(`${API}/parsed/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  })
  const text = await r.text()
  if (!r.ok) throw new Error(getErrorFromResponse(text) || 'Update parsed failed')
  return JSON.parse(text) as Parsed
}

export async function deleteParsed(id: string): Promise<void> {
  const r = await apiRequest(`${API}/parsed/${id}`, {
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
  notes?: string | null
}
export type PageBulkItem = {
  title?: string | null
  url: string
  notes?: string | null
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
  const r = await apiRequest(`${API}/import-bulk`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

// --- Auth API (used by authContext) ---
const AUTH_TIMEOUT_MS = 15000

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = AUTH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const r = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(id)
    return r
  } catch (e) {
    clearTimeout(id)
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Server not responding. Is the backend running on port 8000?')
    }
    throw e
  }
}

export type UserPublic = {
  id: string
  username: string
  role: string
  is_guest: boolean
}

export type LoginResponse = {
  access_token: string
  token_type: string
  user: UserPublic
}

function getErrorFromResponse(text: string): string {
  try {
    const data = JSON.parse(text)
    const d = data.detail
    return typeof d === 'string' ? d : JSON.stringify(d ?? text)
  } catch {
    return text || 'Request failed'
  }
}

export async function authLogin(username: string, password: string): Promise<LoginResponse> {
  const r = await fetchWithTimeout(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const text = await r.text()
  if (!r.ok) throw new Error(getErrorFromResponse(text) || 'Login failed')
  return JSON.parse(text) as LoginResponse
}

export async function authGuest(): Promise<LoginResponse> {
  const r = await fetchWithTimeout(`${API}/auth/guest`, { method: 'POST' })
  const text = await r.text()
  if (!r.ok) throw new Error(getErrorFromResponse(text) || 'Guest login failed')
  return JSON.parse(text) as LoginResponse
}

export async function authGuestResume(guestId: string): Promise<LoginResponse> {
  const r = await fetchWithTimeout(`${API}/auth/guest-resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guest_id: guestId }),
  })
  const text = await r.text()
  if (!r.ok) throw new Error(getErrorFromResponse(text) || 'Guest resume failed')
  return JSON.parse(text) as LoginResponse
}

export async function authMe(): Promise<UserPublic> {
  const r = await fetchWithTimeout(`${API}/auth/me`, { headers: getAuthHeadersNoBody() }, 8000)
  if (r.status === 401) {
    onUnauthorized?.()
    throw new Error(SESSION_EXPIRED_MESSAGE)
  }
  const text = await r.text()
  if (!r.ok) throw new Error(getErrorFromResponse(text) || 'Not authenticated')
  return JSON.parse(text) as UserPublic
}

// --- Users API (admin) ---
export async function fetchUsers(): Promise<UserPublic[]> {
  const r = await apiRequest(`${API}/users`, { headers: getAuthHeadersNoBody() })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function createUser(
  username: string,
  password: string,
  role: string
): Promise<UserPublic> {
  const r = await apiRequest(`${API}/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ username, password, role }),
  })
  const text = await r.text()
  if (!r.ok) throw new Error(getErrorFromResponse(text) || 'Create user failed')
  return JSON.parse(text) as UserPublic
}

export async function updateUser(
  userId: string,
  updates: { role?: string }
): Promise<UserPublic> {
  const r = await apiRequest(`${API}/users/${userId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  })
  const text = await r.text()
  if (!r.ok) throw new Error(getErrorFromResponse(text) || 'Update failed')
  return JSON.parse(text) as UserPublic
}
