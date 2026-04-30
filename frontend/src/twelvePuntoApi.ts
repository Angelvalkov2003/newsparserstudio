const FROM_ENV = (import.meta.env.VITE_TWELVE_PUNTO_API_ORIGIN as string | undefined)?.trim().replace(/\/$/, '') ?? ''
const DEFAULT_PROXY_BASE = '/twelve-punto-api'
export const TWELVE_PUNTO_BASE = import.meta.env.DEV
  ? DEFAULT_PROXY_BASE
  : FROM_ENV || DEFAULT_PROXY_BASE

export function getTwelvePuntoApiConfigured(): boolean {
  return Boolean(TWELVE_PUNTO_BASE)
}

export type TwelvePuntoSortField = 'published_at' | 'created_at'
export type TwelvePuntoSortDirection = 'asc' | 'desc'

export type TwelvePuntoPost = {
  id?: string
  db_id?: string
  feed_id?: string
  feed_type?: string | null
  feed_name?: string | null
  source_id?: string | null
  published_at?: string | null
  created_at?: string | null
  edited_at?: string | null
  title?: string | null
  categories?: unknown
  ready?: boolean
}

export type TwelvePuntoPostsListParams = {
  feed_types?: string[]
  feed_names?: string[]
  ready?: boolean | null
  published_at_min?: string | null
  published_at_max?: string | null
  created_at_min?: string | null
  created_at_max?: string | null
  sort_field?: TwelvePuntoSortField
  sort_direction?: TwelvePuntoSortDirection
  limit?: number
  cursor?: string | null
  projection?: 'minimal' | 'list'
  fields?: string[]
}

function appendRepeated(params: URLSearchParams, key: string, values: string[] | undefined) {
  if (!values?.length) return
  for (const v of values) {
    if (v.trim()) params.append(key, v.trim())
  }
}

export type TwelvePuntoPostsResponse = {
  items?: TwelvePuntoPost[]
  posts?: TwelvePuntoPost[]
  data?: TwelvePuntoPost[]
  results?: TwelvePuntoPost[]
  next_cursor?: string | null
}

export function parseTwelvePuntoPostsResponse(json: unknown): { posts: TwelvePuntoPost[]; next_cursor: string | null } {
  if (json == null) return { posts: [], next_cursor: null }
  if (Array.isArray(json)) {
    return { posts: json as TwelvePuntoPost[], next_cursor: null }
  }
  if (typeof json !== 'object') return { posts: [], next_cursor: null }
  const o = json as Record<string, unknown>
  const raw =
    o.items ?? o.posts ?? o.data ?? o.results
  const posts = Array.isArray(raw) ? (raw as TwelvePuntoPost[]) : []
  const nc = o.next_cursor
  const next_cursor = typeof nc === 'string' ? nc : nc == null ? null : String(nc)
  return { posts, next_cursor }
}

export function resolveTwelvePuntoPostPathId(post: TwelvePuntoPost): string | null {
  const raw = post.id ?? post.db_id ?? post.source_id
  if (raw === undefined || raw === null) return null
  const s = String(raw).trim()
  return s.length ? s : null
}

export type TwelvePuntoPostDetailParams = {
  projection?: 'minimal' | 'list' | 'detail'
  fields?: string[]
}

export const TWELVE_PUNTO_POST_DETAIL_LIGHT_FIELDS: readonly string[] = [
  'feed_id',
  'feed_type',
  'feed_name',
  'source_id',
  'published_at',
  'created_at',
  'edited_at',
  'title',
  'categories',
  'ready',
  'data',
  'media',
  'content',
]

