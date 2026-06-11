// Markdown preview component — renders HTML produced by useMarkdown

interface PreviewProps {
  html: string
}

function Preview({ html }: PreviewProps) {
  return (
    <div className="preview-pane">
      <div className="pane-header">
        <span className="pane-label">Preview</span>
        <span className="pane-hint">HTML output</span>
      </div>
      <div
        className="preview-content"
        dangerouslySetInnerHTML={{ __html: html || '<p class="placeholder">Nothing to preview yet.</p>' }}
        aria-label="Markdown preview"
        aria-live="polite"
      />
    </div>
  )
}
