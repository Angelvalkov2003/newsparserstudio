import type { Dispatch } from "react";
import type { ArticleEditorState, ArticleEditorAction } from "../../state/articleEditorState";
import { MetadataEditor } from "./MetadataEditor";
import { AddComponentByJson } from "./AddComponentByJson";
import { ComponentList } from "./ComponentList";

interface EditorPanelProps {
  state: ArticleEditorState;
  dispatch: Dispatch<ArticleEditorAction>;
}

export function EditorPanel({ state, dispatch }: EditorPanelProps) {
  const { data_corrected } = state;

  return (
    <aside className="editor-panel" role="complementary" aria-label="Markdown document editor">
      <h1 className="editor-panel-title">Markdown Document</h1>
      <div className="editor-panel-content">
        <MetadataEditor metadata={data_corrected.metadata} dispatch={dispatch} />
        <ComponentList
          components={data_corrected.components}
          dispatch={dispatch}
        />
        <AddComponentByJson
          dispatch={dispatch}
          existingComponentIds={data_corrected.components.map((c) => c.id)}
        />
      </div>
    </aside>
  );
}
