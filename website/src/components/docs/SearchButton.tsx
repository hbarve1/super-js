'use client'

import { useEffect, useRef } from 'react'

export default function SearchButton() {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import('/pagefind/pagefind-ui.js' as any).then((pf: any) => {
      new pf.PagefindUI({
        element: '#search',
        showSubResults: true,
      })
    }).catch(() => {
      // Not available in dev — expected
    })
  }, [])

  return <div id="search" className="mb-4" />
}
