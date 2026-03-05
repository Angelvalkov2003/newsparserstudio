/** Event name for notifying the sidebar to refetch sites/pages/parsed. */
export const REFRESH_SIDEBAR_EVENT = 'newsparserstudio:refresh-sidebar'

/** Call after creating/updating/deleting sites, pages, or parsed (or after bulk import) so the left sidebar refreshes. */
export function refreshSidebar(): void {
  window.dispatchEvent(new CustomEvent(REFRESH_SIDEBAR_EVENT))
}
