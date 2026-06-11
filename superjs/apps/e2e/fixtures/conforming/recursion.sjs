function fact(n: number): number {
  if (n <= 1) { return 1; }
  return n * fact(n - 1);
}

const __r: number = fact(5) - 78;
