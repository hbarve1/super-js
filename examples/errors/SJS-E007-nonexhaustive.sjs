// errors/SJS-E007-nonexhaustive.sjs — SJS-E007: non-exhaustive match

type Color = | Red | Green | Blue

// Trigger (commented out):
// function nameWrong(c: Color): string {
//   return match c {
//     Red => "red"
//     Green => "green"
//     // Missing Blue — SJS-E007 fires
//   }
// }

// FIX 1: Add all arms
function nameFix1(c: Color): string {
  return match c { Red => "red"; Green => "green"; Blue => "blue" }
}

// FIX 2: Wildcard
function nameFix2(c: Color): string {
  return match c { Red => "red"; _ => "other" }
}

// FIX 3: assertNever helper
function assertNever(x: never): never { throw new Error("Unreachable: " + JSON.stringify(x)) }

console.log(nameFix1(Blue))   // blue
console.log(nameFix2(Blue))   // other