export function isTwelvePuntoPostFailurePayload(json: unknown): boolean {
  if (json == null || typeof json !== 'object' || Array.isArray(json)) return false
  const o = json as Record<string, unknown>
  const d = o.detail
  if (Array.isArray(d)) return true
  if (typeof d === 'string') {
    return (
      d.includes('Failed to get post') ||
      d.includes('OperationalError') ||
      d.includes('Out of sort memory') ||
      d.includes('Validation Error')
    )
  }
  if (d && typeof d === 'object') {
    const inner = (d as Record<string, unknown>).detail
    if (typeof inner === 'string') {
      return (
        inner.includes('Failed to get post') ||
        inner.includes('OperationalError') ||
        inner.includes('Out of sort memory')
      )
    }
  }
  return false
}

function buildPostDetailUrl(postId: string | number, params?: TwelvePuntoPostDetailParams): string {
  const search = new URLSearchParams()
  search.set('projection', params?.projection ?? 'detail')
  if (params?.fields?.length) {
    for (const f of params.fields) {
      if (f.trim()) search.append('fields', f.trim())
    }
  }
  const q = search.toString()
  return `${TWELVE_PUNTO_BASE}/posts/${encodeURIComponent(String(postId))}${q ? `?${q}` : ''}`
}

function extractApiErrorSnippet(body: unknown, rawText: string, maxLen = 420): string {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const o = body as Record<string, unknown>
    const d = o.detail
    if (typeof d === 'string') return d.length > maxLen ? `${d.slice(0, maxLen)}…` : d
    if (d && typeof d === 'object') {
      const inner = (d as Record<string, unknown>).detail
      if (typeof inner === 'string') return inner.length > maxLen ? `${inner.slice(0, maxLen)}…` : inner
    }
  }
  const t = rawText.trim()
  return t.length > maxLen ? `${t.slice(0, maxLen)}…` : t
}

export type TwelvePuntoPostDetailLoadResult =
  | { kind: 'ok'; mode: 'full'; data: unknown }
  | {
      kind: 'ok'
      mode: 'light'
      data: unknown
      queryLabel: string
      degradedExplanation: string
      fullFailureSnippet: string
    }
  | { kind: 'error'; message: string }

export async function loadTwelvePuntoPostDetailWithFallback(postId: string): Promise<TwelvePuntoPostDetailLoadResult> {
  const tryOnce = async (
    params?: TwelvePuntoPostDetailParams
  ): Promise<{ ok: boolean; data?: unknown; snippet: string; status: number }> => {
    const url = buildPostDetailUrl(postId, params)
    const r = await fetch(url, { headers: { Accept: 'application/json' } })
    const rawText = await r.text()
    let body: unknown = null
    try {
      body = rawText ? JSON.parse(rawText) : null
    } catch {
      return { ok: false, snippet: rawText || `HTTP ${r.status}`, status: r.status }
    }
    if (r.status < 200 || r.status >= 300) {
      return { ok: false, snippet: extractApiErrorSnippet(body, rawText), status: r.status }
    }
    if (isTwelvePuntoPostFailurePayload(body)) {
      return { ok: false, snippet: extractApiErrorSnippet(body, rawText), status: r.status }
    }
    return { ok: true, data: body, snippet: '', status: r.status }
  }

  const full = await tryOnce({ projection: 'detail' })
  if (full.ok && full.data !== undefined) {
    return { kind: 'ok', mode: 'full', data: full.data }
  }

  const fullSnippet = full.snippet

  const lightFields = await tryOnce({
    projection: 'detail',
    fields: [...TWELVE_PUNTO_POST_DETAIL_LIGHT_FIELDS],
  })
  if (lightFields.ok && lightFields.data !== undefined) {
    return {
      kind: 'ok',
      mode: 'light',
      data: lightFields.data,
      queryLabel: `GET /posts/${postId}?projection=detail&fields=(no processings, no db_id)`,
      degradedExplanation:
        'Full detail failed while the API loaded post_processing (often MySQL “Out of sort memory”). A reduced field set was used so article text and metadata still load.',
      fullFailureSnippet: fullSnippet,
    }
  }

  const listProj = await tryOnce({ projection: 'list' })
  if (listProj.ok && listProj.data !== undefined) {
    return {
      kind: 'ok',
      mode: 'light',
      data: listProj.data,
      queryLabel: `GET /posts/${postId}?projection=list`,
      degradedExplanation:
        'Full detail and field-filtered detail both failed. Showing projection=list if available.',
      fullFailureSnippet: [fullSnippet, lightFields.snippet].filter(Boolean).join(' | '),
    }
  }

  const minimalProj = await tryOnce({ projection: 'minimal' })
  if (minimalProj.ok && minimalProj.data !== undefined) {
    return {
      kind: 'ok',
      mode: 'light',
      data: minimalProj.data,
      queryLabel: `GET /posts/${postId}?projection=minimal`,
      degradedExplanation:
        'Heavier projections failed. Showing projection=minimal if available.',
      fullFailureSnippet: [fullSnippet, lightFields.snippet, listProj.snippet].filter(Boolean).join(' | '),
    }
  }

  const msg =
    [full.snippet, lightFields.snippet, listProj.snippet, minimalProj.snippet].filter(Boolean).join(' — ') ||
    'Failed to load post'
  return { kind: 'error', message: msg }
}

