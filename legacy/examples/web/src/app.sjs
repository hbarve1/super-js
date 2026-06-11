// ── app.sjs — Super.js Todo App ───────────────────────────────────────────────
//
// Full-featured Todo app demonstrating Super.js type annotations:
//   - Type aliases, union types, typed function signatures
//   - LocalStorage persistence
//   - Pure state management with immutable updates
//   - Typed DOM event handlers

// ── Types ─────────────────────────────────────────────────────────────────────

type Todo = {
  id: number
  text: string
  done: boolean
  createdAt: number
}

type FilterMode = "all" | "active" | "completed"

type AppState = {
  todos: Todo[]
  filter: FilterMode
  nextId: number
}

// ── Storage helpers ───────────────────────────────────────────────────────────

const STORAGE_KEY: string = "superjs_todos"

function loadState(): AppState {
  try {
    const raw: string | null = localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      return { todos: [], filter: "all", nextId: 1 }
    }
    return JSON.parse(raw) as AppState
  } catch (_err: unknown) {
    return { todos: [], filter: "all", nextId: 1 }
  }
}

function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (_err: unknown) {
    console.warn("Failed to persist state to localStorage")
  }
}

// ── Pure state mutations ───────────────────────────────────────────────────────

/**
 * Create a new Todo object. Does NOT mutate state.
 */
function createTodo(id: number, text: string): Todo {
  return {
    id,
    text: text.trim(),
    done: false,
    createdAt: Date.now(),
  }
}

/**
 * Return a new state with the given todo appended.
 * If text is empty after trimming, state is returned unchanged.
 */
function addTodo(state: AppState, text: string): AppState {
  const trimmed: string = text.trim()
  if (trimmed.length === 0) return state

  const todo: Todo = createTodo(state.nextId, trimmed)
  return {
    ...state,
    todos: [...state.todos, todo],
    nextId: state.nextId + 1,
  }
}

/**
 * Return a new state with the done flag of the given todo toggled.
 */
function toggleTodo(state: AppState, id: number): AppState {
  return {
    ...state,
    todos: state.todos.map((todo: Todo): Todo =>
      todo.id === id ? { ...todo, done: !todo.done } : todo
    ),
  }
}

/**
 * Return a new state with the todo of the given id removed.
 */
function deleteTodo(state: AppState, id: number): AppState {
  return {
    ...state,
    todos: state.todos.filter((todo: Todo): boolean => todo.id !== id),
  }
}

/**
 * Return a new state with all completed todos removed.
 */
function clearCompleted(state: AppState): AppState {
  return {
    ...state,
    todos: state.todos.filter((todo: Todo): boolean => !todo.done),
  }
}

/**
 * Return a new state with the active filter updated.
 */
function setFilter(state: AppState, filter: FilterMode): AppState {
  return { ...state, filter }
}

/**
 * Return only the todos that match the current filter.
 */
function getFilteredTodos(state: AppState): Todo[] {
  switch (state.filter) {
    case "active":
      return state.todos.filter((todo: Todo): boolean => !todo.done)
    case "completed":
      return state.todos.filter((todo: Todo): boolean => todo.done)
    default:
      return state.todos
  }
}

/**
 * Count todos that are not yet done.
 */
function getActiveCount(state: AppState): number {
  return state.todos.filter((todo: Todo): boolean => !todo.done).length
}

/**
 * Return whether there are any completed todos.
 */
function hasCompleted(state: AppState): boolean {
  return state.todos.some((todo: Todo): boolean => todo.done)
}

// ── Formatting ────────────────────────────────────────────────────────────────

