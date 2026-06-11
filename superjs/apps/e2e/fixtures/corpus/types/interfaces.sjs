// types/interfaces.sjs — structural interfaces and satisfaction by shape
// SJS uses structural (Go-style) typing: any value that has the required
// fields/methods satisfies an interface, whether or not it says "implements".

// --- Interface declarations ---

interface Shape {
  area(): number
  perimeter(): number
}

interface Drawable {
  draw(): void
}

interface Named {
  name: string
}

// Circle satisfies Shape, Drawable, and Named structurally (no keyword needed).
class Circle {
  name: string = "circle"
  radius: number

  constructor(r: number) {
    this.radius = r
  }

  area(): number {
    return Math.PI * this.radius * this.radius
  }

  perimeter(): number {
    return 2 * Math.PI * this.radius
  }

  draw(): void {
    console.log(`Circle(r=${this.radius})`)
  }
}

// Square uses the optional `implements` keyword — purely documentary.
class Square implements Shape {
  name: string = "square"
  side: number

  constructor(s: number) {
    this.side = s
  }

  area(): number {
    return this.side * this.side
  }

  perimeter(): number {
    return 4 * this.side
  }

  draw(): void {
    console.log(`Square(side=${this.side})`)
  }
}

class Triangle implements Shape, Drawable {
  name: string = "triangle"
  base: number
  height: number
  sideLength: number

  constructor(base: number, height: number, sideLength: number) {
    this.base = base
    this.height = height
    this.sideLength = sideLength
  }

  area(): number {
    return 0.5 * this.base * this.height
  }

  perimeter(): number {
    return 3 * this.sideLength
  }

  draw(): void {
    console.log(`Triangle(base=${this.base}, height=${this.height})`)
  }
}

// --- Functions that accept interfaces, not concrete types ---

function printArea(s: Shape): void {
  console.log("area:", s.area())
}

function printPerimeter(s: Shape): void {
  console.log("perimeter:", s.perimeter())
}

function drawShape(d: Drawable): void {
  d.draw()
}

function printName(n: Named): void {
  console.log("name:", n.name)
}

// A function that requires BOTH Shape and Drawable.
// SJS uses intersection (&) for multi-interface parameters.
function describeShape(s: Shape & Drawable & Named): void {
  console.log(`${s.name}: area=${s.area().toFixed(2)}, perimeter=${s.perimeter().toFixed(2)}`)
  s.draw()
}

// --- Demos ---

const c = new Circle(5)
const sq = new Square(4)
const t = new Triangle(6, 4, 5)

printArea(c)          // area: 78.539...
printArea(sq)         // area: 16
printArea(t)          // area: 12

printPerimeter(sq)    // perimeter: 16
printPerimeter(t)     // perimeter: 15

drawShape(c)          // Circle(r=5)
drawShape(sq)         // Square(side=4)
drawShape(t)          // Triangle(base=6, height=4)

printName(c)          // name: circle
printName(sq)         // name: square

describeShape(c)      // circle: area=78.54, perimeter=31.42 / Circle(r=5)
describeShape(sq)     // square: area=16.00, perimeter=16.00 / Square(side=4)

// An array typed as Shape[] — holds any Shape-satisfying value.
const shapes: Shape[] = [c, sq, t]
shapes.forEach(s => printArea(s))
