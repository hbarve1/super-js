// ── Type Guards & Narrowing ────────────────────────────────────────────────

// typeof narrowing
function formatValue(value: string | number | boolean): string {
  if (typeof value === "string")  return `"${value}"`
  if (typeof value === "number")  return value.toFixed(2)
  if (typeof value === "boolean") return value ? "yes" : "no"
  return String(value)
}

// instanceof narrowing
class Cat {
  name: string
  constructor(name: string) { this.name = name }
  purr(): string { return "Purr..." }
}

class Dog {
  name: string
  constructor(name: string) { this.name = name }
  bark(): string { return "Woof!" }
}

function makeSound(animal: Cat | Dog): string {
  if (animal instanceof Cat) return animal.purr()
  return animal.bark()
}

// in operator narrowing
type Fish = { swim(): void; breathe(): "water" }
type Bird = { fly(): void; breathe(): "air" }

function describe(creature: Fish | Bird): string {
  if ("swim" in creature) return "It swims"
  return "It flies"
}

// Truthiness narrowing
function printLength(value: string | null | undefined): void {
  if (value) {
    console.log(`Length: ${value.length}`)
  } else {
    console.log("No value")
  }
}

// User-defined type guard (type predicate)
interface Car  { make: string; model: string }
interface Bike { brand: string; gears: number }

function isCar(vehicle: Car | Bike): vehicle is Car {
  return "make" in vehicle
}

function describeVehicle(v: Car | Bike): string {
  if (isCar(v)) return `${v.make} ${v.model}`
  return `${v.brand} with ${v.gears} gears`
}

// Assertion functions (throw on wrong type)
function assertIsString(val: unknown): asserts val is string {
  if (typeof val !== "string") {
    throw new TypeError(`Expected string, got ${typeof val}`)
  }
}

// Discriminated union narrowing
type LoadingState = { status: "loading" }
type SuccessState<T> = { status: "success"; data: T }
type ErrorState = { status: "error"; message: string }
type AsyncState<T> = LoadingState | SuccessState<T> | ErrorState

function renderState<T>(state: AsyncState<T>): string {
  switch (state.status) {
    case "loading": return "⏳ Loading..."
    case "success": return `✅ Data: ${JSON.stringify(state.data)}`
    case "error":   return `❌ Error: ${state.message}`
  }
}

// Control flow narrowing
function processInput(input: string | number | null): string {
  if (input === null) return "null"

  // input is now string | number
  if (typeof input === "number") {
    return `number: ${input}`
  }

  // input is now string
  return `string: ${input.toUpperCase()}`
}

// Array type guard
function isStringArray(arr: unknown[]): arr is string[] {
  return arr.every(item => typeof item === "string")
}

// Usage
console.log(formatValue("hello"), formatValue(3.14159), formatValue(true))
console.log(makeSound(new Cat("Whiskers")))
console.log(makeSound(new Dog("Rex")))

const fish: Fish = { swim() {}, breathe() { return "water" } }
const bird: Bird = { fly() {}, breathe() { return "air" } }
console.log(describe(fish), describe(bird))

printLength("hello")
printLength(null)

const car: Car = { make: "Toyota", model: "Corolla" }
const bike: Bike = { brand: "Trek", gears: 21 }
console.log(describeVehicle(car), describeVehicle(bike))

const str: unknown = "hello world"
assertIsString(str)
console.log(str.toUpperCase())

console.log(renderState<number>({ status: "loading" }))
console.log(renderState<number>({ status: "success", data: 42 }))
console.log(renderState<number>({ status: "error", message: "Not found" }))

console.log(processInput(null), processInput(7), processInput("world"))
console.log(isStringArray(["a", "b", "c"]), isStringArray([1, 2, 3]))
