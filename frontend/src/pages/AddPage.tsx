import { useState, useEffect } from 'react'
import { fetchSites, fetchPages, createPage, type Site, type PageWithSite } from '../api'

export function AddPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [list, setList] = useState<PageWithSite[]>([])
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [siteId, setSiteId] = useState<number | ''>('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [sitesData, pagesData] = await Promise.all([fetchSites(), fetchPages()])
      setSites(sitesData)
      setList(pagesData)
      if (sitesData.length && siteId === '') setSiteId(sitesData[0].id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Грешка при зареждане')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (siteId === '') {
      setError('Изберете сайт')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await createPage(title.trim() || null, url.trim(), Number(siteId))
      setTitle('')
      setUrl('')
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Грешка при запис')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="form-page">
      <h1>Добавяне на страница (статия)</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="page-site">Сайт</label>
          <select
            id="page-site"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value === '' ? '' : Number(e.target.value))}
            required
          >
            <option value="">— Изберете сайт —</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="page-title">Заглавие (по избор)</label>
          <input
            id="page-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Заглавие на статията"
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
            {submitting ? 'Записване…' : 'Добави страница'}
          </button>
        </div>
      </form>

      <section className="list-section">
        <h2>Съществуващи страници (статии)</h2>
        {loading ? (
          <p>Зареждане…</p>
        ) : list.length === 0 ? (
          <p>Няма добавени страници.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {list.map((p) => (
              <li key={p.id} className="list-item">
                <strong>{p.title || p.url}</strong>
                {p.site_name && <><br /><small>Сайт: {p.site_name}</small></>}
                <br />
                <small>{p.url}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
