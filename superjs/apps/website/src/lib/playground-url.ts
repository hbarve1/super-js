import { EXAMPLES } from '@/components/playground/examples'
import { readSharedCode } from '@/lib/share'

export type PlaygroundMode = 'node' | 'workers' | 'lambda'

export interface PlaygroundUrlState {
  mode: PlaygroundMode
  exampleId: string | null
  codeFromQuery: string | null
  codeFromHash: string | null
}

const MODES = new Set<PlaygroundMode>(['node', 'workers', 'lambda'])

export function parsePlaygroundUrl(search: string): PlaygroundUrlState {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const rawMode = params.get('mode')
  const mode: PlaygroundMode = rawMode && MODES.has(rawMode as PlaygroundMode) ? (rawMode as PlaygroundMode) : 'node'
  const exampleId = params.get('example')
  const codeFromQuery = params.get('code')
  const codeFromHash = readSharedCode()
  return { mode, exampleId, codeFromQuery, codeFromHash }
}

export function resolveInitialCode(state: PlaygroundUrlState, fallback: string): string {
  if (state.codeFromHash) return state.codeFromHash
  if (state.codeFromQuery) {
    try {
      return decodeURIComponent(state.codeFromQuery)
    } catch {
      return state.codeFromQuery
    }
  }
  if (state.exampleId) {
    const ex = EXAMPLES.find((e) => e.id === state.exampleId)
    if (ex) return ex.code
  }
  return fallback
}

export function buildPlaygroundQuery(mode: PlaygroundMode, exampleId?: string): string {
  const params = new URLSearchParams()
  if (mode !== 'node') params.set('mode', mode)
  if (exampleId) params.set('example', exampleId)
  const q = params.toString()
  return q ? `?${q}` : ''
}
