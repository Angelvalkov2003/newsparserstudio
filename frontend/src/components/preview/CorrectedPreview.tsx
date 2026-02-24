import { Fragment } from "react";
import type { Dispatch } from "react";
import type { ArticleDataCorrected } from "../../types";
import type { ArticleEditorAction } from "../../state/articleEditorState";
import { PreviewComponentWrap } from "./PreviewComponentWrap";

interface CorrectedPreviewProps {
  data: ArticleDataCorrected;
  dispatch: Dispatch<ArticleEditorAction>;
}

export function CorrectedPreview({ data, dispatch }: CorrectedPreviewProps) {
  const { metadata, components } = data;

  return (
    <article className="preview-article">
      <header className="preview-article-header">
        <h1 className="preview-article-title">{metadata.title || "(Untitled)"}</h1>
        {metadata.document_date && (
          <p className="preview-meta preview-date">{metadata.document_date}</p>
        )}
        {metadata.authors.length > 0 && (
          <p className="preview-meta preview-authors">
            {metadata.authors.map((item, i) => (
              <Fragment key={i}>
                {i > 0 && ", "}
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="preview-meta-link">
                    {item.name}
                  </a>
                ) : (
                  item.name
                )}
              </Fragment>
            ))}
          </p>
        )}
        {(metadata.categories.length > 0 || metadata.tags.length > 0) && (
          <p className="preview-meta preview-taxonomy">
            {metadata.categories.length > 0 && (
              <span>
                Categories:{" "}
                {metadata.categories.map((item, i) => (
                  <Fragment key={i}>
                    {i > 0 && ", "}
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="preview-meta-link">
                        {item.name}
                      </a>
                    ) : (
                      item.name
                    )}
                  </Fragment>
                ))}
              </span>
            )}
            {metadata.categories.length > 0 && metadata.tags.length > 0 && " · "}
            {metadata.tags.length > 0 && (
              <span>
                Tags:{" "}
                {metadata.tags.map((item, i) => (
                  <Fragment key={i}>
                    {i > 0 && ", "}
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="preview-meta-link">
                        {item.name}
                      </a>
                    ) : (
                      item.name
                    )}
                  </Fragment>
                ))}
              </span>
            )}
          </p>
        )}
      </header>

      <div className="preview-article-body preview-markdown-body">
        {components.map((component, index) => (
          <PreviewComponentWrap
            key={component.id}
            component={component}
            index={index}
            total={components.length}
            components={components}
            dispatch={dispatch}
          />
        ))}
      </div>

      {components.length === 0 && (
        <p className="preview-empty">No components yet.</p>
      )}
    </article>
  );
}
