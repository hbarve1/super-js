// T4: readonly modifier — compile-time mutation prevention

// Readonly properties on object type
type Point = {
  readonly x: number;
  readonly y: number;
};
const p: Point = { x: 3, y: 4 };
// p.x = 5; // SJS-E010: cannot assign to readonly property

// Readonly in class
class Circle {
  readonly radius: number;

  constructor(radius: number) {
    this.radius = radius; // ok in constructor
  }

  area(): number {
    return Math.PI * this.radius * this.radius;
  }
}
const c = new Circle(5);
// c.radius = 10; // SJS-E010

// ReadonlyArray<T> — no mutating methods
const nums: ReadonlyArray<number> = [1, 2, 3];
const first: number | undefined = nums[0];
const len: number = nums.length;
// nums.push(4); // SJS-E010: push not on ReadonlyArray
// nums[0] = 99; // SJS-E010

// readonly in function params (prevents mutation)
function sum(arr: readonly number[]): number {
  return arr.reduce((acc, n) => acc + n, 0);
}
sum(nums); // ReadonlyArray satisfies readonly number[]

// Readonly<T> utility type — makes all props readonly
type Mutable = { x: number; y: number };
type Frozen = Readonly<Mutable>;
const frozen: Frozen = { x: 1, y: 2 };
// frozen.x = 3; // SJS-E010

// Deep readonly via nested
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};
