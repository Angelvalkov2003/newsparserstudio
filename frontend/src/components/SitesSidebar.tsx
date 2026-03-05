import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import {
  fetchSites,
  fetchPages,
  fetchParsed,
  getPage,
  type Site,
  type PageWithSite,
  type ParsedWithPage,
} from '../api'
import './SitesSidebar.css'

function matchSearch(text: string, q: string): boolean {
  if (!q.trim()) return true
  const lower = text.toLowerCase()
  return lower.includes(q.trim().toLowerCase())
}

import { REFRESH_SIDEBAR_EVENT } from '../utils/sidebarRefresh'

export function SitesSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [sites, setSites] = useState<Site[]>([])
  const [search, setSearch] = useState('')
  const [expandedSiteId, setExpandedSiteId] = useState<number | null>(null)
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null)
  const [pagesBySite, setPagesBySite] = useState<Record<number, PageWithSite[]>>({})
  const [parsedByPage, setParsedByPage] = useState<Record<number, ParsedWithPage[]>>({})
  const [loading, setLoading] = useState(true)
  const [loadingPages, setLoadingPages] = useState<number | null>(null)
  const [loadingParsed, setLoadingParsed] = useState<number | null>(null)

  // Sync from URL: when pageId is in URL, expand site and select page, load pages + parsed
  useEffect(() => {
    const pageIdParam = searchParams.get('pageId')
    if (!pageIdParam) return
    const numId = Number(pageIdParam)
    if (!numId) return
    let cancelled = false
    getPage(numId)
      .then((page) => {
        if (cancelled) return
        setExpandedSiteId(page.site_id)
        setSelectedPageId(page.id)
        return Promise.all([
          fetchPages(page.site_id),
          fetchParsed(page.id),
        ]).then(([pages, parsed]) => {
          if (cancelled) return
          setPagesBySite((prev) => ({ ...prev, [page.site_id]: pages ?? [] }))
          setParsedByPage((prev) => ({ ...prev, [page.id]: parsed ?? [] }))
        })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [searchParams])

  function refreshSites(
    setSites: (s: Site[] | ((prev: Site[]) => Site[])) => void,
    setPagesBySite: (p: Record<number, PageWithSite[]> | ((prev: Record<number, PageWithSite[]>) => Record<number, PageWithSite[]>)) => void,
    setParsedByPage: (p: Record<number, ParsedWithPage[]> | ((prev: Record<number, ParsedWithPage[]>) => Record<number, ParsedWithPage[]>)) => void,
    setLoading: (l: boolean) => void
  ) {
    setLoading(true)
    fetchSites()
      .then((data) => {
        setSites(data)
        setPagesBySite({})
        setParsedByPage({})
      })
      .finally(() => setLoading(false))
  }

  // Refetch sites (and clear pages/parsed cache) when route changes or when data-changed event fires
  useEffect(() => {
    refreshSites(setSites, setPagesBySite, setParsedByPage, setLoading)
  }, [location.pathname])

  useEffect(() => {
    const handler = () => {
      refreshSites(setSites, setPagesBySite, setParsedByPage, setLoading)
    }
    window.addEventListener(REFRESH_SIDEBAR_EVENT, handler)
    return () => window.removeEventListener(REFRESH_SIDEBAR_EVENT, handler)
  }, [])

  const filteredSites = useMemo(() => {
    if (!search.trim()) return sites
    return sites.filter(
      (s) => matchSearch(s.name, search) || matchSearch(s.url, search)
    )
  }, [sites, search])

  useEffect(() => {
    if (expandedSiteId == null) return
    if (pagesBySite[expandedSiteId]) return
    let cancelled = false
    setLoadingPages(expandedSiteId)
    fetchPages(expandedSiteId)
      .then((data) => {
        if (!cancelled) setPagesBySite((prev) => ({ ...prev, [expandedSiteId]: data }))
      })
      .finally(() => { if (!cancelled) setLoadingPages(null) })
    return () => { cancelled = true }
  }, [expandedSiteId, pagesBySite])

  useEffect(() => {
    if (selectedPageId == null) return
    if (parsedByPage[selectedPageId]) return
    let cancelled = false
    setLoadingParsed(selectedPageId)
    fetchParsed(selectedPageId)
      .then((data) => {
        if (!cancelled) setParsedByPage((prev) => ({ ...prev, [selectedPageId]: data }))
      })
      .finally(() => { if (!cancelled) setLoadingParsed(null) })
    return () => { cancelled = true }
  }, [selectedPageId, parsedByPage])

  const pages = expandedSiteId != null ? pagesBySite[expandedSiteId] ?? [] : []
  const filteredPages = useMemo(() => {
    if (!search.trim()) return pages
    return pages.filter(
      (p) =>
        matchSearch(p.title ?? '', search) ||
        matchSearch(p.url, search) ||
        matchSearch(p.site_name ?? '', search)
    )
  }, [pages, search])

  const parsedList = selectedPageId != null ? parsedByPage[selectedPageId] ?? [] : []

  const toggleSite = (id: number) => {
    setExpandedSiteId((prev) => (prev === id ? null : id))
    setSelectedPageId(null)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('pageId')
      return next
    })
  }

  const selectPage = (id: number) => {
    setSelectedPageId((prev) => (prev === id ? null : id))
    // Navigate to Editor so the dropdown and editor are visible
    navigate(`/?pageId=${id}`)
  }

  return (
    <aside className="sites-sidebar">
      <div className="sites-sidebar-search">
        <input
          type="search"
          placeholder="Search (site / page)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sites-sidebar-input"
        />
      </div>
      <div className="sites-sidebar-list">
        {loading ? (
          <p className="sites-sidebar-muted">Loading...</p>
        ) : filteredSites.length === 0 ? (
          <p className="sites-sidebar-muted">No sites</p>
        ) : (
          <ul className="sites-sidebar-sites">
            {filteredSites.map((site) => {
              const isExpanded = expandedSiteId === site.id
              const sitePages = isExpanded ? filteredPages : []
              const isLoadingPages = loadingPages === site.id
              return (
                <li key={site.id} className="sites-sidebar-site">
                  <button
                    type="button"
                    className={`sites-sidebar-site-btn ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => toggleSite(site.id)}
                  >
                    <span className="sites-sidebar-site-name">{site.name}</span>
                    <span className="sites-sidebar-chevron">{isExpanded ? '▼' : '▶'}</span>
                  </button>
                  {isExpanded && (
                    <ul className="sites-sidebar-pages">
                      {isLoadingPages ? (
                        <li className="sites-sidebar-muted">Loading...</li>
                      ) : sitePages.length === 0 ? (
                        <li className="sites-sidebar-muted">No pages</li>
                      ) : (
                        sitePages.map((page) => {
                          const isSelected = selectedPageId === page.id
                          return (
                            <li key={page.id} className="sites-sidebar-page">
                              <button
                                type="button"
                                className={`sites-sidebar-page-btn ${isSelected ? 'selected' : ''}`}
                                onClick={() => selectPage(page.id)}
                              >
                                {page.title || page.url}
                              </button>
                              {isSelected && (
                                <ul className="sites-sidebar-parsed">
                                  {loadingParsed === page.id ? (
                                    <li className="sites-sidebar-muted">Loading...</li>
                                  ) : parsedList.length === 0 ? (
                                    <li className="sites-sidebar-muted">No parsed</li>
                                  ) : (
                                    parsedList.map((r) => (
                                      <li key={r.id} className="sites-sidebar-parsed-item">
                                        <span className="sites-sidebar-parsed-name">
                                          {r.name || `#${r.id}`}
                                        </span>
                                        {r.is_verified && (
                                          <span className="sites-sidebar-parsed-verified" title="Data correct">
                                            ✓
                                          </span>
                                        )}
                                      </li>
                                    ))
                                  )}
                                </ul>
                              )}
                            </li>
                          )
                        })
                      )}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
