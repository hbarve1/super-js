import { transform } from '@superjs/compiler'

/**
 * Compile endpoint for the playground. Runs on the Node.js runtime (not edge):
 * `@superjs/compiler` reaches `node:crypto` for config hashing, and Cloudflare
 * Pages serves this with `nodejs_compat` enabled (see wrangler.toml).
 *
 * POST { source: string } → { output: string, errors: { message, line? }[] }
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request): Promise<Response> {
  let source = ''
  try {
    const body = (await req.json()) as { source?: unknown }
    source = typeof body.source === 'string' ? body.source : ''
  } catch {
    return Response.json({ output: '', errors: [{ message: 'Invalid JSON body' }] }, { status: 400 })
  }

  try {
    const result = await transform(source, 'playground.sjs', { sourceMap: 'none' })
    const errors = result.diagnostics.map((d) => ({
      message: `${d.code}: ${d.message}`,
      line: d.span?.start?.line,
    }))
    return Response.json({ output: result.code ?? '', errors })
  } catch (e) {
    return Response.json({
      output: '',
      errors: [{ message: e instanceof Error ? e.message : 'Compilation failed' }],
    })
  }
}
