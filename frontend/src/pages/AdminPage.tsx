import { useState, useEffect, useCallback } from 'react'
import {
  fetchSites,
  fetchPages,
  fetchParsed,
  fetchUsers,
  updateSite,
  updatePage,
  updateParsed,
  deleteSite,
  deletePage,
  deleteParsed,
  type Site,
  type PageWithSite,
  type ParsedWithPage,
  type UserPublic,
} from '../api'
import { useIsAdmin } from '../context/authContext'
import { refreshSidebar } from '../utils/sidebarRefresh'
import './AdminPage.css'

type Tab = 'sites' | 'pages' | 'parsed'

export function AdminPage() {
  const isAdmin = useIsAdmin()
  const [tab, setTab] = useState<Tab>('sites')
  const [sort, setSort] = useState<'created_by' | 'created_at'>('created_at')
  const [sites, setSites] = useState<Site[]>([])
  const [pages, setPages] = useState<PageWithSite[]>([])
  const [parsed, setParsed] = useState<ParsedWithPage[]>([])
  const [users, setUsers] = useState<UserPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editSite, setEditSite] = useState<Site | null>(null)
  const [editPage, setEditPage] = useState<PageWithSite | null>(null)
  const [editParsed, setEditParsed] = useState<ParsedWithPage | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sitesRes, pagesRes, parsedRes, usersRes] = await Promise.all([
        fetchSites(sort),
        fetchPages(undefined, sort),
        fetchParsed(undefined, sort),
        fetchUsers(),
      ])
      setSites(sitesRes)
      setPages(pagesRes)
      setParsed(parsedRes)
      setUsers(usersRes)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [sort])

  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin, load])

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <p className="admin-forbidden">Admin only.</p>
      </div>
    )
  }

  const handleSaveSite = async (id: string, name: string, url: string, allowed_for: string[]) => {
    await updateSite(id, name, url, allowed_for)
    setEditSite(null)
    load()
    refreshSidebar()
  }

  const handleSavePage = async (
    id: string,
    title: string | null,
    url: string,
    site_id: string,
    allowed_for: string[]
  ) => {
    await updatePage(id, title, url, site_id, allowed_for)
    setEditPage(null)
    load()
    refreshSidebar()
  }

  const handleSaveParsed = async (
    id: string,
    page_id: string,
    name: string | null,
    data: string,
    info: string | null,
    is_verified: boolean,
    allowed_for: string[]
  ) => {
    await updateParsed(id, page_id, name, data, info, is_verified, allowed_for)
    setEditParsed(null)
    load()
    refreshSidebar()
  }

  const handleDeleteSite = async (id: string) => {
    if (!window.confirm('Delete this site? Related pages and parsed will be affected.')) return
    await deleteSite(id)
    if (editSite?.id === id) setEditSite(null)
    load()
    refreshSidebar()
  }

  const handleDeletePage = async (id: string) => {
    if (!window.confirm('Delete this page?')) return
    await deletePage(id)
    if (editPage?.id === id) setEditPage(null)
    load()
    refreshSidebar()
  }

  const handleDeleteParsed = async (id: string) => {
    if (!window.confirm('Delete this parsed record?')) return
    await deleteParsed(id)
    if (editParsed?.id === id) setEditParsed(null)
    load()
    refreshSidebar()
  }

  return (
    <div className="admin-page">
      <h1 className="admin-title">Admin – all content</h1>
      <div className="admin-tabs">
        <button
          type="button"
          className={tab === 'sites' ? 'active' : ''}
          onClick={() => setTab('sites')}
        >
          Sites
        </button>
        <button
          type="button"
          className={tab === 'pages' ? 'active' : ''}
          onClick={() => setTab('pages')}
        >
          Pages
        </button>
        <button
          type="button"
          className={tab === 'parsed' ? 'active' : ''}
          onClick={() => setTab('parsed')}
        >
          Parsed
        </button>
      </div>
      <div className="admin-toolbar">
        <label>
          Sort by:
          <select value={sort} onChange={(e) => setSort(e.target.value as 'created_by' | 'created_at')}>
            <option value="created_at">Date</option>
            <option value="created_by">Creator</option>
          </select>
        </label>
      </div>
      {error && <p className="admin-error">{error}</p>}
      {loading ? (
        <p className="admin-loading">Loading…</p>
      ) : (
        <>
          {tab === 'sites' && (
            <AdminSitesTable
              sites={sites}
              onEdit={setEditSite}
              onSave={handleSaveSite}
              onDelete={handleDeleteSite}
              users={users}
            />
          )}
          {tab === 'pages' && (
            <AdminPagesTable
              pages={pages}
              sites={sites}
              onEdit={setEditPage}
              onSave={handleSavePage}
              onDelete={handleDeletePage}
              users={users}
            />
          )}
          {tab === 'parsed' && (
            <AdminParsedTable
              parsed={parsed}
              pages={pages}
              onEdit={setEditParsed}
              onSave={handleSaveParsed}
              onDelete={handleDeleteParsed}
              users={users}
            />
          )}
        </>
      )}

      {editSite && (
        <EditSiteModal
          site={editSite}
          users={users}
          onClose={() => setEditSite(null)}
          onSave={handleSaveSite}
        />
      )}
      {editPage && (
        <EditPageModal
          page={editPage}
          sites={sites}
          users={users}
          onClose={() => setEditPage(null)}
          onSave={handleSavePage}
        />
      )}
      {editParsed && (
        <EditParsedModal
          parsed={editParsed}
          pages={pages}
          users={users}
          onClose={() => setEditParsed(null)}
          onSave={handleSaveParsed}
        />
      )}
    </div>
  )
}

