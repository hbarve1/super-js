import { ImageResponse } from 'next/og'

export const alt = 'Super.js — JavaScript, Perfected.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#050510',
          display: 'flex',
          alignItems: 'center',
          padding: '60px 80px',
          gap: '60px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Left: wordmark + tagline + chips */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: '0 0 380px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
            <span style={{ fontSize: '72px', fontWeight: 900, color: '#f8fafc', letterSpacing: '-2px' }}>
              Super
            </span>
            <span style={{ fontSize: '72px', fontWeight: 900, color: '#f97316' }}>.</span>
            <span style={{ fontSize: '72px', fontWeight: 900, color: '#f8fafc', letterSpacing: '-2px' }}>
              js
            </span>
          </div>
          <div style={{ display: 'flex', fontSize: '22px', color: '#94a3b8', letterSpacing: '2px', textTransform: 'uppercase' }}>
            JavaScript, Perfected.
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            {['null-safe', 'sum types', 'match'].map((label) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  background: 'rgba(249,115,22,0.12)',
                  border: '1px solid #f97316',
                  color: '#f97316',
                  fontSize: '14px',
                  padding: '4px 14px',
                  borderRadius: '999px',
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Right: code panel */}
        <div
          style={{
            flex: 1,
            background: '#0d1117',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            padding: '32px 36px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* glow */}
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              top: '-40px',
              right: '-40px',
              width: '260px',
              height: '260px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(249,115,22,0.12), transparent 70%)',
            }}
          />
          {/* Line 1: type Result<T, E> = Ok(T) | Err(E) */}
          <div style={{ display: 'flex', fontSize: '20px', fontFamily: 'monospace', color: '#94a3b8', lineHeight: 1.7 }}>
            <span style={{ color: '#f97316' }}>type </span>
            <span style={{ color: '#fbbf24' }}>Result</span>
            <span style={{ color: '#94a3b8' }}>&lt;T, E&gt; = </span>
            <span style={{ color: '#fbbf24' }}>Ok</span>
            <span style={{ color: '#94a3b8' }}>(T) | </span>
            <span style={{ color: '#fbbf24' }}>Err</span>
            <span style={{ color: '#94a3b8' }}>(E)</span>
          </div>
          {/* Line 2: match r { */}
          <div style={{ display: 'flex', fontSize: '20px', fontFamily: 'monospace', color: '#94a3b8', lineHeight: 1.7, marginTop: '8px' }}>
            <span style={{ color: '#f97316' }}>match </span>
            <span style={{ color: '#f8fafc' }}>r </span>
            <span style={{ color: '#94a3b8' }}>{'{'}</span>
          </div>
          {/* Line 3: Ok(v) => console.log(v), */}
          <div style={{ display: 'flex', fontSize: '20px', fontFamily: 'monospace', color: '#94a3b8', lineHeight: 1.7, paddingLeft: '40px' }}>
            <span style={{ color: '#fbbf24' }}>Ok</span>
            <span style={{ color: '#94a3b8' }}>(v) =&gt; </span>
            <span style={{ color: '#86efac' }}>console.log</span>
            <span style={{ color: '#94a3b8' }}>(v),</span>
          </div>
          {/* Line 4: Err(e) => console.error(e) */}
          <div style={{ display: 'flex', fontSize: '20px', fontFamily: 'monospace', color: '#94a3b8', lineHeight: 1.7, paddingLeft: '40px' }}>
            <span style={{ color: '#fbbf24' }}>Err</span>
            <span style={{ color: '#94a3b8' }}>(e) =&gt; </span>
            <span style={{ color: '#86efac' }}>console.error</span>
            <span style={{ color: '#94a3b8' }}>(e)</span>
          </div>
          {/* Line 5: } */}
          <div style={{ display: 'flex', fontSize: '20px', fontFamily: 'monospace', color: '#94a3b8', lineHeight: 1.7 }}>
            <span style={{ color: '#94a3b8' }}>{'}'}</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