export async function fetchTwelvePuntoPost(
  postId: string | number,
  params?: TwelvePuntoPostDetailParams
): Promise<unknown> {
  const url = buildPostDetailUrl(postId, params)
  const r = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
  const rawText = await r.text()
  let body: unknown = null
  try {
    body = rawText ? JSON.parse(rawText) : null
  } catch {
    throw new Error(rawText || `HTTP ${r.status}`)
  }
  if (!r.ok) {
    throw new Error(rawText || `HTTP ${r.status}`)
  }
  if (isTwelvePuntoPostFailurePayload(body)) {
    throw new Error(extractApiErrorSnippet(body, rawText))
  }
  return body
}

export async function fetchTwelvePuntoPosts(params: TwelvePuntoPostsListParams): Promise<TwelvePuntoPostsResponse> {
  const search = new URLSearchParams()
  appendRepeated(search, 'feed_types', params.feed_types)
  appendRepeated(search, 'feed_names', params.feed_names)

  if (params.ready !== undefined && params.ready !== null) {
    search.set('ready', String(params.ready))
  }
  if (params.published_at_min?.trim()) search.set('published_at_min', params.published_at_min.trim())
  if (params.published_at_max?.trim()) search.set('published_at_max', params.published_at_max.trim())
  if (params.created_at_min?.trim()) search.set('created_at_min', params.created_at_min.trim())
  if (params.created_at_max?.trim()) search.set('created_at_max', params.created_at_max.trim())

  search.set('sort_field', params.sort_field ?? 'created_at')
  search.set('sort_direction', params.sort_direction ?? 'desc')
  search.set('limit', String(params.limit ?? 20))
  search.set('projection', params.projection ?? 'list')

  if (params.cursor) search.set('cursor', params.cursor)

  if (params.fields?.length) appendRepeated(search, 'fields', params.fields)

  const url = `${TWELVE_PUNTO_BASE}/posts${search.toString() ? `?${search.toString()}` : ''}`
  const r = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
  if (!r.ok) {
    const text = await r.text()
    throw new Error(text || `HTTP ${r.status}`)
  }
  return r.json() as Promise<TwelvePuntoPostsResponse>
}

export type TwelvePuntoFeed = {
  name?: string | null
  id?: string
  feed_id?: string
  type?: string | null
  feed_type?: string | null
}

export async function fetchTwelvePuntoFeeds(): Promise<TwelvePuntoFeed[]> {
  const r = await fetch(`${TWELVE_PUNTO_BASE}/feeds`, { headers: { Accept: 'application/json' } })
  if (!r.ok) {
    const text = await r.text()
    throw new Error(text || `HTTP ${r.status}`)
  }
  const json = await r.json()
  if (Array.isArray(json)) return json as TwelvePuntoFeed[]
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>
    const arr = o.feeds ?? o.items ?? o.data
    if (Array.isArray(arr)) return arr as TwelvePuntoFeed[]
  }
  return []
}
