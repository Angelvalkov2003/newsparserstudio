import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getUniquePage,
  fetchParsed,
  createParsed,
  deleteParsed,
  type PageWithSite,
  type ParsedWithPage,
} from '../api'
import { refreshSidebar } from '../utils/sidebarRefresh'
import { useCurrentUser } from '../context'
import { getEmptyParsed } from '../state/articleEditorState'
import './AddPage.css'

function buildMinimalParsedData(title: string, url?: string): string {
  const meta = { ...getEmptyParsed().metadata, title: title || '' }
  const data = {
    ...getEmptyParsed(),
    metadata: meta,
    ...(url && url.trim() ? { sourceUrl: url.trim() } : {}),
  }
  return JSON.stringify(data)
}

export function AddPage() {
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const isGuest = currentUser?.role === 'guest' || currentUser?.isGuest === true

  const [myPage, setMyPage] = useState<PageWithSite | null>(null)
  const [list, setList] = useState<ParsedWithPage[]>([])
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [rightUrl, setRightUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const loadPage = async () => {
    if (isGuest) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const page = await getUniquePage(currentUser?.name)
      setMyPage(page ?? null)
      return page ?? null
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading page')
      setMyPage(null)
    } finally {
      setLoading(false)
    }
  }

  const loadParsed = async (pageId: string) => {
    try {
      const data = await fetchParsed(pageId)
      setList(data)
    } catch {
      setList([])
    }
  }

  useEffect(() => {
    loadPage().then((page) => {
      if (page?.id) loadParsed(page.id)
    })
  }, [isGuest])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!myPage?.id) return
    setError(null)
    setSubmitting(true)
    try {
      const linkUrl = rightUrl.trim() || url.trim()
      const dataStr = buildMinimalParsedData(title.trim() || linkUrl || 'Untitled', linkUrl || undefined)
      await createParsed(myPage.id, title.trim() || null, dataStr, notes.trim() || null, false, notes.trim() || null)
      setTitle('')
      setUrl('')
      setNotes('')
      setRightUrl('')
      await loadParsed(myPage.id)
      refreshSidebar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error saving')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this article?')) return
    setError(null)
    try {
      await deleteParsed(id)
      if (myPage?.id) await loadParsed(myPage.id)
      refreshSidebar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error deleting')
    }
  }

  const openInEditor = (pageId: string) => {
    navigate(`/?pageId=${pageId}`)
  }

  const filteredList = list.filter((p) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    const name = (p.name ?? '').toLowerCase()
    const info = (p.info ?? '').toLowerCase()
    const pageUrl = (p.page_url ?? '').toLowerCase()
    return name.includes(q) || info.includes(q) || pageUrl.includes(q)
  })

  if (isGuest) {
    return (
      <div className="form-page">
        <h1>Add page (article)</h1>
        <p>Guests use the Editor to add articles.</p>
      </div>
    )
  }

  return (
    <div className="add-page-layout">
      <div className="add-page-left">
        <h1>Add page (article)</h1>
        <p className="add-page-uniq-hint">Articles are saved to your Unique page.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="page-title">Title (optional)</label>
            <input
              id="page-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title"
            />
          </div>
          <div className="form-group">
            <label htmlFor="page-url">URL</label>
            <input
              id="page-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="form-group">
            <label htmlFor="page-notes">Notes (internal)</label>
            <textarea
              id="page-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes..."
              rows={2}
              className="form-input"
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="submit" className="primary" disabled={submitting || !myPage}>
              {submitting ? 'Saving…' : 'Add article'}
            </button>
          </div>
        </form>

        <section className="list-section">
          <h2>Existing articles (Unique page)</h2>
          <input
            type="search"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="list-section-search"
          />
          {loading ? (
            <p>Loading…</p>
          ) : filteredList.length === 0 ? (
            <p>{list.length === 0 ? 'No articles yet.' : 'No results.'}</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {filteredList.map((p) => (
                <li key={p.id} className="list-item list-item--crud">
                  <div>
                    <strong>{p.name || p.page_title || 'Untitled'}</strong>
                    <br />
                    <small>{p.page_url || p.created_at}</small>
                  </div>
                  <div className="list-item-actions">
                    <button type="button" onClick={() => myPage && openInEditor(myPage.id)}>
                      Open in Editor
                    </button>
                    <button type="button" className="danger" onClick={() => handleDelete(p.id)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="add-page-right">
        <label className="add-page-right-label">
          <span>Link (URL)</span>
          <input
            type="url"
            className="add-page-url-input"
            value={rightUrl}
            onChange={(e) => setRightUrl(e.target.value)}
            placeholder="https://..."
          />
        </label>
      </aside>
    </div>
  )
}
