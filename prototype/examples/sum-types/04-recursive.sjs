// sum-types/04-recursive.sjs — recursive sum types, structural recursion via match

// A recursive sum type is one where a variant's fields can hold the same type.
// SJS allows this naturally — Tree<T> and List<T> are classic examples.
// Recursive functions over these types mirror the recursive structure of the data.

// --- Binary tree ---

type Tree<T> =
  | Leaf
  | Node { value: T; left: Tree<T>; right: Tree<T> }

// Structural recursion: the shape of the function mirrors the shape of the data.
function treeDepth<T>(t: Tree<T>): number {
  return match t {
    Leaf                    => 0
    Node { left; right }    => 1 + Math.max(treeDepth(left), treeDepth(right))
  }
}

function treeSize<T>(t: Tree<T>): number {
  return match t {
    Leaf                 => 0
    Node { left; right } => 1 + treeSize(left) + treeSize(right)
  }
}

function treeSum(t: Tree<number>): number {
  return match t {
    Leaf                        => 0
    Node { value; left; right } => value + treeSum(left) + treeSum(right)
  }
}

// In-order traversal returns elements in sorted order for a BST.
function inOrder<T>(t: Tree<T>): T[] {
  return match t {
    Leaf                        => []
    Node { value; left; right } => [...inOrder(left), value, ...inOrder(right)]
  }
}

// --- Singly-linked list ---

type List<T> = | Nil | Cons(T, List<T>)

function listLength<T>(l: List<T>): number {
  return match l {
    Nil        => 0
    Cons(_, t) => 1 + listLength(t)
  }
}

// Iterative conversion avoids stack overflow on long lists.
function listToArray<T>(l: List<T>): T[] {
  const acc: T[] = []
  let cur: List<T> = l
  while (true) {
    match cur {
      Nil        => break
      Cons(h, t) => { acc.push(h); cur = t }
    }
  }
  return acc
}

function arrayToList<T>(arr: T[]): List<T> {
  let result: List<T> = Nil
  // Build right-to-left so the list is in the same order as the array.
  for (let i: number = arr.length - 1; i >= 0; i--) {
    result = Cons(arr[i], result)
  }
  return result
}

function listMap<T, U>(l: List<T>, f: (x: T) => U): List<U> {
  return match l {
    Nil        => Nil
    Cons(h, t) => Cons(f(h), listMap(t, f))
  }
}

// --- Expression tree (algebraic expression evaluator) ---

type Expr =
  | Num(number)
  | Add { left: Expr; right: Expr }
  | Mul { left: Expr; right: Expr }
  | Neg { expr: Expr }

function evaluate(e: Expr): number {
  return match e {
    Num(n)            => n
    Add { left; right } => evaluate(left) + evaluate(right)
    Mul { left; right } => evaluate(left) * evaluate(right)
    Neg { expr }        => -evaluate(expr)
  }
}

function prettyPrint(e: Expr): string {
  return match e {
    Num(n)              => "" + n
    Add { left; right } => "(" + prettyPrint(left) + " + " + prettyPrint(right) + ")"
    Mul { left; right } => "(" + prettyPrint(left) + " * " + prettyPrint(right) + ")"
    Neg { expr }        => "(-" + prettyPrint(expr) + ")"
  }
}

// --- Demos ---

// Build a tree:       4
//                   /   \
//                  2     6
//                 / \   / \
//                1   3 5   7
const tree: Tree<number> = Node {
  value: 4;
  left: Node {
    value: 2;
    left:  Node { value: 1; left: Leaf; right: Leaf };
    right: Node { value: 3; left: Leaf; right: Leaf }
  };
  right: Node {
    value: 6;
    left:  Node { value: 5; left: Leaf; right: Leaf };
    right: Node { value: 7; left: Leaf; right: Leaf }
  }
}

console.log(treeDepth(tree))          // 3
console.log(treeSize(tree))           // 7
console.log(treeSum(tree))            // 28  (1+2+3+4+5+6+7)
console.log(inOrder(tree).join(","))  // 1,2,3,4,5,6,7

// Linked list demo
const list: List<number> = arrayToList([10, 20, 30, 40])
console.log(listLength(list))         // 4
console.log(listToArray(list).join(","))  // 10,20,30,40

const doubled: List<number> = listMap(list, x => x * 2)
console.log(listToArray(doubled).join(","))  // 20,40,60,80

// Expression: (3 + 4) * (-(2))  =>  7 * -2 = -14
const expr: Expr = Mul {
  left:  Add { left: Num(3); right: Num(4) };
  right: Neg { expr: Num(2) }
}
console.log(prettyPrint(expr))   // ((3 + 4) * (-2))
console.log(evaluate(expr))      // -14
