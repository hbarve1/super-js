function pick(n: number): number {
  switch (n) {
    case 1: return 10;
    default: return n > 0 ? 42 : -1;
  }
}

function countTo(limit: number): number {
  let i = 0;
  do { i = i + 1; } while (i < limit);
  return i;
}

const __r: number = pick(7) === countTo(42) ? 42 : 0;
