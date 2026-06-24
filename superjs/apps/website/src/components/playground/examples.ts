/** Curated playground snippets for the examples gallery. */
export interface Example {
  id: string
  label: string
  code: string
  /** Suggested runtime mode when loading this example. */
  mode?: 'node' | 'workers' | 'lambda'
}

export const EXAMPLES: Example[] = [
  {
    id: 'hello-world',
    label: 'Hello world',
    code: `const name: string = "Super.js"
console.log("Hello,", name)
`,
  },
  {
    id: 'result',
    label: 'Result & match',
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
    id: 'null-safety',
    label: 'Null safety',
    code: `// T? is the only nullable type — no null exceptions at runtime.
const name: string? = null
const greeting = name ?? "World"
console.log("Hello,", greeting)

function len(s: string?): number {
  return s?.length ?? 0
}
console.log(len(null), len("super"))
`,
  },
  {
    id: 'option',
    label: 'Option type',
    code: `type Option<T> = Some(T) | None

function first<T>(xs: T[]): Option<T> {
  return xs.length > 0 ? Some(xs[0]) : None
}

match first([10, 20, 30]) {
  Some(x) => console.log("first:", x),
  None    => console.log("empty"),
}
`,
  },
  {
    id: 'generics',
    label: 'Generics',
    code: `function identity<T>(x: T): T {
  return x
}

function map<A, B>(xs: A[], f: (a: A) => B): B[] {
  return xs.map(f)
}

console.log(identity<number>(42))
console.log(map([1, 2, 3], (n) => n * n))
`,
  },
  {
    id: 'async',
    label: 'async/await',
    code: `async function greet(name: string): Promise<string> {
  return "Hello, " + name
}

const msg: string = await greet("async")
console.log(msg)
`,
  },
  {
    id: 'exhaustive',
    label: 'Exhaustive match',
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
    id: 'fastify-route',
    label: 'Fastify route (snippet)',
    code: `// Minimal route handler shape — see examples/mvb-fastify for a full app.
type Health = { status: string }

function healthHandler(): Health {
  return { status: "ok" }
}

const body: Health = healthHandler()
console.log(JSON.stringify(body))
`,
  },
  {
    id: 'workers-handler',
    label: 'Workers handler (lesson 18)',
    mode: 'workers',
    code: `export async function fetch(request: dynamic): Promise<dynamic> {
  const url: dynamic = new URL(request.url as string)
  const path: string = url.pathname as string
  if (path === "/health") {
    return new Response("ok", { status: 200 })
  }
  return new Response("not found", { status: 404 })
}
`,
  },
  {
    id: 'lambda-handler',
    label: 'Lambda handler',
    mode: 'lambda',
    code: `export async function handler(event: dynamic, context: dynamic): Promise<dynamic> {
  const body: dynamic = JSON.parse(event.body as string)
  const name: string = body.name as string
  return JSON.stringify({ message: "Hello, " + name })
}
`,
  },
]
