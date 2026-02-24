import type { ImageComponent } from "../../../types";

interface ImagePreviewProps {
  component: ImageComponent;
}

export function ImagePreview({ component }: ImagePreviewProps) {
  const url = component.url?.trim();
  const linkUrl = component.link_url?.trim();
  const content = url ? (
    <figure className="preview-figure">
      {linkUrl ? (
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="preview-image-link"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
        >
          <img
            src={url}
            alt={component.description ?? ""}
            className="preview-image"
            draggable={false}
          />
        </a>
      ) : (
        <img
          src={url}
          alt={component.description ?? ""}
          className="preview-image"
          draggable={false}
        />
      )}
      {component.caption && (
        <figcaption className="preview-caption">{component.caption}</figcaption>
      )}
    </figure>
  ) : (
    <p className="preview-placeholder-inline">[Image: no URL]</p>
  );
  return <div className="preview-image-block">{content}</div>;
}
