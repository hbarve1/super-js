// Shared type definitions for the Markdown Editor app

interface EditorProps {
  value: string
  onChange: (value: string) => void
  onFormat: (type: string) => void
}

interface PreviewProps {
  html: string
}

interface ToolbarProps {
  onFormat: (type: string) => void
  wordCount: number
  charCount: number
}

interface MarkdownState {
  raw: string
  rendered: string
  wordCount: number
  charCount: number
}
