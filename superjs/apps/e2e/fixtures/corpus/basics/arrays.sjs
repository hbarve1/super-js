// Arrays in SJS

// Typed arrays
const numbers: number[] = [1, 2, 3, 4, 5]
const names: string[] = ['Alice', 'Bob', 'Carol']
const matrix: number[][] = [[1, 2], [3, 4], [5, 6]]

// Array methods
const doubled = numbers.map(n => n * 2)
const evens = numbers.filter(n => n % 2 === 0)
const total = numbers.reduce((acc, n) => acc + n, 0)

console.log('doubled:', doubled)
console.log('evens:', evens)
console.log('total:', total)

// Array of nullable items
const maybeNames: string?[] = ['Alice', null, 'Carol', null]
const definiteNames = maybeNames.filter((n): n is string => n !== null && n !== undefined)
console.log('definite:', definiteNames)

// Spread
const more = [...numbers, 6, 7, 8]
const combined = [...names, 'Dave']

// Destructuring
const [head, ...tail] = numbers
console.log('head:', head, 'tail:', tail)

// Array.pop() returns T | undefined — OK, it's a JS runtime return
const stack: number[] = [10, 20, 30]
const top = stack.pop()  // number | undefined
if (top !== undefined) {
  console.log('popped:', top)
}

// Tuple (fixed-length array)
const pair: [string, number] = ['Alice', 30]
const [pName, pAge] = pair
console.log(`${pName} is ${pAge}`)

function main(): void {
  const sorted = [...numbers].sort((a, b) => b - a)
  console.log('sorted desc:', sorted)

  const found = numbers.find(n => n > 3)  // number | undefined
  if (found !== undefined) console.log('first > 3:', found)
}

main()
