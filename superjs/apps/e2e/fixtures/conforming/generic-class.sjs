class Box<T> {
  constructor(public value: T) {}
  get(): T { return this.value; }
  map(f: (v: T) => T): T { return f(this.value); }
}

const b = new Box(21);
const __r: number = b.map((v: number): number => v * 2);
