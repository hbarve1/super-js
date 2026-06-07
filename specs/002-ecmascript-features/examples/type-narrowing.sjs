// SJS Example: Type Narrowing (ES2015+)
// Task 1.5 — specs/002-ecmascript-features/implementation-plan.md

// typeof narrowing
function format(value: string | number): string {
  if (typeof value === "string") {
    return value.toUpperCase()   // value: string here
  }
  return value.toFixed(2)        // value: number here
}

// null check narrowing
function greet(name: string | null): string {
  if (name !== null) {
    return `Hello, ${name}!`     // name: string here
  }
  return "Hello, stranger!"
}

// undefined check
function useDefault(value: number | undefined): number {
  if (value !== undefined) {
    return value * 2             // value: number here
  }
  return 0
}

// instanceof narrowing
function handleError(e: unknown): string {
  if (e instanceof Error) {
    return e.message             // e: Error here
  }
  return String(e)
}

// Truthy check removes null/undefined
function process(data: string | null | undefined): string {
  if (data) {
    return data.trim()           // data: string here
  }
  return ""
}

// in operator narrowing
type Cat = { meow: () => string }
type Dog = { bark: () => string }
function makeSound(animal: Cat | Dog): string {
  if ("meow" in animal) {
    return animal.meow()         // animal: Cat here
  }
  return animal.bark()           // animal: Dog here
}
