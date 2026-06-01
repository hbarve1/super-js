// Control Flow in SJS

// if / else if / else
function classify(n: number): string {
  if (n > 0) return 'positive'
  else if (n < 0) return 'negative'
  else return 'zero'
}

// Ternary
const abs = (n: number): number => n >= 0 ? n : -n

// Nullish coalescing
const username: string? = null
const display = username ?? 'Guest'
console.log(display)

// Optional chaining
interface User {
  name: string
  address: { city: string }?
}

const user: User = { name: 'Alice', address: null }
const city = user.address?.city ?? 'unknown'
console.log('city:', city)

// Null narrowing
function greetUser(u: User): string {
  if (u.address !== null && u.address !== undefined) {
    return `${u.name} from ${u.address.city}`
  }
  return u.name
}

// Sum type + match for exhaustive branching
type Status = | Active | Inactive | Pending { since: number }

function describeStatus(s: Status): string {
  match s {
    Active => 'currently active'
    Inactive => 'not active'
    Pending { since } => `pending since ${new Date(since).toDateString()}`
  }
}

// Early return pattern
function processValue(n: number): string {
  if (n < 0) return 'negative not allowed'
  if (n === 0) return 'zero'
  if (n > 100) return 'too large'
  return `value: ${n}`
}

function main(): void {
  console.log(classify(5))   // positive
  console.log(classify(-3))  // negative
  console.log(classify(0))   // zero
  console.log(abs(-7))       // 7

  const status = Pending({ since: Date.now() })
  console.log(describeStatus(status))
  console.log(describeStatus(Active()))

  for (const v of [-1, 0, 50, 200]) {
    console.log(processValue(v))
  }
}

main()
