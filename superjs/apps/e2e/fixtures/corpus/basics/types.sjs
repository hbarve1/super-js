// Basic Types Example

// Type aliases
type ID = number
type Name = string
type Age = number
type Status = 'active' | 'inactive' | 'pending'

// Interface definitions
interface User {
  id: ID
  name: Name
  age: Age
  status: Status
  email: string?
}

// Function with type annotations
function createUser(name: Name, age: Age): User {
  return {
    id: Math.floor(Math.random() * 1000),
    name,
    age,
    status: 'active',
    email: null
  }
}

// Array types
const users: User[] = []

// Union types in action
function updateStatus(user: User, newStatus: Status): void {
  user.status = newStatus
}

// Optional parameters
function updateEmail(user: User, email?: string): void {
  user.email = email ?? null
}

// Usage example
function main(): void {
  const user = createUser('John Doe', 30)
  users.push(user)

  updateStatus(user, 'pending')
  updateEmail(user, 'john@example.com')

  console.log('User:', user)
}

main()
