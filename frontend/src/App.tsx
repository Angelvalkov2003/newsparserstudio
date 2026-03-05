import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { EditorPage } from './pages/EditorPage'
import { AddSite } from './pages/AddSite'
import { AddPage } from './pages/AddPage'
import { AddParsed } from './pages/AddParsed'
import { ImportBulk } from './pages/ImportBulk'
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
          <Route path="import-bulk" element={<ImportBulk />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
