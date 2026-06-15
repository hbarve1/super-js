/** Stepped, in-browser tour of Super.js — each step pairs prose with runnable code. */
export interface TourStep {
  title: string
  body: string
  code: string
}

export const TOUR: TourStep[] = [
  {
    title: 'Null safety',
    body: 'In Super.js, T? is the only nullable type — a plain string can never be null. Use ?? and ?. to handle the nullable case; the compiler makes you.',
    code: `const name: string? = null
const greeting = name ?? "World"
console.log("Hello,", greeting)

function len(s: string?): number {
  return s?.length ?? 0
}
console.log(len(null), len("super"))
`,
  },
  {
    title: 'Sum types & match',
    body: 'Model data as a set of named variants. match destructures them — and the compiler requires every case to be handled, so impossible states are unrepresentable.',
    code: `type Result<T, E> = Ok(T) | Err(E)

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return Err("division by zero")
  return Ok(a / b)
}

match divide(10, 2) {
  Ok(value) => console.log("Result:", value),
  Err(msg)  => console.error("Error:", msg),
}
`,
  },
  {
    title: 'Exhaustive matching',
    body: 'Add a variant and every match that forgot it fails to compile. Try removing the Rect arm below and re-running — the compiler catches it.',
    code: `type Shape =
  | Circle(number)
  | Rect({ w: number, h: number })

function area(s: Shape): number {
  return match s {
    Circle(r)      => 3.14159 * r * r,
    Rect({ w, h }) => w * h,
  }
}

console.log(area(Circle(2)))
console.log(area(Rect({ w: 3, h: 4 })))
`,
  },
  {
    title: 'Generics',
    body: 'Write code once, keep it type-safe across types. No casts, no any — the types flow through.',
    code: `function map<A, B>(xs: A[], f: (a: A) => B): B[] {
  return xs.map(f)
}

console.log(map([1, 2, 3], (n) => n * n))
console.log(map(["a", "b"], (s) => s.toUpperCase()))
`,
  },
  {
    title: 'No any — use dynamic',
    body: 'any is banned. When you genuinely need an escape hatch it is spelled dynamic — explicit and greppable, never silent. Everything compiles to plain JS with zero runtime overhead.',
    code: `// any is a compile error in Super.js.
const data: dynamic = JSON.parse('{"x": 1}')
console.log(data.x)
`,
  },
]
