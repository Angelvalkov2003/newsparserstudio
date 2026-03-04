import { useState, useEffect } from 'react'
import { fetchSites, createSite, type Site as SiteType } from '../api'

export function AddSite() {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
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
    setError(null)
    setSubmitting(true)
    try {
      await createSite(name.trim(), url.trim())
      setName('')
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
      <h1>Добавяне на сайт</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="site-name">Име</label>
          <input
            id="site-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Име на сайта"
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
            {submitting ? 'Записване…' : 'Добави сайт'}
          </button>
        </div>
      </form>

      <section className="list-section">
        <h2>Съществуващи сайтове</h2>
        {loading ? (
          <p>Зареждане…</p>
        ) : list.length === 0 ? (
          <p>Няма добавени сайтове.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {list.map((s) => (
              <li key={s.id} className="list-item">
                <strong>{s.name}</strong>
                <br />
                <small>{s.url}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
