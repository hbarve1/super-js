// Loops in SJS

const numbers = [1, 2, 3, 4, 5]

// for...of (preferred for arrays)
for (const n of numbers) {
  process.stdout.write(n + ' ')
}
console.log()

// for...of with index (using entries)
for (const [i, n] of numbers.entries()) {
  console.log(`[${i}] = ${n}`)
}

// for...in (for object keys)
const scores: Record<string, number> = { Alice: 95, Bob: 87, Carol: 92 }
for (const name in scores) {
  console.log(`${name}: ${scores[name]}`)
}

// while
let count = 0
while (count < 5) {
  count++
}
console.log('count:', count)

// do...while
let x = 10
do {
  x -= 3
} while (x > 0)
console.log('x:', x)

// Array methods as functional loops
const doubled = numbers.map(n => n * 2)
const sum = numbers.reduce((acc, n) => acc + n, 0)
const evens = numbers.filter(n => n % 2 === 0)

console.log('doubled:', doubled)
console.log('sum:', sum)
console.log('evens:', evens)

// forEach
numbers.forEach((n, i) => {
  if (i === 0) console.log('first:', n)
})

function main(): void {
  // Nested loops
  for (let i = 1; i <= 3; i++) {
    for (let j = 1; j <= 3; j++) {
      process.stdout.write(`${i * j} `)
    }
    console.log()
  }
}

main()