function AdminSitesTable({
  sites,
  onEdit,
  onSave,
  onDelete,
  users,
}: {
  sites: Site[]
  onEdit: (s: Site) => void
  onSave: (id: string, name: string, url: string, allowed_for: string[]) => Promise<void>
  onDelete: (id: string) => void
  users: UserPublic[]
}) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>URL</th>
            <th>Created by</th>
            <th>Allowed for</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td className="admin-cell-url">{s.url}</td>
              <td>{s.created_by_username ?? s.created_by ?? '—'}</td>
              <td>{[...new Set([s.created_by_username ?? s.created_by, ...(s.allowed_for_usernames ?? s.allowed_for ?? [])].filter(Boolean))].join(', ') || '—'}</td>
              <td>{s.updated_at ? s.updated_at.slice(0, 19) : '—'}</td>
              <td>
                <button type="button" className="admin-btn admin-btn-edit" onClick={() => onEdit(s)}>
                  Edit
                </button>
                <button type="button" className="admin-btn admin-btn-delete" onClick={() => onDelete(s.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sites.length === 0 && <p className="admin-empty">No sites.</p>}
    </div>
  )
}

function AdminPagesTable({
  pages,
  sites,
  onEdit,
  onSave,
  onDelete,
  users,
}: {
  pages: PageWithSite[]
  sites: Site[]
  onEdit: (p: PageWithSite) => void
  onSave: (id: string, title: string | null, url: string, site_id: string, allowed_for: string[]) => Promise<void>
  onDelete: (id: string) => void
  users: UserPublic[]
}) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>URL</th>
            <th>Site</th>
            <th>Created by</th>
            <th>Allowed for</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.id}>
              <td>{p.title || '—'}</td>
              <td className="admin-cell-url">{p.url}</td>
              <td>{p.site_name ?? p.site_id}</td>
              <td>{p.created_by_username ?? p.created_by ?? '—'}</td>
              <td>{[...new Set([p.created_by_username ?? p.created_by, ...(p.allowed_for_usernames ?? p.allowed_for ?? [])].filter(Boolean))].join(', ') || '—'}</td>
              <td>{p.updated_at ? p.updated_at.slice(0, 19) : '—'}</td>
              <td>
                <button type="button" className="admin-btn admin-btn-edit" onClick={() => onEdit(p)}>
                  Edit
                </button>
                <button type="button" className="admin-btn admin-btn-delete" onClick={() => onDelete(p.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pages.length === 0 && <p className="admin-empty">No pages.</p>}
    </div>
  )
}

