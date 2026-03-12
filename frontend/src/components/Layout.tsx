import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { SitesSidebar } from './SitesSidebar'
import { useAuth, useIsAdmin } from '../context'
import './Layout.css'

export function Layout() {
  const { pathname } = useLocation()
  const isEditor = pathname === '/'
  const isAdmin = useIsAdmin()
  const { currentUser, logout } = useAuth()
  const isGuest = currentUser?.role === 'guest' || currentUser?.isGuest

  return (
    <div className="layout">
      <SitesSidebar />
      <div className="layout-body">
        <header className="layout-header">
            <NavLink to="/" className="layout-brand" end>
              Universal Markdown Builder Studio
            </NavLink>
            <nav className="layout-nav">
              <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')} end>
                Editor
              </NavLink>
              {!isGuest && isAdmin && (
                <NavLink to="/admin" className={({ isActive }) => (isActive ? 'active' : '')}>
                  All content
                </NavLink>
              )}
              {!isGuest && isAdmin && (
                <NavLink to="/sites" className={({ isActive }) => (isActive ? 'active' : '')}>
                  Sites
                </NavLink>
              )}
              {!isGuest && (
              <NavLink to="/pages" className={({ isActive }) => (isActive ? 'active' : '')}>
                Pages
              </NavLink>
              )}
              {!isGuest && (
              <NavLink to="/parsed" className={({ isActive }) => (isActive ? 'active' : '')}>
                Parsed
              </NavLink>
              )}
              {!isGuest && (
              <NavLink to="/import-bulk" className={({ isActive }) => (isActive ? 'active' : '')}>
                Import bulk
              </NavLink>
              )}
              {!isGuest && isAdmin && (
                <NavLink to="/users" className={({ isActive }) => (isActive ? 'active' : '')}>
                  Users
                </NavLink>
              )}
            </nav>
            <div className="layout-header-user">
              <span className="layout-header-username">{currentUser?.name ?? ''}</span>
              <button type="button" className="layout-header-login" onClick={logout}>
                Logout
              </button>
            </div>
          </header>
        <main className={`layout-main ${isEditor ? 'layout-main--editor' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
