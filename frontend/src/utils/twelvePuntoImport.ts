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
    } catch {}
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

export function siteOriginAndName(post: Record<string, unknown>): { siteUrl: string; siteName: string } {
  const source = post.source_id
  if (typeof source !== 'string' || !source.trim()) {
    throw new Error('Missing source_id (article URL); cannot determine site.')
  }
  let u: URL
  try {
    u = new URL(source.trim())
  } catch {
    throw new Error('Invalid source_id: expected a full article URL.')
  }
  const siteUrl = u.origin
  const feedName = typeof post.feed_name === 'string' ? post.feed_name.trim() : ''
  const siteName = feedName || u.hostname
  return { siteUrl, siteName }
}

export function pageUrlFromPost(post: Record<string, unknown>): string {
  const source = post.source_id
  if (typeof source !== 'string' || !source.trim()) {
    throw new Error('Missing source_id.')
  }
  return source.trim()
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
  ].filter(Boolean)

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
