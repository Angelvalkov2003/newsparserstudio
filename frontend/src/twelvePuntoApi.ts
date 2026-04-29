/**
 * Twelve Punto public consumer API (OAS 3.1).
 *
 * - Prefer VITE_TWELVE_PUNTO_API_ORIGIN (absolute URL, no trailing slash) baked at build time.
 * - If unset, use same-origin path `/twelve-punto-api` — Vite (dev) and nginx (Docker) proxy to the real host.
 *
 * CORS: calling the real API URL from the browser (e.g. localhost:5173 → ai.12punto…) is blocked unless the API
 * sends Access-Control-Allow-Origin for your origin. Avoid by using same-origin `/twelve-punto-api` (Vite + nginx proxy).
 *
 * - `npm run dev`: always use `/twelve-punto-api` (ignore VITE_TWELVE_PUNTO_API_ORIGIN) so dev never hits CORS.
 * - Production build: use VITE_TWELVE_PUNTO_API_ORIGIN if set; else `/twelve-punto-api` (nginx in Docker proxies it).
 */
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
  /** Present depending on API version / projection */
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

  // Only pass `fields` when explicitly requested — deployed APIs may reject names from the doc (e.g. db_id).
  // `projection=list` alone returns a sensible default shape.
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
