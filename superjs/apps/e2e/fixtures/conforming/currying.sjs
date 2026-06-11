const add = (a: number): (b: number) => number =>
  (b: number): number => a + b;

const __r: number = add(40)(2);
