// SJS Example: Object.groupBy and Map.groupBy (ES2024)
// Task 2.5 — specs/002-ecmascript-features/implementation-plan.md

type Product = { name: string; category: string; price: number }

const products: Product[] = [
  { name: "Laptop", category: "Electronics", price: 999 },
  { name: "Phone", category: "Electronics", price: 499 },
  { name: "Shirt", category: "Clothing", price: 29 },
  { name: "Pants", category: "Clothing", price: 49 },
  { name: "Book", category: "Education", price: 15 },
]

// Object.groupBy — groups into a plain object with string keys
const byCategory = Object.groupBy(products, (p: Product) => p.category)
// Result: { Electronics: [...], Clothing: [...], Education: [...] }

// Map.groupBy — groups into a Map (allows non-string keys)
const byPriceRange = Map.groupBy(products, (p: Product) => {
  if (p.price < 50) return "budget"
  if (p.price < 500) return "mid"
  return "premium"
})
// Result: Map { "budget" => [...], "mid" => [...], "premium" => [...] }

// Group numbers by remainder
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const evenOdd = Object.groupBy(numbers, (n: number) => n % 2 === 0 ? "even" : "odd")

// Group by length using Map (number keys)
const words = ["a", "bb", "ccc", "dd", "eee", "f"]
const byLength = Map.groupBy(words, (w: string) => w.length)
