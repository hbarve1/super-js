interface MatchArm {
  tag: string
  binding: string      // destructured binding e.g. "{ v }" or "" for unit
  guard: string        // optional guard condition, e.g. "value > 0" or ""
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
    const patternPart = part.slice(0, arrowIdx).trim()
    const body = part.slice(arrowIdx + 2).trim()

    if (patternPart === '_') {
      arms.push({ tag: '_', binding: '', guard: '', body, isWildcard: true })
      continue
    }

    // Check for guard: `Pattern if condition`
    // Find `if` keyword at depth 0 (not inside parens/braces)
    let guard = ''
    let pattern = patternPart
    const ifIdx = findGuardIf(patternPart)
    if (ifIdx !== -1) {
      pattern = patternPart.slice(0, ifIdx).trim()
      guard = patternPart.slice(ifIdx + 2).trim()
    }

    // SJS3: Nested pattern — "Outer({ field: Inner(binding) })"
    // We detect if there's a nested match inside the binding
    const structMatch = pattern.match(/^(\w+)\((\{[^}]*\})\)$/)
    const unitMatch = pattern.match(/^(\w+)$/)

    if (structMatch) {
      arms.push({ tag: structMatch[1], binding: structMatch[2], guard, body, isWildcard: false })
    } else if (unitMatch) {
      arms.push({ tag: unitMatch[1], binding: '', guard, body, isWildcard: false })
    }
  }
  return arms
}

function findGuardIf(pattern: string): number {
  let depth = 0
  let i = 0
  while (i < pattern.length) {
    const ch = pattern[i]
    if (ch === '(' || ch === '{') depth++
    else if (ch === ')' || ch === '}') depth--
    else if (depth === 0 && pattern.slice(i).match(/^\bif\b/)) {
      return i
    }
    i++
  }
  return -1
}

function buildSwitch(expr: string, arms: MatchArm[]): string {
  // Group arms by tag to handle multiple arms with same tag (guarded arms)
  const tagGroups = new Map<string, MatchArm[]>()
  let wildcardArm: MatchArm | null = null

  for (const arm of arms) {
    if (arm.isWildcard) {
      wildcardArm = arm
      continue
    }
    if (!tagGroups.has(arm.tag)) tagGroups.set(arm.tag, [])
    tagGroups.get(arm.tag)!.push(arm)
  }

  const cases: string[] = []

  for (const [tag, tagArms] of tagGroups) {
    const lines: string[] = []
    for (const arm of tagArms) {
      const destructure = arm.binding ? `const ${arm.binding} = __m; ` : ''
      if (arm.guard) {
        // Guarded arm: if (condition) { return body }
        lines.push(`  ${destructure}if (${arm.guard}) { return ${arm.body} }`)
      } else {
        // Unguarded arm: final return
        lines.push(`  ${destructure}return ${arm.body}`)
      }
    }
    // If all arms are guarded (no unguarded fallthrough), add a break to let execution
    // fall through to the default case
    const hasUnguarded = tagArms.some(a => !a.guard)
    if (!hasUnguarded) {
      lines.push(`  break`)
    }
    cases.push(`  case "${tag}": {\n${lines.join('\n')}\n  }`)
  }

  if (wildcardArm) {
    cases.push(`  default: { return ${wildcardArm.body} }`)
  } else {
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
