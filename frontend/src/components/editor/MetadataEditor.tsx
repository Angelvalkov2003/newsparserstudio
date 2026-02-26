import type { ArticleMetadata } from "../../types";
import type { Dispatch } from "react";
import type { ArticleEditorAction } from "../../state/articleEditorState";
import { ChipList } from "../ChipList";

interface MetadataEditorProps {
  metadata: ArticleMetadata;
  dispatch: Dispatch<ArticleEditorAction>;
}

export function MetadataEditor({ metadata, dispatch }: MetadataEditorProps) {
  const update = (next: ArticleMetadata) => {
    dispatch({ type: "UPDATE_METADATA", payload: next });
  };

  return (
    <section className="editor-section editor-metadata" aria-label="Article metadata">
      <h2 className="editor-section-title">Metadata</h2>

      <label className="editor-field">
        <span className="editor-label">Title</span>
        <input
          type="text"
          className="editor-input"
          value={metadata.title}
          onChange={(e) => update({ ...metadata, title: e.target.value })}
          placeholder="Article title"
        />
      </label>

      <label className="editor-field">
        <span className="editor-label">Document date & time</span>
        <input
          type="datetime-local"
          className="editor-input"
          value={
            metadata.document_date
              ? metadata.document_date.slice(0, 16)
              : ""
          }
          onChange={(e) =>
            update({
              ...metadata,
              document_date: e.target.value || undefined,
            })
          }
          aria-label="Document date and time"
        />
      </label>

      <div className="editor-field">
        <ChipList
          label="Authors"
          values={metadata.authors}
          onChange={(authors) => update({ ...metadata, authors })}
          placeholder="Add author"
        />
      </div>

      <div className="editor-field">
        <ChipList
          label="Categories"
          values={metadata.categories}
          onChange={(categories) => update({ ...metadata, categories })}
          placeholder="Add category"
        />
      </div>

      <div className="editor-field">
        <ChipList
          label="Tags"
          values={metadata.tags}
          onChange={(tags) => update({ ...metadata, tags })}
          placeholder="Add tag"
        />
      </div>
    </section>
  );
}
