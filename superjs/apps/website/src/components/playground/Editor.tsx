'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef } from 'react'
import type { OnMount } from '@monaco-editor/react'
import type { CompileDiagnostic } from '@/hooks/useCompiler'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

type MonacoApi = Parameters<OnMount>[1]
type EditorApi = Parameters<OnMount>[0]

interface EditorProps {
  value: string
  onChange: (value: string) => void
  onRun: () => void
  diagnostics?: CompileDiagnostic[]
}

const SEVERITY: Record<CompileDiagnostic['severity'], number> = {
  // Mirrors monaco.MarkerSeverity (Hint=1, Info=2, Warning=4, Error=8).
  hint: 1,
  info: 2,
  warning: 4,
  error: 8,
}

export function Editor({ value, onChange, onRun, diagnostics = [] }: EditorProps) {
  // Keep the latest onRun reachable from the (mount-time) Monaco command closure.
  const onRunRef = useRef(onRun)
  onRunRef.current = onRun

  const monacoRef = useRef<MonacoApi | null>(null)
  const editorRef = useRef<EditorApi | null>(null)

  // Reflect compiler diagnostics as Monaco markers (squiggles + hover).
  useEffect(() => {
    const monaco = monacoRef.current
    const editor = editorRef.current
    const model = editor?.getModel()
    if (!monaco || !model) return
    monaco.editor.setModelMarkers(
      model,
      'superjs',
      diagnostics.map((d) => ({
        severity: SEVERITY[d.severity] ?? SEVERITY.error,
        message: `${d.code}: ${d.message}`,
        startLineNumber: d.startLine,
        startColumn: d.startColumn,
        endLineNumber: d.endLine,
        // Guarantee a visible width for zero-length spans.
        endColumn: d.endLine === d.startLine && d.endColumn <= d.startColumn ? d.startColumn + 1 : d.endColumn,
      })),
    )
  }, [diagnostics])

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    if (!monaco.languages.getLanguages().some((l: { id: string }) => l.id === 'superjs')) {
      monaco.languages.register({ id: 'superjs' })
      monaco.languages.setMonarchTokensProvider('superjs', {
        keywords: ['const', 'let', 'var', 'function', 'return', 'type', 'match', 'if', 'else', 'for', 'while', 'import', 'export', 'from', 'dynamic'],
        typeKeywords: ['string', 'number', 'boolean', 'void', 'null', 'undefined', 'Ok', 'Err'],
        tokenizer: {
          root: [
            [/[a-zA-Z_$][\w$]*/, { cases: { '@keywords': 'keyword', '@typeKeywords': 'type', '@default': 'identifier' } }],
            [/\/\/.*$/, 'comment'],
            [/"([^"\\]|\\.)*"/, 'string'],
            [/'([^'\\]|\\.)*'/, 'string'],
            [/`([^`\\]|\\.)*`/, 'string'],
            [/\d+/, 'number'],
            [/[{}()[\]]/, 'delimiter'],
            [/[<>](?![-=])/, 'delimiter'],
            [/:/, 'delimiter'],
            [/\?/, 'operator'],
          ],
        },
      })
    }

    monaco.editor.defineTheme('superjs-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'f97316' },
        { token: 'type', foreground: 'fbbf24' },
        { token: 'string', foreground: '86efac' },
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'number', foreground: '67e8f9' },
      ],
      colors: {
        'editor.background': '#0d1117',
        'editor.foreground': '#f8fafc',
        'editorLineNumber.foreground': '#334155',
        'editorLineNumber.activeForeground': '#94a3b8',
        'editor.selectionBackground': '#f9731633',
        'editor.lineHighlightBackground': '#f9731610',
        'editorCursor.foreground': '#f97316',
      },
    })
    monaco.editor.setTheme('superjs-dark')

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current())
  }

  return (
    <div className="flex flex-col h-full border border-white/10 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-bg-elevated">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
          <span className="ml-2 text-xs text-text-muted font-mono">playground.sjs</span>
        </div>
        <button
          type="button"
          onClick={onRun}
          aria-keyshortcuts="Control+Enter Meta+Enter"
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-gradient-to-r from-orange-500 to-amber-400 text-white rounded hover:opacity-90 transition-opacity"
        >
          ▶ Run
          <span className="opacity-60 text-[10px]">⌘↵</span>
        </button>
      </div>
      <div className="flex-1">
        <div role="application" aria-label="Super.js code editor" className="h-full">
          <MonacoEditor
            height="100%"
            language="superjs"
            value={value}
            onChange={(v) => onChange(v ?? '')}
            onMount={handleMount}
            options={{
              fontSize: 14,
              lineHeight: 22,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              padding: { top: 16, bottom: 16 },
              fontFamily: '"Geist Mono", "Fira Code", monospace',
              fontLigatures: true,
              tabSize: 2,
            }}
          />
        </div>
      </div>
    </div>
  )
}
