'use client'

/** Global error boundary. Renders its own <html lang> (fixes the Pagefind no-lang warning). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: '#050510',
          color: '#f8fafc',
          fontFamily: 'sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Something went wrong</h2>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: '8px 20px',
            background: '#f97316',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
