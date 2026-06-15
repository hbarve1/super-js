import { transform } from '@superjs/compiler'

/**
 * Compile endpoint for the playground. Runs on the Node.js runtime (not edge):
 * `@superjs/compiler` reaches `node:crypto` for config hashing.
 *
 * POST { source } → { output, errors: {message,line?}[], diagnostics: rich[] }
 * `diagnostics` carry 1-based line + 1-based column spans for editor markers.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request): Promise<Response> {
  let source = ''
  try {
    const body = (await req.json()) as { source?: unknown }
    source = typeof body.source === 'string' ? body.source : ''
  } catch {
    return Response.json({ output: '', errors: [{ message: 'Invalid JSON body' }], diagnostics: [] }, { status: 400 })
  }

  try {
    const result = await transform(source, 'playground.sjs', { sourceMap: 'none' })
    const errors = result.diagnostics.map((d) => ({
      message: `${d.code}: ${d.message}`,
      line: d.span?.start?.line,
    }))
    // Span: 1-based line, 0-based column → Monaco wants 1-based columns.
    const diagnostics = result.diagnostics.map((d) => {
      const start = d.span?.start
      const end = d.span?.end ?? start
      return {
        code: d.code,
        severity: d.severity,
        message: d.message,
        startLine: start?.line ?? 1,
        startColumn: (start?.column ?? 0) + 1,
        endLine: end?.line ?? start?.line ?? 1,
        endColumn: (end?.column ?? start?.column ?? 0) + 1,
      }
    })
    return Response.json({ output: result.code ?? '', errors, diagnostics })
  } catch (e) {
    return Response.json({
      output: '',
      errors: [{ message: e instanceof Error ? e.message : 'Compilation failed' }],
      diagnostics: [],
    })
  }
}
