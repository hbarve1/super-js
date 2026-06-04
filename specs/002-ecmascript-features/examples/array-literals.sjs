// Array literal type inference — ECMA-262 §13.2.4 Array Initializer
// https://tc39.es/ecma262/#sec-array-initializer
//
// SJS infers Array<T> when all elements share the same type T.
// Computed member access arr[i] returns the element type.

// Homogeneous arrays — element type is inferred
const nums: number[] = [1, 2, 3]
const strs: string[] = ["hello", "world"]
const bools: boolean[] = [true, false, true]

// Computed member access — returns the element type
const first: number = nums[0]
const greeting: string = strs[0]

// Direct literal access
const val: number = [10, 20, 30][1]

// Empty array — inferred as any[], assignable to any array type
const empty: number[] = []

// Mixed array — inferred as any[] (gradual escape)
const mixed = [1, "two", true]
