import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useCurrentUser, useAuth } from './context/authContext'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { EditorPage } from './pages/EditorPage'
import { AddSite } from './pages/AddSite'
import { AddPage } from './pages/AddPage'
import { AddParsed } from './pages/AddParsed'
import { ImportBulk } from './pages/ImportBulk'
import { UsersPage } from './pages/UsersPage'
import './App.css'

function AppRoutes() {
  const { currentUser, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        Loading…
      </div>
    )
  }
  if (!currentUser) {
    return <LoginPage />
  }
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<EditorPage />} />
          <Route path="sites" element={<AddSite />} />
          <Route path="pages" element={<AddPage />} />
          <Route path="parsed" element={<AddParsed />} />
          <Route path="import-bulk" element={<ImportBulk />} />
          <Route path="users" element={<UsersPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
