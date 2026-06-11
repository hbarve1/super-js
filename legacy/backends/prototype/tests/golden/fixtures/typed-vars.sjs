const name: string = "Alice"
const age: number = 30
const active: boolean = true
const score: number | null = null

function greet(person: string, times: number = 1): string {
  return person.repeat(times)
}

console.log(name, age, active, score)
console.log(greet("hi", 2))
