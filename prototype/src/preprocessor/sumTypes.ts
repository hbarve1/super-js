// Regex for SJS sum type declarations:
// type Name<TypeParams?> = Variant1(fields?) | Variant2(fields?) | Variant3 { f: T } | ...
// A "sum type variant" is one that uses Constructor(args) form, struct form, or PascalCase.
// Plain `string | number` unions are NOT sum types — left untouched.

const SUM_TYPE_LINE = /^type\s+(\w+)(<[^>]+>)?\s*=\s*(.*)/

interface StructField {
  name: string
  type: string
}

interface Variant {
  name: string
  fields: string[]           // positional (tuple) form: ["T", "E"] or []
  namedFields?: StructField[] // struct form: [{ name: "radius", type: "number" }]
  isStruct: boolean
}

// Split by | at brace/angle bracket depth 0
function splitByPipe(rhs: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of rhs) {
    if (ch === '{' || ch === '(' || ch === '<') depth++
    else if (ch === '}' || ch === ')' || ch === '>') depth--
    if (ch === '|' && depth === 0) {
      parts.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

function parseStructFields(body: string): StructField[] {
  // Parse "field1: Type1, field2: Type2" (or semicolons)
  const fields: StructField[] = []
  const entries = body.split(/[,;]/).map(s => s.trim()).filter(Boolean)
  for (const entry of entries) {
    const idx = entry.indexOf(':')
    if (idx === -1) continue
    const name = entry.slice(0, idx).trim()
    const type = entry.slice(idx + 1).trim()
    if (name && type) fields.push({ name, type })
  }
  return fields
}

function parseVariants(rhs: string): Variant[] | null {
  const parts = splitByPipe(rhs)
  const variants: Variant[] = []
  let hasTupleOrStructVariant = false

  for (const part of parts) {
    // Struct variant: "Circle { radius: number }"
    const structMatch = part.match(/^(\w+)\s*\{([^}]*)\}$/)
    if (structMatch) {
      const namedFields = parseStructFields(structMatch[2])
      variants.push({ name: structMatch[1], fields: [], namedFields, isStruct: true })
      hasTupleOrStructVariant = true
      continue
    }

    // Tuple variant: "Ok(T)" or "Err(E)"
    const tupleMatch = part.match(/^(\w+)\(([^)]*)\)$/)
    if (tupleMatch) {
      const fields = tupleMatch[2].split(',').map(f => f.trim()).filter(Boolean)
      variants.push({ name: tupleMatch[1], fields, namedFields: undefined, isStruct: false })
      hasTupleOrStructVariant = true
      continue
    }

    // Unit variant: "None" (PascalCase)
    if (/^\w+$/.test(part)) {
      variants.push({ name: part, fields: [], namedFields: undefined, isStruct: false })
      continue
    }

    // Anything else (e.g. plain `string | number`) — not a sum type
    return null
  }

  // Only treat as a sum type if at least one tuple/struct variant OR all PascalCase.
  if (!hasTupleOrStructVariant) {
    const allCapitalized = variants.every(v => /^[A-Z]/.test(v.name))
    if (!allCapitalized) return null
  }

  return variants
}

// Extract only the type params that are actually used in the variant's fields
function filterTypeParams(typeParams: string, fields: string[]): string {
  if (!typeParams) return ''
  const inner = typeParams.slice(1, -1) // strip < >
  const allParams = inner.split(',').map(p => p.trim().split(/\s+/)[0])
  const used = allParams.filter(p => fields.some(f => f === p || f.includes(p)))
  if (used.length === 0) return ''
  const paramDefs = inner.split(',').map(p => p.trim())
  const usedDefs = paramDefs.filter(def => used.includes(def.split(/\s+/)[0]))
  return `<${usedDefs.join(', ')}>`
}

function variantToTS(v: Variant, typeParams: string): string {
  if (v.isStruct && v.namedFields) {
    const fieldTypeStrs = v.namedFields.map(f => f.type)
    const tp = filterTypeParams(typeParams, fieldTypeStrs)
    const bareTP = tp ? tp.replace(/\s+extends\s+[^,>]+/g, '') : ''
    const returnType = `${v.name}${bareTP}`

    const fieldEntries = v.namedFields.map(f => `${f.name}: ${f.type}`).join('; ')
    const fieldPart = fieldEntries ? `; ${fieldEntries}` : ''
    const typeDecl = `type ${v.name}${tp} = { _tag: "${v.name}"${fieldPart} }`

    if (v.namedFields.length === 0) {
      const ctor = `const ${v.name} = (): ${returnType} => ({ _tag: "${v.name}" as const })`
      return `${typeDecl}\n${ctor}`
    }

    const ctorParams = v.namedFields.map(f => `${f.name}: ${f.type}`).join(', ')
    const ctorBodyArgs = v.namedFields.map(f => f.name).join(', ')
    const ctor = `const ${v.name} = ${tp}(${ctorParams}): ${returnType} => ({ _tag: "${v.name}" as const, ${ctorBodyArgs} })`
    return `${typeDecl}\n${ctor}`
  }

  // Tuple / unit variant (original behaviour)
  const tp = filterTypeParams(typeParams, v.fields)
  const fieldEntries = v.fields.map((f, i) => `_${i}: ${f}`).join('; ')
  const fieldPart = fieldEntries ? `; ${fieldEntries}` : ''
  const typeDecl = `type ${v.name}${tp} = { _tag: "${v.name}"${fieldPart} }`

  const ctorParams = v.fields.map((f, i) => `_${i}: ${f}`).join(', ')
  const ctorArgs = v.fields.map((_, i) => `_${i}`).join(', ')
  const ctorArgsPart = ctorArgs ? `, ${ctorArgs}` : ''
  const bareTP = tp ? tp.replace(/\s+extends\s+[^,>]+/g, '') : ''
  const returnType = `${v.name}${bareTP}`
  const ctor = v.fields.length === 0
    ? `const ${v.name} = (): ${returnType} => ({ _tag: "${v.name}" as const })`
    : `const ${v.name} = ${tp}(${ctorParams}): ${returnType} => ({ _tag: "${v.name}" as const${ctorArgsPart} })`

  return `${typeDecl}\n${ctor}`
}

export function transformSumTypes(source: string): string {
  return source.split('\n').map(line => {
    const m = line.match(SUM_TYPE_LINE)
    if (!m) return line

    const [, name, rawTP = '', rhs] = m
    const typeParams = rawTP.trim()
    const variants = parseVariants(rhs.trim())
    if (!variants || variants.length < 1) return line

    const variantLines = variants.map(v => variantToTS(v, typeParams)).join('\n')
    const variantRefs = variants.map(v => {
      const fieldTypeStrs = v.isStruct && v.namedFields
        ? v.namedFields.map(f => f.type)
        : v.fields
      const tp = filterTypeParams(typeParams, fieldTypeStrs)
      const bareTP = tp ? tp.replace(/\s+extends\s+[^,>]+/g, '') : ''
      return `${v.name}${bareTP}`
    }).join(' | ')
    const typeAlias = `type ${name}${typeParams} = ${variantRefs}`
    return `${variantLines}\n${typeAlias}`
  }).join('\n')
}
