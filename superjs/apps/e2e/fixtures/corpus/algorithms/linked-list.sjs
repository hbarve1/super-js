// Linked List in SJS

type ListNode<T> {
  value: T
  next: ListNode<T>?
}

type LinkedList<T> {
  head: ListNode<T>?
  size: number
  prepend(value: T): void
  append(value: T): void
  remove(value: T): boolean
  contains(value: T): boolean
  toArray(): T[]
}

function createLinkedList<T>(): LinkedList<T> {
  let head: ListNode<T>? = null
  let size = 0

  return {
    get head() { return head },
    get size() { return size },

    prepend(value) {
      head = { value, next: head }
      size++
    },

    append(value) {
      const node: ListNode<T> = { value, next: null }
      if (head === null || head === undefined) {
        head = node
      } else {
        let current = head
        while (current.next !== null && current.next !== undefined) {
          current = current.next
        }
        current.next = node
      }
      size++
    },

    remove(value) {
      if (head === null || head === undefined) return false
      if (head.value === value) {
        head = head.next
        size--
        return true
      }
      let current = head
      while (current.next !== null && current.next !== undefined) {
        if (current.next.value === value) {
          current.next = current.next.next
          size--
          return true
        }
        current = current.next
      }
      return false
    },

    contains(value) {
      let current: ListNode<T>? = head
      while (current !== null && current !== undefined) {
        if (current.value === value) return true
        current = current.next
      }
      return false
    },

    toArray() {
      const result: T[] = []
      let current: ListNode<T>? = head
      while (current !== null && current !== undefined) {
        result.push(current.value)
        current = current.next
      }
      return result
    }
  }
}

function main(): void {
  const list = createLinkedList<number>()
  list.append(1)
  list.append(2)
  list.append(3)
  list.prepend(0)
  console.log('list:', list.toArray())    // [0, 1, 2, 3]
  console.log('size:', list.size)         // 4
  list.remove(2)
  console.log('after remove 2:', list.toArray())  // [0, 1, 3]
  console.log('contains 1:', list.contains(1))    // true
  console.log('contains 2:', list.contains(2))    // false
}

main()
