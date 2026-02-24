import type { VideoComponent } from "../../../types";

interface VideoPreviewProps {
  component: VideoComponent;
}

export function VideoPreview({ component }: VideoPreviewProps) {
  const url = component.url?.trim();
  const name = component.name?.trim() || "Video";
  const caption = component.caption?.trim();
  const thumbnail = component.thumbnail_image_url?.trim();
  if (!url) return <p className="preview-placeholder-inline">[Video: no URL]</p>;
  const content = (
    <>
      {thumbnail ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="preview-video-link">
          <img src={thumbnail} alt={component.description ?? name} className="preview-video-thumb" />
          <span>{name}</span>
        </a>
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer" className="preview-video-link">
          {name}
        </a>
      )}
    </>
  );
  return (
    <div className="preview-video-block">
      <figure className="preview-figure">
        {content}
        {caption && <figcaption className="preview-caption">{caption}</figcaption>}
      </figure>
    </div>
  );
}
