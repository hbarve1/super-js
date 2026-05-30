// Regex for SJS sum type declarations:
// type Name<TypeParams?> = Variant1(fields?) | Variant2(fields?) | ...
// A "sum type variant" is one that uses Constructor(args) form.
// Plain `string | number` unions are NOT sum types — left untouched.

const SUM_TYPE_LINE =
  /^type\s+(\w+)(<[^>]+>)?\s*=\s*((?:\w+(?:\([^)]*\))?\s*\|?\s*)+)$/

interface Variant {
  name: string
  fields: string[]  // e.g. ["T", "E"] or [] for unit variants
}

function parseVariants(rhs: string): Variant[] | null {
  const parts = rhs.split('|').map(s => s.trim()).filter(Boolean)
  const variants: Variant[] = []
  let hasTupleVariant = false

  for (const part of parts) {
    const tupleMatch = part.match(/^(\w+)\(([^)]*)\)$/)
    if (tupleMatch) {
      const fields = tupleMatch[2].split(',').map(f => f.trim()).filter(Boolean)
      variants.push({ name: tupleMatch[1], fields })
      hasTupleVariant = true
    } else if (/^\w+$/.test(part)) {
      variants.push({ name: part, fields: [] })
    } else {
      // Contains something that's not a simple variant — not a sum type
      return null
    }
  }

  // Only treat as a sum type if at least one variant is tuple form OR
  // all parts are PascalCase (capitalized) identifiers — not primitives.
  // Guard: if no tuple variants, ensure all parts are PascalCase (uppercase first letter).
  if (!hasTupleVariant) {
    const allCapitalized = variants.every(v => /^[A-Z]/.test(v.name))
    if (!allCapitalized) return null
  }

  return variants
}

// Extract only the type params that are actually used in the variant's fields
function filterTypeParams(typeParams: string, fields: string[]): string {
  if (!typeParams) return ''
  // Parse all param names from e.g. "<T, E>" or "<T extends Foo, E>"
  const inner = typeParams.slice(1, -1) // strip < >
  const allParams = inner.split(',').map(p => p.trim().split(/\s+/)[0]) // first word is the name
  const used = allParams.filter(p => fields.some(f => f === p || f.includes(p)))
  if (used.length === 0) return ''
  // Reconstruct with bounds from original
  const paramDefs = inner.split(',').map(p => p.trim())
  const usedDefs = paramDefs.filter(def => used.includes(def.split(/\s+/)[0]))
  return `<${usedDefs.join(', ')}>`
}

function variantToTS(v: Variant, typeParams: string): string {
  // Use only the type params relevant to this variant's fields
  const tp = filterTypeParams(typeParams, v.fields)
  const fieldEntries = v.fields.map((f, i) => `_${i}: ${f}`).join('; ')
  const fieldPart = fieldEntries ? `; ${fieldEntries}` : ''
  const typeDecl = `type ${v.name}${tp} = { _tag: "${v.name}"${fieldPart} }`

  const ctorParams = v.fields.map((f, i) => `_${i}: ${f}`).join(', ')
  const ctorArgs = v.fields.map((_, i) => `_${i}`).join(', ')
  const ctorArgsPart = ctorArgs ? `, ${ctorArgs}` : ''
  // Strip bounds from type params for the return type (e.g. <T extends X> → <T>)
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
      const tp = filterTypeParams(typeParams, v.fields)
      const bareTP = tp ? tp.replace(/\s+extends\s+[^,>]+/g, '') : ''
      return `${v.name}${bareTP}`
    }).join(' | ')
    const typeAlias = `type ${name}${typeParams} = ${variantRefs}`
    return `${variantLines}\n${typeAlias}`
  }).join('\n')
}
