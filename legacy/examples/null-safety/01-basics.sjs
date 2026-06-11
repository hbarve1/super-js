// null-safety/01-basics.sjs — T? declarations, null narrowing with if, non-nullable by default

// T? means T | null — fields declared nullable must be explicitly handled.
// Non-nullable fields (string, number) can never be null; the compiler rejects null assignment.
// Narrowing: after `if (x === null)` branch, x is the non-null type in the else / continuing path.

interface User {
  id: number
  name: string
  email: string?
  bio: string?
}

// email is string? — must narrow before using as plain string
function formatEmail(user: User): string {
  if (user.email === null) return "(no email)"
  // user.email is string here (narrowed past null branch)
  return "mailto:" + user.email
}

// bio is string? — extract into local, then narrow
function describe(user: User): string {
  const bio: string? = user.bio
  if (bio === null) return user.name + " — no bio"
  // bio is string here
  return user.name + ": " + bio
}

// A function that accepts a nullable name and returns a greeting.
// name: string? — caller may pass null explicitly.
function greet(name: string?): string {
  if (name === null) return "Hello, stranger!"
  return "Hello, " + name + "!"
}

// Non-nullable by default: string cannot hold null.
// The two lines below would be compile errors:
//   const bad: string = null        // ERROR — string is not nullable
//   const alsobad: number = null    // ERROR — number is not nullable

// All fields explicitly provided — email present, bio absent (null).
const alice: User = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  bio: null
}

// Bio present, email absent (null).
const bob: User = {
  id: 2,
  name: "Bob",
  email: null,
  bio: "Senior Engineer at Acme"
}

// Both nullable fields absent.
const carol: User = {
  id: 3,
  name: "Carol",
  email: null,
  bio: null
}

console.log(formatEmail(alice))  // mailto:alice@example.com
console.log(formatEmail(bob))    // (no email)
console.log(formatEmail(carol))  // (no email)

console.log(describe(alice))     // Alice — no bio
console.log(describe(bob))       // Bob: Senior Engineer at Acme
console.log(describe(carol))     // Carol — no bio

console.log(greet("Dave"))       // Hello, Dave!
console.log(greet(null))         // Hello, stranger!
