import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useArticleEditor } from '../state/articleEditorState'
import { buildLoadPayload, getEmptyParsed } from '../state/articleEditorState'
import { EditorPanel } from '../components/editor'
import { PreviewPanel } from '../components/preview'
import { getPage, getParsed, fetchParsed, createParsed, updateParsed, type PageWithSite, type ParsedWithPage } from '../api'
import { parseDataParsedLike, type ParseArticleFileResult } from '../components/editor/UploadArticleButton'
import { downloadParsedFile } from '../utils/downloadCorrectedJson'
import { refreshSidebar } from '../utils/sidebarRefresh'
import type { ArticleDataParsed } from '../types'
import '../components/editor/EditorPanel.css'
import '../components/preview/PreviewPanel.css'

type ReferenceSelection = 'url' | string

function sortByUpdatedAtDesc(a: ParsedWithPage, b: ParsedWithPage): number {
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
}

export function EditorPage() {
  const [state, dispatch] = useArticleEditor()
  const [searchParams] = useSearchParams()
  const pageIdParam = searchParams.get('pageId')
  const pageId = pageIdParam || null

  const [page, setPage] = useState<PageWithSite | null>(null)
  const [unverifiedList, setUnverifiedList] = useState<ParsedWithPage[]>([])
  const [verifiedList, setVerifiedList] = useState<ParsedWithPage[]>([])
  const [selectedUnverifiedId, setSelectedUnverifiedId] = useState<string | null>(null)
  const [selectedReference, setSelectedReference] = useState<ReferenceSelection>('url')
  const [, setLoadingPage] = useState(false)
  const [loadingParsed, setLoadingParsed] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [saving, setSaving] = useState(false)
  const [, setBarError] = useState<string | null>(null)
  const [leftPercent, setLeftPercent] = useState(50)
  const [dragging, setDragging] = useState(false)
  const editorRowRef = useRef<HTMLDivElement>(null)

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!editorRowRef.current) return
      const rect = editorRowRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const pct = Math.round((x / rect.width) * 100)
      setLeftPercent(Math.min(85, Math.max(15, pct)))
    },
    []
  )

  const handleResizeEnd = useCallback(() => {
    setDragging(false)
  }, [])

  useEffect(() => {
    if (!dragging) return
    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    return () => {
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [dragging, handleResizeMove, handleResizeEnd])

  // Fetch page and parsed when pageId is set
  useEffect(() => {
    if (!pageId) {
      setPage(null)
      setUnverifiedList([])
      setVerifiedList([])
      setSelectedUnverifiedId(null)
      setSelectedReference('url')
      return
    }
    setLoadingPage(true)
    setLoadingParsed(true)
    getPage(pageId)
      .then((p) => {
        setPage(p)
        return fetchParsed(pageId)
      })
      .then((all) => {
        const unverified = all.filter((r) => !r.is_verified).sort(sortByUpdatedAtDesc)
        const verified = all.filter((r) => r.is_verified).sort(sortByUpdatedAtDesc)
        setUnverifiedList(unverified)
        setVerifiedList(verified)
        setSelectedReference('url')
        if (unverified.length > 0) {
          setSelectedUnverifiedId(unverified[0].id)
        } else {
          setSelectedUnverifiedId(null)
        }
      })
      .catch(() => {
        setPage(null)
        setUnverifiedList([])
        setVerifiedList([])
        setSelectedUnverifiedId(null)
      })
      .finally(() => {
        setLoadingPage(false)
        setLoadingParsed(false)
      })
  }, [pageId])

  // Load selected unverified parsed into editor
  const loadUnverifiedIntoEditor = useCallback(
    (parsedId: string, pageUrl: string) => {
      getParsed(parsedId)
        .then((r) => {
          let data: ArticleDataParsed
          try {
            const raw = JSON.parse(r.data)
            const parsed = parseDataParsedLike(raw)
            data = parsed ?? getEmptyParsed()
          } catch {
            data = getEmptyParsed()
          }
          dispatch({
            type: 'LOAD_ARTICLE',
            payload: buildLoadPayload({
              url: pageUrl,
              data_parsed: data,
              data_corrected: null,
            }),
          })
        })
        .catch(() => {})
    },
    [dispatch]
  )

  useEffect(() => {
    if (page && selectedUnverifiedId != null) {
      loadUnverifiedIntoEditor(selectedUnverifiedId, page.url)
    }
  }, [page?.url, selectedUnverifiedId, loadUnverifiedIntoEditor])

  const handleSelectUnverified = (id: string | null) => {
    setSelectedUnverifiedId(id)
    if (id != null && page) {
      loadUnverifiedIntoEditor(id, page.url)
    }
  }

  const handleReferenceChange = (value: ReferenceSelection) => {
    setSelectedReference(value)
    setBarError(null)
  }

  const refetchParsed = useCallback(() => {
    if (!pageId) return
    fetchParsed(pageId).then((all) => {
      const unverified = all.filter((r) => !r.is_verified).sort(sortByUpdatedAtDesc)
      const verified = all.filter((r) => r.is_verified).sort(sortByUpdatedAtDesc)
      setUnverifiedList(unverified)
      setVerifiedList(verified)
    }).catch(() => {})
  }, [pageId])

  const handleVerify = useCallback(() => {
    if (!pageId || !page) return
    setBarError(null)
    setVerifying(true)
    const dataStr = JSON.stringify(state.data_corrected)
    const name = state.data_corrected.metadata?.title?.trim() || 'Verified copy'
    createParsed(pageId, name, dataStr, null, true)
      .then((newParsed) => {
        refetchParsed()
        refreshSidebar()
        setSelectedReference(newParsed.id)
      })
      .catch((e) => setBarError(e instanceof Error ? e.message : 'Verify failed'))
      .finally(() => setVerifying(false))
  }, [pageId, page, state.data_corrected, refetchParsed])

  const handleSaveParsed = useCallback(() => {
    if (!pageId) return
    setBarError(null)
    setSaving(true)
    const dataStr = JSON.stringify(state.data_corrected)
    // Save to the working copy (unverified) we are editing, so added components persist
    if (selectedUnverifiedId != null) {
      const unverified = unverifiedList.find((p) => p.id === selectedUnverifiedId)
      if (!unverified) {
        setSaving(false)
        return
      }
      updateParsed(selectedUnverifiedId, pageId, unverified.name, dataStr, unverified.info, false)
        .then(() => { refetchParsed(); refreshSidebar() })
        .catch((e) => setBarError(e instanceof Error ? e.message : 'Save failed'))
        .finally(() => setSaving(false))
      return
    }
    // Or save to the selected verified reference
    if (typeof selectedReference === 'string') {
      const verified = verifiedList.find((p) => p.id === selectedReference)
      if (!verified) {
        setSaving(false)
        return
      }
      updateParsed(selectedReference, pageId, verified.name, dataStr, verified.info, true)
        .then(() => { refetchParsed(); refreshSidebar() })
        .catch((e) => setBarError(e instanceof Error ? e.message : 'Save failed'))
        .finally(() => setSaving(false))
    } else {
      setSaving(false)
    }
  }, [pageId, selectedUnverifiedId, selectedReference, unverifiedList, verifiedList, state.data_corrected, refetchParsed])

  const handleDownloadCurrentParsed = useCallback(() => {
    downloadParsedFile(state.url, state.data_corrected, {
      is_verified: false,
      name: state.data_corrected.metadata?.title?.trim() || null,
    })
  }, [state.url, state.data_corrected])

  const handleDownloadReference = useCallback(() => {
    if (typeof selectedReference !== 'string' || !page) return
    getParsed(selectedReference)
      .then((r) => {
        const raw = JSON.parse(r.data)
        const data = parseDataParsedLike(raw)
        if (data) {
          downloadParsedFile(page.url, data, {
            id: r.id,
            page_id: r.page_id,
            name: r.name,
            info: r.info,
            is_verified: r.is_verified,
            created_at: r.created_at,
            updated_at: r.updated_at,
          })
        }
      })
      .catch(() => {})
  }, [selectedReference, page])

  const handleAfterLoad = useCallback(
    (parsed: ParseArticleFileResult) => {
      if (!pageId) return
      const data = parsed.data_parsed ?? parsed.data_corrected
      if (!data) return
      const dataStr = JSON.stringify(data)
      const name = parsed.name ?? (data.metadata?.title?.trim()) ?? null
      const info = parsed.info ?? null
      const isVerified = parsed.is_verified ?? false
      createParsed(pageId, name, dataStr, info, isVerified)
        .then(() => { refetchParsed(); refreshSidebar() })
        .catch((e) => setBarError(e instanceof Error ? e.message : 'Failed to save to database'))
    },
    [pageId, refetchParsed]
  )

  return (
    <div className="app-layout app-layout--in-router" style={{ height: '100%' }}>
      <div className="app-editor-row" ref={editorRowRef}>
        <aside
          className="app-left"
          style={{ flex: `0 0 ${leftPercent}%`, width: `${leftPercent}%`, minWidth: 280, maxWidth: '85%' }}
        >
          <EditorPanel
            state={state}
            dispatch={dispatch}
            unverifiedList={unverifiedList}
            selectedUnverifiedId={selectedUnverifiedId}
            onSelectUnverified={handleSelectUnverified}
            loadingParsed={loadingParsed}
            hasPage={pageId != null}
            onAfterLoad={handleAfterLoad}
            onClearBarError={() => setBarError(null)}
            showVerify={pageId != null && selectedUnverifiedId != null}
            onVerify={handleVerify}
            verifying={verifying}
            showSaveParsed={pageId != null}
            saveParsedDisabled={selectedUnverifiedId == null && typeof selectedReference !== 'string'}
            onSaveParsed={handleSaveParsed}
            savingParsed={saving}
            onDownloadCurrentParsed={handleDownloadCurrentParsed}
          />
        </aside>
        <div
          className="app-editor-resizer"
          onMouseDown={(e) => { e.preventDefault(); setDragging(true) }}
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={leftPercent}
        />
        <main className="app-right">
          <PreviewPanel
            state={state}
            dispatch={dispatch}
            pageUrl={page?.url ?? ''}
            verifiedList={verifiedList}
            selectedReference={selectedReference}
            onReferenceChange={handleReferenceChange}
            onDownloadReference={handleDownloadReference}
          />
        </main>
      </div>
    </div>
  )
}
