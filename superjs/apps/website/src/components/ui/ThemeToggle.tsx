'use client'

import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

function current(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

/** Light/dark toggle. Persists the choice to localStorage; the no-flash script
 *  in the document head applies it before paint. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setTheme(current())
    setMounted(true)
  }, [])

  const toggle = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    if (next === 'light') document.documentElement.setAttribute('data-theme', 'light')
    else document.documentElement.removeAttribute('data-theme')
    try {
      localStorage.setItem('theme', next)
    } catch {
      /* ignore unavailable storage */
    }
    setTheme(next)
  }

  // Avoid an icon mismatch between SSR (always dark) and the client's stored theme.
  const isLight = mounted && theme === 'light'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
      title={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
      className={`rounded p-2 text-text-muted transition-colors hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 ${className}`}
    >
      {/* Sun when in light mode (click → dark), moon when in dark mode (click → light). */}
      {isLight ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  )
}
