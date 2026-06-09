// Functions in SJS

// Basic function
function add(a: number, b: number): number {
  return a + b
}

// Optional parameter (T | undefined is OK for optional params)
function greet(name: string, greeting?: string): string {
  const g = greeting ?? 'Hello'
  return `${g}, ${name}!`
}

// Rest parameters
function sum(...nums: number[]): number {
  return nums.reduce((acc, n) => acc + n, 0)
}

// Arrow function
const multiply = (a: number, b: number): number => a * b

// Higher-order function
function applyTwice(f: (n: number) => number, x: number): number {
  return f(f(x))
}

// Nullable return
function findUser(id: number): string? {
  const users: Record<number, string> = { 1: 'Alice', 2: 'Bob' }
  const found = users[id]
  return found !== undefined ? found : null
}

// Generic function
function identity<T>(value: T): T {
  return value
}

function first<T>(arr: T[]): T? {
  return arr.length > 0 ? arr[0] : null
}

function main(): void {
  console.log(add(2, 3))           // 5
  console.log(greet('Alice'))      // Hello, Alice!
  console.log(greet('Bob', 'Hi'))  // Hi, Bob!
  console.log(sum(1, 2, 3, 4, 5)) // 15
  console.log(multiply(4, 5))     // 20
  console.log(applyTwice(x => x * 2, 3))  // 12

  const user = findUser(1)
  if (user !== null && user !== undefined) {
    console.log('Found:', user)
  }

  console.log(identity(42))
  console.log(first([10, 20, 30]))
}

main()
