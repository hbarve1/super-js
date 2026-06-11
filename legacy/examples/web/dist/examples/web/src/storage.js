"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.appStorage = void 0;
exports.createStorage = createStorage;
// ── storage.sjs — Typed localStorage wrapper ──────────────────────────────────

/**
 * A typed key-value store backed by localStorage.
 */

/**
 * Generic factory that returns a strongly-typed storage adapter
 * for a single localStorage key.
 *
 * Usage:
 *   const todosStorage = createStorage<Todo[]>("todos", [])
 *   todosStorage.set([...])
 *   const saved = todosStorage.get()
 */
function createStorage(key, defaultValue) {
  function get() {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`[storage] Failed to read key "${key}":`, err);
      return null;
    }
  }
  function set(value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`[storage] Failed to write key "${key}":`, err);
    }
  }
  function remove() {
    localStorage.removeItem(key);
  }
  function exists() {
    return localStorage.getItem(key) !== null;
  }
  function getOrDefault() {
    const value = get();
    return value !== null ? value : defaultValue;
  }
  return {
    get,
    set,
    remove,
    exists,
    getOrDefault
  };
}

/**
 * Convenience adapter for the app's todo list and filter state.
 */

const appStorage = exports.appStorage = createStorage("superjs_todo_app", {
  todos: [],
  filter: "all",
  nextId: 1
});
//# sourceMappingURL=storage.js.map
