# Left editor panel — architecture

## Component hierarchy

```
EditorPanel (state, dispatch)
├── MetadataEditor (metadata, dispatch)
│   └── Controlled inputs: title, authors, categories, tags
│       → dispatch(UPDATE_METADATA)
└── ComponentList (components, dispatch)
    └── For each component: ComponentEditor (component, index, onChange)
        └── onChange = (index, next) => dispatch(UPDATE_COMPONENT, { index, component: next })
        └── Switch on component.type → specific editor:
            ├── HeadingEditor
            ├── ParagraphEditor
            ├── ImageEditor (preview + url, description, caption, link_url)
            ├── LinkEditor
            ├── CodeBlockEditor
            ├── EquationEditor
            ├── CitationEditor
            ├── FootnoteEditor
            └── HorizontalRulerEditor (no editable fields)
```

## How updates propagate to global state

1. **Single source of truth**: `useArticleEditor()` (useReducer) holds `ArticleEditorState`. The left panel receives `state` and `dispatch` from the parent (App).

2. **Metadata**: `MetadataEditor` never mutates `metadata`. On every change it builds a new `ArticleMetadata` and calls `dispatch({ type: "UPDATE_METADATA", payload: next })`. The reducer replaces `state.data_corrected.metadata` with `payload`.

3. **Components**: Each `ComponentEditor` receives the current `component` and an `onChange(index, next)` callback. That callback is implemented in `ComponentList` as:
   - `handleChange(index, next) => dispatch({ type: "UPDATE_COMPONENT", payload: { index, component: next } })`
   The reducer copies `data_corrected.components`, replaces the item at `index` with `next`, and sets the new array back. No direct mutation of state anywhere.

4. **Controlled inputs**: Every `<input>` and `<textarea>` uses `value={...}` and `onChange={...}`. The value always comes from state; the handler always dispatches an action. No `defaultValue` or local state for the edited value.

5. **data_parsed**: Never passed to the editor panel and never modified. Only `data_corrected` is read and updated via dispatch.

---

## Drag-and-drop reordering

- **Library**: `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`. Drag is confined to the left editor panel (the list lives inside `ComponentList`).
- **Handle**: Each component row has a visual drag handle (grid icon). Only the handle has the drag listeners; the rest of the row stays clickable for editing.
- **Flow**: On `dragEnd`, we read `active.id` (dragged item) and `over.id` (drop target). We find their indices in `data_corrected.components`, reorder with `arrayMove([...components], oldIndex, newIndex)` (new array, no mutation), then `dispatch({ type: "REORDER_COMPONENTS", payload: reordered })`. Component objects and their `id`s are unchanged; only the order changes.
- **State**: The reducer’s `REORDER_COMPONENTS` case replaces `state.data_corrected.components` with the payload array. No DOM hacks; all updates are immutable.
