import { transformSumTypes } from './sumTypes'
import { transformMatch } from './matchExpr'

export function preprocessSJS(source: string): string {
  let result = source
  result = transformSumTypes(result)
  result = transformMatch(result)
  return result
}
