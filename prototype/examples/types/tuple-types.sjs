// types/tuple-types.sjs — fixed-length tuple types, destructuring, tuples as records
// Tuples are fixed-length arrays where each position has a distinct type.
// Use them for small, positional data bundles (coordinate, range, pair).

// --- Basic tuple type aliases ---

type Point2D = [number, number]
type Point3D = [number, number, number]
type Range   = [number, number]
type Pair<A, B> = [A, B]
type Triple<A, B, C> = [A, B, C]

// --- Functions that take and return tuples ---

function makePoint(x: number, y: number): Point2D {
  return [x, y]
}

function distance(a: Point2D, b: Point2D): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  return Math.sqrt(dx * dx + dy * dy)
}

function midpoint(a: Point2D, b: Point2D): Point2D {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
}

function inRange(value: number, range: Range): boolean {
  return value >= range[0] && value <= range[1]
}

function clampToRange(value: number, range: Range): number {
  if (value < range[0]) return range[0]
  if (value > range[1]) return range[1]
  return value
}

// Swap a pair — generic, works for any two types
function swap<A, B>(pair: Pair<A, B>): Pair<B, A> {
  return [pair[1], pair[0]]
}

// Zip two arrays into an array of pairs
function zip<A, B>(as: A[], bs: B[]): Pair<A, B>[] {
  const len = Math.min(as.length, bs.length)
  const result: Pair<A, B>[] = []
  for (let i = 0; i < len; i++) {
    result.push([as[i], bs[i]])
  }
  return result
}

// Unzip an array of pairs into two arrays
function unzip<A, B>(pairs: Pair<A, B>[]): Pair<A[], B[]> {
  const as: A[] = []
  const bs: B[] = []
  for (const pair of pairs) {
    as.push(pair[0])
    bs.push(pair[1])
  }
  return [as, bs]
}

// Return multiple values cleanly via tuple
function minMax(nums: number[]): Pair<number, number> {
  let lo = nums[0]
  let hi = nums[0]
  for (const n of nums) {
    if (n < lo) lo = n
    if (n > hi) hi = n
  }
  return [lo, hi]
}

function add3D(a: Point3D, b: Point3D): Point3D {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

// --- Tuple destructuring ---

const origin: Point2D = [0, 0]
const p1: Point2D = makePoint(3, 4)
const p2: Point2D = makePoint(6, 8)

const [x1, y1] = p1
const [x2, y2] = p2
console.log(`p1=(${x1},${y1}), p2=(${x2},${y2})`)  // p1=(3,4), p2=(6,8)

console.log(distance(origin, p1))   // 5
console.log(distance(p1, p2))       // 5

const mid = midpoint(p1, p2)
const [mx, my] = mid
console.log(`midpoint=(${mx},${my})`)  // midpoint=(4.5,6)

const score: Range = [0, 100]
console.log(inRange(50, score))    // true
console.log(inRange(150, score))   // false
console.log(clampToRange(150, score))  // 100
console.log(clampToRange(-5, score))   // 0

const pair: Pair<string, number> = ["age", 30]
const swapped = swap(pair)
const [val, key] = swapped
console.log(`${key}: ${val}`)  // 30: age

const names = ["alice", "bob", "carol"]
const scores = [95, 87, 92]
const zipped = zip(names, scores)
for (const [name, score2] of zipped) {
  console.log(`${name}: ${score2}`)
}
// alice: 95
// bob: 87
// carol: 92

const [unzippedNames, unzippedScores] = unzip(zipped)
console.log(unzippedNames)   // ["alice","bob","carol"]
console.log(unzippedScores)  // [95,87,92]

const data = [3, 1, 4, 1, 5, 9, 2, 6]
const [lo, hi] = minMax(data)
console.log(`min=${lo}, max=${hi}`)  // min=1, max=9

const a3: Point3D = [1, 2, 3]
const b3: Point3D = [4, 5, 6]
const sum3 = add3D(a3, b3)
console.log(sum3)  // [5, 7, 9]
