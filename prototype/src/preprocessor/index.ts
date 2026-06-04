import { transformSumTypes } from './sumTypes'
import { transformMatch } from './matchExpr'
import { transformNullSafety } from './nullSafety'

export function preprocessSJS(source: string): string {
  let result = source
  result = transformNullSafety(result)
  result = transformSumTypes(result)
  result = transformMatch(result)
  return result
}
