'use client'

import dynamic from 'next/dynamic'
import type { OnMount } from '@monaco-editor/react'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

interface EditorProps {
  value: string
  onChange: (value: string) => void
  onRun: () => void
}

const handleEditorMount: OnMount = (editor, monaco) => {
  monaco.languages.register({ id: 'superjs' })
  monaco.languages.setMonarchTokensProvider('superjs', {
    keywords: ['const', 'let', 'var', 'function', 'return', 'type', 'match', 'if', 'else', 'for', 'while', 'import', 'export', 'from', 'dynamic'],
    typeKeywords: ['string', 'number', 'boolean', 'void', 'null', 'undefined', 'Ok', 'Err'],
    tokenizer: {
      root: [
        [/[a-zA-Z_$][\w$]*/, {
          cases: {
            '@keywords': 'keyword',
            '@typeKeywords': 'type',
            '@default': 'identifier',
          }
        }],
        [/\/\/.*$/, 'comment'],
        [/"([^"\\]|\\.)*"/, 'string'],
        [/'([^'\\]|\\.)*'/, 'string'],
        [/`([^`\\]|\\.)*`/, 'string'],
        [/\d+/, 'number'],
        [/[{}()\[\]]/, 'delimiter'],
        [/[<>](?![-=])/, 'delimiter'],
        [/:/, 'delimiter'],
        [/\?/, 'operator'],
      ]
    }
  })

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
    }
  })

  monaco.editor.setTheme('superjs-dark')

  editor.addAction({
    id: 'run-superjs',
    label: 'Run Super.js',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
    run: () => {
      editor.trigger('keyboard', 'run-superjs-external', null)
    },
  })
}

export function Editor({ value, onChange, onRun }: EditorProps) {
  return (
    <div className="flex flex-col h-full border border-white/10 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#161b22]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
          <span className="ml-2 text-xs text-[#94a3b8] font-mono">playground.sjs</span>
        </div>
        <button
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
            onMount={handleEditorMount}
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
