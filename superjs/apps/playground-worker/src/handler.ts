import { runCompiled, type RunMode } from './runner.js'

type TransformFn = (
  source: string,
  filename: string,
  opts: { sourceMap: 'none' },
) => Promise<{ code?: string; diagnostics: Array<{ code: string; severity: string; message: string; span?: { start?: { line: number; column: number }; end?: { line: number; column: number } } }> }>

export async function compileAndRun(
  code: string,
  mode: RunMode,
  transform: TransformFn,
): Promise<{ status: number; body: Record<string, unknown> }> {
  try {
    const compiled = await transform(code, 'playground.sjs', { sourceMap: 'none' })
    const errors = compiled.diagnostics.map((d) => ({
      message: `${d.code}: ${d.message}`,
      line: d.span?.start?.line,
    }))
    const diagnostics = compiled.diagnostics.map((d) => {
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

    if (errors.length > 0) {
      return {
        status: 200,
        body: {
          compiledSource: compiled.code ?? '',
          consoleLogs: [],
          errors,
          diagnostics,
          timingMs: 0,
        },
      }
    }

    const run = await runCompiled(compiled.code ?? '', mode)
    return {
      status: 200,
      body: {
        compiledSource: compiled.code ?? '',
        consoleLogs: run.consoleLogs,
        errors: run.runtimeError ? [{ message: run.runtimeError }] : [],
        diagnostics: [],
        timingMs: run.timingMs,
        runtimeError: run.runtimeError,
      },
    }
  } catch (e) {
    return {
      status: 500,
      body: {
        compiledSource: '',
        consoleLogs: [],
        errors: [{ message: e instanceof Error ? e.message : 'Run failed' }],
        diagnostics: [],
        timingMs: 0,
      },
    }
  }
}