function AdminParsedTable({
  parsed,
  pages,
  onEdit,
  onSave,
  onDelete,
  users,
}: {
  parsed: ParsedWithPage[]
  pages: PageWithSite[]
  onEdit: (p: ParsedWithPage) => void
  onSave: (
    id: string,
    page_id: string,
    name: string | null,
    data: string,
    info: string | null,
    is_verified: boolean,
    allowed_for: string[]
  ) => Promise<void>
  onDelete: (id: string) => void
  users: UserPublic[]
}) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Page</th>
            <th>Created by</th>
            <th>Allowed for</th>
            <th>Verified</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {parsed.map((p) => (
            <tr key={p.id}>
              <td>{p.name || '—'}</td>
              <td className="admin-cell-url">{p.page_title || p.page_url || p.page_id}</td>
              <td>{p.created_by_username ?? p.created_by ?? '—'}</td>
              <td>{[...new Set([p.created_by_username ?? p.created_by, ...(p.allowed_for_usernames ?? p.allowed_for ?? [])].filter(Boolean))].join(', ') || '—'}</td>
              <td>{p.is_verified ? 'Yes' : 'No'}</td>
              <td>{p.updated_at ? p.updated_at.slice(0, 19) : '—'}</td>
              <td>
                <button type="button" className="admin-btn admin-btn-edit" onClick={() => onEdit(p)}>
                  Edit
                </button>
                <button type="button" className="admin-btn admin-btn-delete" onClick={() => onDelete(p.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {parsed.length === 0 && <p className="admin-empty">No parsed records.</p>}
    </div>
  )
}

function EditSiteModal({
  site,
  users,
  onClose,
  onSave,
}: {
  site: Site
  users: UserPublic[]
  onClose: () => void
  onSave: (id: string, name: string, url: string, allowed_for: string[]) => Promise<void>
}) {
  const [name, setName] = useState(site.name)
  const [url, setUrl] = useState(site.url)
  const [allowed, setAllowed] = useState<string[]>(site.allowed_for ?? [])
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    setName(site.name)
    setUrl(site.url)
    setAllowed(site.allowed_for ?? [])
  }, [site.id, site.name, site.url, site.allowed_for])

  const toggleUser = (id: string) => {
    setAllowed((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(site.id, name.trim(), url.trim(), allowed)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Edit site</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            URL
            <input value={url} onChange={(e) => setUrl(e.target.value)} required />
          </label>
          <label>
            Allowed for (who has access)
            <div className="admin-checkbox-list">
              {users.filter((u) => !u.is_guest && u.role !== 'admin').map((u) => (
                <label key={u.id} className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={allowed.includes(u.id)}
                    onChange={() => toggleUser(u.id)}
                  />
                  {u.username}
                </label>
              ))}
            </div>
          </label>
          <div className="admin-modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditPageModal({
  page,
  sites,
  users,
  onClose,
  onSave,
}: {
  page: PageWithSite
  sites: Site[]
  users: UserPublic[]
  onClose: () => void
  onSave: (id: string, title: string | null, url: string, site_id: string, allowed_for: string[]) => Promise<void>
}) {
  const [title, setTitle] = useState(page.title ?? '')
  const [url, setUrl] = useState(page.url)
  const [site_id, setSiteId] = useState(page.site_id)
  const [allowed, setAllowed] = useState<string[]>(page.allowed_for ?? [])
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    setTitle(page.title ?? '')
    setUrl(page.url)
    setSiteId(page.site_id)
    setAllowed(page.allowed_for ?? [])
  }, [page.id, page.title, page.url, page.site_id, page.allowed_for])

  const toggleUser = (id: string) => {
    setAllowed((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(page.id, title.trim() || null, url.trim(), site_id, allowed)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Edit page</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            URL
            <input value={url} onChange={(e) => setUrl(e.target.value)} required />
          </label>
          <label>
            Site
            <select value={site_id} onChange={(e) => setSiteId(e.target.value)}>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Allowed for
            <div className="admin-checkbox-list">
              {users.filter((u) => !u.is_guest && u.role !== 'admin').map((u) => (
                <label key={u.id} className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={allowed.includes(u.id)}
                    onChange={() => toggleUser(u.id)}
                  />
                  {u.username}
                </label>
              ))}
            </div>
          </label>
          <div className="admin-modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditParsedModal({
  parsed,
  pages,
  users,
  onClose,
  onSave,
}: {
  parsed: ParsedWithPage
  pages: PageWithSite[]
  users: UserPublic[]
  onClose: () => void
  onSave: (
    id: string,
    page_id: string,
    name: string | null,
    data: string,
    info: string | null,
    is_verified: boolean,
    allowed_for: string[]
  ) => Promise<void>
}) {
  const [name, setName] = useState(parsed.name ?? '')
  const [page_id, setPageId] = useState(parsed.page_id)
  const [data, setData] = useState(parsed.data)
  const [info, setInfo] = useState(parsed.info ?? '')
  const [is_verified, setIsVerified] = useState(parsed.is_verified)
  const [allowed, setAllowed] = useState<string[]>(parsed.allowed_for ?? [])
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    setName(parsed.name ?? '')
    setPageId(parsed.page_id)
    setData(parsed.data)
    setInfo(parsed.info ?? '')
    setIsVerified(parsed.is_verified)
    setAllowed(parsed.allowed_for ?? [])
  }, [parsed.id, parsed.page_id, parsed.data, parsed.info, parsed.is_verified, parsed.allowed_for])

  const toggleUser = (id: string) => {
    setAllowed((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(parsed.id, page_id, name.trim() || null, data, info.trim() || null, is_verified, allowed)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal admin-modal-wide" onClick={(e) => e.stopPropagation()}>
        <h2>Edit parsed</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Page
            <select value={page_id} onChange={(e) => setPageId(e.target.value)}>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title || p.url}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data (JSON)
            <textarea value={data} onChange={(e) => setData(e.target.value)} rows={8} className="admin-textarea" />
          </label>
          <label>
            Info
            <input value={info} onChange={(e) => setInfo(e.target.value)} />
          </label>
          <label className="admin-checkbox">
            <input type="checkbox" checked={is_verified} onChange={(e) => setIsVerified(e.target.checked)} />
            Verified
          </label>
          <label>
            Allowed for
            <div className="admin-checkbox-list">
              {users.filter((u) => !u.is_guest && u.role !== 'admin').map((u) => (
                <label key={u.id} className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={allowed.includes(u.id)}
                    onChange={() => toggleUser(u.id)}
                  />
                  {u.username}
                </label>
              ))}
            </div>
          </label>
          <div className="admin-modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
