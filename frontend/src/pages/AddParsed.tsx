import { useState, useEffect } from 'react'
import {
  fetchPages,
  fetchParsed,
  createParsed,
  type PageWithSite,
  type ParsedWithPage,
} from '../api'

export function AddParsed() {
  const [pages, setPages] = useState<PageWithSite[]>([])
  const [list, setList] = useState<ParsedWithPage[]>([])
  const [pageId, setPageId] = useState<number | ''>('')
  const [name, setName] = useState('')
  const [dataJson, setDataJson] = useState('')
  const [info, setInfo] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [pagesData, parsedData] = await Promise.all([fetchPages(), fetchParsed()])
      setPages(pagesData)
      setList(parsedData)
      if (pagesData.length && pageId === '') setPageId(pagesData[0].id)
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
    if (pageId === '') {
      setError('Изберете страница')
      return
    }
    const trimmed = dataJson.trim()
    if (!trimmed) {
      setError('Въведете JSON (data_parsed)')
      return
    }
    try {
      JSON.parse(trimmed)
    } catch {
      setError('Невалиден JSON')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
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
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Грешка при запис')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="form-page">
      <h1>Добавяне на Parsed (JSON за сравнение)</h1>
      <p style={{ color: 'var(--editor-muted)', marginBottom: '1rem', fontSize: '0.9375rem' }}>
        Тук се пази JSON за сравнение на данни. Ако <strong>Data correct</strong> (is_verified) е
        отметнато, записът се счита за коректен референтен данни.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="parsed-page">Страница (статия)</label>
          <select
            id="parsed-page"
            value={pageId}
            onChange={(e) => setPageId(e.target.value === '' ? '' : Number(e.target.value))}
            required
          >
            <option value="">— Изберете страница —</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || p.url} {p.site_name ? `(${p.site_name})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="parsed-name">Име (по избор)</label>
          <input
            id="parsed-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Име на записа"
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
          <label htmlFor="parsed-info">Info (по избор)</label>
          <input
            id="parsed-info"
            type="text"
            value={info}
            onChange={(e) => setInfo(e.target.value)}
            placeholder="Допълнителна информация"
          />
        </div>
        <div className="form-group checkbox-row">
          <input
            id="parsed-verified"
            type="checkbox"
            checked={isVerified}
            onChange={(e) => setIsVerified(e.target.checked)}
          />
          <label htmlFor="parsed-verified">Data correct (is_verified) — референтни данни</label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? 'Записване…' : 'Добави Parsed'}
          </button>
        </div>
      </form>

      <section className="list-section">
        <h2>Съществуващи Parsed записи</h2>
        {loading ? (
          <p>Зареждане…</p>
        ) : list.length === 0 ? (
          <p>Няма добавени записи.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {list.map((r) => (
              <li key={r.id} className="list-item">
                <strong>{r.name || `Parsed #${r.id}`}</strong>
                {r.is_verified && (
                  <span style={{ marginLeft: '0.5rem', color: 'var(--editor-success)' }}>
                    ✓ Data correct
                  </span>
                )}
                <br />
                <small>
                  Страница: {r.page_title || r.page_url || r.page_id}
                </small>
                {r.info && (
                  <>
                    <br />
                    <small>{r.info}</small>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
