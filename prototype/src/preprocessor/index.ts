import { transformSumTypes } from './sumTypes'
import { transformMatch } from './matchExpr'
import { transformNullSafety } from './nullSafety'
import { transformAccessModifiers } from './accessModifiers'

export function preprocessSJS(source: string): string {
  let result = source
  result = transformNullSafety(result)
  result = transformAccessModifiers(result)
  result = transformSumTypes(result)
  result = transformMatch(result)
  return result
}
