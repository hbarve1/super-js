"use strict";

// ── app.sjs — Super.js Todo App ───────────────────────────────────────────────
//
// Full-featured Todo app demonstrating Super.js type annotations:
//   - Type aliases, union types, typed function signatures
//   - LocalStorage persistence
//   - Pure state management with immutable updates
//   - Typed DOM event handlers

// ── Types ─────────────────────────────────────────────────────────────────────

// ── Storage helpers ───────────────────────────────────────────────────────────

const STORAGE_KEY = "superjs_todos";
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return {
        todos: [],
        filter: "all",
        nextId: 1
      };
    }
    return JSON.parse(raw);
  } catch (_err) {
    return {
      todos: [],
      filter: "all",
      nextId: 1
    };
  }
}
function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_err) {
    console.warn("Failed to persist state to localStorage");
  }
}

// ── Pure state mutations ───────────────────────────────────────────────────────

/**
 * Create a new Todo object. Does NOT mutate state.
 */
function createTodo(id, text) {
  return {
    id,
    text: text.trim(),
    done: false,
    createdAt: Date.now()
  };
}

/**
 * Return a new state with the given todo appended.
 * If text is empty after trimming, state is returned unchanged.
 */
function addTodo(state, text) {
  const trimmed = text.trim();
  if (trimmed.length === 0) return state;
  const todo = createTodo(state.nextId, trimmed);
  return {
    ...state,
    todos: [...state.todos, todo],
    nextId: state.nextId + 1
  };
}

/**
 * Return a new state with the done flag of the given todo toggled.
 */
function toggleTodo(state, id) {
  return {
    ...state,
    todos: state.todos.map(todo => todo.id === id ? {
      ...todo,
      done: !todo.done
    } : todo)
  };
}

/**
 * Return a new state with the todo of the given id removed.
 */
function deleteTodo(state, id) {
  return {
    ...state,
    todos: state.todos.filter(todo => todo.id !== id)
  };
}

/**
 * Return a new state with all completed todos removed.
 */
function clearCompleted(state) {
  return {
    ...state,
    todos: state.todos.filter(todo => !todo.done)
  };
}

/**
 * Return a new state with the active filter updated.
 */
function setFilter(state, filter) {
  return {
    ...state,
    filter
  };
}

/**
 * Return only the todos that match the current filter.
 */
function getFilteredTodos(state) {
  switch (state.filter) {
    case "active":
      return state.todos.filter(todo => !todo.done);
    case "completed":
      return state.todos.filter(todo => todo.done);
    default:
      return state.todos;
  }
}

/**
 * Count todos that are not yet done.
 */
function getActiveCount(state) {
  return state.todos.filter(todo => !todo.done).length;
}

/**
 * Return whether there are any completed todos.
 */
function hasCompleted(state) {
  return state.todos.some(todo => todo.done);
}

// ── Formatting ────────────────────────────────────────────────────────────────

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  });
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

function el(selector) {
  return document.querySelector(selector);
}
function elRequired(selector) {
  const node = document.querySelector(selector);
  if (!node) throw new Error(`Required element not found: ${selector}`);
  return node;
}
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return text.replace(/[&<>"']/g, ch => map[ch] ?? ch);
}

// ── Render ────────────────────────────────────────────────────────────────────

/**
 * Render the full UI from the current application state.
 * This is a simple full re-render (no virtual DOM diffing).
 */
function render(state) {
  const filtered = getFilteredTodos(state);
  const activeCount = getActiveCount(state);
  const completedExists = hasCompleted(state);
  const totalCount = state.todos.length;

  // ── Todo list ──
  const listEl = elRequired("#todo-list");
  if (filtered.length === 0) {
    const emptyMsg = totalCount === 0 ? "No tasks yet — add one above!" : state.filter === "active" ? "All tasks are done. Great work!" : "No completed tasks yet.";
    listEl.innerHTML = `<li class="todo-empty">${emptyMsg}</li>`;
  } else {
    listEl.innerHTML = filtered.map(todo => `
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
    `).join("");
  }

  // ── Footer ──
  const footerEl = el("#todo-footer");
  if (footerEl) {
    footerEl.style.display = totalCount === 0 ? "none" : "flex";
  }

  // ── Item count ──
  const countEl = el("#todo-count");
  if (countEl) {
    countEl.textContent = `${activeCount} ${activeCount === 1 ? "item" : "items"} left`;
  }

  // ── Filter buttons ──
  const filters = ["all", "active", "completed"];
  filters.forEach(f => {
    const btn = el(`[data-filter="${f}"]`);
    if (btn) {
      btn.classList.toggle("active", f === state.filter);
      btn.setAttribute("aria-current", f === state.filter ? "true" : "false");
    }
  });

  // ── Clear completed button ──
  const clearBtn = el("#clear-completed");
  if (clearBtn) {
    clearBtn.style.display = completedExists ? "inline-flex" : "none";
  }

  // ── Select-all toggle ──
  const toggleAllEl = document.querySelector("#toggle-all");
  if (toggleAllEl && totalCount > 0) {
    toggleAllEl.checked = activeCount === 0;
    toggleAllEl.indeterminate = activeCount > 0 && activeCount < totalCount;
  }
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function checkIcon() {
  return `<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
    <polyline points="1.5,6 4.5,9.5 10.5,2.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
function trashIcon() {
  return `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <path d="M2 4h12M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

// ── Event binding ─────────────────────────────────────────────────────────────

/**
 * Wire up all DOM event listeners. Uses event delegation on the list
 * to avoid re-binding on every render.
 */
function bindEvents(getState, setState) {
  // ── New todo form ──
  const form = elRequired("#todo-form");
  const input = document.querySelector("#todo-input");
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!input) return;
    const text = input.value;
    setState(addTodo(getState(), text));
    input.value = "";
    input.focus();
  });

  // ── List delegation (toggle + delete) ──
  const listEl = elRequired("#todo-list");
  listEl.addEventListener("click", e => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset["action"] ?? "";
    const idStr = target.dataset["id"] ?? "";
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return;
    if (action === "toggle") {
      setState(toggleTodo(getState(), id));
    } else if (action === "delete") {
      setState(deleteTodo(getState(), id));
    }
  });

  // ── Filter buttons ──
  const filterContainer = elRequired("#todo-filters");
  filterContainer.addEventListener("click", e => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    const filter = btn.dataset["filter"] ?? "all";
    setState(setFilter(getState(), filter));
  });

  // ── Clear completed ──
  const clearBtn = el("#clear-completed");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      setState(clearCompleted(getState()));
    });
  }

  // ── Toggle all ──
  const toggleAllEl = document.querySelector("#toggle-all");
  if (toggleAllEl) {
    toggleAllEl.addEventListener("change", () => {
      const s = getState();
      const allDone = getActiveCount(s) === 0;
      const updated = {
        ...s,
        todos: s.todos.map(t => ({
          ...t,
          done: !allDone
        }))
      };
      setState(updated);
    });
  }

  // ── Keyboard shortcut: Escape clears input ──
  const inputEl = document.querySelector("#todo-input");
  if (inputEl) {
    inputEl.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        inputEl.value = "";
        inputEl.blur();
      }
    });
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

/**
 * Entry point. Loads persisted state, renders, and wires up events.
 */
function init() {
  let state = loadState();
  function getState() {
    return state;
  }
  function setState(next) {
    state = next;
    saveState(state);
    render(state);
  }
  render(state);
  bindEvents(getState, setState);

  // Focus the input on load
  const inputEl = document.querySelector("#todo-input");
  if (inputEl) inputEl.focus();
}

// Start the app when the DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
//# sourceMappingURL=app.js.map
