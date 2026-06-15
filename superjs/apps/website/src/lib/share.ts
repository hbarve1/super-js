/** URL-safe base64 codec for sharing playground source via the location hash. */

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

export function encodeCode(source: string): string {
  return toBase64Url(new TextEncoder().encode(source))
}

export function decodeCode(encoded: string): string | null {
  try {
    return new TextDecoder().decode(fromBase64Url(encoded))
  } catch {
    return null
  }
}

const HASH_KEY = 'code='

/** Read shared source from `#code=…` in the current URL, or null. */
export function readSharedCode(): string | null {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash.startsWith(HASH_KEY)) return null
  return decodeCode(hash.slice(HASH_KEY.length))
}

/** Absolute URL that reopens the playground with `source` loaded. */
export function buildShareUrl(source: string): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#${HASH_KEY}${encodeCode(source)}`
}
