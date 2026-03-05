import { useState, useRef } from 'react'
import { importBulk, type ImportBulkResult } from '../api'
import { refreshSidebar } from '../utils/sidebarRefresh'
import '../components/Layout.css'

const EXAMPLE = {
  sites: [
    {
      name: 'Example Site',
      url: 'https://example.com',
      pages: [
        {
          title: 'Example Article',
          url: 'https://example.com/article-1',
          parsed: [
            {
              name: 'First parse',
              data: { metadata: { title: 'Article' }, components: [] },
              info: null,
              is_verified: false,
            },
          ],
        },
      ],
    },
  ],
}

export function ImportBulk() {
  const [result, setResult] = useState<ImportBulkResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setResult(null)
    setLoading(true)
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result
      if (typeof text !== 'string') {
        setError('File could not be read.')
        setLoading(false)
        return
      }
      try {
        const json = JSON.parse(text)
        const sites = json.sites
        if (!Array.isArray(sites)) {
          setError('JSON must have a "sites" array.')
          setLoading(false)
          return
        }
        importBulk({ sites })
          .then((res) => {
            setResult(res)
            refreshSidebar()
          })
          .catch((err) => {
            setError(err instanceof Error ? err.message : 'Import failed')
          })
          .finally(() => setLoading(false))
      } catch {
        setError('Invalid JSON.')
        setLoading(false)
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleSelectFile = () => {
    setError(null)
    setResult(null)
    inputRef.current?.click()
  }

  return (
    <div className="form-page">
      <h1>Import bulk</h1>
      <p style={{ color: 'var(--editor-muted)', marginBottom: '1rem', fontSize: '0.9375rem' }}>
        Upload a JSON file with <strong>sites</strong> (each with <strong>pages</strong>, each with{' '}
        <strong>parsed</strong>). Sites are matched by <code>url</code> (create if missing). Pages
        are matched by <code>url</code> within the site. Parsed are matched by <code>name</code> within
        the page (same name → overwrite; otherwise create new).
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }}
        aria-label="Choose JSON file"
      />
      <div className="form-actions">
        <button
          type="button"
          className="primary"
          onClick={handleSelectFile}
          disabled={loading}
        >
          {loading ? 'Importing…' : 'Choose JSON file'}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
      {result && (
        <section className="list-section" style={{ marginTop: '1.5rem' }}>
          <h2>Result</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li>Sites created: {result.sites_created}</li>
            <li>Sites matched: {result.sites_matched}</li>
            <li>Pages created: {result.pages_created}</li>
            <li>Pages matched: {result.pages_matched}</li>
            <li>Parsed created: {result.parsed_created}</li>
            <li>Parsed updated: {result.parsed_updated}</li>
          </ul>
          {result.errors.length > 0 && (
            <>
              <h3 style={{ marginTop: '1rem', fontSize: '1rem' }}>Errors</h3>
              <ul className="form-error" style={{ marginTop: '0.5rem' }}>
                {result.errors.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
      <details style={{ marginTop: '2rem' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 500 }}>Example JSON format</summary>
        <pre
          style={{
            marginTop: '0.5rem',
            padding: '1rem',
            background: 'var(--editor-input-bg)',
            borderRadius: 8,
            overflow: 'auto',
            fontSize: '0.8125rem',
          }}
        >
          {JSON.stringify(EXAMPLE, null, 2)}
        </pre>
      </details>
    </div>
  )
}
