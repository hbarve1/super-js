interface MatchArm {
  tag: string
  binding: string      // destructured binding e.g. "{ v }" or "" for unit
  body: string
  isWildcard: boolean
}

function parseArms(armsStr: string): MatchArm[] {
  const arms: MatchArm[] = []
  const armParts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of armsStr) {
    if (ch === '{' || ch === '(') depth++
    else if (ch === '}' || ch === ')') depth--
    if (ch === ',' && depth === 0) {
      armParts.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) armParts.push(current.trim())

  for (const part of armParts) {
    const arrowIdx = part.indexOf('=>')
    if (arrowIdx === -1) continue
    const pattern = part.slice(0, arrowIdx).trim()
    const body = part.slice(arrowIdx + 2).trim()

    if (pattern === '_') {
      arms.push({ tag: '_', binding: '', body, isWildcard: true })
      continue
    }

    const structMatch = pattern.match(/^(\w+)\((\{[^}]*\})\)$/)
    const unitMatch = pattern.match(/^(\w+)$/)

    if (structMatch) {
      arms.push({ tag: structMatch[1], binding: structMatch[2], body, isWildcard: false })
    } else if (unitMatch) {
      arms.push({ tag: unitMatch[1], binding: '', body, isWildcard: false })
    }
  }
  return arms
}

function buildSwitch(expr: string, arms: MatchArm[]): string {
  const cases = arms.map(arm => {
    if (arm.isWildcard) {
      return `  default: { return ${arm.body} }`
    }
    const destructure = arm.binding ? `const ${arm.binding} = __m; ` : ''
    return `  case "${arm.tag}": { ${destructure}return ${arm.body} }`
  })

  const hasWildcard = arms.some(a => a.isWildcard)
  if (!hasWildcard) {
    cases.push(`  default: throw new Error(\`[SJS] Non-exhaustive match on \${JSON.stringify((__m as any)._tag)}\`)`)
  }

  return `((): any => { const __m = ${expr}; switch (__m._tag) {\n${cases.join('\n')}\n}})()`
}

function findMatchBlocks(source: string): Array<{ start: number; exprStart: number; exprEnd: number; bodyStart: number; bodyEnd: number }> {
  const results = []
  const matchRe = /match\s+/g
  let m: RegExpExecArray | null
  while ((m = matchRe.exec(source)) !== null) {
    const afterKeyword = m.index + m[0].length
    // Collect the expression (everything up to the opening '{')
    let i = afterKeyword
    while (i < source.length && source[i] !== '{') i++
    if (i >= source.length) continue
    const exprEnd = i
    const bodyOpen = i
    // Walk the braces to find the matching '}'
    let depth = 1
    i++
    while (i < source.length && depth > 0) {
      if (source[i] === '{') depth++
      else if (source[i] === '}') depth--
      i++
    }
    results.push({ start: m.index, exprStart: afterKeyword, exprEnd, bodyStart: bodyOpen + 1, bodyEnd: i - 1 })
  }
  return results
}

export function transformMatch(source: string): string {
  if (!source.includes('match ')) return source
  const blocks = findMatchBlocks(source)
  if (blocks.length === 0) return source
  // Replace from right to left to preserve indices
  let result = source
  for (let k = blocks.length - 1; k >= 0; k--) {
    const b = blocks[k]
    const expr = result.slice(b.exprStart, b.exprEnd).trim()
    const body = result.slice(b.bodyStart, b.bodyEnd)
    const arms = parseArms(body)
    if (arms.length === 0) continue
    const replacement = buildSwitch(expr, arms)
    result = result.slice(0, b.start) + replacement + result.slice(b.bodyEnd + 1)
  }
  return result
}
