'use client'

import { useEffect, useRef } from 'react'

export default function SearchButton() {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // Pagefind is only available after build (postbuild step)
    // In dev this is a no-op
    const tryInit = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any
      if (w.PagefindUI) {
        new w.PagefindUI({ element: '#search', showSubResults: true })
      }
    }

    const script = document.createElement('script')
    script.src = '/pagefind/pagefind-ui.js'
    script.onload = tryInit
    script.onerror = () => { /* not built yet, dev mode */ }
    document.head.appendChild(script)
  }, [])

  return <div id="search" className="mb-4" />
}
