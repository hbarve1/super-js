// @superjs/std-collections — typed wrappers over built-in collections.

export class List<T> {
  private items: T[];

  constructor(items: T[]) {
    this.items = items;
  }

  push(item: T): void {
    this.items.push(item);
  }

  get(index: number): T {
    return this.items[index];
  }

  get length(): number {
    return this.items.length;
  }

  toArray(): T[] {
    return this.items;
  }
}

export function listOf<T>(items: T[]): List<T> {
  return new List(items);
}
