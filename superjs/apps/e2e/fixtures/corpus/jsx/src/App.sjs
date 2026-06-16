// Main App component — wires editor, preview, and toolbar together

type MarkdownState {
  raw: string
  rendered: string
  wordCount: number
  charCount: number
}

const INITIAL_CONTENT: string = `# Welcome to the Markdown Editor

This editor is built with **Super.js** — a typed superset of JavaScript that compiles to ES2022.

## Features

- Full **type annotations** on all props and state
- Live **preview** with HTML rendering
- Toolbar with common formatting shortcuts
- Word and character **count**

## Code Example

\`\`\`
function greet(name: string): string {
  return \`Hello, \${name}!\`
}
\`\`\`

## Why Super.js?

Super.js lets you write typed JavaScript today, without a separate compile step
or a framework lock-in. It embraces *gradual typing* — add types where they help,
skip them where they don't.

> Type safety shouldn't cost you developer experience.

---

Start editing this text to see the live preview update!
`

function renderMarkdown(text: string): string {
  let html: string = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr />')
    .replace(/^(?!<[hH\d]|<li|<pre|<blockquote|<hr)(.+)$/gm, '<p>$1</p>')
  html = html.replace(/(<li>[\s\S]+?<\/li>)/g, '<ul>$1</ul>')
  html = html.replace(/<\/ul>\s*<ul>/g, '')
  return html
}

function countWords(text: string): number {
  const trimmed: string = text.trim()
  if (trimmed.length === 0) return 0
  return trimmed.split(/\s+/).length
}

function insertFormat(type: string, current: string): string {
  const formats: { [key: string]: string } = {
    bold: '**bold text**',
    italic: '*italic text*',
    heading: '## Heading',
    code: '`inline code`',
    codeblock: '```\ncode block\n```',
    list: '- list item',
    quote: '> blockquote',
    hr: '\n---\n',
  }
  const snippet: string = formats[type] || ''
  return current + (current.endsWith('\n') || current === '' ? '' : '\n') + snippet
}

function App() {
  const [raw, setRaw] = React.useState<string>(INITIAL_CONTENT)
  const [rendered, setRendered] = React.useState<string>(renderMarkdown(INITIAL_CONTENT))
  const [wordCount, setWordCount] = React.useState<number>(countWords(INITIAL_CONTENT))
  const [charCount, setCharCount] = React.useState<number>(INITIAL_CONTENT.length)
  const [darkMode, setDarkMode] = React.useState<boolean>(false)

  React.useEffect(() => {
    document.body.classList.toggle('dark', darkMode)
  }, [darkMode])

  function handleChange(text: string): void {
    setRaw(text)
    setRendered(renderMarkdown(text))
    setWordCount(countWords(text))
    setCharCount(text.length)
  }

  function handleFormat(type: string): void {
    const next: string = insertFormat(type, raw)
    handleChange(next)
  }

  return (
    <div className={`app ${darkMode ? 'dark' : ''}`}>
      <header className="app-header">
        <h1 className="app-title">
          <span className="brand">Super.js</span> Markdown Editor
        </h1>
        <button
          className="theme-toggle"
          onClick={() => setDarkMode(!darkMode)}
          aria-label="Toggle dark mode"
        >
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </header>

      <div className="toolbar-wrapper">
        <Toolbar
          onFormat={handleFormat}
          wordCount={wordCount}
          charCount={charCount}
        />
      </div>

      <main className="editor-layout">
        <Editor
          value={raw}
          onChange={handleChange}
          onFormat={handleFormat}
        />
        <Preview html={rendered} />
      </main>
    </div>
  )
}

// Mount
const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<App />)
