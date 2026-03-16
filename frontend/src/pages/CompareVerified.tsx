import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsAdmin } from '../context'
import { fetchSites, fetchPages, fetchParsed, getParsed, type Site, type PageWithSite, type ParsedWithPage } from '../api'
import { CorrectedPreview } from '../components/preview/CorrectedPreview'
import { parseDataParsedLike } from '../components/editor/UploadArticleButton'
import type { ArticleDataCorrected } from '../types'
import './CompareVerified.css'

export function CompareVerifiedPage() {
  const isAdmin = useIsAdmin()
  const navigate = useNavigate()

  const [sites, setSites] = useState<Site[]>([])
  const [pages, setPages] = useState<PageWithSite[]>([])
  const [parsed, setParsed] = useState<ParsedWithPage[]>([])

  const [siteId, setSiteId] = useState<string>('')
  const [pageId, setPageId] = useState<string>('')

  const [leftId, setLeftId] = useState<string>('')
  const [rightId, setRightId] = useState<string>('')

  const [leftData, setLeftData] = useState<ArticleDataCorrected | null>(null)
  const [rightData, setRightData] = useState<ArticleDataCorrected | null>(null)

  const [loadingSites, setLoadingSites] = useState(false)
  const [loadingPages, setLoadingPages] = useState(false)
  const [loadingParsed, setLoadingParsed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin) {
      navigate('/')
      return
    }
    setLoadingSites(true)
    fetchSites()
      .then((s) => setSites(s))
      .catch(() => setError('Failed to load sites'))
      .finally(() => setLoadingSites(false))
  }, [isAdmin, navigate])

  useEffect(() => {
    if (!siteId) {
      setPages([])
      setPageId('')
      setParsed([])
      setLeftId('')
      setRightId('')
      setLeftData(null)
      setRightData(null)
      return
    }
    setLoadingPages(true)
    fetchPages(siteId)
      .then((p) => setPages(p))
      .catch(() => setError('Failed to load pages'))
      .finally(() => setLoadingPages(false))
  }, [siteId])

  useEffect(() => {
    if (!pageId) {
      setParsed([])
      setLeftId('')
      setRightId('')
      setLeftData(null)
      setRightData(null)
      return
    }
    setLoadingParsed(true)
    fetchParsed(pageId)
      .then((items) => setParsed(items ?? []))
      .catch(() => setError('Failed to load parsed records'))
      .finally(() => setLoadingParsed(false))
  }, [pageId])

  const verifiedList = useMemo(
    () => parsed.filter((p) => p.is_verified),
    [parsed]
  )

  useEffect(() => {
    if (!leftId) {
      setLeftData(null)
      return
    }
    getParsed(leftId)
      .then((p) => {
        try {
          const raw = JSON.parse(p.data)
          const parsedLike = parseDataParsedLike(raw)
          if (parsedLike) {
            setLeftData({ metadata: parsedLike.metadata, components: parsedLike.components })
          } else {
            setLeftData(null)
          }
        } catch {
          setLeftData(null)
        }
      })
      .catch(() => setLeftData(null))
  }, [leftId])

  useEffect(() => {
    if (!rightId) {
      setRightData(null)
      return
    }
    getParsed(rightId)
      .then((p) => {
        try {
          const raw = JSON.parse(p.data)
          const parsedLike = parseDataParsedLike(raw)
          if (parsedLike) {
            setRightData({ metadata: parsedLike.metadata, components: parsedLike.components })
          } else {
            setRightData(null)
          }
        } catch {
          setRightData(null)
        }
      })
      .catch(() => setRightData(null))
  }, [rightId])

  if (!isAdmin) {
    return null
  }

  return (
    <div className="compare-page">
      <header className="compare-header">
        <h1>Compare Verified</h1>
        <p className="compare-subtitle">
          Pick a site and page, then choose two verified versions (from any users) to compare side by side in read-only mode.
        </p>
      </header>

      {error && (
        <p className="compare-error" role="alert">
          {error}
        </p>
      )}

      <section className="compare-controls">
        <div className="compare-row">
          <label>
            <span>Site</span>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              disabled={loadingSites}
            >
              <option value="">Select site…</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Page</span>
            <select
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              disabled={loadingPages || !siteId}
            >
              <option value="">Select page…</option>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title || p.url}
                </option>
              ))}
            </select>
          </label>

          <div className="compare-info">
            {loadingParsed
              ? 'Loading verified…'
              : pageId && verifiedList.length === 0
              ? 'No verified versions for this page yet.'
              : ''}
          </div>
        </div>

        <div className="compare-row compare-row--selectors">
          <label>
            <span>Left verified</span>
            <select
              value={leftId}
              onChange={(e) => setLeftId(e.target.value)}
              disabled={!pageId || verifiedList.length === 0}
            >
              <option value="">Select verified…</option>
              {verifiedList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || `#${p.id}`}
                  {p.created_by_username && ` · ${p.created_by_username}`}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Right verified</span>
            <select
              value={rightId}
              onChange={(e) => setRightId(e.target.value)}
              disabled={!pageId || verifiedList.length === 0}
            >
              <option value="">Select verified…</option>
              {verifiedList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || `#${p.id}`}
                  {p.created_by_username && ` · ${p.created_by_username}`}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="compare-previews">
        <div className="compare-column">
          {leftData ? (
            <CorrectedPreview data={leftData} readOnly />
          ) : (
            <p className="compare-placeholder">Select a verified version on the left.</p>
          )}
        </div>
        <div className="compare-column">
          {rightData ? (
            <CorrectedPreview data={rightData} readOnly />
          ) : (
            <p className="compare-placeholder">Select a verified version on the right.</p>
          )}
        </div>
      </section>
    </div>
  )
}

