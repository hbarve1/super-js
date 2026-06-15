'use client'

import { useState } from 'react'

interface CopyCommandProps {
  command?: string
  className?: string
}

/** Terminal-style install command with a copy button. */
export function CopyCommand({ command = 'npm i -g superjs', className = '' }: CopyCommandProps) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    void navigator.clipboard.writeText(command).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      className={`inline-flex items-center gap-3 rounded-lg border border-white/10 bg-[#0d1117] px-4 py-2.5 font-mono text-sm ${className}`}
    >
      <span className="select-none text-white/40">$</span>
      <code className="text-[#f8fafc]">{command}</code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied install command' : 'Copy install command'}
        className="ml-1 rounded text-white/50 transition-colors hover:text-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
      >
        {copied ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        )}
      </button>
    </div>
  )
}
