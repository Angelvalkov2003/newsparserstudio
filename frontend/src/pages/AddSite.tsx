import { useState, useEffect } from 'react'
import { fetchSites, createSite, getSite, updateSite, deleteSite, type Site as SiteType } from '../api'
import { refreshSidebar } from '../utils/sidebarRefresh'

export function AddSite() {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [list, setList] = useState<SiteType[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchSites()
      setList(data)
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
    setName('')
    setUrl('')
    setEditingId(null)
    setError(null)
  }

  const handleEdit = async (id: number) => {
    try {
      const site = await getSite(id)
      setName(site.name)
      setUrl(site.url)
      setEditingId(id)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading site')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (editingId != null) {
        await updateSite(editingId, name.trim(), url.trim())
        resetForm()
      } else {
        await createSite(name.trim(), url.trim())
        setName('')
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
    if (!window.confirm('Delete this site? All related pages and parsed data will be affected.')) return
    setError(null)
    try {
      await deleteSite(id)
      if (editingId === id) resetForm()
      load()
      refreshSidebar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error deleting')
    }
  }

  return (
    <div className="form-page">
      <h1>{editingId != null ? 'Edit site' : 'Add site'}</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="site-name">Name</label>
          <input
            id="site-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Site name"
          />
        </div>
        <div className="form-group">
          <label htmlFor="site-url">URL</label>
          <input
            id="site-url"
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
            {submitting ? 'Saving…' : editingId != null ? 'Update site' : 'Add site'}
          </button>
          {editingId != null && (
            <button type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <section className="list-section">
        <h2>Existing sites</h2>
        {loading ? (
          <p>Loading…</p>
        ) : list.length === 0 ? (
          <p>No sites yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {list.map((s) => (
              <li key={s.id} className="list-item list-item--crud">
                <div>
                  <strong>{s.name}</strong>
                  <br />
                  <small>{s.url}</small>
                </div>
                <div className="list-item-actions">
                  <button type="button" onClick={() => handleEdit(s.id)}>
                    Edit
                  </button>
                  <button type="button" className="danger" onClick={() => handleDelete(s.id)}>
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
