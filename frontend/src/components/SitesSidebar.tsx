import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import {
  fetchSites,
  fetchPages,
  fetchParsed,
  getPage,
  getGuestPage,
  fetchUsers,
  type Site,
  type PageWithSite,
  type ParsedWithPage,
  type UserPublic,
} from '../api'
import { useIsAdmin, useCurrentUser } from '../context'
import './SitesSidebar.css'

function matchSearch(text: string, q: string): boolean {
  if (!q.trim()) return true
  const lower = text.toLowerCase()
  return lower.includes(q.trim().toLowerCase())
}

import { REFRESH_SIDEBAR_EVENT } from '../utils/sidebarRefresh'

const GUEST_SITE_ID = 'guest'

export function SitesSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = useCurrentUser()
  const isGuest = currentUser?.role === 'guest' || currentUser?.isGuest === true
  const isAdmin = useIsAdmin()
  const [searchParams, setSearchParams] = useSearchParams()
  const [sites, setSites] = useState<Site[]>([])
  const [guestPage, setGuestPage] = useState<PageWithSite | null>(null)
  const [users, setUsers] = useState<UserPublic[]>([])
  const [adminFilterUserId, setAdminFilterUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [pagesBySite, setPagesBySite] = useState<Record<string, PageWithSite[]>>({})
  const [parsedByPage, setParsedByPage] = useState<Record<string, ParsedWithPage[]>>({})
  const [loading, setLoading] = useState(true)
  const [loadingPages, setLoadingPages] = useState<string | null>(null)
  const [loadingParsed, setLoadingParsed] = useState<string | null>(null)
  const [guestPageError, setGuestPageError] = useState<string | null>(null)

  // Guest: load guest page once (only when we have a logged-in guest user)
  useEffect(() => {
    if (!currentUser || !isGuest) {
      setGuestPage(null)
      setGuestPageError(null)
      return
    }
    setLoading(true)
    setGuestPageError(null)
    getGuestPage(currentUser?.name)
      .then((p) => {
        setGuestPage(p)
        if (p) {
          setPagesBySite((prev) => ({ ...prev, [GUEST_SITE_ID]: [p] }))
          setExpandedSiteId(GUEST_SITE_ID)
          setSelectedPageId(p.id)
          navigate(`/?pageId=${p.id}`)
          return fetchParsed(p.id).then((parsed) => {
            setParsedByPage((prev) => ({ ...prev, [p.id]: parsed ?? [] }))
          })
        }
      })
      .catch(() => {
        setGuestPage(null)
        setGuestPageError('Page could not be loaded. Restart the backend and refresh.')
      })
      .finally(() => setLoading(false))
  }, [currentUser, isGuest])

  // Sync from URL: when pageId is in URL, expand site and select page, load pages + parsed (non-guest)
  useEffect(() => {
    if (isGuest) return
    const pageIdParam = searchParams.get('pageId')
    if (!pageIdParam) return
    let cancelled = false
    getPage(pageIdParam)
      .then((page) => {
        if (cancelled) return
        setExpandedSiteId(page.site_id ?? GUEST_SITE_ID)
        setSelectedPageId(page.id)
        const siteId = page.site_id ?? GUEST_SITE_ID
        return Promise.all([
          page.site_id ? fetchPages(page.site_id) : Promise.resolve([]),
          fetchParsed(page.id),
        ]).then(([pages, parsed]) => {
          if (cancelled) return
          setPagesBySite((prev) => ({ ...prev, [siteId]: pages ?? [] }))
          setParsedByPage((prev) => ({ ...prev, [page.id]: parsed ?? [] }))
        })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [searchParams, isGuest])

  function refreshSites(
    setSites: (s: Site[] | ((prev: Site[]) => Site[])) => void,
    setPagesBySite: (p: Record<string, PageWithSite[]> | ((prev: Record<string, PageWithSite[]>) => Record<string, PageWithSite[]>)) => void,
    setParsedByPage: (p: Record<string, ParsedWithPage[]> | ((prev: Record<string, ParsedWithPage[]>) => Record<string, ParsedWithPage[]>)) => void,
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

  // Refetch sites (and clear pages/parsed cache) when route changes or when data-changed event fires (non-guest only)
  useEffect(() => {
    if (isGuest) return
    refreshSites(setSites, setPagesBySite, setParsedByPage, setLoading)
  }, [location.pathname, isGuest])

  useEffect(() => {
    const handler = () => {
      if (isGuest && guestPage) {
        fetchParsed(guestPage.id).then((parsed) => {
          setParsedByPage((prev) => ({ ...prev, [guestPage.id]: parsed ?? [] }))
        }).catch(() => {})
        return
      }
      refreshSites(setSites, setPagesBySite, setParsedByPage, setLoading)
    }
    window.addEventListener(REFRESH_SIDEBAR_EVENT, handler)
    return () => window.removeEventListener(REFRESH_SIDEBAR_EVENT, handler)
  }, [isGuest, guestPage])

  // Admin: load users for "Content from" filter
  useEffect(() => {
    if (!isAdmin) return
    fetchUsers().then(setUsers).catch(() => {})
  }, [isAdmin])

  const effectiveSites: Site[] = useMemo(() => {
    if (isGuest && guestPage) {
      return [{ id: GUEST_SITE_ID, name: 'Guest', url: '', created_at: '', updated_at: '' } as Site]
    }
    return sites
  }, [isGuest, guestPage, sites])

  const filteredSites = useMemo(() => {
    let list = effectiveSites
    if (isAdmin && adminFilterUserId && !isGuest) {
      list = list.filter((s) => s.created_by === adminFilterUserId)
    }
    if (!search.trim()) return list
    return list.filter(
      (s) => matchSearch(s.name, search) || matchSearch(s.url || '', search)
    )
  }, [effectiveSites, search, isAdmin, adminFilterUserId, isGuest])

  useEffect(() => {
    if (expandedSiteId == null) return
    if (expandedSiteId === GUEST_SITE_ID) return
    if (pagesBySite[expandedSiteId]) return
    let cancelled = false
    setLoadingPages(expandedSiteId)
    fetchPages(expandedSiteId)
      .then((data) => {
        if (!cancelled) setPagesBySite((prev) => ({ ...prev, [expandedSiteId]: data ?? [] }))
      })
      .catch(() => {
        if (!cancelled) setPagesBySite((prev) => ({ ...prev, [expandedSiteId]: [] }))
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
        if (!cancelled) setParsedByPage((prev) => ({ ...prev, [selectedPageId]: data ?? [] }))
      })
      .catch(() => {
        if (!cancelled) setParsedByPage((prev) => ({ ...prev, [selectedPageId]: [] }))
      })
      .finally(() => { if (!cancelled) setLoadingParsed(null) })
    return () => { cancelled = true }
  }, [selectedPageId, parsedByPage])

  const pages = expandedSiteId != null ? pagesBySite[expandedSiteId] ?? [] : []
  const filteredPages = useMemo(() => {
    let list = pages
    if (isAdmin && adminFilterUserId) {
      list = list.filter((p) => p.created_by === adminFilterUserId)
    }
    if (!search.trim()) return list
    return list.filter(
      (p) =>
        matchSearch(p.title ?? '', search) ||
        matchSearch(p.url, search) ||
        matchSearch(p.site_name ?? '', search)
    )
  }, [pages, search, isAdmin, adminFilterUserId])

  const parsedList = selectedPageId != null ? parsedByPage[selectedPageId] ?? [] : []
  const guestParsedList = (isGuest && guestPage ? parsedByPage[guestPage.id] ?? [] : []).filter((p) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (p.name ?? '').toLowerCase().includes(q) || (p.info ?? '').toLowerCase().includes(q)
  })

  const toggleSite = (id: string) => {
    const wasExpanded = expandedSiteId === id
    setExpandedSiteId((prev) => (prev === id ? null : id))
    setSelectedPageId(null)
    if (!wasExpanded && id === GUEST_SITE_ID && guestPage) {
      setSelectedPageId(guestPage.id)
      navigate(`/?pageId=${guestPage.id}`)
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('pageId')
      return next
    })
  }

  const selectPage = (id: string) => {
    setSelectedPageId((prev) => (prev === id ? null : id))
    navigate(`/?pageId=${id}`)
  }

  return (
    <aside className="sites-sidebar">
      {isAdmin && users.length > 0 && (
        <div className="sites-sidebar-admin-filter">
          <label htmlFor="admin-filter-user" className="sites-sidebar-admin-filter-label">
            Content from
          </label>
          <select
            id="admin-filter-user"
            className="sites-sidebar-admin-filter-select"
            value={adminFilterUserId ?? ''}
            onChange={(e) => setAdminFilterUserId(e.target.value || null)}
          >
            <option value="">All users</option>
            {users.filter((u) => !u.is_guest).map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="sites-sidebar-search">
        <input
          type="search"
          placeholder={isGuest ? "Search articles..." : "Search (site / page)..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sites-sidebar-input"
        />
      </div>
      <div className="sites-sidebar-list">
        {isGuest ? (
          <>
            <h3 className="sites-sidebar-parsed-heading">Your articles</h3>
            {loading ? (
              <p className="sites-sidebar-muted">Loading...</p>
            ) : guestPageError ? (
              <p className="sites-sidebar-error" role="alert">
                {guestPageError}
              </p>
            ) : guestParsedList.length === 0 ? (
              <p className="sites-sidebar-muted">No articles yet</p>
            ) : (
              <ul className="sites-sidebar-parsed-only">
                {guestParsedList.map((r) => (
                  <li key={r.id} className="sites-sidebar-parsed-only-item">
                    <button
                      type="button"
                      className={`sites-sidebar-page-btn ${selectedPageId === guestPage?.id ? 'selected' : ''}`}
                      onClick={() => guestPage && selectPage(guestPage.id)}
                    >
                      <span className="sites-sidebar-parsed-name">
                        {r.name || `#${r.id}`}
                      </span>
                      {r.is_verified && (
                        <span className="sites-sidebar-parsed-verified" title="Verified">✓</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : loading ? (
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
                    <span className="sites-sidebar-site-name">
                      {site.name}
                      {site.created_by_username && ` · ${site.created_by_username}`}
                    </span>
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
                                {page.created_by_username && ` · ${page.created_by_username}`}
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
                                          {r.created_by_username && ` · ${r.created_by_username}`}
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
