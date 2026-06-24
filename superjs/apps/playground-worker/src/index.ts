import { transform } from '@superjs/compiler'
import { compileAndRun } from './handler.js'

const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000
const MAX_INPUT_BYTES = 50_000

interface RateBucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateBucket>()

function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'unknown'
}

function checkRateLimit(ip: string): { ok: boolean; remaining: number; retryAfter: number } {
  const now = Date.now()
  let bucket = buckets.get(ip)
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW_MS }
    buckets.set(ip, bucket)
  }
  if (bucket.count >= RATE_LIMIT) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  bucket.count++
  return { ok: true, remaining: RATE_LIMIT - bucket.count, retryAfter: 0 }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    if (request.method !== 'POST' || url.pathname !== '/run') {
      return new Response('Not found', { status: 404, headers: CORS_HEADERS })
    }

    const ip = clientIp(request)
    const limit = checkRateLimit(ip)
    const rateHeaders = {
      ...CORS_HEADERS,
      'X-RateLimit-Remaining': String(limit.remaining),
    }

    if (!limit.ok) {
      return Response.json(
        { errors: [{ message: 'Rate limit exceeded (20 requests per minute)' }] },
        { status: 429, headers: { ...rateHeaders, 'Retry-After': String(limit.retryAfter) } },
      )
    }

    let code = ''
    let mode: 'node' | 'workers' | 'lambda' = 'node'
    try {
      const body = (await request.json()) as { code?: unknown; mode?: unknown }
      code = typeof body.code === 'string' ? body.code : ''
      if (body.mode === 'workers' || body.mode === 'lambda' || body.mode === 'node') {
        mode = body.mode
      }
    } catch {
      return Response.json(
        { compiledSource: '', consoleLogs: [], errors: [{ message: 'Invalid JSON body' }], diagnostics: [], timingMs: 0 },
        { status: 400, headers: rateHeaders },
      )
    }

    if (new TextEncoder().encode(code).length > MAX_INPUT_BYTES) {
      return Response.json(
        {
          compiledSource: '',
          consoleLogs: [],
          errors: [{ message: `Input exceeds ${MAX_INPUT_BYTES} byte limit` }],
          diagnostics: [],
          timingMs: 0,
        },
        { status: 413, headers: rateHeaders },
      )
    }

    const result = await compileAndRun(code, mode, transform)
    return Response.json(result.body, { status: result.status, headers: rateHeaders })
  },
}
