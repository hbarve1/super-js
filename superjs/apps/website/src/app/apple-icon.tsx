import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

/** Apple touch icon — the orange "S" monogram on the brand gradient. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f97316, #fbbf24)',
          color: '#0d1117',
          fontSize: 120,
          fontWeight: 800,
        }}
      >
        S
      </div>
    ),
    size,
  )
}
