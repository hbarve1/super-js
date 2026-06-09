// ── Gradual Typing: Plain JavaScript (zero annotations) ───────────────────
// This file is valid Super.js with NO type annotations at all.
// It compiles identically to how it would in plain JavaScript.

function greet(name) {
  return "Hello, " + name + "!"
}

function add(a, b) {
  return a + b
}

function fetchData(url) {
  return fetch(url).then(res => res.json())
}

class Counter {
  constructor(initial) {
    this.count = initial || 0
  }

  increment() {
    this.count++
    return this
  }

  decrement() {
    this.count--
    return this
  }

  value() {
    return this.count
  }
}

const items = [3, 1, 4, 1, 5, 9, 2, 6]
const sorted = [...items].sort((a, b) => a - b)
const sum = items.reduce((acc, n) => acc + n, 0)
const evens = items.filter(n => n % 2 === 0)

const counter = new Counter(0)
counter.increment().increment().increment().decrement()

console.log(greet("World"))
console.log(add(2, 3))
console.log(sorted)
console.log(sum, evens)
console.log(counter.value())
