/**
 * API client. All IDs are strings (MongoDB). Auth token sent via getAuthHeaders().
 * In dev, set VITE_API_ORIGIN=http://127.0.0.1:8000 to call backend directly (avoids proxy issues).
 */
const API = (import.meta.env.VITE_API_ORIGIN ?? '') + '/api'

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
  site_id: string | null
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
  if (!token) clearSpecialPageCache()
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

const SESSION_EXPIRED_MESSAGE = 'Session expired. Please log in again.'

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

export async function createSite(name: string, url: string, allowed_for?: string[]): Promise<Site> {
  const body: { name: string; url: string; allowed_for?: string[] } = { name, url }
  if (allowed_for !== undefined) body.allowed_for = allowed_for
  const r = await apiRequest(`${API}/sites`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
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

const GUEST_PAGE_URL = `${API}/pages/special/guest`
const UNIQUE_PAGE_URL = `${API}/pages/special/unique`

const UNIQUE_SITE_NAME = 'Unique'
const UNIQUE_PAGE_TITLE_PREFIX = 'Unique 0 ' // page title: "Unique 0 <username>"
const UNIQUE_PAGE_TITLE_LEGACY_PREFIX = 'Unique - ' // "Unique - <username>" (guest and legacy)

let cachedGuestPagePromise: Promise<PageWithSite | null> | null = null
let cachedUniquePagePromise: Promise<PageWithSite | null> | null = null

export function clearSpecialPageCache() {
  cachedGuestPagePromise = null
  cachedUniquePagePromise = null
}

/** Find the site named "Unique" (one website for all unique pages). */
export async function findUniqueSite(): Promise<Site | null> {
  const sites = await fetchSites()
  return sites.find((s) => s.name === UNIQUE_SITE_NAME) ?? null
}

/** Find a page in the Unique site by exact title. Returns null if not found. */
export async function findPageInUniqueSiteByTitle(title: string): Promise<PageWithSite | null> {
  const site = await findUniqueSite()
  if (!site?.id) return null
  const pages = await fetchPages(site.id)
  return pages.find((p) => p.title === title) ?? null
}

/** Find the user's Unique page by title "Unique 0 <username>" or legacy "Unique - <username>". */
export async function findUniquePageByUsername(username: string): Promise<PageWithSite | null> {
  if (!username) return null
  const site = await findUniqueSite()
  if (!site?.id) return null
  const pages = await fetchPages(site.id)
  const title0 = UNIQUE_PAGE_TITLE_PREFIX + username
  const titleLegacy = UNIQUE_PAGE_TITLE_LEGACY_PREFIX + username
  return pages.find((p) => p.title === title0 || p.title === titleLegacy) ?? null
}

/** Guest only: get or create the single guest page under Unique site (title "Unique - <username>"). On 404, tries to find existing page by username. Pass username for fallback. Cached per session. */
export async function getGuestPage(username?: string): Promise<PageWithSite | null> {
  if (cachedGuestPagePromise) return cachedGuestPagePromise
  const run = async (): Promise<PageWithSite | null> => {
    const r = await apiRequest(GUEST_PAGE_URL, { headers: getAuthHeadersNoBody() })
    if (r.status === 404) {
      if (username) return findUniquePageByUsername(username)
      return null
    }
    if (!r.ok) {
      const text = await r.text()
      console.error('[API] GET /api/pages/special/guest →', r.status, text)
      throw new Error(text || `Error ${r.status}`)
    }
    return r.json()
  }
  cachedGuestPagePromise = run().catch((e) => {
    cachedGuestPagePromise = null
    throw e
  })
  return cachedGuestPagePromise
}

/** Regular/admin: get or create the 'Unique 0 <username>' page under Unique site. On 404, tries to find existing page with title "Unique 0 <username>" in Unique site. Pass username for fallback. Cached per session. */
export async function getUniquePage(username?: string): Promise<PageWithSite | null> {
  if (cachedUniquePagePromise) return cachedUniquePagePromise
  const run = async (): Promise<PageWithSite | null> => {
    const r = await apiRequest(UNIQUE_PAGE_URL, { headers: getAuthHeadersNoBody() })
    if (r.status === 404) {
      if (username) return findUniquePageByUsername(username)
      return null
    }
    if (!r.ok) {
      const text = await r.text()
      console.error('[API] GET /api/pages/special/unique →', r.status, text)
      throw new Error(text || `Error ${r.status}`)
    }
    return r.json()
  }
  cachedUniquePagePromise = run().catch((e) => {
    cachedUniquePagePromise = null
    throw e
  })
  return cachedUniquePagePromise
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
  if (id === 'url' || !id?.trim()) throw new Error('Invalid parsed id')
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

export type TwelvePuntoBulkImportStart = {
  job_id: string
  total: number
  status: string
}

export type TwelvePuntoBulkImportRow = {
  post_id: string
  site_name: string
  title?: string | null
  /** Set when a row was already imported and bulk import refreshed the parsed document. */
  note?: string | null
}

export type TwelvePuntoBulkImportFailRow = {
  post_id: string
  site_name: string
  title?: string | null
  error: string
}

export type TwelvePuntoImportOneResult = {
  outcome: 'imported' | 'failed'
  post_id: string
  title?: string | null
  site_name?: string | null
  error?: string | null
  parsed_created?: number
  parsed_updated?: number
  reimported?: boolean
  note?: string | null
}

export type TwelvePuntoBulkImportResults = {
  imported: number
  skipped_duplicate: number
  succeeded_rows?: TwelvePuntoBulkImportRow[]
  skipped_rows?: TwelvePuntoBulkImportRow[]
  failed_rows?: TwelvePuntoBulkImportFailRow[]
}

export type TwelvePuntoBulkImportJobStatus = {
  job_id: string
  status: string | null
  total: number | null
  progress_done: number | null
  created_at?: string | null
  started_at?: string | null
  finished_at?: string | null
  post_rows?: TwelvePuntoBulkImportRow[] | null
  results?: TwelvePuntoBulkImportResults | null
  error?: string | null
}

export async function startTwelvePuntoBulkImport(postIds: string[]): Promise<TwelvePuntoBulkImportStart> {
  const r = await apiRequest(`${API}/twelve-punto/bulk-import`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ post_ids: postIds }),
  })
  const text = await r.text()
  if (!r.ok) throw new Error(getErrorFromResponse(text) || text || `HTTP ${r.status}`)
  return JSON.parse(text) as TwelvePuntoBulkImportStart
}

