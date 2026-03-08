import { useState, useEffect } from 'react'
import {
  fetchSites,
  fetchPages,
  getPage,
  createPage,
  updatePage,
  deletePage,
  type Site,
  type PageWithSite,
} from '../api'
import { refreshSidebar } from '../utils/sidebarRefresh'

export function AddPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [list, setList] = useState<PageWithSite[]>([])
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [siteId, setSiteId] = useState<number | ''>('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [filterSiteId, setFilterSiteId] = useState<number | ''>('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [sitesData, pagesData] = await Promise.all([fetchSites(), fetchPages()])
      setSites(sitesData)
      setList(pagesData)
      if (sitesData.length && siteId === '' && editingId == null) setSiteId(sitesData[0].id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const resetForm = () => {
    setTitle('')
    setUrl('')
    setSiteId(sites.length ? sites[0].id : '')
    setEditingId(null)
    setError(null)
  }

  const handleEdit = async (id: number) => {
    try {
      const page = await getPage(id)
      setTitle(page.title ?? '')
      setUrl(page.url)
      setSiteId(page.site_id)
      setEditingId(id)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading page')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (siteId === '') {
      setError('Select a site')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      if (editingId != null) {
        await updatePage(editingId, title.trim() || null, url.trim(), Number(siteId))
        resetForm()
      } else {
        await createPage(title.trim() || null, url.trim(), Number(siteId))
        setTitle('')
        setUrl('')
      }
      load()
      refreshSidebar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error saving')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this page? All related parsed records will be removed.')) return
    setError(null)
    try {
      await deletePage(id)
      if (editingId === id) resetForm()
      load()
      refreshSidebar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error deleting')
    }
  }

  const filteredList = list.filter((p) => {
    const matchSite = !filterSiteId || p.site_id === Number(filterSiteId)
    const q = search.trim().toLowerCase()
    const matchSearch =
      !q ||
      (p.title ?? '').toLowerCase().includes(q) ||
      p.url.toLowerCase().includes(q) ||
      (p.site_name ?? '').toLowerCase().includes(q)
    return matchSite && matchSearch
  })

  return (
    <div className="form-page">
      <h1>{editingId != null ? 'Edit page (article)' : 'Add page (article)'}</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="page-site">Site</label>
          <select
            id="page-site"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value === '' ? '' : Number(e.target.value))}
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
            required
            placeholder="https://..."
          />
        </div>
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
        <h2>Existing pages (articles)</h2>
        <div className="list-section-filters">
          <input
            type="search"
            placeholder="Search by title, URL or site..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="list-section-search"
          />
          <select
            value={filterSiteId}
            onChange={(e) => setFilterSiteId(e.target.value === '' ? '' : Number(e.target.value))}
            className="list-section-filter"
          >
            <option value="">All sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <p>Loading…</p>
        ) : filteredList.length === 0 ? (
          <p>{list.length === 0 ? 'No pages yet.' : 'No results for your search or filter.'}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {filteredList.map((p) => (
              <li key={p.id} className="list-item list-item--crud">
                <div>
                  <strong>{p.title || p.url}</strong>
                  {p.site_name && (
                    <>
                      <br />
                      <small>Site: {p.site_name}</small>
                    </>
                  )}
                  <br />
                  <small>{p.url}</small>
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
