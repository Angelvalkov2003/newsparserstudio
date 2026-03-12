import { useState, useEffect } from 'react'
import { fetchSites, createSite, getSite, updateSite, deleteSite, fetchUsers, type Site as SiteType, type UserPublic } from '../api'
import { refreshSidebar } from '../utils/sidebarRefresh'
import { useIsAdmin } from '../context'

export function AddSite() {
  const isAdmin = useIsAdmin()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [allowedFor, setAllowedFor] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [list, setList] = useState<SiteType[]>([])
  const [users, setUsers] = useState<UserPublic[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [data, usersRes] = await Promise.all([
        fetchSites(),
        isAdmin ? fetchUsers() : Promise.resolve([]),
      ])
      setList(data)
      setUsers(usersRes)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <div className="form-page">
        <h1>Sites</h1>
        <p>Only admins can manage sites.</p>
      </div>
    )
  }

  const resetForm = () => {
    setName('')
    setUrl('')
    setAllowedFor([])
    setEditingId(null)
    setError(null)
  }

  const handleEdit = async (id: string) => {
    try {
      const site = await getSite(id)
      setName(site.name)
      setUrl(site.url)
      setAllowedFor(site.allowed_for ?? [])
      setEditingId(id)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading site')
    }
  }

  const toggleAllowed = (userId: string) => {
    setAllowedFor((prev) => (prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (editingId != null) {
        await updateSite(editingId, name.trim(), url.trim(), allowedFor)
        resetForm()
      } else {
        await createSite(name.trim(), url.trim(), allowedFor)
        setName('')
        setUrl('')
        setAllowedFor([])
      }
      load()
      refreshSidebar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error saving')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
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

  const filteredList = list.filter(
    (s) =>
      !search.trim() ||
      s.name.toLowerCase().includes(search.trim().toLowerCase()) ||
      s.url.toLowerCase().includes(search.trim().toLowerCase())
  )

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
        {isAdmin && editingId != null && users.length > 0 && (
          <div className="form-group">
            <label>Who can see and use this site</label>
            <div className="form-checkbox-list">
              <div className="form-checkbox-list-actions">
                <button
                  type="button"
                  onClick={() =>
                    setAllowedFor(
                      users
                        .filter((u) => !u.is_guest && u.role !== 'admin')
                        .map((u) => u.id)
                    )
                  }
                >
                  Select all users
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
        <div className="list-section-filters">
          <input
            type="search"
            placeholder="Search by name or URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="list-section-search"
          />
        </div>
        {loading ? (
          <p>Loading…</p>
        ) : filteredList.length === 0 ? (
          <p>{list.length === 0 ? 'No sites yet.' : 'No results for your search.'}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="list-sites-with-meta">
            {filteredList.map((s) => (
              <li key={s.id} className="list-item list-item--crud">
                <div>
                  <strong>{s.name}</strong>
                  <br />
                  <small>{s.url}</small>
                  <div className="list-item-meta">
                    <span title="Creator">By: {s.created_by_username ?? s.created_by ?? '—'}</span>
                    <span title="Who has access">Access: {[...new Set([s.created_by_username ?? s.created_by, ...(s.allowed_for_usernames ?? s.allowed_for ?? [])].filter(Boolean))].join(', ') || '—'}</span>
                  </div>
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
