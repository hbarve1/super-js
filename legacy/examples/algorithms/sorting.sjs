// Sorting Algorithms in SJS

// Generic comparator
type Compare<T> = (a: T, b: T) => number

// Merge sort — O(n log n)
function mergeSort<T>(arr: T[], compare: Compare<T>): T[] {
  if (arr.length <= 1) return arr
  const mid = Math.floor(arr.length / 2)
  const left = mergeSort(arr.slice(0, mid), compare)
  const right = mergeSort(arr.slice(mid), compare)
  return merge(left, right, compare)
}

function merge<T>(left: T[], right: T[], compare: Compare<T>): T[] {
  const result: T[] = []
  let l = 0
  let r = 0
  while (l < left.length && r < right.length) {
    if (compare(left[l], right[r]) <= 0) result.push(left[l++])
    else result.push(right[r++])
  }
  return [...result, ...left.slice(l), ...right.slice(r)]
}

// Quick sort — O(n log n) avg
function quickSort<T>(arr: T[], compare: Compare<T>): T[] {
  if (arr.length <= 1) return arr
  const pivot = arr[Math.floor(arr.length / 2)]
  const left = arr.filter(x => compare(x, pivot) < 0)
  const mid = arr.filter(x => compare(x, pivot) === 0)
  const right = arr.filter(x => compare(x, pivot) > 0)
  return [...quickSort(left, compare), ...mid, ...quickSort(right, compare)]
}

// Binary search — O(log n) on sorted array
function binarySearch<T>(arr: T[], target: T, compare: Compare<T>): number? {
  let low = 0
  let high = arr.length - 1
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const cmp = compare(arr[mid], target)
    if (cmp === 0) return mid
    if (cmp < 0) low = mid + 1
    else high = mid - 1
  }
  return null
}

function main(): void {
  const nums = [64, 34, 25, 12, 22, 11, 90]
  const numCmp: Compare<number> = (a, b) => a - b

  console.log('merge sort:', mergeSort(nums, numCmp))
  console.log('quick sort:', quickSort(nums, numCmp))

  const sorted = mergeSort(nums, numCmp)
  const idx = binarySearch(sorted, 25, numCmp)
  if (idx !== null) console.log('found 25 at index', idx)

  // String sorting
  const names = ['Carol', 'Alice', 'Bob', 'Dave']
  const strCmp: Compare<string> = (a, b) => a.localeCompare(b)
  console.log('sorted names:', mergeSort(names, strCmp))
}

main()
