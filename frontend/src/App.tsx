import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { EditorPage } from './pages/EditorPage'
import { AddSite } from './pages/AddSite'
import { AddPage } from './pages/AddPage'
import { AddParsed } from './pages/AddParsed'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<EditorPage />} />
          <Route path="sites" element={<AddSite />} />
          <Route path="pages" element={<AddPage />} />
          <Route path="parsed" element={<AddParsed />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
