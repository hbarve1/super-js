// Custom hook for managing markdown editor state

type MarkdownState {
  raw: string
  rendered: string
  wordCount: number
  charCount: number
}

function renderMarkdown(text: string): string {
  let html: string = text
    // Escape HTML entities first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Code blocks (must run before inline code)
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Unordered list items
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Ordered list items
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr />')
    // Paragraphs — wrap lines not already wrapped in a block tag
    .replace(/^(?!<[hH\d]|<li|<pre|<blockquote|<hr)(.+)$/gm, '<p>$1</p>')

  // Wrap consecutive <li> elements in <ul>
  html = html.replace(/(<li>[\s\S]+?<\/li>)/g, '<ul>$1</ul>')
  html = html.replace(/<\/ul>\s*<ul>/g, '')

  return html
}

function countWords(text: string): number {
  const trimmed: string = text.trim()
  if (trimmed.length === 0) return 0
  return trimmed.split(/\s+/).length
}

function useMarkdown(initialText: string): {
  state: MarkdownState
  update: (text: string) => MarkdownState
  insertFormat: (type: string, current: string) => string
} {
  const state: MarkdownState = {
    raw: initialText,
    rendered: renderMarkdown(initialText),
    wordCount: countWords(initialText),
    charCount: initialText.length,
  }

  function update(text: string): MarkdownState {
    state.raw = text
    state.rendered = renderMarkdown(text)
    state.wordCount = countWords(text)
    state.charCount = text.length
    return { ...state }
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

  return { state, update, insertFormat }
}
