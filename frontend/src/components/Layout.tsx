import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { SitesSidebar } from './SitesSidebar'
import './Layout.css'

export function Layout() {
  const { pathname } = useLocation()
  const isEditor = pathname === '/'

  return (
    <div className="layout">
      <SitesSidebar />
      <div className="layout-body">
        <header className="layout-header">
          <NavLink to="/" className="layout-brand" end>
            NewsParserStudio
          </NavLink>
          <nav className="layout-nav">
            <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')} end>
              Editor
            </NavLink>
            <NavLink to="/sites" className={({ isActive }) => (isActive ? 'active' : '')}>
              Sites
            </NavLink>
            <NavLink to="/pages" className={({ isActive }) => (isActive ? 'active' : '')}>
              Pages
            </NavLink>
            <NavLink to="/parsed" className={({ isActive }) => (isActive ? 'active' : '')}>
              Parsed
            </NavLink>
            <NavLink to="/import-bulk" className={({ isActive }) => (isActive ? 'active' : '')}>
              Import bulk
            </NavLink>
          </nav>
        </header>
        <main className={`layout-main ${isEditor ? 'layout-main--editor' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
