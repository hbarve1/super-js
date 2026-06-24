import { transform } from '@superjs/compiler'
import type { CompileDiagnostic, CompileError } from '@/hooks/useCompiler'
import { MAX_INPUT_BYTES, runCompiled, type RunMode } from '@/lib/sandbox-runner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000

interface RateBucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateBucket>()

function clientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'local'
  )
}

function checkRateLimit(ip: string): { ok: boolean; remaining: number; retryAfter: number } {
  const now = Date.now()
  let bucket = buckets.get(ip)
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW_MS }
    buckets.set(ip, bucket)
  }
  if (bucket.count >= RATE_LIMIT) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
    return { ok: false, remaining: 0, retryAfter }
  }
  bucket.count++
  return { ok: true, remaining: RATE_LIMIT - bucket.count, retryAfter: 0 }
}

function mapDiagnostics(result: Awaited<ReturnType<typeof transform>>): {
  errors: CompileError[]
  diagnostics: CompileDiagnostic[]
} {
  const errors = result.diagnostics.map((d) => ({
    message: `${d.code}: ${d.message}`,
    line: d.span?.start?.line,
  }))
  const diagnostics = result.diagnostics.map((d) => {
    const start = d.span?.start
    const end = d.span?.end ?? start
    return {
      code: d.code,
      severity: d.severity as CompileDiagnostic['severity'],
      message: d.message,
      startLine: start?.line ?? 1,
      startColumn: (start?.column ?? 0) + 1,
      endLine: end?.line ?? start?.line ?? 1,
      endColumn: (end?.column ?? start?.column ?? 0) + 1,
    }
  })
  return { errors, diagnostics }
}

export interface RunResponse {
  compiledSource: string
  consoleLogs: string[]
  errors: CompileError[]
  diagnostics: CompileDiagnostic[]
  timingMs: number
  runtimeError?: string
}

export async function POST(req: Request): Promise<Response> {
  const ip = clientIp(req)
  const limit = checkRateLimit(ip)
  const rateHeaders = {
    'X-RateLimit-Remaining': String(limit.remaining),
  }

  if (!limit.ok) {
    return Response.json(
      { errors: [{ message: 'Rate limit exceeded (20 requests per minute)' }] },
      { status: 429, headers: { ...rateHeaders, 'Retry-After': String(limit.retryAfter) } },
    )
  }

  let code = ''
  let mode: RunMode = 'node'
  try {
    const body = (await req.json()) as { code?: unknown; mode?: unknown }
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

  const bytes = new TextEncoder().encode(code).length
  if (bytes > MAX_INPUT_BYTES) {
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

  try {
    const compiled = await transform(code, 'playground.sjs', { sourceMap: 'none' })
    const { errors, diagnostics } = mapDiagnostics(compiled)

    if (errors.length > 0) {
      return Response.json(
        {
          compiledSource: compiled.code ?? '',
          consoleLogs: [],
          errors,
          diagnostics,
          timingMs: 0,
        } satisfies RunResponse,
        { headers: rateHeaders },
      )
    }

    const run = await runCompiled(compiled.code ?? '', mode)
    const response: RunResponse = {
      compiledSource: compiled.code ?? '',
      consoleLogs: run.consoleLogs,
      errors: run.runtimeError ? [{ message: run.runtimeError }] : [],
      diagnostics: [],
      timingMs: run.timingMs,
      runtimeError: run.runtimeError,
    }
    return Response.json(response, { headers: rateHeaders })
  } catch (e) {
    return Response.json(
      {
        compiledSource: '',
        consoleLogs: [],
        errors: [{ message: e instanceof Error ? e.message : 'Run failed' }],
        diagnostics: [],
        timingMs: 0,
      } satisfies RunResponse,
      { status: 500, headers: rateHeaders },
    )
  }
}
