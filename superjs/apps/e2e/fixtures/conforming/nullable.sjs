function lengthOr(s: string?, fallback: number): number {
  if (s === null) { return fallback; }
  return s.length;
}

const __r: number = lengthOr("hello", 0) + lengthOr(null, 37);
