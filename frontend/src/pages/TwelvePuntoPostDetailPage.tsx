import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchTwelvePuntoPost, loadTwelvePuntoPostDetailWithFallback } from '../twelvePuntoApi'
import { importBulk } from '../api'
import { useIsAdmin } from '../context'
import { refreshSidebar } from '../utils/sidebarRefresh'
import { buildImportBulkPayloadFromTwelvePuntoPost } from '../utils/twelvePuntoImport'
import './TwelvePuntoPage.css'

export function TwelvePuntoPostDetailPage() {
  const isAdmin = useIsAdmin()
  const { postId } = useParams<{ postId: string }>()
  const [data, setData] = useState<unknown>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [queryHint, setQueryHint] = useState<string>('')
  const [loadMode, setLoadMode] = useState<'full' | 'light' | null>(null)
  const [degradedExplanation, setDegradedExplanation] = useState<string | null>(null)
  const [fullFailureSnippet, setFullFailureSnippet] = useState<string | null>(null)

  const [fullRetryLoading, setFullRetryLoading] = useState(false)
  const [fullRetryError, setFullRetryError] = useState<string | null>(null)

  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin || !postId?.trim()) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    setImportMessage(null)
    setImportError(null)
    setLoadMode(null)
    setDegradedExplanation(null)
    setFullFailureSnippet(null)
    setFullRetryError(null)
    setQueryHint('')
    void (async () => {
      try {
        const result = await loadTwelvePuntoPostDetailWithFallback(postId.trim())
        if (cancelled) return
        if (result.kind === 'error') {
          setError(result.message)
          setData(undefined)
          return
        }
        setData(result.data)
        if (result.mode === 'full') {
          setLoadMode('full')
          setQueryHint(`GET /posts/${postId}?projection=detail`)
          setDegradedExplanation(null)
          setFullFailureSnippet(null)
        } else {
          setLoadMode('light')
          setQueryHint(result.queryLabel)
          setDegradedExplanation(result.degradedExplanation)
          setFullFailureSnippet(result.fullFailureSnippet)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load post')
          setData(undefined)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAdmin, postId])

  const handleRetryFullDetail = useCallback(async () => {
    if (!postId?.trim()) return
    setFullRetryLoading(true)
    setFullRetryError(null)
    try {
      const json = await fetchTwelvePuntoPost(postId.trim(), { projection: 'detail' })
      setData(json)
      setLoadMode('full')
      setQueryHint(`GET /posts/${postId}?projection=detail`)
      setDegradedExplanation(null)
      setFullFailureSnippet(null)
    } catch (e) {
      setFullRetryError(e instanceof Error ? e.message : 'Full detail still failed')
    } finally {
      setFullRetryLoading(false)
    }
  }, [postId])

  const handleImportToStudio = useCallback(async () => {
    if (data == null || typeof data !== 'object' || Array.isArray(data)) return
    setImporting(true)
    setImportMessage(null)
    setImportError(null)
    try {
      const payload = buildImportBulkPayloadFromTwelvePuntoPost(data as Record<string, unknown>)
      const res = await importBulk(payload)
      const parts = [
        res.sites_created ? `sites created: ${res.sites_created}` : null,
        res.sites_matched ? `sites matched: ${res.sites_matched}` : null,
        res.pages_created ? `pages created: ${res.pages_created}` : null,
        res.pages_matched ? `pages matched: ${res.pages_matched}` : null,
        res.parsed_created ? `parsed created: ${res.parsed_created}` : null,
      ].filter(Boolean)
      setImportMessage(parts.length ? `Done · ${parts.join(', ')}` : 'Done.')
      if (res.errors?.length) {
        setImportError(res.errors.join(' · '))
      }
      refreshSidebar()
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }, [data])

  if (!isAdmin) {
    return (
      <div className="twelve-punto-page">
        <p className="twelve-punto-forbidden">Admin only.</p>
      </div>
    )
  }

  return (
    <div className="twelve-punto-page">
      <p className="twelve-punto-back">
        <Link to="/12punto">← Back to list</Link>
      </p>
      <h1 className="twelve-punto-title">12punto · Post</h1>
      <p className="twelve-punto-hint">
        <code>{queryHint || `GET /posts/${postId ?? '…'}?projection=detail`}</code>
      </p>

      {!loading && !error && loadMode === 'light' && degradedExplanation && (
        <div className="twelve-punto-degraded-banner">
          <p className="twelve-punto-degraded-title">Reduced load</p>
          <p className="twelve-punto-degraded-text">{degradedExplanation}</p>
          {fullFailureSnippet ? (
            <details className="twelve-punto-degraded-details">
              <summary>Why full detail failed (API message)</summary>
              <pre className="twelve-punto-degraded-pre">{fullFailureSnippet}</pre>
            </details>
          ) : null}
          <div className="twelve-punto-detail-actions twelve-punto-detail-actions--banner">
            <button
              type="button"
              className="secondary"
              disabled={fullRetryLoading}
              onClick={() => void handleRetryFullDetail()}
            >
              {fullRetryLoading ? 'Loading full detail…' : 'Retry full detail'}
            </button>
            {fullRetryError ? <div className="twelve-punto-error twelve-punto-inline-error">{fullRetryError}</div> : null}
          </div>
        </div>
      )}

      {!loading && !error && data !== undefined && (
        <div className="twelve-punto-import-row">
          <button
            type="button"
            className="twelve-punto-import-btn"
            disabled={importing}
            onClick={() => void handleImportToStudio()}
          >
            {importing ? 'Import…' : 'Import'}
          </button>
          <span className="twelve-punto-import-hint">
            Upserts site from <code>source_id</code> origin, page from full URL, inserts a new <code>parsed</code> row
            with title, metadata, and components from <code>content</code>.
          </span>
        </div>
      )}
      {importMessage && <div className="twelve-punto-import-success">{importMessage}</div>}
      {importError && <div className="twelve-punto-error">{importError}</div>}

      {loading && <div className="twelve-punto-loading">Loading…</div>}
      {error && <div className="twelve-punto-error">{error}</div>}

      {!loading && !error && data !== undefined && (
        <pre className="twelve-punto-post-json">{JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  )
}
