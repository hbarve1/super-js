function twice(f: (n: number) => number, x: number): number {
  return f(f(x));
}

const __r: number = twice((n: number): number => n + 21, 0);
