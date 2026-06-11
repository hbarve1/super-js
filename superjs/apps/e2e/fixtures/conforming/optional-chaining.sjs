type Box = { peek: () => number };

function valueOf(b: Box?): number {
  return b?.peek() ?? 41;
}

const __r: number = valueOf(null) + 1;
