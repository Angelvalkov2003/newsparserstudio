import type { ParsedWithPage } from '../api'

export function formatParsedLabel(p: ParsedWithPage): string {
  const name = p.name?.trim() || `#${p.id}`
  const info = p.info?.trim() ? ` • ${p.info}` : ''
  const date = new Date(p.updated_at).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  })
  return `${name}${info} • ${date}`
}
