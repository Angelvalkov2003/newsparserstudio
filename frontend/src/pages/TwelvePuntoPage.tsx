import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getTwelvePuntoBulkImportJob,
  startTwelvePuntoBulkImport,
  type TwelvePuntoBulkImportJobStatus,
} from '../api'
import { TwelvePuntoBulkImportModal } from '../components/TwelvePuntoBulkImportModal'
import { TwelvePuntoBulkToolbar } from '../components/TwelvePuntoBulkToolbar'
import {
  fetchTwelvePuntoFeeds,
  fetchTwelvePuntoPosts,
  parseTwelvePuntoPostsResponse,
  resolveTwelvePuntoPostPathId,
  type TwelvePuntoPost,
  type TwelvePuntoPostsListParams,
  type TwelvePuntoSortDirection,
  type TwelvePuntoSortField,
} from '../twelvePuntoApi'
import { useIsAdmin } from '../context'
import { refreshSidebar } from '../utils/sidebarRefresh'
import './TwelvePuntoPage.css'

const FEED_TYPE_OPTIONS = [
  'Website',
  'RSSFeed',
  'EmailInbox',
  'GDELTFeed',
  'TwitterAccount',
  'WhatsAppNumber',
  'YouTubeChannel',
]

const PAGE_SIZE = 20

const DEFAULT_POSTS_QUERY: Pick<
  TwelvePuntoPostsListParams,
  'sort_field' | 'sort_direction' | 'limit' | 'projection'
> = {
  sort_field: 'created_at',
  sort_direction: 'desc',
  limit: PAGE_SIZE,
  projection: 'list',
}