export async function getTwelvePuntoBulkImportJob(jobId: string): Promise<TwelvePuntoBulkImportJobStatus> {
  const r = await apiRequest(`${API}/twelve-punto/bulk-import/${encodeURIComponent(jobId)}`, {
    headers: getAuthHeadersNoBody(),
  })
  const text = await r.text()
  if (!r.ok) throw new Error(getErrorFromResponse(text) || text || `HTTP ${r.status}`)
  return JSON.parse(text) as TwelvePuntoBulkImportJobStatus
}

export async function retryTwelvePuntoImportOne(postId: string): Promise<TwelvePuntoImportOneResult> {
  const r = await apiRequest(`${API}/twelve-punto/import-one`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ post_id: postId }),
  })
  const text = await r.text()
  if (!r.ok) throw new Error(getErrorFromResponse(text) || text || `HTTP ${r.status}`)
  return JSON.parse(text) as TwelvePuntoImportOneResult
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
  updates: { username?: string; password?: string; role?: string }
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

export async function deleteUser(userId: string): Promise<void> {
  const r = await apiRequest(`${API}/users/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeadersNoBody(),
  })
  if (!r.ok) throw new Error(await r.text())
}

export type PreviewEmbedCheckResult = {
  embeddable: boolean
  reason: string | null
  final_url: string | null
}

/** Unauthenticated: used before iframe preview to avoid blocked URLs (X-Frame-Options / CSP). */
export async function checkPreviewEmbeddable(
  url: string,
  parentOrigin: string,
  signal?: AbortSignal
): Promise<PreviewEmbedCheckResult> {
  const params = new URLSearchParams({ url, parent: parentOrigin })
  const r = await fetch(`${API}/preview/embed-check?${params}`, { signal })
  if (!r.ok) {
    const text = await r.text()
    throw new Error(text || 'embed-check failed')
  }
  return r.json() as Promise<PreviewEmbedCheckResult>
}
