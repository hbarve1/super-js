// Shared type definitions for the Markdown Editor app

type EditorProps {
  value: string
  onChange: (value: string) => void
  onFormat: (type: string) => void
}

type PreviewProps {
  html: string
}

type ToolbarProps {
  onFormat: (type: string) => void
  wordCount: number
  charCount: number
}

type MarkdownState {
  raw: string
  rendered: string
  wordCount: number
  charCount: number
}
