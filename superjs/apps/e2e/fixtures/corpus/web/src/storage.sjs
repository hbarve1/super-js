// ── storage.sjs — Typed localStorage wrapper ──────────────────────────────────

/**
 * A typed key-value store backed by localStorage.
 */
type StorageAdapter<T> = {
  get(): T | null
  set(value: T): void
  remove(): void
  exists(): boolean
}

/**
 * Generic factory that returns a strongly-typed storage adapter
 * for a single localStorage key.
 *
 * Usage:
 *   const todosStorage = createStorage<Todo[]>("todos", [])
 *   todosStorage.set([...])
 *   const saved = todosStorage.get()
 */
export function createStorage<T>(key: string, defaultValue: T): StorageAdapter<T> & { getOrDefault(): T } {
  function get(): T | null {
    try {
      const raw: string | null = localStorage.getItem(key)
      if (raw === null) return null
      return JSON.parse(raw) as T
    } catch (err: unknown) {
      console.warn(`[storage] Failed to read key "${key}":`, err)
      return null
    }
  }

  function set(value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (err: unknown) {
      console.warn(`[storage] Failed to write key "${key}":`, err)
    }
  }

  function remove(): void {
    localStorage.removeItem(key)
  }

  function exists(): boolean {
    return localStorage.getItem(key) !== null
  }

  function getOrDefault(): T {
    const value: T | null = get()
    return value !== null ? value : defaultValue
  }

  return { get, set, remove, exists, getOrDefault }
}

type Todo = {
  id: number
  text: string
  done: boolean
  createdAt: number
}

/**
 * Convenience adapter for the app's todo list and filter state.
 */
type AppPersistedState = {
  todos: Todo[]
  filter: string
  nextId: number
}

export const appStorage = createStorage<AppPersistedState>("superjs_todo_app", {
  todos: [],
  filter: "all",
  nextId: 1,
})
