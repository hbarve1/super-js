export type RunMode = 'node' | 'workers' | 'lambda'

export interface RunResult {
  consoleLogs: string[]
  runtimeError?: string
  timingMs: number
}

export const RUN_TIMEOUT_MS = 5_000

function formatArgs(args: unknown[]): string {
  return args
    .map((a) => {
      try {
        return typeof a === 'string' ? a : JSON.stringify(a)
      } catch {
        return String(a)
      }
    })
    .join(' ')
}

export function stripExportKeywords(source: string): string {
  return source.replace(/^export\s+(?=async\s+function|function|const|let|class)/gm, '')
}

function makeConsole(logs: string[]) {
  return {
    log: (...args: unknown[]) => logs.push(formatArgs(args)),
    info: (...args: unknown[]) => logs.push(formatArgs(args)),
    warn: (...args: unknown[]) => logs.push(`[warn] ${formatArgs(args)}`),
    error: (...args: unknown[]) => logs.push(`[error] ${formatArgs(args)}`),
  }
}

export async function runCompiled(compiledSource: string, mode: RunMode): Promise<RunResult> {
  const logs: string[] = []
  const capture = makeConsole(logs)
  const start = performance.now()
  let runtimeError: string | undefined
  const code = stripExportKeywords(compiledSource)

  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Execution timed out after ${RUN_TIMEOUT_MS}ms`)), RUN_TIMEOUT_MS)
  })

  const exec = async () => {
    if (mode === 'workers') {
      const body = `
${code}
if (typeof fetch === 'function') {
  const __req = new Request('https://example.com/health');
  const __res = await fetch(__req);
  console.log('Response status:', __res.status);
  console.log('Response body:', await __res.text());
}
`
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
        ...args: string[]
      ) => (...args: unknown[]) => Promise<void>
      const fn = new AsyncFunction('Request', 'Response', 'URL', 'Headers', 'console', body)
      await fn(Request, Response, URL, Headers, capture)
      return
    }

    if (mode === 'lambda') {
      const body = `
${code}
const __event = { body: JSON.stringify({ name: 'World' }), headers: {} };
const __ctx = { functionName: 'handler', awsRequestId: 'local-1', getRemainingTimeInMillis: () => 30000 };
if (typeof handler === 'function') {
  const __result = await handler(__event, __ctx);
  console.log('Lambda result:', typeof __result === 'string' ? __result : JSON.stringify(__result));
}
`
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
        ...args: string[]
      ) => (...args: unknown[]) => Promise<void>
      const fn = new AsyncFunction('console', body)
      await fn(capture)
      return
    }

    const fn = new Function('console', code)
    fn(capture)
  }

  try {
    await Promise.race([exec(), timeout])
  } catch (e) {
    runtimeError = e instanceof Error ? e.message : String(e)
  }

  return { consoleLogs: logs, runtimeError, timingMs: performance.now() - start }
}