function localDatetimeInputToUtcIso(value: string): string | null {
  if (!value?.trim()) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function formatCategories(c: unknown): string {
  if (c == null) return '—'
  if (Array.isArray(c)) return c.length ? c.map(String).join(', ') : '—'
  if (typeof c === 'object') return JSON.stringify(c)
  return String(c)
}

function formatDt(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

type ReadyFilter = 'default' | 'true' | 'false'

export function TwelvePuntoPage() {
  const isAdmin = useIsAdmin()
  const navigate = useNavigate()

  const [sortField, setSortField] = useState<TwelvePuntoSortField>('created_at')
  const [sortDirection, setSortDirection] = useState<TwelvePuntoSortDirection>('desc')
  const [readyFilter, setReadyFilter] = useState<ReadyFilter>('default')
  const [feedTypesSelected, setFeedTypesSelected] = useState<Set<string>>(new Set())
  const [feedNamesText, setFeedNamesText] = useState('')
  const [publishedMin, setPublishedMin] = useState('')
  const [publishedMax, setPublishedMax] = useState('')
  const [createdMin, setCreatedMin] = useState('')
  const [createdMax, setCreatedMax] = useState('')

  const [posts, setPosts] = useState<TwelvePuntoPost[]>([])
  const [nextCursorAfterPage, setNextCursorAfterPage] = useState<(string | null)[]>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedSuggestions, setFeedSuggestions] = useState<{ name: string; type?: string | null }[]>([])

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [bulkImporting, setBulkImporting] = useState(false)
  const [bulkBusyLabel, setBulkBusyLabel] = useState<string | null>(null)
  const [bulkImportModalOpen, setBulkImportModalOpen] = useState(false)
  const [bulkImportJob, setBulkImportJob] = useState<TwelvePuntoBulkImportJobStatus | null>(null)
  const [bulkImportOrderedIds, setBulkImportOrderedIds] = useState<string[]>([])
  const headerSelectAllRef = useRef<HTMLInputElement>(null)

  const feedNamesList = useMemo(
    () =>
      feedNamesText
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [feedNamesText]
  )

  const buildParams = useCallback(
    (cursor: string | null | undefined) => {
      const published_at_min = localDatetimeInputToUtcIso(publishedMin)
      const published_at_max = localDatetimeInputToUtcIso(publishedMax)
      const created_at_min = localDatetimeInputToUtcIso(createdMin)
      const created_at_max = localDatetimeInputToUtcIso(createdMax)
      let ready: boolean | null = null
      if (readyFilter === 'true') ready = true
      else if (readyFilter === 'false') ready = false
      return {
        feed_types: feedTypesSelected.size ? Array.from(feedTypesSelected) : undefined,
        feed_names: feedNamesList.length ? feedNamesList : undefined,
        ready,
        published_at_min,
        published_at_max,
        created_at_min,
        created_at_max,
        sort_field: sortField,
        sort_direction: sortDirection,
        limit: PAGE_SIZE,
        cursor: cursor || undefined,
        projection: 'list' as const,
      }
    },
    [
      createdMax,
      createdMin,
      feedNamesList,
      feedTypesSelected,
      publishedMax,
      publishedMin,
      readyFilter,
      sortDirection,
      sortField,
    ]
  )

  const fetchAt = useCallback(
    async (cursor: string | null, targetPageIndex: number) => {
      if (!isAdmin) return
      setLoading(true)
      setError(null)
      try {
        const raw = await fetchTwelvePuntoPosts(buildParams(cursor))
        const { posts: list, next_cursor } = parseTwelvePuntoPostsResponse(raw)
        setPosts(list)
        setPageIndex(targetPageIndex)
        setNextCursorAfterPage((prev) => {
          if (targetPageIndex === 0) return [next_cursor]
          const next = [...prev]
          next[targetPageIndex] = next_cursor
          return next
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load posts')
        setPosts([])
      } finally {
        setLoading(false)
      }
    },
    [buildParams, isAdmin]
  )

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    fetchTwelvePuntoFeeds()
      .then((feeds) => {
        if (cancelled) return
        const mapped = feeds.map((f) => ({
          name: (f.name ?? f.id ?? f.feed_id ?? '').trim(),
          type: f.feed_type ?? f.type ?? null,
        }))
        setFeedSuggestions(mapped.filter((x) => x.name))
      })
      .catch(() => {
        if (!cancelled) setFeedSuggestions([])
      })
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const raw = await fetchTwelvePuntoPosts({ ...DEFAULT_POSTS_QUERY })
        if (cancelled) return
        const { posts: list, next_cursor } = parseTwelvePuntoPostsResponse(raw)
        setPosts(list)
        setPageIndex(0)
        setNextCursorAfterPage([next_cursor])
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load posts')
          setPosts([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  const toggleFeedType = (t: string) => {
    setFeedTypesSelected((prev) => {
      const n = new Set(prev)
      if (n.has(t)) n.delete(t)
      else n.add(t)
      return n
    })
  }

  const handleApply = () => {
    void fetchAt(null, 0)
  }

  const handleResetFilters = () => {
    setSortField('created_at')
    setSortDirection('desc')
    setReadyFilter('default')
    setFeedTypesSelected(new Set())
    setFeedNamesText('')
    setPublishedMin('')
    setPublishedMax('')
    setCreatedMin('')
    setCreatedMax('')
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const raw = await fetchTwelvePuntoPosts({ ...DEFAULT_POSTS_QUERY })
        const { posts: list, next_cursor } = parseTwelvePuntoPostsResponse(raw)
        setPosts(list)
        setPageIndex(0)
        setNextCursorAfterPage([next_cursor])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load posts')
        setPosts([])
      } finally {
        setLoading(false)
      }
    })()
  }

  const canGoNext = Boolean(nextCursorAfterPage[pageIndex])
  const canGoPrev = pageIndex > 0

  const handleNext = () => {
    if (!canGoNext || loading) return
    const c = nextCursorAfterPage[pageIndex]
    if (c) void fetchAt(c, pageIndex + 1)
  }

  const handlePrev = () => {
    if (!canGoPrev || loading) return
    const target = pageIndex - 1
    const c = target === 0 ? null : nextCursorAfterPage[target - 1] ?? null
    void fetchAt(c, target)
  }

  const selectableOnPage = useMemo(
    () =>
      posts
        .map((p) => resolveTwelvePuntoPostPathId(p))
        .filter((id): id is string => Boolean(id)),
    [posts]
  )

  const allOnPageSelected =
    selectableOnPage.length > 0 && selectableOnPage.every((id) => selectedIds.has(id))
  const someOnPageSelected = selectableOnPage.some((id) => selectedIds.has(id))

  useEffect(() => {
    const el = headerSelectAllRef.current
    if (!el) return
    el.indeterminate = someOnPageSelected && !allOnPageSelected
  }, [someOnPageSelected, allOnPageSelected])

  const toggleSelectedId = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }, [])

  const handleHeaderSelectAllPage = useCallback(() => {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (allOnPageSelected) {
        for (const id of selectableOnPage) n.delete(id)
      } else {
        for (const id of selectableOnPage) n.add(id)
      }
      return n
    })
  }, [allOnPageSelected, selectableOnPage])

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleBulkImport = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    setBulkImporting(true)
    setBulkBusyLabel('Starting…')
    setBulkImportOrderedIds(ids)
    setBulkImportJob(null)
    setBulkImportModalOpen(true)
    try {
      const { job_id } = await startTwelvePuntoBulkImport(ids)
      let last = await getTwelvePuntoBulkImportJob(job_id)
      setBulkImportJob(last)
      for (;;) {
        const st = last.status
        if (st === 'completed' || st === 'failed') break
        const total = last.total ?? ids.length
        const done = last.progress_done ?? 0
        setBulkBusyLabel(`${done}/${total}…`)
        await new Promise((r) => setTimeout(r, 900))
        last = await getTwelvePuntoBulkImportJob(job_id)
        setBulkImportJob(last)
      }
      setBulkImportJob(last)
      if (last.status !== 'failed') {
        refreshSidebar()
      }
    } catch (e) {
      setBulkImportJob({
        job_id: '',
        status: 'failed',
        total: ids.length,
        progress_done: null,
        error: e instanceof Error ? e.message : 'Bulk import failed',
      })
    } finally {
      setBulkImporting(false)
      setBulkBusyLabel(null)
    }
  }, [selectedIds])

  if (!isAdmin) {
    return (
      <div className="twelve-punto-page">
        <p className="twelve-punto-forbidden">Admin only.</p>
      </div>
    )
  }

  return (
    <div className="twelve-punto-page">
      <h1 className="twelve-punto-title">12punto</h1>
      <p className="twelve-punto-hint">
        Latest posts from the Twelve Punto API (<code>GET /posts</code>), {PAGE_SIZE} per page, cursor pagination.
      </p>

      <div className="twelve-punto-filters">
        <div className="twelve-punto-filters-row">
          <label>
            Sort field
            <select value={sortField} onChange={(e) => setSortField(e.target.value as TwelvePuntoSortField)}>
              <option value="created_at">created_at</option>
              <option value="published_at">published_at</option>
            </select>
          </label>
          <label>
            Direction
            <select
              value={sortDirection}
              onChange={(e) => setSortDirection(e.target.value as TwelvePuntoSortDirection)}
            >
              <option value="desc">desc</option>
              <option value="asc">asc</option>
            </select>
          </label>
          <label>
            Ready
            <select value={readyFilter} onChange={(e) => setReadyFilter(e.target.value as ReadyFilter)}>
              <option value="default">Default (API)</option>
              <option value="true">Ready only</option>
              <option value="false">Not ready</option>
            </select>
          </label>
        </div>

        <div className="twelve-punto-chip-row">
          <span>Feed types:</span>
          {FEED_TYPE_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              className={`twelve-punto-chip${feedTypesSelected.has(t) ? ' on' : ''}`}
              onClick={() => toggleFeedType(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="twelve-punto-filters-row">
          <label style={{ flex: '1 1 14rem', minWidth: '12rem' }}>
            Feed names (comma-separated)
            <input
              type="text"
              value={feedNamesText}
              onChange={(e) => setFeedNamesText(e.target.value)}
              placeholder={feedSuggestions.length ? 'e.g. name from /feeds' : 'Filter by feed name'}
              list="twelve-punto-feed-names"
            />
            <datalist id="twelve-punto-feed-names">
              {feedSuggestions.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.type ?? ''}
                </option>
              ))}
            </datalist>
          </label>
        </div>

        <div className="twelve-punto-filters-row">
          <label>
            Published ≥ (local → UTC)
            <input
              type="datetime-local"
              value={publishedMin}
              onChange={(e) => setPublishedMin(e.target.value)}
            />
          </label>
          <label>
            Published ≤
            <input
              type="datetime-local"
              value={publishedMax}
              onChange={(e) => setPublishedMax(e.target.value)}
            />
          </label>
          <label>
            Created ≥
            <input type="datetime-local" value={createdMin} onChange={(e) => setCreatedMin(e.target.value)} />
          </label>
          <label>
            Created ≤
            <input type="datetime-local" value={createdMax} onChange={(e) => setCreatedMax(e.target.value)} />
          </label>
        </div>

        <div className="twelve-punto-filters-actions">
          <button type="button" onClick={handleApply} disabled={loading || bulkImporting}>
            Apply filters
          </button>
          <button type="button" className="secondary" onClick={handleResetFilters} disabled={loading || bulkImporting}>
            Reset
          </button>
        </div>
      </div>

      {error && <div className="twelve-punto-error">{error}</div>}
      {loading && <div className="twelve-punto-loading">Loading…</div>}

      {!loading && !error && posts.length === 0 && (
        <p className="twelve-punto-empty">No posts match the current filters.</p>
      )}

      {posts.length > 0 && (
        <>
          <div className="twelve-punto-table-wrap">
            <table className="twelve-punto-table">
              <thead>
                <tr>
                  <th className="twelve-punto-col-select">
                    <input
                      ref={headerSelectAllRef}
                      type="checkbox"
                      disabled={!selectableOnPage.length || bulkImporting}
                      checked={allOnPageSelected && selectableOnPage.length > 0}
                      onChange={handleHeaderSelectAllPage}
                      title="Select all on this page"
                      aria-label="Select all on this page"
                    />
                  </th>
                  <th>Title</th>
                  <th>Feed</th>
                  <th>Type</th>
                  <th>Published</th>
                  <th>Created</th>
                  <th>Ready</th>
                  <th>Categories</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p, i) => {
                  const pathId = resolveTwelvePuntoPostPathId(p)
                  const rowKey = p.id ?? p.db_id ?? p.source_id ?? `${pageIndex}-${i}`
                  const canSelect = Boolean(pathId)
                  const isSelected = pathId ? selectedIds.has(pathId) : false
                  return (
                  <tr
                    key={rowKey}
                    className={pathId ? 'twelve-punto-row-clickable' : undefined}
                    tabIndex={pathId ? 0 : undefined}
                    onClick={() => {
                      if (pathId) navigate(`/12punto/post/${encodeURIComponent(pathId)}`)
                    }}
                    onKeyDown={(e) => {
                      if (!pathId) return
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/12punto/post/${encodeURIComponent(pathId)}`)
                      }
                    }}
                  >
                    <td
                      className="twelve-punto-col-select"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {canSelect ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={bulkImporting}
                          onChange={() => pathId && toggleSelectedId(pathId)}
                          title="Select row"
                          aria-label={`Select post ${pathId}`}
                        />
                      ) : (
                        <span className="twelve-punto-bulk-muted">—</span>
                      )}
                    </td>
                    <td className="cell-title">{p.title?.trim() || '—'}</td>
                    <td>{p.feed_name ?? '—'}</td>
                    <td>{p.feed_type ?? '—'}</td>
                    <td>{formatDt(p.published_at)}</td>
                    <td>{formatDt(p.created_at)}</td>
                    <td>{p.ready === undefined ? '—' : p.ready ? 'yes' : 'no'}</td>
                    <td className="cell-cats">{formatCategories(p.categories)}</td>
                    <td>
                      <code style={{ fontSize: '0.75rem' }}>{p.id ?? p.db_id ?? p.source_id ?? '—'}</code>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="twelve-punto-pager">
            <button type="button" disabled={!canGoPrev || loading || bulkImporting} onClick={handlePrev}>
              Previous
            </button>
            <button type="button" disabled={!canGoNext || loading || bulkImporting} onClick={handleNext}>
              Next
            </button>
            <span>
              Page {pageIndex + 1}
              {posts.length ? ` · ${posts.length} posts` : ''}
            </span>
          </div>

          <TwelvePuntoBulkToolbar
            selectedCount={selectedIds.size}
            busy={bulkImporting}
            busyLabel={bulkBusyLabel}
            onClear={handleClearSelection}
            onBulkImport={() => void handleBulkImport()}
          />
        </>
      )}

      <TwelvePuntoBulkImportModal
        open={bulkImportModalOpen}
        onClose={() => setBulkImportModalOpen(false)}
        job={bulkImportJob}
        orderedPostIds={bulkImportOrderedIds}
        onRetryImported={refreshSidebar}
      />
    </div>
  )
}
