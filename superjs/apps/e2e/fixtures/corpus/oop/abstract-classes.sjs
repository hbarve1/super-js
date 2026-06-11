// Abstract Classes in SJS
// SJS uses structural typing — interfaces serve as abstract contracts.
// There is no `abstract class` keyword. Instead, define an interface that
// specifies the contract, then implement it with factory functions.

// ─── Animal contract ──────────────────────────────────────────────────────────

interface Animal {
  name: string
  sound(): string
  describe(): string
}

// Factory functions fulfil the contract — no `implements` needed
function createDog(name: string): Animal {
  return {
    name,
    sound: () => 'Woof',
    describe: () => `${name} says Woof`
  }
}

function createCat(name: string): Animal {
  return {
    name,
    sound: () => 'Meow',
    describe: () => `${name} says Meow`
  }
}

function createParrot(name: string, phrase: string): Animal {
  return {
    name,
    sound: () => phrase,
    describe: () => `${name} says "${phrase}"`
  }
}

// ─── Shape contract ───────────────────────────────────────────────────────────

interface Shape {
  area(): number
  perimeter(): number
  toString(): string
}

function createCircle(radius: number): Shape {
  return {
    area: () => Math.PI * radius * radius,
    perimeter: () => 2 * Math.PI * radius,
    toString: () => `Circle(r=${radius})`
  }
}

function createRectangle(w: number, h: number): Shape {
  return {
    area: () => w * h,
    perimeter: () => 2 * (w + h),
    toString: () => `Rect(${w}x${h})`
  }
}

function createTriangle(a: number, b: number, c: number): Shape {
  // Heron's formula for area
  const s = (a + b + c) / 2
  return {
    area: () => Math.sqrt(s * (s - a) * (s - b) * (s - c)),
    perimeter: () => a + b + c,
    toString: () => `Triangle(${a}, ${b}, ${c})`
  }
}

// ─── Polymorphic helpers ───────────────────────────────────────────────────────

function printShapeInfo(shape: Shape): void {
  console.log(
    `${shape.toString()}: area=${shape.area().toFixed(2)}, perimeter=${shape.perimeter().toFixed(2)}`
  )
}

function loudestAnimal(animals: Animal[]): Animal? {
  if (animals.length === 0) return null
  return animals.reduce((best, a) =>
    a.sound().length >= best.sound().length ? a : best
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main(): void {
  // Animals — same interface, different factories
  const animals: Animal[] = [
    createDog('Rex'),
    createCat('Whiskers'),
    createParrot('Polly', 'Pieces of eight!')
  ]

  console.log('=== Animals ===')
  for (const a of animals) {
    console.log(a.describe())
  }

  const loudest = loudestAnimal(animals)
  if (loudest !== null) {
    console.log(`Loudest: ${loudest.name}`)
  }

  // Shapes — same interface, different factories
  const shapes: Shape[] = [
    createCircle(5),
    createRectangle(4, 6),
    createTriangle(3, 4, 5)
  ]

  console.log('\n=== Shapes ===')
  for (const s of shapes) {
    printShapeInfo(s)
  }
}

main()
