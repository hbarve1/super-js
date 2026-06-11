function total(xs: number[]): number {
  let sum = 0;
  for (const x of xs) {
    sum = sum + x;
  }
  return sum;
}

const __r: number = total([10, 20, 12]);
