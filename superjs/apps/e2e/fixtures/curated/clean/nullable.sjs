function lenOf(s: string?): number {
  if (s === null) { return 0; }
  return s.length;
}
const n: number = lenOf(null);
