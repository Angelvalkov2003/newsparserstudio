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
        <nav className="layout-nav">
          <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')} end>
            Редактор
          </NavLink>
          <NavLink to="/sites" className={({ isActive }) => (isActive ? 'active' : '')}>
            Сайтове
          </NavLink>
          <NavLink to="/pages" className={({ isActive }) => (isActive ? 'active' : '')}>
            Страници (статии)
          </NavLink>
          <NavLink to="/parsed" className={({ isActive }) => (isActive ? 'active' : '')}>
            Parsed (JSON)
          </NavLink>
        </nav>
        <main className={`layout-main ${isEditor ? 'layout-main--editor' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
