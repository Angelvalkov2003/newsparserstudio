import { useState, useEffect } from 'react'
import {
  fetchSites,
  fetchPages,
  fetchParsed,
  getParsed,
  createParsed,
  updateParsed,
  deleteParsed,
  type Site,
  type PageWithSite,
  type ParsedWithPage,
} from '../api'
import { refreshSidebar } from '../utils/sidebarRefresh'

export function AddParsed() {
  const [sites, setSites] = useState<Site[]>([])
  const [pages, setPages] = useState<PageWithSite[]>([])
  const [list, setList] = useState<ParsedWithPage[]>([])
  const [pageId, setPageId] = useState<number | ''>('')
  const [name, setName] = useState('')
  const [dataJson, setDataJson] = useState('')
  const [info, setInfo] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [filterSiteId, setFilterSiteId] = useState<number | ''>('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [sitesData, pagesData, parsedData] = await Promise.all([
        fetchSites(),
        fetchPages(),
        fetchParsed(),
      ])
      setSites(sitesData)
      setPages(pagesData)
      setList(parsedData)
      if (pagesData.length && pageId === '' && editingId == null) setPageId(pagesData[0].id)
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
    setPageId(pages.length ? pages[0].id : '')
    setName('')
    setDataJson('')
    setInfo('')
    setIsVerified(false)
    setEditingId(null)
    setError(null)
  }

  const handleEdit = async (id: number) => {
    try {
      const r = await getParsed(id)
      setPageId(r.page_id)
      setName(r.name ?? '')
      setDataJson(r.data)
      setInfo(r.info ?? '')
      setIsVerified(r.is_verified)
      setEditingId(id)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading record')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pageId === '') {
      setError('Select a page')
      return
    }
    const trimmed = dataJson.trim()
    if (!trimmed) {
      setError('Enter JSON (data_parsed)')
      return
    }
    try {
      JSON.parse(trimmed)
    } catch {
      setError('Invalid JSON')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      if (editingId != null) {
        await updateParsed(
          editingId,
          Number(pageId),
          name.trim() || null,
          trimmed,
          info.trim() || null,
          isVerified
        )
        resetForm()
      } else {
        await createParsed(
          Number(pageId),
          name.trim() || null,
          trimmed,
          info.trim() || null,
          isVerified
        )
        setName('')
        setDataJson('')
        setInfo('')
        setIsVerified(false)
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
    if (!window.confirm('Delete this parsed record?')) return
    setError(null)
    try {
      await deleteParsed(id)
      if (editingId === id) resetForm()
      load()
      refreshSidebar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error deleting')
    }
  }

  const filteredList = list.filter((r) => {
    const page = pages.find((p) => p.id === r.page_id)
    const matchSite = !filterSiteId || page?.site_id === Number(filterSiteId)
    const q = search.trim().toLowerCase()
    const matchSearch =
      !q ||
      (r.name ?? '').toLowerCase().includes(q) ||
      (r.info ?? '').toLowerCase().includes(q) ||
      (r.page_title ?? '').toLowerCase().includes(q) ||
      (r.page_url ?? '').toLowerCase().includes(q) ||
      (page?.site_name ?? '').toLowerCase().includes(q)
    return matchSite && matchSearch
  })

  return (
    <div className="form-page">
      <h1>{editingId != null ? 'Edit parsed (JSON)' : 'Add parsed (JSON for comparison)'}</h1>
      <p style={{ color: 'var(--editor-muted)', marginBottom: '1rem', fontSize: '0.9375rem' }}>
        This stores JSON for data comparison. If <strong>Data correct</strong> (is_verified) is
        checked, the record is treated as the reference data.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="parsed-page">Page (article)</label>
          <select
            id="parsed-page"
            value={pageId}
            onChange={(e) => setPageId(e.target.value === '' ? '' : Number(e.target.value))}
            required
          >
            <option value="">— Select page —</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || p.url} {p.site_name ? `(${p.site_name})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="parsed-name">Name (optional)</label>
          <input
            id="parsed-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Record name"
          />
        </div>
        <div className="form-group">
          <label htmlFor="parsed-data">JSON (data_parsed)</label>
          <textarea
            id="parsed-data"
            value={dataJson}
            onChange={(e) => setDataJson(e.target.value)}
            placeholder='{"metadata": {...}, "components": [...]}'
            style={{ minHeight: 200 }}
          />
        </div>
        <div className="form-group">
          <label htmlFor="parsed-info">Info (optional)</label>
          <input
            id="parsed-info"
            type="text"
            value={info}
            onChange={(e) => setInfo(e.target.value)}
            placeholder="Additional info"
          />
        </div>
        <div className="form-group checkbox-row">
          <input
            id="parsed-verified"
            type="checkbox"
            checked={isVerified}
            onChange={(e) => setIsVerified(e.target.checked)}
          />
          <label htmlFor="parsed-verified">Data correct (is_verified) — reference data</label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? 'Saving…' : editingId != null ? 'Update parsed' : 'Add parsed'}
          </button>
          {editingId != null && (
            <button type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <section className="list-section">
        <h2>Existing parsed records</h2>
        <div className="list-section-filters">
          <input
            type="search"
            placeholder="Търсене по име, info, страница..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="list-section-search"
          />
          <select
            value={filterSiteId}
            onChange={(e) => setFilterSiteId(e.target.value === '' ? '' : Number(e.target.value))}
            className="list-section-filter"
          >
            <option value="">Всички уебсайтове</option>
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
          <p>{list.length === 0 ? 'No records yet.' : 'Няма резултати за търсенето/филтъра.'}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {filteredList.map((r) => (
              <li key={r.id} className="list-item list-item--crud">
                <div>
                  <strong>{r.name || `Parsed #${r.id}`}</strong>
                  {r.is_verified && (
                    <span style={{ marginLeft: '0.5rem', color: 'var(--editor-success)' }}>
                      ✓ Data correct
                    </span>
                  )}
                  <br />
                  <small>Page: {r.page_title || r.page_url || r.page_id}</small>
                  {r.info && (
                    <>
                      <br />
                      <small>{r.info}</small>
                    </>
                  )}
                </div>
                <div className="list-item-actions">
                  <button type="button" onClick={() => handleEdit(r.id)}>
                    Edit
                  </button>
                  <button type="button" className="danger" onClick={() => handleDelete(r.id)}>
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
