// generics/02-constraints.sjs — <T: Interface> constraint syntax
// Constraints restrict what T can be, enabling interface methods on T inside a function.
// SJS uses <T: Interface> — NOT <T extends Interface>.
// Multiple constraints: <T: A & B>

// --- Constraint interfaces ---

type Ordered {
  lessThan(other: Ordered): boolean
}

type Serializable {
  serialize(): string
}

type HasId {
  id: number
}

type Describable {
  describe(): string
}

type Measurable {
  measure(): number
}

// --- Singly-constrained generic functions ---

function sortAscending<T: Ordered>(items: T[]): T[] {
  return [...items].sort((a, b) => a.lessThan(b) ? -1 : b.lessThan(a) ? 1 : 0)
}

function findSmallest<T: Ordered>(items: T[]): T? {
  if (items.length === 0) return null
  let smallest = items[0]
  for (let i = 1; i < items.length; i++) {
    if (items[i].lessThan(smallest)) smallest = items[i]
  }
  return smallest
}

function serializeAll<T: Serializable>(items: T[]): string[] {
  return items.map(item => item.serialize())
}

function findById<T: HasId>(items: T[], id: number): T? {
  for (const item of items) {
    if (item.id === id) return item
  }
  return null
}

// --- Multi-constrained generic functions (<T: A & B>) ---

function serializeAndDescribe<T: Serializable & Describable>(item: T): string {
  return item.describe() + " => " + item.serialize()
}

function summarize<T: Describable & Measurable>(items: T[]): void {
  for (const item of items) {
    console.log(`${item.describe()}: ${item.measure()}`)
  }
}

// --- Generic class with constraint ---

class SortedList<T: Ordered> {
  private items: T[] = []

  insert(item: T): void {
    this.items.push(item)
    this.items.sort((a, b) => a.lessThan(b) ? -1 : b.lessThan(a) ? 1 : 0)
  }

  min(): T? {
    return this.items.length > 0 ? this.items[0] : null
  }

  max(): T? {
    return this.items.length > 0 ? this.items[this.items.length - 1] : null
  }

  toArray(): T[] {
    return [...this.items]
  }
}

// --- Concrete classes satisfying constraints ---

class Weight implements Ordered, Serializable, Describable, Measurable {
  grams: number

  constructor(g: number) {
    this.grams = g
  }

  lessThan(other: Ordered): boolean {
    if (other instanceof Weight) return this.grams < other.grams
    return false
  }

  serialize(): string {
    return `{"grams":${this.grams}}`
  }

  describe(): string {
    return `Weight(${this.grams}g)`
  }

  measure(): number {
    return this.grams
  }
}

class Score implements Ordered, Serializable, HasId {
  id: number
  points: number

  constructor(id: number, points: number) {
    this.id = id
    this.points = points
  }

  lessThan(other: Ordered): boolean {
    if (other instanceof Score) return this.points < other.points
    return false
  }

  serialize(): string {
    return `{"id":${this.id},"points":${this.points}}`
  }
}

// --- Demos ---

const weights = [new Weight(500), new Weight(200), new Weight(800), new Weight(100)]
const sorted = sortAscending(weights)
console.log(sorted.map(w => w.grams))  // [100, 200, 500, 800]

const smallest = findSmallest(weights)
if (smallest !== null) {
  console.log("smallest:", smallest.grams)  // smallest: 100
}

const scores = [new Score(1, 85), new Score(2, 92), new Score(3, 78)]
const serialized = serializeAll(scores)
console.log(serialized)
// ['{"id":1,"points":85}', '{"id":2,"points":92}', '{"id":3,"points":78}']

const found = findById(scores, 2)
if (found !== null) {
  console.log("found:", found.points)  // found: 92
}

const w = new Weight(350)
console.log(serializeAndDescribe(w))  // Weight(350g) => {"grams":350}

const heavies = [new Weight(1000), new Weight(250), new Weight(600)]
summarize(heavies)
// Weight(250g): 250
// Weight(600g): 600
// Weight(1000g): 1000

const list = new SortedList<Weight>()
list.insert(new Weight(400))
list.insert(new Weight(150))
list.insert(new Weight(700))

const min = list.min()
const max = list.max()
if (min !== null) console.log("min:", min.grams)   // min: 150
if (max !== null) console.log("max:", max.grams)   // max: 700
console.log(list.toArray().map(w2 => w2.grams))    // [150, 400, 700]
