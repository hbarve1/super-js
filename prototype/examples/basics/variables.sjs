// Variables in SJS

// const — immutable binding
const name: string = 'Alice'
const age: number = 30
const active: boolean = true

// let — mutable binding
let count: number = 0
count = count + 1

// Nullable types use T?
const nickname: string? = null
const preferredName: string? = 'Ali'

// Type inference (type annotation optional when obvious)
const pi = 3.14159
const message = 'hello'

// Destructuring
const point = { x: 10, y: 20 }
const { x, y } = point
console.log(`Point: (${x}, ${y})`)

// Array destructuring
const [first, second, ...rest] = [1, 2, 3, 4, 5]
console.log(first, second, rest)

// Null check before use
if (nickname !== null && nickname !== undefined) {
  console.log('Nickname:', nickname)
} else {
  console.log('No nickname')
}

// Nullish coalescing
const displayName = preferredName ?? name
console.log('Display:', displayName)

function main(): void {
  console.log(name, age, active, count)
}

main()
