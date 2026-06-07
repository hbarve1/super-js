// SJS Example: Set methods (ES2025)
// Task 4.2 — specs/002-ecmascript-features/implementation-plan.md
// Spec: https://tc39.es/proposal-set-methods/

const evens: Set<number> = new Set([2, 4, 6, 8, 10])
const primes: Set<number> = new Set([2, 3, 5, 7])

// union — elements in either set
const evenOrPrime = evens.union(primes)

// intersection — elements in both sets
const evenPrimes = evens.intersection(primes)   // {2}

// difference — elements in first but not second
const evenNonPrime = evens.difference(primes)   // {4, 6, 8, 10}

// symmetricDifference — elements in exactly one set
const symmetric = evens.symmetricDifference(primes)   // {3, 4, 5, 6, 7, 8, 10}

// isSubsetOf — all elements of this set are in other
const small: Set<number> = new Set([2, 4])
const isSub: boolean = small.isSubsetOf(evens)   // true
const isSuper: boolean = evens.isSupersetOf(small)   // true

// isDisjointFrom — no elements in common
const odds: Set<number> = new Set([1, 3, 5, 7, 9])
const noOverlap: boolean = evens.isDisjointFrom(odds)   // true

// Practical usage: tag systems
type Tag = string
const articleTags: Set<Tag> = new Set(["javascript", "typescript", "performance"])
const userInterests: Set<Tag> = new Set(["typescript", "rust", "webassembly"])

const relevantTags = articleTags.intersection(userInterests)   // {"typescript"}
const allTags = articleTags.union(userInterests)
const uniqueToArticle = articleTags.difference(userInterests)
