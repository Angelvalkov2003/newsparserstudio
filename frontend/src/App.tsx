import { useArticleEditor } from './state/articleEditorState'
import { EditorPanel } from './components/editor'
import { PreviewPanel } from './components/preview'
import { BottomBar } from './components/BottomBar'
import './App.css'
import './components/editor/EditorPanel.css'
import './components/preview/PreviewPanel.css'

function App() {
  const [state, dispatch] = useArticleEditor()

  return (
    <div className="app-layout">
      <aside className="app-left">
        <EditorPanel state={state} dispatch={dispatch} />
      </aside>
      <main className="app-right">
        <PreviewPanel state={state} dispatch={dispatch} />
      </main>
      <BottomBar
        dispatch={dispatch}
        article={{
          url: state.url,
          data_parsed: state.data_parsed,
          data_corrected: state.data_corrected,
        }}
      />
    </div>
  )
}

export default App
