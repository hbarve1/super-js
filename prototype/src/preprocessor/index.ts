import { transformSumTypes } from './sumTypes'
import { transformMatch } from './matchExpr'
import { transformNullSafety } from './nullSafety'
import { transformAccessModifiers } from './accessModifiers'

/**
 * Transform SJS-specific generic constraints `<T: Interface>` to TypeScript `<T extends Interface>`.
 * Handles nested generics like `<T: Comparable<T>>`.
 * Uses a character-by-character scan to find `<...>` blocks, then applies the substitution.
 */
function transformGenericConstraints(source: string): string {
  let result = ''
  let i = 0
  while (i < source.length) {
    if (source[i] === '<' && i > 0 && /\w/.test(source[i - 1])) {
      let depth = 1
      let j = i + 1
      while (j < source.length && depth > 0) {
        if (source[j] === '<') depth++
        else if (source[j] === '>') depth--
        j++
      }
      const inner = source.slice(i + 1, j - 1)
      const transformed = inner.replace(/\b(\w+)\s*:\s*([A-Z]\w*(?:<[^<>]*>)?)/g, '$1 extends $2')
      result += '<' + transformed + '>'
      i = j
    } else {
      result += source[i]
      i++
    }
  }
  return result
}

/**
 * Split the fields string `{ f1: v1; f2: v2 }` by commas/semicolons at depth 0,
 * returning the values in order.
 */
function extractFieldValues(fieldsStr: string): string[] {
  const values: string[] = []
  let depth = 0
  let current = ''
  for (const ch of fieldsStr) {
    if (ch === '(' || ch === '[' || ch === '{') depth++
    else if (ch === ')' || ch === ']' || ch === '}') depth--
    if ((ch === ',' || ch === ';') && depth === 0) {
      const v = current.trim()
      const colon = v.indexOf(':')
      if (colon >= 0) values.push(v.slice(colon + 1).trim())
      current = ''
    } else {
      current += ch
    }
  }
  const v = current.trim()
  if (v) {
    const colon = v.indexOf(':')
    if (colon >= 0) values.push(v.slice(colon + 1).trim())
  }
  return values
}

/**
 * Transform SJS struct constructor call syntax `Tag { field: value }` to positional calls `Tag(value)`.
 * Only matches PascalCase names followed by `{ key: value }` object literals.
 */
function transformStructConstructorCalls(source: string): string {
  // Scan character by character to find `UppercaseName { ... }` and `UppercaseName({ ... })` struct constructor calls.
  let result = ''
  let i = 0
  while (i < source.length) {
    // Check for Tag({ key: value }) pattern (struct call with wrapping parens)
    const tagParenBrace = source.slice(i).match(/^([A-Z][a-z]\w*)\(\{/)
    // Look for PascalCase identifier (≥2 chars, not single type params like T/U/K) followed by '{'
    const tagMatch = !tagParenBrace && source.slice(i).match(/^([A-Z][a-z]\w*)\s*\{/)

    if (tagParenBrace) {
      const tag = tagParenBrace[1]
      const braceStart = i + tag.length + 1  // position of '{'
      const before = source.slice(Math.max(0, i - 12), i).trimEnd()
      if (/(?:new|class|interface|type|extends|implements)\s*$/.test(before)) {
        result += tag
        i += tag.length
        continue
      }
      // Find matching '}'
      let depth = 1
      let j = braceStart + 1
      while (j < source.length && depth > 0) {
        if (source[j] === '{') depth++
        else if (source[j] === '}') depth--
        j++
      }
      // j points past '}'; expect ')' at j to close the outer paren
      if (j < source.length && source[j] === ')') {
        const innerContent = source.slice(braceStart + 1, j - 1).trim()
        if (innerContent.includes(':') && !innerContent.includes('=>') && !innerContent.includes('\n')) {
          const values = extractFieldValues(innerContent)
          if (values.length > 0) {
            result += `${tag}(${values.join(', ')})`
            i = j + 1  // skip past ')'
            continue
          }
        }
      }
      result += source[i]
      i++
    } else if (tagMatch) {
      const tag = tagMatch[1]
      const braceStart = i + tagMatch[0].length - 1 // position of '{'
      // Check it's a struct constructor call, not a class body (preceded by 'class' or 'type')
      const before = source.slice(Math.max(0, i - 12), i).trimEnd()
      if (/(?:class|interface|type|extends|implements)\s*$/.test(before)) {
        // Skip the entire word to avoid matching sub-parts of the same identifier
        result += tag
        i += tag.length
        continue
      }
      // Find matching '}'
      let depth = 1
      let j = braceStart + 1
      while (j < source.length && depth > 0) {
        if (source[j] === '{') depth++
        else if (source[j] === '}') depth--
        j++
      }
      const innerContent = source.slice(braceStart + 1, j - 1).trim()
      // Check it looks like `key: value` pairs (has `:` separator, not a function body or match body)
      if (innerContent.includes(':') && !innerContent.includes('=>') && !innerContent.includes('\n')) {
        const values = extractFieldValues(innerContent)
        if (values.length > 0) {
          result += `${tag}(${values.join(', ')})`
          i = j
          continue
        }
      }
      result += source[i]
      i++
    } else {
      result += source[i]
      i++
    }
  }
  return result
}

export function preprocessSJS(source: string): string {
  let result = source
  result = transformNullSafety(result)
  result = transformAccessModifiers(result)
  result = transformGenericConstraints(result)
  result = transformSumTypes(result)
  // After sum types are expanded, transform struct constructor calls
  result = transformStructConstructorCalls(result)
  result = transformMatch(result)
  return result
}
