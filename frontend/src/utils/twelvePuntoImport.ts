import type { SiteBulkItem } from '../api'

const VALID_COMPONENT_TYPES = new Set([
  'heading',
  'paragraph',
  'image',
  'link',
  'code_block',
  'equation',
  'citation',
  'footnote',
  'horizontal_ruler',
  'list',
  'poll',
  'table',
  'video',
])

export type StudioParsedPayload = {
  metadata: {
    title: string
    authors: unknown[]
    categories: unknown[]
    tags: unknown[]
    document_date?: string
    parse_datetime?: string
    document_last_update_date?: string
  }
  components: Record<string, unknown>[]
}

function pickContentArray(post: Record<string, unknown>): unknown[] {
  const top = post.content
  if (Array.isArray(top)) return top

  const data = post.data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const inner = (data as Record<string, unknown>).content
    if (Array.isArray(inner)) return inner
  }
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const o = parsed as Record<string, unknown>
        if (Array.isArray(o.content)) return o.content
      }
    } catch {
      /* data string is not JSON — fall through to [] */
    }
  }
  return []
}

function flattenContentBlock(raw: unknown): Record<string, unknown> | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const type = o.type
  if (typeof type !== 'string' || !VALID_COMPONENT_TYPES.has(type)) return null

  const props = o.properties
  if (props && typeof props === 'object' && !Array.isArray(props)) {
    const flat: Record<string, unknown> = { type, ...(props as Record<string, unknown>) }
    if (typeof o.id === 'string') flat.id = o.id
    return flat
  }
  const flat: Record<string, unknown> = { type }
  if (typeof o.id === 'string') flat.id = o.id
  return flat
}

function normalizeCategories(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((c) => {
      if (typeof c === 'string') return { name: c }
      if (c && typeof c === 'object' && typeof (c as { name?: unknown }).name === 'string') return c
      return null
    })
    .filter(Boolean) as unknown[]
}

export function buildStudioParsedFromTwelvePuntoPost(post: Record<string, unknown>): StudioParsedPayload {
  const title = typeof post.title === 'string' ? post.title : ''
  const blocks = pickContentArray(post)
  const components: Record<string, unknown>[] = []
  let i = 0
  for (const b of blocks) {
    const flat = flattenContentBlock(b)
    if (flat) {
      if (typeof flat.id !== 'string') flat.id = `12punto-${i + 1}`
      components.push(flat)
      i += 1
    }
  }

  const meta: StudioParsedPayload['metadata'] = {
    title,
    authors: [],
    categories: normalizeCategories(post.categories),
    tags: [],
  }
  if (typeof post.published_at === 'string' && post.published_at.trim()) {
    meta.document_date = post.published_at.trim()
  }
  if (typeof post.created_at === 'string' && post.created_at.trim()) {
    meta.parse_datetime = post.created_at.trim()
  }
  if (typeof post.edited_at === 'string' && post.edited_at.trim()) {
    meta.document_last_update_date = post.edited_at.trim()
  }

  return { metadata: meta, components }
}

const URL_FIELD_KEYS = [
  'source_id',
  'url',
  'link',
  'article_url',
  'permalink',
  'canonical_url',
  'post_url',
  'web_url',
  'guid',
  'external_url',
  'share_url',
  'story_url',
  'href',
  'canonical',
  'original_url',
  'full_url',
  'page_url',
  'article_link',
  'link_url',
  'short_url',
] as const

