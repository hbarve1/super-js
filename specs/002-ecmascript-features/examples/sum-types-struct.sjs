// B2: Struct variant syntax in sum types
// Named fields instead of positional tuple fields

type Shape =
  | Circle { radius: number }
  | Rectangle { width: number; height: number }
  | Point;

function area(s: Shape): number {
  return match s {
    Circle { radius } => Math.PI * radius * radius,
    Rectangle { width, height } => width * height,
    Point => 0,
  };
}

const c = Circle({ radius: 5 });
const r = Rectangle({ width: 3, height: 4 });

console.log(area(c)); // ~78.54
console.log(area(r)); // 12

// Nested struct variants
type Result<T> =
  | Ok { value: T }
  | Err { message: string; code: number };

function unwrap<T>(result: Result<T>): T {
  return match result {
    Ok { value } => value,
    Err { message, code } => { throw new Error(`${message} (${code})`); },
  };
}
