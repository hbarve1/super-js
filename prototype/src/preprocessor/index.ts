import { transformSumTypes, collectUnitVariants } from './sumTypes'
import { transformMatch } from './matchExpr'
import { transformNullSafety } from './nullSafety'
import { transformAccessModifiers } from './accessModifiers'

/**
 * Transforms SJS generic constraint syntax `<T: Bound>` to TypeScript `<T extends Bound>`.
 * SJS uses `:` for constraints; TypeScript uses `extends`.
 */
function transformGenericConstraints(source: string): string {
  // Transform SJS generic constraint syntax `<T: Bound>` → `<T extends Bound>`.
  // Only process `<` that is immediately preceded by a word character (identifier),
  // which distinguishes generic type params from comparison operators like `<=`.
  const result: string[] = []
  let i = 0
  while (i < source.length) {
    const prev = i > 0 ? source[i - 1] : ''
    if (source[i] === '<' && /\w/.test(prev)) {
      // Collect the full <...> block (bracket-aware depth tracking)
      let depth = 1
      let j = i + 1
      while (j < source.length && depth > 0) {
        if (source[j] === '<') depth++
        else if (source[j] === '>') depth--
        j++
      }
      const inner = source.slice(i + 1, j - 1)
      // Transform `T: Bound` → `T extends Bound` inside the block
      const transformed = inner.replace(/\b(\w+)\s*:\s*([A-Z]\w*)/g, '$1 extends $2')
      result.push('<' + transformed + '>')
      i = j
    } else {
      result.push(source[i])
      i++
    }
  }
  return result.join('')
}

/**
 * Transforms SJS struct constructor call syntax `Name { field: value, ... }` into
 * the generated TypeScript constructor call `Name(value1, value2, ...)`.
 *
 * Must run AFTER transformSumTypes (which removes struct type definitions that look similar).
 * Does NOT transform:
 *   - Match patterns: `Circle { radius }` (no `:` in field, handled by match preprocessor)
 *   - Type definitions: `type Circle = { ... }` (has `=` between name and `{`)
 *   - TypeScript type annotations: field values that look like type names or keywords
 */
function extractStructValues(match: string, name: string, content: string): string {
  const parts = content.split(/[,;]/).map((p: string) => p.trim()).filter(Boolean)
  if (parts.some((p: string) => !p.includes(':'))) return match
  const values: string[] = []
  for (const p of parts) {
    const colonIdx = p.indexOf(':')
    const value = p.slice(colonIdx + 1).trim()
    if (/^(number|string|boolean|null|undefined|void|any|never|unknown|object|symbol|bigint)$/.test(value)) return match
    // Skip bare PascalCase identifiers (type names) but allow expressions like Date.now()
    if (/^[A-Z][a-zA-Z0-9]*$/.test(value)) return match
    values.push(value)
  }
  return `${name}(${values.join(', ')})`
}

function transformStructConstructorCalls(source: string): string {
  // Form 1: `UppercaseName { field: value, ... }` — struct literal syntax
  // Negative lookbehind avoids matching type annotations (`: Name { ... }`) and
  // function return types. Content must be single-line (no newlines) to exclude
  // multi-line interface/class bodies.
  let result = source.replace(
    /(?<!:\s*)\b([A-Z]\w*)\s*\{([^\n{}]+)\}/g,
    (match, name, content) => extractStructValues(match, name, content)
  )
  // Form 2: `UppercaseName({ field: value, ... })` — struct with explicit parens around object
  result = result.replace(
    /\b([A-Z]\w*)\(\{([^\n{}]+)\}\)/g,
    (match, name, content) => extractStructValues(match, name, content)
  )
  return result
}

export function preprocessSJS(source: string): string {
  let result = source
  result = transformNullSafety(result)
  result = transformAccessModifiers(result)
  result = transformGenericConstraints(result)
  // Collect unit variant names before transforming (so we can rewrite Name() → Name)
  const unitVariants = collectUnitVariants(result)
  result = transformSumTypes(result)
  // Unit variants are now singleton values, not functions. Rewrite explicit no-arg
  // constructor calls like None() → None so both styles compile correctly.
  if (unitVariants.size > 0) {
    const unitPat = new RegExp(`\\b(${[...unitVariants].join('|')})\\(\\)`, 'g')
    result = result.replace(unitPat, '$1')
  }
  result = transformStructConstructorCalls(result)
  result = transformMatch(result)
  return result
}
