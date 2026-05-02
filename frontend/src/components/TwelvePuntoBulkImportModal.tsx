import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  retryTwelvePuntoImportOne,
  type TwelvePuntoBulkImportJobStatus,
  type TwelvePuntoBulkImportRow,
} from '../api'

export type TwelvePuntoBulkImportModalProps = {
  open: boolean
  onClose: () => void
  job: TwelvePuntoBulkImportJobStatus | null
  orderedPostIds: string[]
  /** Called after a retry successfully imports new parsed content (refresh sidebar). */
  onRetryImported?: () => void
}

function cellTitle(row: { title?: string | null }) {
  const t = row.title?.trim()
  return t || '—'
}

function metaFromJob(job: TwelvePuntoBulkImportJobStatus | null, postId: string): TwelvePuntoBulkImportRow | null {
  const rows = job?.post_rows
  if (!rows?.length) return null
  return rows.find((r) => r.post_id === postId) ?? null
}

export function TwelvePuntoBulkImportModal({
  open,
  onClose,
  job,
  orderedPostIds,
  onRetryImported,
}: TwelvePuntoBulkImportModalProps) {
  const [hiddenFailedIds, setHiddenFailedIds] = useState<Set<string>>(() => new Set())
  const [extraSucceeded, setExtraSucceeded] = useState<TwelvePuntoBulkImportRow[]>([])
  const [errorOverrides, setErrorOverrides] = useState<Record<string, string>>({})
  const [retryingIds, setRetryingIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    if (!open) return
    setHiddenFailedIds(new Set())
    setExtraSucceeded([])
    setErrorOverrides({})
    setRetryingIds(new Set())
  }, [open, job?.job_id])

  const status = job?.status ?? null
  const total = job?.total ?? orderedPostIds.length ?? 0
  const done = job?.progress_done ?? 0
  const r = job?.results

  const succeeded = useMemo(() => {
    const base = r?.succeeded_rows ?? []
    const merged = [...base, ...extraSucceeded]
    const seen = new Set<string>()
    const out: TwelvePuntoBulkImportRow[] = []
    for (const row of merged) {
      if (seen.has(row.post_id)) continue
      seen.add(row.post_id)
      out.push(row)
    }
    return out
  }, [r?.succeeded_rows, extraSucceeded])

  const skipped = useMemo(() => {
    const base = r?.skipped_rows ?? []
    const seen = new Set<string>()
    const out: TwelvePuntoBulkImportRow[] = []
    for (const row of base) {
      if (seen.has(row.post_id)) continue
      seen.add(row.post_id)
      out.push(row)
    }
    return out
  }, [r?.skipped_rows])

  const failed = useMemo(() => {
    const raw = r?.failed_rows ?? []
    return raw
      .filter((row) => !hiddenFailedIds.has(row.post_id))
      .map((row) => ({
        ...row,
        error: errorOverrides[row.post_id] ?? row.error,
      }))
  }, [r?.failed_rows, hiddenFailedIds, errorOverrides])

  const waitingIds =
    !job || status === 'queued' || status === 'running' ? orderedPostIds.slice(done) : []

  const showWaiting =
    (!job || status === 'queued' || status === 'running') && waitingIds.length > 0

  const showLoadingOverlay =
    open &&
    (!job ||
      ((status === 'queued' || status === 'running') && !(job.post_rows?.length ?? 0)))

  const handleRetry = useCallback(
    async (postId: string) => {
      setRetryingIds((prev) => new Set(prev).add(postId))
      try {
        const res = await retryTwelvePuntoImportOne(postId)
        if (res.outcome === 'imported') {
          setHiddenFailedIds((prev) => new Set(prev).add(postId))
          setExtraSucceeded((prev) => [
            ...prev,
            {
              post_id: res.post_id,
              site_name: res.site_name ?? '—',
              title: res.title ?? '—',
              ...(res.note ? { note: res.note } : {}),
            },
          ])
          onRetryImported?.()
        } else {
          setErrorOverrides((prev) => ({
            ...prev,
            [postId]: (res.error ?? 'Import failed.').trim(),
          }))
        }
      } catch (e) {
        setErrorOverrides((prev) => ({
          ...prev,
          [postId]: e instanceof Error ? e.message : 'Import failed.',
        }))
      } finally {
        setRetryingIds((prev) => {
          const n = new Set(prev)
          n.delete(postId)
          return n
        })
      }
    },
    [onRetryImported]
  )

  if (!open) return null

  return (
    <div className="twelve-punto-modal-overlay" role="presentation">
      <div
        className="twelve-punto-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="twelve-punto-bulk-modal-title"
        aria-busy={showLoadingOverlay ? true : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="twelve-punto-modal-header">
          <h2 id="twelve-punto-bulk-modal-title" className="twelve-punto-modal-title">
            Bulk import result
          </h2>
          <button type="button" className="twelve-punto-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="twelve-punto-modal-body twelve-punto-modal-body--relative">
          {showLoadingOverlay ? (
            <div className="twelve-punto-modal-loading" aria-live="polite">
              <div className="twelve-punto-modal-spinner" aria-hidden />
              <p className="twelve-punto-modal-loading-text">Loading post details and preparing tables…</p>
            </div>
          ) : null}

          {job?.error && status === 'failed' ? (
            <div className="twelve-punto-error twelve-punto-modal-banner">{job.error}</div>
          ) : null}

          <p className="twelve-punto-modal-meta">
            {!job ? (
              'Connecting…'
            ) : (
              <>
                Status: <strong>{status ?? '…'}</strong>
                {total > 0 ? (
                  <>
                    {' '}
                    · {done}/{total}
                  </>
                ) : null}
              </>
            )}
          </p>

          {showWaiting ? (
            <section className="twelve-punto-modal-section">
              <h3 className="twelve-punto-modal-section-title">Waiting ({waitingIds.length})</h3>
              <div className="twelve-punto-modal-table-wrap">
                <table className="twelve-punto-modal-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Site</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waitingIds.map((id) => {
                      const meta = metaFromJob(job, id)
                      return (
                        <tr key={`w-${id}`}>
                          <td>
                            <code>{id}</code>
                          </td>
                          <td>{meta ? cellTitle(meta) : '—'}</td>
                          <td>{meta?.site_name ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="twelve-punto-modal-section">
            <h3 className="twelve-punto-modal-section-title">Succeeded ({succeeded.length})</h3>
            <div className="twelve-punto-modal-table-wrap">
              <table className="twelve-punto-modal-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Site</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {succeeded.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="twelve-punto-modal-empty">
                        —
                      </td>
                    </tr>
                  ) : (
                    succeeded.map((row) => (
                      <tr key={`ok-${row.post_id}`}>
                        <td>
                          <code>{row.post_id}</code>
                        </td>
                        <td>{cellTitle(row)}</td>
                        <td>{row.site_name}</td>
                        <td className="twelve-punto-modal-note">{row.note?.trim() || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {skipped.length > 0 ? (
            <section className="twelve-punto-modal-section">
              <h3 className="twelve-punto-modal-section-title">
                Skipped — already imported (legacy job) ({skipped.length})
              </h3>
              <div className="twelve-punto-modal-table-wrap">
                <table className="twelve-punto-modal-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Site</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skipped.map((row) => (
                      <tr key={`sk-${row.post_id}`}>
                        <td>
                          <code>{row.post_id}</code>
                        </td>
                        <td>{cellTitle(row)}</td>
                        <td>{row.site_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="twelve-punto-modal-section">
            <h3 className="twelve-punto-modal-section-title">Failed ({failed.length})</h3>
            <div className="twelve-punto-modal-table-wrap">
              <table className="twelve-punto-modal-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Site</th>
                    <th>Reason</th>
                    <th className="twelve-punto-modal-col-action"> </th>
                  </tr>
                </thead>
                <tbody>
                  {failed.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="twelve-punto-modal-empty">
                        —
                      </td>
                    </tr>
                  ) : (
                    failed.map((row, i) => (
                      <tr key={`fl-${row.post_id}-${i}`}>
                        <td>
                          <code>{row.post_id}</code>
                        </td>
                        <td>{cellTitle(row)}</td>
                        <td>{row.site_name}</td>
                        <td className="twelve-punto-modal-reason">{row.error}</td>
                        <td className="twelve-punto-modal-col-action">
                          {retryingIds.has(row.post_id) ? (
                            <span className="twelve-punto-modal-retry-pending" aria-live="polite">
                              <span className="twelve-punto-modal-spinner-inline" aria-hidden />
                              Retrying…
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="twelve-punto-modal-retry"
                              onClick={() => void handleRetry(row.post_id)}
                            >
                              Retry
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