function formatDate(ts: number): string {
  const d: Date = new Date(ts)
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

function el(selector: string): HTMLElement | null {
  return document.querySelector(selector)
}

function elRequired(selector: string): HTMLElement {
  const node: HTMLElement | null = document.querySelector(selector)
  if (!node) throw new Error(`Required element not found: ${selector}`)
  return node
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }
  return text.replace(/[&<>"']/g, (ch: string): string => map[ch] ?? ch)
}

// ── Render ────────────────────────────────────────────────────────────────────

/**
 * Render the full UI from the current application state.
 * This is a simple full re-render (no virtual DOM diffing).
 */
function render(state: AppState): void {
  const filtered: Todo[] = getFilteredTodos(state)
  const activeCount: number = getActiveCount(state)
  const completedExists: boolean = hasCompleted(state)
  const totalCount: number = state.todos.length

  // ── Todo list ──
  const listEl: HTMLElement = elRequired("#todo-list")
  if (filtered.length === 0) {
    const emptyMsg: string = totalCount === 0
      ? "No tasks yet — add one above!"
      : state.filter === "active"
        ? "All tasks are done. Great work!"
        : "No completed tasks yet."
    listEl.innerHTML = `<li class="todo-empty">${emptyMsg}</li>`
  } else {
    listEl.innerHTML = filtered.map((todo: Todo): string => `
      <li class="todo-item${todo.done ? " done" : ""}" data-id="${todo.id}">
        <button
          class="todo-check${todo.done ? " checked" : ""}"
          data-action="toggle"
          data-id="${todo.id}"
          aria-label="${todo.done ? "Mark incomplete" : "Mark complete"}"
          aria-pressed="${todo.done}"
        >
          ${todo.done ? checkIcon() : ""}
        </button>
        <span class="todo-text">${escapeHtml(todo.text)}</span>
        <span class="todo-date">${formatDate(todo.createdAt)}</span>
        <button
          class="todo-delete"
          data-action="delete"
          data-id="${todo.id}"
          aria-label="Delete task"
        >${trashIcon()}</button>
      </li>
    `).join("")
  }

  // ── Footer ──
  const footerEl: HTMLElement | null = el("#todo-footer")
  if (footerEl) {
    footerEl.style.display = totalCount === 0 ? "none" : "flex"
  }

  // ── Item count ──
  const countEl: HTMLElement | null = el("#todo-count")
  if (countEl) {
    countEl.textContent = `${activeCount} ${activeCount === 1 ? "item" : "items"} left`
  }

  // ── Filter buttons ──
  const filters: FilterMode[] = ["all", "active", "completed"]
  filters.forEach((f: FilterMode): void => {
    const btn: HTMLElement | null = el(`[data-filter="${f}"]`)
    if (btn) {
      btn.classList.toggle("active", f === state.filter)
      btn.setAttribute("aria-current", f === state.filter ? "true" : "false")
    }
  })

  // ── Clear completed button ──
  const clearBtn: HTMLElement | null = el("#clear-completed")
  if (clearBtn) {
    clearBtn.style.display = completedExists ? "inline-flex" : "none"
  }

  // ── Select-all toggle ──
  const toggleAllEl: HTMLInputElement | null = document.querySelector("#toggle-all")
  if (toggleAllEl && totalCount > 0) {
    toggleAllEl.checked = activeCount === 0
    toggleAllEl.indeterminate = activeCount > 0 && activeCount < totalCount
  }
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function checkIcon(): string {
  return `<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
    <polyline points="1.5,6 4.5,9.5 10.5,2.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
}

function trashIcon(): string {
  return `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <path d="M2 4h12M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
}

// ── Event binding ─────────────────────────────────────────────────────────────

/**
 * Wire up all DOM event listeners. Uses event delegation on the list
 * to avoid re-binding on every render.
 */
function bindEvents(getState: () => AppState, setState: (s: AppState) => void): void {
  // ── New todo form ──
  const form: HTMLElement = elRequired("#todo-form")
  const input: HTMLInputElement = document.querySelector("#todo-input")

  form.addEventListener("submit", (e: Event): void => {
    e.preventDefault()
    if (!input) return
    const text: string = input.value
    setState(addTodo(getState(), text))
    input.value = ""
    input.focus()
  })

  // ── List delegation (toggle + delete) ──
  const listEl: HTMLElement = elRequired("#todo-list")
  listEl.addEventListener("click", (e: Event): void => {
    const target: HTMLElement | null = (e.target as HTMLElement).closest("[data-action]")
    if (!target) return

    const action: string = target.dataset["action"] ?? ""
    const idStr: string = target.dataset["id"] ?? ""
    const id: number = parseInt(idStr, 10)

    if (isNaN(id)) return

    if (action === "toggle") {
      setState(toggleTodo(getState(), id))
    } else if (action === "delete") {
      setState(deleteTodo(getState(), id))
    }
  })

  // ── Filter buttons ──
  const filterContainer: HTMLElement = elRequired("#todo-filters")
  filterContainer.addEventListener("click", (e: Event): void => {
    const btn: HTMLElement | null = (e.target as HTMLElement).closest("[data-filter]")
    if (!btn) return
    const filter: string = btn.dataset["filter"] ?? "all"
    setState(setFilter(getState(), filter as FilterMode))
  })

  // ── Clear completed ──
  const clearBtn: HTMLElement | null = el("#clear-completed")
  if (clearBtn) {
    clearBtn.addEventListener("click", (): void => {
      setState(clearCompleted(getState()))
    })
  }

  // ── Toggle all ──
  const toggleAllEl: HTMLInputElement | null = document.querySelector("#toggle-all")
  if (toggleAllEl) {
    toggleAllEl.addEventListener("change", (): void => {
      const s: AppState = getState()
      const allDone: boolean = getActiveCount(s) === 0
      const updated: AppState = {
        ...s,
        todos: s.todos.map((t: Todo): Todo => ({ ...t, done: !allDone })),
      }
      setState(updated)
    })
  }

  // ── Keyboard shortcut: Escape clears input ──
  const inputEl: HTMLInputElement | null = document.querySelector("#todo-input")
  if (inputEl) {
    inputEl.addEventListener("keydown", (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        inputEl.value = ""
        inputEl.blur()
      }
    })
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

/**
 * Entry point. Loads persisted state, renders, and wires up events.
 */
function init(): void {
  let state: AppState = loadState()

  function getState(): AppState {
    return state
  }

  function setState(next: AppState): void {
    state = next
    saveState(state)
    render(state)
  }

  render(state)
  bindEvents(getState, setState)

  // Focus the input on load
  const inputEl: HTMLInputElement | null = document.querySelector("#todo-input")
  if (inputEl) inputEl.focus()
}

// Start the app when the DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init)
} else {
  init()
}
