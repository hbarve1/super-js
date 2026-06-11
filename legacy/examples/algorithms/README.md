# Algorithms

Classic algorithms and data structures implemented in SJS.

## Files

| File | Data Structure / Algorithm | Complexity |
|------|---------------------------|------------|
| `binary-search-tree.sjs` | BST — insert, contains, in-order | O(log n) avg |
| `graph.sjs` | Adjacency list — BFS, DFS, hasPath | O(V+E) |
| `hash-map.sjs` | Hash map with chaining | O(1) avg |
| `linked-list.sjs` | Singly linked list | O(n) |
| `sorting.sjs` | Merge sort, quick sort, binary search | O(n log n) |
| `stack-queue.sjs` | Stack, queue, expression balancer | O(1) push/pop |

## SJS Idioms in Algorithms

```sjs
// T? for nodes that may be absent
interface BSTNode<T> {
  value: T
  left: BSTNode<T>?
  right: BSTNode<T>?
}

// T | undefined for JS runtime returns (Array.pop, Map.get)
const top = items.pop()  // T | undefined — JS semantics
return top !== undefined ? top : null  // convert to T? at API boundary

// Generic comparator type
type Compare<T> = (a: T, b: T) => number
```
