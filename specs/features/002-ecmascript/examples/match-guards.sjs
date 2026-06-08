// SJS2: Match guard syntax — Pattern if condition => body

type Status =
  | Ok(number)
  | Err(string);

function describe(s: Status): string {
  return match s {
    Ok(n) if n > 100 => "large success",
    Ok(n) if n > 0   => "small success",
    Ok(_)            => "zero or negative",
    Err(msg)         => `failure: ${msg}`,
  };
}

console.log(describe(Ok(150)));  // "large success"
console.log(describe(Ok(42)));   // "small success"
console.log(describe(Ok(-1)));   // "zero or negative"
console.log(describe(Err("!"))); // "failure: !"

// Guards with struct variants
type Shape =
  | Circle { radius: number }
  | Rectangle { width: number; height: number };

function classify(s: Shape): string {
  return match s {
    Circle { radius } if radius > 10 => "large circle",
    Circle { radius } if radius > 0  => "small circle",
    Circle _                         => "degenerate circle",
    Rectangle { width, height } if width === height => "square",
    Rectangle _                      => "rectangle",
  };
}

// Guard can reference destructured bindings
type Range =
  | Bounded { min: number; max: number }
  | Unbounded;

function checkInRange(r: Range, value: number): boolean {
  return match r {
    Bounded { min, max } if value >= min && value <= max => true,
    Bounded _  => false,
    Unbounded  => true,
  };
}
