interface NestedPattern {
  field: string       // outer field name (e.g. "inner")
  tag: string         // inner tag to match (e.g. "Err")
  innerBinding: string // binding inside inner pattern, e.g. "msg" or "{ message }"
  isTuple: boolean    // true → bind to _0 (tuple variant), false → struct destructure
}

interface MatchArm {
  tag: string
  binding: string           // simple { field1, field2 } destructuring (no nested constructors)
  nestedPatterns: NestedPattern[]
  guard: string             // optional guard condition, e.g. "value > 0" or ""
  body: string
  isWildcard: boolean
}

// Split a string by commas at depth 0 (ignoring commas inside {}, (), <>)
function splitAtDepth0(s: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of s) {
    if (ch === '{' || ch === '(' || ch === '<') depth++
    else if (ch === '}' || ch === ')' || ch === '>') depth--
    if (ch === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

// Parse the content between braces in a struct pattern, e.g. "{ inner: Err(msg), other }".
// Returns the simple binding (for destructuring) and any nested constructor patterns.
function parseStructContent(content: string): { plainBinding: string; nestedPatterns: NestedPattern[] } {
  // Strip surrounding braces/whitespace
  const inner = content.trim().replace(/^\{/, '').replace(/\}$/, '').trim()
  const fields = splitAtDepth0(inner)
  const plainFields: string[] = []
  const nestedPatterns: NestedPattern[] = []

  for (const field of fields) {
    // Detect "fieldName: TagName(binding)" — nested tuple variant
    const nestedTuple = field.match(/^(\w+)\s*:\s*(\w+)\(([^)]*)\)$/)
    // Detect "fieldName: TagName({ ... })" — nested struct variant
    const nestedStruct = field.match(/^(\w+)\s*:\s*(\w+)\((\{[^}]*\})\)$/)
    if (nestedStruct) {
      const [, fieldName, tag, innerBind] = nestedStruct
      plainFields.push(fieldName)
      nestedPatterns.push({ field: fieldName, tag, innerBinding: innerBind.trim(), isTuple: false })
    } else if (nestedTuple) {
      const [, fieldName, tag, innerBind] = nestedTuple
      plainFields.push(fieldName)
      nestedPatterns.push({ field: fieldName, tag, innerBinding: innerBind.trim(), isTuple: true })
    } else {
      plainFields.push(field.trim())
    }
  }

  return {
    plainBinding: `{ ${plainFields.join(', ')} }`,
    nestedPatterns,
  }
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
      arms.push({ tag: '_', binding: '', nestedPatterns: [], guard: '', body, isWildcard: true })
      continue
    }

    // Check for guard: `Pattern if condition` — find `if` at depth 0
    let guard = ''
    let pattern = patternPart
    const ifIdx = findGuardIf(patternPart)
    if (ifIdx !== -1) {
      pattern = patternPart.slice(0, ifIdx).trim()
      guard = patternPart.slice(ifIdx + 2).trim()
    }

    // Match Tag({ ... }) — struct or nested pattern
    const structMatch = pattern.match(/^(\w+)\((\{.*\})\)$/)
    const tupleMatch = pattern.match(/^(\w+)\(([^)]*)\)$/)
    const unitMatch = pattern.match(/^(\w+)$/)

    if (structMatch) {
      const { plainBinding, nestedPatterns } = parseStructContent(structMatch[2])
      arms.push({ tag: structMatch[1], binding: plainBinding, nestedPatterns, guard, body, isWildcard: false })
    } else if (tupleMatch) {
      arms.push({ tag: tupleMatch[1], binding: tupleMatch[2].trim(), nestedPatterns: [], guard, body, isWildcard: false })
    } else if (unitMatch) {
      arms.push({ tag: unitMatch[1], binding: '', nestedPatterns: [], guard, body, isWildcard: false })
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

// Build the body lines for a single arm, accounting for nested patterns.
function buildArmLines(arm: MatchArm): string[] {
  const lines: string[] = []
  const destructure = arm.binding ? `const ${arm.binding} = __m; ` : ''

  if (arm.nestedPatterns.length > 0) {
    // Emit outer destructure
    lines.push(`  ${destructure}`)
    // Emit nested checks: chain if statements
    let indent = '  '
    for (const np of arm.nestedPatterns) {
      lines.push(`${indent}if (${np.field}._tag === "${np.tag}") {`)
      indent += '  '
      if (np.isTuple && np.innerBinding) {
        // Positional tuple binding: const msg = field._0
        lines.push(`${indent}const ${np.innerBinding} = ${np.field}._0;`)
      } else if (!np.isTuple && np.innerBinding) {
        // Struct binding: const { message } = field
        lines.push(`${indent}const ${np.innerBinding} = ${np.field};`)
      }
    }
    // Inner body with guard
    if (arm.guard) {
      lines.push(`${indent}if (${arm.guard}) { return ${arm.body} }`)
    } else {
      lines.push(`${indent}return ${arm.body}`)
    }
    // Close nested ifs
    for (let i = arm.nestedPatterns.length - 1; i >= 0; i--) {
      indent = indent.slice(2)
      lines.push(`${indent}}`)
    }
    lines.push(`  break`)
    return lines
  }

  // No nested patterns — original logic
  if (arm.guard) {
    lines.push(`  ${destructure}if (${arm.guard}) { return ${arm.body} }`)
  } else {
    lines.push(`  ${destructure}return ${arm.body}`)
  }
  return lines
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
      lines.push(...buildArmLines(arm))
    }
    // If all arms have nested patterns or guards, add break to fall through to default
    const hasUnguardedNoNested = tagArms.some(a => !a.guard && a.nestedPatterns.length === 0)
    if (!hasUnguardedNoNested) {
      // break is already emitted by buildArmLines for nested arms; don't double-add
      const lastLine = lines[lines.length - 1]?.trim()
      if (lastLine !== 'break') {
        lines.push(`  break`)
      }
    }
    cases.push(`  case "${tag}": {\n${lines.join('\n')}\n  }`)
  }

  if (wildcardArm) {
    cases.push(`  default: { return ${wildcardArm.body} }`)
  } else {
    cases.push(`  default: throw new Error(\`[SJS] Non-exhaustive pattern on \${JSON.stringify((__m as any)._tag)}\`)`)
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

  // Multi-pass: each pass replaces only innermost match blocks (those whose bodies
  // don't contain nested match expressions). This handles SJS3 nested patterns.
  let result = source
  let prev = ''
  while (result !== prev && result.includes('match ')) {
    prev = result
    const blocks = findMatchBlocks(result)
    if (blocks.length === 0) break

    // Process from right to left, but only blocks whose body has no nested 'match '
    for (let k = blocks.length - 1; k >= 0; k--) {
      const b = blocks[k]
      const body = result.slice(b.bodyStart, b.bodyEnd)
      // Skip blocks that still contain nested match expressions — handle them next pass
      if (body.includes('match ')) continue
      const expr = result.slice(b.exprStart, b.exprEnd).trim()
      const arms = parseArms(body)
      if (arms.length === 0) continue
      const replacement = buildSwitch(expr, arms)
      result = result.slice(0, b.start) + replacement + result.slice(b.bodyEnd + 1)
      // After replacing one block, re-scan from scratch for this pass
      break
    }
  }
  return result
}
