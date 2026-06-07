// Markdown editor textarea component

interface EditorProps {
  value: string
  onChange: (value: string) => void
  onFormat: (type: string) => void
}

function Editor({ value, onChange, onFormat }: EditorProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    // Tab key inserts two spaces instead of losing focus
    if (e.key === 'Tab') {
      e.preventDefault()
      const target = e.target as HTMLTextAreaElement
      const start: number = target.selectionStart
      const end: number = target.selectionEnd
      const newValue: string =
        target.value.substring(0, start) + '  ' + target.value.substring(end)
      onChange(newValue)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    onChange(e.target.value)
  }

  return (
    <div className="editor-pane">
      <div className="pane-header">
        <span className="pane-label">Editor</span>
        <span className="pane-hint">Markdown</span>
      </div>
      <textarea
        className="editor-textarea"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Start writing Markdown here..."
        spellCheck={false}
        aria-label="Markdown editor"
      />
    </div>
  )
}
