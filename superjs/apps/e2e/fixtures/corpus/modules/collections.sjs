// modules/collections.sjs — generic Stack<T> and Queue<T> exports
export type Collection<T> { size: number; isEmpty(): boolean; toArray(): T[] }

export class Stack<T> {
  #items: T[] = []
  push(item: T): void { this.#items.push(item) }
  pop(): T | undefined { return this.#items.pop() }
  peek(): T | undefined { return this.#items[this.#items.length - 1] }
  get size(): number { return this.#items.length }
  isEmpty(): boolean { return this.#items.length === 0 }
  toArray(): T[] { return [...this.#items] }
}

export class Queue<T> {
  #items: T[] = []
  enqueue(item: T): void { this.#items.push(item) }
  dequeue(): T | undefined { return this.#items.shift() }
  get size(): number { return this.#items.length }
  isEmpty(): boolean { return this.#items.length === 0 }
  toArray(): T[] { return [...this.#items] }
}
