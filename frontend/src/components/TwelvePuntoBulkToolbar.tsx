type TwelvePuntoBulkToolbarProps = {
  selectedCount: number
  busy: boolean
  busyLabel: string | null
  onClear: () => void
  onBulkImport: () => void
}

export function TwelvePuntoBulkToolbar({
  selectedCount,
  busy,
  busyLabel,
  onClear,
  onBulkImport,
}: TwelvePuntoBulkToolbarProps) {
  if (selectedCount < 1) return null

  return (
    <div className="twelve-punto-bulk-bar" role="region" aria-label="Bulk selection actions">
      <div className="twelve-punto-bulk-bar-inner">
        <span className="twelve-punto-bulk-count">{selectedCount} selected</span>
        <div className="twelve-punto-bulk-actions">
          <button type="button" className="secondary" disabled={busy} onClick={onClear}>
            Clear selection
          </button>
          <button type="button" className="twelve-punto-import-btn" disabled={busy} onClick={onBulkImport}>
            {busy ? busyLabel || 'Import…' : 'Bulk import'}
          </button>
        </div>
      </div>
    </div>
  )
}
