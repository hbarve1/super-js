export const runtime = 'edge'

interface CompileResponse {
  output: string
  errors: Array<{ message: string; line?: number }>
}

function transpileSJS(source: string): CompileResponse {
  const errors: Array<{ message: string; line?: number }> = []
  let output = source

  try {
    // Strip nullable type suffix: string? → string (in type positions)
    output = output.replace(/(\w+)\?(\s*[=,);>\]])/g, '$1$2')

    // Transform sum type declarations: type Result<T,E> = Ok(T) | Err(E)
    // → const Result = { Ok: (v) => ({ tag: 'Ok', value: v }), Err: (e) => ({ tag: 'Err', value: e }) }
    output = output.replace(
      /type\s+(\w+)(?:<[^>]*>)?\s*=\s*((?:\w+\([^)]*\)\s*\|?\s*)+);?/g,
      (_match, typeName, variants) => {
        const variantNames = [...variants.matchAll(/(\w+)\(/g)].map((m) => m[1])
        const entries = variantNames
          .map((v) => `  ${v}: (value) => ({ tag: '${v}', value })`)
          .join(',\n')
        return `const ${typeName} = {\n${entries}\n}`
      }
    )

    // Transform match expressions:
    // match expr { Ok(v) => body, Err(e) => body2 }
    output = output.replace(
      /match\s+(\w+)\s*\{([^}]+)\}/g,
      (_match, expr, arms) => {
        const armList = arms
          .trim()
          .split(',')
          .map((arm: string) => arm.trim())
          .filter(Boolean)
        const cases = armList
          .map((arm: string) => {
            const m = arm.match(/(\w+)\((\w+)\)\s*=>\s*(.+)/)
            if (m) {
              return `  case '${m[1]}': { const ${m[2]} = ${expr}.value; return ${m[3]}; }`
            }
            const def = arm.match(/_\s*=>\s*(.+)/)
            if (def) return `  default: return ${def[1]};`
            return `  // unrecognized arm: ${arm}`
          })
          .join('\n')
        return `(() => { switch (${expr}.tag) {\n${cases}\n} })()`
      }
    )

    // Strip inline type annotations: const x: string = → const x =
    output = output.replace(/:\s*[A-Z][A-Za-z<>\[\]|&\s,]*(?=\s*[=,);{])/g, '')
    output = output.replace(/:\s*(?:string|number|boolean|void|null|undefined|any|dynamic|never|unknown)(?:\[\])*/g, '')

    // Transform Ok(v) / Err(e) standalone calls not inside match
    output = output.replace(/\bOk\(([^)]+)\)/g, "{ tag: 'Ok', value: $1 }")
    output = output.replace(/\bErr\(([^)]+)\)/g, "{ tag: 'Err', value: $1 }")

    // Remove type keyword lines that weren't transformed (simple aliases)
    output = output.replace(/^type\s+\w+\s*=\s*[^{][^\n]*\n/gm, '')

    // Normalize multiple blank lines
    output = output.replace(/\n{3,}/g, '\n\n').trim()
  } catch (e) {
    errors.push({ message: `Compile error: ${e instanceof Error ? e.message : String(e)}` })
    return { output: '', errors }
  }

  return { output, errors }
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body || typeof (body as Record<string, unknown>).source !== 'string') {
    return Response.json({ error: 'Missing source' }, { status: 400 })
  }

  const result = transpileSJS((body as { source: string }).source)
  return Response.json(result)
}
