# Preview panel

Right-hand panel with two modes (dropdown):

1. **Original page** – Renders the article URL in an iframe. If no URL is set (no article loaded), shows a placeholder message.
2. **Data corrected** – Renders `data_corrected` (metadata + components) using the same component types as the editor. Each type has a dedicated preview renderer (heading, paragraph, image, link, code_block, equation, citation, footnote, horizontal_ruler).

## Component hierarchy

- **PreviewPanel** – Toolbar (dropdown) + scrollable content. Dispatches `SET_PREVIEW_MODE` on change. Renders either iframe or `CorrectedPreview`.
- **CorrectedPreview** – Article layout: header (title, authors, categories, tags) + body (list of components).
- **ComponentPreview** – Router by `component.type`; delegates to the matching renderer in `renderers/`.

## Structure alignment with editor

The corrected preview mirrors the left editor structure: metadata first (title, authors, categories, tags), then components in order. Each component is rendered with the same type-specific semantics (headings as h1–h6, paragraphs as `<p>`, images in `<figure>`, etc.) so the preview is a read-only, preview-focused view of what the editor edits.
