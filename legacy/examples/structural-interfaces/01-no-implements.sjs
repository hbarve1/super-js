// structural-interfaces/01-no-implements.sjs — satisfaction by shape
//
// SJS uses structural typing: a value satisfies an interface if it has
// the required fields and methods, regardless of whether it declares
// `implements`. No `implements` keyword is needed (or supported).
//
// This means:
//   - Classes satisfy interfaces automatically by having the right shape.
//   - Plain object literals satisfy interfaces too.
//   - A value can satisfy multiple interfaces simultaneously.

// ─── Interfaces ────────────────────────────────────────────────────────────

interface Named {
  name: string
}

interface Printable {
  print(): void
}

interface Serializable {
  serialize(): string
}

// ─── Class — no `implements` ───────────────────────────────────────────────

// Product does NOT declare `implements Named`, `implements Printable`, or
// `implements Serializable`. It satisfies all three purely by shape.
class Product {
  name: string
  price: number

  constructor(name: string, price: number) {
    this.name = name
    this.price = price
  }

  serialize(): string {
    return JSON.stringify({ name: this.name, price: this.price })
  }

  print(): void {
    console.log(this.name + " $" + this.price)
  }
}

// A second class — also satisfies Named and Printable without declaring it.
class Category {
  name: string
  description: string

  constructor(name: string, description: string) {
    this.name = name
    this.description = description
  }

  print(): void {
    console.log("[" + this.name + "] " + this.description)
  }
}

// ─── Plain object literals satisfy interfaces too ──────────────────────────

// A plain object with a `name` field satisfies Named.
const tag: Named = { name: "featured" }

// ─── Functions that accept interfaces ─────────────────────────────────────

// Accepts anything with a `name` field — Product, Category, plain object.
function printName(n: Named): void {
  console.log(n.name)
}

// Accepts anything with a `print()` method.
function printAll(items: Printable[]): void {
  items.forEach(item => item.print())
}

// Accepts anything with a `serialize()` method.
function saveAll(items: Serializable[]): string[] {
  return items.map(item => item.serialize())
}

// ─── Demo ──────────────────────────────────────────────────────────────────

const widget   = new Product("Widget", 9.99)
const gadget   = new Product("Gadget", 24.99)
const electronics = new Category("Electronics", "Devices and accessories")

// Product and Category both satisfy Named — no implements required
printName(widget)       // Widget
printName(gadget)       // Gadget
printName(electronics)  // Electronics
printName(tag)          // featured

// Product and Category both satisfy Printable
printAll([widget, gadget, electronics])
// Widget $9.99
// Gadget $24.99
// [Electronics] Devices and accessories

// Only Product satisfies Serializable (Category has no serialize method)
const serialized = saveAll([widget, gadget])
serialized.forEach(s => console.log(s))
// {"name":"Widget","price":9.99}
// {"name":"Gadget","price":24.99}
