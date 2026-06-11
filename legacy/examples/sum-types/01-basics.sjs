// sum-types/01-basics.sjs — sum type declarations (unit/tuple/struct variants), construction syntax, match for dispatch

// A sum type (also called a discriminated union) describes a value that is
// exactly one of several named shapes.  SJS supports three variant forms:
//   - unit     : no data (e.g. Point, North)
//   - struct   : named fields  (e.g. Circle { radius: number })
//   - tuple    : positional fields  (e.g. Ok(T))

// --- Declarations ---

type Shape =
  | Circle { radius: number }
  | Rectangle { width: number; height: number }
  | Point

type Color =
  | Red
  | Green
  | Blue
  | Custom { r: number; g: number; b: number }

type Direction = | North | South | East | West

// --- Construction ---
// Struct variant: use { field: value } syntax.
// Unit variant:   write the name alone.

const c: Shape = Circle { radius: 5 }
const r: Shape = Rectangle { width: 4; height: 6 }
const p: Shape = Point

const highlight: Color = Custom { r: 255; g: 128; b: 0 }
const primary: Color = Red

const heading: Direction = North

// --- match for dispatch ---
// match is exhaustive — every variant must be covered (or use wildcard _).
// Struct fields are destructured directly in the pattern.

function area(s: Shape): number {
  return match s {
    Circle { radius }          => Math.PI * radius * radius
    Rectangle { width; height } => width * height
    Point                      => 0
  }
}

function colorName(col: Color): string {
  return match col {
    Red                    => "red"
    Green                  => "green"
    Blue                   => "blue"
    Custom { r; g; b }     => "rgb(" + r + "," + g + "," + b + ")"
  }
}

function opposite(d: Direction): Direction {
  return match d {
    North => South
    South => North
    East  => West
    West  => East
  }
}

// --- Demos ---

console.log(area(c))           // 78.53981633974483
console.log(area(r))           // 24
console.log(area(p))           // 0

console.log(colorName(primary))    // red
console.log(colorName(highlight))  // rgb(255,128,0)

console.log(colorName(Green))  // green
console.log(colorName(Blue))   // blue

// opposite is its own inverse
const d: Direction = East
const back: Direction = opposite(opposite(d))
console.log(colorName(Red))    // red  (sanity check)
console.log(back === d)        // true — opposite(opposite(East)) === East
