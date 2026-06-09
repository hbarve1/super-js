// T6: new expression type inference

// Built-in constructors
const m: Map<string, number> = new Map();
const s: Set<string> = new Set(["a", "b"]);
const e: Error = new Error("oops");
const p: Promise<void> = new Promise<void>((resolve) => resolve());
const d: Date = new Date();
const re: RegExp = new RegExp("\\d+");

// Map with initial entries
const scores: Map<string, number> = new Map([["Alice", 95], ["Bob", 87]]);
const alice: number | undefined = scores.get("Alice");

// User-defined class
class Point {
  constructor(public x: number, public y: number) {}
  distance(): number {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }
}
const pt: Point = new Point(3, 4);
const dist: number = pt.distance(); // 5

// Generic class
class Box<T> {
  constructor(public value: T) {}
  map<U>(fn: (v: T) => U): Box<U> {
    return new Box(fn(this.value));
  }
}
const numBox: Box<number> = new Box(42);
const strBox: Box<string> = numBox.map(n => n.toString());

// new with extends
class NamedPoint extends Point {
  constructor(public name: string, x: number, y: number) {
    super(x, y);
  }
}
const np: NamedPoint = new NamedPoint("origin", 0, 0);
const label: string = np.name;

// WeakRef constructor
const obj = { data: "heavy" };
const ref: WeakRef<{ data: string }> = new WeakRef(obj);
const deref: { data: string } | undefined = ref.deref();
