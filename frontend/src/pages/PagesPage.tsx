import { useState, useEffect } from 'react'
import {
  fetchSites,
  fetchPages,
  createPage,
  getPage,
  updatePage,
  deletePage,
  fetchUsers,
  type Site,
  type PageWithSite,
  type UserPublic,
} from '../api'
import { useIsAdmin } from '../context'
import { refreshSidebar } from '../utils/sidebarRefresh'

export function PagesPage() {
  const isAdmin = useIsAdmin()
  const [sites, setSites] = useState<Site[]>([])
  const [pages, setPages] = useState<PageWithSite[]>([])
  const [users, setUsers] = useState<UserPublic[]>([])

  const [siteId, setSiteId] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const [url, setUrl] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [allowedFor, setAllowedFor] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  const [search, setSearch] = useState<string>('')
  const [filterSiteId, setFilterSiteId] = useState<string>('')

  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!isAdmin) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [sitesData, pagesData, usersRes] = await Promise.all([
        fetchSites(),
        fetchPages(undefined, 'created_at'),
        fetchUsers(),
      ])
      setSites(sitesData)
      setPages(pagesData)
      setUsers(usersRes)
      if (!siteId && sitesData.length > 0) {
        setSiteId(sitesData[0].id)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  const resetForm = () => {
    setSiteId(sites.length ? sites[0].id : '')
    setTitle('')
    setUrl('')
    setNotes('')
    setAllowedFor([])
    setEditingId(null)
    setError(null)
  }

  const handleEdit = async (id: string) => {
    try {
      const page = await getPage(id)
      setSiteId(page.site_id ?? '')
      setTitle(page.title ?? '')
      setUrl(page.url)
      setNotes(page.notes ?? '')
      setAllowedFor(page.allowed_for ?? [])
      setEditingId(id)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading page')
    }
  }

  const toggleAllowed = (userId: string) => {
    setAllowedFor((prev) => (prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId]))
  }

  const selectAllFromSite = () => {
    if (!siteId) return
    const site = sites.find((s) => s.id === siteId)
    if (!site) return
    const baseIds = [
      ...(site.allowed_for ?? []),
      site.created_by ?? '',
    ].filter(Boolean)
    const uniqueIds = Array.from(new Set(baseIds))
    setAllowedFor(uniqueIds)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!siteId) {
      setError('Select a site')
      return
    }
    if (!url.trim()) {
      setError('Enter URL')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      if (editingId != null) {
        await updatePage(
          editingId,
          title.trim() || null,
          url.trim(),
          siteId,
          isAdmin ? allowedFor : undefined,
          notes.trim() || null
        )
        resetForm()
      } else {
        await createPage(title.trim() || null, url.trim(), siteId, notes.trim() || null)
        setTitle('')
        setUrl('')
        setNotes('')
        setAllowedFor([])
      }
      await load()
      refreshSidebar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error saving')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this page? All related parsed data will be affected.')) return
    setError(null)
    try {
      await deletePage(id)
      if (editingId === id) resetForm()
      await load()
      refreshSidebar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error deleting')
    }
  }

  const filteredPages = pages.filter((p) => {
    if (filterSiteId && p.site_id !== filterSiteId) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    const title = (p.title ?? '').toLowerCase()
    const url = (p.url ?? '').toLowerCase()
    const siteName = (p.site_name ?? '').toLowerCase()
    return title.includes(q) || url.includes(q) || siteName.includes(q)
  })

  if (!isAdmin) {
    return (
      <div className="form-page">
        <h1>Pages</h1>
        <p style={{ color: 'var(--editor-muted)' }}>Only admins can manage pages.</p>
      </div>
    )
  }

  return (
    <div className="form-page">
      <h1>{editingId != null ? 'Edit page' : 'Add page'}</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="page-site">Site</label>
          <select
            id="page-site"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            required
          >
            <option value="">— Select site —</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="page-title">Title (optional)</label>
          <input
            id="page-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Page title"
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
            required
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
        {editingId != null && users.length > 0 && (
          <div className="form-group">
            <label>Who can see and use this page</label>
            <div className="form-checkbox-list">
              <div className="form-checkbox-list-actions">
                <button type="button" onClick={selectAllFromSite}>
                  Select all users from site
                </button>
              </div>
              {users.filter((u) => !u.is_guest && u.role !== 'admin').map((u) => (
                <label key={u.id} className="form-checkbox">
                  <input
                    type="checkbox"
                    checked={allowedFor.includes(u.id)}
                    onChange={() => toggleAllowed(u.id)}
                  />
                  {u.username}
                </label>
              ))}
            </div>
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? 'Saving…' : editingId != null ? 'Update page' : 'Add page'}
          </button>
          {editingId != null && (
            <button type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <section className="list-section">
        <h2>Existing pages</h2>
        <div className="list-section-filters">
          <select
            value={filterSiteId}
            onChange={(e) => setFilterSiteId(e.target.value)}
            className="list-section-select"
          >
            <option value="">All sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            type="search"
            placeholder="Search by title, URL or site..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="list-section-search"
          />
        </div>
        {loading ? (
          <p>Loading…</p>
        ) : filteredPages.length === 0 ? (
          <p>{pages.length === 0 ? 'No pages yet.' : 'No results for your search.'}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="list-sites-with-meta">
            {filteredPages.map((p) => (
              <li key={p.id} className="list-item list-item--crud">
                <div>
                  <strong>{p.title || p.url}</strong>
                  <br />
                  <small>
                    {p.url}
                    {p.site_name ? ` · ${p.site_name}` : ''}
                  </small>
                  <div className="list-item-meta">
                    <span title="Creator">By: {p.created_by_username ?? p.created_by ?? '—'}</span>
                    <span title="Who has access">
                      Access:{' '}
                      {[
                        p.created_by_username ?? p.created_by,
                        ...(p.allowed_for_usernames ?? p.allowed_for ?? []),
                      ]
                        .filter(Boolean)
                        .filter((v, i, arr) => arr.indexOf(v) === i)
                        .join(', ') || '—'}
                    </span>
                  </div>
                </div>
                <div className="list-item-actions">
                  <button type="button" onClick={() => handleEdit(p.id)}>
                    Edit
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
  )
}