const HOSTISH = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?(?::[0-9]+)?$/
const URL_IN_JSON_RE = /https?:\/\/[a-zA-Z0-9][^\s"'<>]{6,1200}/gi
/** Matches www.site.tld/... without scheme (embedded in JSON or text). */
const WWW_PATH_RE =
  /\bwww\.[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}(?:\/[^\s"'<>]*)?/gi
const ORIGIN_PREFIX_RE = /https?:\/\/[^/\s?#'"<>]+/gi
const MAX_URL_DEPTH = 10

/** Built-in origins for path-only joins — no .env required (optional env only appends). */
const DEFAULT_RELATIVE_BASE_ORIGINS: readonly string[] = [
  'https://www.iha.com.tr',
  'https://iha.com.tr',
  'https://www.hurriyet.com.tr',
  'https://www.milliyet.com.tr',
  'https://www.sabah.com.tr',
  'https://www.cnnturk.com',
  'https://www.ntv.com.tr',
  'https://www.trthaber.com',
  'https://www.aa.com.tr',
  'https://www.haberturk.com',
  'https://www.yenisafak.com',
  'https://www.takvim.com.tr',
  'https://www.fotomac.com.tr',
  'https://www.sozcu.com.tr',
  'https://www.dunya.com',
  'https://www.dha.com.tr',
  'https://www.mynet.com',
]

function relativeBasesExtraFromEnv(): string[] {
  const raw = import.meta.env.VITE_TWELVE_PUNTO_RELATIVE_BASES_EXTRA as string | undefined
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean)
}

function originsFromBlob(blob: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const re = new RegExp(ORIGIN_PREFIX_RE.source, ORIGIN_PREFIX_RE.flags)
  for (const m of blob.matchAll(re)) {
    try {
      const u = new URL(m[0].replace(/\/+$/, ''))
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue
      const o = u.origin
      if (!seen.has(o)) {
        seen.add(o)
        out.push(o)
      }
    } catch {
      /* skip */
    }
  }
  return out
}

function originsFromPieces(pieces: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const p of pieces) {
    const abs = coerceToAbsoluteUrl(p)
    if (!abs) continue
    try {
      const u = new URL(abs)
      const o = u.origin
      if (!seen.has(o)) {
        seen.add(o)
        out.push(o)
      }
    } catch {
      /* skip */
    }
  }
  return out
}

function uniquePush(order: string[], items: readonly string[]): void {
  for (const x of items) {
    const t = x.replace(/\/$/, '')
    if (!order.includes(t)) order.push(t)
  }
}

function effectiveRelativeBases(post: Record<string, unknown>, pieces: string[]): string[] {
  let blob = ''
  try {
    blob = JSON.stringify(post)
  } catch {
    blob = ''
  }
  const bases: string[] = []
  uniquePush(bases, originsFromBlob(blob))
  uniquePush(bases, originsFromPieces(pieces))
  uniquePush(bases, DEFAULT_RELATIVE_BASE_ORIGINS)
  uniquePush(bases, relativeBasesExtraFromEnv())
  return bases
}

function gatherFlatFields(post: Record<string, unknown>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const add = (v: unknown) => {
    if (typeof v !== 'string' || !v.trim()) return
    const t = v.trim()
    if (seen.has(t)) return
    seen.add(t)
    out.push(t)
  }

  for (const k of URL_FIELD_KEYS) add(post[k])

  const data = post.data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const d = data as Record<string, unknown>
    for (const k of URL_FIELD_KEYS) add(d[k])
  } else if (typeof data === 'string' && data.trim()) {
    try {
      const parsed = JSON.parse(data) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const d = parsed as Record<string, unknown>
        for (const k of URL_FIELD_KEYS) add(d[k])
      }
    } catch {
      /* ignore */
    }
  }
  return out
}

function urlsFromContentBlocks(post: Record<string, unknown>): string[] {
  const blocks = pickContentArray(post)
  const out: string[] = []
  for (const b of blocks) {
    if (b == null || typeof b !== 'object' || Array.isArray(b)) continue
    const o = b as Record<string, unknown>
    const props = o.properties
    if (props && typeof props === 'object' && !Array.isArray(props)) {
      const p = props as Record<string, unknown>
      for (const key of ['url', 'href', 'link', 'canonical', 'permalink']) {
        const v = p[key]
        if (typeof v === 'string' && v.trim()) out.push(v.trim())
      }
    }
    for (const key of ['url', 'href', 'link']) {
      const v = o[key]
      if (typeof v === 'string' && v.trim()) out.push(v.trim())
    }
  }
  return out
}

