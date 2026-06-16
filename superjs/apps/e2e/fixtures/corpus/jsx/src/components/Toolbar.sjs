// Toolbar component with formatting buttons and stats display

type ToolbarProps {
  onFormat: (type: string) => void
  wordCount: number
  charCount: number
}

type FormatButton {
  type: string
  label: string
  title: string
}

const FORMAT_BUTTONS: FormatButton[] = [
  { type: 'bold',      label: 'B',   title: 'Bold (**text**)' },
  { type: 'italic',    label: 'I',   title: 'Italic (*text*)' },
  { type: 'heading',   label: 'H2',  title: 'Heading (## text)' },
  { type: 'code',      label: '</>',  title: 'Inline code (`code`)' },
  { type: 'codeblock', label: '```', title: 'Code block' },
  { type: 'list',      label: '—',   title: 'List item (- item)' },
  { type: 'quote',     label: '"',   title: 'Blockquote (> text)' },
  { type: 'hr',        label: '---', title: 'Horizontal rule' },
]

function Toolbar({ onFormat, wordCount, charCount }: ToolbarProps) {
  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting tools">
      <div className="toolbar-buttons">
        {FORMAT_BUTTONS.map((btn: FormatButton) => (
          <button
            key={btn.type}
            className="toolbar-btn"
            title={btn.title}
            onClick={() => onFormat(btn.type)}
            aria-label={btn.title}
          >
            {btn.label}
          </button>
        ))}
      </div>
      <div className="toolbar-stats" aria-live="polite">
        <span className="stat">
          <span className="stat-value">{wordCount}</span>
          <span className="stat-label"> words</span>
        </span>
        <span className="stat-divider">·</span>
        <span className="stat">
          <span className="stat-value">{charCount}</span>
          <span className="stat-label"> chars</span>
        </span>
      </div>
    </div>
  )
}
