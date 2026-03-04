import { useState, useEffect, useMemo } from 'react'
import {
  fetchSites,
  fetchPages,
  fetchParsed,
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

export function SitesSidebar() {
  const [sites, setSites] = useState<Site[]>([])
  const [search, setSearch] = useState('')
  const [expandedSiteId, setExpandedSiteId] = useState<number | null>(null)
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null)
  const [pagesBySite, setPagesBySite] = useState<Record<number, PageWithSite[]>>({})
  const [parsedByPage, setParsedByPage] = useState<Record<number, ParsedWithPage[]>>({})
  const [loading, setLoading] = useState(true)
  const [loadingPages, setLoadingPages] = useState<number | null>(null)
  const [loadingParsed, setLoadingParsed] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchSites()
      .then((data) => { if (!cancelled) setSites(data) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
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
  }

  const selectPage = (id: number) => {
    setSelectedPageId((prev) => (prev === id ? null : id))
  }

  return (
    <aside className="sites-sidebar">
      <div className="sites-sidebar-search">
        <input
          type="search"
          placeholder="Търсене (сайт / страница)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sites-sidebar-input"
        />
      </div>
      <div className="sites-sidebar-list">
        {loading ? (
          <p className="sites-sidebar-muted">Зареждане...</p>
        ) : filteredSites.length === 0 ? (
          <p className="sites-sidebar-muted">Няма сайтове</p>
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
                        <li className="sites-sidebar-muted">Зареждане...</li>
                      ) : sitePages.length === 0 ? (
                        <li className="sites-sidebar-muted">Няма страници</li>
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
                                    <li className="sites-sidebar-muted">Зареждане...</li>
                                  ) : parsedList.length === 0 ? (
                                    <li className="sites-sidebar-muted">Няма parsed</li>
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