function deepCollectUrlish(obj: unknown, depth: number, out: string[], seen: Set<string>): void {
  if (depth > MAX_URL_DEPTH) return
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    const d = obj as Record<string, unknown>
    for (const [k, v] of Object.entries(d)) {
      const lk = k.toLowerCase()
      if (typeof v === 'string' && v.trim()) {
        if (['url', 'link', 'href', 'permalink', 'canonical', 'source'].some((x) => lk.includes(x))) {
          const t = v.trim()
          if (t.length > 3 && !seen.has(t)) {
            seen.add(t)
            out.push(t)
          }
        }
      }
      deepCollectUrlish(v, depth + 1, out, seen)
    }
  } else if (Array.isArray(obj)) {
    for (const v of obj) deepCollectUrlish(v, depth + 1, out, seen)
  } else if (typeof obj === 'string') {
    const t = obj.trim()
    if (t.length < 7) return
    if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('//')) {
      if (!seen.has(t)) {
        seen.add(t)
        out.push(t)
      }
    } else if (t.startsWith('/') && t.length > 3) {
      if (!seen.has(t)) {
        seen.add(t)
        out.push(t)
      }
    } else if (t.includes('/') && t.includes('.') && t.split('/', 1)[0].includes('.')) {
      if (!seen.has(t)) {
        seen.add(t)
        out.push(t)
      }
    }
  }
}

function urlsFromJsonRegexBlob(blob: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const re = new RegExp(URL_IN_JSON_RE.source, URL_IN_JSON_RE.flags)
  for (const m of blob.matchAll(re)) {
    const u = m[0].replace(/[.,;)\]}"']+$/, '')
    if (!seen.has(u)) {
      seen.add(u)
      out.push(u)
    }
  }
  return out
}

function wwwCandidatesFromBlob(blob: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const re = new RegExp(WWW_PATH_RE.source, WWW_PATH_RE.flags)
  for (const m of blob.matchAll(re)) {
    const raw = m[0].replace(/[.,;)\]}"']+$/, '')
    if (!raw.toLowerCase().startsWith('www.')) continue
    const cand = 'https://' + raw
    if (!seen.has(cand)) {
      seen.add(cand)
      out.push(cand)
    }
  }
  return out
}

function mergeUrlCandidates(post: Record<string, unknown>): string[] {
  const seen = new Set<string>()
  const merged: string[] = []
  const extend = (xs: string[]) => {
    for (const x of xs) {
      const t = x.trim()
      if (!t || seen.has(t)) continue
      seen.add(t)
      merged.push(t)
    }
  }
  let blob = ''
  try {
    blob = JSON.stringify(post)
  } catch {
    blob = ''
  }
  extend(gatherFlatFields(post))
  extend(urlsFromContentBlocks(post))
  const deepOut: string[] = []
  const deepSeen = new Set<string>()
  deepCollectUrlish(post, 0, deepOut, deepSeen)
  extend(deepOut)
  extend(urlsFromJsonRegexBlob(blob))
  extend(wwwCandidatesFromBlob(blob))
  return merged
}

function firstSegment(s: string): string {
  return s.trim().split('/', 1)[0] ?? ''
}

function looksLikeDomainSegment(seg: string): boolean {
  return Boolean(seg && seg.includes('.') && HOSTISH.test(seg))
}

function coerceToAbsoluteUrl(s: string): string | null {
  let t = s.trim()
  if (!t) return null
  if (t.startsWith('//')) t = 'https:' + t
  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t)
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        return u.href.split('#')[0]
      }
      return null
    } catch {
      return null
    }
  }
  if (t.startsWith('/')) return null
  if (t.includes('/')) {
    const head = t.split('/')[0]
    if (head.includes('.') && HOSTISH.test(head)) {
      try {
        return new URL('https://' + t.replace(/^\//, '')).href.split('#')[0]
      } catch {
        return null
      }
    }
  }
  return null
}

/** RFC2606 *.invalid — stable Studio URLs when API has no real article link. */
export const SYNTHETIC_ROOT_HOST = '12punto.article.invalid'

export function isSyntheticArticleUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(SYNTHETIC_ROOT_HOST)
  } catch {
    return false
  }
}

function syntheticSiteOrigin(post: Record<string, unknown>): string {
  const fid = post.feed_id
  if (fid !== undefined && fid !== null && String(fid).trim() !== '') {
    return `https://f-${String(fid).trim()}.${SYNTHETIC_ROOT_HOST}`
  }
  return `https://${SYNTHETIC_ROOT_HOST}`
}

