// Stack and Queue in SJS

type Stack<T> {
  push(item: T): void
  pop(): T?
  peek(): T?
  isEmpty(): boolean
  size(): number
}

type Queue<T> {
  enqueue(item: T): void
  dequeue(): T?
  front(): T?
  isEmpty(): boolean
  size(): number
}

function createStack<T>(): Stack<T> {
  const items: T[] = []
  return {
    push(item) { items.push(item) },
    pop() {
      // Array.pop() returns T | undefined (JS runtime) — convert to T?
      const v = items.pop()
      return v !== undefined ? v : null
    },
    peek() {
      const v = items[items.length - 1]
      return v !== undefined ? v : null
    },
    isEmpty() { return items.length === 0 },
    size() { return items.length }
  }
}

function createQueue<T>(): Queue<T> {
  const items: T[] = []
  return {
    enqueue(item) { items.push(item) },
    dequeue() {
      // Array.shift() returns T | undefined (JS runtime) — convert to T?
      const v = items.shift()
      return v !== undefined ? v : null
    },
    front() {
      const v = items[0]
      return v !== undefined ? v : null
    },
    isEmpty() { return items.length === 0 },
    size() { return items.length }
  }
}

// Practical: expression balance checker using stack
function isBalanced(expr: string): boolean {
  const stack = createStack<string>()
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' }
  for (const ch of expr) {
    if ('([{'.includes(ch)) stack.push(ch)
    else if (')]}'.includes(ch)) {
      const top = stack.pop()
      if (top === null || top !== pairs[ch]) return false
    }
  }
  return stack.isEmpty()
}

function main(): void {
  const stack = createStack<number>()
  stack.push(1); stack.push(2); stack.push(3)
  console.log('peek:', stack.peek())   // 3
  console.log('pop:', stack.pop())     // 3
  console.log('size:', stack.size())   // 2

  const queue = createQueue<string>()
  queue.enqueue('a'); queue.enqueue('b'); queue.enqueue('c')
  console.log('front:', queue.front())    // a
  console.log('dequeue:', queue.dequeue()) // a
  console.log('size:', queue.size())      // 2

  console.log('balanced "{[()]}":', isBalanced('{[()]}'))  // true
  console.log('balanced "{[(]}":', isBalanced('{[(]}'))    // false
}

main()
