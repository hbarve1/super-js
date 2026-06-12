'use client'

import { useEffect, useRef } from 'react'

interface PagefindUICtor {
  new (opts: { element: string; showSubResults?: boolean }): unknown
}

export default function SearchButton() {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // Pagefind only exists after the production build (postbuild step); in dev
    // the script 404s and this is a silent no-op.
    const tryInit = () => {
      const PagefindUI = (window as unknown as { PagefindUI?: PagefindUICtor }).PagefindUI
      if (PagefindUI) new PagefindUI({ element: '#search', showSubResults: true })
    }

    const script = document.createElement('script')
    script.src = '/pagefind/pagefind-ui.js'
    script.onload = tryInit
    script.onerror = () => {
      /* not built yet — dev mode */
    }
    document.head.appendChild(script)
  }, [])

  return <div id="search" className="mb-4" />
}
