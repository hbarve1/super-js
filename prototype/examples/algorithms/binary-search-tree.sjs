// Binary Search Tree in SJS

interface BSTNode<T> {
  value: T
  left: BSTNode<T>?
  right: BSTNode<T>?
}

interface BST<T> {
  root: BSTNode<T>?
  insert(value: T): void
  contains(value: T): boolean
  inOrder(): T[]
  min(): T?
  max(): T?
}

function createBST<T>(compare: (a: T, b: T) => number): BST<T> {
  let root: BSTNode<T>? = null

  function insertNode(node: BSTNode<T>?, value: T): BSTNode<T> {
    if (node === null || node === undefined) return { value, left: null, right: null }
    const cmp = compare(value, node.value)
    if (cmp < 0) return { ...node, left: insertNode(node.left, value) }
    if (cmp > 0) return { ...node, right: insertNode(node.right, value) }
    return node  // duplicate, ignore
  }

  function containsNode(node: BSTNode<T>?, value: T): boolean {
    if (node === null || node === undefined) return false
    const cmp = compare(value, node.value)
    if (cmp === 0) return true
    if (cmp < 0) return containsNode(node.left, value)
    return containsNode(node.right, value)
  }

  function inOrderNode(node: BSTNode<T>?, result: T[]): void {
    if (node === null || node === undefined) return
    inOrderNode(node.left, result)
    result.push(node.value)
    inOrderNode(node.right, result)
  }

  function minNode(node: BSTNode<T>?): T? {
    if (node === null || node === undefined) return null
    if (node.left === null || node.left === undefined) return node.value
    return minNode(node.left)
  }

  return {
    get root() { return root },
    insert(value) { root = insertNode(root, value) },
    contains(value) { return containsNode(root, value) },
    inOrder() {
      const result: T[] = []
      inOrderNode(root, result)
      return result
    },
    min() { return minNode(root) },
    max() {
      let node = root
      while (node !== null && node !== undefined && node.right !== null && node.right !== undefined) {
        node = node.right
      }
      return node !== null && node !== undefined ? node.value : null
    }
  }
}

function main(): void {
  const bst = createBST<number>((a, b) => a - b)
  for (const n of [5, 3, 7, 1, 4, 6, 8]) bst.insert(n)
  console.log('in-order:', bst.inOrder())  // [1,3,4,5,6,7,8]
  console.log('min:', bst.min())            // 1
  console.log('max:', bst.max())            // 8
  console.log('contains 4:', bst.contains(4))   // true
  console.log('contains 9:', bst.contains(9))   // false
}

main()
