// SJS Example: Iterator/AsyncIterator Protocol (ES2015/ES2018)
// Task 2.1 — specs/002-ecmascript-features/implementation-plan.md

// Generator function returning Generator<Y, R, N>
function* fibonacci(): Generator<number, void, unknown> {
  let [a, b] = [0, 1]
  while (true) {
    yield a;
    [a, b] = [b, a + b]
  }
}

// Async generator returning AsyncGenerator<Y, R, N>
async function* fetchPages(url: string): AsyncGenerator<string, void, unknown> {
  let page = 1
  while (page <= 5) {
    yield `page-${page}-data`
    page++
  }
}

// Array iterator methods
const nums: number[] = [1, 2, 3, 4, 5]
const valueIter: Iterator<number> = nums.values()
const keyIter: Iterator<number> = nums.keys()

// Map iteration
const m: Map<string, number> = new Map([["a", 1], ["b", 2]])
const entries = m.entries()

// Iterator.from — ES2025 iterator helpers
const it = Iterator.from([10, 20, 30])

// for...of with array
const doubled: number[] = []
for (const n of nums) {
  doubled.push(n * 2)
}
