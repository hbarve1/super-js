// Objects in SJS

// Interface definition
type Person {
  name: string
  age: number
  email: string?
}

// Object creation
const alice: Person = {
  name: 'Alice',
  age: 30,
  email: 'alice@example.com'
}

const bob: Person = {
  name: 'Bob',
  age: 25,
  email: null
}

// Destructuring
const { name, age, email } = alice
console.log(name, age, email)

// Spread / update
const older: Person = { ...alice, age: alice.age + 1 }
console.log('older:', older.age)

// Optional chaining for nullable field
console.log('email length:', alice.email?.length)

// Object methods via interface
type Counter {
  value: number
  increment(): void
  decrement(): void
  reset(): void
}

function createCounter(initial: number): Counter {
  let value = initial
  return {
    get value() { return value },
    increment() { value++ },
    decrement() { value-- },
    reset() { value = 0 }
  }
}

// Nested objects
type Address {
  street: string
  city: string
  country: string
}

type Employee {
  person: Person
  address: Address
  department: string
}

function main(): void {
  const counter = createCounter(0)
  counter.increment()
  counter.increment()
  counter.decrement()
  console.log('counter:', counter.value)  // 1

  const people: Person[] = [alice, bob]
  for (const p of people) {
    console.log(`${p.name}: ${p.email ?? 'no email'}`)
  }
}

main()
