interface Point {
  x: number
  y: number
  label?: string
}

function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

const p1: Point = { x: 0, y: 0 }
const p2: Point = { x: 3, y: 4 }
console.log(distance(p1, p2))
