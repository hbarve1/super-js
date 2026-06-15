'use client'

import { useRef, useState, type ComponentPropsWithoutRef } from 'react'

/**
 * MDX `pre` wrapper that adds a hover copy-to-clipboard button (SPEC §E-4).
 *
 * Receives the `<pre>` produced by `@shikijs/rehype` — its `className`
 * (`shiki superjs-dark`) and inline `style` (theme background/foreground)
 * are preserved so per-token highlighting survives; we only add layout
 * (padding, rounded border, scroll) and the copy button.
 */
export function CodeBlockWrapper({
  className = '',
  style,
  children,
  ...rest
}: ComponentPropsWithoutRef<'pre'>) {
  const preRef = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const text = preRef.current?.textContent ?? ''
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="relative group my-4">
      <pre
        ref={preRef}
        style={style}
        className={`overflow-x-auto p-4 rounded-lg border border-border text-sm leading-relaxed [&_code]:font-mono ${className}`}
        {...rest}
      >
        {children}
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? 'Copied!' : 'Copy code'}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 text-xs rounded bg-surface-3 hover:bg-surface-4 text-text-muted hover:text-text-primary"
      >
        {copied ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Copied
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            Copy
          </>
        )}
      </button>
    </div>
  )
}