function syntheticArticleUrl(post: Record<string, unknown>): string {
  const origin = syntheticSiteOrigin(post).replace(/\/$/, '')
  const raw = post.db_id ?? post.id
  if (raw !== undefined && raw !== null) {
    const pid = String(raw).trim()
    if (pid) return `${origin}/p/${encodeURIComponent(pid)}`
  }
  const sid = post.source_id
  if (typeof sid === 'string' && sid.trim()) {
    return `${origin}/wire/${encodeURIComponent(sid.trim())}`
  }
  throw new Error('Cannot synthesize page URL: post has no db_id, id, or source_id.')
}

/** Strict resolution only — throws if no real URL (used internally before synthetic fallback). */
function resolveArticleUrlStrict(post: Record<string, unknown>): string {
  const pieces = mergeUrlCandidates(post)
  const bases = effectiveRelativeBases(post, pieces)
  for (const p of pieces) {
    const abs = coerceToAbsoluteUrl(p)
    if (abs) return abs
  }
  for (const p of pieces) {
    if (p.startsWith('/')) {
      for (const base of bases) {
        try {
          const joined = new URL(p, base.endsWith('/') ? base : base + '/').href
          const u = new URL(joined)
          if (u.protocol === 'http:' || u.protocol === 'https:') return u.href.split('#')[0]
        } catch {
          /* next base */
        }
      }
    }
  }
  for (const p of pieces) {
    const pt = p.trim()
    if (pt.startsWith('http://') || pt.startsWith('https://') || pt.startsWith('//') || pt.startsWith('/')) continue
    if (!pt.includes('/')) continue
    if (looksLikeDomainSegment(firstSegment(pt))) continue
    for (const base of bases) {
      try {
        const joined = new URL('/' + pt.replace(/^\//, ''), base.endsWith('/') ? base : base + '/').href
        const u = new URL(joined)
        if (u.protocol === 'http:' || u.protocol === 'https:') return u.href.split('#')[0]
      } catch {
        /* next base */
      }
    }
  }
  throw new Error(
    'Could not resolve a full article URL from this post (checked fields, nested data, content links, embedded http(s) text, www… fragments, relative paths, auto-detected origins, and built-in defaults).'
  )
}

/** Same rules as backend: real URL when possible; else stable synthetic *.invalid URL (wire/source preserved in path / info). */
export function resolveArticleUrl(post: Record<string, unknown>): string {
  try {
    return resolveArticleUrlStrict(post)
  } catch {
    return syntheticArticleUrl(post)
  }
}

export function siteOriginAndName(post: Record<string, unknown>): { siteUrl: string; siteName: string } {
  const page = resolveArticleUrl(post)
  const u = new URL(page)
  const siteUrl = u.origin
  const feedName = typeof post.feed_name === 'string' ? post.feed_name.trim() : ''
  const siteName = feedName || u.hostname
  return { siteUrl, siteName }
}

export function pageUrlFromPost(post: Record<string, unknown>): string {
  return resolveArticleUrl(post)
}

export function buildImportBulkPayloadFromTwelvePuntoPost(post: Record<string, unknown>): { sites: SiteBulkItem[] } {
  const { siteUrl, siteName } = siteOriginAndName(post)
  const pageUrl = pageUrlFromPost(post)
  const pageTitle = typeof post.title === 'string' ? post.title.trim() || null : null
  const parsedObj = buildStudioParsedFromTwelvePuntoPost(post)

  const rawId = post.db_id ?? post.id
  const idLabel =
    typeof rawId === 'number' || typeof rawId === 'string' ? String(rawId) : 'post'

  const infoParts = [
    'Imported from 12punto',
    typeof rawId !== 'undefined' ? `id=${idLabel}` : null,
    typeof post.feed_id !== 'undefined' ? `feed_id=${post.feed_id}` : null,
  ].filter(Boolean) as string[]
  if (isSyntheticArticleUrl(pageUrl)) {
    const wire = post.source_id
    if (typeof wire === 'string' && wire.trim()) infoParts.push(`source_id=${wire.trim()}`)
    infoParts.push('synthetic page URL (no usable article link in API)')
  }

  const sites: SiteBulkItem[] = [
    {
      name: siteName,
      url: siteUrl,
      pages: [
        {
          title: pageTitle,
          url: pageUrl,
          parsed: [
            {
              name: `12punto-${idLabel}`,
              data: parsedObj,
              info: infoParts.join(' · '),
              is_verified: false,
              notes: null,
            },
          ],
        },
      ],
    },
  ]

  return { sites }
}
