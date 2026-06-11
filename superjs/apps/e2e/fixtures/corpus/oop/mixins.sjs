// Mixins in SJS
// Classical mixins rely on prototype mutation and are fragile.
// SJS prefers explicit behavior composition via factory functions:
//   withFeature(obj) returns a new object with the extra capability mixed in.

// ─── Behavior interfaces ──────────────────────────────────────────────────────

interface Timestamped {
  createdAt: number
  updatedAt: number
  touch(): void
}

interface Validatable {
  validate(): string[]   // empty array = valid
  isValid(): boolean
}

interface Serializable {
  toJSON(): string
}

// ─── Behavior factories (the "mixins") ───────────────────────────────────────

// withTimestamps wraps any object T and adds timestamp tracking.
// T is kept generic so the composed type retains all original fields.
function withTimestamps<T>(obj: T): T & Timestamped {
  const createdAt = Date.now()
  let updatedAt = createdAt
  return {
    ...obj,
    createdAt,
    get updatedAt() { return updatedAt },
    touch() { updatedAt = Date.now() }
  }
}

// withSerialization adds JSON serialisation to any object.
function withSerialization<T>(obj: T): T & Serializable {
  return {
    ...obj,
    toJSON: () => JSON.stringify(obj)
  }
}

// ─── Domain objects ───────────────────────────────────────────────────────────

interface UserData {
  name: string
  email: string
  role: string
}

// Composed type: UserData + timestamps + validation + serialisation
type User = UserData & Timestamped & Validatable & Serializable

function createUser(name: string, email: string, role: string): User {
  const data: UserData = { name, email, role }
  const timed = withTimestamps(data)
  const serializable = withSerialization(timed)

  return {
    ...serializable,
    validate(): string[] {
      const errors: string[] = []
      if (name.trim().length === 0)    errors.push('name is required')
      if (!email.includes('@'))        errors.push('email must contain @')
      if (role.trim().length === 0)    errors.push('role is required')
      return errors
    },
    isValid(): boolean {
      return this.validate().length === 0
    }
  }
}

// ─── Another domain object ────────────────────────────────────────────────────

interface ProductData {
  sku: string
  price: number
  stock: number
}

type Product = ProductData & Timestamped & Validatable

function createProduct(sku: string, price: number, stock: number): Product {
  const data: ProductData = { sku, price, stock }
  const timed = withTimestamps(data)

  return {
    ...timed,
    validate(): string[] {
      const errors: string[] = []
      if (sku.trim().length === 0) errors.push('sku is required')
      if (price < 0)               errors.push('price must be >= 0')
      if (stock < 0)               errors.push('stock must be >= 0')
      return errors
    },
    isValid(): boolean {
      return this.validate().length === 0
    }
  }
}

// ─── Helpers that work on any Validatable ────────────────────────────────────

function printValidation(label: string, v: Validatable): void {
  const errors = v.validate()
  if (errors.length === 0) {
    console.log(`${label}: valid`)
  } else {
    console.log(`${label}: INVALID — ${errors.join(', ')}`)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main(): void {
  console.log('=== Users ===')

  const alice = createUser('Alice', 'alice@example.com', 'admin')
  printValidation('alice', alice)
  console.log('  JSON:', alice.toJSON())
  console.log('  Created:', new Date(alice.createdAt).toISOString())

  const badUser = createUser('', 'not-an-email', '')
  printValidation('badUser', badUser)

  console.log('\n=== Products ===')

  const widget = createProduct('WGT-001', 9.99, 100)
  printValidation('widget', widget)
  console.log(`  ${widget.sku} @ $${widget.price} (${widget.stock} in stock)`)

  const badProduct = createProduct('', -5, -1)
  printValidation('badProduct', badProduct)

  // Demonstrate touch() updates updatedAt
  const before = alice.updatedAt
  alice.touch()
  console.log('\n=== Touch ===')
  console.log('  updatedAt changed:', alice.updatedAt >= before)
}

main()
