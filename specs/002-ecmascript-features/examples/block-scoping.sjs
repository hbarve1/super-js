// S5: Block scoping — let/const block-scoped, var function-scoped

function blockScopeDemo(): void {
  let outer = "outer";

  {
    let inner = "inner";
    const alsoInner = 42;
    console.log(outer); // outer is visible
    console.log(inner); // inner is visible
  }

  // inner and alsoInner not accessible here
  // console.log(inner); // SJS-E002: inner not in scope

  // var is function-scoped (not block-scoped)
  if (true) {
    var hoisted = "I'm hoisted"; // visible throughout function
  }
  console.log(hoisted); // accessible
}

// let in for loop — each iteration gets own binding
function closureInLoop(): (() => number)[] {
  const fns: (() => number)[] = [];
  for (let i = 0; i < 3; i++) {
    fns.push(() => i); // captures own `i` per iteration
  }
  return fns; // returns [()=>0, ()=>1, ()=>2]
}

// const prevents reassignment (not mutation)
const arr: number[] = [1, 2, 3];
arr.push(4); // ok — mutation allowed
// arr = []; // SJS-E010: reassignment of const

// Shadowing outer with inner let
const value = "outer";
{
  const value = "inner"; // shadows outer in this block
  console.log(value); // "inner"
}
console.log(value); // "outer"
