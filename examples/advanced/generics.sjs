// Generic Types Example

// Generic interface
interface Container<T> {
  value: T;
  timestamp: Date;
}

// Generic class
class Stack<T> {
  #items: T[] = [];

  push(item: T): void {
    this.#items.push(item);
  }

  pop(): T | undefined {
    return this.#items.pop();
  }

  peek(): T | undefined {
    return this.#items[this.#items.length - 1];
  }

  get size(): number {
    return this.#items.length;
  }
}

// Generic function
function wrapInContainer<T>(value: T): Container<T> {
  return {
    value,
    timestamp: new Date()
  };
}

// Generic type with constraints
interface Identifiable {
  id: number | string;
}

function findById<T extends Identifiable>(items: T[], id: T['id']): T | undefined {
  return items.find(item => item.id === id);
}

// Usage example
function main(): void {
  // Using generic stack with numbers
  const numberStack = new Stack<number>();
  numberStack.push(1);
  numberStack.push(2);
  numberStack.push(3);
  console.log('Number stack size:', numberStack.size);
  console.log('Number stack top:', numberStack.peek());

  // Using generic stack with strings
  const stringStack = new Stack<string>();
  stringStack.push('hello');
  stringStack.push('world');
  console.log('String stack size:', stringStack.size);
  console.log('String stack top:', stringStack.peek());

  // Using generic container
  const numberContainer = wrapInContainer(42);
  const stringContainer = wrapInContainer('hello');
  const dateContainer = wrapInContainer(new Date());

  console.log('Number container:', numberContainer);
  console.log('String container:', stringContainer);
  console.log('Date container:', dateContainer);

  // Using generic function with constraints
  interface User extends Identifiable {
    id: number;
    name: string;
  }

  const users: User[] = [
    { id: 1, name: 'John' },
    { id: 2, name: 'Jane' }
  ];

  const user = findById(users, 2);
  console.log('Found user:', user);
}

main(); 