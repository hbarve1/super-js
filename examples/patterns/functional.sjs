// Functional Programming Patterns in SJS

// Option type for safe null handling
type Option<T> = | Some(T) | None

function map<A, B>(opt: Option<A>, f: (a: A) => B): Option<B> {
  match opt {
    Some(a) => Some(f(a))
    None => None()
  }
}

function flatMap<A, B>(opt: Option<A>, f: (a: A) => Option<B>): Option<B> {
  match opt {
    Some(a) => f(a)
    None => None()
  }
}

function getOrElse<T>(opt: Option<T>, fallback: T): T {
  match opt {
    Some(v) => v
    None => fallback
  }
}

// Safe array head — returns None for empty arrays
function head<T>(arr: T[]): Option<T> {
  return arr.length > 0 ? Some(arr[0]) : None()
}

// Safe Map lookup — wraps the T | undefined JS runtime return
function lookup<K, V>(m: Map<K, V>, key: K): Option<V> {
  const v = m.get(key)
  return v !== undefined ? Some(v) : None()
}

// Currying helper
function curry<A, B, C>(f: (a: A, b: B) => C): (a: A) => (b: B) => C {
  return (a) => (b) => f(a, b)
}

// Function composition
function compose<A, B, C>(f: (b: B) => C, g: (a: A) => B): (a: A) => C {
  return (a) => f(g(a))
}

// Pipeline: apply a series of transforms left-to-right
function pipe<T>(value: T, ...fns: ((v: T) => T)[]): T {
  let result = value
  for (const fn of fns) result = fn(result)
  return result
}

function main(): void {
  // Option chaining
  const names = ['Alice', 'Bob', 'Carol']
  const first = head(names)
  const upper = map(first, s => s.toUpperCase())
  console.log(getOrElse(upper, 'nobody'))  // ALICE

  const empty: string[] = []
  console.log(getOrElse(head(empty), 'nobody'))  // nobody

  // flatMap chaining — safe double lookup
  const config = new Map([['host', 'localhost'], ['port', '3000']])
  const host = getOrElse(lookup(config, 'host'), 'unknown')
  console.log('host:', host)  // host: localhost
  console.log('missing:', getOrElse(lookup(config, 'db'), 'default'))  // default

  // Curried arithmetic
  const add = curry((a: number, b: number) => a + b)
  const add5 = add(5)
  console.log(add5(3))   // 8
  console.log(add5(10))  // 15

  // compose: trim then uppercase
  const normalize = compose(
    (s: string) => s.toUpperCase(),
    (s: string) => s.trim()
  )
  console.log(normalize('  hello  '))  // HELLO

  // pipe: number transformations
  const result = pipe(
    3,
    x => x * 2,   // 6
    x => x + 1,   // 7
    x => x * x    // 49
  )
  console.log(result)  // 49
}

main()
