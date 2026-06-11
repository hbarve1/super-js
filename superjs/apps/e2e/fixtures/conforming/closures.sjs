function adder(by: number): (n: number) => number {
  return (n: number): number => n + by;
}

const add2 = adder(2);
const __r: number = add2(40);
